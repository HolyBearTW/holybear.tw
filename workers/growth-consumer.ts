import type { Env } from '../functions/_shared/env';
import { backfillGrowthBatch } from '../functions/_shared/growth-tracker';

/**
 * Growth-only scheduler. All non-Growth queues remain owned by the slower
 * account-signals Worker.
 */
export default {
  scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext) {
    context.waitUntil(backfillGrowthBatch(env).catch((error) => {
      console.error('scheduled growth batch failed', error);
      throw error;
    }));
  },
};
