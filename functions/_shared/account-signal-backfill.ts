import { syncCharacterAccountSignals } from './account-group-repository';
import { toPublicCharacter } from './character-repository';
import type { Env } from './env';
import type { CharacterRow } from './models';
import { NexonRequestError, runWithConcurrency } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';

const SIGNAL_TYPE = 'union_raider_full';
const nowIso = () => new Date().toISOString();

export const backfillAccountSignalBatch = async (env: Env) => {
  const config = getRuntimeConfig(env);
  const result = await env.DB.prepare(`
    SELECT c.* FROM characters c
    LEFT JOIN account_signal_sync s ON s.ocid = c.ocid AND s.signal_type = ?1
    WHERE s.ocid IS NULL OR s.status = 'pending'
      OR (s.status = 'retry' AND (s.next_retry_at IS NULL OR s.next_retry_at <= ?2))
    ORDER BY c.combat_power DESC, c.ocid ASC LIMIT ?3
  `).bind(SIGNAL_TYPE, nowIso(), config.accountSignalBackfillBatchSize).all<CharacterRow>();
  const rows = result.results;
  const settled = await runWithConcurrency(
    rows,
    config.accountSignalBackfillConcurrency,
    config.accountSignalBackfillDelayMs,
    async (row) => {
      const synced = await syncCharacterAccountSignals(env, toPublicCharacter(row), [SIGNAL_TYPE]);
      const failure = synced.failures[0]?.error;
      if (failure) throw failure;
      return synced;
    },
  );

  let completed = 0;
  let retry = 0;
  let failed = 0;
  let signals = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const outcome = settled[index];
    const timestamp = nowIso();
    if (outcome.status === 'fulfilled') {
      completed += 1;
      signals += outcome.value.signalCount;
      await env.DB.prepare(`
        INSERT INTO account_signal_sync (
          ocid, signal_type, status, signal_count, attempt_count,
          last_attempted_at, completed_at, created_at, updated_at
        ) VALUES (?1, ?2, 'completed', ?3, 1, ?4, ?4, ?4, ?4)
        ON CONFLICT(ocid, signal_type) DO UPDATE SET
          status = 'completed', signal_count = excluded.signal_count,
          attempt_count = account_signal_sync.attempt_count + 1,
          next_retry_at = NULL, last_error = NULL,
          last_attempted_at = excluded.last_attempted_at,
          completed_at = excluded.completed_at, updated_at = excluded.updated_at
      `).bind(row.ocid, SIGNAL_TYPE, outcome.value.signalCount, timestamp).run();
      continue;
    }

    const error = outcome.reason;
    const existing = await env.DB.prepare(`
      SELECT attempt_count FROM account_signal_sync WHERE ocid = ?1 AND signal_type = ?2
    `).bind(row.ocid, SIGNAL_TYPE).first<{ attempt_count: number }>();
    const attempts = (Number(existing?.attempt_count) || 0) + 1;
    const retryable = !(error instanceof NexonRequestError) || error.retryable;
    const shouldRetry = retryable && attempts < config.nexonRetryLimit;
    if (shouldRetry) retry += 1;
    else failed += 1;
    const retryAt = shouldRetry
      ? new Date(Date.now() + Math.min(3_600_000, 30_000 * (2 ** Math.max(0, attempts - 1)))).toISOString()
      : null;
    const message = error instanceof Error ? error.message : String(error);
    await env.DB.prepare(`
      INSERT INTO account_signal_sync (
        ocid, signal_type, status, attempt_count, next_retry_at,
        last_error, last_attempted_at, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?7)
      ON CONFLICT(ocid, signal_type) DO UPDATE SET
        status = excluded.status, attempt_count = excluded.attempt_count,
        next_retry_at = excluded.next_retry_at, last_error = excluded.last_error,
        last_attempted_at = excluded.last_attempted_at, updated_at = excluded.updated_at
    `).bind(row.ocid, SIGNAL_TYPE, shouldRetry ? 'retry' : 'failed', attempts,
      retryAt, message.slice(0, 1000), timestamp).run();
  }

  const sourceJob = await env.DB.prepare(`
    SELECT status, pending_count, retry_count FROM import_jobs
    WHERE source = 'manual_seed' ORDER BY id DESC LIMIT 1
  `).first<{ status: string; pending_count: number; retry_count: number }>();
  return {
    processed: rows.length,
    completed,
    retry,
    failed,
    signals,
    sourceImportRunning: sourceJob?.status === 'running',
    sourcePending: Number(sourceJob?.pending_count) || 0,
    hasImmediateWork: rows.length === config.accountSignalBackfillBatchSize,
  };
};
