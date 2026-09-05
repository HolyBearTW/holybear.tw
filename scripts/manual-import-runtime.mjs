import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const runtimePaths = (cwd = process.cwd()) => {
  const directory = process.env.HOLYBEAR_IMPORT_RUNTIME_DIR
    ? path.resolve(process.env.HOLYBEAR_IMPORT_RUNTIME_DIR)
    : path.join(cwd, '.wrangler', 'manual-seed-import');
  return {
    directory,
    stateFile: path.join(directory, 'latest.json'),
    stopFile: path.join(directory, 'stop-request.json'),
  };
};

export const processIsRunning = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export const readRuntimeState = (cwd = process.cwd()) => {
  const paths = runtimePaths(cwd);
  try {
    const state = JSON.parse(readFileSync(paths.stateFile, 'utf8'));
    return { ...state, alive: processIsRunning(Number(state.pid)), ...paths };
  } catch {
    return { alive: false, pid: null, ...paths };
  }
};

export const updateRuntimeState = (changes, cwd = process.cwd()) => {
  const paths = runtimePaths(cwd);
  mkdirSync(paths.directory, { recursive: true });
  let current = {};
  try { current = JSON.parse(readFileSync(paths.stateFile, 'utf8')); } catch {}
  const next = { ...current, ...changes };
  writeFileSync(paths.stateFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
};

export const stopRequested = (cwd = process.cwd()) => {
  const { stopFile } = runtimePaths(cwd);
  return existsSync(stopFile);
};

export const requestStop = (cwd = process.cwd()) => {
  const state = readRuntimeState(cwd);
  if (!state.alive) {
    rmSync(state.stateFile, { force: true });
    rmSync(state.stopFile, { force: true });
    return { requested: false, reason: 'not_running' };
  }
  writeFileSync(state.stopFile, `${JSON.stringify({ pid: state.pid, requestedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
  return { requested: true, reason: 'stop_requested', pid: state.pid };
};

export const clearRuntimeState = (pid = process.pid, cwd = process.cwd()) => {
  const state = readRuntimeState(cwd);
  if (Number(state.pid) !== Number(pid)) return false;
  rmSync(state.stateFile, { force: true });
  rmSync(state.stopFile, { force: true });
  return true;
};
