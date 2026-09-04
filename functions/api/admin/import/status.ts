import { requireImportAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { getImportMetrics, listImportJobs } from '../../../_shared/import-repository';
import { errorResponse, json, methodNotAllowed } from '../../../_shared/http';

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    requireImportAdmin(request, env);
    const [jobs, metrics] = await Promise.all([listImportJobs(env.DB), getImportMetrics(env.DB)]);
    return json({ jobs, metrics });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
