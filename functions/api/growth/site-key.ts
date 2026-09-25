import type { AppPagesFunction } from '../../_shared/env';
import { json, methodNotAllowed } from '../../_shared/http';

// The site key is public by design; TURNSTILE_SECRET_KEY remains server-only.
export const onRequestGet: AppPagesFunction = async ({ env }) => json({
  siteKey: env.TURNSTILE_SITE_KEY || null,
});

export const onRequest = () => methodNotAllowed(['GET']);
