import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../functions/_shared/env';
import { backfillGrowthSoulBatch } from '../../functions/_shared/growth-soul';
import { createGrowthProfile, getGrowthHistory } from '../../functions/_shared/growth-tracker';
import { createTestD1 } from './sqlite-d1';

const ocid = 'a3e399217d603631033dd65ebaa08275';
let local: ReturnType<typeof createTestD1>;
let env: Env;

beforeEach(() => {
  local = createTestD1();
  env = {
    DB: local.db, SURVEY_DB: local.db, NEXON_API_KEY: 'test-only',
    NEXON_RETRY_LIMIT: '1', NEXON_REQUEST_TIMEOUT_MS: '1000',
    GROWTH_BACKFILL_BATCH_SIZE: '2', GROWTH_DATE_CONCURRENCY: '2',
  };
});
afterEach(() => { local.sqlite.close(); vi.unstubAllGlobals(); });

describe('growth soul history', () => {
  it('persists the first observed conversion and only records new grade highs', async () => {
    await createGrowthProfile(env.DB, ocid, '2026-08-07');
    const insert = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at)
      VALUES (?, ?, '測試', '艾麗亞', '主教', 270, 0, 0, 'now', 'now')
    `);
    for (const date of ['2026-07-28', '2026-07-29', '2026-07-30', '2026-08-01',
      '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']) insert.run(ocid, date);
    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', basic_last_synced_date='2026-08-07' WHERE ocid=?`).run(ocid);
    const observations: Record<string, { soul_name?: string; soul_weapon_grade?: string; item_name?: string } | null> = {
      '2026-07-28': { item_name: '創世武器', soul_name: '武公的靈魂寶珠' },
      '2026-07-29': null,
      '2026-07-30': null,
      '2026-08-01': { item_name: '創世武器', soul_weapon_grade: '7' },
      '2026-08-02': null,
      '2026-08-03': { item_name: '其他武器', soul_name: '其他靈魂寶珠' },
      '2026-08-04': { item_name: '其他武器', soul_weapon_grade: '6' },
      '2026-08-05': { item_name: '創世武器', soul_weapon_grade: '8' },
      '2026-08-06': { item_name: '創世武器', soul_weapon_grade: '7' },
      '2026-08-07': { item_name: '創世武器', soul_weapon_grade: '8' },
    };
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      const item = observations[date];
      return Response.json({ item_equipment: item ? [{ item_equipment_slot: '武器', ...item }] : [] });
    }));

    for (let index = 0; index < 5; index += 1) await backfillGrowthSoulBatch(env);
    const all = await getGrowthHistory(env.DB, ocid, '2026-07-28', '2026-08-07');
    expect(all?.events.filter((item) => item.type.startsWith('soul_'))).toEqual([
      expect.objectContaining({ date: '2026-08-01', type: 'soul_conversion', from: '武公的靈魂寶珠', to: '靈魂武器第 7 階段' }),
      expect.objectContaining({ date: '2026-08-05', type: 'soul_grade', from: '第 7 階段', to: '第 8 階段' }),
    ]);
    const later = await getGrowthHistory(env.DB, ocid, '2026-08-05', '2026-08-07');
    expect(later?.events.filter((item) => item.type.startsWith('soul_'))).toEqual([
      expect.objectContaining({ date: '2026-08-05', from: '第 7 階段', to: '第 8 階段' }),
    ]);
    expect(local.sqlite.prepare('SELECT highest_grade FROM growth_soul_tracking WHERE ocid=?').get(ocid)?.highest_grade).toBe(8);
    expect(await backfillGrowthSoulBatch(env)).toEqual({ processedDates: 0 });
  });

  it('does not invent a conversion when the preceding orb belongs to another weapon', async () => {
    await createGrowthProfile(env.DB, ocid, '2026-08-01');
    const insert = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at)
      VALUES (?, ?, '測試', '艾麗亞', '主教', 270, 0, 0, 'now', 'now')
    `);
    insert.run(ocid, '2026-07-29'); insert.run(ocid, '2026-08-01');
    local.sqlite.prepare(`UPDATE growth_profiles SET basic_last_synced_date='2026-08-01' WHERE ocid=?`).run(ocid);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const before = new URL(input).searchParams.get('date') === '2026-07-29';
      return Response.json({ item_equipment: [{ item_equipment_slot: '武器', item_name: before ? '武器 A' : '武器 B',
        soul_name: before ? '武公的靈魂寶珠' : null, soul_weapon_grade: before ? null : '7' }] });
    }));
    await backfillGrowthSoulBatch(env);
    expect((await getGrowthHistory(env.DB, ocid, '2026-07-29', '2026-08-01'))?.events).toEqual([]);
    expect(local.sqlite.prepare('SELECT highest_grade FROM growth_soul_tracking').get()?.highest_grade).toBe(7);
  });

  it('retries an equipment API failure without advancing the checkpoint or affecting the growth profile', async () => {
    await createGrowthProfile(env.DB, ocid, '2026-08-01');
    local.sqlite.prepare(`
      INSERT INTO growth_snapshots (ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at)
      VALUES (?, '2026-08-01', '測試', '艾麗亞', '主教', 270, 0, 0, 'now', 'now')
    `).run(ocid);
    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', basic_last_synced_date='2026-08-01' WHERE ocid=?`).run(ocid);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unavailable', { status: 403 })));
    await expect(backfillGrowthSoulBatch(env)).rejects.toThrow();
    expect(local.sqlite.prepare('SELECT last_synced_date, claim_token FROM growth_soul_tracking').get())
      .toMatchObject({ last_synced_date: null, claim_token: null });
    expect(local.sqlite.prepare('SELECT status FROM growth_profiles').get()?.status).toBe('completed');
    expect(await backfillGrowthSoulBatch(env)).toEqual({ processedDates: 0 });
    local.sqlite.prepare('UPDATE growth_soul_tracking SET retry_at=NULL').run();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ item_equipment: [
      { item_equipment_slot: '武器', item_name: '武器', soul_weapon_grade: '7' },
    ] })));
    expect(await backfillGrowthSoulBatch(env)).toMatchObject({ processedDates: 1 });
    expect(local.sqlite.prepare('SELECT last_synced_date, highest_grade FROM growth_soul_tracking').get())
      .toMatchObject({ last_synced_date: '2026-08-01', highest_grade: 7 });
  });

  it('backfills existing snapshots for a failed growth profile without reactivating it', async () => {
    await createGrowthProfile(env.DB, ocid, '2026-08-01');
    local.sqlite.prepare(`
      INSERT INTO growth_snapshots (ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at)
      VALUES (?, '2026-08-01', '測試', '艾麗亞', '主教', 270, 0, 0, 'now', 'now')
    `).run(ocid);
    local.sqlite.prepare(`UPDATE growth_profiles SET status='failed', last_error='角色已失效',
      basic_last_synced_date='2026-08-01' WHERE ocid=?`).run(ocid);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ item_equipment: [
      { item_equipment_slot: '武器', item_name: '武器', soul_weapon_grade: '7' },
    ] })));
    expect(await backfillGrowthSoulBatch(env)).toMatchObject({ processedDates: 1 });
    expect(local.sqlite.prepare('SELECT highest_grade FROM growth_soul_tracking').get()?.highest_grade).toBe(7);
    expect(local.sqlite.prepare('SELECT status, last_error FROM growth_profiles').get())
      .toMatchObject({ status: 'failed', last_error: '角色已失效' });
  });
});
