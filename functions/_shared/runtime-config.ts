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
  nexonResolutionBatchSize: integerSetting(env.NEXON_RESOLUTION_BATCH_SIZE, 8, 1, 12),
  nexonConcurrency: integerSetting(env.NEXON_CONCURRENCY, 2, 1, 4),
  nexonRequestDelayMs: integerSetting(env.NEXON_REQUEST_DELAY_MS, 200, 0, 10_000),
  nexonRetryLimit: integerSetting(env.NEXON_RETRY_LIMIT, 5, 1, 8),
  nexonRequestTimeoutMs: integerSetting(env.NEXON_REQUEST_TIMEOUT_MS, 10_000, 1_000, 30_000),
  importD1ReadBudget: integerSetting(env.IMPORT_D1_READ_BUDGET, 4_000_000, 1_000, 4_500_000),
  importD1WriteBudget: integerSetting(env.IMPORT_D1_WRITE_BUDGET, 80_000, 1_000, 90_000),
  rankingSnapshotSize: integerSetting(env.RANKING_SNAPSHOT_SIZE, 1_000, 100, 5_000),
});

export const requireSecret = (value: string | undefined, name: string) => {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};
