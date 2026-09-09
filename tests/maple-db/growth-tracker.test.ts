import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backfillGrowthBatch,
  createGrowthProfile,
  getGrowthHistory,
  getGrowthStatus,
  latestAvailableGrowthDate,
} from '../../functions/_shared/growth-tracker';
import type { Env } from '../../functions/_shared/env';
import { createTestD1 } from './sqlite-d1';

const OCID = 'a3e399217d603631033dd65ebaa08275';
let local: ReturnType<typeof createTestD1>;
let env: Env;

const basic = (date: string, overrides: Record<string, unknown> = {}) => ({
  date: `${date}T00:00+08:00`,
  character_name: '測試角色',
  world_name: '艾麗亞',
  character_class: '卡蒂娜',
  character_level: 271,
  character_exp: 1000,
  character_exp_rate: '10.000',
  character_guild_name: '測試公會',
  liberation_quest_clear: '1',
  ...overrides,
});

beforeEach(() => {
  local = createTestD1();
  env = {
    DB: local.db,
    SURVEY_DB: local.db,
    NEXON_API_KEY: 'test-only',
    NEXON_RETRY_LIMIT: '1',
    NEXON_REQUEST_TIMEOUT_MS: '1000',
    GROWTH_BACKFILL_BATCH_SIZE: '50',
    GROWTH_PROFILE_CONCURRENCY: '1',
  };
  vi.useFakeTimers({ toFake: ['Date'] });
  // 2025-10-18 03:00 TST: 2025-10-17 is the newest available history date.
  vi.setSystemTime('2025-10-17T19:00:00.000Z');
});

afterEach(() => {
  local.sqlite.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('persistent growth tracking', () => {
  it('uses the 02:00 TST boundary for the newest historical target', () => {
    expect(latestAvailableGrowthDate(new Date('2025-10-17T17:59:59Z'))).toBe('2025-10-16');
    expect(latestAvailableGrowthDate(new Date('2025-10-17T18:00:00Z'))).toBe('2025-10-17');
  });

  it('advances explicit empty dates, stores official liberation, and completes daily dojang', async () => {
    await createGrowthProfile(env.DB, OCID, '2025-10-17');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      const date = url.searchParams.get('date')!;
      if (url.pathname.endsWith('/character/basic')) {
        if (date === '2025-10-15') {
          return Response.json({
            date: `${date}T00:00+08:00`, character_name: null, world_name: null,
            character_class: null, character_level: null, character_exp: null,
            character_exp_rate: null, character_guild_name: null, liberation_quest_clear: null,
          });
        }
        if (date === '2025-10-16') {
          return Response.json({ error: { name: 'OPENAPI00003', message: 'invalid identifier' } }, { status: 400 });
        }
        return Response.json(basic(date, {
          character_exp: 1500,
          character_exp_rate: '15.000',
        }));
      }
      if (url.pathname.endsWith('/character/dojang')) {
        return Response.json({
          date: `${date}T00:00+08:00`, dojang_best_floor: 0,
          dojang_best_time: 0, date_dojang_record: null,
        });
      }
      throw new Error(`Unexpected ${url.pathname}`);
    }));

    const basicRun = await backfillGrowthBatch(env);
    expect(basicRun).toMatchObject({ processed: 1, requests: 3, retry: 0, failed: 0 });
    const generating = await getGrowthStatus(env.DB, OCID);
    expect(generating).toMatchObject({ tracked: true, lastSyncedDate: null });

    const dojangRun = await backfillGrowthBatch(env);
    expect(dojangRun).toMatchObject({ processed: 1, completed: 1, requests: 1 });
    const complete = await getGrowthStatus(env.DB, OCID);
    expect(complete).toMatchObject({
      tracked: true,
      historyStartDate: '2025-10-17',
      lastSyncedDate: '2025-10-17',
      status: 'completed',
    });
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_snapshots WHERE ocid=?`).get(OCID)?.count)
      .toBe(1);
    expect(local.sqlite.prepare(`SELECT liberation_status FROM growth_snapshots WHERE snapshot_date='2025-10-17'`).get()?.liberation_status)
      .toBe('1');
  });

  it('automatically requeues completed profiles on the next target date without a browser request', async () => {
    await createGrowthProfile(env.DB, OCID, '2025-10-17');
    local.sqlite.prepare(`
      UPDATE growth_profiles SET status='completed', phase='dojang', dojang_mode='no_record',
        basic_last_synced_date='2025-10-17', dojang_last_synced_date='2025-10-17',
        last_synced_date='2025-10-17', completed_at='2025-10-17T19:00:00.000Z'
      WHERE ocid=?
    `).run(OCID);
    vi.setSystemTime('2025-10-19T19:00:00.000Z');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      const date = url.searchParams.get('date')!;
      if (url.pathname.endsWith('/character/basic')) return Response.json(basic(date));
      return Response.json({ date, dojang_best_floor: 0, dojang_best_time: 0, date_dojang_record: null });
    }));

    const basicRun = await backfillGrowthBatch(env);
    expect(basicRun).toMatchObject({ processed: 1, requests: 2 });
    const dojangRun = await backfillGrowthBatch(env);
    expect(dojangRun).toMatchObject({ processed: 1, completed: 1, requests: 2 });
    expect((await getGrowthStatus(env.DB, OCID)).lastSyncedDate).toBe('2025-10-19');

    vi.mocked(fetch).mockClear();
    const noWork = await backfillGrowthBatch(env);
    expect(noWork).toMatchObject({ processed: 0, requests: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('derives stats and events while marking cross-level EXP gain as pending', async () => {
    await createGrowthProfile(env.DB, OCID, '2025-10-18');
    const insert = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, guild_name,
        liberation_status, dojang_best_floor, dojang_best_time,
        dojang_record_date, dojang_state, fetched_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'now', 'now')
    `);
    insert.run(OCID, '2025-10-16', '舊名', '艾麗亞', '卡蒂娜', 271, 1000, 10, '', '0', 50, 100, '2025-10-16', 'available');
    insert.run(OCID, '2025-10-17', '新名', '艾麗亞', '卡蒂娜', 271, 1600, 16, '公會', '1', 50, 90, '2025-10-17', 'available');
    insert.run(OCID, '2025-10-18', '新名', '普力特', '卡蒂娜(轉職)', 272, 50, 1, '公會', '1', 51, 200, '2025-10-18', 'available');
    local.sqlite.prepare(`
      UPDATE growth_profiles SET history_start_date='2025-10-16', last_synced_date='2025-10-18',
        basic_last_synced_date='2025-10-18', dojang_last_synced_date='2025-10-18', status='completed'
      WHERE ocid=?
    `).run(OCID);

    const history = await getGrowthHistory(env.DB, OCID, '2025-10-16', '2025-10-18');
    expect(history?.days[1]).toMatchObject({ expGain: '600', expPending: false, active: true });
    expect(history?.days[2]).toMatchObject({ expGain: '0', expPending: true, active: false });
    expect(history?.stats).toMatchObject({ activeDays: 1, longestStreak: 1, levelGain: 1 });
    expect(history?.stats.bestDay).toEqual({ date: '2025-10-17', expGain: '600' });
    expect(history?.events.map((item) => item.type)).toEqual([
      'name', 'guild', 'liberation', 'dojang', 'level', 'class', 'world', 'dojang',
    ]);
    expect(history?.exactCrossLevelExpGain).toBe(false);
  });
});
