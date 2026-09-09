import type { Env } from './env';
import { getRuntimeConfig } from './runtime-config';

export class NexonRateLimitError extends Error {
  readonly retryable = true;
  readonly status = 503;

  constructor(message: string) {
    super(message);
    this.name = 'NexonRateLimitError';
  }
}

/**
 * Acquire one global application-level request slot. The Durable Object is
 * shared by Pages Functions and the scheduled account-signal worker, so local
 * concurrency cannot accidentally multiply the NEXON request rate.
 *
 * Local tests and local development may omit the binding. Production sets
 * NEXON_RATE_LIMITER_REQUIRED=true, which fails closed if the binding was not
 * configured instead of silently running without a global cap.
 */
export const acquireNexonRateSlot = async (env: Env) => {
  const namespace = env.NEXON_RATE_LIMITER;
  const required = env.NEXON_RATE_LIMITER_REQUIRED === 'true';
  if (!namespace) {
    if (required) throw new NexonRateLimitError('NEXON global rate limiter is not configured');
    return 0;
  }

  const config = getRuntimeConfig(env);
  const id = namespace.idFromName('maplestorytw');
  let response: Response;
  try {
    response = await namespace.get(id).fetch('https://nexon-rate-limiter/acquire', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ratePerSecond: config.nexonGlobalRpsLimit }),
    });
  } catch {
    throw new NexonRateLimitError('NEXON global rate limiter is unavailable');
  }
  if (!response.ok) throw new NexonRateLimitError('NEXON global rate limiter rejected the request');
  const payload = await response.json<{ waitMs?: unknown }>().catch(() => ({} as { waitMs?: unknown }));
  return Math.max(0, Number(payload.waitMs) || 0);
};
