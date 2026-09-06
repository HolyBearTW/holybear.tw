import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  BACKGROUND_JOB_IDS,
  backgroundWatchdogPaths,
  isBackgroundJobDisabled,
} from './background-watchdog-state.mjs';
import { processIsRunning } from './manual-import-runtime.mjs';

const projectRoot = path.resolve(import.meta.dirname, '..');
const intervalMs = Math.max(30_000, Number.parseInt(process.env.HOLYBEAR_WATCHDOG_INTERVAL_MS || '60000', 10));
const { directory, logFile } = backgroundWatchdogPaths(projectRoot);
mkdirSync(directory, { recursive: true });

const jobs = [
  {
    id: BACKGROUND_JOB_IDS.manualImport,
    stateFile: path.join(projectRoot, '.wrangler', 'manual-seed-import', 'latest.json'),
    starter: path.join(projectRoot, 'scripts', 'start-manual-seed-background.mjs'),
  },
  {
    id: BACKGROUND_JOB_IDS.accountSignals,
    stateFile: path.join(projectRoot, '.wrangler', 'account-signal-backfill', 'latest.json'),
    starter: path.join(projectRoot, 'scripts', 'start-account-signal-backfill.mjs'),
  },
];

const log = (event, details = {}) => appendFileSync(logFile, `${JSON.stringify({
  at: new Date().toISOString(),
  event,
  ...details,
})}\n`, 'utf8');

const readState = (stateFile) => {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return {};
  }
};

const lastObserved = new Map();
const ensureJob = (job) => {
  if (isBackgroundJobDisabled(job.id, projectRoot)) {
    if (lastObserved.get(job.id) !== 'disabled') log('job-disabled', { job: job.id });
    lastObserved.set(job.id, 'disabled');
    return;
  }

  const state = readState(job.stateFile);
  if (processIsRunning(Number(state.pid))) {
    lastObserved.set(job.id, `running:${state.pid}`);
    return;
  }

  const previous = lastObserved.get(job.id);
  if (previous !== 'missing') log('job-missing', { job: job.id, previousPid: state.pid || null });
  lastObserved.set(job.id, 'missing');
  const result = spawnSync(process.execPath, [job.starter], {
    cwd: projectRoot,
    env: process.env,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30_000,
  });
  log(result.status === 0 ? 'job-start-requested' : 'job-start-failed', {
    job: job.id,
    exitCode: result.status,
    stdout: String(result.stdout || '').trim().slice(-2000),
    stderr: String(result.stderr || '').trim().slice(-2000),
  });
};

const check = () => {
  for (const job of jobs) {
    try {
      ensureJob(job);
    } catch (error) {
      log('job-check-failed', { job: job.id, error: String(error?.stack || error) });
    }
  }
};

log('watchdog-started', { pid: process.pid, intervalMs });
check();
const timer = setInterval(check, intervalMs);
const shutdown = (signal) => {
  clearInterval(timer);
  log('watchdog-stopped', { pid: process.pid, signal });
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
