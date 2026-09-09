import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestD1 } from './sqlite-d1';
import { getImportJob, getOrCreateImportJob, checkpointSeedPage, resolveStagingBatch } from '../../functions/_shared/import-repository';
import { findCharacterByOcid, upsertCanonicalNexonCharacter } from '../../functions/_shared/character-repository';
import { estimateGuildSampling, guildProgress, initializeGuildCandidates, stageNextGuild, withGuildImportLock } from '../../functions/_shared/guild-import';
import type { Env } from '../../functions/_shared/env';
import type { CharacterWrite } from '../../functions/_shared/models';
import { canonicalSql, pageStagingSql, resolveCharacter } from '../../scripts/run-manual-seed-import.mjs';
import { parseManualSeedPage } from '../../scripts/manual-seed-files.mjs';
import { resolveNexonCharacter } from '../../functions/_shared/nexon-client';
import { deduplicateRadarCharacters } from '../../scripts/lib/tms-radar-sampling.mjs';
import { getCombatPowerRanking } from '../../functions/_shared/ranking-repository';
import { onRequestPost } from '../../functions/api/admin/import/[source]';
import { runGuildImport } from '../../scripts/run-guild-import.mjs';

let local: ReturnType<typeof createTestD1>;
let env: Env;
const baseTime = '2026-09-07T00:00:00.000Z';
const official = (name: string, overrides: Partial<CharacterWrite> = {}): CharacterWrite => ({
  ocid: `ocid-${name}`, characterName: name, worldName: '艾麗亞', jobName: '主教', level: 280,
  combatPower: 1000, characterImage: 'image', guildName: '公會A',
  observedAt: baseTime, requestedAt: baseTime, nexonUpdatedAt: null, ...overrides,
});
const insert = (name: string, overrides: Partial<CharacterWrite> = {}) =>
  upsertCanonicalNexonCharacter(env.DB, official(name, overrides), [{ source: 'nexon' }]);
const job = async () => getOrCreateImportJob(env.DB, 'nexon_guild');
const current = async (id: number) => (await getImportJob(env.DB, id))!;
const roster = (members: string[], guild = '公會A') => ({
  guild_name: guild, world_name: '艾麗亞', guild_member_count: members.length, guild_member: members, date: null,
});
const basic = (name = '新角色') => ({ character_name: name, world_name: '艾麗亞', character_class: '主教',
  character_level: 280, character_image: 'image', character_guild_name: '公會A', date: null });
const mockApi = (members = ['舊角色', '新角色']) => vi.stubGlobal('fetch', vi.fn(async (input: string) => {
  const url = new URL(input);
  expect(url.origin + url.pathname.split('/v1')[0]).toBe('https://open.api.nexon.com/maplestorytw');
  if (url.pathname.endsWith('/guild/id')) return Response.json({ oguild_id: 'guild-1' });
  if (url.pathname.endsWith('/guild/basic')) return Response.json(roster(members));
  if (url.pathname.endsWith('/id')) return Response.json({ ocid: `ocid-${url.searchParams.get('character_name')}` });
  if (url.pathname.endsWith('/character/basic')) return Response.json(basic(url.searchParams.get('ocid')!.slice(5)));
  if (url.pathname.endsWith('/character/stat')) return Response.json({ date: null, final_stat: [{ stat_name: '戰鬥力', stat_value: '2,000' }] });
  throw new Error(`Unexpected endpoint ${url.pathname}`);
}));

beforeEach(() => {
  local = createTestD1();
  env = { DB: local.db, SURVEY_DB: local.db, NEXON_API_KEY: 'test-only', NEXON_RETRY_LIMIT: '2', NEXON_REQUEST_DELAY_MS: '0' };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(baseTime);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network access'); }));
});
afterEach(() => { local.sqlite.close(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('official guild sampling with real local SQL', () => {
  it('snapshots only existing world/guild pairs once, including distinct worlds and excluding blanks', async () => {
    await insert('角色1'); await insert('角色2');
    await insert('角色3', { worldName: '普力特' });
    await insert('角色4', { guildName: null });
    await insert('角色5', { guildName: '  ' });
    const initial = await job();
    await initializeGuildCandidates(env, initial, 10);
    await insert('後來角色', { guildName: '新公會' });
    await initializeGuildCandidates(env, await current(initial.id), 10);
    expect(await guildProgress(env, initial.id)).toMatchObject({ pending: 2, total: 2 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('merges a roster with rankings by OCID and reuses a fresh official character without requests', async () => {
    await insert('舊角色'); mockApi();
    const initial = await job();
    await initializeGuildCandidates(env, initial, 1);
    const staged = await stageNextGuild(env, await current(initial.id));
    expect(staged.guilds).toMatchObject({ completed: 1 });
    expect(await findCharacterByOcid(env.DB, 'ocid-新角色')).toBeNull();
    const resolved = await resolveStagingBatch(env, await current(initial.id));
    expect(resolved).toMatchObject({ created: 1, reused: 1, failed: 0 });
    expect(resolved.job).toMatchObject({ status: 'completed', pending_count: 0, nexon_request_count: 5 });
    expect(fetch).toHaveBeenCalledTimes(5); // 2 guild + 3 for the new member.
    const sources = local.sqlite.prepare('SELECT source FROM character_sources WHERE ocid = ? ORDER BY source').all('ocid-舊角色');
    expect(sources.map((row) => row.source)).toEqual(['nexon', 'nexon_guild']);
    const ranking = await getCombatPowerRanking(env.DB, { page: 1, pageSize: 100 });
    expect(ranking.total).toBe(2);
    expect(ranking.items[0].ocid).toBe('ocid-新角色');
    await stageNextGuild(env, await current(initial.id));
    await resolveStagingBatch(env, await current(initial.id));
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('a new round requeues resolved members but source-only matches never refresh character data', async () => {
    await insert('舊角色'); mockApi(['舊角色']);
    let run = await job();
    await initializeGuildCandidates(env, run, 1);
    await stageNextGuild(env, await current(run.id));
    await resolveStagingBatch(env, await current(run.id));
    vi.setSystemTime('2026-09-07T01:00:00.000Z');
    run = await job();
    await initializeGuildCandidates(env, run, 1);
    await stageNextGuild(env, await current(run.id));
    expect((await current(run.id)).pending_count).toBe(1);
    const resolved = await resolveStagingBatch(env, await current(run.id));
    expect(resolved).toMatchObject({ created: 0, updated: 0, reused: 1 });
    expect(resolved.job).toMatchObject({ status: 'completed', nexon_request_count: 2 });
    expect((await findCharacterByOcid(env.DB, 'ocid-舊角色'))?.combatPower).toBe(1000);
    expect(fetch).toHaveBeenCalledTimes(4); // two guild calls per round; no character calls.
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM characters').get()?.n).toBe(1);
  });

  it('a failed guild does not prevent the next guild from being staged', async () => {
    await insert('角色1'); await insert('角色2', { guildName: '公會B' });
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.searchParams.get('guild_name') === '公會A') return new Response('{}', { status: 404 });
      if (url.pathname.endsWith('/guild/id')) return Response.json({ oguild_id: 'B' });
      return Response.json(roster(['B成員'], '公會B'));
    }));
    const run = await job(); await initializeGuildCandidates(env, run, 2);
    await stageNextGuild(env, await current(run.id));
    const second = await stageNextGuild(env, await current(run.id));
    expect(second.guilds).toMatchObject({ failed: 1, completed: 1 });
    expect(JSON.parse(second.job!.checkpoint_json!).stageComplete).toBe(true);
    expect(local.sqlite.prepare('SELECT character_name FROM character_import_staging').get()?.character_name).toBe('B成員');
  });

  it('keeps incomplete rosters out of staging and resumes after the retry delay', async () => {
    await insert('角色1');
    let complete = false;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => String(input).includes('/guild/id')
      ? Response.json({ oguild_id: 'A' })
      : Response.json({ ...roster(['新角色']), guild_member_count: complete ? 1 : 2 })));
    const run = await job(); await initializeGuildCandidates(env, run, 1);
    await stageNextGuild(env, await current(run.id));
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM character_import_staging').get()?.n).toBe(0);
    expect(await stageNextGuild(env, await current(run.id))).toMatchObject({ waitingForRetry: true });
    complete = true; vi.setSystemTime('2026-09-07T00:01:00.000Z');
    const resumed = await stageNextGuild(env, await current(run.id));
    expect(resumed.guilds.completed).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(3); // saved guild ID survives the failed roster.
  });

  it('rejects a guild member identity from another world instead of merging by name', async () => {
    await insert('舊角色');
    mockApi(['新角色']);
    const run = await job(); await initializeGuildCandidates(env, run, 1);
    await stageNextGuild(env, await current(run.id));
    vi.stubGlobal('fetch', vi.fn(async (input: string) => String(input).includes('/character/basic')
      ? Response.json({ ...basic(), world_name: '其他世界' })
      : String(input).includes('/character/stat')
        ? Response.json({ final_stat: [{ stat_name: '戰鬥力', stat_value: '2000' }] })
        : Response.json({ ocid: 'new-ocid' })));
    expect(await resolveStagingBatch(env, await current(run.id))).toMatchObject({ failed: 1, created: 0 });
    expect(await findCharacterByOcid(env.DB, 'new-ocid')).toBeNull();
  });

  it('does not run simultaneous steps for the same guild job', async () => {
    const run = await job();
    await withGuildImportLock(env, run.id, async () => {
      await expect(withGuildImportLock(env, run.id, async () => null)).rejects.toThrow(/already running/);
    });
    await expect(withGuildImportLock(env, run.id, async () => 'released')).resolves.toBe('released');
  });

  it('requires administrator authentication and an explicit candidate cap before starting', async () => {
    env.IMPORT_ADMIN_SECRET = 'test-admin';
    const request = (body: object, authorized = true) => onRequestPost({ env, params: { source: 'nexon_guild' },
      request: new Request('https://example.test/api/admin/import/nexon_guild', {
        method: 'POST', headers: { 'content-type': 'application/json', ...(authorized ? { authorization: 'Bearer test-admin' } : {}) },
        body: JSON.stringify(body),
      }), waitUntil: vi.fn(),
    } as never);
    expect((await request({ action: 'start', maxGuilds: 1 }, false)).status).toBe(401);
    expect((await request({ action: 'start' })).status).toBe(400);
    expect((await request({ action: 'stage' })).status).toBe(400);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM import_jobs').get()?.n).toBe(0);
    await insert('舊角色');
    mockApi(['舊角色', '新角色']);
    const estimateResponse = await request({ action: 'estimate', maxGuilds: 1 });
    expect(estimateResponse.status).toBe(200);
    expect((await estimateResponse.json() as { estimate: Record<string, number> }).estimate).toMatchObject({ U: 1, K: 0, estimatedCharacterApiRequests: 3 });
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM import_jobs').get()?.n).toBe(0);
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network access'); }));
    expect((await request({ action: 'start', maxGuilds: 1 })).status).toBe(200);
    expect((await request({ action: 'start', maxGuilds: 1 })).status).toBe(200);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM import_jobs').get()?.n).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not expose the retired ranking importer through the admin registry', async () => {
    env.IMPORT_ADMIN_SECRET = 'test-admin';
    const response = await onRequestPost({
      env,
      params: { source: 'maplerhouse' },
      request: new Request('https://example.test/api/admin/import/maplerhouse', {
        method: 'POST',
        headers: { authorization: 'Bearer test-admin', 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      }),
      waitUntil: vi.fn(),
    } as never);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'unknown_import_source' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stops on invalid API credentials instead of marking every guild as failed', async () => {
    await insert('角色');
    const run = await job(); await initializeGuildCandidates(env, run, 1);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })));
    await expect(stageNextGuild(env, await current(run.id))).rejects.toThrow(/403/);
    expect(await guildProgress(env, run.id)).toMatchObject({ pending: 1, failed: 0 });
    expect((await current(run.id)).nexon_request_count).toBe(1);
  });

  it('rolls back staging with the guild checkpoint if its transaction fails', async () => {
    await insert('角色'); mockApi(['新角色']);
    const run = await job(); await initializeGuildCandidates(env, run, 1);
    local.sqlite.exec(`CREATE TRIGGER fail_guild_checkpoint BEFORE UPDATE OF status ON guild_import_candidates
      WHEN NEW.status='completed' BEGIN SELECT RAISE(ABORT, 'simulated checkpoint interruption'); END;`);
    await expect(stageNextGuild(env, await current(run.id))).rejects.toThrow(/simulated/);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM character_import_staging').get()?.n).toBe(0);
    expect(await guildProgress(env, run.id)).toMatchObject({ pending: 1 });
    local.sqlite.exec('DROP TRIGGER fail_guild_checkpoint');
    await stageNextGuild(env, await current(run.id));
    expect((await current(run.id)).pending_count).toBe(1);
  });

  it('stops before network requests when the shared D1 budget is exhausted', async () => {
    await insert('角色');
    const run = await job(); await initializeGuildCandidates(env, run, 1);
    env.IMPORT_D1_WRITE_BUDGET = '10000';
    local.sqlite.exec(`UPDATE import_jobs SET d1_budget_date='2026-09-07', d1_rows_written_estimate=10000 WHERE id=${run.id}`);
    await expect(stageNextGuild(env, await current(run.id))).rejects.toThrow(/safety budget/);
    expect(fetch).not.toHaveBeenCalled();
    expect(await guildProgress(env, run.id)).toMatchObject({ pending: 1 });
  });

  it('stages a large roster within D1 parameter limits and queues duplicate members only once', async () => {
    await insert('角色');
    mockApi([...Array.from({ length: 205 }, (_, index) => `成員${index}`), '成員0']);
    const run = await job(); await initializeGuildCandidates(env, run, 1);
    await stageNextGuild(env, await current(run.id));
    expect((await current(run.id)).pending_count).toBe(205);
  });

  it('estimates a roster read-only and never calls character APIs or writes D1', async () => {
    await insert('舊角色');
    mockApi(['舊角色', '新角色', '新角色']);
    const beforeCharacters = local.sqlite.prepare('SELECT COUNT(*) AS n FROM characters').get()?.n;
    const beforeJobs = local.sqlite.prepare('SELECT COUNT(*) AS n FROM import_jobs').get()?.n;
    const estimate = await estimateGuildSampling(env, 1);
    expect(estimate).toMatchObject({
      guildCandidates: 1,
      guildApiRequests: 2,
      guildApiRequestsExpected: 2,
      rosterMemberOccurrences: 3,
      uniqueRosterCharacters: 2,
      existingCharacters: 1,
      newCharacters: 1,
      existingCharactersNeedingUpdate: 0,
      U: 1,
      K: 0,
      estimatedCharacterApiRequests: 3,
      failedGuilds: 0,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM characters').get()?.n).toBe(beforeCharacters);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM import_jobs').get()?.n).toBe(beforeJobs);
  });
});

describe('canonical freshness and validity', () => {
  it('manual resolver requests basic and stat concurrently after OCID resolution', async () => {
    let activeCharacterRequests = 0;
    let maxActiveCharacterRequests = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/id')) return Response.json({ ocid: 'ocid-新角色' });
      if (url.pathname.endsWith('/character/basic') || url.pathname.endsWith('/character/stat')) {
        activeCharacterRequests += 1;
        maxActiveCharacterRequests = Math.max(maxActiveCharacterRequests, activeCharacterRequests);
        await new Promise((resolve) => setTimeout(resolve, 10));
        activeCharacterRequests -= 1;
        return url.pathname.endsWith('/character/basic')
          ? Response.json(basic('新角色'))
          : Response.json({ date: null, final_stat: [{ stat_name: '戰鬥力', stat_value: '2,000' }] });
      }
      throw new Error(`Unexpected endpoint ${url.pathname}`);
    }));
    const result = await resolveCharacter(
      { character_name: '新角色' },
      { apiKey: 'test', retryLimit: 1, timeoutMs: 1000 },
      { used: 0, maximum: 3 },
    );
    expect(result.ocid).toBe('ocid-新角色');
    expect(maxActiveCharacterRequests).toBe(2);
  });

  it('rejects older data dates and late responses while preserving additional source provenance', async () => {
    await insert('角色', { nexonUpdatedAt: '2026-09-06T00:00:00.000Z' });
    await upsertCanonicalNexonCharacter(env.DB, official('角色', { combatPower: 9,
      nexonUpdatedAt: '2026-09-05T00:00:00.000Z', requestedAt: '2026-09-07T01:00:00.000Z', observedAt: '2026-09-07T02:00:00.000Z' }),
    [{ source: 'nexon_guild' }, { source: 'nexon' }]);
    expect((await findCharacterByOcid(env.DB, 'ocid-角色'))?.combatPower).toBe(1000);
    await upsertCanonicalNexonCharacter(env.DB, official('角色', { combatPower: 8,
      nexonUpdatedAt: '2026-09-06T00:00:00.000Z', requestedAt: '2026-09-06T23:00:00.000Z', observedAt: '2026-09-07T02:00:00.000Z' }), [{ source: 'nexon' }]);
    expect((await findCharacterByOcid(env.DB, 'ocid-角色'))?.combatPower).toBe(1000);
    expect(local.sqlite.prepare("SELECT COUNT(*) AS n FROM character_sources WHERE source='nexon_guild'").get()?.n).toBe(1);
    await insert('角色', { combatPower: 500, nexonUpdatedAt: '2026-09-07T00:00:00.000Z' });
    expect((await findCharacterByOcid(env.DB, 'ocid-角色'))?.combatPower).toBe(500); // newest, not highest.
  });

  it('protects undated realtime responses using request start time', async () => {
    await insert('角色');
    await insert('角色', { combatPower: 5, requestedAt: '2026-09-06T23:59:00.000Z', observedAt: '2026-09-07T02:00:00.000Z' });
    expect((await findCharacterByOcid(env.DB, 'ocid-角色'))?.combatPower).toBe(1000);
  });

  it.each([undefined, null, '', 'NaN', '-1'])('rejects missing/invalid power %s in both import clients', async (power) => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => String(input).includes('/character/basic')
      ? Response.json(basic()) : Response.json({ final_stat: [{ stat_name: '戰鬥力', stat_value: power }] })));
    await expect(resolveNexonCharacter(env, '新角色', 'ocid')).rejects.toThrow(/missing valid/);
    await expect(resolveCharacter({ character_name: '新角色', ocid: 'ocid' },
      { apiKey: 'test', retryLimit: 1, timeoutMs: 1000 }, { used: 0, maximum: 3 })).rejects.toThrow(/missing valid/);
  });

  it('accepts an explicit zero, and rejects incomplete basic data and mismatched dates', async () => {
    let responseBasic: Record<string, unknown> = basic();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => String(input).includes('/character/basic')
      ? Response.json(responseBasic) : Response.json({ date: '2026-09-06T00:00:00Z', final_stat: [{ stat_name: '戰鬥力', stat_value: '0' }] })));
    expect((await resolveNexonCharacter(env, '新角色', 'ocid')).combatPower).toBe(0);
    responseBasic = { ...basic(), character_level: null };
    await expect(resolveNexonCharacter(env, '新角色', 'ocid')).rejects.toThrow(/missing valid/);
    responseBasic = { ...basic(), date: '2026-09-05T00:00:00Z' };
    await expect(resolveNexonCharacter(env, '新角色', 'ocid')).rejects.toThrow(/inconsistent/);
  });

  it('manual SQL uses the same guard and requeues an earlier resolved staging row in a new job', async () => {
    await insert('角色');
    const first = await getOrCreateImportJob(env.DB, 'manual_seed');
    const parsed = parseManualSeedPage({ data: [{ characterName: '角色' }], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }, version: 1 }, 1);
    local.sqlite.exec(pageStagingSql(first, parsed, [1], 'page-1.json', 1, 1));
    const row = local.sqlite.prepare('SELECT * FROM character_import_staging').get()!;
    local.sqlite.exec(canonicalSql(row, official('角色', { combatPower: 1, requestedAt: '2026-09-06T23:00:00.000Z' })));
    expect((await findCharacterByOcid(env.DB, 'ocid-角色'))?.combatPower).toBe(1000);
    local.sqlite.exec(`UPDATE import_jobs SET status='completed' WHERE id=${first.id}`);
    const next = await getOrCreateImportJob(env.DB, 'manual_seed');
    local.sqlite.exec(pageStagingSql(next, parsed, [1], 'page-1.json', 1, 1));
    expect(local.sqlite.prepare('SELECT status, attempt_count FROM character_import_staging').get()).toMatchObject({ status: 'pending', attempt_count: 0 });
    expect((await current(next.id)).pending_count).toBe(1);
    local.sqlite.exec(pageStagingSql(next, parsed, [1], 'page-1.json', 1, 1));
    expect((await current(next.id)).pending_count).toBe(1);
  });

  it('keeps historical provenance rows readable without affecting canonical rankings', async () => {
    await insert('舊資料角色');
    local.sqlite.prepare(`INSERT INTO character_sources
      (ocid, source, source_character_id, source_first_seen_at, source_last_seen_at, created_at, updated_at)
      VALUES (?, 'maplerhouse', ?, ?, ?, ?, ?)`).run(
      'ocid-舊資料角色', 'legacy-id', baseTime, baseTime, baseTime, baseTime,
    );
    expect(await findCharacterByOcid(env.DB, 'ocid-舊資料角色')).toMatchObject({ characterName: '舊資料角色' });
    expect(local.sqlite.prepare('SELECT source FROM character_sources WHERE source = ?').get('maplerhouse')).toMatchObject({ source: 'maplerhouse' });
    expect((await getCombatPowerRanking(env.DB, { page: 1, pageSize: 100 })).total).toBe(1);
  });

  it('keeps a valid old character without requesting detail data, even when a fresh response would be missing fields', async () => {
    await insert('舊角色'); mockApi(['舊角色']);
    const run = await job(); await initializeGuildCandidates(env, run, 1);
    await stageNextGuild(env, await current(run.id));
    vi.setSystemTime('2026-09-07T01:00:00.000Z');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ final_stat: [] })));
    expect(await resolveStagingBatch(env, await current(run.id))).toMatchObject({ retry: 0, updated: 0, reused: 1 });
    expect((await findCharacterByOcid(env.DB, 'ocid-舊角色'))?.combatPower).toBe(1000);
    expect((await current(run.id)).status).toBe('completed');
    expect(fetch).not.toHaveBeenCalled(); // no character API after the roster was staged.
  });

  it('source-only guild matching also avoids API calls for legacy rows', async () => {
    await insert('舊角色');
    local.sqlite.exec('UPDATE characters SET nexon_requested_at=NULL');
    mockApi(['舊角色']);
    const run = await job(); await initializeGuildCandidates(env, run, 1);
    await stageNextGuild(env, await current(run.id));
    expect(await resolveStagingBatch(env, await current(run.id))).toMatchObject({ updated: 0, reused: 1 });
    expect((await current(run.id)).nexon_request_count).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2); // guild/id + guild/basic only.
  });

  it('source-only guild matching queues incomplete legacy metadata without character API calls', async () => {
    await insert('舊角色');
    local.sqlite.exec("UPDATE characters SET level=0, character_image='' WHERE ocid='ocid-舊角色'");
    mockApi(['舊角色']);
    const run = await job(); await initializeGuildCandidates(env, run, 1);
    await stageNextGuild(env, await current(run.id));
    expect(await resolveStagingBatch(env, await current(run.id))).toMatchObject({ updated: 0, reused: 1 });
    expect(fetch).toHaveBeenCalledTimes(2); // guild/id + guild/basic only.
    expect(local.sqlite.prepare(`SELECT status, reason, ocid FROM character_metadata_refresh
      WHERE normalized_name='舊角色' AND expected_world_name='艾麗亞'`).get()).toMatchObject({
      status: 'pending', reason: 'incomplete_metadata', ocid: 'ocid-舊角色',
    });
  });
});

it('CLI status cannot accidentally initialize a job', async () => {
  await expect(runGuildImport(['--start', '--max-guilds', '1', '--status'])).rejects.toThrow(/cannot start/);
  await expect(runGuildImport(['--start'])).rejects.toThrow(/positive integer/);
  expect(fetch).not.toHaveBeenCalled();
});

it('radar deduplicates renamed OCIDs and keeps distinct OCIDs even when names match', () => {
  expect(deduplicateRadarCharacters([
    { ocid: '1', name: '新名稱' }, { ocid: '1', name: '舊名稱' }, { ocid: '2', name: '新名稱' },
    { name: '無ID', world: 'A' }, { name: '無ID', world: 'A' }, { name: '無ID', world: 'B' },
  ])).toHaveLength(4);
});
