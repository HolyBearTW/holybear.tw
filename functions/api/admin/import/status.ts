import { requireImportAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { listImportJobs } from '../../../_shared/import-repository';
import { errorResponse, json, methodNotAllowed } from '../../../_shared/http';

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    requireImportAdmin(request, env);
    return json({ jobs: await listImportJobs(env.DB) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
