import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fullGuildEstimateStatePaths } from './run-full-guild-estimate.mjs';

export const readFullGuildEstimateStatus = async (cwd = process.cwd()) => {
  const statePath = fullGuildEstimateStatePaths(cwd).state;
  if (!existsSync(statePath)) {
    return { status: 'not_started', statePath };
  }
  let state;
  try {
    state = JSON.parse(await readFile(statePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read full guild estimate state: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('Full guild estimate state is not a JSON object');
  }
  return { ...state, statePath };
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  readFullGuildEstimateStatus().then((status) => {
    console.log(JSON.stringify(status, null, 2));
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
