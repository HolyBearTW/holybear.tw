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

  it('shares a single invocation request budget across basic, dojang, and equipment inside scheduled()', async () => {
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
        GROWTH_PROFILE_CONCURRENCY: '1',
        GROWTH_INVOCATION_REQUEST_BUDGET: '3',
      };
      await createGrowthProfile(env.DB, ocid, '2026-08-02');
      local.sqlite.prepare(`
        UPDATE growth_profiles
        SET scan_start_date = '2026-08-01', current_processing_date = '2026-08-01'
        WHERE ocid = ?
      `).run(ocid);

      let fetchCalls = 0;
      vi.stubGlobal('fetch', vi.fn(async (input: string) => {
        fetchCalls += 1;
        const url = new URL(input);
        const date = url.searchParams.get('date') || '2026-08-01';
        if (url.pathname.endsWith('/character/basic')) {
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

      // Total NEXON HTTP requests across the entire cron invocation must never exceed budget (3)
      expect(fetchCalls).toBe(3);
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
