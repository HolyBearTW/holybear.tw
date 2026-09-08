const percentile = (values, rank) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * rank) - 1))] * 100) / 100;
};

export const createResolverMetrics = () => ({
  idLatencyMs: [], basicLatencyMs: [], statLatencyMs: [],
  d1ReadLatencyMs: [], d1WriteLatencyMs: [], characterWallMs: [],
  requests: 0,
  errors: { 429: 0, 403: 0, timeout: 0, '5xx': 0, retry: 0 },
});

export const recordResolverRequest = (metrics, metric) => {
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

export const addResolverMetrics = (target, source) => {
  for (const key of ['idLatencyMs', 'basicLatencyMs', 'statLatencyMs', 'd1ReadLatencyMs', 'd1WriteLatencyMs', 'characterWallMs']) {
    target[key].push(...source[key]);
  }
  target.requests += source.requests;
  for (const key of ['429', '403', 'timeout', '5xx', 'retry']) target.errors[key] += source.errors[key];
};

export const summarizeResolverMetrics = (metrics, elapsedMs) => {
  const latency = (values) => ({ count: values.length, p50Ms: percentile(values, 0.5), p95Ms: percentile(values, 0.95) });
  return {
    id: latency(metrics.idLatencyMs),
    basic: latency(metrics.basicLatencyMs),
    stat: latency(metrics.statLatencyMs),
    d1Read: latency(metrics.d1ReadLatencyMs),
    d1Write: latency(metrics.d1WriteLatencyMs),
    characters: metrics.characterWallMs.length,
    p50WallMs: percentile(metrics.characterWallMs, 0.5),
    p95WallMs: percentile(metrics.characterWallMs, 0.95),
    charactersPerMinute: elapsedMs > 0 ? Math.round(metrics.characterWallMs.length * 60_000 / elapsedMs * 100) / 100 : 0,
    requests: metrics.requests,
    requestsPerSecond: elapsedMs > 0 ? Math.round(metrics.requests * 1000 / elapsedMs * 100) / 100 : 0,
    errors: { ...metrics.errors },
  };
};
