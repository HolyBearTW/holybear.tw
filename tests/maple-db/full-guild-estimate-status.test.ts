import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readFullGuildEstimateStatus } from '../../scripts/full-guild-estimate-status.mjs';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('full guild estimate status', () => {
  it('reports not_started without creating state or calling an API', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'full-guild-estimate-status-'));
    temporaryDirectories.push(cwd);
    const status = await readFullGuildEstimateStatus(cwd);
    expect(status).toEqual({
      status: 'not_started',
      statePath: path.join(cwd, '.wrangler', 'full-guild-estimate', 'latest.json'),
    });
  });

  it('reads the resumable runner checkpoint and latest summary read-only', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'full-guild-estimate-status-'));
    temporaryDirectories.push(cwd);
    const directory = path.join(cwd, '.wrangler', 'full-guild-estimate');
    await mkdir(directory, { recursive: true });
    const state = {
      status: 'completed',
      nextOffset: 4742,
      summary: { U: 344452, estimatedCharacterApiRequests: 1033356 },
    };
    await writeFile(path.join(directory, 'latest.json'), `${JSON.stringify(state)}\n`, 'utf8');
    await expect(readFullGuildEstimateStatus(cwd)).resolves.toMatchObject({ ...state, statePath: path.join(directory, 'latest.json') });
  });

  it('rejects malformed state instead of reporting a false estimate result', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'full-guild-estimate-status-'));
    temporaryDirectories.push(cwd);
    const directory = path.join(cwd, '.wrangler', 'full-guild-estimate');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'latest.json'), '{broken', 'utf8');
    await expect(readFullGuildEstimateStatus(cwd)).rejects.toThrow(/Unable to read full guild estimate state/);
  });
});
