import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Growth scheduler routing', () => {
  it('keeps the account worker explicit and excludes Growth', () => {
    const worker = read('workers/account-signals-consumer.ts');
    expect(worker).toMatch(/metadata:\s*true/);
    expect(worker).toMatch(/accountSignals:\s*true/);
    expect(worker).toMatch(/accountChampionSignals:\s*true/);
    expect(worker).toMatch(/growth:\s*false/);
    expect(worker).toMatch(/guild:\s*true/);
  });

  it('keeps the Growth worker Growth-only', () => {
    const worker = read('workers/growth-consumer.ts');
    expect(worker).toMatch(/backfillGrowthBatch\(env\)/);
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
