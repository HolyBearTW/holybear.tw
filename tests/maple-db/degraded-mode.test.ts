import { afterEach, describe, expect, it, vi } from 'vitest';
import { getImportMetrics } from '../../functions/_shared/import-repository';
import { getCachedCharacterRank, getCachedRankingPage } from '../../functions/_shared/ranking-cache';
import { onRequestGet as getRanking } from '../../functions/api/rankings/combat-power';
import { onRequestGet as getCharacterRank } from '../../functions/api/rankings/character/[name]';

afterEach(() => vi.unstubAllGlobals());

const entry = {
  ocid: 'ocid-1', characterName: '快取角色', worldName: '艾麗亞', jobName: '主教',
  level: 290, combatPower: 123456, characterImage: '', guildName: null, rank: 1,
};
const laterEntry = {
  ...entry,
  ocid: 'ocid-2',
  characterName: '完整快照角色',
  rank: 1001,
};

const exactCharacterRank = {
  entry: { ...entry, characterName: '精確角色', rank: 123 },
  rank: 123,
  total: 334285,
};

const createCharacterRankDb = (result: typeof exactCharacterRank | null = exactCharacterRank) => ({
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({ first: vi.fn(async () => (result ? {
      ocid: result.entry.ocid,
      character_name: result.entry.characterName,
      world_name: result.entry.worldName,
      job_name: result.entry.jobName,
      level: result.entry.level,
      combat_power: result.entry.combatPower,
      character_image: result.entry.characterImage,
      guild_name: result.entry.guildName,
      rank: result.rank,
      total: result.total,
    } : null)) })),
  })),
});

const createCharacterRankCache = () => {
  const entries = new Map<string, Response>();
  const match = vi.fn(async (request: Request) => entries.get(request.url)?.clone());
  const put = vi.fn(async (request: Request, response: Response) => {
    entries.set(request.url, response.clone());
  });
  vi.stubGlobal('caches', { default: { match, put } });
  return { entries, match, put };
};

const getCharacterRankWithCache = async (
  env: unknown,
  name: string,
  waits: Promise<unknown>[] = [],
) => getCharacterRank({
  env,
  params: { name: encodeURIComponent(name) },
  request: new Request('https://example.test'),
  waitUntil: vi.fn((promise: Promise<unknown>) => waits.push(promise)),
} as never);

const responseBody = async (response: Response) => response.json() as Promise<Record<string, unknown>>;

describe('character rank cache-first path', () => {
  it('caches an exact D1 result on the first request and hits it on the second request', async () => {
    const cache = createCharacterRankCache();
    const env = { DB: createCharacterRankDb() };
    const waits: Promise<unknown>[] = [];
    const first = await getCharacterRankWithCache(env, '精確角色', waits);

    expect(first.status).toBe(200);
    expect(first.headers.get('x-holybear-cache')).toBe('miss');
    expect(await responseBody(first)).toEqual(exactCharacterRank);
    await Promise.all(waits);
    expect(cache.put).toHaveBeenCalledTimes(1);
    expect([...cache.entries.keys()][0]).toContain('/characters-v2/');
    expect([...cache.entries.keys()][0]).not.toContain('/characters/');
    expect([...cache.entries.values()][0].headers.get('cache-control')).toBe('public, max-age=300');
    expect(env.DB.prepare).toHaveBeenCalledTimes(1);

    const second = await getCharacterRankWithCache(env, ' 精確角色 ');
    expect(second.status).toBe(200);
    expect(second.headers.get('x-holybear-cache')).toBe('hit');
    expect(await responseBody(second)).toEqual(exactCharacterRank);
    expect(env.DB.prepare).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a different character cache entry and preserves normalization', async () => {
    const cache = createCharacterRankCache();
    const env = { DB: createCharacterRankDb() };
    const waits: Promise<unknown>[] = [];
    await getCharacterRankWithCache(env, '精確角色', waits);
    await Promise.all(waits);

    const differentWaits: Promise<unknown>[] = [];
    const different = await getCharacterRankWithCache(env, '另一角色', differentWaits);
    expect(different.status).toBe(200);
    expect(different.headers.get('x-holybear-cache')).toBe('miss');
    await Promise.all(differentWaits);
    expect(env.DB.prepare).toHaveBeenCalledTimes(2);
    expect([...cache.entries.keys()].filter((key) => key.includes('/characters-v2/'))).toHaveLength(2);
  });

  it('uses the exact D1 path when the v2 cache is missing or expired', async () => {
    const cache = createCharacterRankCache();
    const env = { DB: createCharacterRankDb() };
    const firstWaits: Promise<unknown>[] = [];
    await getCharacterRankWithCache(env, '精確角色', firstWaits);
    await Promise.all(firstWaits);
    cache.match.mockResolvedValue(undefined);
    const response = await getCharacterRankWithCache(env, '精確角色');
    expect(response.status).toBe(200);
    expect(response.headers.get('x-holybear-cache')).toBe('miss');
    expect(env.DB.prepare).toHaveBeenCalledTimes(2);
  });

  it('keeps the 404 behavior when the exact rank query finds no character', async () => {
    createCharacterRankCache();
    const response = await getCharacterRankWithCache({ DB: createCharacterRankDb(null) }, '不存在角色');
    expect(response.status).toBe(404);
    expect(await responseBody(response)).toMatchObject({ error: { code: 'character_not_ranked' } });
  });
});

describe('ranking degraded mode', () => {
  it('paginates the compact CDN snapshot without reading D1 again', async () => {
    vi.stubGlobal('caches', { default: { match: vi.fn(async (request: Request) => (
      new URL(request.url).pathname.endsWith('/snapshot')
        ? new Response(JSON.stringify({ generatedAt: '2026-09-04T00:00:00Z', total: 50, items: [entry] }))
        : undefined
    )) } });
    const result = await getCachedRankingPage({} as never, { page: 1, pageSize: 10 });
    expect(result).toMatchObject({ degraded: true, snapshotAt: '2026-09-04T00:00:00Z', total: 50, items: [entry] });
  });

  it('finds a character rank in the compact snapshot', async () => {
    vi.stubGlobal('caches', { default: { match: vi.fn(async (request: Request) => (
      new URL(request.url).pathname.endsWith('/snapshot')
        ? new Response(JSON.stringify({ generatedAt: '2026-09-04T00:00:00Z', total: 50, items: [entry] }))
        : undefined
    )) } });
    expect(await getCachedCharacterRank({} as never, '快取角色')).toMatchObject({ degraded: true, rank: 1, total: 50 });
  });

  it('falls through an incomplete cache snapshot to the Pages static asset', async () => {
    vi.stubGlobal('caches', { default: { match: vi.fn(async (request: Request) => (
      new URL(request.url).pathname.endsWith('/snapshot')
        ? new Response(JSON.stringify({ generatedAt: '2026-09-04T00:00:00Z', total: 1294, items: [entry] }))
        : undefined
    )) } });
    const env = {
      ASSETS: {
        fetch: vi.fn(async () => new Response(JSON.stringify({
          generatedAt: '2026-09-04T01:00:00Z', total: 1294, items: [laterEntry],
        }))),
      },
    };
    expect(await getCachedCharacterRank(env as never, '完整快照角色')).toMatchObject({
      degraded: true,
      rank: 1001,
      total: 1294,
    });
  });

  it('returns HTTP 200 cached rankings when D1 throws', async () => {
    vi.stubGlobal('caches', { default: { match: vi.fn(async (request: Request) => (
      new URL(request.url).pathname.endsWith('/snapshot')
        ? new Response(JSON.stringify({ generatedAt: '2026-09-04T00:00:00Z', total: 50, items: [entry] }))
        : undefined
    )) } });
    const env = { DB: { prepare: vi.fn(() => { throw new Error('D1 quota exceeded'); }) } };
    const response = await getRanking({
      env, request: new Request('https://example.test/api/rankings/combat-power?page=1&pageSize=10'),
      waitUntil: vi.fn(),
    } as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ degraded: true, items: [entry] });
  });

  it('returns cached character rank when D1 throws', async () => {
    vi.stubGlobal('caches', { default: { match: vi.fn(async (request: Request) => (
      new URL(request.url).pathname.endsWith('/snapshot')
        ? new Response(JSON.stringify({ generatedAt: '2026-09-04T00:00:00Z', total: 50, items: [entry] }))
        : undefined
    )) } });
    const env = { DB: { prepare: vi.fn(() => { throw new Error('D1 unavailable'); }) } };
    const response = await getCharacterRank({
      env, params: { name: encodeURIComponent('快取角色') }, request: new Request('https://example.test'),
      waitUntil: vi.fn(),
    } as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ degraded: true, rank: 1 });
  });
});

describe('incremental importer status', () => {
  it('builds status from job counters without a staging-table query', () => {
    const metrics = getImportMetrics([{
      id: 1, source: 'manual_seed', status: 'running', last_page: 10, checkpoint_json: null,
      imported_count: 1000, updated_count: 3, skipped_count: 0, failed_count: 2,
      last_error: null, started_at: '', updated_at: '', completed_at: null,
      staging_inserted_count: 900, staging_updated_count: 100, resolved_count: 20,
      pending_count: 875, retry_count: 3, created_count: 17, nexon_request_count: 60,
      d1_budget_date: '2026-09-04', d1_rows_read_estimate: 100, d1_rows_written_estimate: 200,
    }]);
    expect(metrics.counts).toMatchObject({ staging_total: 900, staging_updated: 100, resolved_ocid: 20, pending_resolution: 875, retry_pending: 3 });
  });
});
