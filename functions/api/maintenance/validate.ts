import type { AppPagesFunction } from '../../_shared/env';
import { json, methodNotAllowed } from '../../_shared/http';
import {
  hasValidMaintenanceBypass,
  maintenanceResponse,
} from '../../_shared/maintenance-bypass';

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  if (!hasValidMaintenanceBypass(request, env)) return maintenanceResponse();
  return json({ ok: true, expiresInSeconds: 30 * 60 });
};

export const onRequest = () => methodNotAllowed(['POST']);
