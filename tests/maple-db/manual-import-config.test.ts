import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadManualImportEnvironment,
  manualImportSettings,
  MANUAL_IMPORT_DEFAULTS,
} from '../../scripts/manual-import-config.mjs';
import {
  clearRuntimeState,
  readRuntimeState,
  requestStop,
  runtimePaths,
  updateRuntimeState,
} from '../../scripts/manual-import-runtime.mjs';

const directories: string[] = [];
const previousRuntimeDirectory = process.env.HOLYBEAR_IMPORT_RUNTIME_DIR;

afterEach(async () => {
  if (previousRuntimeDirectory == null) delete process.env.HOLYBEAR_IMPORT_RUNTIME_DIR;
  else process.env.HOLYBEAR_IMPORT_RUNTIME_DIR = previousRuntimeDirectory;
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const temporaryDirectory = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'manual-import-config-test-'));
  directories.push(directory);
  return directory;
};

describe('manual importer configuration', () => {
  it('uses process.env over .env.local over .env over defaults', async () => {
    const directory = await temporaryDirectory();
    await writeFile(path.join(directory, '.env'), 'NEXON_CONCURRENCY=2\nNEXON_REQUEST_DELAY_MS=300\n', 'utf8');
    await writeFile(path.join(directory, '.env.local'), 'NEXON_CONCURRENCY=3\n', 'utf8');
    const environment = await loadManualImportEnvironment({
      cwd: directory,
      processEnvironment: { NEXON_CONCURRENCY: '6' },
    });
    const settings = manualImportSettings(environment);
    expect(settings.concurrency).toBe(6);
    expect(settings.requestDelayMs).toBe(300);
    expect(settings.batchSize).toBe(MANUAL_IMPORT_DEFAULTS.batchSize);
  });

  it('uses paid defaults while retaining explicit safety ceilings', () => {
    expect(manualImportSettings({})).toMatchObject({
      batchSize: 16,
      concurrency: 4,
      requestDelayMs: 100,
      d1ReadBudget: 25_000_000,
      d1WriteBudget: 5_000_000,
    });
    expect(manualImportSettings({
      IMPORT_D1_READ_BUDGET: '999999999',
      IMPORT_D1_WRITE_BUDGET: '999999999',
    })).toMatchObject({ d1ReadBudget: 100_000_000, d1WriteBudget: 10_000_000 });
  });
});

describe('manual importer background runtime', () => {
  it('returns not_running and clears stale metadata', async () => {
    const directory = await temporaryDirectory();
    process.env.HOLYBEAR_IMPORT_RUNTIME_DIR = directory;
    updateRuntimeState({ pid: 999_999_999 });
    expect(requestStop()).toEqual({ requested: false, reason: 'not_running' });
    expect(existsSync(runtimePaths().stateFile)).toBe(false);
  });

  it('requests graceful stop and clears matching process metadata', async () => {
    const directory = await temporaryDirectory();
    process.env.HOLYBEAR_IMPORT_RUNTIME_DIR = directory;
    updateRuntimeState({ pid: process.pid, startedAt: new Date().toISOString() });
    expect(requestStop()).toMatchObject({ requested: true, reason: 'stop_requested', pid: process.pid });
    expect(existsSync(runtimePaths().stopFile)).toBe(true);
    expect(readRuntimeState()).toMatchObject({ alive: true, pid: process.pid });
    expect(clearRuntimeState(process.pid)).toBe(true);
    expect(existsSync(runtimePaths().stateFile)).toBe(false);
    expect(existsSync(runtimePaths().stopFile)).toBe(false);
  });
});
