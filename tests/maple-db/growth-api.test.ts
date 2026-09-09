import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { onRequestPost as generateGrowth } from '../../functions/api/growth/generate';
import { onRequestGet as getGrowthHistory } from '../../functions/api/growth/history';
import { onRequestGet as getGrowthStatus } from '../../functions/api/growth/status';
import type { Env } from '../../functions/_shared/env';
import { createTestD1 } from './sqlite-d1';

const OCID = 'a3e399217d603631033dd65ebaa08275';
let local: ReturnType<typeof createTestD1>;
let env: Env;

beforeEach(() => {
  local = createTestD1();
  env = { DB: local.db, SURVEY_DB: local.db };
});

afterEach(() => local.sqlite.close());

describe('growth shadow API', () => {
  it('only permits the shadow OCID', async () => {
    const response = await generateGrowth({
      env,
      request: new Request('https://example.test/api/growth/generate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ocid: 'not-allowlisted' }),
      }),
    } as never);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'growth_shadow_not_allowed' } });
  });

  it('creates one permanent profile idempotently and exposes its status', async () => {
    const request = () => generateGrowth({
      env,
      request: new Request('https://example.test/api/growth/generate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ocid: OCID }),
      }),
    } as never);
    expect((await request()).status).toBe(202);
    expect((await request()).status).toBe(202);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM growth_profiles`).get()?.count).toBe(1);

    const response = await getGrowthStatus({
      env, request: new Request(`https://example.test/api/growth/status?ocid=${OCID}`),
    } as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      tracked: true,
      status: 'pending',
      job: { status: 'pending', phase: 'basic' },
    });
  });

  it('returns 404 history for an allowed but not-yet-created profile', async () => {
    const response = await getGrowthHistory({
      env,
      request: new Request(`https://example.test/api/growth/history?ocid=${OCID}&start=2025-10-15&end=2025-10-22`),
    } as never);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'growth_profile_not_found' } });
  });
});
