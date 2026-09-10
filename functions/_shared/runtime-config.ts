import type { Env } from './env';

const integerSetting = (
  rawValue: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  const parsed = Number.parseInt(rawValue ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
};

export const getRuntimeConfig = (env: Env) => ({
  characterFreshnessSeconds: integerSetting(env.CHARACTER_FRESHNESS_SECONDS, 900, 60, 86_400),
  importSourcePageSize: integerSetting(env.IMPORT_SOURCE_PAGE_SIZE, 100, 1, 100),
  nexonResolutionBatchSize: integerSetting(env.NEXON_RESOLUTION_BATCH_SIZE, 16, 1, 100),
  nexonConcurrency: integerSetting(env.NEXON_CONCURRENCY, 4, 1, 32),
  nexonRequestDelayMs: integerSetting(env.NEXON_REQUEST_DELAY_MS, 100, 0, 10_000),
  nexonRetryLimit: integerSetting(env.NEXON_RETRY_LIMIT, 5, 1, 8),
  nexonRequestTimeoutMs: integerSetting(env.NEXON_REQUEST_TIMEOUT_MS, 10_000, 1_000, 30_000),
  // This is deliberately below the official 500 req/s ceiling. Raise only
  // after the staged benchmark proves that latency and errors remain stable.
  nexonGlobalRpsLimit: integerSetting(env.NEXON_GLOBAL_RPS_LIMIT, 50, 1, 450),
  importD1ReadBudget: integerSetting(env.IMPORT_D1_READ_BUDGET, 25_000_000, 10_000, 100_000_000),
  importD1WriteBudget: integerSetting(env.IMPORT_D1_WRITE_BUDGET, 5_000_000, 10_000, 20_000_000),
  rankingSnapshotSize: integerSetting(env.RANKING_SNAPSHOT_SIZE, 1_000, 100, 5_000),
  accountSignalBackfillBatchSize: integerSetting(env.ACCOUNT_SIGNAL_BACKFILL_BATCH_SIZE, 8, 1, 25),
  accountSignalBackfillConcurrency: integerSetting(env.ACCOUNT_SIGNAL_BACKFILL_CONCURRENCY, 1, 1, 4),
  accountSignalBackfillDelayMs: integerSetting(env.ACCOUNT_SIGNAL_BACKFILL_DELAY_MS, 500, 100, 10_000),
  // On-demand /alts uses the shorter 24h window below. Background refresh is
  // intentionally independent so a large population does not continuously
  // re-enter the queue before one full scan can finish.
  accountSignalFreshnessSeconds: integerSetting(env.ACCOUNT_SIGNAL_FRESHNESS_SECONDS, 86_400, 300, 2_592_000),
  accountSignalBackgroundRefreshSeconds: integerSetting(
    env.ACCOUNT_SIGNAL_BACKGROUND_REFRESH_SECONDS,
    7_776_000,
    300,
    31_536_000,
  ),
  // Every N cron ticks, reserve one slot for the lowest-priority stale work
  // so a sustained stream of new rows cannot starve completed refreshes.
  accountSignalBackgroundStaleReserveEvery: integerSetting(
    env.ACCOUNT_SIGNAL_BACKGROUND_STALE_RESERVE_EVERY,
    10,
    1,
    60,
  ),
  characterMetadataRefreshBatchSize: integerSetting(
    env.CHARACTER_METADATA_REFRESH_BATCH_SIZE,
    8,
    1,
    25,
  ),
  characterMetadataRefreshConcurrency: integerSetting(
    env.CHARACTER_METADATA_REFRESH_CONCURRENCY,
    4,
    1,
    4,
  ),
  characterMetadataRefreshDelayMs: integerSetting(
    env.CHARACTER_METADATA_REFRESH_DELAY_MS,
    0,
    0,
    10_000,
  ),
  growthBackfillBatchSize: integerSetting(env.GROWTH_BACKFILL_BATCH_SIZE, 20, 1, 50),
  growthDateConcurrency: integerSetting(env.GROWTH_DATE_CONCURRENCY, 4, 1, 4),
  growthMaxBatchesPerInvocation: integerSetting(env.GROWTH_MAX_BATCHES_PER_INVOCATION, 12, 1, 24),
  growthInvocationBudgetMs: integerSetting(env.GROWTH_INVOCATION_BUDGET_MS, 45_000, 5_000, 120_000),
  growthProfileConcurrency: integerSetting(env.GROWTH_PROFILE_CONCURRENCY, 1, 1, 2),
  growthClaimLeaseSeconds: integerSetting(env.GROWTH_CLAIM_LEASE_SECONDS, 600, 60, 900),
  growthNewProfile24hLimit: integerSetting(env.GROWTH_NEW_PROFILE_24H_LIMIT, 12, 1, 1_000),
  growthPendingProfileLimit: integerSetting(env.GROWTH_PENDING_PROFILE_LIMIT, 8, 1, 1_000),
  consumerPrimaryHeartbeatFreshnessSeconds: integerSetting(
    env.CONSUMER_PRIMARY_HEARTBEAT_FRESHNESS_SECONDS,
    300,
    60,
    3_600,
  ),
});

export const requireSecret = (value: string | undefined, name: string) => {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};
