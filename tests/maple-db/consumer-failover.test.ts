import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeQueueBatch,
  getConsumerFailoverStatus,
  runFallbackConsumer,
} from '../../functions/_shared/consumer-coordination';
import { enqueueCharacterMetadataRefreshes } from '../../functions/_shared/character-metadata-refresh';
import { createGrowthProfile } from '../../functions/_shared/growth-tracker';
import { checkpointSeedPage, getImportJob, getOrCreateImportJob } from '../../functions/_shared/import-repository';
import { resolveGuildMembers, withGuildImportLock } from '../../functions/_shared/guild-import';
import { upsertCanonicalNexonCharacter } from '../../functions/_shared/character-repository';
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

const seedGuildJob = async (characterName = '待補角色') => {
  const job = await getOrCreateImportJob(env.DB, 'nexon_guild');
  await checkpointSeedPage(env, job, {
    page: 1,
    pageSize: 1,
    total: 1,
    complete: true,
    items: [{
      sourceId: JSON.stringify(['艾麗亞', characterName]),
      characterName,
      worldName: '艾麗亞',
      jobName: '',
      level: 0,
      combatPower: 0,
      characterImage: '',
    }],
  });
  return (await getImportJob(env.DB, job.id))!;
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

  it('counts every eligible Growth profile for fallback, not a shadow allowlist', async () => {
    await createGrowthProfile(env.DB, 'b3e399217d603631033dd65ebaa08275', '2026-09-07');
    const status = await getConsumerFailoverStatus(env);
    expect(status.queues).toMatchObject({ pendingGrowthProfiles: 1, hasImmediateWork: true });
  });

  it('recovers a running staged guild job with a null lease', async () => {
    installCharacterApi();
    const job = await seedGuildJob();
    expect((await getConsumerFailoverStatus(env)).queues).toMatchObject({ pendingGuildJobs: 1 });
    const result = await consumeQueueBatch(env, 'cloudflare_cron', {
      metadata: false, accountSignals: false, growth: false, guild: true,
    });
    expect(result.result.guild).toMatchObject({ claimed: true, jobId: job.id, processed: 1 });
    expect((await getImportJob(env.DB, job.id))?.status).toBe('completed');
  });

  it('reclaims an expired guild lease', async () => {
    installCharacterApi();
    const job = await seedGuildJob();
    local.sqlite.prepare('UPDATE import_jobs SET lease_token=?, lease_until=? WHERE id=?')
      .run('expired-owner', '2026-09-07T23:59:59.000Z', job.id);
    const result = await consumeQueueBatch(env, 'cloudflare_cron', {
      metadata: false, accountSignals: false, growth: false, guild: true,
    });
    expect(result.result.guild).toMatchObject({ claimed: true, jobId: job.id, processed: 1 });
    expect(local.sqlite.prepare('SELECT lease_token, lease_until FROM import_jobs WHERE id=?').get(job.id))
      .toMatchObject({ lease_token: null, lease_until: null });
  });

  it('does not claim a guild job with an active lease', async () => {
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network access'); }));
    const job = await seedGuildJob();
    local.sqlite.prepare('UPDATE import_jobs SET lease_token=?, lease_until=? WHERE id=?')
      .run('active-owner', '2026-09-08T00:10:00.000Z', job.id);
    const result = await consumeQueueBatch(env, 'cloudflare_cron', {
      metadata: false, accountSignals: false, growth: false, guild: true,
    });
    expect(result.result.guild).toMatchObject({ claimed: false, processed: 0, reason: 'no_eligible_guild_job' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not duplicate a candidate when CLI and Cron overlap', async () => {
    installCharacterApi();
    const job = await seedGuildJob();
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const cli = withGuildImportLock(env, job.id, async () => {
      entered();
      await gate;
      return resolveGuildMembers(env, (await getImportJob(env.DB, job.id))!);
    });
    await started;
    const cron = await consumeQueueBatch(env, 'cloudflare_cron', {
      metadata: false, accountSignals: false, growth: false, guild: true,
    });
    expect(cron.result.guild).toMatchObject({ claimed: false, processed: 0 });
    release();
    await cli;
    expect(local.sqlite.prepare(`SELECT attempt_count FROM character_import_staging WHERE import_job_id=?`).get(job.id))
      .toMatchObject({ attempt_count: 1 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it('preserves a Cron lease and counters until CLI can claim the following batch', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      const name = url.searchParams.get('character_name') ?? url.searchParams.get('ocid')?.slice(5) ?? '';
      if (url.pathname.endsWith('/id')) return Response.json({ ocid: `ocid-${name}` });
      if (url.pathname.endsWith('/character/basic')) return Response.json({
        date: baseTime, character_name: name, world_name: '艾麗亞', character_class: '主教',
        character_level: 285, character_image: 'image', character_guild_name: null,
      });
      if (url.pathname.endsWith('/character/stat')) return Response.json({
        date: baseTime, final_stat: [{ stat_name: '戰鬥力', stat_value: '12345678' }],
      });
      throw new Error(`Unexpected endpoint ${url.pathname}`);
    }));
    const job = await seedGuildJob('角色A');
    await checkpointSeedPage(env, (await getImportJob(env.DB, job.id))!, {
      page: 2, pageSize: 1, total: 2, complete: true,
      items: [{ sourceId: JSON.stringify(['艾麗亞', '角色B']), characterName: '角色B', worldName: '艾麗亞',
        jobName: '', level: 0, combatPower: 0, characterImage: '' }],
    });
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const cron = withGuildImportLock(env, job.id, async () => {
      entered();
      await gate;
      return resolveGuildMembers(env, (await getImportJob(env.DB, job.id))!, { batchSize: 1, concurrency: 1 });
    });
    await started;
    const before = local.sqlite.prepare(`SELECT lease_token, lease_until, resolved_count, pending_count
      FROM import_jobs WHERE id=?`).get(job.id)!;
    await expect(withGuildImportLock(env, job.id, async () => null)).rejects.toThrow(/already running/);
    expect(local.sqlite.prepare(`SELECT lease_token, lease_until, resolved_count, pending_count
      FROM import_jobs WHERE id=?`).get(job.id)).toEqual(before);
    release();
    await expect(cron).resolves.toMatchObject({ processed: 1 });
    const cli = await withGuildImportLock(env, job.id, async () => (
      resolveGuildMembers(env, (await getImportJob(env.DB, job.id))!, { batchSize: 1, concurrency: 1 })
    ));
    expect(cli).toMatchObject({ processed: 1 });
    expect(local.sqlite.prepare(`SELECT attempt_count FROM character_import_staging
      WHERE import_job_id=? ORDER BY id`).all(job.id)).toEqual([{ attempt_count: 1 }, { attempt_count: 1 }]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(6);
  });

  it('skips GitHub fallback while a Cron-owned guild batch is active', async () => {
    installCharacterApi();
    const job = await seedGuildJob();
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const primary = withGuildImportLock(env, job.id, async () => {
      await env.DB.prepare(`INSERT INTO consumer_heartbeat (
        consumer_source, last_invoked_at, updated_at
      ) VALUES ('cloudflare_cron', ?1, ?1)`).bind(baseTime).run();
      entered();
      await gate;
      return resolveGuildMembers(env, (await getImportJob(env.DB, job.id))!);
    });
    await started;
    expect(await runFallbackConsumer(env)).toMatchObject({ executed: false, reason: 'primary_heartbeat_fresh' });
    release();
    await primary;
    expect(local.sqlite.prepare(`SELECT attempt_count FROM character_import_staging WHERE import_job_id=?`).get(job.id))
      .toMatchObject({ attempt_count: 1 });
  });

  it('gives metadata, account signals, Growth, and guild work a turn in the same invocation', async () => {
    vi.setSystemTime('2025-10-16T00:00:00.000Z');
    const observedAt = new Date().toISOString();
    await upsertCanonicalNexonCharacter(env.DB, {
      ocid: 'ocid-existing', characterName: '既有公會成員', worldName: '艾麗亞', jobName: '主教',
      level: 280, combatPower: 1_000, characterImage: 'image', guildName: '公會',
      observedAt, requestedAt: observedAt, nexonUpdatedAt: null,
    }, [{ source: 'nexon' }]);
    await enqueueCharacterMetadataRefreshes(env.DB, [{
      characterName: '待補角色', expectedWorldName: '艾麗亞', reason: 'missing_character',
    }]);
    await createGrowthProfile(env.DB, 'b3e399217d603631033dd65ebaa08275', '2025-10-15');
    await seedGuildJob('既有公會成員');
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/id')) return Response.json({ ocid: 'metadata-ocid' });
      if (url.pathname.endsWith('/character/basic')) return Response.json({
        date: '2025-10-15', character_name: url.searchParams.get('ocid') === 'metadata-ocid' ? '待補角色' : '成長角色',
        world_name: '艾麗亞', character_class: '主教', character_level: 280,
        character_exp: '100', character_exp_rate: '1.000', character_image: 'image', character_guild_name: null,
      });
      if (url.pathname.endsWith('/character/stat')) return Response.json({ final_stat: [{ stat_name: '戰鬥力', stat_value: '1000' }] });
      if (url.pathname.endsWith('/character/dojang')) return Response.json({
        date: '2025-10-15', character_dojang_best_floor: 0, character_dojang_best_time: 0, date_dojang_record: null,
      });
      if (url.pathname.endsWith('/user/union')) return Response.json({ union_level: 8000, union_grade: 'Grand Master Union' });
      if (url.pathname.endsWith('/user/union-raider')) return Response.json({ use_preset_no: 1, union_block: [] });
      throw new Error(`Unexpected endpoint ${url.pathname}`);
    }));
    const result = await consumeQueueBatch(env, 'cloudflare_cron');
    expect(result.result).toMatchObject({
      metadata: { processed: 1 },
      accountSignals: { processed: 1 },
      growth: { processed: expect.any(Number) },
      guild: { claimed: true, processed: 1 },
    });
    expect((result.result.growth as { processed: number }).processed).toBeGreaterThan(0);
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
