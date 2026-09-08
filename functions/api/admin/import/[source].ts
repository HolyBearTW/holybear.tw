import { requireImportAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { checkpointSeedPage, failImportJob, getOrCreateImportJob, ImportBudgetError, resolveStagingBatch } from '../../../_shared/import-repository';
import { errorResponse, HttpError, json, methodNotAllowed, singleParam } from '../../../_shared/http';
import { ImportSourceUnavailableError } from '../../../_shared/importers/importer';
import { MaplerHouseImporter } from '../../../_shared/importers/maplerhouse-importer';
import { getRuntimeConfig } from '../../../_shared/runtime-config';
import { refreshRankingSnapshot } from '../../../_shared/ranking-cache';
import { getImportJob } from '../../../_shared/import-repository';
import { estimateGuildSampling, guildProgress, initializeGuildCandidates, resolveGuildMembers, stageNextGuild, withGuildImportLock } from '../../../_shared/guild-import';

interface ImportRequest {
  action?: 'start' | 'stage' | 'resolve' | 'status' | 'estimate';
  jobId?: number;
  pageSize?: number;
  maxGuilds?: number;
  allKnown?: boolean;
}

export const onRequestPost: AppPagesFunction<'source'> = async ({ env, params, request, waitUntil }) => {
  let jobId: number | undefined;
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
      const guildJob = body.action === 'start'
        ? await getOrCreateImportJob(env.DB, source)
        : body.jobId ? await getImportJob(env.DB, body.jobId) : null;
      if (!guildJob || guildJob.source !== source) throw new HttpError(400, 'invalid_guild_job', 'A valid guild jobId is required');
      if (body.action === 'status') return json({ job: guildJob, guilds: await guildProgress(env, guildJob.id) });
      const result = await withGuildImportLock(env, guildJob.id, async () => {
        const current = (await getImportJob(env.DB, guildJob.id))!;
        if (body.action === 'start') return { job: await initializeGuildCandidates(env, current, body.maxGuilds!), processed: 0 };
        if (body.action === 'stage') return stageNextGuild(env, current);
        return resolveGuildMembers(env, current);
      });
      if (body.action === 'resolve' && result.job?.status === 'completed') {
        waitUntil(refreshRankingSnapshot(env).catch((error: unknown) => console.error('Unable to refresh ranking snapshot', error)));
      }
      return json({ source, action: body.action, ...result });
    }
    const importer = source === 'maplerhouse' ? new MaplerHouseImporter() : null;
    if (!importer) throw new HttpError(404, 'unknown_import_source', 'Unknown import source');
    const body: ImportRequest = await request.json<ImportRequest>().catch(() => ({}));
    const action = body.action ?? 'stage';
    if (action !== 'stage' && action !== 'resolve') {
      throw new HttpError(400, 'invalid_action', 'This source supports only stage or resolve');
    }
    const job = await getOrCreateImportJob(env.DB, importer.source, body.jobId);
    jobId = job.id;

    if (action === 'resolve') {
      const result = await resolveStagingBatch(env, job);
      if (result.job?.status === 'completed') {
        waitUntil(refreshRankingSnapshot(env).catch((error: unknown) => console.error('Unable to refresh ranking snapshot', error)));
      }
      console.log(JSON.stringify({ source, jobId, action, ...result, durationMs: 0 }));
      return json({ source, action, ...result });
    }

    const config = getRuntimeConfig(env);
    const configuredPageSize = config.importSourcePageSize;
    const requestedPageSize = Math.trunc(Number(body.pageSize));
    const pageSize = Number.isFinite(requestedPageSize)
      ? Math.min(configuredPageSize, Math.max(1, requestedPageSize))
      : configuredPageSize;
    const pageNumber = job.last_page + 1;
    const startedAt = Date.now();
    const page = await importer.fetchPage(pageNumber, pageSize);
    const updatedJob = await checkpointSeedPage(env, job, page);
    const log = {
      source,
      jobId,
      action,
      page: page.page,
      batch: page.items.length,
      success: page.items.length,
      updated: 0,
      skipped: 0,
      failed: 0,
      complete: page.complete,
      durationMs: Date.now() - startedAt,
    };
    console.log(JSON.stringify(log));
    return json({ ...log, job: updatedJob });
  } catch (error) {
    if (error instanceof ImportBudgetError) {
      return json({ error: { code: error.code, message: error.message, budget: error.kind } }, { status: error.status });
    }
    if (jobId && !(error instanceof ImportSourceUnavailableError)) {
      await failImportJob(env.DB, jobId, error).catch((failure) => console.error('Unable to record import failure', failure));
    }
    if (error instanceof ImportSourceUnavailableError) {
      return json({ error: { code: 'source_unavailable', message: error.message } }, { status: 503 });
    }
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['POST']);
