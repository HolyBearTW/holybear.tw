import type { AppPagesFunction } from '../_shared/env';
import {
  hasValidMaintenanceBypass,
  hasValidRadarAutomationAccess,
  isMaintenanceProtectedPath,
  maintenanceResponse,
} from '../_shared/maintenance-bypass';

export const onRequest: AppPagesFunction = async ({ env, request, next }) => {
  const { pathname } = new URL(request.url);
  if (
    isMaintenanceProtectedPath(pathname)
    && !hasValidMaintenanceBypass(request, env)
    && !hasValidRadarAutomationAccess(request, env)
  ) {
    return maintenanceResponse();
  }
  return next();
};
