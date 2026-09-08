import type { NexonRequestMetric } from './nexon-client';

export interface AccountSignalInstrumentation {
  nexonUnionLatencyMs: number[];
  nexonUnionRaiderLatencyMs: number[];
  fingerprintCanonicalizationMs: number;
  signalDbWriteMs: number;
  fingerprintMatchingMs: number;
  accountGroupMutationMs: number;
  queueClaimMs: number;
  queueFinalizeMs: number;
  characterWallMs: number[];
  requests: number;
  errors: { 429: number; 403: number; timeout: number; '5xx': number; retry: number };
}

export const createAccountSignalInstrumentation = (): AccountSignalInstrumentation => ({
  nexonUnionLatencyMs: [],
  nexonUnionRaiderLatencyMs: [],
  fingerprintCanonicalizationMs: 0,
  signalDbWriteMs: 0,
  fingerprintMatchingMs: 0,
  accountGroupMutationMs: 0,
  queueClaimMs: 0,
  queueFinalizeMs: 0,
  characterWallMs: [],
  requests: 0,
  errors: { 429: 0, 403: 0, timeout: 0, '5xx': 0, retry: 0 },
});

const elapsedMs = (startedAt: number) => Math.max(0, Date.now() - startedAt);

export const recordNexonMetric = (metrics: AccountSignalInstrumentation, metric: NexonRequestMetric) => {
  metrics.requests += 1;
  const normalizedPath = metric.path.split('?')[0];
  if (normalizedPath === '/user/union') metrics.nexonUnionLatencyMs.push(metric.latencyMs);
  if (normalizedPath === '/user/union-raider') metrics.nexonUnionRaiderLatencyMs.push(metric.latencyMs);
  if (metric.attempt > 0) metrics.errors.retry += 1;
  if (metric.status === 429) metrics.errors[429] += 1;
  if (metric.status === 403) metrics.errors[403] += 1;
  if (metric.status != null && metric.status >= 500) metrics.errors['5xx'] += 1;
  if (metric.errorKind === 'timeout') metrics.errors.timeout += 1;
};

export const percentile = (values: number[], rank: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * rank) - 1));
  return Math.round(sorted[index] * 100) / 100;
};

export const summarizeAccountSignalInstrumentation = (
  metrics: AccountSignalInstrumentation,
  elapsedTotalMs: number,
) => {
  const wall = metrics.characterWallMs;
  return {
    nexonUnion: {
      count: metrics.nexonUnionLatencyMs.length,
      p50Ms: percentile(metrics.nexonUnionLatencyMs, 0.5),
      p95Ms: percentile(metrics.nexonUnionLatencyMs, 0.95),
    },
    nexonUnionRaider: {
      count: metrics.nexonUnionRaiderLatencyMs.length,
      p50Ms: percentile(metrics.nexonUnionRaiderLatencyMs, 0.5),
      p95Ms: percentile(metrics.nexonUnionRaiderLatencyMs, 0.95),
    },
    fingerprintCanonicalizationMs: Math.round(metrics.fingerprintCanonicalizationMs * 100) / 100,
    signalDbWriteMs: Math.round(metrics.signalDbWriteMs * 100) / 100,
    fingerprintMatchingMs: Math.round(metrics.fingerprintMatchingMs * 100) / 100,
    accountGroupMutationMs: Math.round(metrics.accountGroupMutationMs * 100) / 100,
    queueClaimMs: Math.round(metrics.queueClaimMs * 100) / 100,
    queueFinalizeMs: Math.round(metrics.queueFinalizeMs * 100) / 100,
    characters: wall.length,
    p50WallMs: percentile(wall, 0.5),
    p95WallMs: percentile(wall, 0.95),
    charactersPerMinute: elapsedTotalMs > 0 ? Math.round((wall.length * 60_000 / elapsedTotalMs) * 100) / 100 : 0,
    requests: metrics.requests,
    requestsPerSecond: elapsedTotalMs > 0 ? Math.round((metrics.requests * 1000 / elapsedTotalMs) * 100) / 100 : 0,
    errors: { ...metrics.errors },
  };
};

export const addInstrumentation = (
  target: AccountSignalInstrumentation,
  source: AccountSignalInstrumentation,
) => {
  target.nexonUnionLatencyMs.push(...source.nexonUnionLatencyMs);
  target.nexonUnionRaiderLatencyMs.push(...source.nexonUnionRaiderLatencyMs);
  target.fingerprintCanonicalizationMs += source.fingerprintCanonicalizationMs;
  target.signalDbWriteMs += source.signalDbWriteMs;
  target.fingerprintMatchingMs += source.fingerprintMatchingMs;
  target.accountGroupMutationMs += source.accountGroupMutationMs;
  target.queueClaimMs += source.queueClaimMs;
  target.queueFinalizeMs += source.queueFinalizeMs;
  target.characterWallMs.push(...source.characterWallMs);
  target.requests += source.requests;
  target.errors[429] += source.errors[429];
  target.errors[403] += source.errors[403];
  target.errors.timeout += source.errors.timeout;
  target.errors['5xx'] += source.errors['5xx'];
  target.errors.retry += source.errors.retry;
};

export const metricTimer = (startedAt: number) => elapsedMs(startedAt);
