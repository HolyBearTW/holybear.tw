import { requireImportAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { errorResponse, json, methodNotAllowed } from '../../../_shared/http';
import { getRetentionStatus } from '../../../_shared/retention';

/** Read-only guardrail and retention dry-run report for administrators. */
export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    requireImportAdmin(request, env);
    return json(await getRetentionStatus(env));
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
