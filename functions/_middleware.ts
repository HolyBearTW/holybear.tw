import type { AppPagesFunction } from './_shared/env';
import { isPagesRequestEnabled, previewUnavailableResponse } from './_shared/preview-isolation';

// public/_routes.json limits Functions invocation to /api/*, so static Preview
// pages remain available. This runs before API maintenance/auth/route handlers.
export const onRequest: AppPagesFunction = ({ env, request, next }) => {
  if (!isPagesRequestEnabled(env, request)) return previewUnavailableResponse();
  return next();
};
