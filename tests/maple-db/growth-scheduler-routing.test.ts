import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../functions/_shared/env';
import { createGrowthProfile } from '../../functions/_shared/growth-tracker';
import growthConsumer from '../../workers/growth-consumer';
import { createTestD1 } from './sqlite-d1';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Growth scheduler routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the account worker explicit and excludes Growth', () => {
    const worker = read('workers/account-signals-consumer.ts');
    expect(worker).toMatch(/metadata:\s*true/);
    expect(worker).toMatch(/accountSignals:\s*true/);
    expect(worker).toMatch(/accountChampionSignals:\s*true/);
    expect(worker).toMatch(/growth:\s*false/);
    expect(worker).toMatch(/guild:\s*true/);
  });

  it('keeps the Growth worker Growth-only and shares budget across phases without post-hoc double counting', () => {
    const worker = read('workers/growth-consumer.ts');
    expect(worker).toMatch(/backfillGrowthBatch\(env,\s*budget\)/);
    expect(worker).toMatch(/backfillGrowthEquipmentBatch\(env,\s*budget\)/);
    expect(worker).not.toMatch(/budget\.usedRequests\s*\+=/);
    expect(worker).not.toContain('consumeQueueBatch');
    for (const forbiddenImport of [
      'account-signal-backfill',
      'consumer-coordination',
      'character-metadata-refresh',
      'guild-import',
      'retention',
    ]) {
      expect(worker).not.toContain(forbiddenImport);
    }
  });

  it('shares and hands off a single invocation request budget across basic, dojang, and equipment inside scheduled(), then resumes on the next cron invocation', async () => {
    const local = createTestD1();
    try {
      const ocid = 'a3e399217d603631033dd65ebaa08275';
      const env: Env = {
        DB: local.db,
        SURVEY_DB: local.db,
        NEXON_API_KEY: 'test-only',
        NEXON_RETRY_LIMIT: '2',
        NEXON_REQUEST_TIMEOUT_MS: '1000',
        GROWTH_BACKFILL_BATCH_SIZE: '2',
        GROWTH_DATE_CONCURRENCY: '2',
        GROWTH_EQUIPMENT_DATE_CONCURRENCY: '2',
        GROWTH_PROFILE_CONCURRENCY: '1',
        // 2 dates require: 2 basic + 2 dojang + 2 equipment = 6 total requests.
        // Setting budget to 5 proves basic (2) + dojang (2) leave exactly 1 remaining slot for equipment.
        GROWTH_INVOCATION_REQUEST_BUDGET: '5',
      };
      await createGrowthProfile(env.DB, ocid, '2099-08-02');
      local.sqlite.prepare(`
        UPDATE growth_profiles
        SET scan_start_date = '2099-08-01', current_processing_date = '2099-08-01'
        WHERE ocid = ?
      `).run(ocid);

      const recordedCalls: Array<{ endpoint: string; date: string | null }> = [];
      vi.stubGlobal('fetch', vi.fn(async (input: string) => {
        const url = new URL(input);
        const date = url.searchParams.get('date');
        recordedCalls.push({ endpoint: url.pathname, date });
        const effectiveDate = date || '2099-08-01';
        if (url.pathname.endsWith('/character/basic')) {
          return Response.json({
            date: `${effectiveDate}T00:00+08:00`,
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
        if (url.pathname.endsWith('/character/dojang')) {
          return Response.json({
            date: `${effectiveDate}T00:00+08:00`,
            dojang_best_floor: 80,
            dojang_best_time: 500,
            date_dojang_record: `${effectiveDate}T00:00+08:00`,
          });
        }
        return Response.json({ item_equipment: [] });
      }));

      const runCronInvocation = async () => {
        const waitPromises: Promise<unknown>[] = [];
        growthConsumer.scheduled(
          {} as ScheduledController,
          env,
          {
            waitUntil: (promise: Promise<unknown>) => {
              waitPromises.push(promise);
            },
            passThroughOnException: () => undefined,
          } as unknown as ExecutionContext,
        );
        await Promise.all(waitPromises);
      };

      // First cron invocation: budget = 5
      await runCronInvocation();

      const countByEndpoint = (calls: Array<{ endpoint: string; date: string | null }>) => ({
        basic: calls.filter((c) => c.endpoint.endsWith('/character/basic')).length,
        dojang: calls.filter((c) => c.endpoint.endsWith('/character/dojang')).length,
        equipment: calls.filter((c) => c.endpoint.endsWith('/character/item-equipment')).length,
        total: calls.length,
      });

      expect(countByEndpoint(recordedCalls)).toEqual({
        basic: 2,
        dojang: 2,
        equipment: 1,
        total: 5,
      });
      expect(
        recordedCalls
          .filter((c) => c.endpoint.endsWith('/character/item-equipment'))
          .map((c) => c.date),
      ).toEqual(['2099-08-01']);

      // Verify checkpoints after first cron invocation:
      // basic & dojang finished 2099-08-02, while equipment stopped cleanly at 2099-08-01
      const profileAfterFirstRun = local.sqlite
        .prepare('SELECT status, basic_last_synced_date, last_synced_date FROM growth_profiles WHERE ocid = ?')
        .get(ocid) as { status: string; basic_last_synced_date: string; last_synced_date: string };
      expect(profileAfterFirstRun).toEqual({
        status: 'completed',
        basic_last_synced_date: '2099-08-02',
        last_synced_date: '2099-08-02',
      });
      const soulAfterFirstRun = local.sqlite
        .prepare('SELECT last_synced_date, claim_token FROM growth_soul_tracking WHERE ocid = ?')
        .get(ocid) as { last_synced_date: string | null; claim_token: string | null };
      expect(soulAfterFirstRun).toEqual({
        last_synced_date: '2099-08-01',
        claim_token: null,
      });

      // Second cron invocation: resumes remaining equipment date (2099-08-02) with fresh budget
      recordedCalls.length = 0;
      await runCronInvocation();

      expect(countByEndpoint(recordedCalls)).toEqual({
        basic: 0,
        dojang: 0,
        equipment: 1,
        total: 1,
      });
      expect(recordedCalls[0]).toMatchObject({
        endpoint: '/maplestorytw/v1/character/item-equipment',
        date: '2099-08-02',
      });
      const soulAfterSecondRun = local.sqlite
        .prepare('SELECT last_synced_date, claim_token FROM growth_soul_tracking WHERE ocid = ?')
        .get(ocid) as { last_synced_date: string | null; claim_token: string | null };
      expect(soulAfterSecondRun).toEqual({
        last_synced_date: '2099-08-02',
        claim_token: null,
      });
    } finally {
      local.sqlite.close();
    }
  });

  it('counts retries and concurrent profile requests against the shared invocation budget inside scheduled() and resumes cleanly on the next run', async () => {
    const local = createTestD1();
    try {
      const ocid1 = 'a3e399217d603631033dd65ebaa08275';
      const ocid2 = 'b4f400328e714742144ee76fcbb19386';
      const env: Env = {
        DB: local.db,
        SURVEY_DB: local.db,
        NEXON_API_KEY: 'test-only',
        NEXON_RETRY_LIMIT: '2',
        NEXON_REQUEST_TIMEOUT_MS: '1000',
        GROWTH_BACKFILL_BATCH_SIZE: '2',
        GROWTH_DATE_CONCURRENCY: '2',
        GROWTH_EQUIPMENT_DATE_CONCURRENCY: '2',
        GROWTH_PROFILE_CONCURRENCY: '2',
        GROWTH_INVOCATION_REQUEST_BUDGET: '4',
      };
      for (const ocid of [ocid1, ocid2]) {
        await createGrowthProfile(env.DB, ocid, '2099-08-01');
        local.sqlite.prepare(`
          UPDATE growth_profiles
          SET scan_start_date = '2099-08-01', current_processing_date = '2099-08-01'
          WHERE ocid = ?
        `).run(ocid);
      }

      const recordedCalls: Array<{ endpoint: string; ocid: string | null }> = [];
      let transientFailuresRemaining = 2;
      vi.stubGlobal('fetch', vi.fn(async (input: string) => {
        const url = new URL(input);
        const ocid = url.searchParams.get('ocid');
        const date = url.searchParams.get('date') || '2099-08-01';
        recordedCalls.push({ endpoint: url.pathname, ocid });

        if (url.pathname.endsWith('/character/basic') && transientFailuresRemaining > 0) {
          transientFailuresRemaining -= 1;
          return new Response('transient 503', { status: 503, headers: { 'retry-after': '0' } });
        }
        if (url.pathname.endsWith('/character/basic')) {
          return Response.json({
            date: `${date}T00:00+08:00`,
            character_name: ocid === ocid1 ? '角色一' : '角色二',
            world_name: '艾麗亞',
            character_class: '主教',
            character_level: 285,
            character_exp: 1000,
            character_exp_rate: '10.000',
            character_guild_name: '公會',
            liberation_quest_clear: '2',
          });
        }
        if (url.pathname.endsWith('/character/dojang')) {
          return Response.json({
            date: `${date}T00:00+08:00`,
            dojang_best_floor: 80,
            dojang_best_time: 500,
            date_dojang_record: `${date}T00:00+08:00`,
          });
        }
        return Response.json({ item_equipment: [] });
      }));

      const runCronInvocation = async () => {
        const waitPromises: Promise<unknown>[] = [];
        growthConsumer.scheduled(
          {} as ScheduledController,
          env,
          {
            waitUntil: (promise: Promise<unknown>) => {
              waitPromises.push(promise);
            },
            passThroughOnException: () => undefined,
          } as unknown as ExecutionContext,
        );
        await Promise.all(waitPromises);
      };

      // First cron run: concurrent profiles + 2 transient 503 retries hit the 4-request budget cap mid-flight.
      // Dojang and equipment cannot run in this invocation because the shared budget is already 4/4.
      await runCronInvocation();

      expect(recordedCalls.length).toBe(4);
      expect(recordedCalls.every((c) => c.endpoint.endsWith('/character/basic'))).toBe(true);
      expect(recordedCalls.filter((c) => c.endpoint.endsWith('/character/dojang')).length).toBe(0);
      expect(recordedCalls.filter((c) => c.endpoint.endsWith('/character/item-equipment')).length).toBe(0);

      // Next cron run with budget sufficient for remaining phases (2 dojang + 2 equipment = 4 requests)
      recordedCalls.length = 0;
      local.sqlite.prepare(`UPDATE growth_profiles SET next_retry_at = NULL`).run();
      await runCronInvocation();

      expect(recordedCalls.filter((c) => c.endpoint.endsWith('/character/basic')).length).toBe(0);
      expect(recordedCalls.filter((c) => c.endpoint.endsWith('/character/dojang')).length).toBe(2);
      expect(recordedCalls.filter((c) => c.endpoint.endsWith('/character/item-equipment')).length).toBe(2);
      expect(recordedCalls.length).toBe(4);

      const completedProfiles = local.sqlite
        .prepare('SELECT ocid, status, last_synced_date FROM growth_profiles ORDER BY ocid')
        .all() as Array<{ ocid: string; status: string; last_synced_date: string }>;
      expect(completedProfiles).toEqual([
        { ocid: ocid1, status: 'completed', last_synced_date: '2099-08-01' },
        { ocid: ocid2, status: 'completed', last_synced_date: '2099-08-01' },
      ]);
      const completedSoul = local.sqlite
        .prepare('SELECT ocid, last_synced_date FROM growth_soul_tracking ORDER BY ocid')
        .all() as Array<{ ocid: string; last_synced_date: string }>;
      expect(completedSoul).toEqual([
        { ocid: ocid1, last_synced_date: '2099-08-01' },
        { ocid: ocid2, last_synced_date: '2099-08-01' },
      ]);
    } finally {
      local.sqlite.close();
    }
  });

  it('preserves the account stop-loss and gives Growth its own minute cron', () => {
    const accountConfig = read('wrangler.account-signals.toml');
    const growthConfig = read('wrangler.growth.toml');
    expect(accountConfig).toContain('crons = ["*/30 * * * *", "17 3 * * *"]');
    expect(accountConfig).not.toContain('GROWTH_');
    expect(growthConfig).toContain('crons = ["* * * * *"]');
    expect(growthConfig).toContain('name = "holybear-growth"');
    expect(growthConfig).toContain('GROWTH_MAX_BATCHES_PER_INVOCATION = "48"');
    expect(growthConfig).toContain('GROWTH_PROFILE_CONCURRENCY = "4"');
    expect(growthConfig).toContain('GROWTH_NEW_PROFILE_24H_LIMIT = "2500"');
    expect(growthConfig).toContain('GROWTH_PENDING_PROFILE_LIMIT = "2500"');
    expect(growthConfig).toContain('NEXON_GLOBAL_RPS_LIMIT = "50"');
    expect(growthConfig).toContain('name = "NEXON_RATE_LIMITER"');
    expect(growthConfig).toContain('script_name = "holybear-nexon-rate-limiter"');
    expect(growthConfig).not.toContain('EVIDENCE_ARCHIVE');
    expect(growthConfig).not.toContain('ACCOUNT_SIGNAL_');
    expect(growthConfig).not.toContain('NEXON_API_KEY');
  });
});
