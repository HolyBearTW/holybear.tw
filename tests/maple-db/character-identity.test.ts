import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestD1, createTestR2 } from './sqlite-d1';
import { findCharacterByOcid, invalidateCharacterStatement, upsertCanonicalNexonCharacter } from '../../functions/_shared/character-repository';
import { getOrDiscoverCharacter } from '../../functions/_shared/character-service';
import { getCombatPowerRanking, getCharacterCombatPowerRank } from '../../functions/_shared/ranking-repository';
import { createGrowthProfile, scheduleGrowthProfiles } from '../../functions/_shared/growth-tracker';
import type { Env } from '../../functions/_shared/env';

let local: ReturnType<typeof createTestD1>;
let env: Env;
const timestamp = '2026-10-25T00:00:00.000Z';
const seed = (name: string, power = 100, at = timestamp) => upsertCanonicalNexonCharacter(env.DB, {
  ocid: `ocid-${name}`, characterName: name, worldName: '艾麗亞', jobName: '主教',
  level: 290, combatPower: power, characterImage: 'image', guildName: null,
  requestedAt: at, observedAt: at,
}, [{ source: 'nexon' }]);

beforeEach(() => {
  local = createTestD1();
  env = { DB: local.db, SURVEY_DB: local.db, EVIDENCE_ARCHIVE: createTestR2().bucket,
    NEXON_API_KEY: 'test-only', NEXON_RETRY_LIMIT: '1', CHARACTER_FRESHNESS_SECONDS: '0' };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(timestamp);
});
afterEach(() => { local.sqlite.close(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('confirmed unavailable character identities', () => {
  it('removes unavailable identities from rank, filtered totals and the active counter while preserving history', async () => {
    await seed('舊角色', 300);
    await seed('有效角色', 200);
    await createGrowthProfile(env.DB, 'ocid-舊角色');
    local.sqlite.exec(`UPDATE growth_profiles SET status='completed'`);
    local.sqlite.exec(`INSERT INTO growth_snapshots (ocid, snapshot_date, character_name, world_name, job_name,
      character_level, character_exp, character_exp_rate, fetched_at, updated_at)
      VALUES ('ocid-舊角色', '2026-10-24', '舊角色', '艾麗亞', '主教', 290, 1, 1, 'now', 'now')`);
    await invalidateCharacterStatement(env.DB, 'ocid-舊角色', '舊角色', timestamp, '已確認失效').run();

    const ranking = await getCombatPowerRanking(env.DB, { page: 1, pageSize: 10 });
    expect(ranking).toMatchObject({ total: 1, items: [{ characterName: '有效角色', rank: 1 }] });
    expect((await getCombatPowerRanking(env.DB, { page: 1, pageSize: 10, world: '艾麗亞', job: '主教' })).total).toBe(1);
    expect(await getCharacterCombatPowerRank(env.DB, '舊角色')).toBeNull();
    expect(await getCharacterCombatPowerRank(env.DB, '有效角色')).toMatchObject({ rank: 1, total: 1 });
    expect(local.sqlite.prepare('SELECT characters_total, active_characters_total FROM database_stats').get())
      .toMatchObject({ characters_total: 2, active_characters_total: 1 });
    expect(local.sqlite.prepare(`SELECT status, next_retry_at FROM growth_profiles`).get())
      .toMatchObject({ status: 'failed', next_retry_at: null });
    await scheduleGrowthProfiles(env.DB, '2026-10-26');
    expect(local.sqlite.prepare('SELECT status FROM growth_profiles').get()?.status).toBe('failed');
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM growth_snapshots').get()?.n).toBe(1);
    const prepare = vi.spyOn(env.DB, 'prepare');
    await getCombatPowerRanking(env.DB, { page: 1, pageSize: 10 });
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(prepare.mock.calls[0][0]).toContain('active_characters_total');
    const plan = local.sqlite.prepare('EXPLAIN QUERY PLAN SELECT COUNT(*) FROM characters WHERE is_active=1 AND combat_power>100').all();
    expect(JSON.stringify(plan)).toContain('COVERING INDEX idx_characters_combat_power');
  });

  it('rejects late invalidations and stale refreshes, and only a newer canonical response reactivates a row', async () => {
    await seed('角色');
    await invalidateCharacterStatement(env.DB, 'ocid-角色', '角色', '2026-10-24T00:00:00.000Z', '舊失敗').run();
    expect((await findCharacterByOcid(env.DB, 'ocid-角色'))?.isActive).toBe(true);
    await invalidateCharacterStatement(env.DB, 'ocid-角色', '角色', '2026-10-25T01:00:00.000Z', '失效').run();
    await seed('角色', 200, '2026-10-25T00:30:00.000Z');
    expect((await findCharacterByOcid(env.DB, 'ocid-角色'))?.isActive).toBe(false);
    await seed('角色', 200, '2026-10-25T02:00:00.000Z');
    expect((await findCharacterByOcid(env.DB, 'ocid-角色'))?.isActive).toBe(true);
    expect(local.sqlite.prepare('SELECT active_characters_total FROM database_stats').get()?.active_characters_total).toBe(1);
    await invalidateCharacterStatement(env.DB, 'ocid-角色', '角色', '2026-10-25T03:00:00.000Z', '失效').run();
    await invalidateCharacterStatement(env.DB, 'ocid-角色', '角色', '2026-10-25T03:00:00.000Z', '失效').run();
    expect(local.sqlite.prepare('SELECT active_characters_total FROM database_stats').get()?.active_characters_total).toBe(0);
    local.sqlite.exec(`DELETE FROM characters WHERE ocid='ocid-角色'`);
    expect(local.sqlite.prepare('SELECT characters_total, active_characters_total FROM database_stats').get())
      .toMatchObject({ characters_total: 0, active_characters_total: 0 });
  });

  it('keeps temporary failures available but a confirmed current identifier failure returns 404 and invalidates once', async () => {
    await seed('查詢角色', 100, '2026-10-24T00:00:00.000Z');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('temporary', { status: 503 })));
    expect(await getOrDiscoverCharacter(env, '查詢角色')).toMatchObject({ stale: true, character: { isActive: true } });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { name: 'OPENAPI00003' } }, { status: 400 })));
    await expect(getOrDiscoverCharacter(env, '查詢角色')).rejects.toMatchObject({ status: 404 });
    expect((await findCharacterByOcid(env.DB, 'ocid-查詢角色'))?.isActive).toBe(false);
    expect(await getCharacterCombatPowerRank(env.DB, '查詢角色')).toBeNull();
  });

  it('does not trust retained old OCID data when the requested name now belongs to another identity', async () => {
    await seed('同名字', 100, '2026-10-24T00:00:00.000Z');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/id')) return Response.json({ ocid: 'new-owner-ocid' });
      if (url.pathname.endsWith('/character/basic')) return Response.json({
        character_name: '同名字', world_name: '艾麗亞', character_class: '主教',
        character_level: 290, character_image: 'new-image', character_guild_name: null,
      });
      return Response.json({ final_stat: [{ stat_name: '戰鬥力', stat_value: '200' }] });
    }));
    expect(await getOrDiscoverCharacter(env, '同名字')).toMatchObject({ character: { ocid: 'new-owner-ocid' } });
    expect((await findCharacterByOcid(env.DB, 'ocid-同名字'))?.isActive).toBe(false);
    expect(await getCharacterCombatPowerRank(env.DB, '同名字')).toMatchObject({ entry: { ocid: 'new-owner-ocid' }, total: 1 });
  });

  it('recognizes an absent name reported as OPENAPI00004 but does not confuse a stat failure with name disappearance', async () => {
    await seed('名稱查不到', 100, '2026-10-24T00:00:00.000Z');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { name: 'OPENAPI00004' } }, { status: 400 })));
    await expect(getOrDiscoverCharacter(env, '名稱查不到')).rejects.toMatchObject({ status: 404 });
    expect((await findCharacterByOcid(env.DB, 'ocid-名稱查不到'))?.isActive).toBe(false);
    await seed('仍有效', 100, '2026-10-24T00:00:00.000Z');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      if (new URL(input).pathname.endsWith('/id')) return Response.json({ ocid: 'ocid-仍有效' });
      return Response.json({ error: { name: 'OPENAPI00004' } }, { status: 400 });
    }));
    expect(await getOrDiscoverCharacter(env, '仍有效')).toMatchObject({ stale: true, character: { isActive: true } });
  });
});
