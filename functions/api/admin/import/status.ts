import { requireImportAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { getImportMetrics, listImportJobs, recountImportJobCounters } from '../../../_shared/import-repository';
import { errorResponse, json, methodNotAllowed } from '../../../_shared/http';

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    requireImportAdmin(request, env);
    const recountJobId = Number.parseInt(new URL(request.url).searchParams.get('recountJobId') ?? '', 10);
    if (Number.isFinite(recountJobId) && recountJobId > 0) {
      await recountImportJobCounters(env.DB, recountJobId);
    }
    const jobs = await listImportJobs(env.DB);
    const metrics = getImportMetrics(jobs);
    return json({ jobs, metrics });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
