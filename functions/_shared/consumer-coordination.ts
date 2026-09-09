import { backfillAccountSignalBatch } from './account-signal-backfill';
import { refreshCharacterMetadataBatch } from './character-metadata-refresh';
import type { Env } from './env';
import { getRuntimeConfig } from './runtime-config';
import { backfillGrowthBatch, latestAvailableGrowthDate } from './growth-tracker';

export type ConsumerSource = 'cloudflare_cron' | 'github_actions_fallback';

interface ConsumerHeartbeatRow {
  consumer_source: ConsumerSource;
  last_invoked_at: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  last_result_json: string | null;
  updated_at: string;
}

export interface ConsumerQueueCounts {
  pendingMetadata: number;
  pendingAccountSignals: number;
  pendingGrowthProfiles: number;
  hasImmediateWork: boolean;
}

interface ConsumerSelection {
  metadata: boolean;
  accountSignals: boolean;
  growth?: boolean;
}

const nowIso = () => new Date().toISOString();
const safeJson = (value: unknown) => JSON.stringify(value).slice(0, 20_000);
const errorMessage = (error: unknown) => (
  error instanceof Error ? error.message : String(error)
).slice(0, 2_000);

const recordInvocation = async (db: D1Database, source: ConsumerSource, timestamp: string) => {
  await db.prepare(`
    INSERT INTO consumer_heartbeat (
      consumer_source, last_invoked_at, updated_at
    ) VALUES (?1, ?2, ?2)
    ON CONFLICT(consumer_source) DO UPDATE SET
      last_invoked_at = excluded.last_invoked_at,
      updated_at = excluded.updated_at
  `).bind(source, timestamp).run();
};

const recordSuccess = async (
  db: D1Database,
  source: ConsumerSource,
  timestamp: string,
  result: unknown,
) => {
  await db.prepare(`
    UPDATE consumer_heartbeat SET
      last_success_at = ?2,
      last_error = NULL,
      last_result_json = ?3,
      updated_at = ?2
    WHERE consumer_source = ?1
  `).bind(source, timestamp, safeJson(result)).run();
};

const recordError = async (
  db: D1Database,
  source: ConsumerSource,
  timestamp: string,
  error: unknown,
) => {
  await db.prepare(`
    UPDATE consumer_heartbeat SET
      last_error_at = ?2,
      last_error = ?3,
      updated_at = ?2
    WHERE consumer_source = ?1
  `).bind(source, timestamp, errorMessage(error)).run();
};

export const getImmediateConsumerQueueCounts = async (
  db: D1Database,
  timestamp = nowIso(),
): Promise<ConsumerQueueCounts> => {
  const targetDate = latestAvailableGrowthDate(new Date(timestamp));
  const [metadata, accountSignals, growthProfiles] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS count FROM character_metadata_refresh
      WHERE (status = 'pending' OR (status = 'retry' AND (next_retry_at IS NULL OR next_retry_at <= ?1)))
        AND (claim_until IS NULL OR claim_until <= ?1)
    `).bind(timestamp).first<{ count: number }>(),
    db.prepare(`
      SELECT COUNT(*) AS count FROM account_signal_sync
      WHERE signal_type = 'union_raider_full'
        AND (status = 'pending' OR (status = 'retry' AND (next_retry_at IS NULL OR next_retry_at <= ?1)))
        AND (claim_until IS NULL OR claim_until <= ?1)
    `).bind(timestamp).first<{ count: number }>(),
    db.prepare(`
      SELECT COUNT(*) AS count FROM growth_profiles
      WHERE ocid = 'a3e399217d603631033dd65ebaa08275'
        AND (
          status = 'pending'
          OR (status = 'retry' AND (next_retry_at IS NULL OR next_retry_at <= ?1))
          OR (status IN ('completed', 'failed') AND (last_synced_date IS NULL OR last_synced_date < ?2))
        )
        AND (claim_until IS NULL OR claim_until <= ?1)
    `).bind(timestamp, targetDate).first<{ count: number }>(),
  ]);
  const pendingMetadata = Number(metadata?.count) || 0;
  const pendingAccountSignals = Number(accountSignals?.count) || 0;
  const pendingGrowthProfiles = Number(growthProfiles?.count) || 0;
  return {
    pendingMetadata,
    pendingAccountSignals,
    pendingGrowthProfiles,
    hasImmediateWork: pendingMetadata > 0 || pendingAccountSignals > 0 || pendingGrowthProfiles > 0,
  };
};

const parseResult = (value: string | null) => {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
};

const publicHeartbeat = (row: ConsumerHeartbeatRow | null) => row ? {
  consumerSource: row.consumer_source,
  lastInvokedAt: row.last_invoked_at,
  lastSuccessAt: row.last_success_at,
  lastErrorAt: row.last_error_at,
  lastError: row.last_error,
  lastResult: parseResult(row.last_result_json),
} : null;

export const getConsumerFailoverStatus = async (env: Env, timestamp = nowIso()) => {
  const config = getRuntimeConfig(env);
  const rows = await env.DB.prepare(`
    SELECT consumer_source, last_invoked_at, last_success_at, last_error_at,
      last_error, last_result_json, updated_at
    FROM consumer_heartbeat
    ORDER BY last_invoked_at DESC
  `).all<ConsumerHeartbeatRow>();
  const primary = rows.results.find((row) => row.consumer_source === 'cloudflare_cron') || null;
  const primaryInvokedAt = primary ? Date.parse(primary.last_invoked_at) : Number.NaN;
  const primarySuccessAt = primary?.last_success_at ? Date.parse(primary.last_success_at) : Number.NaN;
  const primaryErrorAt = primary?.last_error_at ? Date.parse(primary.last_error_at) : Number.NaN;
  const currentTime = Date.parse(timestamp);
  const primaryRecentlyInvoked = Number.isFinite(primaryInvokedAt)
    && Number.isFinite(currentTime)
    && currentTime >= primaryInvokedAt
    && currentTime - primaryInvokedAt <= config.consumerPrimaryHeartbeatFreshnessSeconds * 1_000;
  const primaryInvocationRunning = primaryRecentlyInvoked
    && (!Number.isFinite(primarySuccessAt) || primaryInvokedAt > primarySuccessAt)
    && (!Number.isFinite(primaryErrorAt) || primaryInvokedAt > primaryErrorAt);
  const primaryInvocationSucceeded = primaryRecentlyInvoked
    && Number.isFinite(primarySuccessAt)
    && primarySuccessAt >= primaryInvokedAt
    && (!Number.isFinite(primaryErrorAt) || primarySuccessAt > primaryErrorAt);
  const primaryFresh = primaryInvocationRunning || primaryInvocationSucceeded;
  const latestSuccessful = [...rows.results]
    .filter((row) => row.last_success_at)
    .sort((left, right) => String(right.last_success_at).localeCompare(String(left.last_success_at)))[0] || null;
  const queues = await getImmediateConsumerQueueCounts(env.DB, timestamp);
  return {
    checkedAt: timestamp,
    primarySchedulerHeartbeat: {
      fresh: primaryFresh,
      freshnessSeconds: config.consumerPrimaryHeartbeatFreshnessSeconds,
      ...publicHeartbeat(primary),
    },
    currentActiveSource: primaryFresh
      ? 'cloudflare_cron'
      : latestSuccessful?.consumer_source || null,
    lastSuccessfulConsumerRun: latestSuccessful ? {
      consumerSource: latestSuccessful.consumer_source,
      at: latestSuccessful.last_success_at,
      result: parseResult(latestSuccessful.last_result_json),
    } : null,
    queues,
  };
};

export const consumeQueueBatch = async (
  env: Env,
  source: ConsumerSource,
  selection: ConsumerSelection = { metadata: true, accountSignals: true, growth: true },
) => {
  const invokedAt = nowIso();
  await recordInvocation(env.DB, source, invokedAt);
  const tasks: Array<Promise<unknown>> = [];
  const labels: string[] = [];
  if (selection.metadata) {
    labels.push('metadata');
    tasks.push(refreshCharacterMetadataBatch(env));
  }
  if (selection.accountSignals) {
    labels.push('accountSignals');
    tasks.push(backfillAccountSignalBatch(env));
  }
  if (selection.growth) {
    labels.push('growth');
    tasks.push(backfillGrowthBatch(env));
  }
  const settled = await Promise.allSettled(tasks);
  const result = Object.fromEntries(settled.map((outcome, index) => [
    labels[index],
    outcome.status === 'fulfilled'
      ? outcome.value
      : { error: errorMessage(outcome.reason) },
  ]));
  const failed = settled.find((outcome) => outcome.status === 'rejected');
  if (failed?.status === 'rejected') {
    await recordError(env.DB, source, nowIso(), failed.reason);
    throw failed.reason;
  }
  await recordSuccess(env.DB, source, nowIso(), result);
  return { source, invokedAt, result };
};

export const runFallbackConsumer = async (env: Env) => {
  const before = await getConsumerFailoverStatus(env);
  if (before.primarySchedulerHeartbeat.fresh) {
    return { executed: false, reason: 'primary_heartbeat_fresh', status: before };
  }
  if (!before.queues.hasImmediateWork) {
    return { executed: false, reason: 'no_immediate_work', status: before };
  }
  const batch = await consumeQueueBatch(env, 'github_actions_fallback', {
    metadata: before.queues.pendingMetadata > 0,
    accountSignals: before.queues.pendingAccountSignals > 0,
    growth: before.queues.pendingGrowthProfiles > 0,
  });
  return { executed: true, batch, status: await getConsumerFailoverStatus(env) };
};
