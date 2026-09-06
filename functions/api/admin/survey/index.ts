import { requireSurveyAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { errorResponse, HttpError, json, methodNotAllowed } from '../../../_shared/http';
import {
  SURVEY_FUTURE_USE_OPTIONS,
  SURVEY_SUPPORT_OPTIONS,
  SURVEY_USAGE_FREQUENCIES,
  surveyCooldownSince,
} from '../../../_shared/survey';

type SurveyFeedbackRow = {
  id: number;
  created_at: string;
  usage_frequency: string;
  satisfaction_score: number;
  support_continue: string;
  future_use_intent: string;
  improvement_feedback: string;
  other_feedback: string;
  ip_fingerprint: string;
  risk_flags: string;
  is_suspicious: number;
};

type SurveyStatsSet = {
  totalResponses: number;
  averageSatisfaction: number;
  distributions: {
    satisfactionScore: Record<string, number>;
    usageFrequency: Record<string, number>;
    supportContinue: Record<string, number>;
    futureUseIntent: Record<string, number>;
  };
};

const asCount = (value: unknown) => Math.max(0, Number(value) || 0);

const distribution = async (
  db: D1Database,
  column: 'usage_frequency' | 'support_continue' | 'future_use_intent' | 'satisfaction_score',
  values: readonly (string | number)[],
  whereClause = '',
) => {
  const result = await db.prepare(`
    SELECT ${column} AS value, COUNT(*) AS count
    FROM survey_responses
    ${whereClause}
    GROUP BY ${column}
  `).all<{ value: string | number; count: number }>();
  const counts = new Map(result.results.map((row) => [String(row.value), asCount(row.count)]));
  return Object.fromEntries(values.map((value) => [String(value), counts.get(String(value)) ?? 0]));
};

const collectStats = async (db: D1Database, whereClause = ''): Promise<SurveyStatsSet> => {
  const summary = await db.prepare(`
    SELECT COUNT(*) AS total_responses,
      COALESCE(AVG(satisfaction_score), 0) AS average_satisfaction
    FROM survey_responses
    ${whereClause}
  `).first<{ total_responses: number; average_satisfaction: number }>();
  const [scores, usage, support, future] = await Promise.all([
    distribution(db, 'satisfaction_score', [1, 2, 3, 4, 5], whereClause),
    distribution(db, 'usage_frequency', SURVEY_USAGE_FREQUENCIES, whereClause),
    distribution(db, 'support_continue', SURVEY_SUPPORT_OPTIONS, whereClause),
    distribution(db, 'future_use_intent', SURVEY_FUTURE_USE_OPTIONS, whereClause),
  ]);

  return {
    totalResponses: asCount(summary?.total_responses),
    averageSatisfaction: Number(summary?.average_satisfaction || 0),
    distributions: {
      satisfactionScore: scores,
      usageFrequency: usage,
      supportContinue: support,
      futureUseIntent: future,
    },
  };
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const fingerprintPreview = (value: string) => value ? `${value.slice(0, 8)}…` : '';

const csvResponse = (rows: SurveyFeedbackRow[]) => {
  const headers = [
    'id',
    'submitted_at',
    'usage_frequency',
    'satisfaction_score',
    'support_continue',
    'future_use_intent',
    'improvement_feedback',
    'other_feedback',
    'is_suspicious',
    'risk_flags',
    'anonymous_network_fingerprint_preview',
  ];
  const lines = rows.map((row) => [
    row.id,
    row.created_at,
    row.usage_frequency,
    row.satisfaction_score,
    row.support_continue,
    row.future_use_intent,
    row.improvement_feedback,
    row.other_feedback,
    row.is_suspicious,
    row.risk_flags,
    fingerprintPreview(row.ip_fingerprint),
  ].map(csvCell).join(','));
  const body = `\uFEFF${[headers.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`;
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="holybear-survey.csv"',
      'cache-control': 'no-store',
    },
  });
};

const statusWhere = (filter: 'all' | 'normal' | 'suspicious') => {
  if (filter === 'normal') return 'WHERE is_suspicious = 0';
  if (filter === 'suspicious') return 'WHERE is_suspicious = 1';
  return '';
};

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    requireSurveyAdmin(request, env);
    if (!env.SURVEY_DB) throw new HttpError(503, 'survey_storage_unavailable', '問卷資料庫尚未設定');

    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    const view = url.searchParams.get('view') || 'trusted';
    const filter = url.searchParams.get('filter') || 'all';
    if (view !== 'trusted' && view !== 'all') throw new HttpError(400, 'invalid_survey_view', '不支援的統計檢視');
    if (filter !== 'all' && filter !== 'normal' && filter !== 'suspicious') {
      throw new HttpError(400, 'invalid_survey_filter', '不支援的回覆篩選');
    }

    if (format === 'csv') {
      const rows = await env.SURVEY_DB.prepare(`
        SELECT id, created_at, usage_frequency, satisfaction_score, support_continue,
          future_use_intent, improvement_feedback, other_feedback,
          ip_fingerprint, risk_flags, is_suspicious
        FROM survey_responses
        ${statusWhere(filter)}
        ORDER BY id ASC
      `).all<SurveyFeedbackRow>();
      return csvResponse(rows.results);
    }
    if (format) throw new HttpError(400, 'invalid_survey_format', '不支援的匯出格式');

    const requestedLimit = Number.parseInt(url.searchParams.get('limit') || '100', 10);
    const requestedOffset = Number.parseInt(url.searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(500, Math.max(1, requestedLimit)) : 100;
    const offset = Number.isFinite(requestedOffset) ? Math.min(100_000, Math.max(0, requestedOffset)) : 0;
    const allWhere = '';
    const trustedWhere = 'WHERE is_suspicious = 0';
    const [allStats, trustedStats, suspicious, cooldown, feedback] = await Promise.all([
      collectStats(env.SURVEY_DB, allWhere),
      collectStats(env.SURVEY_DB, trustedWhere),
      env.SURVEY_DB.prepare('SELECT COUNT(*) AS count FROM survey_responses WHERE is_suspicious = 1')
        .first<{ count: number }>(),
      env.SURVEY_DB.prepare(`
        SELECT COUNT(*) AS count FROM survey_abuse_events
        WHERE event_type = 'network_cooldown' AND created_at >= ?1
      `).bind(surveyCooldownSince()).first<{ count: number }>(),
      env.SURVEY_DB.prepare(`
        SELECT id, created_at, usage_frequency, satisfaction_score, support_continue,
          future_use_intent, improvement_feedback, other_feedback,
          ip_fingerprint, risk_flags, is_suspicious
        FROM survey_responses
        ${statusWhere(filter)}
        ORDER BY id DESC LIMIT ?1 OFFSET ?2
      `).bind(limit, offset).all<SurveyFeedbackRow>(),
    ]);
    const activeStats = view === 'trusted' ? trustedStats : allStats;

    return json({
      view,
      filter,
      totalResponses: activeStats.totalResponses,
      averageSatisfaction: activeStats.averageSatisfaction,
      distributions: activeStats.distributions,
      trustedResponses: trustedStats.totalResponses,
      suspiciousResponses: asCount(suspicious?.count),
      cooldownBlocked24h: asCount(cooldown?.count),
      trustedStats,
      allStats,
      feedback: feedback.results.map((row) => ({
        id: row.id,
        submittedAt: row.created_at,
        usageFrequency: row.usage_frequency,
        satisfactionScore: row.satisfaction_score,
        supportContinue: row.support_continue,
        futureUseIntent: row.future_use_intent,
        improvementFeedback: row.improvement_feedback,
        otherFeedback: row.other_feedback,
        isSuspicious: Boolean(row.is_suspicious),
        riskFlags: row.risk_flags ? row.risk_flags.split(',').filter(Boolean) : [],
        fingerprintPreview: fingerprintPreview(row.ip_fingerprint),
      })),
      feedbackLimit: limit,
      feedbackOffset: offset,
      feedbackHasMore: feedback.results.length === limit,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
