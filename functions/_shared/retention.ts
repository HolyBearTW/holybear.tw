import type { Env } from './env';
import { getRuntimeConfig } from './runtime-config';

const nowIso = () => new Date().toISOString();

export const RETENTION_CRON = '17 3 * * *';

export interface MergeEventArchiveRow {
  id: number;
  timestamp: string;
  [key: string]: unknown;
}

/** Deterministic, reviewable key for optional immutable merge-event archival. */
export const mergeEventObjectKey = (row: Pick<MergeEventArchiveRow, 'id' | 'timestamp'>) => {
  const date = new Date(row.timestamp);
  const year = Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 4) : 'unknown';
  const month = Number.isFinite(date.getTime()) ? date.toISOString().slice(5, 7) : 'unknown';
  return `account-group-merge-events/v1/${year}/${month}/${row.id}.json`;
};

const stableJson = (row: MergeEventArchiveRow) => JSON.stringify(
  Object.fromEntries(Object.keys(row).sort().map((key) => [key, row[key]])),
);

const sha256Hex = async (bytes: Uint8Array) => {
  // Copy into a concrete ArrayBuffer for the Workers and Node WebCrypto type
  // definitions (which reject SharedArrayBuffer-backed views).
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', input.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const readArchivedBytes = async (object: R2ObjectBody) => {
  if (typeof object.arrayBuffer === 'function') return new Uint8Array(await object.arrayBuffer());
  if (typeof object.text === 'function') return new TextEncoder().encode(await object.text());
  throw new Error('Archived merge-event object has no readable body');
};

/** Archive one immutable merge event and verify the exact stored bytes. */
export const archiveMergeEvent = async (
  env: Pick<Env, 'EVIDENCE_ARCHIVE'>,
  row: MergeEventArchiveRow,
) => {
  if (!env.EVIDENCE_ARCHIVE) throw new Error('Evidence archive is not configured');
  const key = mergeEventObjectKey(row);
  const payload = stableJson(row);
  const bytes = new TextEncoder().encode(payload);
  const sha256 = await sha256Hex(bytes);
  await env.EVIDENCE_ARCHIVE.put(key, payload, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: { sha256, size: String(bytes.byteLength) },
  });
  const archived = await env.EVIDENCE_ARCHIVE.get(key);
  if (!archived) throw new Error(`Archived merge-event object missing (${key})`);
  const archivedBytes = await readArchivedBytes(archived);
  const archivedSha256 = await sha256Hex(archivedBytes);
  if (archivedBytes.byteLength !== bytes.byteLength || archivedSha256 !== sha256) {
    throw new Error(`Archived merge-event verification failed (${key})`);
  }
  return key;
};

export interface RetentionRunOptions {
  dryRun?: boolean;
  now?: string;
  batchSize?: number;
  maxBatches?: number;
  maxRowsDeleted?: number;
  maxRuntimeMs?: number;
  maxD1Operations?: number;
}

interface CountRow { count: number | string | null }
interface AggregateRow {
  count: number | string | null;
  oldest_at: string | null;
  newly: number | string | null;
}

export interface RetentionCategoryResult {
  cutoff: string;
  rowsExamined: number;
  eligible: number;
  deleted: number;
  skippedActive: number;
  skippedPaused: number;
  skippedFailed: number;
  skippedRecent: number;
  oldestEligibleAt: string | null;
  oldestEligibleAgeSeconds: number | null;
  /** Rows that entered eligibility during the 24h window immediately before cutoff. */
  newlyEligibleRows: number;
  archived: number;
  archiveFailures: number;
  error?: string;
}

export interface RetentionRunResult {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  cutoff: Record<string, string>;
  rowsExamined: number;
  d1Operations: number;
  rowsDeleted: Record<string, number>;
  errors: Array<{ category: string; message: string }>;
  categories: Record<string, RetentionCategoryResult>;
  limits: {
    batchSize: number;
    maxBatches: number;
    maxRowsDeleted: number;
    maxRuntimeMs: number;
    maxD1Operations: number;
  };
}

interface OperationBudget { used: number; max: number }

const consumeOperation = (budget?: OperationBudget) => {
  if (!budget) return;
  budget.used += 1;
  if (budget.used > budget.max) throw new Error(`retention D1 operation budget exceeded (${budget.max})`);
};

const count = async (
  db: D1Database,
  sql: string,
  ...args: Array<string | number | null | OperationBudget | undefined>
) => {
  const maybeBudget = args[args.length - 1];
  const budget = maybeBudget && typeof maybeBudget === 'object' ? args.pop() as OperationBudget : undefined;
  consumeOperation(budget);
  const bindings = args as Array<string | number | null>;
  const row = await db.prepare(sql).bind(...bindings).first<CountRow>();
  return Number(row?.count) || 0;
};

const aggregate = async (
  db: D1Database,
  sql: string,
  bindings: Array<string | number | null>,
  budget?: OperationBudget,
) => {
  consumeOperation(budget);
  return db.prepare(sql).bind(...bindings).first<AggregateRow>();
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 2_000);

const acquireRetentionLease = async (
  db: D1Database,
  token: string,
  leaseUntil: string,
  startedAt: string,
  budget: OperationBudget,
) => {
  consumeOperation(budget);
  const result = await db.prepare(`
    UPDATE maintenance_state
    SET lease_token = ?1, lease_until = ?2, last_started_at = ?3, updated_at = ?3
    WHERE name = 'retention'
      AND (lease_until IS NULL OR lease_until <= ?3)
  `).bind(token, leaseUntil, startedAt).run() as { meta?: { changes?: number } };
  let changes = Number(result.meta?.changes);
  if (!Number.isFinite(changes)) {
    consumeOperation(budget);
    changes = Number((await db.prepare('SELECT changes() AS count').first<CountRow>())?.count) || 0;
  }
  return changes === 1;
};

const category = (
  cutoff: string,
  aggregateRow: AggregateRow | null,
  skippedActive: number,
  skippedPaused: number,
  skippedRecent: number,
  skippedFailed = 0,
  now = nowIso(),
): RetentionCategoryResult => ({
  cutoff,
  rowsExamined: (Number(aggregateRow?.count) || 0) + skippedActive + skippedPaused + skippedFailed + skippedRecent,
  eligible: Number(aggregateRow?.count) || 0,
  deleted: 0,
  skippedActive,
  skippedPaused,
  skippedFailed,
  skippedRecent,
  oldestEligibleAt: aggregateRow?.oldest_at ?? null,
  oldestEligibleAgeSeconds: aggregateRow?.oldest_at && Number.isFinite(Date.parse(aggregateRow.oldest_at))
    ? Math.max(0, Math.floor((Date.parse(now) - Date.parse(aggregateRow.oldest_at)) / 1000))
    : null,
  newlyEligibleRows: Number(aggregateRow?.newly) || 0,
  archived: 0,
  archiveFailures: 0,
});

const stagingStats = async (db: D1Database, cutoff: string, now: string, budget?: OperationBudget) => {
  const newlyCutoff = new Date(Date.parse(cutoff) - 86_400_000).toISOString();
  const [eligible, active, paused, failed, recent] = await Promise.all([
    aggregate(db, `SELECT COUNT(*) AS count, MIN(s.updated_at) AS oldest_at,
        SUM(CASE WHEN s.updated_at >= ?3 AND s.updated_at < ?1 THEN 1 ELSE 0 END) AS newly
      FROM character_import_staging s
      JOIN import_jobs j ON j.id = s.import_job_id
      WHERE s.status = 'resolved' AND j.status = 'completed'
        AND (j.lease_until IS NULL OR j.lease_until <= ?2) AND s.updated_at < ?1`, [cutoff, now, newlyCutoff], budget),
    count(db, `SELECT COUNT(*) AS count FROM character_import_staging s
      JOIN import_jobs j ON j.id = s.import_job_id
      WHERE j.status NOT IN ('paused', 'failed') AND (
        s.status IN ('pending', 'resolving', 'retry')
        OR j.status IN ('pending', 'running')
        OR (j.status = 'completed' AND j.lease_until > ?1)
      )`, now, budget),
    count(db, `SELECT COUNT(*) AS count FROM character_import_staging s
      JOIN import_jobs j ON j.id = s.import_job_id
      WHERE j.status = 'paused'`, budget),
    count(db, `SELECT COUNT(*) AS count FROM character_import_staging s
      JOIN import_jobs j ON j.id = s.import_job_id
      WHERE j.status = 'failed' OR s.status = 'failed'`, budget),
    count(db, `SELECT COUNT(*) AS count FROM character_import_staging s
      JOIN import_jobs j ON j.id = s.import_job_id
      WHERE s.status = 'resolved' AND j.status = 'completed'
        AND (j.lease_until IS NULL OR j.lease_until <= ?2) AND s.updated_at >= ?1`, cutoff, now, budget),
  ]);
  return category(cutoff, eligible, active, paused, recent, failed, now);
};

const errorStats = async (db: D1Database, cutoff: string, now: string, budget?: OperationBudget) => {
  const newlyCutoff = new Date(Date.parse(cutoff) - 86_400_000).toISOString();
  const [eligible, active, paused, failed, recent] = await Promise.all([
    aggregate(db, `SELECT COUNT(*) AS count, MIN(e.created_at) AS oldest_at,
        SUM(CASE WHEN e.created_at >= ?3 AND e.created_at < ?1 THEN 1 ELSE 0 END) AS newly
      FROM import_job_errors e
      JOIN import_jobs j ON j.id = e.import_job_id
      WHERE j.status = 'completed' AND (j.lease_until IS NULL OR j.lease_until <= ?2) AND e.created_at < ?1`, [cutoff, now, newlyCutoff], budget),
    count(db, `SELECT COUNT(*) AS count FROM import_job_errors e
      JOIN import_jobs j ON j.id = e.import_job_id
      WHERE j.status NOT IN ('paused', 'failed') AND (
        j.status IN ('pending', 'running') OR (j.status = 'completed' AND j.lease_until > ?1)
      )`, now, budget),
    count(db, `SELECT COUNT(*) AS count FROM import_job_errors e
      JOIN import_jobs j ON j.id = e.import_job_id
      WHERE j.status = 'paused'`, budget),
    count(db, `SELECT COUNT(*) AS count FROM import_job_errors e
      JOIN import_jobs j ON j.id = e.import_job_id
      WHERE j.status = 'failed'`, budget),
    count(db, `SELECT COUNT(*) AS count FROM import_job_errors e
      JOIN import_jobs j ON j.id = e.import_job_id
      WHERE j.status = 'completed' AND (j.lease_until IS NULL OR j.lease_until <= ?2) AND e.created_at >= ?1`, cutoff, now, budget),
  ]);
  return category(cutoff, eligible, active, paused, recent, failed, now);
};

const guildStats = async (db: D1Database, cutoff: string, now: string, budget?: OperationBudget) => {
  const newlyCutoff = new Date(Date.parse(cutoff) - 86_400_000).toISOString();
  const [eligible, active, paused, failed, recent] = await Promise.all([
    aggregate(db, `SELECT COUNT(*) AS count, MIN(c.observed_at) AS oldest_at,
        SUM(CASE WHEN c.observed_at >= ?3 AND c.observed_at < ?1 THEN 1 ELSE 0 END) AS newly
      FROM guild_import_candidates c
      JOIN import_jobs j ON j.id = c.import_job_id
      WHERE c.status = 'completed' AND j.status = 'completed'
        AND c.observed_at IS NOT NULL AND c.observed_at < ?1
        AND (j.lease_until IS NULL OR j.lease_until <= ?2)`, [cutoff, now, newlyCutoff], budget),
    count(db, `SELECT COUNT(*) AS count FROM guild_import_candidates c
      JOIN import_jobs j ON j.id = c.import_job_id
      WHERE j.status NOT IN ('paused', 'failed') AND (
        c.status IN ('pending', 'retry')
        OR j.status IN ('pending', 'running')
        OR (j.status = 'completed' AND j.lease_until > ?1)
      )`, now, budget),
    count(db, `SELECT COUNT(*) AS count FROM guild_import_candidates c
      JOIN import_jobs j ON j.id = c.import_job_id
      WHERE j.status = 'paused'`, budget),
    count(db, `SELECT COUNT(*) AS count FROM guild_import_candidates c
      JOIN import_jobs j ON j.id = c.import_job_id
      WHERE j.status = 'failed' OR c.status = 'failed'`, budget),
    count(db, `SELECT COUNT(*) AS count FROM guild_import_candidates c
      JOIN import_jobs j ON j.id = c.import_job_id
      WHERE c.status = 'completed' AND j.status = 'completed'
        AND c.observed_at IS NOT NULL AND c.observed_at >= ?1
        AND (j.lease_until IS NULL OR j.lease_until <= ?2)`, cutoff, now, budget),
  ]);
  return category(cutoff, eligible, active, paused, recent, failed, now);
};

const mergeEventStats = async (db: D1Database, cutoff: string, _now: string, budget?: OperationBudget) => {
  const newlyCutoff = new Date(Date.parse(cutoff) - 86_400_000).toISOString();
  const eligible = await aggregate(
    db,
    `SELECT COUNT(*) AS count, MIN(timestamp) AS oldest_at,
        SUM(CASE WHEN timestamp >= ?2 AND timestamp < ?1 THEN 1 ELSE 0 END) AS newly
      FROM account_group_merge_events WHERE timestamp < ?1`,
    [cutoff, newlyCutoff],
    budget,
  );
  const skippedRecent = await count(
    db,
    'SELECT COUNT(*) AS count FROM account_group_merge_events WHERE timestamp >= ?1',
    cutoff,
    budget,
  );
  return category(cutoff, eligible, 0, 0, skippedRecent, 0, _now);
};

const selectMergeEventBatch = async (
  db: D1Database,
  cutoff: string,
  limit: number,
  budget: OperationBudget,
) => {
  consumeOperation(budget);
  const result = await db.prepare(`
    SELECT * FROM account_group_merge_events
    WHERE timestamp < ?1
    ORDER BY timestamp ASC, id ASC
    LIMIT ?2
  `).bind(cutoff, limit).all<MergeEventArchiveRow>();
  return result.results;
};

const deleteMergeEventRows = async (
  db: D1Database,
  rows: MergeEventArchiveRow[],
  cutoff: string,
  budget: OperationBudget,
) => {
  let deleted = 0;
  // Keep well below D1's bound-parameter limit while deleting a verified
  // archive batch with a bounded number of statements.
  for (let offset = 0; offset < rows.length; offset += 90) {
    const ids = rows.slice(offset, offset + 90).map((row) => row.id);
    const placeholders = ids.map((_, index) => `?${index + 2}`).join(', ');
    consumeOperation(budget);
    const result = await db.prepare(`
      DELETE FROM account_group_merge_events
      WHERE timestamp < ?1 AND id IN (${placeholders})
    `).bind(cutoff, ...ids).run() as { meta?: { changes?: number } };
    const changes = Number(result.meta?.changes);
    deleted += Number.isFinite(changes) ? changes : 0;
  }
  return deleted;
};

const deleteStagingBatch = (db: D1Database, cutoff: string, now: string, limit: number) => db.prepare(`
  DELETE FROM character_import_staging
  WHERE id IN (
    SELECT s.id FROM character_import_staging s
    JOIN import_jobs j ON j.id = s.import_job_id
    WHERE s.status = 'resolved' AND j.status = 'completed'
      AND (j.lease_until IS NULL OR j.lease_until <= ?2) AND s.updated_at < ?1
    ORDER BY s.id LIMIT ?3
  )
`).bind(cutoff, now, limit);

const deleteErrorBatch = (db: D1Database, cutoff: string, now: string, limit: number) => db.prepare(`
  DELETE FROM import_job_errors
  WHERE id IN (
    SELECT e.id FROM import_job_errors e
    JOIN import_jobs j ON j.id = e.import_job_id
    WHERE j.status = 'completed' AND (j.lease_until IS NULL OR j.lease_until <= ?2) AND e.created_at < ?1
    ORDER BY e.id LIMIT ?3
  )
`).bind(cutoff, now, limit);

const deleteGuildBatch = (db: D1Database, cutoff: string, now: string, limit: number) => db.prepare(`
  DELETE FROM guild_import_candidates
  WHERE id IN (
    SELECT c.id FROM guild_import_candidates c
    JOIN import_jobs j ON j.id = c.import_job_id
    WHERE c.status = 'completed' AND j.status = 'completed'
      AND c.observed_at IS NOT NULL AND c.observed_at < ?1
      AND (j.lease_until IS NULL OR j.lease_until <= ?2)
    ORDER BY c.id LIMIT ?3
  )
`).bind(cutoff, now, limit);

const executeOneDeleteBatch = async (
  db: D1Database,
  makeStatement: (limit: number) => D1PreparedStatement,
  initial: RetentionCategoryResult,
  state: { batches: number; rowsDeleted: number; startedMs: number },
  limits: Required<Pick<RetentionRunOptions, 'batchSize' | 'maxBatches' | 'maxRowsDeleted' | 'maxRuntimeMs'>> & { operationBudget: OperationBudget },
) => {
  if (initial.eligible <= initial.deleted || state.batches >= limits.maxBatches
    || state.rowsDeleted >= limits.maxRowsDeleted
    || Date.now() - state.startedMs >= limits.maxRuntimeMs) return false;
  const limit = Math.min(limits.batchSize, limits.maxRowsDeleted - state.rowsDeleted);
  consumeOperation(limits.operationBudget);
  const result = await makeStatement(limit).run() as { meta?: { changes?: number } };
  const changes = Number(result.meta?.changes);
  const deleted = Number.isFinite(changes) ? changes : 0;
  state.batches += 1;
  state.rowsDeleted += deleted;
  initial.deleted += deleted;
  return deleted > 0;
};

const executeOneMergeEventBatch = async (
  env: Pick<Env, 'DB' | 'EVIDENCE_ARCHIVE'>,
  cutoff: string,
  initial: RetentionCategoryResult,
  state: { batches: number; rowsDeleted: number; startedMs: number },
  limits: Required<Pick<RetentionRunOptions, 'batchSize' | 'maxBatches' | 'maxRowsDeleted' | 'maxRuntimeMs'>> & { operationBudget: OperationBudget },
) => {
  if (initial.eligible <= initial.deleted || state.batches >= limits.maxBatches
    || state.rowsDeleted >= limits.maxRowsDeleted
    || Date.now() - state.startedMs >= limits.maxRuntimeMs) return false;
  if (!env.EVIDENCE_ARCHIVE) throw new Error('Evidence archive is not configured');
  const limit = Math.min(limits.batchSize, limits.maxRowsDeleted - state.rowsDeleted);
  const rows = await selectMergeEventBatch(env.DB, cutoff, limit, limits.operationBudget);
  if (!rows.length) return false;
  state.batches += 1;
  const verified: MergeEventArchiveRow[] = [];
  for (const row of rows) {
    try {
      await archiveMergeEvent(env, row);
      initial.archived += 1;
      verified.push(row);
    } catch (error) {
      initial.archiveFailures += 1;
      initial.error = errorMessage(error);
    }
  }
  if (!verified.length) return true;
  const deleted = await deleteMergeEventRows(env.DB, verified, cutoff, limits.operationBudget);
  initial.deleted += deleted;
  state.rowsDeleted += deleted;
  return true;
};

export const getRetentionGuardrails = async (db: D1Database) => {
  const [characters, characterSources, legacyRaw, signalEvidence, staging, errors, guildCandidates, mergeEvents] = await Promise.all([
    count(db, 'SELECT COUNT(*) AS count FROM characters'),
    count(db, 'SELECT COUNT(*) AS count FROM character_sources'),
    count(db, 'SELECT COUNT(*) AS count FROM character_sources WHERE raw_json IS NOT NULL'),
    count(db, 'SELECT COUNT(*) AS count FROM account_group_signals WHERE evidence_json IS NOT NULL'),
    db.prepare('SELECT status, COUNT(*) AS count FROM character_import_staging GROUP BY status').all<{ status: string; count: number }>(),
    count(db, 'SELECT COUNT(*) AS count FROM import_job_errors'),
    db.prepare('SELECT status, COUNT(*) AS count FROM guild_import_candidates GROUP BY status').all<{ status: string; count: number }>(),
    count(db, 'SELECT COUNT(*) AS count FROM account_group_merge_events'),
  ]);
  return {
    characters,
    characterSources,
    characterSourcesRawJson: legacyRaw,
    accountGroupSignalsEvidenceJson: signalEvidence,
    stagingByStatus: Object.fromEntries(staging.results.map((row) => [row.status, Number(row.count) || 0])),
    importJobErrors: errors,
    guildCandidatesByStatus: Object.fromEntries(guildCandidates.results.map((row) => [row.status, Number(row.count) || 0])),
    accountGroupMergeEvents: mergeEvents,
  };
};

export const getRetentionState = async (db: D1Database) => db.prepare(`
  SELECT name, last_started_at, last_finished_at, last_result_json, updated_at
  FROM maintenance_state WHERE name = 'retention'
`).first<Record<string, string | null>>();

export const runRetention = async (env: Pick<Env, 'DB' | 'EVIDENCE_ARCHIVE'>, options: RetentionRunOptions = {}): Promise<RetentionRunResult> => {
  const config = getRuntimeConfig(env as Env);
  const startedAt = options.now ?? nowIso();
  const startedMs = Date.now();
  const batchSize = Math.min(2_000, Math.max(1, Math.trunc(options.batchSize ?? config.retentionBatchSize)));
  const maxBatches = Math.min(32, Math.max(1, Math.trunc(options.maxBatches ?? config.retentionMaxBatches)));
  const maxRowsDeleted = Math.min(10_000, Math.max(1, Math.trunc(options.maxRowsDeleted ?? config.retentionMaxRowsDeleted)));
  const maxRuntimeMs = Math.min(120_000, Math.max(1_000, Math.trunc(options.maxRuntimeMs ?? config.retentionMaxRuntimeMs)));
  const maxD1Operations = Math.min(128, Math.max(8, Math.trunc(options.maxD1Operations ?? config.retentionMaxD1Operations)));
  const operationBudget: OperationBudget = { used: 0, max: maxD1Operations };
  const limits = { batchSize, maxBatches, maxRowsDeleted, maxRuntimeMs, maxD1Operations };
  const nowMs = Date.parse(startedAt);
  const cutoffAt = (days: number) => new Date((Number.isFinite(nowMs) ? nowMs : Date.now()) - days * 86_400_000).toISOString();
  const cutoffs = {
    staging: cutoffAt(config.retentionStagingDays),
    importJobErrors: cutoffAt(config.retentionImportErrorDays),
    guildCandidates: cutoffAt(config.retentionGuildDays),
    mergeEvents: cutoffAt(config.retentionMergeEventDays),
  };
  const result: RetentionRunResult = {
    dryRun: options.dryRun ?? true,
    startedAt,
    finishedAt: startedAt,
    cutoff: cutoffs,
    rowsExamined: 0,
    d1Operations: 0,
    rowsDeleted: {},
    errors: [],
    categories: {},
    limits,
  };

  let leaseToken: string | null = null;
  if (!result.dryRun) {
    leaseToken = globalThis.crypto?.randomUUID?.() ?? `${startedAt}-${Math.random().toString(36).slice(2)}`;
    const startedTimeMs = Date.parse(startedAt);
    const leaseBaseMs = Number.isFinite(startedTimeMs) ? startedTimeMs : Date.now();
    const leaseUntil = new Date(leaseBaseMs + maxRuntimeMs + 60_000).toISOString();
    const acquired = await acquireRetentionLease(env.DB, leaseToken, leaseUntil, startedAt, operationBudget);
    if (!acquired) {
      result.finishedAt = nowIso();
      result.errors.push({ category: 'retention', message: 'retention lease busy; overlapping run skipped' });
      result.d1Operations = operationBudget.used;
      return result;
    }
  }

  const categories: Array<{
    name: string;
    cutoff: string;
    stats: () => Promise<RetentionCategoryResult>;
    statement: (cutoff: string, now: string, limit: number) => D1PreparedStatement;
  }> = [
    { name: 'character_import_staging', cutoff: cutoffs.staging, stats: () => stagingStats(env.DB, cutoffs.staging, startedAt, operationBudget), statement: (cutoff, now, limit) => deleteStagingBatch(env.DB, cutoff, now, limit) },
    { name: 'import_job_errors', cutoff: cutoffs.importJobErrors, stats: () => errorStats(env.DB, cutoffs.importJobErrors, startedAt, operationBudget), statement: (cutoff, now, limit) => deleteErrorBatch(env.DB, cutoff, now, limit) },
    { name: 'guild_import_candidates', cutoff: cutoffs.guildCandidates, stats: () => guildStats(env.DB, cutoffs.guildCandidates, startedAt, operationBudget), statement: (cutoff, now, limit) => deleteGuildBatch(env.DB, cutoff, now, limit) },
  ];
  const state = { batches: 0, rowsDeleted: 0, startedMs };
  const runnableCategories: Array<{
    name: string;
    cutoff: string;
    stats: RetentionCategoryResult;
    statement: (cutoff: string, now: string, limit: number) => D1PreparedStatement;
    disabled: boolean;
  }> = [];
  for (const item of categories) {
    try {
      const stats = await item.stats();
      result.categories[item.name] = stats;
      result.rowsExamined += stats.rowsExamined;
      result.rowsDeleted[item.name] = stats.deleted;
      runnableCategories.push({ name: item.name, cutoff: item.cutoff, stats, statement: item.statement, disabled: false });
    } catch (error) {
      const message = errorMessage(error);
      result.errors.push({ category: item.name, message });
      result.categories[item.name] = {
        cutoff: item.cutoff, rowsExamined: 0, eligible: 0, deleted: 0,
        skippedActive: 0, skippedPaused: 0, skippedFailed: 0, skippedRecent: 0,
        oldestEligibleAt: null, oldestEligibleAgeSeconds: null, newlyEligibleRows: 0,
        archived: 0, archiveFailures: 0, error: message,
      };
      result.rowsDeleted[item.name] = 0;
    }
  }
  let mergeStats: RetentionCategoryResult | null = null;
  try {
    mergeStats = await mergeEventStats(env.DB, cutoffs.mergeEvents, startedAt, operationBudget);
    result.categories.account_group_merge_events = mergeStats;
    result.rowsExamined += mergeStats.rowsExamined;
    result.rowsDeleted.account_group_merge_events = mergeStats.deleted;
  } catch (error) {
    const message = errorMessage(error);
    result.errors.push({ category: 'account_group_merge_events', message });
    result.categories.account_group_merge_events = {
      cutoff: cutoffs.mergeEvents, rowsExamined: 0, eligible: 0, deleted: 0,
      skippedActive: 0, skippedPaused: 0, skippedFailed: 0, skippedRecent: 0,
      oldestEligibleAt: null, oldestEligibleAgeSeconds: null, newlyEligibleRows: 0,
      archived: 0, archiveFailures: 0, error: message,
    };
    result.rowsDeleted.account_group_merge_events = 0;
  }
  if (!result.dryRun) {
    if (mergeStats) {
      runnableCategories.push({
        name: 'account_group_merge_events',
        cutoff: cutoffs.mergeEvents,
        stats: mergeStats,
        statement: () => env.DB.prepare('SELECT 1'),
        disabled: false,
      });
    }
    // One batch per category per round prevents a single backlog from
    // permanently starving the other retention sources.
    while (state.batches < limits.maxBatches && state.rowsDeleted < limits.maxRowsDeleted
      && Date.now() - state.startedMs < limits.maxRuntimeMs) {
      let progressed = false;
      for (const item of runnableCategories) {
        if (item.disabled) continue;
        if (state.batches >= limits.maxBatches || state.rowsDeleted >= limits.maxRowsDeleted
          || Date.now() - state.startedMs >= limits.maxRuntimeMs) break;
        try {
          const didWork = item.name === 'account_group_merge_events'
            ? await executeOneMergeEventBatch(env, item.cutoff, item.stats, state, { ...limits, operationBudget })
            : await executeOneDeleteBatch(env.DB, (limit) => item.statement(item.cutoff, startedAt, limit), item.stats, state, { ...limits, operationBudget });
          result.rowsDeleted[item.name] = item.stats.deleted;
          if (item.name === 'account_group_merge_events' && item.stats.archiveFailures > 0) {
            result.errors.push({
              category: item.name,
              message: item.stats.error ?? 'merge-event archive failed; rows retained',
            });
            // Do not retry the same failed rows repeatedly in one run; the
            // next scheduled run provides the bounded retry opportunity.
            item.disabled = true;
          }
          progressed = progressed || didWork;
        } catch (error) {
          const message = errorMessage(error);
          result.errors.push({ category: item.name, message });
          item.stats.error = message;
          item.disabled = true;
          break;
        }
      }
      if (!progressed) break;
    }
  }
  for (const item of runnableCategories) {
    result.rowsDeleted[item.name] = item.stats.deleted;
  }

  result.finishedAt = nowIso();
  if (!result.dryRun) {
    consumeOperation(operationBudget);
    result.d1Operations = operationBudget.used;
    await env.DB.prepare(`
      UPDATE maintenance_state
      SET last_finished_at = ?1, last_result_json = ?2, lease_token = NULL, lease_until = NULL, updated_at = ?1
      WHERE name = 'retention' AND lease_token = ?3
    `).bind(result.finishedAt, JSON.stringify(result).slice(0, 20_000), leaseToken).run();
  }
  if (result.dryRun) result.d1Operations = operationBudget.used;
  return result;
};

export const getRetentionStatus = async (env: Pick<Env, 'DB' | 'EVIDENCE_ARCHIVE'>) => ({
  state: await getRetentionState(env.DB),
  guardrails: await getRetentionGuardrails(env.DB),
  dryRun: await runRetention(env, { dryRun: true }),
});
