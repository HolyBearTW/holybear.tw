import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost as generateGrowth } from '../../functions/api/growth/generate';
import { onRequest as generateGrowthMethod } from '../../functions/api/growth/generate';
import { onRequestGet as getGrowthHistory } from '../../functions/api/growth/history';
import { onRequestGet as getGrowthSiteKey } from '../../functions/api/growth/site-key';
import { onRequestGet as getGrowthStatus } from '../../functions/api/growth/status';
import type { Env } from '../../functions/_shared/env';
import { createTestD1 } from './sqlite-d1';

const OCID_A = 'a3e399217d603631033dd65ebaa08275';
const OCID_B = 'b3e399217d603631033dd65ebaa08275';
let local: ReturnType<typeof createTestD1>;
let env: Env;
let turnstileMode: 'success' | 'rejected' | 'unavailable';
let identityMode: 'valid' | 'invalid';

const requestFor = (ocid: string, turnstileToken: string | null = 'valid-turnstile-token') => {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (turnstileToken !== null) headers['x-turnstile-token'] = turnstileToken;
  return generateGrowth({
    env,
    request: new Request('https://example.test/api/growth/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ocid }),
    }),
  } as never);
};

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
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
    TURNSTILE_SITE_KEY: 'turnstile-site-key',
  };
  turnstileMode = 'success';
  identityMode = 'valid';
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    if (input.includes('/turnstile/v0/siteverify')) {
      if (turnstileMode === 'unavailable') throw new Error('turnstile unavailable');
      return Response.json({ success: turnstileMode === 'success' });
    }
    if (identityMode === 'invalid') {
      return Response.json({ error: { name: 'OPENAPI00003', message: 'invalid identifier' } }, { status: 400 });
    }
    return Response.json({
      character_name: '有效角色',
      world_name: '艾麗亞',
      character_class: '卡蒂娜',
      character_level: 271,
    });
  }));
});

afterEach(() => {
  local.sqlite.close();
  vi.unstubAllGlobals();
});

describe('growth primary API', () => {
  it('requires Turnstile for a new OCID without creating a profile', async () => {
    const response = await requestFor(OCID_A, null);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'turnstile_required' } });
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired Turnstile token before admission', async () => {
    turnstileMode = 'rejected';
    const response = await requestFor(OCID_A);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'turnstile_rejected' } });
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(0);
  });

  it('rejects oversized Turnstile tokens without calling the verifier', async () => {
    const response = await requestFor(OCID_A, 'x'.repeat(2_049));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'turnstile_required' } });
    expect(fetch).not.toHaveBeenCalled();
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(0);
  });

  it('fails closed when Turnstile is unavailable for a new OCID', async () => {
    turnstileMode = 'unavailable';
    const response = await requestFor(OCID_A);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: 'growth_verification_unavailable' } });
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(0);
  });

  it('creates one profile after Turnstile succeeds', async () => {
    const response = await requestFor(OCID_A);
    expect(response.status).toBe(202);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(1);
  });

  it('bypasses Turnstile, quota, and NEXON validation for an existing OCID', async () => {
    expect((await requestFor(OCID_A)).status).toBe(202);
    vi.mocked(fetch).mockClear();
    turnstileMode = 'unavailable';
    env.TURNSTILE_SECRET_KEY = undefined;

    const response = await requestFor(OCID_A, null);
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ tracked: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(1);
  });

  it('does not leak the Turnstile secret from the Growth site-key endpoint', async () => {
    const response = await getGrowthSiteKey({
      env,
      request: new Request('https://example.test/api/growth/site-key'),
    } as never);
    expect(response.status).toBe(200);
    const body = await response.json() as { siteKey?: string; secret?: string };
    expect(body).toEqual({ siteKey: 'turnstile-site-key' });
    expect(JSON.stringify(body)).not.toContain('turnstile-secret');
  });

  it('rejects malformed and officially invalid OCIDs without creating profiles', async () => {
    expect((await requestFor('not-an-ocid')).status).toBe(400);
    identityMode = 'invalid';
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
    expect(vi.mocked(fetch).mock.calls.filter(([input]) => input.includes('/turnstile/v0/siteverify'))).toHaveLength(2);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(2);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles WHERE status='pending'`).get()?.count)
      .toBe(2);
  });

  it('does not spend the first-generation quota twice for an existing OCID', async () => {
    expect((await requestFor(OCID_A)).status).toBe(202);
    env.GROWTH_NEW_PROFILE_24H_LIMIT = '1';
    env.GROWTH_PENDING_PROFILE_LIMIT = '1';
    turnstileMode = 'unavailable';
    const existing = await requestFor(OCID_A, null);
    expect(existing.status).toBe(202);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(1);
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

  it('keeps the Generate endpoint POST-only', () => {
    expect(generateGrowthMethod()).toMatchObject({ status: 405 });
  });
});
