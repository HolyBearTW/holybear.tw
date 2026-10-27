import type { Env } from '../functions/_shared/env';
import { backfillGrowthBatch } from '../functions/_shared/growth-tracker';
import {
  backfillGrowthEquipmentBatch,
  type GrowthInvocationBudget,
} from '../functions/_shared/growth-equipment';
import { getRuntimeConfig } from '../functions/_shared/runtime-config';

/**
 * Growth-only scheduler. All non-Growth queues remain owned by the slower
 * account-signals Worker.
 *
 * Each NEXON request uses up to 2 fetch subrequests (1 DO rate-limiter + 1 NEXON API).
 * Total NEXON requests across basic, dojang, and equipment phases within the same
 * scheduled invocation share a single GrowthInvocationBudget (default 1,200 requests,
 * well below Cloudflare Paid Workers' 10,000 subrequest ceiling).
 */
export default {
  scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext) {
    const startedAt = Date.now();
    const config = getRuntimeConfig(env);
    const budget: GrowthInvocationBudget = {
      usedRequests: 0,
      maxRequests: config.growthInvocationRequestBudget,
    };

    const runEquipmentLoop = async () => {
      try {
        for (
          let index = 0;
          index < config.growthEquipmentMaxBatchesPerInvocation
            && Date.now() - startedAt < config.growthEquipmentInvocationBudgetMs
            && budget.usedRequests < budget.maxRequests;
          index += 1
        ) {
          const batchStartedAt = Date.now();
          const equipment = await backfillGrowthEquipmentBatch(env, budget);
          if (!equipment.processedDates && !equipment.processedProfiles) break;
          console.info('scheduled growth equipment batch completed', {
            ...equipment,
            invocationUsedRequests: budget.usedRequests,
            elapsedMs: Date.now() - batchStartedAt,
          });
        }
      } catch (error) {
        console.error('scheduled growth equipment batch failed', error);
      }
    };

    context.waitUntil((async () => {
      try {
        for (
          let pass = 0;
          pass < 2
            && (pass === 0 || Date.now() - startedAt < Math.min(config.growthInvocationBudgetMs, 25_000))
            && budget.usedRequests < budget.maxRequests;
          pass += 1
        ) {
          const result = await backfillGrowthBatch(env, budget);
          console.info('scheduled growth batch completed', {
            pass: pass + 1,
            claimed: result.claimed,
            processed: result.processed,
            completed: result.completed,
            retry: result.retry,
            failed: result.failed,
            batches: result.instrumentation.basic.batches + result.instrumentation.dojang.batches,
            logicalNexonRequests: result.requests,
            invocationUsedRequests: budget.usedRequests,
            limiterWaitMs: result.instrumentation.basic.limiterWaitMs
              + result.instrumentation.dojang.limiterWaitMs,
            rateLimit429: result.instrumentation.basic.errors[429]
              + result.instrumentation.dojang.errors[429],
            retries: result.instrumentation.basic.retries + result.instrumentation.dojang.retries,
            elapsedMs: result.instrumentation.wallMs,
            stoppedBy: result.instrumentation.stoppedBy,
            pending: result.instrumentation.pending,
          });
          if (
            result.instrumentation.stoppedBy !== 'batch_budget'
            || result.instrumentation.pending === 0
            || result.processed === 0
          ) {
            break;
          }
        }
      } catch (error) {
        console.error('scheduled growth batch failed', error);
        throw error;
      } finally {
        if (
          Date.now() - startedAt < config.growthEquipmentInvocationBudgetMs
          && budget.usedRequests < budget.maxRequests
        ) {
          await runEquipmentLoop();
        }
      }
    })());
  },
};
