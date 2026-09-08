import { syncCharacterAccountSignals } from './account-group-repository';
import {
  ACCOUNT_SIGNAL_TYPE,
  type AccountSignalClaim,
  claimAccountSignalForBackground,
  completeAccountSignalClaim,
  failAccountSignalClaim,
} from './account-signal-queue';
import { toPublicCharacter } from './character-repository';
import type { Env } from './env';
import type { CharacterRow } from './models';
import { NexonRequestError, runWithConcurrency } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';
import {
  addInstrumentation,
  createAccountSignalInstrumentation,
  metricTimer,
  summarizeAccountSignalInstrumentation,
  type AccountSignalInstrumentation,
} from './account-signal-metrics';

const nowIso = () => new Date().toISOString();

export const backfillAccountSignalBatch = async (env: Env) => {
  const batchStartedAt = Date.now();
  const instrumentation = createAccountSignalInstrumentation();
  const config = getRuntimeConfig(env);
  const now = nowIso();
  const staleBefore = new Date(Date.now() - config.accountSignalBackgroundRefreshSeconds * 1000).toISOString();
  const immediateResult = await env.DB.prepare(`
    SELECT c.* FROM characters c
    LEFT JOIN account_signal_sync s ON s.ocid = c.ocid AND s.signal_type = ?1
    WHERE s.ocid IS NULL OR s.status = 'pending'
      OR (s.status = 'retry' AND (s.next_retry_at IS NULL OR s.next_retry_at <= ?2))
    ORDER BY CASE
      WHEN s.ocid IS NULL OR s.status = 'pending' THEN 0
      WHEN s.status = 'retry' THEN 1
      ELSE 2
    END,
    CASE WHEN s.status = 'retry' THEN COALESCE(s.next_retry_at, '') ELSE '' END,
    c.combat_power DESC, c.ocid ASC LIMIT ?3
  `).bind(ACCOUNT_SIGNAL_TYPE, now, config.accountSignalBackfillBatchSize).all<CharacterRow>();
  let rows = [...immediateResult.results];
  const reserveStale = Math.floor(Date.now() / 60_000) % config.accountSignalBackgroundStaleReserveEvery === 0;
  const staleLimit = rows.length >= config.accountSignalBackfillBatchSize && reserveStale
    ? 1
    : Math.max(0, config.accountSignalBackfillBatchSize - rows.length);
  if (staleLimit > 0) {
    const staleResult = await env.DB.prepare(`
      SELECT c.* FROM characters c
      JOIN account_signal_sync s ON s.ocid = c.ocid AND s.signal_type = ?1
      WHERE s.status = 'completed' AND (s.completed_at IS NULL OR s.completed_at <= ?2)
      ORDER BY COALESCE(s.completed_at, ''), c.ocid ASC LIMIT ?3
    `).bind(ACCOUNT_SIGNAL_TYPE, staleBefore, staleLimit).all<CharacterRow>();
    rows = reserveStale && immediateResult.results.length >= config.accountSignalBackfillBatchSize
      ? [...rows.slice(0, Math.max(0, config.accountSignalBackfillBatchSize - 1)), ...staleResult.results]
      : [...rows, ...staleResult.results];
  }
  const claimedRows: Array<{ row: CharacterRow; claim: AccountSignalClaim }> = [];
  for (const row of rows) {
    const claimStartedAt = Date.now();
    const claim = await claimAccountSignalForBackground(
      env.DB,
      row.ocid,
      config.accountSignalBackgroundRefreshSeconds,
    );
    instrumentation.queueClaimMs += metricTimer(claimStartedAt);
    if (claim) claimedRows.push({ row, claim });
  }
  const settled = await runWithConcurrency(
    claimedRows,
    config.accountSignalBackfillConcurrency,
    config.accountSignalBackfillDelayMs,
    async ({ row, claim }) => {
      const metrics = createAccountSignalInstrumentation();
      const startedAt = Date.now();
      try {
        const synced = await syncCharacterAccountSignals(
          env,
          toPublicCharacter(row),
          [ACCOUNT_SIGNAL_TYPE],
          metrics,
        );
        const failure = synced.failures[0]?.error;
        if (failure) throw failure;
        return { claim, synced, metrics };
      } catch (error) {
        if (metrics.characterWallMs.length === 0) metrics.characterWallMs.push(metricTimer(startedAt));
        throw { accountSignalError: error, metrics };
      }
    },
  );

  let completed = 0;
  let retry = 0;
  let failed = 0;
  let signals = 0;
  for (let index = 0; index < claimedRows.length; index += 1) {
    const { claim } = claimedRows[index];
    const outcome = settled[index];
    if (outcome.status === 'fulfilled') {
      completed += 1;
      signals += outcome.value.synced.signalCount;
      addInstrumentation(instrumentation, outcome.value.metrics);
      const finalizeStartedAt = Date.now();
      await completeAccountSignalClaim(env.DB, claim, outcome.value.synced.signalCount);
      instrumentation.queueFinalizeMs += metricTimer(finalizeStartedAt);
      continue;
    }

    const taskFailure = outcome.reason as { accountSignalError?: unknown; metrics?: AccountSignalInstrumentation };
    if (taskFailure?.metrics) addInstrumentation(instrumentation, taskFailure.metrics);
    const error = taskFailure?.accountSignalError ?? outcome.reason;
    const retryable = !(error instanceof NexonRequestError) || error.retryable;
    const finalizeStartedAt = Date.now();
    const failure = await failAccountSignalClaim(env.DB, claim, error, retryable, config.nexonRetryLimit);
    instrumentation.queueFinalizeMs += metricTimer(finalizeStartedAt);
    if (failure.shouldRetry) retry += 1;
    else failed += 1;
  }

  const sourceJob = await env.DB.prepare(`
    SELECT status, pending_count, retry_count FROM import_jobs
    WHERE source = 'manual_seed' ORDER BY id DESC LIMIT 1
  `).first<{ status: string; pending_count: number; retry_count: number }>();
  return {
    processed: claimedRows.length,
    completed,
    retry,
    failed,
    signals,
    sourceImportRunning: sourceJob?.status === 'running',
    sourcePending: Number(sourceJob?.pending_count) || 0,
    hasImmediateWork: rows.length === config.accountSignalBackfillBatchSize,
    instrumentation: summarizeAccountSignalInstrumentation(
      instrumentation,
      Date.now() - batchStartedAt,
    ),
  };
};
