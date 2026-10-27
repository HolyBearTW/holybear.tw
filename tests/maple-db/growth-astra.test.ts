import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../functions/_shared/env';
import { backfillGrowthAstraBatch } from '../../functions/_shared/growth-astra';
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

const seed = async (dates: string[]) => {
  const lastDate = dates.at(-1)!;
  await createGrowthProfile(env.DB, ocid, lastDate);
  const insert = local.sqlite.prepare(`
    INSERT INTO growth_snapshots (ocid, snapshot_date, character_name, world_name, job_name,
      character_level, character_exp, character_exp_rate, fetched_at, updated_at)
    VALUES (?, ?, '測試', '艾麗亞', '主教', 270, 0, 0, 'now', 'now')
  `);
  for (const date of dates) insert.run(ocid, date);
  local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', basic_last_synced_date=? WHERE ocid=?`)
    .run(lastDate, ocid);
};

describe('growth Astra history', () => {
  it('records the original and Astra names once, across missing equipment and later switches', async () => {
    await seed(['2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19']);
    local.sqlite.prepare(`INSERT INTO growth_soul_tracking (ocid, last_synced_date, highest_grade, updated_at)
      VALUES (?, '2026-07-19', 7, 'now')`).run(ocid);
    const observations: Record<string, string | null> = {
      '2026-07-14': '進化的長杖', '2026-07-15': null, '2026-07-16': '阿斯特拉寶珠',
      '2026-07-17': null, '2026-07-18': '其他副武器', '2026-07-19': '阿斯特拉其他副武器',
    };
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const name = observations[new URL(input).searchParams.get('date')!];
      return Response.json({ item_equipment: name ? [{ item_equipment_slot: '輔助武器', item_name: name }] : [] });
    }));
    for (let index = 0; index < 3; index += 1) await backfillGrowthAstraBatch(env);
    const history = await getGrowthHistory(env.DB, ocid, '2026-07-16', '2026-07-19');
    expect(history?.events.filter((item) => item.type === 'astra_acquired')).toEqual([
      expect.objectContaining({ date: '2026-07-16', from: '進化的長杖', to: '阿斯特拉寶珠' }),
    ]);
    expect(local.sqlite.prepare('SELECT last_synced_date, highest_grade FROM growth_soul_tracking').get())
      .toMatchObject({ last_synced_date: '2026-07-19', highest_grade: 7 });
  });

  it('detects the Zero-specific Astra slot even when its ordinary secondary remains equipped', async () => {
    await seed(['2026-07-15', '2026-07-16']);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const after = new URL(input).searchParams.get('date') === '2026-07-16';
      return Response.json({ item_equipment: [
        { item_equipment_slot: '輔助武器', item_name: '創世琉' },
        ...(after ? [{ item_equipment_slot: '阿斯特拉輔助武器神之子', item_name: '阿斯特拉沙漏' }] : []),
      ] });
    }));
    await backfillGrowthAstraBatch(env);
    expect((await getGrowthHistory(env.DB, ocid, '2026-07-15', '2026-07-16'))?.events)
      .toContainEqual(expect.objectContaining({ type: 'astra_acquired', from: '創世琉', to: '阿斯特拉沙漏' }));
  });

  it('stops equipment requests after the first Astra observation, including on later daily updates', async () => {
    await seed(['2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18']);
    const fetchMock = vi.fn(async (input: string) => {
      const before = new URL(input).searchParams.get('date') === '2026-07-15';
      return Response.json({ item_equipment: [{ item_equipment_slot: '輔助武器',
        item_name: before ? '原本的副武器' : '阿斯特拉寶珠' }] });
    });
    vi.stubGlobal('fetch', fetchMock);
    await backfillGrowthAstraBatch(env);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(local.sqlite.prepare('SELECT last_synced_date, has_astra FROM growth_astra_tracking').get())
      .toMatchObject({ last_synced_date: '2026-07-18', has_astra: 1 });
    expect((await getGrowthHistory(env.DB, ocid, '2026-07-15', '2026-07-18'))?.events)
      .toContainEqual(expect.objectContaining({ type: 'astra_acquired', from: '原本的副武器', to: '阿斯特拉寶珠' }));

    local.sqlite.prepare(`UPDATE growth_profiles SET basic_last_synced_date='2026-07-19' WHERE ocid=?`).run(ocid);
    await backfillGrowthAstraBatch(env);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(local.sqlite.prepare('SELECT last_synced_date FROM growth_astra_tracking').get()?.last_synced_date)
      .toBe('2026-07-19');
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM growth_astra_events').get()?.n).toBe(1);
  });

  it('does not invent a previous weapon if Astra is the first observed equipment', async () => {
    await seed(['2026-07-15', '2026-07-16', '2026-07-17']);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      const name = date === '2026-07-16' ? '其他副武器' : '阿斯特拉寶珠';
      return Response.json({ item_equipment: [{ item_equipment_slot: '輔助武器', item_name: name }] });
    }));
    await backfillGrowthAstraBatch(env);
    await backfillGrowthAstraBatch(env);
    expect((await getGrowthHistory(env.DB, ocid, '2026-07-15', '2026-07-17'))?.events).toEqual([]);
    expect(local.sqlite.prepare('SELECT has_astra FROM growth_astra_tracking').get()?.has_astra).toBe(1);
  });

  it('keeps the checkpoint and the growth profile unchanged on an equipment API failure', async () => {
    await seed(['2026-07-15']);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unavailable', { status: 403 })));
    await expect(backfillGrowthAstraBatch(env)).rejects.toThrow();
    expect(local.sqlite.prepare('SELECT last_synced_date, claim_token FROM growth_astra_tracking').get())
      .toMatchObject({ last_synced_date: null, claim_token: null });
    expect(local.sqlite.prepare('SELECT status FROM growth_profiles').get()?.status).toBe('completed');
    expect(await backfillGrowthAstraBatch(env)).toEqual({ processedDates: 0 });
    local.sqlite.prepare('UPDATE growth_astra_tracking SET retry_at=NULL').run();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ item_equipment: [
      { item_equipment_slot: '輔助武器', item_name: '原本的副武器' },
    ] })));
    expect(await backfillGrowthAstraBatch(env)).toMatchObject({ processedDates: 1 });
    expect(local.sqlite.prepare('SELECT last_synced_date, previous_item_name FROM growth_astra_tracking').get())
      .toMatchObject({ last_synced_date: '2026-07-15', previous_item_name: '原本的副武器' });
  });
});
