import type { AppPagesFunction } from '../_shared/env';
import {
  hasValidMaintenanceBypass,
  isMaintenanceProtectedPath,
  maintenanceResponse,
} from '../_shared/maintenance-bypass';

export const onRequest: AppPagesFunction = async ({ env, request, next }) => {
  const { pathname } = new URL(request.url);
  if (isMaintenanceProtectedPath(pathname) && !hasValidMaintenanceBypass(request, env)) {
    return maintenanceResponse();
  }
  return next();
};
