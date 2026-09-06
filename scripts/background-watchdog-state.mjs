import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export const BACKGROUND_JOB_IDS = Object.freeze({
  manualImport: 'manual-import',
  accountSignals: 'account-signals',
});

const watchdogDirectory = (cwd = process.cwd()) => path.join(cwd, '.wrangler', 'background-watchdog');
const disabledPath = (jobId, cwd = process.cwd()) => path.join(watchdogDirectory(cwd), `${jobId}.disabled.json`);

export const isBackgroundJobDisabled = (jobId, cwd = process.cwd()) => existsSync(disabledPath(jobId, cwd));

export const enableBackgroundJob = (jobId, cwd = process.cwd()) => {
  rmSync(disabledPath(jobId, cwd), { force: true });
};

export const disableBackgroundJob = (jobId, cwd = process.cwd()) => {
  const directory = watchdogDirectory(cwd);
  mkdirSync(directory, { recursive: true });
  writeFileSync(disabledPath(jobId, cwd), `${JSON.stringify({
    jobId,
    disabledAt: new Date().toISOString(),
    reason: 'manual_stop_command',
  }, null, 2)}\n`, 'utf8');
};

export const backgroundWatchdogPaths = (cwd = process.cwd()) => ({
  directory: watchdogDirectory(cwd),
  logFile: path.join(watchdogDirectory(cwd), 'watchdog.log'),
});
