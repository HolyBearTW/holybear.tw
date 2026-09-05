import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const MANUAL_IMPORT_DEFAULTS = Object.freeze({
  batchSize: 16,
  concurrency: 4,
  requestDelayMs: 100,
  retryLimit: 5,
  timeoutMs: 10_000,
  d1ReadBudget: 25_000_000,
  d1WriteBudget: 5_000_000,
  nexonRequestBudget: 400_000,
});

const integer = (value, fallback, minimum, maximum) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

const parseEnvFile = async (filename) => {
  try {
    const contents = await readFile(filename, 'utf8');
    return Object.fromEntries(contents.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || match[1].startsWith('#')) return [];
      return [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]];
    }));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
};

export const loadManualImportEnvironment = async ({
  cwd = process.cwd(),
  processEnvironment = process.env,
} = {}) => ({
  ...await parseEnvFile(path.join(cwd, '.env')),
  ...await parseEnvFile(path.join(cwd, '.env.local')),
  ...processEnvironment,
});

export const manualImportSettings = (environment) => ({
  batchSize: integer(environment.NEXON_RESOLUTION_BATCH_SIZE, MANUAL_IMPORT_DEFAULTS.batchSize, 1, 100),
  concurrency: integer(environment.NEXON_CONCURRENCY, MANUAL_IMPORT_DEFAULTS.concurrency, 1, 8),
  requestDelayMs: integer(environment.NEXON_REQUEST_DELAY_MS, MANUAL_IMPORT_DEFAULTS.requestDelayMs, 0, 10_000),
  retryLimit: integer(environment.NEXON_RETRY_LIMIT, MANUAL_IMPORT_DEFAULTS.retryLimit, 1, 8),
  timeoutMs: integer(environment.NEXON_REQUEST_TIMEOUT_MS, MANUAL_IMPORT_DEFAULTS.timeoutMs, 1_000, 30_000),
  d1ReadBudget: integer(environment.IMPORT_D1_READ_BUDGET, MANUAL_IMPORT_DEFAULTS.d1ReadBudget, 10_000, 100_000_000),
  d1WriteBudget: integer(environment.IMPORT_D1_WRITE_BUDGET, MANUAL_IMPORT_DEFAULTS.d1WriteBudget, 10_000, 10_000_000),
  nexonRequestBudget: integer(
    environment.MANUAL_SEED_NEXON_REQUEST_BUDGET,
    MANUAL_IMPORT_DEFAULTS.nexonRequestBudget,
    1,
    1_000_000,
  ),
});

export const publicManualImportSettings = (settings) => ({
  batchSize: settings.batchSize,
  concurrency: settings.concurrency,
  requestDelayMs: settings.requestDelayMs,
  retryLimit: settings.retryLimit,
  timeoutMs: settings.timeoutMs,
  d1ReadBudget: settings.d1ReadBudget,
  d1WriteBudget: settings.d1WriteBudget,
  nexonRequestBudget: settings.nexonRequestBudget,
});
