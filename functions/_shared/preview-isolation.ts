import type { Env } from './env';

export const PREVIEW_REQUIRED_SECRETS = [
  'NEXON_API_KEY',
  'IMPORT_ADMIN_SECRET',
  'CONSUMER_FALLBACK_SECRET',
  'SURVEY_ADMIN_SECRET',
  'SURVEY_FINGERPRINT_SECRET',
  'TURNSTILE_SECRET_KEY',
  'MAINTENANCE_BYPASS_KEY',
  'RADAR_AUTOMATION_KEY',
] as const satisfies readonly (keyof Env)[];

const configured = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const SURVEY_PREVIEW_REQUIRED_SECRETS = [
  'SURVEY_ADMIN_SECRET', 'SURVEY_FINGERPRINT_SECRET', 'TURNSTILE_SECRET_KEY',
] as const satisfies readonly (keyof Env)[];

export const isPagesApiEnabled = (env: Env): boolean => {
  // This marker is supplied by the Pages environment configuration, never by a
  // request header, hostname, or the build-time CF_PAGES_* variables.
  if (env.PAGES_DEPLOYMENT_ENV === 'production') return true;
  if (env.PAGES_DEPLOYMENT_ENV !== 'preview') return false;
  if (env.PREVIEW_FUNCTIONS_ENABLED !== 'true' || env.PREVIEW_RESOURCE_SCOPE !== 'isolated') return false;
  if (env.NEXON_RATE_LIMITER_REQUIRED !== 'true') return false;

  // Resource identity is checked in the trusted deployment config validator.
  // Runtime bindings are opaque; this check only establishes their availability.
  return typeof env.DB?.prepare === 'function'
    && typeof env.SURVEY_DB?.prepare === 'function'
    && typeof env.EVIDENCE_ARCHIVE?.put === 'function'
    && typeof env.NEXON_RATE_LIMITER?.idFromName === 'function'
    && typeof env.NEXON_RATE_LIMITER?.get === 'function'
    && configured(env.TURNSTILE_SITE_KEY)
    && PREVIEW_REQUIRED_SECRETS.every((name) => configured(env[name]));
};

export const isPagesRequestEnabled = (env: Env, request: Request): boolean => {
  if (env.PAGES_DEPLOYMENT_ENV !== 'survey-preview') return isPagesApiEnabled(env);

  // This separate profile is supplied by reviewed deployment configuration.
  // A Host, Origin or CF_PAGES_* value can never select or enable it.
  // The trusted config validator pins SURVEY_DB to the existing preview UUID;
  // the runtime binding cannot expose or attest its database identity.
  if (env.PREVIEW_FUNCTIONS_ENABLED !== 'true' || env.PREVIEW_RESOURCE_SCOPE !== 'survey-only') return false;
  if (env.DB !== undefined || env.EVIDENCE_ARCHIVE !== undefined || env.NEXON_RATE_LIMITER !== undefined) return false;
  if (typeof env.SURVEY_DB?.prepare !== 'function' || !configured(env.TURNSTILE_SITE_KEY)
    || !SURVEY_PREVIEW_REQUIRED_SECRETS.every((name) => configured(env[name]))) return false;

  const path = new URL(request.url).pathname.replace(/\/$/, '');
  // Existing handlers still enforce methods, admin authentication and Turnstile.
  return path === '/api/survey' || path === '/api/survey/site-key'
    || path === '/api/admin/session' || path === '/api/admin/survey'
    || /^\/api\/admin\/survey\/[1-9]\d*$/.test(path);
};

export const previewUnavailableResponse = () => Response.json(
  { error: { code: 'preview_unavailable', message: '預覽環境 API 尚未啟用或未完成隔離設定' } },
  { status: 503, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } },
);
