import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost as generateGrowth } from '../../functions/api/growth/generate';
import { onRequestGet as getGrowthHistory } from '../../functions/api/growth/history';
import { onRequestGet as getGrowthStatus } from '../../functions/api/growth/status';
import type { Env } from '../../functions/_shared/env';
import { createTestD1 } from './sqlite-d1';

const OCID_A = 'a3e399217d603631033dd65ebaa08275';
const OCID_B = 'b3e399217d603631033dd65ebaa08275';
let local: ReturnType<typeof createTestD1>;
let env: Env;

const requestFor = (ocid: string) => generateGrowth({
  env,
  request: new Request('https://example.test/api/growth/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ocid }),
  }),
} as never);

beforeEach(() => {
  local = createTestD1();
  env = {
    DB: local.db,
    SURVEY_DB: local.db,
    NEXON_API_KEY: 'test-only',
    NEXON_RETRY_LIMIT: '1',
    NEXON_REQUEST_TIMEOUT_MS: '1000',
    GROWTH_NEW_PROFILE_24H_LIMIT: '12',
    GROWTH_PENDING_PROFILE_LIMIT: '8',
  };
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({
    character_name: '有效角色',
    world_name: '艾麗亞',
    character_class: '卡蒂娜',
    character_level: 271,
  })));
});

afterEach(() => {
  local.sqlite.close();
  vi.unstubAllGlobals();
});

describe('growth primary API', () => {
  it('rejects malformed and officially invalid OCIDs without creating profiles', async () => {
    expect((await requestFor('not-an-ocid')).status).toBe(400);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({
      error: { name: 'OPENAPI00003', message: 'invalid identifier' },
    }, { status: 400 }));
    const invalid = await requestFor('c3e399217d603631033dd65ebaa08275');
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ error: { code: 'invalid_growth_ocid' } });
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(0);
  });

  it('creates one permanent profile for concurrent duplicate Generate requests', async () => {
    const responses = await Promise.all([requestFor(OCID_A), requestFor(OCID_A), requestFor(OCID_A)]);
    expect(responses.map((response) => response.status)).toEqual([202, 202, 202]);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(1);
  });

  it('safely admits different OCIDs as separate queued profiles', async () => {
    const responses = await Promise.all([requestFor(OCID_A), requestFor(OCID_B)]);
    expect(responses.map((response) => response.status)).toEqual([202, 202]);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(2);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles WHERE status='pending'`).get()?.count)
      .toBe(2);
  });

  it('applies backlog and rolling creation limits only to new profiles', async () => {
    env.GROWTH_PENDING_PROFILE_LIMIT = '1';
    expect((await requestFor(OCID_A)).status).toBe(202);
    expect((await requestFor(OCID_A)).status).toBe(202);
    const backlog = await requestFor(OCID_B);
    expect(backlog.status).toBe(503);
    expect(backlog.headers.get('retry-after')).toBe('300');
    expect(await backlog.json()).toMatchObject({ error: { code: 'growth_backlog_full' } });

    local.sqlite.prepare(`UPDATE growth_profiles SET status='completed' WHERE ocid=?`).run(OCID_A);
    env.GROWTH_PENDING_PROFILE_LIMIT = '8';
    env.GROWTH_NEW_PROFILE_24H_LIMIT = '1';
    const quota = await requestFor(OCID_B);
    expect(quota.status).toBe(429);
    expect(quota.headers.get('retry-after')).toBe('3600');
    expect(await quota.json()).toMatchObject({ error: { code: 'growth_generation_limit' } });
    expect((await requestFor(OCID_A)).status).toBe(202);
  });

  it('exposes primary status without creating a profile and returns 404 history until Generate', async () => {
    const status = await getGrowthStatus({
      env, request: new Request(`https://example.test/api/growth/status?ocid=${OCID_A}`),
    } as never);
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({ tracked: false, job: null });
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(0);

    const history = await getGrowthHistory({
      env,
      request: new Request(`https://example.test/api/growth/history?ocid=${OCID_A}&start=2025-10-15&end=2025-10-22`),
    } as never);
    expect(history.status).toBe(404);
    expect(await history.json()).toMatchObject({ error: { code: 'growth_profile_not_found' } });
  });
});
