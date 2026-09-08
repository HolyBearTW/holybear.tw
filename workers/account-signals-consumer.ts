import { consumeQueueBatch } from '../functions/_shared/consumer-coordination';
import type { Env } from '../functions/_shared/env';

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
  },
};
