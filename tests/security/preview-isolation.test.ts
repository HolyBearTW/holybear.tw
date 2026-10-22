import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/_middleware';
import type { Env } from '../../functions/_shared/env';
import { PREVIEW_REQUIRED_SECRETS, SURVEY_PREVIEW_REQUIRED_SECRETS } from '../../functions/_shared/preview-isolation';

const sandbox = () => ({
  PAGES_DEPLOYMENT_ENV: 'preview',
  PREVIEW_FUNCTIONS_ENABLED: 'true',
  PREVIEW_RESOURCE_SCOPE: 'isolated',
  NEXON_RATE_LIMITER_REQUIRED: 'true',
  ...Object.fromEntries(PREVIEW_REQUIRED_SECRETS.map((name) => [name, `test-only-${name}`])),
  TURNSTILE_SITE_KEY: 'test-only-public-site-key',
  DB: { prepare: vi.fn() },
  SURVEY_DB: { prepare: vi.fn() },
  EVIDENCE_ARCHIVE: { put: vi.fn(), get: vi.fn() },
  NEXON_RATE_LIMITER: { idFromName: vi.fn(), get: vi.fn() },
}) as unknown as Env;

const call = async (env: Partial<Env>, path = '/api/health', headers: HeadersInit = {}, host = 'preview.holybear-tw.pages.dev') => {
  const next = vi.fn(async () => new Response('unchanged', { headers: { 'cache-control': 'public, max-age=60' } }));
  const waitUntil = vi.fn();
  const response = await onRequest({ env, next, waitUntil, request: new Request(`https://${host}${path}`, { headers }) } as never);
  return { next, waitUntil, response };
};

afterEach(() => vi.unstubAllGlobals());

describe('Pages Preview isolation gate', () => {
  it.each([undefined, '', 'unknown', 'Production'])('fails closed for marker %s', async (marker) => {
    const { response, next } = await call({ ...sandbox(), PAGES_DEPLOYMENT_ENV: marker });
    expect(response.status).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    '/api/health', '/api/characters/test', '/api/characters/test/alts', '/api/nexon/id',
    '/api/survey', '/api/survey/site-key', '/api/growth/generate', '/api/rankings/combat-power',
    '/api/admin/session', '/api/admin/survey', '/api/internal/consumer/fallback', '/api/maintenance/validate',
  ])('blocks disabled Preview before any work at %s', async (path) => {
    const env = sandbox();
    env.PREVIEW_FUNCTIONS_ENABLED = 'false';
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { response, next, waitUntil } = await call(env, path, {
      'x-bypass-key': env.MAINTENANCE_BYPASS_KEY!,
      'x-radar-automation-key': env.RADAR_AUTOMATION_KEY!,
      authorization: `Bearer ${env.IMPORT_ADMIN_SECRET}`,
    });
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: { code: 'preview_unavailable', message: '預覽環境 API 尚未啟用或未完成隔離設定' } });
    for (const fn of [next, waitUntil, fetch, env.DB.prepare, env.SURVEY_DB.prepare, env.EVIDENCE_ARCHIVE!.put, env.NEXON_RATE_LIMITER!.get, env.NEXON_RATE_LIMITER!.idFromName]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it.each(['DB', 'SURVEY_DB', 'EVIDENCE_ARCHIVE', 'NEXON_RATE_LIMITER', 'TURNSTILE_SITE_KEY', ...PREVIEW_REQUIRED_SECRETS] as const)(
    'rejects enabled Preview without %s', async (name) => {
      const env: Partial<Env> = sandbox();
      delete env[name];
      const { response, next } = await call(env);
      expect(response.status).toBe(503);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it.each(['', '  ', undefined])('rejects blank Preview credentials %s', async (secret) => {
    const { response, next } = await call({ ...sandbox(), NEXON_API_KEY: secret });
    expect(response.status).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    { PREVIEW_FUNCTIONS_ENABLED: undefined }, { PREVIEW_FUNCTIONS_ENABLED: 'TRUE' },
    { PREVIEW_RESOURCE_SCOPE: 'unconfigured' }, { PREVIEW_RESOURCE_SCOPE: undefined },
    { NEXON_RATE_LIMITER_REQUIRED: 'false' }, { NEXON_RATE_LIMITER_REQUIRED: undefined },
  ])('rejects incomplete enablement flags %j', async (flags) => {
    const { response, next } = await call({ ...sandbox(), ...flags });
    expect(response.status).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not use host or build variables to promote an unknown environment', async () => {
    const env = { ...sandbox(), PAGES_DEPLOYMENT_ENV: undefined, CF_PAGES_BRANCH: 'cloudflare-production', CF_PAGES_URL: 'https://holybear.tw' };
    const { response, next } = await call(env, '/api/health', { host: 'holybear.tw', origin: 'https://holybear.tw', 'x-forwarded-host': 'holybear.tw' });
    expect(response.status).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows explicitly configured Preview to reach its existing handlers', async () => {
    const { response, next } = await call(sandbox());
    expect(next).toHaveBeenCalledOnce();
    expect(await response.text()).toBe('unchanged');
  });

  it('leaves Production response, caching and optional-secret handling unchanged', async () => {
    const { response, next } = await call({ PAGES_DEPLOYMENT_ENV: 'production' });
    expect(next).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(await response.text()).toBe('unchanged');
  });
});


const surveySandbox = () => ({
  PAGES_DEPLOYMENT_ENV: 'survey-preview',
  PREVIEW_FUNCTIONS_ENABLED: 'true',
  PREVIEW_RESOURCE_SCOPE: 'survey-only',
  SURVEY_DB: { prepare: vi.fn() },
  TURNSTILE_SITE_KEY: 'test-only-survey-site-key',
  ...Object.fromEntries(SURVEY_PREVIEW_REQUIRED_SECRETS.map((name) => [name, `test-only-${name}`])),
}) as unknown as Env;

describe('existing isolated survey-preview profile', () => {
  it.each([
    '/api/survey', '/api/survey/', '/api/survey/site-key', '/api/admin/session',
    '/api/admin/survey', '/api/admin/survey/1',
  ])('permits only the existing survey handler at %s without Maple resources', async (path) => {
    const { response, next } = await call(surveySandbox(), path);
    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledOnce();
  });

  it.each([
    '/api/health', '/api/characters/test', '/api/nexon/id', '/api/growth/generate',
    '/api/admin/growth', '/api/internal/consumer/fallback', '/api/maintenance/validate',
    '/api/survey-extra', '/api/survey/private', '/api/admin/survey/1/other',
    '/api/admin/survey/../growth', '/api/admin/survey/%31',
  ])('rejects unrelated and lookalike paths at %s', async (path) => {
    const env = surveySandbox();
    const { response, next } = await call(env, path);
    expect(response.status).toBe(503);
    expect(next).not.toHaveBeenCalled();
    expect(env.SURVEY_DB.prepare).not.toHaveBeenCalled();
  });

  it.each(['DB', 'EVIDENCE_ARCHIVE', 'NEXON_RATE_LIMITER'] as const)('rejects any extra %s binding before a survey handler runs', async (name) => {
    const env = { ...surveySandbox(), [name]: sandbox()[name] };
    const { response, next } = await call(env, '/api/survey');
    expect(response.status).toBe(503);
    expect(next).not.toHaveBeenCalled();
    expect(env.SURVEY_DB.prepare).not.toHaveBeenCalled();
  });

  it.each(['SURVEY_DB', 'TURNSTILE_SITE_KEY', ...SURVEY_PREVIEW_REQUIRED_SECRETS] as const)('fails closed without survey configuration %s', async (name) => {
    const env: Partial<Env> = surveySandbox();
    delete env[name];
    const { response, next } = await call(env, '/api/survey');
    expect(response.status).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    { PREVIEW_FUNCTIONS_ENABLED: 'false' }, { PREVIEW_RESOURCE_SCOPE: 'isolated' },
    { PREVIEW_RESOURCE_SCOPE: undefined }, { SURVEY_ADMIN_SECRET: ' ' },
    { SURVEY_DB: undefined },
  ])('rejects incomplete survey enablement %j', async (flags) => {
    const { response, next } = await call({ ...surveySandbox(), ...flags }, '/api/survey');
    expect(response.status).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['preview', undefined])('a survey Host or forwarded header cannot promote marker %s', async (marker) => {
    const env = { ...surveySandbox(), PAGES_DEPLOYMENT_ENV: marker, CF_PAGES_BRANCH: 'survey-preview' };
    const { response, next } = await call(env, '/api/survey', {
      host: 'survey-preview.holybear-tw.pages.dev',
      origin: 'https://survey-preview.holybear-tw.pages.dev',
      'x-forwarded-host': 'survey-preview.holybear-tw.pages.dev',
    }, 'survey-preview.holybear-tw.pages.dev');
    expect(response.status).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps the existing public site-key handler functional', async () => {
    const { onRequestGet } = await import('../../functions/api/survey/site-key');
    const env = surveySandbox();
    const request = new Request('https://survey-preview.holybear-tw.pages.dev/api/survey/site-key');
    const response = await onRequest({ env, request, next: () => onRequestGet({ env, request } as never) } as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ siteKey: env.TURNSTILE_SITE_KEY });
    expect(env.SURVEY_DB.prepare).not.toHaveBeenCalled();
  });

  it('still requires the existing survey admin authentication', async () => {
    const { onRequestGet } = await import('../../functions/api/admin/session');
    const env = surveySandbox();
    for (const authenticated of [false, true]) {
      const request = new Request('https://survey-preview.holybear-tw.pages.dev/api/admin/session', {
        headers: authenticated ? { authorization: `Bearer ${env.SURVEY_ADMIN_SECRET}` } : {},
      });
      const response = await onRequest({ env, request, next: () => onRequestGet({ env, request } as never) } as never);
      expect(response.status).toBe(authenticated ? 200 : 401);
    }
    expect(env.SURVEY_DB.prepare).not.toHaveBeenCalled();
  });
});
