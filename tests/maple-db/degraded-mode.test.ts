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
