import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeQueueBatch,
  getConsumerFailoverStatus,
  runFallbackConsumer,
} from '../../functions/_shared/consumer-coordination';
import { enqueueCharacterMetadataRefreshes } from '../../functions/_shared/character-metadata-refresh';
import { onRequestPost as postFallback } from '../../functions/api/internal/consumer/fallback';
import type { Env } from '../../functions/_shared/env';
import { createTestD1 } from './sqlite-d1';

let local: ReturnType<typeof createTestD1>;
let env: Env;
const baseTime = '2026-09-08T00:00:00.000Z';

const installCharacterApi = () => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = new URL(input).pathname;
    if (path.endsWith('/id')) return Response.json({ ocid: 'fallback-ocid' });
    if (path.endsWith('/character/basic')) return Response.json({
      date: baseTime,
      character_name: '待補角色',
      world_name: '艾麗亞',
      character_class: '主教',
      character_level: 285,
      character_image: 'image',
      character_guild_name: null,
    });
    if (path.endsWith('/character/stat')) return Response.json({
      date: baseTime,
      final_stat: [{ stat_name: '戰鬥力', stat_value: '12345678' }],
    });
    throw new Error(`Unexpected endpoint ${path}`);
  }));
};

beforeEach(() => {
  local = createTestD1();
  env = {
    DB: local.db,
    SURVEY_DB: local.db,
    NEXON_API_KEY: 'test-only',
    CONSUMER_FALLBACK_SECRET: 'fallback-only-secret',
    CONSUMER_PRIMARY_HEARTBEAT_FRESHNESS_SECONDS: '300',
    NEXON_RETRY_LIMIT: '1',
    NEXON_REQUEST_DELAY_MS: '0',
    CHARACTER_METADATA_REFRESH_BATCH_SIZE: '8',
    CHARACTER_METADATA_REFRESH_CONCURRENCY: '4',
    CHARACTER_METADATA_REFRESH_DELAY_MS: '0',
  };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(baseTime);
});

afterEach(() => {
  local.sqlite.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('consumer scheduler failover', () => {
  it('skips fallback while the Cloudflare invocation heartbeat is fresh', async () => {
    await consumeQueueBatch(env, 'cloudflare_cron', { metadata: false, accountSignals: false });
    await enqueueCharacterMetadataRefreshes(env.DB, [{
      characterName: '待補角色', expectedWorldName: '艾麗亞', reason: 'missing_character',
    }]);
    const result = await runFallbackConsumer(env);
    expect(result).toMatchObject({ executed: false, reason: 'primary_heartbeat_fresh' });
    expect(local.sqlite.prepare(`SELECT status, attempt_count FROM character_metadata_refresh`).get())
      .toMatchObject({ status: 'pending', attempt_count: 0 });
  });

  it('skips fallback when primary is stale but no pending or due retry exists', async () => {
    const result = await runFallbackConsumer(env);
    expect(result).toMatchObject({ executed: false, reason: 'no_immediate_work' });
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM consumer_heartbeat`).get()?.count).toBe(0);
  });

  it('uses a bounded fallback batch when primary is stale and work is eligible', async () => {
    installCharacterApi();
    await enqueueCharacterMetadataRefreshes(env.DB, [{
      characterName: '待補角色', expectedWorldName: '艾麗亞', reason: 'missing_character',
    }]);
    const result = await runFallbackConsumer(env);
    expect(result).toMatchObject({
      executed: true,
      batch: { source: 'github_actions_fallback', result: { metadata: { processed: 1, completed: 1 } } },
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
    expect(local.sqlite.prepare(`SELECT status FROM character_metadata_refresh`).get()?.status).toBe('completed');
    expect(local.sqlite.prepare(`SELECT last_success_at, last_error FROM consumer_heartbeat
      WHERE consumer_source='github_actions_fallback'`).get()).toMatchObject({
      last_success_at: baseTime, last_error: null,
    });
  });

  it('keeps a single queue owner when primary and fallback overlap', async () => {
    installCharacterApi();
    await enqueueCharacterMetadataRefreshes(env.DB, [{
      characterName: '待補角色', expectedWorldName: '艾麗亞', reason: 'missing_character',
    }]);
    const [primary, fallback] = await Promise.all([
      consumeQueueBatch(env, 'cloudflare_cron', { metadata: true, accountSignals: false }),
      consumeQueueBatch(env, 'github_actions_fallback', { metadata: true, accountSignals: false }),
    ]);
    const processed = [primary, fallback].reduce(
      (sum, run) => sum + Number((run.result.metadata as { processed: number }).processed),
      0,
    );
    expect(processed).toBe(1);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
    expect(local.sqlite.prepare(`SELECT attempt_count FROM character_metadata_refresh`).get()?.attempt_count).toBe(1);
  });

  it('reports primary freshness, active source, successful run and queue counts', async () => {
    await consumeQueueBatch(env, 'cloudflare_cron', { metadata: false, accountSignals: false });
    await enqueueCharacterMetadataRefreshes(env.DB, [{
      characterName: '待補角色', expectedWorldName: '艾麗亞', reason: 'missing_character',
    }]);
    const status = await getConsumerFailoverStatus(env);
    expect(status).toMatchObject({
      primarySchedulerHeartbeat: { fresh: true, lastInvokedAt: baseTime, lastSuccessAt: baseTime },
      currentActiveSource: 'cloudflare_cron',
      lastSuccessfulConsumerRun: { consumerSource: 'cloudflare_cron', at: baseTime },
      queues: { pendingMetadata: 1, pendingAccountSignals: 0, hasImmediateWork: true },
    });
  });

  it('does not treat a recent failed primary invocation as a healthy heartbeat', async () => {
    local.sqlite.prepare(`INSERT INTO consumer_heartbeat (
      consumer_source, last_invoked_at, last_error_at, last_error, updated_at
    ) VALUES ('cloudflare_cron', ?, ?, 'batch failed', ?)`)
      .run(baseTime, baseTime, baseTime);
    const status = await getConsumerFailoverStatus(env);
    expect(status.primarySchedulerHeartbeat).toMatchObject({
      fresh: false,
      lastInvokedAt: baseTime,
      lastErrorAt: baseTime,
      lastError: 'batch failed',
    });
    expect(status.currentActiveSource).toBeNull();
  });

  it('rejects an unauthorized fallback request before inspecting or consuming queues', async () => {
    await enqueueCharacterMetadataRefreshes(env.DB, [{
      characterName: '待補角色', expectedWorldName: '艾麗亞', reason: 'missing_character',
    }]);
    const response = await postFallback({
      env,
      request: new Request('https://holybear.tw/api/internal/consumer/fallback', {
        method: 'POST', headers: { authorization: 'Bearer wrong-secret' },
      }),
    } as never);
    expect(response.status).toBe(401);
    expect(local.sqlite.prepare(`SELECT status, attempt_count FROM character_metadata_refresh`).get())
      .toMatchObject({ status: 'pending', attempt_count: 0 });
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM consumer_heartbeat`).get()?.count).toBe(0);
  });
});
