import { requireImportAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { checkpointSeedPage, failImportJob, getOrCreateImportJob, ImportBudgetError, resolveStagingBatch } from '../../../_shared/import-repository';
import { errorResponse, HttpError, json, methodNotAllowed, singleParam } from '../../../_shared/http';
import { ImportSourceUnavailableError } from '../../../_shared/importers/importer';
import { MaplerHouseImporter } from '../../../_shared/importers/maplerhouse-importer';
import { getRuntimeConfig } from '../../../_shared/runtime-config';
import { refreshRankingSnapshot } from '../../../_shared/ranking-cache';

interface ImportRequest {
  action?: 'stage' | 'resolve';
  jobId?: number;
  pageSize?: number;
}

export const onRequestPost: AppPagesFunction<'source'> = async ({ env, params, request, waitUntil }) => {
  let jobId: number | undefined;
  try {
    requireImportAdmin(request, env);
    const source = singleParam(params.source);
    const importer = source === 'maplerhouse' ? new MaplerHouseImporter() : null;
    if (!importer) throw new HttpError(404, 'unknown_import_source', 'Unknown import source');
    const body: ImportRequest = await request.json<ImportRequest>().catch(() => ({}));
    const action = body.action ?? 'stage';
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
