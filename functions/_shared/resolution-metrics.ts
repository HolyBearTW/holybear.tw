import type { NexonRequestMetric } from './nexon-client';

export interface ResolutionInstrumentation {
  idLatencyMs: number[];
  basicLatencyMs: number[];
  statLatencyMs: number[];
  d1ReadLatencyMs: number[];
  d1WriteLatencyMs: number[];
  characterWallMs: number[];
  requests: number;
  errors: { 429: number; 403: number; timeout: number; '5xx': number; retry: number };
}

export const createResolutionInstrumentation = (): ResolutionInstrumentation => ({
  idLatencyMs: [],
  basicLatencyMs: [],
  statLatencyMs: [],
  d1ReadLatencyMs: [],
  d1WriteLatencyMs: [],
  characterWallMs: [],
  requests: 0,
  errors: { 429: 0, 403: 0, timeout: 0, '5xx': 0, retry: 0 },
});

export const recordResolutionRequest = (metrics: ResolutionInstrumentation, metric: NexonRequestMetric) => {
  metrics.requests += 1;
  const endpoint = metric.path.split('?')[0];
  if (endpoint === '/id') metrics.idLatencyMs.push(metric.latencyMs);
  else if (endpoint === '/character/basic') metrics.basicLatencyMs.push(metric.latencyMs);
  else if (endpoint === '/character/stat') metrics.statLatencyMs.push(metric.latencyMs);
  if (metric.attempt > 0) metrics.errors.retry += 1;
  if (metric.status === 429) metrics.errors[429] += 1;
  else if (metric.status === 403) metrics.errors[403] += 1;
  else if (metric.status != null && metric.status >= 500) metrics.errors['5xx'] += 1;
  else if (metric.errorKind === 'timeout') metrics.errors.timeout += 1;
};

const percentile = (values: number[], rank: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * rank) - 1))] * 100) / 100;
};

const latencySummary = (values: number[]) => ({
  count: values.length,
  p50Ms: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
});

export const summarizeResolutionInstrumentation = (
  metrics: ResolutionInstrumentation,
  elapsedMs: number,
) => ({
  id: latencySummary(metrics.idLatencyMs),
  basic: latencySummary(metrics.basicLatencyMs),
  stat: latencySummary(metrics.statLatencyMs),
  d1Read: latencySummary(metrics.d1ReadLatencyMs),
  d1Write: latencySummary(metrics.d1WriteLatencyMs),
  characters: metrics.characterWallMs.length,
  p50WallMs: percentile(metrics.characterWallMs, 0.5),
  p95WallMs: percentile(metrics.characterWallMs, 0.95),
  charactersPerMinute: elapsedMs > 0 ? Math.round((metrics.characterWallMs.length * 60_000 / elapsedMs) * 100) / 100 : 0,
  requests: metrics.requests,
  requestsPerSecond: elapsedMs > 0 ? Math.round((metrics.requests * 1000 / elapsedMs) * 100) / 100 : 0,
  errors: { ...metrics.errors },
});

export const addResolutionInstrumentation = (
  target: ResolutionInstrumentation,
  source: ResolutionInstrumentation,
) => {
  target.idLatencyMs.push(...source.idLatencyMs);
  target.basicLatencyMs.push(...source.basicLatencyMs);
  target.statLatencyMs.push(...source.statLatencyMs);
  target.d1ReadLatencyMs.push(...source.d1ReadLatencyMs);
  target.d1WriteLatencyMs.push(...source.d1WriteLatencyMs);
  target.characterWallMs.push(...source.characterWallMs);
  target.requests += source.requests;
  target.errors[429] += source.errors[429];
  target.errors[403] += source.errors[403];
  target.errors.timeout += source.errors.timeout;
  target.errors['5xx'] += source.errors['5xx'];
  target.errors.retry += source.errors.retry;
};
