import { normalizeCharacterName, upsertCanonicalNexonCharacter } from './character-repository';
import type { Env } from './env';
import type { CharacterSource } from './models';
import { NexonRequestError, resolveNexonCharacter, runWithConcurrency } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';
import type { SeedCharacter, SeedPage } from './importers/importer';

export interface ImportJobRow {
  id: number;
  source: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  last_page: number;
  checkpoint_json: string | null;
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  last_error: string | null;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface StagingRow {
  id: number;
  import_job_id: number | null;
  source: CharacterSource;
  source_id: string;
  character_name: string;
  ocid: string | null;
  status: string;
  attempt_count: number;
  source_updated_at: string | null;
  observed_at: string | null;
}

const nowIso = () => new Date().toISOString();

export const getImportJob = async (db: D1Database, id: number) => db
  .prepare('SELECT * FROM import_jobs WHERE id = ?1 LIMIT 1')
  .bind(id)
  .first<ImportJobRow>();

export const getOrCreateImportJob = async (db: D1Database, source: string, requestedId?: number) => {
  if (requestedId) {
    const requested = await getImportJob(db, requestedId);
    if (!requested || requested.source !== source) throw new Error('Import job does not match the requested source');
    return requested;
  }
  const existing = await db.prepare(`
    SELECT * FROM import_jobs
    WHERE source = ?1 AND status <> 'completed'
    ORDER BY id DESC LIMIT 1
  `).bind(source).first<ImportJobRow>();
  if (existing) return existing;
  const timestamp = nowIso();
  const created = await db.prepare(`
    INSERT INTO import_jobs (source, status, started_at, updated_at)
    VALUES (?1, 'pending', ?2, ?2)
    RETURNING *
  `).bind(source, timestamp).first<ImportJobRow>();
  if (!created) throw new Error('Unable to create import job');
  return created;
};

const stagingStatement = (
  db: D1Database,
  jobId: number,
  source: string,
  items: SeedCharacter[],
) => {
  const bindings: Array<string | number | null> = [];
  const values = items.map((item) => {
    const offset = bindings.length;
    bindings.push(
      jobId,
      source,
      item.sourceId,
      item.characterName.normalize('NFC'),
      normalizeCharacterName(item.characterName),
      item.worldName,
      item.jobName,
      Math.max(0, Math.trunc(item.level)),
      Math.max(0, Math.trunc(item.combatPower)),
      item.characterImage,
      item.sourceUpdatedAt ?? null,
      item.observedAt ?? nowIso(),
    );
    return `(${Array.from({ length: 12 }, (_, index) => `?${offset + index + 1}`).join(', ')})`;
  });
  return db.prepare(`
    INSERT INTO character_import_staging (
      import_job_id, source, source_id, character_name, normalized_name,
      world_name, job_name, level, combat_power, character_image
      , source_updated_at, observed_at
    ) VALUES ${values.join(', ')}
    ON CONFLICT(source, source_id) DO UPDATE SET
      import_job_id = excluded.import_job_id,
      character_name = excluded.character_name,
      normalized_name = excluded.normalized_name,
      world_name = excluded.world_name,
      job_name = excluded.job_name,
      level = excluded.level,
      combat_power = excluded.combat_power,
      character_image = excluded.character_image,
      source_updated_at = COALESCE(excluded.source_updated_at, character_import_staging.source_updated_at),
      observed_at = excluded.observed_at,
      updated_at = excluded.updated_at
  `).bind(...bindings);
};

export const checkpointSeedPage = async (
  db: D1Database,
  job: ImportJobRow,
  page: SeedPage,
) => {
  const timestamp = nowIso();
  const statements: D1PreparedStatement[] = [];
  for (let index = 0; index < page.items.length; index += 8) {
    statements.push(stagingStatement(db, job.id, job.source, page.items.slice(index, index + 8)));
  }
  const checkpoint = JSON.stringify({
    stageComplete: page.complete,
    total: page.total,
    pageSize: page.pageSize,
  });
  statements.push(db.prepare(`
    UPDATE import_jobs SET
      status = 'running', last_page = ?2, checkpoint_json = ?3,
      imported_count = imported_count + ?4, last_error = NULL, updated_at = ?5
    WHERE id = ?1
  `).bind(job.id, page.page, checkpoint, page.items.length, timestamp));
  await db.batch(statements);
  return getImportJob(db, job.id);
};

export const failImportJob = async (db: D1Database, jobId: number, error: unknown, page?: number) => {
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = nowIso();
  await db.batch([
    db.prepare(`
      UPDATE import_jobs SET status = 'failed', last_error = ?2,
        failed_count = failed_count + 1, updated_at = ?3
      WHERE id = ?1
    `).bind(jobId, message.slice(0, 1000), timestamp),
    db.prepare(`
      INSERT INTO import_job_errors (import_job_id, source, page, error_message, created_at)
      SELECT id, source, ?2, ?3, ?4 FROM import_jobs WHERE id = ?1
    `).bind(jobId, page ?? null, message.slice(0, 1000), timestamp),
  ]);
};

const markResolutionFailure = async (
  db: D1Database,
  jobId: number,
  row: StagingRow,
  error: unknown,
  retryLimit: number,
) => {
  const message = error instanceof Error ? error.message : String(error);
  const retryable = !(error instanceof NexonRequestError) || error.retryable;
  const attemptCount = row.attempt_count + 1;
  const shouldRetry = retryable && attemptCount < retryLimit;
  const retryAt = shouldRetry
    ? new Date(Date.now() + Math.min(3_600_000, 30_000 * (2 ** Math.max(0, attemptCount - 1)))).toISOString()
    : null;
  const timestamp = nowIso();
  await db.batch([
    db.prepare(`
      UPDATE character_import_staging SET status = ?2, attempt_count = ?3,
        next_retry_at = ?4, last_error = ?5, updated_at = ?6 WHERE id = ?1
    `).bind(row.id, shouldRetry ? 'retry' : 'failed', attemptCount, retryAt, message.slice(0, 1000), timestamp),
    db.prepare(`
      INSERT INTO import_job_errors (
        import_job_id, source, source_id, character_name, error_code, error_message, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `).bind(
      jobId,
      row.source,
      row.source_id,
      row.character_name,
      error instanceof NexonRequestError ? error.code : 'resolution_failed',
      message.slice(0, 1000),
      timestamp,
    ),
  ]);
  return shouldRetry;
};

export const resolveStagingBatch = async (env: Env, job: ImportJobRow) => {
  const config = getRuntimeConfig(env);
  const pending = await env.DB.prepare(`
    SELECT s.id, s.import_job_id, s.source, s.source_id, s.character_name,
      COALESCE(s.ocid, (
        SELECT resolved.ocid FROM character_import_staging resolved
        WHERE resolved.normalized_name = s.normalized_name
          AND resolved.status = 'resolved' AND resolved.ocid IS NOT NULL
        ORDER BY resolved.updated_at DESC LIMIT 1
      )) AS ocid,
      s.status, s.attempt_count, s.source_updated_at, s.observed_at
    FROM character_import_staging s
    WHERE import_job_id = ?1
      AND (
        s.status IN ('pending', 'resolving')
        OR (s.status = 'retry' AND (s.next_retry_at IS NULL OR s.next_retry_at <= ?2))
      )
    ORDER BY s.id ASC LIMIT ?3
  `).bind(job.id, nowIso(), config.nexonResolutionBatchSize).all<StagingRow>();
  const rows = pending.results;
  if (rows.length === 0) return { job: await maybeCompleteImportJob(env.DB, job.id), processed: 0, created: 0, updated: 0, retry: 0, failed: 0 };

  await env.DB.prepare(`
    UPDATE character_import_staging SET status = 'resolving', updated_at = ?2
    WHERE import_job_id = ?1
      AND id IN (${rows.map((_, index) => `?${index + 3}`).join(', ')})
  `).bind(job.id, nowIso(), ...rows.map((row) => row.id)).run();

  const resolutions = await runWithConcurrency(
    rows,
    config.nexonConcurrency,
    config.nexonRequestDelayMs,
    (row) => resolveNexonCharacter(env, row.character_name, row.ocid),
  );
  let created = 0;
  let updated = 0;
  let retry = 0;
  let failed = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const result = resolutions[index];
    if (result.status === 'fulfilled') {
      const stored = await upsertCanonicalNexonCharacter(env.DB, result.value, [{
        source: row.source,
        sourceCharacterId: row.source_id,
        observedAt: row.observed_at ?? undefined,
        sourceUpdatedAt: row.source_updated_at,
      }, {
        source: 'nexon',
        sourceCharacterId: result.value.ocid,
        observedAt: result.value.observedAt,
        sourceUpdatedAt: result.value.nexonUpdatedAt,
      }]);
      if (stored.created) created += 1;
      else updated += 1;
      await env.DB.prepare(`
        UPDATE character_import_staging SET status = 'resolved', ocid = ?2,
          attempt_count = attempt_count + 1, next_retry_at = NULL,
          last_error = NULL, updated_at = ?3 WHERE id = ?1
      `).bind(row.id, result.value.ocid, nowIso()).run();
    } else if (await markResolutionFailure(env.DB, job.id, row, result.reason, config.nexonRetryLimit)) {
      retry += 1;
    } else {
      failed += 1;
    }
  }
  await env.DB.prepare(`
    UPDATE import_jobs SET status = 'running', updated_count = updated_count + ?2,
      failed_count = failed_count + ?3,
      last_error = NULL, updated_at = ?4 WHERE id = ?1
  `).bind(job.id, updated, failed, nowIso()).run();
  return {
    job: await maybeCompleteImportJob(env.DB, job.id),
    processed: rows.length,
    created,
    updated,
    retry,
    failed,
  };
};

export const maybeCompleteImportJob = async (db: D1Database, jobId: number) => {
  const job = await getImportJob(db, jobId);
  if (!job) return null;
  const checkpoint = job.checkpoint_json ? JSON.parse(job.checkpoint_json) as { stageComplete?: boolean } : {};
  if (!checkpoint.stageComplete) return job;
  const pending = await db.prepare(`
    SELECT COUNT(*) AS total FROM character_import_staging
    WHERE import_job_id = ?1 AND status IN ('pending', 'resolving', 'retry')
  `).bind(jobId).first<{ total: number }>();
  if (Number(pending?.total) > 0) return job;
  const timestamp = nowIso();
  await db.prepare(`
    UPDATE import_jobs SET status = 'completed', completed_at = ?2,
      updated_at = ?2, last_error = NULL WHERE id = ?1
  `).bind(jobId, timestamp).run();
  return getImportJob(db, jobId);
};

export const listImportJobs = async (db: D1Database) => {
  const result = await db.prepare('SELECT * FROM import_jobs ORDER BY id DESC LIMIT 50').all<ImportJobRow>();
  return result.results;
};

export const getImportMetrics = async (db: D1Database) => {
  const counts = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM character_import_staging) AS staging_total,
      (SELECT COUNT(*) FROM character_import_staging WHERE status IN ('pending', 'resolving')) AS pending_resolution,
      (SELECT COUNT(DISTINCT ocid) FROM character_import_staging WHERE status = 'resolved' AND ocid IS NOT NULL) AS resolved_ocid,
      (SELECT COUNT(*) FROM character_import_staging WHERE status = 'resolved') -
        (SELECT COUNT(DISTINCT ocid) FROM character_import_staging WHERE status = 'resolved' AND ocid IS NOT NULL) AS duplicate_merged,
      (SELECT COUNT(*) FROM character_import_staging WHERE status = 'failed') AS failed,
      (SELECT COUNT(*) FROM character_import_staging WHERE status = 'retry') AS retry_pending,
      (SELECT COUNT(*) FROM characters) AS characters_total,
      (SELECT COUNT(*) FROM character_sources WHERE source = 'nexon') AS nexon_refreshed,
      (SELECT COUNT(*) FROM characters) AS final_ranking_total
  `).first<Record<string, number>>();
  const bySource = await db.prepare(`
    SELECT source,
      COUNT(*) AS staging_total,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN status IN ('pending', 'resolving') THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'retry' THEN 1 ELSE 0 END) AS retry,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
    FROM character_import_staging GROUP BY source ORDER BY source
  `).all();
  return { counts, bySource: bySource.results };
};
