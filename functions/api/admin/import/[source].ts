import { requireImportAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { getImportJob, getOrCreateImportJob, ImportBudgetError } from '../../../_shared/import-repository';
import { errorResponse, HttpError, json, methodNotAllowed, singleParam } from '../../../_shared/http';
import { refreshRankingSnapshot } from '../../../_shared/ranking-cache';
import { estimateGuildSampling, guildProgress, initializeGuildCandidates, resolveGuildMembers, stageNextGuild, withGuildImportLock } from '../../../_shared/guild-import';

interface ImportRequest {
  action?: 'start' | 'stage' | 'resolve' | 'status' | 'estimate';
  jobId?: number;
  pageSize?: number;
  maxGuilds?: number;
  allKnown?: boolean;
  batchSize?: number;
  concurrency?: number;
}

const allowedBatchSizes = new Set([32, 64]);
const allowedConcurrency = new Set([8, 12, 16]);

export const onRequestPost: AppPagesFunction<'source'> = async ({ env, params, request, waitUntil }) => {
  try {
    requireImportAdmin(request, env);
    const source = singleParam(params.source);
    if (source === 'nexon_guild') {
      const body = await request.json<ImportRequest>();
      if (!['start', 'stage', 'resolve', 'status', 'estimate'].includes(body.action ?? '')) {
        throw new HttpError(400, 'invalid_action', 'Choose start, stage, resolve, status, or estimate');
      }
      if (body.action === 'estimate') {
        const bounded = body.allKnown !== true;
        if (bounded && (!Number.isSafeInteger(body.maxGuilds) || Number(body.maxGuilds) < 1 || Number(body.maxGuilds) > 10_000)) {
          throw new HttpError(400, 'invalid_guild_limit', 'Estimate requires maxGuilds between 1 and 10000');
        }
        return json({ source, action: body.action, estimate: await estimateGuildSampling(env, body.allKnown ? undefined : body.maxGuilds) });
      }
      if (body.action === 'start' && (!Number.isSafeInteger(body.maxGuilds) || Number(body.maxGuilds) < 1 || Number(body.maxGuilds) > 10_000)) {
        throw new HttpError(400, 'invalid_guild_limit', 'Starting a round requires maxGuilds between 1 and 10000');
      }
      if (body.action !== 'resolve' && (body.batchSize !== undefined || body.concurrency !== undefined)) {
        throw new HttpError(400, 'invalid_resolver_config', 'Resolver configuration is only valid for resolve');
      }
      if (body.batchSize !== undefined && !allowedBatchSizes.has(body.batchSize)) {
        throw new HttpError(400, 'invalid_resolver_batch_size', 'Resolver batchSize must be 32 or 64');
      }
      if (body.concurrency !== undefined && !allowedConcurrency.has(body.concurrency)) {
        throw new HttpError(400, 'invalid_resolver_concurrency', 'Resolver concurrency must be 8, 12, or 16');
      }
      const guildJob = body.action === 'start'
        ? await getOrCreateImportJob(env.DB, source)
        : body.jobId ? await getImportJob(env.DB, body.jobId) : null;
      if (!guildJob || guildJob.source !== source) throw new HttpError(400, 'invalid_guild_job', 'A valid guild jobId is required');
      if (body.action === 'status') return json({ job: guildJob, guilds: await guildProgress(env, guildJob.id) });
      const result = await withGuildImportLock(env, guildJob.id, async () => {
        const current = (await getImportJob(env.DB, guildJob.id))!;
        if (body.action === 'start') return { job: await initializeGuildCandidates(env, current, body.maxGuilds!), processed: 0 };
        if (body.action === 'stage') return stageNextGuild(env, current);
        return resolveGuildMembers(env, current, {
          batchSize: body.batchSize,
          concurrency: body.concurrency,
        });
      });
      if (body.action === 'resolve' && result.job?.status === 'completed') {
        waitUntil(refreshRankingSnapshot(env).catch((error: unknown) => console.error('Unable to refresh ranking snapshot', error)));
      }
      return json({ source, action: body.action, ...result });
    }
    throw new HttpError(404, 'unknown_import_source', 'Unknown import source');
  } catch (error) {
    if (error instanceof ImportBudgetError) {
      return json({ error: { code: error.code, message: error.message, budget: error.kind } }, { status: error.status });
    }
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['POST']);
