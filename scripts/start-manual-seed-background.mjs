import { closeSync, mkdirSync, openSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  loadManualImportEnvironment,
  manualImportSettings,
  publicManualImportSettings,
} from './manual-import-config.mjs';
import { readRuntimeState, runtimePaths, updateRuntimeState } from './manual-import-runtime.mjs';

const projectRoot = process.cwd();
const { directory: runtimeDirectory, stopFile } = runtimePaths(projectRoot);
const importerScript = path.join(projectRoot, 'scripts', 'run-maple-import.mjs');

mkdirSync(runtimeDirectory, { recursive: true });
const previous = readRuntimeState(projectRoot);
if (previous.alive) {
  console.log(JSON.stringify({
    started: false,
    reason: 'already_running',
    pid: previous.pid,
    startedAt: previous.startedAt,
    stdoutLog: previous.stdoutLog,
    stderrLog: previous.stderrLog,
  }));
  process.exit(0);
}
rmSync(stopFile, { force: true });

const startedAt = new Date();
const stamp = startedAt.toISOString().replaceAll(':', '-').replaceAll('.', '-');
const stdoutLog = path.join(runtimeDirectory, `${stamp}.stdout.log`);
const stderrLog = path.join(runtimeDirectory, `${stamp}.stderr.log`);
const stdoutFd = openSync(stdoutLog, 'a');
const stderrFd = openSync(stderrLog, 'a');

const forwardedArgs = process.argv.slice(2);
const childArgs = [
  importerScript,
  'manual',
  '--dir',
  path.join('data', 'manual-character-seed'),
  '--all',
  ...forwardedArgs,
];

const child = spawn(process.execPath, childArgs, {
  cwd: projectRoot,
  detached: true,
  windowsHide: true,
  env: {
    ...process.env,
    HOLYBEAR_MANUAL_IMPORT_BACKGROUND: '1',
  },
  stdio: ['ignore', stdoutFd, stderrFd],
});

closeSync(stdoutFd);
closeSync(stderrFd);
child.unref();

const environment = await loadManualImportEnvironment({ cwd: projectRoot });
const state = updateRuntimeState({
  pid: child.pid,
  startedAt: startedAt.toISOString(),
  command: `node scripts/run-maple-import.mjs manual --dir data/manual-character-seed --all${forwardedArgs.length ? ` ${forwardedArgs.join(' ')}` : ''}`,
  stdoutLog,
  stderrLog,
  settings: publicManualImportSettings(manualImportSettings(environment)),
}, projectRoot);

console.log(JSON.stringify({ started: true, ...state }));
