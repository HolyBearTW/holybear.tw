import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../functions/_shared/env';
import { createGrowthProfile, latestAvailableGrowthDate } from '../../functions/_shared/growth-tracker';
import {
  backfillGrowthDestinyHistoryBatch,
  backfillGrowthDestinySpotCheckBatch,
  backfillGrowthEquipmentBatch,
  ensureDestinyBackfillRegistered,
} from '../../functions/_shared/growth-equipment';
import growthConsumer from '../../workers/growth-consumer';
import { createTestD1 } from './sqlite-d1';

const OCID_P = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';
const OCID_Q1 = 'b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1';
const OCID_Q2 = 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';
const OCID_Q3 = 'b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3';
const OCID_R = 'c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1';
const OCID_S = 'c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2';

type Kind = 'genesis' | 'p1' | 'p2';
interface Call {
  endpoint: string;
  ocid: string | null;
  date: string | null;
}

let local: ReturnType<typeof createTestD1>;
let env: Env;
let calls: Call[];

const makeEnv = (extra: Record<string, string> = {}): Env => ({
  DB: local.db,
  SURVEY_DB: local.db,
  NEXON_API_KEY: 'test-only',
  NEXON_RETRY_LIMIT: '2',
  NEXON_REQUEST_TIMEOUT_MS: '1000',
  GROWTH_BACKFILL_BATCH_SIZE: '20',
  GROWTH_DATE_CONCURRENCY: '2',
  GROWTH_EQUIPMENT_DATE_CONCURRENCY: '2',
  GROWTH_PROFILE_CONCURRENCY: '1',
  GROWTH_INVOCATION_REQUEST_BUDGET: '200',
  ...extra,
});

const weapon = (kind: Kind) => {
  if (kind === 'genesis') {
    return {
      item_equipment_slot: '武器',
      item_name: '創世長杖',
      scroll_upgrade: '8',
      scroll_upgradeable_count: '0',
      item_base_option: { base_equipment_level: 200 },
      item_etc_option: { attack_power: '0', magic_power: '72' },
    };
  }
  return {
    item_equipment_slot: '武器',
    item_name: '命運長杖',
    scroll_upgrade: kind === 'p2' ? '9' : '8',
    scroll_upgradeable_count: '0',
    starforce: '22',
    item_base_option: { base_equipment_level: 250 },
    item_etc_option: { attack_power: '0', magic_power: kind === 'p2' ? '81' : '72' },
  };
};

const dateRange = (from: string, count: number) => Array.from({ length: count }, (_, index) => {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
});

/** A profile whose Basic/Dojang/Equipment daily cursors already caught up (production-like). */
const seedCaughtUp = async (ocid: string, dates: string[], liberation: string) => {
  const last = dates.at(-1)!;
  await createGrowthProfile(env.DB, ocid, last);
  local.sqlite.prepare(`
    UPDATE growth_profiles
    SET status='completed', basic_last_synced_date=?2, last_synced_date=?2, dojang_last_synced_date=?2
    WHERE ocid=?1
  `).run(ocid, last);
  const insert = local.sqlite.prepare(`
    INSERT INTO growth_snapshots (
      ocid, snapshot_date, character_name, world_name, job_name,
      character_level, character_exp, character_exp_rate, liberation_status, fetched_at, updated_at
    ) VALUES (?, ?, '測試角色', '艾麗亞', '主教', 295, 0, 0, ?, 'now', 'now')
  `);
  for (const date of dates) insert.run(ocid, date, liberation);
  local.sqlite.prepare(`INSERT INTO growth_soul_tracking (ocid, last_synced_date, updated_at) VALUES (?, ?, 'now')`).run(ocid, last);
  local.sqlite.prepare(`INSERT INTO growth_astra_tracking (ocid, last_synced_date, has_astra, updated_at) VALUES (?, ?, 1, 'now')`).run(ocid, last);
};

/** A brand-new profile that still needs Basic + Dojang + Equipment (2026-08-02..03). */
const seedNewProfile = async (ocid: string) => {
  await createGrowthProfile(env.DB, ocid, '2026-08-03');
  local.sqlite.prepare(`
    UPDATE growth_profiles SET scan_start_date = '2026-08-02', current_processing_date = '2026-08-02' WHERE ocid = ?
  `).run(ocid);
};

const installFetch = (
  equipment: Record<string, Record<string, Kind>> = {},
  hook?: (call: Call) => Response | null,
) => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input);
    const call: Call = {
      endpoint: url.pathname.split('/').pop() ?? '',
      ocid: url.searchParams.get('ocid'),
      date: url.searchParams.get('date'),
    };
    calls.push(call);
    const hooked = hook?.(call);
    if (hooked) return hooked;
    const date = call.date || '2026-08-01';
    if (call.endpoint === 'basic') {
      return Response.json({
        date: `${date}T00:00+08:00`,
        character_name: '測試角色',
        world_name: '艾麗亞',
        character_class: '主教',
        character_level: 285,
        character_exp: 1000,
        character_exp_rate: '10.000',
        character_guild_name: '公會',
        liberation_quest_clear: '2',
      });
    }
    if (call.endpoint === 'dojang') {
      return Response.json({
        date: `${date}T00:00+08:00`,
        dojang_best_floor: 80,
        dojang_best_time: 500,
        date_dojang_record: `${date}T00:00+08:00`,
      });
    }
    const kind = equipment[call.ocid ?? '']?.[date] ?? 'genesis';
    return Response.json({ item_equipment: [weapon(kind)] });
  }));
};

const runScheduled = async (target: Env = env) => {
  const waits: Promise<unknown>[] = [];
  growthConsumer.scheduled(
    {} as ScheduledController,
    target,
    {
      waitUntil: (promise: Promise<unknown>) => { waits.push(promise); },
      passThroughOnException: () => undefined,
    } as unknown as ExecutionContext,
  );
  await Promise.all(waits);
};

const countFor = (ocid: string, endpoint?: string) => calls
  .filter((call) => call.ocid === ocid && (!endpoint || call.endpoint === endpoint)).length;

const backfillRow = (ocid: string) => local.sqlite
  .prepare('SELECT * FROM growth_destiny_backfill WHERE ocid = ?').get(ocid) as Record<string, unknown>;

const phase2Events = (ocid: string) => local.sqlite
  .prepare(`SELECT snapshot_date, before_value, after_value FROM growth_soul_events WHERE ocid = ? AND event_type = 'destiny_phase2'`)
  .all(ocid);

beforeEach(() => {
  // Freeze only Date: Dojang completion compares its target with the current
  // available day, and retry timers must continue to run normally.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-08-04T02:00:00+08:00'));
  local = createTestD1();
  calls = [];
  env = makeEnv();
  // Mark today's scheduler scan as done so seeded completed profiles are not requeued by the daily scan.
  const updated = local.sqlite
    .prepare('UPDATE growth_scheduler_state SET last_target_date = ? WHERE id = 1')
    .run(latestAvailableGrowthDate());
  if (!updated.changes) throw new Error('growth_scheduler_state row missing');
});

afterEach(() => {
  local.sqlite.close();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Destiny historical backfill: real failure injection', () => {
  it.each(['history', 'spot check'] as const)(
    'stops the %s after HTTP 400 OPENAPI00003 and allows a manual retry',
    async (phase) => {
      const ocid = phase === 'history' ? OCID_Q1 : OCID_R;
      const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];
      await seedCaughtUp(ocid, dates, phase === 'history' ? '2' : '1');
      local.sqlite.prepare(`UPDATE growth_soul_tracking SET earliest_destiny_phase2_date='2026-07-30' WHERE ocid=?`).run(ocid);
      local.sqlite.prepare(`
        INSERT INTO growth_soul_events (ocid, snapshot_date, event_type, before_value, after_value)
        VALUES (?, '2026-07-30', 'destiny_phase2', '', '首次觀測到命運二階')
      `).run(ocid);
      const originalEvent = [{ snapshot_date: '2026-07-30', before_value: '', after_value: '首次觀測到命運二階' }];
      env = makeEnv({
        GROWTH_DESTINY_BACKFILL_ENABLED: 'true',
        GROWTH_DESTINY_BACKFILL_SCOPE: 'full',
        GROWTH_EQUIPMENT_DATE_CONCURRENCY: '1',
      });
      const failedDate = phase === 'history' ? dates[1] : dates[2];
      installFetch({}, (call) => call.date === failedDate ? Response.json(
        { error: { name: 'OPENAPI00003', message: 'Invalid identifier' } },
        { status: 400 },
      ) : null);
      const run = phase === 'history' ? backfillGrowthDestinyHistoryBatch : backfillGrowthDestinySpotCheckBatch;
      await run(env, { usedRequests: 0, maxRequests: 10 });
      expect(calls.map((call) => call.date)).toEqual(phase === 'history' ? dates.slice(0, 2) : [dates[2]]);
      expect(backfillRow(ocid)).toMatchObject(phase === 'history'
        ? { status: 'failed', last_checked_date: dates[0] }
        : { status: 'completed', spot_check_status: 'unavailable', spot_check_date: dates[2] });
      expect(backfillRow(ocid)).toMatchObject({
        error_code: 'OPENAPI00003', error_message: 'Invalid identifier', error_date: failedDate,
        retry_at: null, claim_token: null,
      });
      expect(phase2Events(ocid)).toEqual(originalEvent);

      calls.length = 0;
      vi.setSystemTime(new Date('2026-08-05T02:00:00+08:00'));
      await run(env, { usedRequests: 0, maxRequests: 10 });
      await run(env, { usedRequests: 0, maxRequests: 10 });
      expect(calls).toEqual([]); // A later cron does not retry a permanent failure.
      local.sqlite.prepare(phase === 'history'
        ? `UPDATE growth_destiny_backfill SET status='pending', retry_at=NULL WHERE ocid=?`
        : `UPDATE growth_destiny_backfill SET spot_check_status='pending', retry_at=NULL WHERE ocid=?`
      ).run(ocid);
      installFetch({ [ocid]: { [dates[0]]: 'p1', [dates[1]]: 'p1', [dates[2]]: 'p2' } });
      await run(env, { usedRequests: 0, maxRequests: 10 });
      if (phase === 'spot check') {
        expect(calls.map((call) => call.date)).toEqual([dates[2]]);
        expect(backfillRow(ocid)).toMatchObject({ status: 'pending', scan_all: 1, spot_check_status: 'positive' });
        calls.length = 0;
        await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 10 });
      }
      expect(calls.map((call) => call.date)).toEqual(phase === 'history' ? dates.slice(1) : dates);
      expect(backfillRow(ocid)).toMatchObject({
        status: 'completed', last_checked_date: dates[2], error_code: null, error_message: null, error_date: null,
      });
      expect(phase2Events(ocid)).toEqual(originalEvent);
    },
  );

  it('records a permanent 400 before any history date succeeds', async () => {
    const dates = ['2026-08-01', '2026-08-02'];
    await seedCaughtUp(OCID_Q1, dates, '2');
    env = makeEnv({ GROWTH_DESTINY_BACKFILL_ENABLED: 'true', GROWTH_DESTINY_BACKFILL_SCOPE: 'full', GROWTH_EQUIPMENT_DATE_CONCURRENCY: '1' });
    installFetch({}, () => Response.json({ error: { name: 'OPENAPI00004', message: 'Invalid parameter' } }, { status: 400 }));
    await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 10 });
    expect(calls.map((call) => call.date)).toEqual([dates[0]]);
    expect(backfillRow(OCID_Q1)).toMatchObject({
      status: 'failed', last_checked_date: null, error_code: 'OPENAPI00004', error_date: dates[0], retry_at: null,
    });
  });

  it.each(['history', 'spot check'] as const)(
    'keeps HTTP 400 OPENAPI00009 retryable for %s',
    async (phase) => {
      const ocid = phase === 'history' ? OCID_Q1 : OCID_R;
      const dates = ['2026-08-01', '2026-08-02'];
      await seedCaughtUp(ocid, dates, phase === 'history' ? '2' : '1');
      env = makeEnv({
        GROWTH_DESTINY_BACKFILL_ENABLED: 'true', GROWTH_DESTINY_BACKFILL_SCOPE: 'full',
        GROWTH_EQUIPMENT_DATE_CONCURRENCY: '1', NEXON_RETRY_LIMIT: '1',
      });
      installFetch({}, () => Response.json(
        { error: { name: 'OPENAPI00009', message: 'Data is being prepared' } },
        { status: 400, headers: { 'retry-after': '0' } },
      ));
      const run = phase === 'history' ? backfillGrowthDestinyHistoryBatch : backfillGrowthDestinySpotCheckBatch;
      await run(env, { usedRequests: 0, maxRequests: 10 });
      expect(backfillRow(ocid)).toMatchObject(phase === 'history'
        ? { status: 'pending', last_checked_date: null, error_code: null }
        : { status: 'completed', spot_check_status: 'pending', error_code: null });
      expect(backfillRow(ocid).retry_at).toBeTruthy();
      calls.length = 0;
      vi.setSystemTime(new Date('2026-08-04T02:06:00+08:00'));
      installFetch();
      await run(env, { usedRequests: 0, maxRequests: 10 });
      expect(calls.map((call) => call.date)).toEqual(phase === 'history' ? dates : [dates[1]]);
      expect(backfillRow(ocid)).toMatchObject(phase === 'history'
        ? { status: 'completed', last_checked_date: dates[1] }
        : { spot_check_status: 'negative' });
    },
  );

  it('uses the earliest failed date when concurrent requests finish out of order', async () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];
    await seedCaughtUp(OCID_Q1, dates, '2');
    env = makeEnv({
      GROWTH_DESTINY_BACKFILL_ENABLED: 'true', GROWTH_DESTINY_BACKFILL_SCOPE: 'full',
      GROWTH_EQUIPMENT_DATE_CONCURRENCY: '2', NEXON_RETRY_LIMIT: '1',
    });
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      const date = url.searchParams.get('date');
      calls.push({ endpoint: 'item-equipment', ocid: url.searchParams.get('ocid'), date });
      if (date === dates[0]) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return new Response('temporary 503', { status: 503, headers: { 'retry-after': '0' } });
      }
      return Response.json({ error: { name: 'OPENAPI00003', message: 'Invalid identifier' } }, { status: 400 });
    }));
    await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 10 });
    expect(backfillRow(OCID_Q1)).toMatchObject({ status: 'pending', last_checked_date: null, error_code: null });
    expect(backfillRow(OCID_Q1).retry_at).toBeTruthy();

    vi.setSystemTime(new Date('2026-08-04T02:06:00+08:00'));
    calls.length = 0;
    installFetch({}, (call) => call.date === dates[1]
      ? Response.json({ error: { name: 'OPENAPI00003', message: 'Invalid identifier' } }, { status: 400 })
      : null);
    await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 10 });
    expect(backfillRow(OCID_Q1)).toMatchObject({
      status: 'failed', last_checked_date: dates[0], error_code: 'OPENAPI00003', error_date: dates[1],
    });
  });

  it('keeps the cursor after a real 503 that exhausts retries, then resumes without skipping dates', async () => {
    env = makeEnv({
      GROWTH_DESTINY_BACKFILL_ENABLED: 'true',
      GROWTH_DESTINY_BACKFILL_SCOPE: 'full',
      NEXON_RETRY_LIMIT: '2',
      GROWTH_EQUIPMENT_DATE_CONCURRENCY: '1',
    });
    const dates = ['2026-08-01', '2026-08-02'];
    await seedCaughtUp(OCID_Q1, dates, '2');
    let failing = true;
    installFetch({ [OCID_Q1]: { '2026-08-01': 'p2', '2026-08-02': 'p2' } }, () => (
      failing ? new Response('temporary 503', { status: 503, headers: { 'retry-after': '0' } }) : null
    ));

    const budget = { usedRequests: 0, maxRequests: 50 };
    const first = await backfillGrowthDestinyHistoryBatch(env, budget);
    expect(first).toMatchObject({ processedProfiles: 0, requests: 1, transportAttempts: 2 });
    expect(budget.usedRequests).toBe(2);
    expect(calls.map((call) => call.date)).toEqual(['2026-08-01', '2026-08-01']);
    const afterFailure = backfillRow(OCID_Q1);
    expect(afterFailure).toMatchObject({ status: 'pending', last_checked_date: null, claim_token: null });
    expect(afterFailure.retry_at).toBeTruthy();
    expect(phase2Events(OCID_Q1)).toEqual([]);

    // retry_at in the future: nothing runs yet.
    calls.length = 0;
    expect(await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 50 }))
      .toMatchObject({ processedProfiles: 0, requests: 0 });
    expect(calls).toEqual([]);

    // Next round: recovery.
    failing = false;
    local.sqlite.prepare('UPDATE growth_destiny_backfill SET retry_at = NULL WHERE ocid = ?').run(OCID_Q1);
    const second = await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 50 });
    expect(second).toMatchObject({ processedProfiles: 1, completedProfiles: 1, requests: 2 });
    expect(calls.map((call) => call.date)).toEqual(dates);
    expect(backfillRow(OCID_Q1)).toMatchObject({ status: 'completed', last_checked_date: '2026-08-02' });
    expect(phase2Events(OCID_Q1)).toEqual([
      { snapshot_date: '2026-08-01', before_value: '', after_value: '首次觀測到命運二階' },
    ]);
  });

  it('never exceeds the shared budget when concurrent retries exhaust it mid-flight and never commits past a gap', async () => {
    env = makeEnv({
      GROWTH_DESTINY_BACKFILL_ENABLED: 'true',
      GROWTH_DESTINY_BACKFILL_SCOPE: 'full',
      GROWTH_BACKFILL_BATCH_SIZE: '5',
      GROWTH_EQUIPMENT_DATE_CONCURRENCY: '4',
      NEXON_RETRY_LIMIT: '2',
    });
    const dates = dateRange('2026-08-01', 5);
    await seedCaughtUp(OCID_Q1, dates, '2');
    const equipment = {
      [OCID_Q1]: { [dates[0]]: 'p1', [dates[1]]: 'p1', [dates[2]]: 'p2', [dates[3]]: 'p2', [dates[4]]: 'p2' } as Record<string, Kind>,
    };
    let secondDateAttempts = 0;
    installFetch(equipment, (call) => {
      if (call.date === dates[1]) {
        secondDateAttempts += 1;
        if (secondDateAttempts === 1) return new Response('503', { status: 503, headers: { 'retry-after': '0' } });
      }
      return null;
    });

    const budget = { usedRequests: 0, maxRequests: 4 };
    await backfillGrowthDestinyHistoryBatch(env, budget);
    // 4 first attempts consumed the whole budget; the 503 retry is refused, never sent.
    expect(calls).toHaveLength(4);
    expect(budget.usedRequests).toBe(4);
    expect(budget.usedRequests).toBeLessThanOrEqual(budget.maxRequests);
    // Only the contiguous prefix (date 1) may be committed; dates 3-4 were observed but sit behind the gap.
    expect(backfillRow(OCID_Q1)).toMatchObject({
      status: 'pending',
      last_checked_date: dates[0],
      claim_token: null,
      retry_at: null,
    });
    expect(phase2Events(OCID_Q1)).toEqual([]);
    expect(local.sqlite.prepare('SELECT earliest_destiny_phase1_date AS p1, earliest_destiny_phase2_date AS p2 FROM growth_soul_tracking WHERE ocid = ?').get(OCID_Q1))
      .toEqual({ p1: dates[0], p2: null });

    // Resume with a fresh budget: nothing skipped, earliest Phase 2 is date 3.
    calls.length = 0;
    await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 50 });
    expect(new Set(calls.map((call) => call.date))).toEqual(new Set(dates.slice(1)));
    expect(backfillRow(OCID_Q1)).toMatchObject({ status: 'completed', last_checked_date: dates[4] });
    expect(phase2Events(OCID_Q1)).toEqual([
      { snapshot_date: dates[2], before_value: '命運一階', after_value: '命運二階' },
    ]);
  });
});

describe('Destiny historical backfill: switch, canary and rollout through growthConsumer.scheduled()', () => {
  const destinyOcids = [OCID_Q1, OCID_Q2, OCID_Q3];
  const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];

  const seedAll = async () => {
    for (const ocid of destinyOcids) await seedCaughtUp(ocid, dates, '2');
    await seedNewProfile(OCID_P);
    installFetch(Object.fromEntries(destinyOcids.map((ocid) => [ocid, Object.fromEntries(dates.map((date) => [date, 'p2' as Kind]))])));
  };

  it('keeps daily Basic/Dojang/Equipment working while disabled, then rolls out canary -> wider canary -> full without resetting progress', async () => {
    await seedAll();

    // Stage 0: default (disabled). Daily phases run, Destiny history issues no request at all.
    await runScheduled();
    expect(countFor(OCID_P, 'basic')).toBe(2);
    expect(countFor(OCID_P, 'dojang')).toBe(2);
    expect(countFor(OCID_P, 'item-equipment')).toBe(2);
    expect(backfillRow(OCID_P)).toBeUndefined();
    for (const ocid of destinyOcids) {
      expect(countFor(ocid)).toBe(0);
      expect(backfillRow(ocid)).toBeUndefined();
    }

    // Stage 1: enabled but canary scope with an empty allow-list -> still nothing.
    calls.length = 0;
    env = makeEnv({ GROWTH_DESTINY_BACKFILL_ENABLED: 'true' });
    await runScheduled();
    expect(calls).toEqual([]);

    // Stage 2: canary = Q1 only.
    env = makeEnv({ GROWTH_DESTINY_BACKFILL_ENABLED: 'true', GROWTH_DESTINY_BACKFILL_CANARY_OCIDS: `${OCID_Q1}, not-an-ocid` });
    await runScheduled();
    expect(countFor(OCID_Q1)).toBe(3);
    expect(countFor(OCID_Q2) + countFor(OCID_Q3)).toBe(0);
    expect(backfillRow(OCID_Q1)).toMatchObject({ status: 'completed', last_checked_date: dates[2] });
    expect(backfillRow(OCID_Q2)).toBeUndefined();
    expect(backfillRow(OCID_Q3)).toBeUndefined();

    // Stage 3: canary widened to Q1,Q2 -> only Q2 is new work; Q1 is not rescanned.
    calls.length = 0;
    env = makeEnv({ GROWTH_DESTINY_BACKFILL_ENABLED: 'true', GROWTH_DESTINY_BACKFILL_CANARY_OCIDS: `${OCID_Q1},${OCID_Q2}` });
    await runScheduled();
    expect(countFor(OCID_Q2)).toBe(3);
    expect(countFor(OCID_Q1) + countFor(OCID_Q3)).toBe(0);
    expect(backfillRow(OCID_Q3)).toBeUndefined();

    // Stage 4: explicit full scope -> remaining Q3 only.
    calls.length = 0;
    env = makeEnv({ GROWTH_DESTINY_BACKFILL_ENABLED: 'true', GROWTH_DESTINY_BACKFILL_SCOPE: 'full' });
    await runScheduled();
    expect(countFor(OCID_Q3)).toBe(3);
    expect(countFor(OCID_Q1) + countFor(OCID_Q2)).toBe(0);
    for (const ocid of destinyOcids) {
      expect(backfillRow(ocid)).toMatchObject({ status: 'completed', last_checked_date: dates[2] });
      expect(phase2Events(ocid)).toEqual([
        { snapshot_date: dates[0], before_value: '', after_value: '首次觀測到命運二階' },
      ]);
    }

    // Stage 5: redeploying the Worker (re-registration + more crons) must not reset or rescan.
    const completedAt = destinyOcids.map((ocid) => backfillRow(ocid).completed_at);
    calls.length = 0;
    await ensureDestinyBackfillRegistered(env.DB);
    await ensureDestinyBackfillRegistered(env.DB);
    await runScheduled();
    await runScheduled();
    expect(calls).toEqual([]);
    expect(destinyOcids.map((ocid) => backfillRow(ocid).completed_at)).toEqual(completedAt);
    expect(destinyOcids.map((ocid) => backfillRow(ocid).status)).toEqual(['completed', 'completed', 'completed']);
  });

  it('caps Destiny requests per invocation with its own budget while the shared budget stays large', async () => {
    await seedCaughtUp(OCID_Q1, dates, '2');
    installFetch({ [OCID_Q1]: { [dates[0]]: 'p2', [dates[1]]: 'p2', [dates[2]]: 'p2' } });
    env = makeEnv({
      GROWTH_DESTINY_BACKFILL_ENABLED: 'true',
      GROWTH_DESTINY_BACKFILL_SCOPE: 'full',
      GROWTH_DESTINY_BACKFILL_REQUEST_BUDGET: '1',
    });
    await runScheduled();
    expect(calls).toHaveLength(1);
    expect(backfillRow(OCID_Q1)).toMatchObject({ status: 'pending', last_checked_date: dates[0] });
    await runScheduled();
    expect(calls).toHaveLength(2);
    await runScheduled();
    expect(calls.map((call) => call.date)).toEqual(dates);
    expect(backfillRow(OCID_Q1)).toMatchObject({ status: 'completed', last_checked_date: dates[2] });
  });
});

describe('normal equipment snapshots and the historical gate', () => {
  it.each([
    ['disabled', {}],
    ['outside canary', {
      GROWTH_DESTINY_BACKFILL_ENABLED: 'true',
      GROWTH_DESTINY_BACKFILL_CANARY_OCIDS: OCID_Q1,
    }],
  ] as const)('retains a new profile soul baseline while history is %s', async (_scope, gate) => {
    env = makeEnv({ ...gate, GROWTH_EQUIPMENT_DATE_CONCURRENCY: '1', GROWTH_BACKFILL_BATCH_SIZE: '1' });
    await createGrowthProfile(env.DB, OCID_P, '2026-08-03');
    local.sqlite.prepare(`
      UPDATE growth_profiles SET status='completed', basic_last_synced_date='2026-08-03',
        dojang_last_synced_date='2026-08-03', last_synced_date='2026-08-03' WHERE ocid=?
    `).run(OCID_P);
    const insert = local.sqlite.prepare(`
      INSERT INTO growth_snapshots (ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, liberation_status, fetched_at, updated_at)
      VALUES (?, ?, '測試角色', '艾麗亞', '主教', 295, 0, 0, ?, 'now', 'now')
    `);
    insert.run(OCID_P, '2026-01-01', '2'); // Destiny-only historical candidate.
    insert.run(OCID_P, '2026-07-20', '1'); // Soul baseline before the cutoff.
    insert.run(OCID_P, '2026-08-02', '1');
    insert.run(OCID_P, '2026-08-03', '1');
    local.sqlite.prepare(`
      INSERT INTO growth_astra_tracking (ocid, last_synced_date, has_astra, updated_at)
      VALUES (?, '2026-08-03', 1, 'now')
    `).run(OCID_P);
    installFetch({ [OCID_P]: { '2026-01-01': 'p2' } }, (call) => {
      if (call.ocid !== OCID_P || call.endpoint !== 'item-equipment') return null;
      if (call.date === '2026-07-20') return Response.json({ item_equipment: [{
        item_equipment_slot: '武器', item_name: '測試長杖', soul_name: '武公靈魂寶珠',
      }] });
      if (call.date === '2026-08-02' || call.date === '2026-08-03') return Response.json({ item_equipment: [{
        item_equipment_slot: '武器', item_name: '測試長杖',
        soul_weapon_grade: call.date === '2026-08-02' ? '第 7 階段' : '第 8 階段',
      }] });
      return null;
    });

    await backfillGrowthEquipmentBatch(env, { usedRequests: 0, maxRequests: 50 });
    expect(local.sqlite.prepare(`
      SELECT last_synced_date, previous_soul_name, previous_weapon_name FROM growth_soul_tracking WHERE ocid=?
    `).get(OCID_P)).toEqual({
      last_synced_date: '2026-07-20', previous_soul_name: '武公靈魂寶珠', previous_weapon_name: '測試長杖',
    });
    await backfillGrowthEquipmentBatch(env, { usedRequests: 0, maxRequests: 50 });
    await backfillGrowthEquipmentBatch(env, { usedRequests: 0, maxRequests: 50 });
    expect(calls.map((call) => call.date)).toEqual(['2026-07-20', '2026-08-02', '2026-08-03']);
    expect(backfillRow(OCID_P)).toBeUndefined();
    expect(local.sqlite.prepare(`
      SELECT snapshot_date, event_type, before_value, after_value FROM growth_soul_events
      WHERE ocid=? AND event_type IN ('soul_conversion', 'soul_grade') ORDER BY snapshot_date
    `).all(OCID_P)).toEqual([
      { snapshot_date: '2026-08-02', event_type: 'soul_conversion', before_value: '武公靈魂寶珠', after_value: '靈魂武器第 7 階段' },
      { snapshot_date: '2026-08-03', event_type: 'soul_grade', before_value: '第 7 階段', after_value: '第 8 階段' },
    ]);

    // Later enabling the full history must still discover the older candidate.
    calls.length = 0;
    env = makeEnv({ GROWTH_DESTINY_BACKFILL_ENABLED: 'true', GROWTH_DESTINY_BACKFILL_SCOPE: 'full' });
    await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 50 });
    expect(calls.map((call) => call.date)).toEqual(['2026-01-01']);
    expect(backfillRow(OCID_P)).toMatchObject({ status: 'completed', target_date: '2026-08-03' });
    expect(phase2Events(OCID_P)).toEqual([
      { snapshot_date: '2026-01-01', before_value: '', after_value: '首次觀測到命運二階' },
    ]);
  });

  it('keeps the original history target, Soul and Astra events when daily equipment advances', async () => {
    env = makeEnv({ GROWTH_DESTINY_BACKFILL_ENABLED: 'true', GROWTH_DESTINY_BACKFILL_SCOPE: 'full', GROWTH_EQUIPMENT_DATE_CONCURRENCY: '1' });
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];
    await seedCaughtUp(OCID_Q1, dates, '2');
    local.sqlite.prepare(`
      INSERT INTO growth_soul_events (ocid, snapshot_date, event_type, before_value, after_value)
      VALUES (?, '2026-07-01', 'soul_grade', '第 7 階段', '第 8 階段')
    `).run(OCID_Q1);
    local.sqlite.prepare(`
      INSERT INTO growth_astra_events (ocid, snapshot_date, before_value, after_value)
      VALUES (?, '2026-07-02', '既有副武器', '阿斯特拉輔助武器')
    `).run(OCID_Q1);
    await ensureDestinyBackfillRegistered(env.DB);
    expect(backfillRow(OCID_Q1)).toMatchObject({ target_date: dates[2], last_checked_date: null });

    vi.setSystemTime(new Date('2026-08-05T02:00:00+08:00'));
    local.sqlite.prepare(`
      INSERT INTO growth_snapshots (ocid, snapshot_date, character_name, world_name, job_name,
        character_level, character_exp, character_exp_rate, liberation_status, fetched_at, updated_at)
      VALUES (?, '2026-08-04', '測試角色', '艾麗亞', '主教', 295, 0, 0, '2', 'now', 'now')
    `).run(OCID_Q1);
    local.sqlite.prepare(`
      UPDATE growth_profiles SET basic_last_synced_date='2026-08-04', last_synced_date='2026-08-04'
      WHERE ocid=?
    `).run(OCID_Q1);
    installFetch({ [OCID_Q1]: {
      '2026-08-01': 'p1', '2026-08-02': 'p2', '2026-08-03': 'p2', '2026-08-04': 'p2',
    } });
    await backfillGrowthEquipmentBatch(env, { usedRequests: 0, maxRequests: 50 });
    expect(calls.map((call) => call.date)).toEqual(['2026-08-04']);
    expect(backfillRow(OCID_Q1)).toMatchObject({ target_date: '2026-08-03', last_checked_date: null });

    calls.length = 0;
    await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 50 });
    expect(calls.map((call) => call.date)).toEqual(dates);
    expect(backfillRow(OCID_Q1)).toMatchObject({ target_date: '2026-08-03', last_checked_date: '2026-08-03', status: 'completed' });
    expect(local.sqlite.prepare('SELECT last_synced_date FROM growth_soul_tracking WHERE ocid=?').get(OCID_Q1))
      .toEqual({ last_synced_date: '2026-08-04' });
    expect(local.sqlite.prepare(`
      SELECT snapshot_date, before_value, after_value FROM growth_soul_events
      WHERE ocid=? AND event_type='soul_grade'
    `).all(OCID_Q1)).toEqual([
      { snapshot_date: '2026-07-01', before_value: '第 7 階段', after_value: '第 8 階段' },
    ]);
    expect(local.sqlite.prepare('SELECT snapshot_date, before_value, after_value FROM growth_astra_events WHERE ocid=?').all(OCID_Q1))
      .toEqual([{ snapshot_date: '2026-07-02', before_value: '既有副武器', after_value: '阿斯特拉輔助武器' }]);
    expect(local.sqlite.prepare('SELECT DISTINCT liberation_status FROM growth_snapshots WHERE ocid=?').all(OCID_Q1))
      .toEqual([{ liberation_status: '2' }]);
    expect(phase2Events(OCID_Q1)).toEqual([
      { snapshot_date: '2026-08-02', before_value: '命運一階', after_value: '命運二階' },
    ]);
  });
});

describe('Destiny historical backfill: spot check of profiles without candidate snapshots', () => {
  it('promotes a spot-check positive back to a full scan (even from completed), keeps negatives recorded as negative only', async () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];
    await seedCaughtUp(OCID_R, dates, '1');
    await seedCaughtUp(OCID_S, dates, '1');
    installFetch({
      [OCID_R]: { [dates[0]]: 'genesis', [dates[1]]: 'p1', [dates[2]]: 'p2' },
      [OCID_S]: { [dates[0]]: 'genesis', [dates[1]]: 'genesis', [dates[2]]: 'genesis' },
    });

    // Canary R only: spot check (latest saved date) -> positive -> promoted -> full scan, same invocation.
    env = makeEnv({
      GROWTH_DESTINY_BACKFILL_ENABLED: 'true',
      GROWTH_DESTINY_BACKFILL_CANARY_OCIDS: OCID_R,
    });
    await runScheduled();
    expect(calls.filter((call) => call.ocid === OCID_R).map((call) => call.date))
      .toEqual([dates[2], ...dates]);
    expect(countFor(OCID_S)).toBe(0);
    expect(backfillRow(OCID_R)).toMatchObject({
      status: 'completed',
      spot_check_status: 'positive',
      spot_check_date: dates[2],
      scan_all: 1,
      last_checked_date: dates[2],
    });
    expect(backfillRow(OCID_S)).toBeUndefined();
    expect(local.sqlite.prepare('SELECT earliest_destiny_phase1_date AS p1, earliest_destiny_phase2_date AS p2 FROM growth_soul_tracking WHERE ocid = ?').get(OCID_R))
      .toEqual({ p1: dates[1], p2: dates[2] });
    expect(phase2Events(OCID_R)).toEqual([
      { snapshot_date: dates[2], before_value: '命運一階', after_value: '命運二階' },
    ]);
    // Raw Basic liberation_status is untouched by equipment evidence.
    expect(local.sqlite.prepare('SELECT DISTINCT liberation_status AS s FROM growth_snapshots WHERE ocid = ?').all(OCID_R))
      .toEqual([{ s: '1' }]);

    // Full scope: S gets its single spot check; a negative is recorded, never as "excluded forever".
    calls.length = 0;
    env = makeEnv({ GROWTH_DESTINY_BACKFILL_ENABLED: 'true', GROWTH_DESTINY_BACKFILL_SCOPE: 'full' });
    await runScheduled();
    expect(calls.map((call) => [call.ocid, call.date])).toEqual([[OCID_S, dates[2]]]);
    expect(backfillRow(OCID_S)).toMatchObject({
      status: 'completed',
      spot_check_status: 'negative',
      scan_all: 0,
    });
    expect(phase2Events(OCID_S)).toEqual([]);

    // Finished: later crons issue nothing.
    calls.length = 0;
    await runScheduled();
    expect(calls).toEqual([]);
  });

  it('retries a failed spot check and preserves it when a retry exhausts the request budget', async () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];
    await seedCaughtUp(OCID_R, dates, '1');
    env = makeEnv({
      GROWTH_DESTINY_BACKFILL_ENABLED: 'true',
      GROWTH_DESTINY_BACKFILL_SCOPE: 'full',
      GROWTH_EQUIPMENT_DATE_CONCURRENCY: '1',
      NEXON_RETRY_LIMIT: '2',
    });
    installFetch({}, () => new Response('temporary 503', { status: 503, headers: { 'retry-after': '0' } }));

    const firstBudget = { usedRequests: 0, maxRequests: 10 };
    await backfillGrowthDestinySpotCheckBatch(env, firstBudget);
    expect(calls.map((call) => call.date)).toEqual([dates[2], dates[2]]);
    expect(firstBudget.usedRequests).toBe(2);
    expect(backfillRow(OCID_R)).toMatchObject({ status: 'completed', spot_check_status: 'pending', claim_token: null });
    expect(backfillRow(OCID_R).retry_at).toBeTruthy();
    expect(phase2Events(OCID_R)).toEqual([]);

    local.sqlite.prepare('UPDATE growth_destiny_backfill SET retry_at=NULL WHERE ocid=?').run(OCID_R);
    calls.length = 0;
    const exhaustedBudget = { usedRequests: 0, maxRequests: 1 };
    await backfillGrowthDestinySpotCheckBatch(env, exhaustedBudget);
    expect(calls.map((call) => call.date)).toEqual([dates[2]]);
    expect(exhaustedBudget.usedRequests).toBe(1);
    expect(backfillRow(OCID_R)).toMatchObject({
      status: 'completed', spot_check_status: 'pending', claim_token: null, retry_at: null,
    });

    calls.length = 0;
    installFetch({ [OCID_R]: { [dates[0]]: 'genesis', [dates[1]]: 'p1', [dates[2]]: 'p2' } });
    await backfillGrowthDestinySpotCheckBatch(env, { usedRequests: 0, maxRequests: 10 });
    expect(calls.map((call) => call.date)).toEqual([dates[2]]);
    expect(backfillRow(OCID_R)).toMatchObject({ status: 'pending', spot_check_status: 'positive', scan_all: 1, last_checked_date: null });
    calls.length = 0;
    await backfillGrowthDestinyHistoryBatch(env, { usedRequests: 0, maxRequests: 10 });
    expect(calls.map((call) => call.date)).toEqual(dates);
    expect(backfillRow(OCID_R)).toMatchObject({ status: 'completed', last_checked_date: dates[2] });
    expect(phase2Events(OCID_R)).toEqual([
      { snapshot_date: dates[2], before_value: '命運一階', after_value: '命運二階' },
    ]);
  });
});

describe('Destiny historical backfill: one shared budget across all four phases', () => {
  it('lets Basic, Dojang, daily Equipment and Destiny history share one budget and resumes next cron', async () => {
    const qDates = ['2026-08-01', '2026-08-02', '2026-08-03'];
    await seedCaughtUp(OCID_Q1, qDates, '2');
    await seedNewProfile(OCID_P);
    installFetch({ [OCID_Q1]: Object.fromEntries(qDates.map((date) => [date, 'p2' as Kind])) });
    env = makeEnv({
      GROWTH_INVOCATION_REQUEST_BUDGET: '7',
      GROWTH_BACKFILL_BATCH_SIZE: '2',
      GROWTH_DESTINY_BACKFILL_ENABLED: 'true',
      GROWTH_DESTINY_BACKFILL_SCOPE: 'canary',
      GROWTH_DESTINY_BACKFILL_CANARY_OCIDS: OCID_Q1,
      GROWTH_DESTINY_BACKFILL_REQUEST_BUDGET: '100',
    });

    await runScheduled();
    // 2 basic + 2 dojang + 2 daily equipment for P leave exactly 1 unit for Destiny history of Q1.
    expect(countFor(OCID_P, 'basic')).toBe(2);
    expect(countFor(OCID_P, 'dojang')).toBe(2);
    expect(countFor(OCID_P, 'item-equipment')).toBe(2);
    expect(countFor(OCID_Q1, 'item-equipment')).toBe(1);
    expect(calls).toHaveLength(7);
    expect(backfillRow(OCID_Q1)).toMatchObject({ status: 'pending', last_checked_date: qDates[0] });

    // Next cron (fresh budget): only the remaining Destiny dates, nothing re-fetched.
    calls.length = 0;
    await runScheduled();
    expect(calls.map((call) => [call.ocid, call.endpoint, call.date])).toEqual([
      [OCID_Q1, 'item-equipment', qDates[1]],
      [OCID_Q1, 'item-equipment', qDates[2]],
    ]);
    expect(backfillRow(OCID_Q1)).toMatchObject({ status: 'completed', last_checked_date: qDates[2] });
  });
});
