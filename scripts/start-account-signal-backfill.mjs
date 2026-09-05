import { closeSync, mkdirSync, openSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { readRuntimeState, runtimePaths, updateRuntimeState } from './manual-import-runtime.mjs';

const projectRoot = process.cwd();
const runtimeDirectory = path.join(projectRoot, '.wrangler', 'account-signal-backfill');
process.env.HOLYBEAR_IMPORT_RUNTIME_DIR = runtimeDirectory;
const { stopFile } = runtimePaths(projectRoot);
mkdirSync(runtimeDirectory, { recursive: true });

const previous = readRuntimeState(projectRoot);
if (previous.alive) {
  console.log(JSON.stringify({ started: false, reason: 'already_running', ...previous }));
  process.exit(0);
}
rmSync(stopFile, { force: true });

const startedAt = new Date();
const stamp = startedAt.toISOString().replaceAll(':', '-').replaceAll('.', '-');
const stdoutLog = path.join(runtimeDirectory, `${stamp}.stdout.log`);
const stderrLog = path.join(runtimeDirectory, `${stamp}.stderr.log`);
const stdoutFd = openSync(stdoutLog, 'a');
const stderrFd = openSync(stderrLog, 'a');
const child = spawn(process.execPath, [path.join(projectRoot, 'scripts', 'run-account-signal-backfill.mjs')], {
  cwd: projectRoot,
  detached: true,
  windowsHide: true,
  env: {
    ...process.env,
    HOLYBEAR_IMPORT_RUNTIME_DIR: runtimeDirectory,
    HOLYBEAR_ACCOUNT_SIGNAL_BACKGROUND: '1',
    ACCOUNT_SIGNAL_BACKFILL_STARTED_AT: startedAt.toISOString(),
  },
  stdio: ['ignore', stdoutFd, stderrFd],
});
closeSync(stdoutFd);
closeSync(stderrFd);
child.unref();

const state = updateRuntimeState({
  pid: child.pid,
  startedAt: startedAt.toISOString(),
  status: 'starting',
  stdoutLog,
  stderrLog,
}, projectRoot);
console.log(JSON.stringify({ started: true, ...state }));
