import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const projectRoot = process.cwd();
const runtimeDirectory = path.join(projectRoot, '.wrangler', 'manual-seed-import');
const stateFile = path.join(runtimeDirectory, 'latest.json');
const importerScript = path.join(projectRoot, 'scripts', 'run-maple-import.mjs');

const processIsRunning = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

mkdirSync(runtimeDirectory, { recursive: true });

try {
  const previous = JSON.parse(readFileSync(stateFile, 'utf8'));
  if (processIsRunning(Number(previous.pid))) {
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
} catch (error) {
  if (error?.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
}

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
  env: process.env,
  stdio: ['ignore', stdoutFd, stderrFd],
});

closeSync(stdoutFd);
closeSync(stderrFd);
child.unref();

const state = {
  pid: child.pid,
  startedAt: startedAt.toISOString(),
  command: `node scripts/run-maple-import.mjs manual --dir data/manual-character-seed --all${forwardedArgs.length ? ` ${forwardedArgs.join(' ')}` : ''}`,
  stdoutLog,
  stderrLog,
};
writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ started: true, ...state }));
