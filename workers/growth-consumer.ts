import type { Env } from '../functions/_shared/env';
import { backfillGrowthBatch } from '../functions/_shared/growth-tracker';
import { backfillGrowthSoulBatch } from '../functions/_shared/growth-soul';

/**
 * Growth-only scheduler. All non-Growth queues remain owned by the slower
 * account-signals Worker.
 */
export default {
  scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext) {
    context.waitUntil((async () => {
      const startedAt = Date.now();
      try {
        for (let index = 0; index < 4 && Date.now() - startedAt < 15000; index += 1) {
          const soul = await backfillGrowthSoulBatch(env);
          if (!soul.processedDates) break;
          console.info('scheduled growth soul batch completed', soul);
        }
      } catch (error) {
        console.error('scheduled growth soul batch failed', error);
      }
    })());
    context.waitUntil((async () => {
      try {
        const result = await backfillGrowthBatch(env);
        console.info('scheduled growth batch completed', {
          claimed: result.claimed,
          processed: result.processed,
          completed: result.completed,
          retry: result.retry,
          failed: result.failed,
          batches: result.instrumentation.basic.batches + result.instrumentation.dojang.batches,
          logicalNexonRequests: result.requests,
          limiterWaitMs: result.instrumentation.basic.limiterWaitMs
            + result.instrumentation.dojang.limiterWaitMs,
          rateLimit429: result.instrumentation.basic.errors[429]
            + result.instrumentation.dojang.errors[429],
          retries: result.instrumentation.basic.retries + result.instrumentation.dojang.retries,
          elapsedMs: result.instrumentation.wallMs,
          stoppedBy: result.instrumentation.stoppedBy,
          pending: result.instrumentation.pending,
        });
      } catch (error) {
        console.error('scheduled growth batch failed', error);
        throw error;
      }
    })());
  },
};
