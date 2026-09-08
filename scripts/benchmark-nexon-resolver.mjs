import { readFile } from 'node:fs/promises';
import { loadManualImportEnvironment, manualImportSettings } from './manual-import-config.mjs';
import { createLocalNexonRateLimiter } from './nexon-request-limiter.mjs';
import { addResolverMetrics, createResolverMetrics, recordResolverRequest, summarizeResolverMetrics } from './resolver-metrics.mjs';

const endpointBase = 'https://open.api.nexon.com/maplestorytw/v1';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const argument = (args, name) => args.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);

const positive = (value, label) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer`);
  return parsed;
};

const readNames = async (args) => {
  const inline = argument(args, '--names');
  const filename = argument(args, '--names-file');
  if (inline) return inline.split(',').map((name) => name.trim()).filter(Boolean);
  if (filename) {
    const raw = await readFile(filename, 'utf8');
    if (filename.endsWith('.json')) {
      const parsed = JSON.parse(raw);
      return (Array.isArray(parsed) ? parsed : parsed.names).map((name) => String(name).trim()).filter(Boolean);
    }
    return raw.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
  }
  return [];
};

const runLevel = async (names, concurrency, options) => {
  const metrics = createResolverMetrics();
  const limiter = createLocalNexonRateLimiter(options.globalRateLimit);
  const results = new Array(names.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < names.length) {
      const index = cursor;
      cursor += 1;
      if (options.requestDelayMs > 0 && index > 0) await wait(options.requestDelayMs);
      const characterStartedAt = Date.now();
      try {
        const requestedName = names[index].normalize('NFC');
        const call = async (path) => {
          let lastError;
          for (let attempt = 0; attempt < options.retryLimit; attempt += 1) {
            const startedAt = Date.now();
            let status = null;
            let ok = false;
            let errorKind;
            try {
              await limiter.acquire();
              const response = await fetch(`${endpointBase}${path}`, {
                headers: { accept: 'application/json', 'x-nxopen-api-key': options.apiKey },
                signal: AbortSignal.timeout(options.timeoutMs),
              });
              status = response.status;
              if (response.ok) {
                const payload = await response.json();
                ok = true;
                return payload;
              }
              const error = new Error(`NEXON request failed (${response.status})`);
              error.status = response.status;
              error.retryable = response.status === 429 || response.status >= 500;
              if (!error.retryable) throw error;
              lastError = error;
            } catch (error) {
              errorKind = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'network';
              if (error?.retryable === false) throw error;
              lastError = error;
            } finally {
              recordResolverRequest(metrics, {
                path, attempt, latencyMs: Math.max(0, Date.now() - startedAt), status, ok, errorKind,
              });
            }
            if (attempt + 1 < options.retryLimit) await wait(Math.min(30_000, 500 * 2 ** attempt));
          }
          throw lastError;
        };
        const id = await call(`/id?character_name=${encodeURIComponent(requestedName)}`);
        await Promise.all([
          call(`/character/basic?ocid=${encodeURIComponent(id.ocid)}`),
          call(`/character/stat?ocid=${encodeURIComponent(id.ocid)}`),
        ]);
        results[index] = { ok: true };
      } catch (error) {
        results[index] = { ok: false, error: String(error?.message || error), status: error?.status ?? null };
      } finally {
        metrics.characterWallMs.push(Date.now() - characterStartedAt);
      }
    }
  };
  const startedAt = Date.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, worker));
  const elapsedMs = Date.now() - startedAt;
  const summary = summarizeResolverMetrics(metrics, elapsedMs);
  const failed = results.filter((result) => result && !result.ok);
  const errorRate = names.length ? failed.length / names.length : 0;
  const requestErrors = summary.errors[429] + summary.errors[403] + summary.errors.timeout + summary.errors['5xx'];
  const requestErrorRate = summary.requests ? requestErrors / summary.requests : 0;
  return {
    concurrency,
    requestDelayMs: options.requestDelayMs,
    elapsedMs,
    successfulCharacters: names.length - failed.length,
    failedCharacters: failed.length,
    errorRate,
    requestErrorRate,
    ...summary,
    d1Read: null,
    d1Write: null,
    stopRecommended: errorRate > options.maxErrorRate || requestErrorRate > options.maxErrorRate
      || (options.previousP95 > 0 && summary.p95WallMs > options.previousP95 * options.p95RegressionFactor),
    failures: failed.slice(0, 20),
  };
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const execute = args.includes('--execute');
if (!dryRun && !execute) throw new Error('Use --dry-run to inspect the matrix or --execute with an explicit names file');
if (dryRun && execute) throw new Error('--dry-run and --execute cannot be combined');
const environment = await loadManualImportEnvironment({ cwd: process.cwd() });
const settings = manualImportSettings(environment);
const concurrencyLevels = (argument(args, '--concurrency') || '4,8,16,32')
  .split(',').map((value) => positive(value, '--concurrency'));
if (concurrencyLevels.some((value) => value > 32)) throw new Error('--concurrency cannot exceed 32');
const globalRateLimit = positive(argument(args, '--global-rate-limit') || settings.globalRateLimit, '--global-rate-limit');
if (globalRateLimit > 450) throw new Error('--global-rate-limit cannot exceed 450');
const names = await readNames(args);
const options = {
  apiKey: environment.NEXON_API_KEY || environment.VITE_NEXON_API_KEY,
  globalRateLimit,
  retryLimit: settings.retryLimit,
  timeoutMs: settings.timeoutMs,
  requestDelayMs: Number(argument(args, '--request-delay-ms') || '0'),
  maxErrorRate: Number(argument(args, '--max-error-rate') || '0.01'),
  p95RegressionFactor: Number(argument(args, '--p95-regression-factor') || '1.5'),
  previousP95: 0,
};

if (!Number.isFinite(options.maxErrorRate) || options.maxErrorRate < 0 || options.maxErrorRate > 1) {
  throw new Error('--max-error-rate must be between 0 and 1');
}
if (!Number.isFinite(options.requestDelayMs) || options.requestDelayMs < 0) {
  throw new Error('--request-delay-ms must be zero or greater');
}
if (dryRun) {
  console.log(JSON.stringify({
    mode: 'dry-run',
    namesRequired: true,
    sampleSize: names.length,
    concurrency: concurrencyLevels,
    globalRateLimit,
    benchmarkRequestDelayMs: options.requestDelayMs,
    productionRequestDelayMs: settings.requestDelayMs,
    productionDefaultsUnchanged: true,
    executionRequiresExplicitFlag: '--execute',
    d1Metrics: 'reported by resolveStagingBatch; direct API mode does not write D1',
  }, null, 2));
  process.exit(0);
}
if (!options.apiKey) throw new Error('NEXON_API_KEY or VITE_NEXON_API_KEY is required for --execute');
if (names.length === 0) throw new Error('--execute requires --names or --names-file');

for (const concurrency of concurrencyLevels) {
  const result = await runLevel(names, concurrency, options);
  console.log(JSON.stringify({ event: 'benchmark-level', ...result }));
  options.previousP95 = result.p95WallMs;
  if (result.stopRecommended) {
    console.log(JSON.stringify({ event: 'benchmark-stopped', reason: 'error-rate-or-p95-regression', concurrency }));
    break;
  }
}
