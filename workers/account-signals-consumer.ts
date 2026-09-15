import { consumeQueueBatch } from '../functions/_shared/consumer-coordination';
import type { Env } from '../functions/_shared/env';
import { getRuntimeConfig } from '../functions/_shared/runtime-config';
import { RETENTION_CRON, runRetention } from '../functions/_shared/retention';

/**
 * Production account-signal consumer. It runs independently of any local
 * Windows process and shares the D1 claim lease with the legacy backfill
 * command and /alts on-demand requests.
 */
export default {
  scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext) {
    context.waitUntil(consumeQueueBatch(env, 'cloudflare_cron').catch((error) => {
      console.error('scheduled consumer batch failed', error);
      throw error;
    }));
    if (_controller.cron === RETENTION_CRON && getRuntimeConfig(env).retentionEnabled) {
      // Retention is independently bounded and never rejects the queue task.
      context.waitUntil(runRetention(env, { dryRun: false }).catch((error) => {
        console.error('scheduled retention run failed', error);
      }));
    }
  },
};
