import type { AppPagesFunction } from '../../_shared/env';
import { requireSurveyAdmin } from '../../_shared/admin-auth';
import { errorResponse, json, methodNotAllowed } from '../../_shared/http';

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    requireSurveyAdmin(request, env);
    return json({ authenticated: true });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
