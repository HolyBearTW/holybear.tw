import type { Env } from './env';
import { findCharacterByOcid } from './character-repository';
import { fetchNexonJson, NexonRequestError, runWithConcurrency } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';

export const GROWTH_HISTORY_START_DATE = '2025-10-15';
export const GROWTH_PROVIDER = 'nexon_primary' as const;

const DAY_MS = 86_400_000;
const nowIso = () => new Date().toISOString();
const dateOnly = (value: string | null | undefined) => value?.slice(0, 10) || null;
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const latestAvailableGrowthDate = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const taiwanDate = `${values.year}-${values.month}-${values.day}`;
  return addDays(taiwanDate, Number(values.hour) >= 2 ? -1 : -2);
};

interface GrowthProfileRow {
  ocid: string;
  character_name: string;
  scan_start_date: string;
  history_start_date: string | null;
  basic_last_synced_date: string | null;
  dojang_last_synced_date: string | null;
  last_synced_date: string | null;
  sync_target_date: string;
  status: 'pending' | 'retry' | 'completed' | 'failed';
  phase: 'basic' | 'dojang';
  dojang_mode: 'unknown' | 'no_record' | 'daily';
  current_processing_date: string | null;
  attempt_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  claim_token: string | null;
  claim_until: string | null;
  queue_version: number;
  nexon_request_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface GrowthSnapshotRow {
  ocid: string;
  snapshot_date: string;
  source_date: string | null;
  character_name: string;
  world_name: string;
  job_name: string;
  character_level: number;
  character_exp: number;
  character_exp_rate: number;
  guild_name: string | null;
  liberation_status: string | null;
  dojang_best_floor: number | null;
  dojang_best_time: number | null;
  dojang_record_date: string | null;
  dojang_state: 'not_collected' | 'no_record' | 'available';
  fetched_at: string;
  updated_at: string;
}

interface NexonBasicHistory {
  date?: string;
  character_name?: string;
  world_name?: string;
  character_class?: string;
  character_level?: number;
  character_exp?: number;
  character_exp_rate?: string;
  character_guild_name?: string | null;
  liberation_quest_clear?: string | null;
}

export class GrowthAdmissionError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

const OCID_PATTERN = /^[0-9a-f]{32}$/i;

export const normalizeGrowthOcid = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return OCID_PATTERN.test(normalized) ? normalized : null;
};

interface NexonDojangHistory {
  date?: string;
  dojang_best_floor?: number | null;
  dojang_best_time?: number | null;
  date_dojang_record?: string | null;
}

interface GrowthClaim {
  row: GrowthProfileRow;
  token: string;
  queueVersion: number;
}

const getProfile = async (db: D1Database, ocid: string) => db.prepare(`
  SELECT * FROM growth_profiles WHERE ocid = ?1 LIMIT 1
`).bind(ocid).first<GrowthProfileRow>();

export const createGrowthProfile = async (db: D1Database, ocid: string, targetDate = latestAvailableGrowthDate()) => {
  const timestamp = nowIso();
  await db.prepare(`
    INSERT INTO growth_profiles (
      ocid, scan_start_date, sync_target_date, status, phase,
      current_processing_date, created_at, updated_at
    ) VALUES (?1, ?2, ?3, 'pending', 'basic', ?2, ?4, ?4)
    ON CONFLICT(ocid) DO NOTHING
  `).bind(ocid, GROWTH_HISTORY_START_DATE, targetDate, timestamp).run();
  return getProfile(db, ocid);
};

const assertValidGrowthIdentity = async (env: Env, ocid: string) => {
  if (await findCharacterByOcid(env.DB, ocid)) return;
  let basic: NexonBasicHistory;
  try {
    basic = await fetchNexonJson<NexonBasicHistory>(
      env,
      `/character/basic?ocid=${encodeURIComponent(ocid)}`,
    );
  } catch (error) {
    if (error instanceof NexonRequestError && !error.retryable) {
      throw new GrowthAdmissionError(400, 'invalid_growth_ocid', '這個角色識別碼無法由 NEXON 驗證');
    }
    throw new GrowthAdmissionError(503, 'growth_identity_unavailable', 'NEXON 角色驗證暫時無法使用，請稍後再試', 60);
  }
  if (!basic.character_name || !basic.world_name || !basic.character_class
    || !Number.isSafeInteger(Number(basic.character_level)) || Number(basic.character_level) <= 0) {
    throw new GrowthAdmissionError(400, 'invalid_growth_ocid', '這個角色識別碼無法由 NEXON 驗證');
  }
};

const admissionCounts = async (db: D1Database, since: string) => {
  const [recent, pending] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS count FROM growth_profiles WHERE created_at >= ?1`)
      .bind(since).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM growth_profiles WHERE status IN ('pending', 'retry')`)
      .first<{ count: number }>(),
  ]);
  return {
    recent: Number(recent?.count) || 0,
    pending: Number(pending?.count) || 0,
  };
};

export const admitGrowthProfile = async (
  env: Env,
  ocid: string,
  targetDate = latestAvailableGrowthDate(),
) => {
  const existing = await getProfile(env.DB, ocid);
  if (existing) return { profile: existing, created: false };

  const config = getRuntimeConfig(env);
  const timestamp = nowIso();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const before = await admissionCounts(env.DB, since);
  if (before.pending >= config.growthPendingProfileLimit) {
    throw new GrowthAdmissionError(503, 'growth_backlog_full', '目前成長檔案佇列已滿，請稍後再試', 300);
  }
  if (before.recent >= config.growthNewProfile24hLimit) {
    throw new GrowthAdmissionError(429, 'growth_generation_limit', '今日可建立的成長檔案已達上限，請稍後再試', 3600);
  }

  await assertValidGrowthIdentity(env, ocid);

  // The capacity predicates and insert share one D1 statement. Concurrent
  // requests for the same OCID therefore create one row, while requests for
  // different OCIDs cannot all pass a stale application-side count.
  const inserted = await env.DB.prepare(`
    INSERT INTO growth_profiles (
      ocid, scan_start_date, sync_target_date, status, phase,
      current_processing_date, created_at, updated_at
    )
    SELECT ?1, ?2, ?3, 'pending', 'basic', ?2, ?4, ?4
    WHERE (SELECT COUNT(*) FROM growth_profiles WHERE created_at >= ?5) < ?6
      AND (SELECT COUNT(*) FROM growth_profiles WHERE status IN ('pending', 'retry')) < ?7
    ON CONFLICT(ocid) DO NOTHING
    RETURNING *
  `).bind(
    ocid,
    GROWTH_HISTORY_START_DATE,
    targetDate,
    timestamp,
    since,
    config.growthNewProfile24hLimit,
    config.growthPendingProfileLimit,
  ).first<GrowthProfileRow>();
  if (inserted) return { profile: inserted, created: true };

  const racedExisting = await getProfile(env.DB, ocid);
  if (racedExisting) return { profile: racedExisting, created: false };
  const after = await admissionCounts(env.DB, since);
  if (after.pending >= config.growthPendingProfileLimit) {
    throw new GrowthAdmissionError(503, 'growth_backlog_full', '目前成長檔案佇列已滿，請稍後再試', 300);
  }
  throw new GrowthAdmissionError(429, 'growth_generation_limit', '今日可建立的成長檔案已達上限，請稍後再試', 3600);
};

export const scheduleGrowthProfiles = async (db: D1Database, targetDate = latestAvailableGrowthDate()) => {
  const state = await db.prepare(`SELECT last_target_date FROM growth_scheduler_state WHERE id = 1`)
    .first<{ last_target_date: string | null }>();
  if (state?.last_target_date === targetDate) return { targetDate, requeued: 0, scanned: false };
  const timestamp = nowIso();
  const results = await db.batch([
    db.prepare(`
      UPDATE growth_profiles SET
        status = 'pending', phase = 'basic', dojang_mode = 'unknown',
        sync_target_date = ?1, current_processing_date = date(last_synced_date, '+1 day'),
        next_retry_at = NULL, last_error = NULL, completed_at = NULL,
        queue_version = queue_version + 1, updated_at = ?2
      WHERE status IN ('completed', 'failed')
        AND (last_synced_date IS NULL OR last_synced_date < ?1)
    `).bind(targetDate, timestamp),
    db.prepare(`UPDATE growth_scheduler_state SET last_target_date = ?1, updated_at = ?2 WHERE id = 1`)
      .bind(targetDate, timestamp),
  ]);
  const meta = results[0] as unknown as { meta?: { changes?: number } };
  return { targetDate, requeued: Number(meta?.meta?.changes) || 0, scanned: true };
};

const claimProfile = async (db: D1Database, row: GrowthProfileRow, leaseSeconds: number) => {
  const timestamp = nowIso();
  const token = crypto.randomUUID();
  const claimUntil = new Date(Date.now() + leaseSeconds * 1000).toISOString();
  const claimed = await db.prepare(`
    UPDATE growth_profiles SET claim_token = ?2, claim_until = ?3, updated_at = ?4
    WHERE ocid = ?1 AND queue_version = ?5
      AND (status = 'pending' OR (status = 'retry' AND (next_retry_at IS NULL OR next_retry_at <= ?4)))
      AND (claim_until IS NULL OR claim_until <= ?4)
    RETURNING ocid
  `).bind(row.ocid, token, claimUntil, timestamp, row.queue_version).first<{ ocid: string }>();
  return claimed ? { row, token, queueVersion: row.queue_version } satisfies GrowthClaim : null;
};

const isMissingHistoricalSnapshot = (error: unknown) => error instanceof NexonRequestError
  && error.status === 400
  && error.nexonCode === 'OPENAPI00003';

const isEmptyBasicSnapshot = (basic: NexonBasicHistory, requestedDate: string) => (
  dateOnly(basic.date) === requestedDate
  && basic.character_name == null
  && basic.world_name == null
  && basic.character_class == null
  && basic.character_level == null
  && basic.character_exp == null
  && basic.character_exp_rate == null
  && basic.character_guild_name == null
  && basic.liberation_quest_clear == null
);

const basicStatement = (
  db: D1Database,
  ocid: string,
  requestedDate: string,
  basic: NexonBasicHistory,
  timestamp: string,
) => db.prepare(`
  INSERT INTO growth_snapshots (
    ocid, snapshot_date, source_date, character_name, world_name, job_name,
    character_level, character_exp, character_exp_rate, guild_name,
    liberation_status, fetched_at, updated_at
  ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)
  ON CONFLICT(ocid, snapshot_date) DO UPDATE SET
    source_date = excluded.source_date,
    character_name = excluded.character_name,
    world_name = excluded.world_name,
    job_name = excluded.job_name,
    character_level = excluded.character_level,
    character_exp = excluded.character_exp,
    character_exp_rate = excluded.character_exp_rate,
    guild_name = excluded.guild_name,
    liberation_status = excluded.liberation_status,
    fetched_at = excluded.fetched_at,
    updated_at = excluded.updated_at
`).bind(
  ocid,
  requestedDate,
  dateOnly(basic.date),
  String(basic.character_name || ''),
  String(basic.world_name || ''),
  String(basic.character_class || ''),
  Math.max(0, Number(basic.character_level) || 0),
  Math.max(0, Math.trunc(Number(basic.character_exp) || 0)),
  Math.max(0, Number.parseFloat(String(basic.character_exp_rate ?? '0')) || 0),
  basic.character_guild_name?.trim() || null,
  basic.liberation_quest_clear == null ? null : String(basic.liberation_quest_clear),
  timestamp,
);

const fetchBasicBatch = async (env: Env, claim: GrowthClaim, batchSize: number) => {
  const { row } = claim;
  const firstDate = row.basic_last_synced_date
    ? addDays(row.basic_last_synced_date, 1)
    : row.scan_start_date;
  const remaining = Math.floor((Date.parse(`${row.sync_target_date}T00:00:00Z`)
    - Date.parse(`${firstDate}T00:00:00Z`)) / DAY_MS) + 1;
  const count = Math.max(0, Math.min(batchSize, remaining));
  const dates = Array.from({ length: count }, (_, index) => addDays(firstDate, index));
  const timestamp = nowIso();
  const statements: D1PreparedStatement[] = [];
  let firstValidDate: string | null = null;
  let latestName = row.character_name;
  let requests = 0;
  for (const date of dates) {
    try {
      requests += 1;
      const basic = await fetchNexonJson<NexonBasicHistory>(
        env,
        `/character/basic?ocid=${encodeURIComponent(row.ocid)}&date=${date}`,
      );
      // TMS currently represents a valid historical date before character
      // creation as HTTP 200 with the requested date and every character
      // field null.  Match that complete sentinel shape; a partial/malformed
      // 200 response must still stop and retry instead of silently skipping.
      if (isEmptyBasicSnapshot(basic, date)) continue;
      if (!basic.character_name) throw new NexonRequestError(
        `NEXON basic snapshot ${date} has no character identity`,
        200,
        true,
        'invalid_basic_snapshot',
      );
      firstValidDate ||= date;
      latestName = basic.character_name;
      statements.push(basicStatement(env.DB, row.ocid, date, basic, timestamp));
    } catch (error) {
      // For the allowlisted, known-valid OCID, OPENAPI00003 on an in-range
      // historical date means the character had no snapshot on that date.
      if (!isMissingHistoricalSnapshot(error)) throw error;
    }
  }
  const processedDate = dates.at(-1) || row.basic_last_synced_date || row.scan_start_date;
  const basicComplete = processedDate >= row.sync_target_date;
  statements.push(env.DB.prepare(`
    UPDATE growth_profiles SET
      character_name = CASE WHEN ?3 <> '' THEN ?3 ELSE character_name END,
      history_start_date = COALESCE(history_start_date, ?4),
      basic_last_synced_date = ?5,
      phase = CASE WHEN ?6 = 1 THEN 'dojang' ELSE 'basic' END,
      dojang_mode = CASE WHEN ?6 = 1 THEN 'unknown' ELSE dojang_mode END,
      current_processing_date = CASE WHEN ?6 = 1 THEN ?7 ELSE date(?5, '+1 day') END,
      status = 'pending', attempt_count = 0,
      next_retry_at = NULL, last_error = NULL,
      claim_token = NULL, claim_until = NULL,
      nexon_request_count = nexon_request_count + ?8,
      updated_at = ?9
    WHERE ocid = ?1 AND claim_token = ?2 AND queue_version = ?10
  `).bind(
    row.ocid, claim.token, latestName, firstValidDate, processedDate,
    basicComplete ? 1 : 0, row.sync_target_date, requests, timestamp, claim.queueVersion,
  ));
  await env.DB.batch(statements);
  return { phase: 'basic' as const, processedDates: dates.length, requests, basicComplete };
};

const dojangValues = (payload: NexonDojangHistory) => {
  const floor = Math.max(0, Number(payload.dojang_best_floor) || 0);
  const time = Math.max(0, Number(payload.dojang_best_time) || 0);
  return {
    floor,
    time,
    recordDate: dateOnly(payload.date_dojang_record),
    state: floor > 0 ? 'available' as const : 'no_record' as const,
  };
};

const dojangUpdateStatement = (
  db: D1Database,
  ocid: string,
  snapshotDate: string,
  payload: NexonDojangHistory,
  timestamp: string,
) => {
  const values = dojangValues(payload);
  return db.prepare(`
    UPDATE growth_snapshots SET
      dojang_best_floor = ?3, dojang_best_time = ?4,
      dojang_record_date = ?5, dojang_state = ?6, updated_at = ?7
    WHERE ocid = ?1 AND snapshot_date = ?2
  `).bind(ocid, snapshotDate, values.floor, values.time, values.recordDate, values.state, timestamp);
};

const finalizeDojang = async (
  env: Env,
  claim: GrowthClaim,
  statements: D1PreparedStatement[],
  requests: number,
  syncedDate: string,
  mode: GrowthProfileRow['dojang_mode'],
) => {
  const timestamp = nowIso();
  const currentTarget = latestAvailableGrowthDate();
  const caughtUpToCurrentTarget = syncedDate >= currentTarget;
  statements.push(env.DB.prepare(`
    UPDATE growth_profiles SET
      dojang_last_synced_date = ?3,
      last_synced_date = ?3,
      sync_target_date = CASE WHEN ?4 = 1 THEN sync_target_date ELSE ?5 END,
      status = CASE WHEN ?4 = 1 THEN 'completed' ELSE 'pending' END,
      phase = CASE WHEN ?4 = 1 THEN 'dojang' ELSE 'basic' END,
      dojang_mode = CASE WHEN ?4 = 1 THEN ?6 ELSE 'unknown' END,
      current_processing_date = CASE WHEN ?4 = 1 THEN ?3 ELSE date(?3, '+1 day') END,
      attempt_count = 0,
      next_retry_at = NULL, last_error = NULL,
      claim_token = NULL, claim_until = NULL,
      nexon_request_count = nexon_request_count + ?7,
      completed_at = CASE WHEN ?4 = 1 THEN ?8 ELSE NULL END,
      updated_at = ?8
    WHERE ocid = ?1 AND claim_token = ?2 AND queue_version = ?9
  `).bind(
    claim.row.ocid, claim.token, syncedDate, caughtUpToCurrentTarget ? 1 : 0,
    currentTarget, mode, requests, timestamp, claim.queueVersion,
  ));
  await env.DB.batch(statements);
};

const fetchDojangBatch = async (env: Env, claim: GrowthClaim, batchSize: number) => {
  const { row } = claim;
  const timestamp = nowIso();
  // The shadow OCID has only zero/no-record samples, so it cannot prove how a
  // non-zero record evolves between arbitrary request dates.  Until that
  // historical contract is verified, collect every date; do not infer an
  // entire timeline from one target-date response.
  const firstDate = row.dojang_last_synced_date
    ? addDays(row.dojang_last_synced_date, 1)
    : (row.history_start_date || row.scan_start_date);
  const remaining = Math.floor((Date.parse(`${row.sync_target_date}T00:00:00Z`)
    - Date.parse(`${firstDate}T00:00:00Z`)) / DAY_MS) + 1;
  const count = Math.max(0, Math.min(batchSize, remaining));
  const dates = Array.from({ length: count }, (_, index) => addDays(firstDate, index));
  const statements: D1PreparedStatement[] = [];
  let requests = 0;
  for (const date of dates) {
    requests += 1;
    const payload = await fetchNexonJson<NexonDojangHistory>(
      env,
      `/character/dojang?ocid=${encodeURIComponent(row.ocid)}&date=${date}`,
    );
    statements.push(dojangUpdateStatement(env.DB, row.ocid, date, payload, timestamp));
  }
  const processedDate = dates.at(-1) || row.sync_target_date;
  if (processedDate >= row.sync_target_date) {
    await finalizeDojang(env, claim, statements, requests, row.sync_target_date, 'daily');
    return { phase: 'dojang' as const, processedDates: dates.length, requests, complete: true, mode: 'daily' };
  }
  statements.push(env.DB.prepare(`
    UPDATE growth_profiles SET
      dojang_last_synced_date = ?3, status = 'pending',
      current_processing_date = date(?3, '+1 day'),
      attempt_count = 0,
      next_retry_at = NULL, last_error = NULL,
      claim_token = NULL, claim_until = NULL,
      nexon_request_count = nexon_request_count + ?4, updated_at = ?5
    WHERE ocid = ?1 AND claim_token = ?2 AND queue_version = ?6
  `).bind(row.ocid, claim.token, processedDate, requests, timestamp, claim.queueVersion));
  await env.DB.batch(statements);
  return { phase: 'dojang' as const, processedDates: dates.length, requests, complete: false, mode: 'daily' };
};

const failGrowthClaim = async (env: Env, claim: GrowthClaim, error: unknown) => {
  const retryLimit = getRuntimeConfig(env).nexonRetryLimit;
  const attempts = Number(claim.row.attempt_count) + 1;
  const retryable = error instanceof NexonRequestError
    ? error.retryable
    : (error as { retryable?: boolean } | null)?.retryable !== false;
  // A permanent profile never loses future tracking because of a transient
  // failure. retryLimit caps only the exponential delay, not total attempts.
  const exponent = Math.min(Math.max(0, attempts - 1), retryLimit - 1);
  const retryAt = retryable
    ? new Date(Date.now() + Math.min(3_600_000, 30_000 * (2 ** exponent))).toISOString()
    : null;
  const timestamp = nowIso();
  const message = error instanceof Error ? error.message : String(error);
  await env.DB.prepare(`
    UPDATE growth_profiles SET
      status = ?3, attempt_count = attempt_count + 1,
      next_retry_at = ?4, last_error = ?5,
      claim_token = NULL, claim_until = NULL, updated_at = ?6
    WHERE ocid = ?1 AND claim_token = ?2 AND queue_version = ?7
  `).bind(
    claim.row.ocid, claim.token, retryable ? 'retry' : 'failed', retryAt,
    message.slice(0, 1000), timestamp, claim.queueVersion,
  ).run();
  return { retryable, retryAt };
};

export const backfillGrowthBatch = async (env: Env) => {
  const config = getRuntimeConfig(env);
  const scheduled = await scheduleGrowthProfiles(env.DB);
  const timestamp = nowIso();
  const eligible = await env.DB.prepare(`
    SELECT * FROM growth_profiles
    WHERE (status = 'pending' OR (status = 'retry' AND (next_retry_at IS NULL OR next_retry_at <= ?1)))
      AND (claim_until IS NULL OR claim_until <= ?1)
    ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, updated_at, ocid
    LIMIT ?2
  `).bind(timestamp, config.growthProfileConcurrency).all<GrowthProfileRow>();
  const claims: GrowthClaim[] = [];
  for (const row of eligible.results) {
    const claim = await claimProfile(env.DB, row, config.growthClaimLeaseSeconds);
    if (claim) claims.push(claim);
  }
  const settled = await runWithConcurrency(
    claims,
    config.growthProfileConcurrency,
    0,
    async (claim) => claim.row.phase === 'basic'
      ? fetchBasicBatch(env, claim, config.growthBackfillBatchSize)
      : fetchDojangBatch(env, claim, config.growthBackfillBatchSize),
  );
  let completed = 0;
  let retry = 0;
  let failed = 0;
  let requests = 0;
  const results: unknown[] = [];
  for (let index = 0; index < claims.length; index += 1) {
    const outcome = settled[index];
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
      requests += outcome.value.requests;
      if ('complete' in outcome.value && outcome.value.complete) completed += 1;
      continue;
    }
    const failure = await failGrowthClaim(env, claims[index], outcome.reason);
    if (failure.retryable) retry += 1;
    else failed += 1;
    results.push({ error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason) });
  }
  return { scheduled, processed: claims.length, completed, retry, failed, requests, results };
};

const publicJobStatus = (row: GrowthProfileRow, now = nowIso()) => {
  if (row.claim_until && row.claim_until > now) return 'running';
  // A retry remains an active job from the browser's point of view.  Keeping
  // it pollable avoids presenting a second "generate" action while the
  // server-side scheduler waits for the next backoff window.
  if (row.status === 'retry') return 'pending';
  return row.status;
};

export const getGrowthStatus = async (db: D1Database, ocid: string) => {
  const row = await getProfile(db, ocid);
  const availableEndDate = latestAvailableGrowthDate();
  if (!row) return { tracked: false, availableEndDate, job: null };
  const basicTotal = Math.max(1, Math.floor((Date.parse(`${row.sync_target_date}T00:00:00Z`)
    - Date.parse(`${row.scan_start_date}T00:00:00Z`)) / DAY_MS) + 1);
  const basicProcessed = row.basic_last_synced_date
    ? Math.max(0, Math.floor((Date.parse(`${row.basic_last_synced_date}T00:00:00Z`)
      - Date.parse(`${row.scan_start_date}T00:00:00Z`)) / DAY_MS) + 1)
    : 0;
  const dojangStart = row.history_start_date || row.scan_start_date;
  const dojangTotal = Math.max(1, Math.floor((Date.parse(`${row.sync_target_date}T00:00:00Z`)
    - Date.parse(`${dojangStart}T00:00:00Z`)) / DAY_MS) + 1);
  const dojangProcessed = row.dojang_last_synced_date
    ? Math.max(0, Math.floor((Date.parse(`${row.dojang_last_synced_date}T00:00:00Z`)
      - Date.parse(`${dojangStart}T00:00:00Z`)) / DAY_MS) + 1)
    : 0;
  const progress = row.phase === 'basic'
    ? (basicProcessed / basicTotal) * 50
    : 50 + (dojangProcessed / dojangTotal) * 50;
  return {
    tracked: true,
    historyStartDate: row.history_start_date,
    lastSyncedDate: row.last_synced_date,
    availableEndDate,
    status: row.status,
    progress: Math.max(0, Math.min(100, progress)),
    currentProcessingDate: row.current_processing_date,
    job: {
      status: publicJobStatus(row),
      phase: row.phase,
      lastProcessedDate: row.phase === 'basic' ? row.basic_last_synced_date : row.dojang_last_synced_date,
      error: row.last_error,
      nextRetryAt: row.next_retry_at,
    },
  };
};

const event = (date: string, type: string, from: unknown, to: unknown, title?: string) => ({
  date, type, title, from: String(from ?? ''), to: String(to ?? ''),
});

export const getGrowthHistory = async (db: D1Database, ocid: string, start: string, end: string) => {
  const profile = await getProfile(db, ocid);
  if (!profile) return null;
  const [result, previousResult] = await Promise.all([db.prepare(`
    SELECT * FROM growth_snapshots
    WHERE ocid = ?1 AND snapshot_date >= ?2 AND snapshot_date <= ?3
    ORDER BY snapshot_date ASC
  `).bind(ocid, start, end).all<GrowthSnapshotRow>(), db.prepare(`
    SELECT * FROM growth_snapshots
    WHERE ocid = ?1 AND snapshot_date < ?2
    ORDER BY snapshot_date DESC
    LIMIT 1
  `).bind(ocid, start).all<GrowthSnapshotRow>()]);
  const snapshots = result.results;
  const previousSnapshot = previousResult.results[0];
  const days = snapshots.map((row, index) => {
    const previous = snapshots[index - 1] || previousSnapshot;
    const sameLevel = previous && row.character_level === previous.character_level;
    const expGain = sameLevel ? Math.max(0, row.character_exp - previous.character_exp) : 0;
    return {
      date: row.snapshot_date,
      level: row.character_level,
      exp: String(row.character_exp),
      expRate: String(row.character_exp_rate),
      expGain: String(expGain),
      expPending: !previous || !sameLevel,
      growthPercent: sameLevel ? row.character_exp_rate - previous.character_exp_rate : null,
      growthBucket: 0,
      active: Boolean(previous && sameLevel && expGain > 0),
      name: row.character_name,
      world: row.world_name,
      class: row.job_name,
      guild: row.guild_name || '',
      liberationStatus: row.liberation_status ?? '',
      dojangBestFloor: row.dojang_best_floor,
      dojangBestTime: row.dojang_best_time,
      dojangRecordDate: row.dojang_record_date,
    };
  });
  const positiveGains = days.filter((day) => !day.expPending && Number(day.expGain) > 0)
    .map((day) => Number(day.expGain)).sort((left, right) => left - right);
  for (const day of days) {
    const gain = Number(day.expGain);
    if (day.expPending || gain <= 0 || positiveGains.length === 0) continue;
    const rank = positiveGains.filter((value) => value <= gain).length;
    day.growthBucket = Math.max(1, Math.min(4, Math.ceil((rank / positiveGains.length) * 4)));
  }
  const events: ReturnType<typeof event>[] = [];
  for (let index = 0; index < snapshots.length; index += 1) {
    const previous = snapshots[index - 1] || previousSnapshot;
    const current = snapshots[index];
    if (!previous) continue;
    if (current.character_level !== previous.character_level) {
      events.push(event(current.snapshot_date, 'level', previous.character_level, current.character_level));
    }
    if (current.character_name !== previous.character_name) {
      events.push(event(current.snapshot_date, 'name', previous.character_name, current.character_name));
    }
    if (current.job_name !== previous.job_name) {
      events.push(event(current.snapshot_date, 'class', previous.job_name, current.job_name));
    }
    if (current.world_name !== previous.world_name) {
      events.push(event(current.snapshot_date, 'world', previous.world_name, current.world_name));
    }
    if ((current.guild_name || '') !== (previous.guild_name || '')) {
      events.push(event(current.snapshot_date, 'guild', previous.guild_name, current.guild_name));
    }
    if ((current.liberation_status || '') !== (previous.liberation_status || '')) {
      events.push(event(current.snapshot_date, 'liberation', previous.liberation_status, current.liberation_status));
    }
    const previousFloor = Number(previous.dojang_best_floor) || 0;
    const currentFloor = Number(current.dojang_best_floor) || 0;
    const previousTime = Number(previous.dojang_best_time) || 0;
    const currentTime = Number(current.dojang_best_time) || 0;
    if (currentFloor !== previousFloor) {
      events.push(event(current.snapshot_date, 'dojang', `${previousFloor}F`, `${currentFloor}F`, '武陵最高樓層變化'));
    } else if (currentFloor > 0 && currentTime > 0 && previousTime > 0 && currentTime < previousTime) {
      events.push(event(current.snapshot_date, 'dojang', `${previousTime}秒`, `${currentTime}秒`, '武陵最佳時間刷新'));
    }
  }
  const activeDays = days.filter((day) => day.active).length;
  let longestStreak = 0;
  let streak = 0;
  for (const day of days) {
    streak = day.active ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }
  const bestDay = days.reduce<{ date: string; expGain: string } | null>((best, day) => (
    !day.expPending && Number(day.expGain) > Number(best?.expGain || 0)
      ? { date: day.date, expGain: day.expGain }
      : best
  ), null);
  const first = snapshots[0];
  const last = snapshots.at(-1);
  return {
    server: 'tms', ocid, start, end, days,
    stats: {
      activeDays,
      longestStreak,
      levelGain: first && last ? last.character_level - first.character_level : 0,
      bestDay,
    },
    events,
    historyStartDate: profile.history_start_date,
    lastSyncedDate: profile.last_synced_date,
    availableEndDate: latestAvailableGrowthDate(),
    exactCrossLevelExpGain: false,
  };
};
