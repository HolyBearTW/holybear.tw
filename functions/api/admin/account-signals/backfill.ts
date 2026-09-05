import { backfillAccountSignalBatch } from '../../../_shared/account-signal-backfill';
import { requireImportAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { errorResponse, json, methodNotAllowed } from '../../../_shared/http';

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  try {
    requireImportAdmin(request, env);
    return json(await backfillAccountSignalBatch(env));
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['POST']);
