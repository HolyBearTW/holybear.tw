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
const SECOND_OCID = 'b3e399217d603631033dd65ebaa08275';
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
    GROWTH_DATE_CONCURRENCY: '4',
    GROWTH_MAX_BATCHES_PER_INVOCATION: '1',
    GROWTH_INVOCATION_BUDGET_MS: '45000',
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
    expect(generating).toMatchObject({ tracked: true, lastSyncedDate: null, progress: 50 });

    const dojangRun = await backfillGrowthBatch(env);
    expect(dojangRun).toMatchObject({ processed: 1, completed: 1, requests: 1 });
    const complete = await getGrowthStatus(env.DB, OCID);
    expect(complete).toMatchObject({
      tracked: true,
      historyStartDate: '2025-10-17',
      lastSyncedDate: '2025-10-17',
      status: 'completed',
      progress: 100,
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

  it('rotates pending profiles after each bounded batch', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    await createGrowthProfile(env.DB, OCID, '2025-10-15');
    await createGrowthProfile(env.DB, SECOND_OCID, '2025-10-15');
    vi.setSystemTime('2025-10-17T19:00:01.000Z');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      return Response.json(basic(url.searchParams.get('date') || '2025-10-15'));
    }));

    expect(await backfillGrowthBatch(env)).toMatchObject({ processed: 1, requests: 1 });
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(OCID))
      .toMatchObject({ basic_last_synced_date: '2025-10-15' });
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(SECOND_OCID))
      .toMatchObject({ basic_last_synced_date: null });

    vi.setSystemTime('2025-10-17T19:00:02.000Z');
    expect(await backfillGrowthBatch(env)).toMatchObject({ processed: 1, requests: 1 });
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(SECOND_OCID))
      .toMatchObject({ basic_last_synced_date: '2025-10-15' });
  });

  it('allows only one Growth lease owner when consumers overlap', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    await createGrowthProfile(env.DB, OCID, '2025-10-15');
    let releaseFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { releaseFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);

    const first = backfillGrowthBatch(env);
    while (fetchMock.mock.calls.length === 0) await Promise.resolve();
    const second = await backfillGrowthBatch(env);
    expect(second).toMatchObject({ processed: 0, requests: 0 });
    releaseFetch?.(Response.json(basic('2025-10-15')));
    expect(await first).toMatchObject({ processed: 1, requests: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('finishes multiple bounded checkpoints for one profile in one invocation', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '2';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '12';
    await createGrowthProfile(env.DB, OCID, '2025-10-20');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      const date = url.searchParams.get('date')!;
      if (url.pathname.endsWith('/character/basic')) return Response.json(basic(date));
      return Response.json({ date, dojang_best_floor: 0, dojang_best_time: 0, date_dojang_record: null });
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ processed: 6, completed: 1, requests: 12 });
    expect(run.instrumentation).toMatchObject({ stoppedBy: 'queue_empty' });
    expect(run.instrumentation.basic.batches).toBe(3);
    expect(run.instrumentation.dojang.batches).toBe(3);
    expect(await getGrowthStatus(env.DB, OCID)).toMatchObject({ status: 'completed', progress: 100 });
  });

  it('round-robins two pending profiles across repeated checkpoints', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '4';
    await createGrowthProfile(env.DB, OCID, '2025-10-17');
    await createGrowthProfile(env.DB, SECOND_OCID, '2025-10-17');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      return Response.json(basic(date));
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ processed: 4, requests: 4 });
    for (const ocid of [OCID, SECOND_OCID]) {
      expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(ocid))
        .toMatchObject({ basic_last_synced_date: '2025-10-16' });
    }
  });

  it('gives five pending profiles one checkpoint before repeating any profile', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '5';
    const ocids = Array.from({ length: 5 }, (_, index) => `${index + 1}`.repeat(32));
    for (const ocid of ocids) await createGrowthProfile(env.DB, ocid, '2025-10-15');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      return Response.json(basic(date));
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ processed: 5, requests: 5 });
    for (const ocid of ocids) {
      expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(ocid))
        .toMatchObject({ basic_last_synced_date: '2025-10-15' });
    }
    expect(new Set(run.results.map((result) => (result as { ocid: string }).ocid)).size).toBe(5);
  });

  it('stops after a completed checkpoint when the invocation wall budget is exhausted', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '12';
    env.GROWTH_INVOCATION_BUDGET_MS = '5000';
    await createGrowthProfile(env.DB, OCID, '2025-10-17');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      vi.setSystemTime('2025-10-17T19:00:06.000Z');
      const date = new URL(input).searchParams.get('date')!;
      return Response.json(basic(date));
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ processed: 1, requests: 1 });
    expect(run.instrumentation.stoppedBy).toBe('wall_budget');
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(OCID))
      .toMatchObject({ basic_last_synced_date: '2025-10-15' });
  });

  it('keeps multi-batch invocations exclusive across overlapping consumers', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '12';
    vi.setSystemTime('2025-10-15T19:00:00.000Z');
    await createGrowthProfile(env.DB, OCID, '2025-10-15');
    let releaseFirstFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((input: string) => {
      const url = new URL(input);
      const date = url.searchParams.get('date')!;
      if (fetchMock.mock.calls.length === 1) {
        return new Promise<Response>((resolve) => { releaseFirstFetch = resolve; });
      }
      return Promise.resolve(Response.json({
        date, dojang_best_floor: 0, dojang_best_time: 0, date_dojang_record: null,
      }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const primary = backfillGrowthBatch(env);
    while (fetchMock.mock.calls.length === 0) await Promise.resolve();
    const overlap = await backfillGrowthBatch(env);
    expect(overlap).toMatchObject({ processed: 0, requests: 0 });
    releaseFirstFetch?.(Response.json(basic('2025-10-15')));
    expect(await primary).toMatchObject({ processed: 2, completed: 1, requests: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('bounds per-date concurrency while keeping the checkpoint ordered', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '8';
    env.GROWTH_DATE_CONCURRENCY = '4';
    await createGrowthProfile(env.DB, OCID, '2025-10-22');
    let active = 0;
    let maximumActive = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      const date = new URL(input).searchParams.get('date')!;
      return Response.json(basic(date));
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ processed: 1, requests: 8 });
    expect(maximumActive).toBe(4);
    expect(await getGrowthStatus(env.DB, OCID)).toMatchObject({
      status: 'pending', currentProcessingDate: '2025-10-22', job: { phase: 'dojang' },
    });
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(OCID))
      .toMatchObject({ basic_last_synced_date: '2025-10-22' });
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
    expect(history?.events.filter((item) => item.type === 'dojang')).toEqual([
      expect.objectContaining({
        date: '2025-10-17',
        from: '100秒',
        to: '90秒',
        dojang: { beforeFloor: 50, beforeTime: 100, afterFloor: 50, afterTime: 90 },
      }),
      expect.objectContaining({
        date: '2025-10-18',
        from: '50F',
        to: '51F',
        dojang: { beforeFloor: 50, beforeTime: 90, afterFloor: 51, afterTime: 200 },
      }),
    ]);
    expect(history?.exactCrossLevelExpGain).toBe(false);
  });

  it('does not derive fake dojang events from null, zero, or invalid records', async () => {
    await createGrowthProfile(env.DB, OCID, '2025-10-18');
    const insert = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, guild_name,
        liberation_status, dojang_best_floor, dojang_best_time,
        dojang_record_date, dojang_state, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '卡蒂娜', 271, 1000, 10, '', '0', ?, ?, NULL, ?, 'now', 'now')
    `);
    insert.run(OCID, '2025-10-15', null, null, 'not_collected');
    insert.run(OCID, '2025-10-16', 0, 0, 'no_record');
    insert.run(OCID, '2025-10-17', 100, 701, 'available');
    insert.run(OCID, '2025-10-18', 100, 0, 'available');

    const history = await getGrowthHistory(env.DB, OCID, '2025-10-15', '2025-10-18');
    expect(history?.events.filter((item) => item.type === 'dojang')).toEqual([]);
  });

  it('preserves liberation stages, ignores equal stages, and skips missing-stage transitions', async () => {
    await createGrowthProfile(env.DB, OCID, '2025-10-19');
    const insert = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, guild_name,
        liberation_status, dojang_state, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '卡蒂娜', 271, 1000, 10, '', ?, 'not_collected', 'now', 'now')
    `);
    insert.run(OCID, '2025-10-15', null);
    insert.run(OCID, '2025-10-16', '1');
    insert.run(OCID, '2025-10-17', '1');
    insert.run(OCID, '2025-10-18', '2');
    insert.run(OCID, '2025-10-19', 'future-stage');

    const history = await getGrowthHistory(env.DB, OCID, '2025-10-15', '2025-10-19');
    expect(history?.events.filter((item) => item.type === 'liberation')).toEqual([
      expect.objectContaining({ date: '2025-10-18', from: '1', to: '2' }),
      expect.objectContaining({ date: '2025-10-19', from: '2', to: 'future-stage' }),
    ]);
  });
});
