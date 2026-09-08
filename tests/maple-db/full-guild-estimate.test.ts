import { describe, expect, it, vi } from 'vitest';
import {
  advanceEstimateState,
  aggregateGuildEstimate,
  assertValidUtf8Snapshot,
  createUtf8ChunkDecoder,
  runGuildEstimateBatch,
  validateGuildRoster,
} from '../../scripts/run-full-guild-estimate.mjs';

const candidate = (guildName: string, worldName = '艾麗亞') => ({
  guild_name: guildName,
  world_name: worldName,
});

describe('resumable full guild estimate', () => {
  it('decodes a multibyte world name split across stdout chunks', () => {
    const bytes = Buffer.from('艾麗亞／看劇情', 'utf8');
    const decoder = createUtf8ChunkDecoder();
    const decoded = decoder.write(bytes.subarray(0, 1))
      + decoder.write(bytes.subarray(1, 2))
      + decoder.write(bytes.subarray(2, 5))
      + decoder.write(bytes.subarray(5))
      + decoder.end();
    expect(decoded).toBe('艾麗亞／看劇情');
    expect(decoded).not.toContain('\uFFFD');
  });

  it('rejects an old checkpoint that already contains replacement characters', () => {
    expect(() => assertValidUtf8Snapshot('candidates', [{ world_name: '���麗亞' }]))
      .toThrow(/--reset/);
    expect(() => assertValidUtf8Snapshot('candidates', [{ world_name: '艾麗亞' }])).not.toThrow();
  });

  it('validates official roster identity and normalizes duplicate members', () => {
    expect(validateGuildRoster(candidate('公會A'), {
      guild_name: '公會A', world_name: '艾麗亞', guild_member_count: 2,
      guild_member: ['角色A', '角色A'], date: null,
    })).toEqual(['艾麗亞\u0000角色a']);
    expect(() => validateGuildRoster(candidate('公會A'), {
      guild_name: '其他公會', world_name: '艾麗亞', guild_member_count: 0,
      guild_member: [], date: null,
    })).toThrow(/mismatched identity/);
  });

  it('uses only guild endpoints and records a failed guild without losing the batch', async () => {
    const fetchJson = vi.fn(async (path: string) => {
      expect(path.startsWith('/guild/')).toBe(true);
      if (path.includes('guild_name=%E5%85%AC%E6%9C%83B')) throw new Error('lookup failed');
      if (path.startsWith('/guild/id')) return { oguild_id: 'guild-a' };
      return { guild_name: '公會A', world_name: '艾麗亞', guild_member_count: 2,
        guild_member: ['既有角色', '新角色'], date: null };
    });
    const batch = await runGuildEstimateBatch([candidate('公會A'), candidate('公會B')], {
      fetchJson,
      concurrency: 2,
    });
    expect(batch).toMatchObject({ attemptedGuilds: 2, successfulGuilds: 1, rosterTotal: 2 });
    expect(batch.failedGuilds).toHaveLength(1);
    expect(fetchJson).toHaveBeenCalledTimes(3);
  });

  it('merges committed batches and deduplicates characters across guilds', () => {
    const errors = { 429: 0, 403: 0, timeout: 0, '5xx': 0, retry: 0 };
    const summary = aggregateGuildEstimate([
      { attemptedGuilds: 2, successfulGuilds: 2, failedGuilds: [], guildApiRequests: 4,
        rosterTotal: 3, uniqueMembers: ['艾麗亞\u0000既有', '艾麗亞\u0000新增'], elapsedMs: 100, errorStats: errors },
      { attemptedGuilds: 1, successfulGuilds: 0,
        failedGuilds: [{ code: 'server_error', message: 'failed' }], guildApiRequests: 3,
        rosterTotal: 0, uniqueMembers: ['艾麗亞\u0000新增'], elapsedMs: 50,
        errorStats: { ...errors, '5xx': 1, retry: 1 } },
    ], new Set(['艾麗亞\u0000既有']), 25);
    expect(summary).toMatchObject({
      attemptedGuilds: 3,
      successfulGuilds: 2,
      failedGuilds: 1,
      guildApiRequests: 7,
      rosterTotal: 3,
      deduplicatedCharacters: 2,
      existingCharacters: 1,
      U: 1,
      estimatedCharacterApiRequests: 3,
      elapsedMs: 175,
      failureReasons: { server_error: 1 },
      errorStats: { '5xx': 1, retry: 1 },
    });
    expect(summary.newCharacterRatio).toBe(0.5);
  });

  it('resumes immediately after the last committed batch', () => {
    const state = { status: 'failed', nextOffset: 200, currentBatch: { offset: 200, size: 100 }, lastError: 'timeout' };
    expect(advanceEstimateState(state, { offset: 200, attemptedGuilds: 100 }, '2026-09-08T00:00:00Z'))
      .toMatchObject({ status: 'running', nextOffset: 300, currentBatch: null, lastError: null });
    expect(() => advanceEstimateState(state, { offset: 100, attemptedGuilds: 100 }))
      .toThrow(/does not match/);
  });
});
