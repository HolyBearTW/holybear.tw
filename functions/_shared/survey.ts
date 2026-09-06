import type { Env } from './env';
import { HttpError } from './http';

export const SURVEY_TEXT_LIMIT = 2_000;
export const SURVEY_BODY_LIMIT_BYTES = 16 * 1024;
export const SURVEY_COOLDOWN_MS = 24 * 60 * 60 * 1_000;
export const SURVEY_ABUSE_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

export const SURVEY_USAGE_FREQUENCIES = ['frequent', 'occasional', 'rare', 'stopped'] as const;
export const SURVEY_SUPPORT_OPTIONS = ['support', 'indifferent', 'oppose'] as const;
export const SURVEY_FUTURE_USE_OPTIONS = ['will', 'depends', 'uncertain', 'will_not'] as const;

export const SURVEY_ABUSE_EVENT_TYPES = [
  'network_cooldown',
  'duplicate_browser',
  'turnstile_failed',
  'schema_invalid',
] as const;

export type SurveyAbuseEventType = (typeof SURVEY_ABUSE_EVENT_TYPES)[number];

export type SurveyAbuseSignalCounts = {
  total: number;
  networkCooldown: number;
  duplicateBrowser: number;
  turnstileFailed: number;
  schemaInvalid: number;
};

export type SurveySubmission = {
  anonymousId: string;
  usageFrequency: (typeof SURVEY_USAGE_FREQUENCIES)[number];
  satisfactionScore: number;
  supportContinue: (typeof SURVEY_SUPPORT_OPTIONS)[number];
  futureUseIntent: (typeof SURVEY_FUTURE_USE_OPTIONS)[number];
  improvementFeedback: string;
  otherFeedback: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isEnum = <T extends readonly string[]>(value: unknown, values: T): value is T[number] => (
  typeof value === 'string' && (values as readonly string[]).includes(value)
);

const readText = (value: unknown, field: string, optional = false) => {
  if (value === undefined && optional) return '';
  if (typeof value !== 'string') {
    throw new HttpError(400, 'invalid_survey_field', `${field} 欄位格式不正確`);
  }
  const normalized = value.trim();
  if (Array.from(normalized).length > SURVEY_TEXT_LIMIT) {
    throw new HttpError(400, 'survey_text_too_long', `${field} 不得超過 ${SURVEY_TEXT_LIMIT} 字`);
  }
  return normalized;
};

const readContent = async (request: Request) => {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_content_type', '請使用 application/json 提交問卷');
  }

  const declaredLength = Number.parseInt(request.headers.get('content-length') || '', 10);
  if (Number.isFinite(declaredLength) && declaredLength > SURVEY_BODY_LIMIT_BYTES) {
    throw new HttpError(413, 'survey_body_too_large', '問卷內容過大');
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > SURVEY_BODY_LIMIT_BYTES) {
    throw new HttpError(413, 'survey_body_too_large', '問卷內容過大');
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new HttpError(400, 'invalid_json', '問卷資料格式不正確');
  }
};

export const parseSurveySubmission = async (request: Request): Promise<SurveySubmission> => {
  const body = await readContent(request);
  if (!isRecord(body)) throw new HttpError(400, 'invalid_survey_body', '問卷資料格式不正確');

  const requiredKeys = [
    'anonymousId',
    'futureUseIntent',
    'satisfactionScore',
    'supportContinue',
    'usageFrequency',
  ];
  const optionalKeys = ['improvementFeedback', 'otherFeedback'];
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const actualKeys = Object.keys(body);
  if (actualKeys.some((key) => !allowedKeys.has(key))) {
    throw new HttpError(400, 'unexpected_survey_field', '問卷包含不支援的欄位');
  }
  if (requiredKeys.some((key) => !(key in body))) {
    throw new HttpError(400, 'missing_survey_field', '問卷缺少必填欄位');
  }

  const anonymousId = body.anonymousId;
  if (typeof anonymousId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(anonymousId.trim())) {
    throw new HttpError(400, 'invalid_anonymous_id', '匿名識別碼格式不正確');
  }

  const satisfactionScore = body.satisfactionScore;
  if (typeof satisfactionScore !== 'number' || !Number.isInteger(satisfactionScore) || satisfactionScore < 1 || satisfactionScore > 5) {
    throw new HttpError(400, 'invalid_satisfaction_score', '滿意度必須是 1 到 5 分');
  }

  if (!isEnum(body.usageFrequency, SURVEY_USAGE_FREQUENCIES)) {
    throw new HttpError(400, 'invalid_usage_frequency', '使用頻率選項不正確');
  }
  if (!isEnum(body.supportContinue, SURVEY_SUPPORT_OPTIONS)) {
    throw new HttpError(400, 'invalid_support_continue', '開發維護支持選項不正確');
  }
  if (!isEnum(body.futureUseIntent, SURVEY_FUTURE_USE_OPTIONS)) {
    throw new HttpError(400, 'invalid_future_use_intent', '未來使用意願選項不正確');
  }

  return {
    anonymousId: anonymousId.trim().toLowerCase(),
    usageFrequency: body.usageFrequency,
    satisfactionScore,
    supportContinue: body.supportContinue,
    futureUseIntent: body.futureUseIntent,
    improvementFeedback: readText(body.improvementFeedback, '改善或新增建議', true),
    otherFeedback: readText(body.otherFeedback, '其他留言', true),
  };
};

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * Hash the trusted Cloudflare source IP in memory. The raw value is never
 * returned, logged, or passed to D1.
 */
export const createSurveyIpFingerprint = async (request: Request, secret: string | undefined) => {
  if (!secret) {
    throw new HttpError(503, 'survey_fingerprint_unavailable', '問卷防護服務尚未設定');
  }

  const normalizedIp = request.headers.get('CF-Connecting-IP')?.trim().toLowerCase();
  if (!normalizedIp || normalizedIp.length > 128) {
    throw new HttpError(503, 'survey_fingerprint_unavailable', '問卷防護服務暫時無法使用');
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new HttpError(503, 'survey_fingerprint_unavailable', '問卷防護服務暫時無法使用');
  }

  try {
    const encoder = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await subtle.sign('HMAC', key, encoder.encode(normalizedIp));
    return bytesToHex(new Uint8Array(signature));
  } catch {
    throw new HttpError(503, 'survey_fingerprint_unavailable', '問卷防護服務暫時無法使用');
  }
};

export const surveyCooldownSince = (now = Date.now()) => new Date(now - SURVEY_COOLDOWN_MS).toISOString();

export const readSurveyAbuseSignals = async (db: D1Database, ipFingerprint: string, since = surveyCooldownSince()) => {
  const row = await db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN event_type = 'network_cooldown' THEN 1 ELSE 0 END) AS network_cooldown,
      SUM(CASE WHEN event_type = 'duplicate_browser' THEN 1 ELSE 0 END) AS duplicate_browser,
      SUM(CASE WHEN event_type = 'turnstile_failed' THEN 1 ELSE 0 END) AS turnstile_failed,
      SUM(CASE WHEN event_type = 'schema_invalid' THEN 1 ELSE 0 END) AS schema_invalid
    FROM survey_abuse_events
    WHERE ip_fingerprint = ?1 AND created_at >= ?2
  `).bind(ipFingerprint, since).first<{
    total?: number;
    network_cooldown?: number;
    duplicate_browser?: number;
    turnstile_failed?: number;
    schema_invalid?: number;
  }>();

  const count = (value: unknown) => Math.max(0, Number(value) || 0);
  return {
    total: count(row?.total),
    networkCooldown: count(row?.network_cooldown),
    duplicateBrowser: count(row?.duplicate_browser),
    turnstileFailed: count(row?.turnstile_failed),
    schemaInvalid: count(row?.schema_invalid),
  } satisfies SurveyAbuseSignalCounts;
};

export const deriveSurveyRiskFlags = (signals: SurveyAbuseSignalCounts) => {
  const flags: string[] = [];
  if (signals.turnstileFailed > 0) flags.push('turnstile_failed_recent');
  if (signals.schemaInvalid >= 3) flags.push('schema_retry_pattern');
  if (signals.duplicateBrowser >= 2) flags.push('duplicate_browser_pattern');
  if (signals.total >= 4) flags.push('rapid_abuse_pattern');
  return flags;
};

export const recordSurveyAbuseEvent = async (
  db: D1Database,
  ipFingerprint: string,
  eventType: SurveyAbuseEventType,
  metadata = '',
) => {
  try {
    await db.prepare(`
      INSERT INTO survey_abuse_events (event_type, ip_fingerprint, metadata)
      VALUES (?1, ?2, ?3)
    `).bind(eventType, ipFingerprint, metadata).run();

    // Keep the lightweight attempt log bounded without retaining request data.
    const retentionSince = new Date(Date.now() - SURVEY_ABUSE_EVENT_RETENTION_MS).toISOString();
    await db.prepare('DELETE FROM survey_abuse_events WHERE created_at < ?1').bind(retentionSince).run();
  } catch (error) {
    // Abuse telemetry must never turn a valid survey into a 500. Do not log
    // request headers, fingerprints, or bodies if the telemetry table fails.
    console.error('Unable to record survey abuse event', error instanceof Error ? error.message : 'unknown error');
  }
};

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
};

export const verifySurveyTurnstile = async (request: Request, env: Env) => {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new HttpError(503, 'survey_verification_unavailable', '問卷驗證服務尚未設定');
  }

  const token = request.headers.get('x-turnstile-token')?.trim();
  if (!token || token.length > 2_048) {
    throw new HttpError(400, 'turnstile_required', '請先完成問卷驗證');
  }

  let result: TurnstileResponse;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    });
    result = await response.json() as TurnstileResponse;
  } catch {
    throw new HttpError(503, 'survey_verification_unavailable', '問卷驗證服務暫時無法使用');
  }

  if (!result.success) {
    throw new HttpError(403, 'turnstile_rejected', '問卷驗證未通過，請重新嘗試');
  }
};
