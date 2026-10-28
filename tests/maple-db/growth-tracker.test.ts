import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backfillGrowthBatch,
  createGrowthProfile,
  getGrowthHistory,
  getGrowthStatus,
  latestAvailableGrowthDate,
} from '../../functions/_shared/growth-tracker';
import {
  backfillGrowthDestinyHistoryBatch,
  backfillGrowthEquipmentBatch,
} from '../../functions/_shared/growth-equipment';
import type { Env } from '../../functions/_shared/env';
import { getRuntimeConfig } from '../../functions/_shared/runtime-config';
import { findCharacterByOcid, invalidateCharacterStatement, upsertCanonicalNexonCharacter } from '../../functions/_shared/character-repository';
import { getCharacterCombatPowerRank } from '../../functions/_shared/ranking-repository';
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
  it('reports equipment backfill separately from the existing growth profile status', async () => {
    await createGrowthProfile(env.DB, OCID, '2026-08-10');
    expect((await getGrowthStatus(env.DB, OCID)).equipmentSync).toMatchObject({
      soul: { status: 'waiting', progress: 0, targetDate: null },
      astra: { status: 'waiting', progress: 0, targetDate: null },
    });
    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', history_start_date='2026-07-15',
      basic_last_synced_date='2026-08-10', last_synced_date='2026-08-10' WHERE ocid=?`).run(OCID);
    local.sqlite.prepare(`INSERT INTO growth_soul_tracking
      (ocid, last_synced_date, claim_until, updated_at) VALUES (?, '2026-08-04', '2999-01-01', 'now')`).run(OCID);
    local.sqlite.prepare(`INSERT INTO growth_astra_tracking
      (ocid, last_synced_date, retry_at, updated_at) VALUES (?, '2026-07-20', '2999-01-01', 'now')`).run(OCID);
    const pending = await getGrowthStatus(env.DB, OCID);
    expect(pending.status).toBe('completed');
    expect(pending.equipmentSync).toMatchObject({
      soul: { status: 'running', lastSyncedDate: '2026-08-04', targetDate: '2026-08-10' },
      astra: { status: 'retry', lastSyncedDate: '2026-07-20', targetDate: '2026-08-10', nextRetryAt: '2999-01-01' },
    });
    expect(pending.equipmentSync?.soul.progress).toBeGreaterThan(0);
    expect(pending.equipmentSync?.soul.progress).toBeLessThan(100);
    local.sqlite.prepare(`UPDATE growth_soul_tracking SET claim_until=NULL, last_synced_date='2026-08-10'`).run();
    local.sqlite.prepare(`UPDATE growth_astra_tracking SET retry_at=NULL, last_synced_date='2026-08-10'`).run();
    expect((await getGrowthStatus(env.DB, OCID)).equipmentSync).toMatchObject({
      soul: { status: 'completed', progress: 100 }, astra: { status: 'completed', progress: 100 },
    });
  });

  const seedDailyIdentity = async () => {
    await upsertCanonicalNexonCharacter(env.DB, {
      ocid: OCID, characterName: '舊名字', worldName: '艾麗亞', jobName: '卡蒂娜',
      level: 271, combatPower: 100, characterImage: 'image', guildName: null,
      requestedAt: '2025-10-17T18:00:00.000Z', observedAt: '2025-10-17T18:00:00.000Z',
    }, [{ source: 'nexon' }]);
    await createGrowthProfile(env.DB, OCID, '2025-10-17');
    local.sqlite.prepare(`UPDATE growth_profiles SET character_name='舊名字', status='completed',
      last_synced_date='2025-10-16', basic_last_synced_date='2025-10-16', dojang_last_synced_date='2025-10-16'
      WHERE ocid=?`).run(OCID);
  };

  it('stops a missing current identity permanently instead of rescheduling empty reports every day', async () => {
    await seedDailyIdentity();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { name: 'OPENAPI00003' } }, { status: 400 })));
    expect(await backfillGrowthBatch(env)).toMatchObject({ processed: 1, failed: 1, retry: 0, requests: 2 });
    expect((await getGrowthStatus(env.DB, OCID)).job).toMatchObject({ status: 'failed', nextRetryAt: null });
    expect((await findCharacterByOcid(env.DB, OCID))?.isActive).toBe(false);
    expect(await getCharacterCombatPowerRank(env.DB, '舊名字')).toBeNull();
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM growth_snapshots').get()?.n).toBe(0);
    const stopped = local.sqlite.prepare('SELECT updated_at FROM growth_profiles').get()?.updated_at;
    vi.mocked(fetch).mockClear();
    vi.setSystemTime('2025-10-19T19:00:00.000Z');
    expect(await backfillGrowthBatch(env)).toMatchObject({ processed: 0, requests: 0 });
    expect(fetch).not.toHaveBeenCalled();
    expect(local.sqlite.prepare('SELECT updated_at FROM growth_profiles').get()?.updated_at).toBe(stopped);
  });

  it('confirms a current rename before stopping the old profile and excludes its outdated ranking row', async () => {
    await seedDailyIdentity();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      return Response.json(basic(url.searchParams.get('date') || '2025-10-17', { character_name: '新名字' }));
    }));
    expect(await backfillGrowthBatch(env)).toMatchObject({ processed: 1, failed: 1, retry: 0, requests: 2 });
    expect((await getGrowthStatus(env.DB, OCID)).job?.error).toContain('角色已改名為「新名字」');
    expect(await getCharacterCombatPowerRank(env.DB, '舊名字')).toBeNull();
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM growth_snapshots').get()?.n).toBe(0);
  });

  it('keeps temporary current-identity failures retryable and leaves the character ranked', async () => {
    await seedDailyIdentity();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      return url.searchParams.has('date')
        ? Response.json({ error: { name: 'OPENAPI00003' } }, { status: 400 })
        : new Response('temporary', { status: 503 });
    }));
    expect(await backfillGrowthBatch(env)).toMatchObject({ processed: 1, retry: 1, failed: 0, requests: 2 });
    expect((await getGrowthStatus(env.DB, OCID)).job).toMatchObject({ status: 'pending' });
    expect((await findCharacterByOcid(env.DB, OCID))?.isActive).toBe(true);
    expect(await getCharacterCombatPowerRank(env.DB, '舊名字')).not.toBeNull();
    vi.setSystemTime('2025-10-17T19:01:00.000Z');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(basic('2025-10-17', { character_name: '舊名字' }))));
    expect(await backfillGrowthBatch(env)).toMatchObject({ failed: 0, retry: 0 });
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM growth_snapshots').get()?.n).toBe(1);
  });

  it('stops an obsolete name even when its old OCID still returns readable basic data', async () => {
    await seedDailyIdentity();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/id')) {
        return Response.json({ error: { name: 'OPENAPI00004' } }, { status: 400 });
      }
      if (url.searchParams.has('date')) {
        return Response.json({ error: { name: 'OPENAPI00003' } }, { status: 400 });
      }
      return Response.json(basic('2025-10-17', { character_name: '舊名字' }));
    }));
    expect(await backfillGrowthBatch(env)).toMatchObject({ failed: 1, requests: 3 });
    expect((await findCharacterByOcid(env.DB, OCID))?.isActive).toBe(false);
  });

  it('does not confuse historical pre-creation dates with an unavailable current character', async () => {
    await createGrowthProfile(env.DB, OCID, '2025-10-17');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/id')) return Response.json({ ocid: OCID });
      if (!url.searchParams.has('date')) return Response.json(basic('2025-10-17'));
      return Response.json({ error: { name: 'OPENAPI00003' } }, { status: 400 });
    }));
    expect(await backfillGrowthBatch(env)).toMatchObject({ processed: 1, failed: 0, retry: 0, requests: 5 });
    expect((await getGrowthStatus(env.DB, OCID)).job?.status).toBe('pending');
  });

  it('blocks late snapshot writes after another request invalidates an in-flight profile', async () => {
    await seedDailyIdentity();
    let release: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { release = resolve; })));
    const run = backfillGrowthBatch(env);
    while (!release) await Promise.resolve();
    await invalidateCharacterStatement(env.DB, OCID, '舊名字', '2025-10-17T19:00:00.000Z', '已停止更新').run();
    release(Response.json(basic('2025-10-17', { character_name: '舊名字' })));
    await run;
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM growth_snapshots').get()?.n).toBe(0);
    expect((await getGrowthStatus(env.DB, OCID)).job?.status).toBe('failed');
  });

  it('accepts the Growth throughput clamps without changing date concurrency', () => {
    const config = getRuntimeConfig({
      ...env,
      GROWTH_DATE_CONCURRENCY: '99',
      GROWTH_MAX_BATCHES_PER_INVOCATION: '999',
      GROWTH_PROFILE_CONCURRENCY: '999',
      GROWTH_NEW_PROFILE_24H_LIMIT: '99999',
      GROWTH_PENDING_PROFILE_LIMIT: '99999',
    });
    expect(config.growthDateConcurrency).toBe(4);
    expect(config.growthMaxBatchesPerInvocation).toBe(96);
    expect(config.growthProfileConcurrency).toBe(8);
    expect(config.growthNewProfile24hLimit).toBe(10_000);
    expect(config.growthPendingProfileLimit).toBe(10_000);
  });

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

  it('reselects the same first-generation profile after each bounded batch', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    await createGrowthProfile(env.DB, OCID, '2025-10-20');
    await createGrowthProfile(env.DB, SECOND_OCID, '2025-10-20');
    local.sqlite.prepare(`UPDATE growth_profiles SET created_at=? WHERE ocid=?`)
      .run('2025-10-17T19:00:00.000Z', OCID);
    local.sqlite.prepare(`UPDATE growth_profiles SET created_at=? WHERE ocid=?`)
      .run('2025-10-17T19:00:01.000Z', SECOND_OCID);
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
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(OCID))
      .toMatchObject({ basic_last_synced_date: '2025-10-16' });
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(SECOND_OCID))
      .toMatchObject({ basic_last_synced_date: null });
  });

  it('allows only one Growth lease owner when consumers overlap', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_PROFILE_CONCURRENCY = '4';
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

  it('processes up to four different profiles concurrently', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '4';
    env.GROWTH_PROFILE_CONCURRENCY = '4';
    const ocids = [
      'd'.repeat(31) + '0',
      'd'.repeat(31) + '1',
      'd'.repeat(31) + '2',
      'd'.repeat(31) + '3',
    ];
    await Promise.all(ocids.map((ocid) => createGrowthProfile(env.DB, ocid, '2025-10-15')));
    let active = 0;
    let maximumActive = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      const url = new URL(input);
      return Response.json(basic(url.searchParams.get('date') || '2025-10-15'));
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ claimed: 4, processed: 4, requests: 4 });
    expect(maximumActive).toBe(4);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles WHERE basic_last_synced_date='2025-10-15'`).get()?.count)
      .toBe(4);
  });

  it('applies one shared batch budget across all concurrent profiles', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '6';
    env.GROWTH_PROFILE_CONCURRENCY = '4';
    const ocids = [
      'e'.repeat(31) + '0',
      'e'.repeat(31) + '1',
      'e'.repeat(31) + '2',
      'e'.repeat(31) + '3',
    ];
    await Promise.all(ocids.map((ocid) => createGrowthProfile(env.DB, ocid, '2025-10-20')));
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date') || '2025-10-15';
      return Response.json(basic(date));
    }));

    const run = await backfillGrowthBatch(env);
    expect(run.processed).toBe(6);
    expect(run.instrumentation.basic.batches).toBe(6);
    expect(run.instrumentation.dojang.batches).toBe(0);
  });

  it('lets other profiles advance when one concurrent profile is rate limited', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '4';
    env.GROWTH_PROFILE_CONCURRENCY = '4';
    const limited = 'f'.repeat(31) + '0';
    const others = ['1', '2', '3'].map((suffix) => 'f'.repeat(31) + suffix);
    await Promise.all([limited, ...others].map((ocid) => createGrowthProfile(env.DB, ocid, '2025-10-15')));
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.searchParams.get('ocid') === limited) {
        return new Response(JSON.stringify({ error: { name: 'OPENAPI00009', message: 'rate limited' } }), {
          status: 429,
          headers: { 'retry-after': '0' },
        });
      }
      return Response.json(basic(url.searchParams.get('date') || '2025-10-15'));
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ processed: 4, retry: 1, requests: 4 });
    expect(run.instrumentation.basic.errors[429]).toBe(1);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles WHERE basic_last_synced_date='2025-10-15'`).get()?.count)
      .toBe(3);
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

  it('keeps the oldest first-generation profile ahead across repeated checkpoints', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '4';
    await createGrowthProfile(env.DB, OCID, '2025-10-20');
    await createGrowthProfile(env.DB, SECOND_OCID, '2025-10-20');
    local.sqlite.prepare(`UPDATE growth_profiles SET created_at=? WHERE ocid=?`)
      .run('2025-10-17T19:00:00.000Z', OCID);
    local.sqlite.prepare(`UPDATE growth_profiles SET created_at=? WHERE ocid=?`)
      .run('2025-10-17T19:00:01.000Z', SECOND_OCID);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      return Response.json(basic(date));
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ processed: 4, requests: 4 });
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(OCID))
      .toMatchObject({ basic_last_synced_date: '2025-10-18' });
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(SECOND_OCID))
      .toMatchObject({ basic_last_synced_date: null });
  });

  it('prioritizes first-generation work over an existing daily profile', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    const dailyOcid = `${'c'.repeat(31)}1`;
    await createGrowthProfile(env.DB, dailyOcid, '2025-10-20');
    await createGrowthProfile(env.DB, OCID, '2025-10-20');
    local.sqlite.prepare(`
      UPDATE growth_profiles
      SET status='pending', phase='basic', last_synced_date='2025-10-15',
        basic_last_synced_date='2025-10-15', current_processing_date='2025-10-16',
        created_at='2025-10-17T19:00:00.000Z', updated_at='2025-10-17T19:00:00.000Z'
      WHERE ocid=?
    `).run(dailyOcid);
    local.sqlite.prepare(`UPDATE growth_profiles SET created_at=? WHERE ocid=?`)
      .run('2025-10-17T19:00:01.000Z', OCID);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      return Response.json(basic(date));
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ processed: 1, requests: 1 });
    expect(run.results).toHaveLength(1);
    expect((run.results[0] as { ocid: string }).ocid).toBe(OCID);
    expect(local.sqlite.prepare(`SELECT basic_last_synced_date FROM growth_profiles WHERE ocid=?`).get(OCID))
      .toMatchObject({ basic_last_synced_date: '2025-10-15' });
    expect(local.sqlite.prepare(`SELECT current_processing_date FROM growth_profiles WHERE ocid=?`).get(dailyOcid))
      .toMatchObject({ current_processing_date: '2025-10-16' });
  });

  it('reserves a bounded daily slot during a large initial backlog', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '16';
    env.GROWTH_PROFILE_CONCURRENCY = '4';
    const initialOcids = Array.from({ length: 20 }, (_, index) => (
      'a'.repeat(30) + index.toString(16).padStart(2, '0')
    ));
    const dailyOcid = 'b'.repeat(31) + '1';
    await Promise.all([...initialOcids, dailyOcid].map((ocid) => createGrowthProfile(env.DB, ocid, '2025-10-20')));
    local.sqlite.prepare(`
      UPDATE growth_profiles SET status='pending', phase='basic', last_synced_date='2025-10-15',
        basic_last_synced_date='2025-10-15', current_processing_date='2025-10-16'
      WHERE ocid=?
    `).run(dailyOcid);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      return Response.json(basic(url.searchParams.get('date') || '2025-10-15'));
    }));

    await backfillGrowthBatch(env);
    expect(vi.mocked(fetch).mock.calls.some(([input]) => new URL(String(input)).searchParams.get('ocid') === dailyOcid))
      .toBe(true);
  });

  it('does not run a retry before its retry time, then runs it when due', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    await createGrowthProfile(env.DB, OCID, '2025-10-20');
    local.sqlite.prepare(`UPDATE growth_profiles SET status='retry', next_retry_at=? WHERE ocid=?`)
      .run('2025-10-17T19:01:00.000Z', OCID);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      return Response.json(basic(date));
    }));

    expect(await backfillGrowthBatch(env)).toMatchObject({ processed: 0, requests: 0 });
    vi.setSystemTime('2025-10-17T19:01:00.000Z');
    expect(await backfillGrowthBatch(env)).toMatchObject({ processed: 1, requests: 1 });
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

  it('completes daily profiles in basic+dojang pairs instead of leaving all profiles in dojang phase', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '20';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '2';
    env.GROWTH_PROFILE_CONCURRENCY = '1';
    await createGrowthProfile(env.DB, OCID, '2025-10-17');
    await createGrowthProfile(env.DB, SECOND_OCID, '2025-10-17');
    for (const id of [OCID, SECOND_OCID]) {
      local.sqlite.prepare(`
        UPDATE growth_profiles
        SET status='pending', phase='basic', last_synced_date='2025-10-16',
          basic_last_synced_date='2025-10-16', dojang_last_synced_date='2025-10-16',
          current_processing_date='2025-10-17', updated_at='2025-10-17T18:00:00.000Z'
        WHERE ocid=?
      `).run(id);
    }
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      const date = url.searchParams.get('date') || '2025-10-17';
      if (url.pathname.endsWith('/character/basic')) return Response.json(basic(date));
      return Response.json({ date, dojang_best_floor: 0, dojang_best_time: 0, date_dojang_record: null });
    }));

    const run = await backfillGrowthBatch(env);
    expect(run).toMatchObject({ processed: 2, completed: 1, requests: 2 });
    expect(local.sqlite.prepare(`SELECT status FROM growth_profiles WHERE ocid=?`).get(OCID))
      .toMatchObject({ status: 'completed' });
  });

  it('batches multiple equipment profiles concurrently and skips redundant Astra-only dates after observation', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '10';
    env.GROWTH_EQUIPMENT_DATE_CONCURRENCY = '1';
    env.GROWTH_EQUIPMENT_PROFILE_CONCURRENCY = '4';
    await createGrowthProfile(env.DB, OCID, '2026-08-05');
    await createGrowthProfile(env.DB, SECOND_OCID, '2026-08-05');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 275, 0, 0, 'now', 'now')
    `);
    for (const date of ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05']) {
      insertSnapshot.run(OCID, date);
    }
    insertSnapshot.run(SECOND_OCID, '2026-08-05');

    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', basic_last_synced_date='2026-08-05' WHERE ocid IN (?, ?)`).run(OCID, SECOND_OCID);
    // OCID already has soul synced through 2026-08-05, only Astra is pending from 2026-08-01.
    local.sqlite.prepare(`INSERT INTO growth_soul_tracking (ocid, last_synced_date, highest_grade, updated_at) VALUES (?, '2026-08-05', 7, 'now')`).run(OCID);
    local.sqlite.prepare(`INSERT INTO growth_astra_tracking (ocid, last_synced_date, previous_item_name, has_astra, updated_at) VALUES (?, '2026-07-31', '舊副武', 0, 'now')`).run(OCID);
    // SECOND_OCID has only 1 daily date pending for both soul and astra.
    local.sqlite.prepare(`INSERT INTO growth_soul_tracking (ocid, last_synced_date, highest_grade, updated_at) VALUES (?, '2026-08-04', 5, 'now')`).run(SECOND_OCID);
    local.sqlite.prepare(`INSERT INTO growth_astra_tracking (ocid, last_synced_date, previous_item_name, has_astra, updated_at) VALUES (?, '2026-08-04', '舊副武B', 0, 'now')`).run(SECOND_OCID);

    const requestedUrls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      requestedUrls.push(String(input));
      const url = new URL(input);
      const targetOcid = url.searchParams.get('ocid');
      const date = url.searchParams.get('date');
      if (targetOcid === OCID && date === '2026-08-02') {
        return Response.json({
          item_equipment: [{ item_equipment_slot: '輔助武器', item_name: '阿斯特拉寶珠' }],
        });
      }
      return Response.json({
        item_equipment: [
          { item_equipment_slot: '武器', item_name: '創世武器', soul_weapon_grade: '6' },
          { item_equipment_slot: '輔助武器', item_name: '舊副武' },
        ],
      });
    }));

    const result = await backfillGrowthEquipmentBatch(env);
    expect(result).toMatchObject({
      processedProfiles: 2,
      completedProfiles: 2,
    });
    // OCID only needed 2026-08-01 and 2026-08-02 (observed Astra on 08-02, so 08-03..08-05 were skipped),
    // plus 1 request for SECOND_OCID on 2026-08-05 = 3 requests total instead of 6.
    expect(result.requests).toBe(3);
    expect(requestedUrls).toHaveLength(3);
    expect(local.sqlite.prepare(`SELECT last_synced_date, has_astra FROM growth_astra_tracking WHERE ocid=?`).get(OCID))
      .toMatchObject({ last_synced_date: '2026-08-05', has_astra: 1 });
    expect(local.sqlite.prepare(`SELECT last_synced_date, highest_grade FROM growth_soul_tracking WHERE ocid=?`).get(SECOND_OCID))
      .toMatchObject({ last_synced_date: '2026-08-05', highest_grade: 6 });
  });

  it('isolates per-profile API and D1.batch failures in multi-profile equipment sync so sibling profiles still commit', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '10';
    env.GROWTH_EQUIPMENT_DATE_CONCURRENCY = '2';
    env.GROWTH_EQUIPMENT_PROFILE_CONCURRENCY = '4';
    await createGrowthProfile(env.DB, OCID, '2026-08-02');
    await createGrowthProfile(env.DB, SECOND_OCID, '2026-08-02');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 275, 0, 0, 'now', 'now')
    `);
    insertSnapshot.run(OCID, '2026-08-02');
    insertSnapshot.run(SECOND_OCID, '2026-08-02');
    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', basic_last_synced_date='2026-08-02' WHERE ocid IN (?, ?)`).run(OCID, SECOND_OCID);

    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      item_equipment: [
        { item_equipment_slot: '武器', item_name: '創世武器', soul_weapon_grade: '7' },
        { item_equipment_slot: '輔助武器', item_name: '阿斯特拉寶珠' },
      ],
    })));
    const originalBatch = env.DB.batch.bind(env.DB);
    let batchCallIndex = 0;
    const batchSpy = vi.spyOn(env.DB, 'batch').mockImplementation(async (statements) => {
      batchCallIndex += 1;
      // Calls 1 and 2 are the isolated claim batches for the two profiles;
      // Call 3 is the commit batch for the first profile.
      if (batchCallIndex === 3) {
        throw new Error('simulated D1 commit failure on first profile');
      }
      return originalBatch(statements);
    });

    const firstRun = await backfillGrowthEquipmentBatch(env);
    batchSpy.mockRestore();
    expect(firstRun).toMatchObject({
      processedProfiles: 1,
      completedProfiles: 1,
    });

    const soulRows = local.sqlite.prepare(`
      SELECT ocid, last_synced_date, claim_token, retry_at
      FROM growth_soul_tracking
      ORDER BY ocid
    `).all() as Array<{
      ocid: string;
      last_synced_date: string | null;
      claim_token: string | null;
      retry_at: string | null;
    }>;
    const failedRow = soulRows.find((r) => r.retry_at != null);
    const succeededRow = soulRows.find((r) => r.last_synced_date === '2026-08-02');
    expect(failedRow).toBeDefined();
    expect(failedRow?.claim_token).toBeNull();
    expect(succeededRow).toBeDefined();
    expect(succeededRow?.claim_token).toBeNull();
  });

  it('advances 0-snapshot profiles in equipment sync without issuing NEXON requests', async () => {
    await createGrowthProfile(env.DB, OCID, '2026-08-05');
    local.sqlite.prepare(`
      UPDATE growth_profiles
      SET status='completed', basic_last_synced_date='2026-08-05'
      WHERE ocid=?
    `).run(OCID);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await backfillGrowthEquipmentBatch(env);
    expect(result).toMatchObject({
      processedProfiles: 1,
      completedProfiles: 1,
      processedDates: 0,
      requests: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(local.sqlite.prepare(`SELECT last_synced_date, claim_token FROM growth_soul_tracking WHERE ocid=?`).get(OCID))
      .toMatchObject({ last_synced_date: '2026-08-05', claim_token: null });
    expect(local.sqlite.prepare(`SELECT last_synced_date, claim_token FROM growth_astra_tracking WHERE ocid=?`).get(OCID))
      .toMatchObject({ last_synced_date: '2026-08-05', claim_token: null });
  });

  it('respects active equipment claim leases and recovers expired leases', async () => {
    await createGrowthProfile(env.DB, OCID, '2026-08-02');
    local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at
      ) VALUES (?, '2026-08-02', '測試角色', '艾麗亞', '主教', 275, 0, 0, 'now', 'now')
    `).run(OCID);
    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', basic_last_synced_date='2026-08-02' WHERE ocid=?`).run(OCID);
    const futureLease = new Date(Date.now() + 120_000).toISOString();
    local.sqlite.prepare(`
      INSERT INTO growth_soul_tracking (ocid, claim_token, claim_until, updated_at)
      VALUES (?, 'other-worker', ?, 'now')
    `).run(OCID, futureLease);

    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ item_equipment: [] })));
    const blocked = await backfillGrowthEquipmentBatch(env);
    expect(blocked).toMatchObject({ processedProfiles: 0, processedDates: 0 });

    const expiredLease = new Date(Date.now() - 60_000).toISOString();
    local.sqlite.prepare(`UPDATE growth_soul_tracking SET claim_until=? WHERE ocid=?`).run(expiredLease, OCID);

    const recovered = await backfillGrowthEquipmentBatch(env);
    expect(recovered).toMatchObject({ processedProfiles: 1, completedProfiles: 1, processedDates: 1 });
  });

  it('enforces shared GrowthInvocationBudget across basic, dojang, and equipment sync including retries', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_MAX_BATCHES_PER_INVOCATION = '10';
    env.GROWTH_PROFILE_CONCURRENCY = '1';
    env.NEXON_RETRY_LIMIT = '2';
    await createGrowthProfile(env.DB, OCID, '2025-10-16');
    local.sqlite.prepare(`
      UPDATE growth_profiles
      SET scan_start_date='2025-10-16', current_processing_date='2025-10-16'
      WHERE ocid=?
    `).run(OCID);

    let attempts = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      attempts += 1;
      if (attempts === 1) {
        return new Response('temporary 503', { status: 503, headers: { 'retry-after': '0' } });
      }
      const url = new URL(input);
      const date = url.searchParams.get('date') || '2025-10-16';
      if (url.pathname.endsWith('/character/basic')) return Response.json(basic(date));
      if (url.pathname.endsWith('/character/dojang')) {
        return Response.json({ date, dojang_best_floor: 0, dojang_best_time: 0, date_dojang_record: null });
      }
      return Response.json({ item_equipment: [] });
    }));

    const budget = { usedRequests: 0, maxRequests: 2 };
    const basicResult = await backfillGrowthBatch(env, budget);
    expect(basicResult.processed).toBe(1);
    expect(budget.usedRequests).toBe(2);
    expect(basicResult.instrumentation.stoppedBy).toBe('request_budget');

    const equipResult = await backfillGrowthEquipmentBatch(env, budget);
    expect(equipResult).toMatchObject({ processedProfiles: 0, processedDates: 0, requests: 0 });
  });

  it('safely aborts in-flight retries and concurrent requests when GrowthInvocationBudget is exhausted without exceeding maxRequests', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '4';
    env.GROWTH_DATE_CONCURRENCY = '4';
    env.GROWTH_PROFILE_CONCURRENCY = '2';
    env.NEXON_RETRY_LIMIT = '3';
    await createGrowthProfile(env.DB, OCID, '2025-10-18');
    await createGrowthProfile(env.DB, SECOND_OCID, '2025-10-18');

    let actualFetchCalls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      actualFetchCalls += 1;
      return new Response('temporary 503', { status: 503, headers: { 'retry-after': '0' } });
    }));

    const budget = { usedRequests: 0, maxRequests: 3 };
    const result = await backfillGrowthBatch(env, budget);
    expect(budget.usedRequests).toBe(3);
    expect(actualFetchCalls).toBe(3);
    expect(result.instrumentation.stoppedBy).toBe('request_budget');

    // Profiles that hit budget exhaustion must be released to retry, never permanently failed
    const profiles = local.sqlite
      .prepare('SELECT ocid, status, claim_token, basic_last_synced_date FROM growth_profiles ORDER BY ocid')
      .all() as Array<{
        ocid: string;
        status: string;
        claim_token: string | null;
        basic_last_synced_date: string | null;
      }>;
    for (const p of profiles) {
      expect(p.claim_token).toBeNull();
      expect(p.basic_last_synced_date).toBeNull();
      expect(['pending', 'retry']).toContain(p.status);
    }
  });

  it('bounds equipment date queries by remaining GrowthInvocationBudget without prematurely marking the profile complete', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '20';
    env.GROWTH_EQUIPMENT_DATE_CONCURRENCY = '4';
    await createGrowthProfile(env.DB, OCID, '2026-08-05');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 275, 0, 0, 'now', 'now')
    `);
    for (const date of ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05']) {
      insertSnapshot.run(OCID, date);
    }
    local.sqlite.prepare(`
      UPDATE growth_profiles
      SET status='completed', basic_last_synced_date='2026-08-05', last_synced_date='2026-08-05'
      WHERE ocid=?
    `).run(OCID);

    let equipFetchCalls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      equipFetchCalls += 1;
      return Response.json({ item_equipment: [] });
    }));

    // Only 2 requests remain in the shared budget
    const budget = { usedRequests: 8, maxRequests: 10 };
    const equipRes = await backfillGrowthEquipmentBatch(env, budget);
    expect(equipFetchCalls).toBe(2);
    expect(budget.usedRequests).toBe(10);
    expect(equipRes).toMatchObject({
      processedProfiles: 1,
      completedProfiles: 0,
      processedDates: 2,
      requests: 2,
    });

    // Checkpoint must only advance to 2026-08-02 (the 2nd date), NOT jump to 2026-08-05
    const soulRow = local.sqlite
      .prepare('SELECT last_synced_date, claim_token FROM growth_soul_tracking WHERE ocid = ?')
      .get(OCID) as { last_synced_date: string | null; claim_token: string | null };
    expect(soulRow).toEqual({
      last_synced_date: '2026-08-02',
      claim_token: null,
    });
  });

  it('accurately accounts for 400 OPENAPI00003, retry success, retry exhaustion, and mid-batch budget abort in backfillGrowthEquipmentBatch', async () => {
    env.GROWTH_BACKFILL_BATCH_SIZE = '10';
    env.GROWTH_EQUIPMENT_DATE_CONCURRENCY = '1';
    env.NEXON_RETRY_LIMIT = '2';

    await createGrowthProfile(env.DB, OCID, '2026-08-03');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 275, 0, 0, 'now', 'now')
    `);
    for (const date of ['2026-08-01', '2026-08-02', '2026-08-03']) {
      insertSnapshot.run(OCID, date);
    }
    local.sqlite.prepare(`
      UPDATE growth_profiles
      SET status='completed', basic_last_synced_date='2026-08-03', last_synced_date='2026-08-03'
      WHERE ocid=?
    `).run(OCID);

    // Case 1: 400 OPENAPI00003 on 2026-08-01 + 503 retry then 200 on 2026-08-02 + budget abort before 2026-08-03
    // Budget has 3 remaining slots:
    // - 2026-08-01: 1 logical request, 1 HTTP attempt (400 OPENAPI00003) -> budget used = 1
    // - 2026-08-02: 1 logical request, 2 HTTP attempts (503 then 200) -> budget used = 3 (exhausted!)
    // - 2026-08-03: blocked before starting by budget -> 0 logical request, 0 HTTP attempt
    let attemptsFor0802 = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date');
      if (date === '2026-08-01') {
        return new Response(
          JSON.stringify({ error: { name: 'OPENAPI00003', message: 'invalid identifier' } }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        );
      }
      if (date === '2026-08-02') {
        attemptsFor0802 += 1;
        if (attemptsFor0802 === 1) {
          return new Response('temporary 503', { status: 503, headers: { 'retry-after': '0' } });
        }
        return Response.json({ item_equipment: [] });
      }
      return Response.json({ item_equipment: [] });
    }));

    const budgetCase1 = { usedRequests: 0, maxRequests: 3 };
    const resCase1 = await backfillGrowthEquipmentBatch(env, budgetCase1);
    expect(resCase1).toEqual({
      ocid: OCID,
      processedProfiles: 0,
      completedProfiles: 0,
      processedDates: 0,
      requests: 2, // 2 logical date queries started (2026-08-01 and 2026-08-02); 400 error is NOT lost as 0
      transportAttempts: 3, // 1 attempt for 08-01 + 2 attempts for 08-02
    });
    expect(budgetCase1.usedRequests).toBe(3);

    // Reset retry_at and test Case 2: 503 retry exhaustion (all retries fail)
    local.sqlite.prepare(`UPDATE growth_soul_tracking SET retry_at = NULL, last_synced_date = '2026-08-02' WHERE ocid = ?`).run(OCID);
    local.sqlite.prepare(`UPDATE growth_astra_tracking SET retry_at = NULL, last_synced_date = '2026-08-02' WHERE ocid = ?`).run(OCID);

    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response('persistent 503', { status: 503, headers: { 'retry-after': '0' } });
    }));

    const budgetCase2 = { usedRequests: 0, maxRequests: 10 };
    const resCase2 = await backfillGrowthEquipmentBatch(env, budgetCase2);
    expect(resCase2).toEqual({
      ocid: OCID,
      processedProfiles: 0,
      completedProfiles: 0,
      processedDates: 0,
      requests: 1, // 1 logical query started for 2026-08-03 (never undercounted as 0 even though it failed)
      transportAttempts: 2, // NEXON_RETRY_LIMIT = 2 attempts actually sent
    });
    expect(budgetCase2.usedRequests).toBe(2);

    const soulAfterExhaustion = local.sqlite
      .prepare('SELECT last_synced_date, claim_token, retry_at FROM growth_soul_tracking WHERE ocid = ?')
      .get(OCID) as { last_synced_date: string | null; claim_token: string | null; retry_at: string | null };
    expect(soulAfterExhaustion.last_synced_date).toBe('2026-08-02');
    expect(soulAfterExhaustion.claim_token).toBeNull();
    expect(soulAfterExhaustion.retry_at).toBeTruthy();
  });
  it('records soul weapon conversion, grade upgrades, and Astra acquisition events accurately', async () => {
    await createGrowthProfile(env.DB, OCID, '2026-08-03');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 275, 0, 0, 'now', 'now')
    `);
    for (const date of ['2026-07-28', '2026-07-30', '2026-08-01', '2026-08-03']) {
      insertSnapshot.run(OCID, date);
    }
    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', basic_last_synced_date='2026-08-03', last_synced_date='2026-08-03' WHERE ocid=?`).run(OCID);

    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date');
      if (date === '2026-07-28') {
        return Response.json({
          item_equipment: [
            { item_equipment_slot: '武器', item_name: '創世法杖', soul_name: '偉大的露希妲寶珠' },
            { item_equipment_slot: '輔助武器', item_name: '永恆魔道書' },
          ],
        });
      }
      if (date === '2026-07-30') {
        return Response.json({
          item_equipment: [
            { item_equipment_slot: '武器', item_name: '創世法杖', soul_weapon_grade: '第5階段' },
            { item_equipment_slot: '輔助武器', item_name: '永恆魔道書' },
          ],
        });
      }
      if (date === '2026-08-01') {
        return Response.json({
          item_equipment: [
            { item_equipment_slot: '武器', item_name: '創世法杖', soul_weapon_grade: '7' },
            { item_equipment_slot: '輔助武器', item_name: '阿斯特拉魔道書' },
          ],
        });
      }
      return Response.json({
        item_equipment: [
          { item_equipment_slot: '武器', item_name: '創世法杖', soul_weapon_grade: '7' },
          { item_equipment_slot: '輔助武器', item_name: '阿斯特拉魔道書' },
        ],
      });
    }));

    const res = await backfillGrowthEquipmentBatch(env);
    expect(res).toMatchObject({ processedProfiles: 1, completedProfiles: 1, processedDates: 4 });
    const history = await getGrowthHistory(env.DB, OCID, '2026-07-28', '2026-08-03');
    expect(history?.events.filter((e) => ['soul_conversion', 'soul_grade', 'astra_acquired'].includes(e.type))).toEqual([
      expect.objectContaining({ date: '2026-07-30', type: 'soul_conversion', from: '偉大的露希妲寶珠', to: '靈魂武器第 5 階段' }),
      expect.objectContaining({ date: '2026-08-01', type: 'soul_grade', from: '第 5 階段', to: '第 7 階段' }),
      expect.objectContaining({ date: '2026-08-01', type: 'astra_acquired', from: '永恆魔道書', to: '阿斯特拉魔道書' }),
    ]);
  });

  it('in backfillGrowthEquipmentBatch, backfilling an earlier Phase 1 snapshot only updates before_value without changing the Phase 2 event date', async () => {
    await createGrowthProfile(env.DB, OCID, '2026-10-20');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, liberation_status, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 295, 0, 0, '2', 'now', 'now')
    `);
    insertSnapshot.run(OCID, '2026-10-20');
    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', basic_last_synced_date='2026-10-20', last_synced_date='2026-10-20' WHERE ocid=?`).run(OCID);

    const equipmentByDate: Record<string, { scroll_upgrade: string; attack_power: string }> = {
      '2026-10-14': { scroll_upgrade: '8', attack_power: '72' },
      '2026-10-20': { scroll_upgrade: '9', attack_power: '81' },
    };

    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      const eq = equipmentByDate[date];
      return Response.json({
        item_equipment: [{
          item_equipment_slot: '武器',
          item_name: '命運太刀',
          scroll_upgrade: eq.scroll_upgrade,
          scroll_upgradeable_count: '0',
          starforce: '22',
          item_base_option: { base_equipment_level: 250 },
          item_etc_option: { attack_power: eq.attack_power, magic_power: '0' },
        }],
      });
    }));

    await backfillGrowthEquipmentBatch(env);
    let history = await getGrowthHistory(env.DB, OCID, '2026-10-10', '2026-10-20');
    expect(history?.events.filter((e) => e.type === 'destiny_phase2')).toEqual([
      {
        date: '2026-10-20',
        type: 'destiny_phase2',
        from: '',
        to: '首次觀測到命運二階',
      },
    ]);

    // Backfill earlier Phase 1 snapshot (2026-10-14)
    insertSnapshot.run(OCID, '2026-10-14');
    local.sqlite.prepare(`UPDATE growth_soul_tracking SET last_synced_date = NULL WHERE ocid = ?`).run(OCID);
    local.sqlite.prepare(`UPDATE growth_astra_tracking SET last_synced_date = NULL WHERE ocid = ?`).run(OCID);

    await backfillGrowthEquipmentBatch(env);
    history = await getGrowthHistory(env.DB, OCID, '2026-10-10', '2026-10-20');
    expect(history?.events.filter((e) => e.type === 'destiny_phase2')).toEqual([
      {
        date: '2026-10-20',
        type: 'destiny_phase2',
        from: '命運一階',
        to: '命運二階',
      },
    ]);
    const rawStatuses = local.sqlite
      .prepare(`SELECT DISTINCT liberation_status FROM growth_snapshots WHERE ocid = ?`)
      .all(OCID);
    expect(rawStatuses).toEqual([{ liberation_status: '2' }]);
  });

  it('in backfillGrowthEquipmentBatch, backfilling an earlier Phase 2 snapshot advances the Phase 2 event date', async () => {
    await createGrowthProfile(env.DB, OCID, '2026-10-20');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, liberation_status, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 295, 0, 0, '2', 'now', 'now')
    `);
    insertSnapshot.run(OCID, '2026-10-20');
    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed', basic_last_synced_date='2026-10-20', last_synced_date='2026-10-20' WHERE ocid=?`).run(OCID);

    const equipmentByDate: Record<string, { scroll_upgrade: string; attack_power: string }> = {
      '2026-10-15': { scroll_upgrade: '9', attack_power: '81' },
      '2026-10-20': { scroll_upgrade: '9', attack_power: '81' },
    };

    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      const eq = equipmentByDate[date];
      return Response.json({
        item_equipment: [{
          item_equipment_slot: '武器',
          item_name: '命運太刀',
          scroll_upgrade: eq.scroll_upgrade,
          scroll_upgradeable_count: '0',
          starforce: '22',
          item_base_option: { base_equipment_level: 250 },
          item_etc_option: { attack_power: eq.attack_power, magic_power: '0' },
        }],
      });
    }));

    await backfillGrowthEquipmentBatch(env);
    let history = await getGrowthHistory(env.DB, OCID, '2026-10-10', '2026-10-20');
    expect(history?.events.filter((e) => e.type === 'destiny_phase2')).toEqual([
      {
        date: '2026-10-20',
        type: 'destiny_phase2',
        from: '',
        to: '首次觀測到命運二階',
      },
    ]);

    // Backfill earlier Phase 2 snapshot (2026-10-15)
    insertSnapshot.run(OCID, '2026-10-15');
    local.sqlite.prepare(`UPDATE growth_soul_tracking SET last_synced_date = NULL WHERE ocid = ?`).run(OCID);
    local.sqlite.prepare(`UPDATE growth_astra_tracking SET last_synced_date = NULL WHERE ocid = ?`).run(OCID);

    await backfillGrowthEquipmentBatch(env);
    history = await getGrowthHistory(env.DB, OCID, '2026-10-10', '2026-10-20');
    expect(history?.events.filter((e) => e.type === 'destiny_phase2')).toEqual([
      {
        date: '2026-10-15',
        type: 'destiny_phase2',
        from: '',
        to: '首次觀測到命運二階',
      },
    ]);
    const eventCount = local.sqlite
      .prepare(`SELECT COUNT(*) AS n FROM growth_soul_events WHERE ocid = ? AND event_type = 'destiny_phase2'`)
      .get(OCID) as { n: number };
    expect(eventCount.n).toBe(1);
  });

  it('backfills historical Destiny weapon dates without early convergence and isolates historical cursor from daily incremental sync', async () => {
    env.GROWTH_DESTINY_BACKFILL_ENABLED = 'true';
    env.GROWTH_DESTINY_BACKFILL_SCOPE = 'full';
    env.GROWTH_BACKFILL_BATCH_SIZE = '1';
    env.GROWTH_EQUIPMENT_DATE_CONCURRENCY = '1';

    await createGrowthProfile(env.DB, OCID, '2026-10-26');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, liberation_status, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 295, 0, 0, ?, 'now', 'now')
    `);
    // Historical dates already synced by old equipment cursor up to 2026-10-26
    insertSnapshot.run(OCID, '2026-01-01', '2');
    insertSnapshot.run(OCID, '2026-03-01', '2');
    insertSnapshot.run(OCID, '2026-09-01', '2');
    insertSnapshot.run(OCID, '2026-10-26', '2');

    local.sqlite.prepare(`
      UPDATE growth_profiles
      SET status='completed', basic_last_synced_date='2026-10-26', last_synced_date='2026-10-26'
      WHERE ocid=?
    `).run(OCID);
    local.sqlite.prepare(`
      INSERT INTO growth_soul_tracking (ocid, last_synced_date, highest_grade, updated_at)
      VALUES (?, '2026-10-26', 7, 'now')
    `).run(OCID);
    local.sqlite.prepare(`
      INSERT INTO growth_astra_tracking (ocid, last_synced_date, has_astra, updated_at)
      VALUES (?, '2026-10-26', 1, 'now')
    `).run(OCID);

    const equipmentByDate: Record<string, { scroll_upgrade: string; attack_power: string }> = {
      '2026-01-01': { scroll_upgrade: '8', attack_power: '72' }, // Phase 1
      '2026-03-01': { scroll_upgrade: '8', attack_power: '72' }, // Phase 1
      '2026-09-01': { scroll_upgrade: '9', attack_power: '81' }, // Earlier Phase 2!
      '2026-10-26': { scroll_upgrade: '9', attack_power: '81' }, // Phase 2
      '2026-10-27': { scroll_upgrade: '9', attack_power: '81' }, // Daily incremental Phase 2
    };

    const requestedDates: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      requestedDates.push(date);
      const eq = equipmentByDate[date];
      return Response.json({
        item_equipment: [{
          item_equipment_slot: '武器',
          item_name: '命運太刀',
          scroll_upgrade: eq.scroll_upgrade,
          scroll_upgradeable_count: '0',
          starforce: '22',
          item_base_option: { base_equipment_level: 250 },
          item_etc_option: { attack_power: eq.attack_power, magic_power: '0' },
        }],
      });
    }));

    // Step 1: Historical backfill batch 1 processes 2026-01-01, Batch 2 processes 2026-03-01
    await backfillGrowthDestinyHistoryBatch(env);
    await backfillGrowthDestinyHistoryBatch(env);

    let backfillRow = local.sqlite
      .prepare('SELECT target_date, last_checked_date, status FROM growth_destiny_backfill WHERE ocid = ?')
      .get(OCID) as { target_date: string; last_checked_date: string | null; status: string };
    expect(backfillRow).toEqual({
      target_date: '2026-10-26',
      last_checked_date: '2026-03-01',
      status: 'pending',
    });

    // Step 2: While historical backfill is still at 2026-03-01, daily incremental sync adds 2026-10-27 (Phase 2).
    insertSnapshot.run(OCID, '2026-10-27', '2');
    local.sqlite.prepare(`
      UPDATE growth_profiles
      SET basic_last_synced_date='2026-10-27', last_synced_date='2026-10-27'
      WHERE ocid=?
    `).run(OCID);

    await backfillGrowthEquipmentBatch(env);

    // Daily sync must advance growth_soul_tracking.last_synced_date to 2026-10-27,
    // AND record 2026-10-27 as Phase 2 (with before_value='命運一階' since 2026-01-01 was already seen),
    // BUT MUST NOT jump growth_destiny_backfill.last_checked_date past 2026-03-01!
    const soulAfterDaily = local.sqlite
      .prepare('SELECT last_synced_date, earliest_destiny_phase1_date, earliest_destiny_phase2_date FROM growth_soul_tracking WHERE ocid = ?')
      .get(OCID) as { last_synced_date: string; earliest_destiny_phase1_date: string; earliest_destiny_phase2_date: string };
    expect(soulAfterDaily).toEqual({
      last_synced_date: '2026-10-27',
      earliest_destiny_phase1_date: '2026-01-01',
      earliest_destiny_phase2_date: '2026-10-27',
    });
    backfillRow = local.sqlite
      .prepare('SELECT target_date, last_checked_date, status FROM growth_destiny_backfill WHERE ocid = ?')
      .get(OCID) as { target_date: string; last_checked_date: string | null; status: string };
    expect(backfillRow).toEqual({
      target_date: '2026-10-26',
      last_checked_date: '2026-03-01',
      status: 'pending',
    });

    // Step 3: Even though both Phase 1 (2026-01-01) and Phase 2 (2026-10-27) are already recorded,
    // historical backfill must NOT stop early—it must continue scanning 2026-09-01 and 2026-10-26!
    await backfillGrowthDestinyHistoryBatch(env); // scans 2026-09-01 (discovers earlier Phase 2!)
    await backfillGrowthDestinyHistoryBatch(env); // scans 2026-10-26 and marks completed

    backfillRow = local.sqlite
      .prepare('SELECT target_date, last_checked_date, status FROM growth_destiny_backfill WHERE ocid = ?')
      .get(OCID) as { target_date: string; last_checked_date: string | null; status: string };
    expect(backfillRow).toEqual({
      target_date: '2026-10-26',
      last_checked_date: '2026-10-26',
      status: 'completed',
    });

    const history = await getGrowthHistory(env.DB, OCID, '2026-01-01', '2026-10-27');
    expect(history?.events.filter((e) => e.type === 'destiny_phase2')).toEqual([
      {
        date: '2026-09-01',
        type: 'destiny_phase2',
        from: '命運一階',
        to: '命運二階',
      },
    ]);

    // Step 4: Subsequent invocations after completion must issue 0 requests and create no duplicate events
    requestedDates.length = 0;
    const repeatRes = await backfillGrowthDestinyHistoryBatch(env);
    expect(repeatRes).toEqual({
      processedDates: 0,
      processedProfiles: 0,
      completedProfiles: 0,
      requests: 0,
      transportAttempts: 0,
    });
    expect(requestedDates).toEqual([]);
    const eventCount = local.sqlite
      .prepare(`SELECT COUNT(*) AS n FROM growth_soul_events WHERE ocid = ? AND event_type = 'destiny_phase2'`)
      .get(OCID) as { n: number };
    expect(eventCount.n).toBe(1);
  });

  it('safely resumes historical Destiny backfill after 429, 503, budget exhaustion, and expired worker lease without skipping dates', async () => {
    env.GROWTH_DESTINY_BACKFILL_ENABLED = 'true';
    env.GROWTH_DESTINY_BACKFILL_SCOPE = 'full';
    env.GROWTH_BACKFILL_BATCH_SIZE = '5';
    env.GROWTH_EQUIPMENT_DATE_CONCURRENCY = '1';
    env.NEXON_RETRY_LIMIT = '1';

    await createGrowthProfile(env.DB, OCID, '2026-08-03');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, liberation_status, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 295, 0, 0, '2', 'now', 'now')
    `);
    for (const date of ['2026-08-01', '2026-08-02', '2026-08-03']) {
      insertSnapshot.run(OCID, date);
    }
    local.sqlite.prepare(`
      UPDATE growth_profiles
      SET status='completed', basic_last_synced_date='2026-08-03', last_synced_date='2026-08-03'
      WHERE ocid=?
    `).run(OCID);
    local.sqlite.prepare(`
      INSERT INTO growth_soul_tracking (ocid, last_synced_date, updated_at)
      VALUES (?, '2026-08-03', 'now')
    `).run(OCID);

    // Run 1: 2026-08-01 succeeds (Phase 1), 2026-08-02 fails with 429
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date');
      if (date === '2026-08-01') {
        return Response.json({
          item_equipment: [{
            item_equipment_slot: '武器',
            item_name: '命運太刀',
            scroll_upgrade: '8',
            scroll_upgradeable_count: '0',
            starforce: '22',
            item_base_option: { base_equipment_level: 250 },
            item_etc_option: { attack_power: '72', magic_power: '0' },
          }],
        });
      }
      return new Response('rate limited', { status: 429, headers: { 'retry-after': '0' } });
    }));

    const run1 = await backfillGrowthDestinyHistoryBatch(env);
    expect(run1).toMatchObject({
      processedProfiles: 1,
      completedProfiles: 0,
      processedDates: 1,
      requests: 2,
      transportAttempts: 2,
    });

    // Cursor must stop at 2026-08-01 (must NOT skip failed 2026-08-02) and schedule retry_at
    const stateAfter429 = local.sqlite
      .prepare('SELECT last_checked_date, status, retry_at, claim_token FROM growth_destiny_backfill WHERE ocid = ?')
      .get(OCID) as { last_checked_date: string | null; status: string; retry_at: string | null; claim_token: string | null };
    expect(stateAfter429.last_checked_date).toBe('2026-08-01');
    expect(stateAfter429.status).toBe('pending');
    expect(stateAfter429.retry_at).toBeTruthy();
    expect(stateAfter429.claim_token).toBeNull();

    // Simulate a crashed worker holding an expired lease and due retry_at, plus budget cap = 1
    const expiredLease = new Date(Date.now() - 60_000).toISOString();
    local.sqlite.prepare(`
      UPDATE growth_destiny_backfill
      SET retry_at = NULL, claim_token = 'crashed-worker', claim_until = ?
      WHERE ocid = ?
    `).run(expiredLease, OCID);

    const requestedInRun2: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      requestedInRun2.push(date);
      return Response.json({
        item_equipment: [{
          item_equipment_slot: '武器',
          item_name: '命運太刀',
          scroll_upgrade: '9',
          scroll_upgradeable_count: '0',
          starforce: '22',
          item_base_option: { base_equipment_level: 250 },
          item_etc_option: { attack_power: '81', magic_power: '0' },
        }],
      });
    }));

    // Run 2: recovers expired lease, processes 2026-08-02, stops cleanly due to 1-request budget
    const budgetRun2 = { usedRequests: 0, maxRequests: 1 };
    const run2 = await backfillGrowthDestinyHistoryBatch(env, budgetRun2);
    expect(requestedInRun2).toEqual(['2026-08-02']);
    expect(budgetRun2.usedRequests).toBe(1);
    expect(run2).toMatchObject({
      processedProfiles: 1,
      completedProfiles: 0,
      processedDates: 1,
    });

    // Run 3: finishes 2026-08-03 and marks status = completed
    requestedInRun2.length = 0;
    const run3 = await backfillGrowthDestinyHistoryBatch(env);
    expect(requestedInRun2).toEqual(['2026-08-03']);
    expect(run3).toMatchObject({
      processedProfiles: 1,
      completedProfiles: 1,
      processedDates: 1,
    });

    const finalState = local.sqlite
      .prepare('SELECT last_checked_date, status, completed_at FROM growth_destiny_backfill WHERE ocid = ?')
      .get(OCID) as { last_checked_date: string; status: string; completed_at: string | null };
    expect(finalState.last_checked_date).toBe('2026-08-03');
    expect(finalState.status).toBe('completed');
    expect(finalState.completed_at).toBeTruthy();

    const history = await getGrowthHistory(env.DB, OCID, '2026-08-01', '2026-08-03');
    expect(history?.events.filter((e) => e.type === 'destiny_phase2')).toEqual([
      {
        date: '2026-08-02',
        type: 'destiny_phase2',
        from: '命運一階',
        to: '命運二階',
      },
    ]);
  });

  it('handles pre-2025-12-03 liberation_status=1 Destiny weapons and does not skip Destiny dates due to Astra early-stop', async () => {
    env.GROWTH_DESTINY_BACKFILL_ENABLED = 'true';
    env.GROWTH_DESTINY_BACKFILL_SCOPE = 'full';
    env.GROWTH_BACKFILL_BATCH_SIZE = '10';
    env.GROWTH_EQUIPMENT_DATE_CONCURRENCY = '2';

    await createGrowthProfile(env.DB, OCID, '2026-07-20');
    const insertSnapshot = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (
        ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, liberation_status, fetched_at, updated_at
      ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 295, 0, 0, ?, 'now', 'now')
    `);
    // Pre-2025-12-03 snapshot where NEXON basic API still returned '1' even though character already had Destiny Phase 1
    insertSnapshot.run(OCID, '2025-11-27', '1');
    // Post-2025-12-03 snapshots with '2', located in the < 2026-07-29 Astra window
    insertSnapshot.run(OCID, '2026-07-16', '2');
    insertSnapshot.run(OCID, '2026-07-20', '2');

    local.sqlite.prepare(`
      UPDATE growth_profiles
      SET status='completed', basic_last_synced_date='2026-07-20', last_synced_date='2026-07-20'
      WHERE ocid=?
    `).run(OCID);

    const requestedDates: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const date = new URL(input).searchParams.get('date')!;
      requestedDates.push(date);
      if (date === '2025-11-27') {
        return Response.json({
          item_equipment: [{
            item_equipment_slot: '武器',
            item_name: '命運長杖',
            scroll_upgrade: '8',
            scroll_upgradeable_count: '0',
            starforce: '22',
            item_base_option: { base_equipment_level: 250 },
            item_etc_option: { attack_power: '0', magic_power: '72' },
          }],
        });
      }
      if (date === '2026-07-16') {
        // Character already equips Astra on 2026-07-16 (which sets earliestAstraIndex),
        // AND wears a non-Destiny Genesis weapon on this day despite liberation_status = '2'.
        return Response.json({
          item_equipment: [
            { item_equipment_slot: '武器', item_name: '創世長杖', scroll_upgrade: '8', item_base_option: { base_equipment_level: 200 } },
            { item_equipment_slot: '輔助武器', item_name: '阿斯特拉魔道書' },
          ],
        });
      }
      // 2026-07-20: Must NOT be skipped by Astra early-stop because it is a Destiny candidate date!
      return Response.json({
        item_equipment: [
          {
            item_equipment_slot: '武器',
            item_name: '命運長杖',
            scroll_upgrade: '9',
            scroll_upgradeable_count: '0',
            starforce: '22',
            item_base_option: { base_equipment_level: 250 },
            item_etc_option: { attack_power: '0', magic_power: '81' },
          },
          { item_equipment_slot: '輔助武器', item_name: '阿斯特拉魔道書' },
        ],
      });
    }));

    const res = await backfillGrowthEquipmentBatch(env);
    expect(res).toMatchObject({
      processedProfiles: 1,
      completedProfiles: 1,
      processedDates: 3,
      requests: 3,
    });
    expect(requestedDates).toEqual(['2025-11-27', '2026-07-16', '2026-07-20']);

    const history = await getGrowthHistory(env.DB, OCID, '2025-11-01', '2026-07-20');
    expect(history?.events.filter((e) => e.type === 'destiny_phase2')).toEqual([
      {
        date: '2026-07-20',
        type: 'destiny_phase2',
        from: '命運一階',
        to: '命運二階',
      },
    ]);

    // Raw liberation_status in growth_snapshots ('1' on 2025-11-27, '2' on July dates) must remain untouched
    const rawSnapshots = local.sqlite
      .prepare('SELECT snapshot_date, liberation_status FROM growth_snapshots WHERE ocid = ? ORDER BY snapshot_date')
      .all(OCID);
    expect(rawSnapshots).toEqual([
      { snapshot_date: '2025-11-27', liberation_status: '1' },
      { snapshot_date: '2026-07-16', liberation_status: '2' },
      { snapshot_date: '2026-07-20', liberation_status: '2' },
    ]);
  });
});
