import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCharacterAlts } from '../../functions/_shared/account-group-repository';
import {
  enqueueCharacterMetadataRefreshes,
  refreshCharacterMetadataBatch,
} from '../../functions/_shared/character-metadata-refresh';
import {
  findCharacterByOcid,
  isCanonicalCharacterMetadataComplete,
  upsertCanonicalNexonCharacter,
} from '../../functions/_shared/character-repository';
import { getCharacterCombatPowerRank } from '../../functions/_shared/ranking-repository';
import { fromD1Alt, mergeRelatedCharacters } from '../../.vitepress/theme/maplestory/services/relatedCharacterMerge';
import type { Env } from '../../functions/_shared/env';
import { createTestD1 } from './sqlite-d1';

let local: ReturnType<typeof createTestD1>;
let env: Env;
const timestamp = '2026-09-08T00:00:00.000Z';

const mainCharacter = {
  ocid: 'main-ocid',
  characterName: '主角色',
  worldName: '艾麗亞',
  jobName: '主教',
  level: 290,
  combatPower: 10_000_000,
  characterImage: 'main-image',
  guildName: null,
  observedAt: timestamp,
  requestedAt: timestamp,
  nexonUpdatedAt: timestamp,
};

const signalResponse = (path: string) => {
  if (path.endsWith('/user/union-champion')) return Response.json({
    union_champion: [
      { champion_name: '主角色', champion_grade: 'SSS', champion_class: '主教' },
      { champion_name: '待補分身', champion_grade: 'SSS', champion_class: '夜使者' },
    ],
  });
  if (path.endsWith('/user/union')) return Response.json({ union_level: 9_000, union_grade: 'Grand Master' });
  if (path.endsWith('/user/union-raider')) return Response.json({
    use_preset_no: 1,
    union_block: Array.from({ length: 8 }, (_, index) => ({
      block_type: `type-${index}`,
      block_class: `class-${index}`,
      block_level: 250,
      block_control_point: { x: index, y: index },
      block_position: [{ x: index, y: index }],
    })),
  });
  return null;
};

beforeEach(async () => {
  local = createTestD1();
  env = {
    DB: local.db,
    SURVEY_DB: local.db,
    NEXON_API_KEY: 'test-only',
    NEXON_RETRY_LIMIT: '1',
    NEXON_REQUEST_DELAY_MS: '0',
    CHARACTER_METADATA_REFRESH_BATCH_SIZE: '8',
    CHARACTER_METADATA_REFRESH_CONCURRENCY: '4',
    CHARACTER_METADATA_REFRESH_DELAY_MS: '0',
  };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(timestamp);
  await upsertCanonicalNexonCharacter(env.DB, mainCharacter, [{ source: 'nexon' }]);
});

afterEach(() => {
  local.sqlite.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('character metadata refresh queue', () => {
  it('queues a missing Champion member without resolving character APIs in /alts', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      const response = signalResponse(path);
      if (response) return response;
      throw new Error(`Unexpected character API call in /alts: ${path}`);
    }));

    const result = await getCharacterAlts(env, '主角色');
    expect(result.alts).toContainEqual(expect.objectContaining({
      characterName: '待補分身',
      metadataAvailable: false,
      level: null,
      combatPower: null,
      characterImage: null,
      guildName: null,
    }));
    expect(local.sqlite.prepare(`SELECT status, reason FROM character_metadata_refresh
      WHERE normalized_name='待補分身' AND expected_world_name='艾麗亞'`).get())
      .toMatchObject({ status: 'pending', reason: 'missing_character' });
    const paths = vi.mocked(fetch).mock.calls.map(([input]) => new URL(String(input)).pathname);
    expect(paths.some((path) => path.endsWith('/id') || path.includes('/character/'))).toBe(false);
  });

  it('consumes the queue through id then parallel basic/stat and enqueues account signals', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      const response = signalResponse(path);
      if (response) return response;
      if (path.endsWith('/id')) return Response.json({ ocid: 'alt-ocid' });
      if (path.endsWith('/character/basic')) return Response.json({
        date: timestamp,
        character_name: '待補分身',
        world_name: '艾麗亞',
        character_class: '夜使者',
        character_level: 285,
        character_image: 'alt-image',
        character_guild_name: null,
      });
      if (path.endsWith('/character/stat')) return Response.json({
        date: timestamp,
        final_stat: [{ stat_name: '戰鬥力', stat_value: '12345678' }],
      });
      throw new Error(`Unexpected endpoint ${path}`);
    }));
    await getCharacterAlts(env, '主角色');
    vi.mocked(fetch).mockClear();

    const batch = await refreshCharacterMetadataBatch(env);
    expect(batch).toEqual({ processed: 1, completed: 1, retry: 0, failed: 0, nexonRequests: 3 });
    const paths = vi.mocked(fetch).mock.calls.map(([input]) => new URL(String(input)).pathname);
    expect(paths[0]).toBe('/maplestorytw/v1/id');
    expect(new Set(paths.slice(1))).toEqual(new Set([
      '/maplestorytw/v1/character/basic',
      '/maplestorytw/v1/character/stat',
    ]));
    const stored = await findCharacterByOcid(env.DB, 'alt-ocid');
    expect(stored).toMatchObject({
      characterName: '待補分身', level: 285, combatPower: 12_345_678,
      characterImage: 'alt-image', guildName: null,
    });
    expect(local.sqlite.prepare(`SELECT status FROM character_metadata_refresh
      WHERE normalized_name='待補分身'`).get()?.status).toBe('completed');
    expect(local.sqlite.prepare(`SELECT status FROM account_signal_sync
      WHERE ocid='alt-ocid' AND signal_type='union_raider_full'`).get()?.status).toBe('pending');
    expect((await getCharacterCombatPowerRank(env.DB, '待補分身'))?.entry.combatPower).toBe(12_345_678);
  });

  it('queues an existing row whose required canonical metadata is incomplete', async () => {
    local.sqlite.prepare(`INSERT INTO characters (
      ocid, character_name, normalized_name, world_name, job_name, level,
      combat_power, character_image, guild_name, first_seen_at, last_seen_at,
      nexon_updated_at, nexon_requested_at, created_at, updated_at
    ) VALUES ('legacy-alt', '待補分身', '待補分身', '艾麗亞', '夜使者', 0,
      0, '', NULL, ?, ?, NULL, NULL, ?, ?)`)
      .run(timestamp, timestamp, timestamp, timestamp);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      const response = signalResponse(path);
      if (response) return response;
      throw new Error(`Unexpected character API call in /alts: ${path}`);
    }));

    const result = await getCharacterAlts(env, '主角色');
    expect(result.alts).toContainEqual(expect.objectContaining({
      ocid: 'legacy-alt', metadataAvailable: false, level: null, characterImage: null,
    }));
    expect(local.sqlite.prepare(`SELECT status, reason, ocid FROM character_metadata_refresh
      WHERE normalized_name='待補分身'`).get()).toMatchObject({
      status: 'pending', reason: 'incomplete_metadata', ocid: 'legacy-alt',
    });
  });

  it('leases one queue row to only one concurrent consumer', async () => {
    await enqueueCharacterMetadataRefreshes(env.DB, [{
      characterName: '待補分身', expectedWorldName: '艾麗亞', reason: 'missing_character',
    }]);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      if (path.endsWith('/id')) return Response.json({ ocid: 'alt-ocid' });
      if (path.endsWith('/character/basic')) return Response.json({
        date: timestamp, character_name: '待補分身', world_name: '艾麗亞',
        character_class: '夜使者', character_level: 285,
        character_image: 'alt-image', character_guild_name: null,
      });
      if (path.endsWith('/character/stat')) return Response.json({
        date: timestamp, final_stat: [{ stat_name: '戰鬥力', stat_value: '12345678' }],
      });
      throw new Error(`Unexpected endpoint ${path}`);
    }));

    const batches = await Promise.all([
      refreshCharacterMetadataBatch(env),
      refreshCharacterMetadataBatch(env),
    ]);
    expect(batches.map((batch) => batch.processed).sort()).toEqual([0, 1]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
    expect(local.sqlite.prepare(`SELECT status, attempt_count FROM character_metadata_refresh
      WHERE normalized_name='待補分身'`).get()).toMatchObject({ status: 'completed', attempt_count: 1 });
  });

  it('treats a null guild as complete when required canonical metadata is present', () => {
    expect(isCanonicalCharacterMetadataComplete({
      worldName: '艾麗亞', jobName: '主教', level: 290, characterImage: 'image',
    })).toBe(true);
    expect(isCanonicalCharacterMetadataComplete({
      worldName: '艾麗亞', jobName: '主教', level: 0, characterImage: 'image',
    })).toBe(false);
  });

  it('keeps complete static metadata when the API relation is waiting for refresh', () => {
    const unavailable = fromD1Alt({
      ocid: null,
      characterName: '待補分身',
      worldName: '艾麗亞',
      jobName: '夜使者',
      level: null,
      combatPower: null,
      characterImage: null,
      guildName: null,
      metadataAvailable: false,
    });
    const staticMember = {
      characterName: '待補分身', worldName: '艾麗亞', characterClass: '夜使者',
      characterLevel: 285, characterImage: 'static-image', characterPower: '123',
      maxCharacterPower: '123', combatPowerRank: 10, characterGuildName: '公會',
      characterDateCreate: '2020-01-01T00:00:00+08:00',
    };
    expect(mergeRelatedCharacters([unavailable], [staticMember])).toEqual([staticMember]);
  });
});
