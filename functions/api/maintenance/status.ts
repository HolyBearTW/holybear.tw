import type { AppPagesFunction } from '../../_shared/env';
import { isMaintenanceEnabled } from '../../_shared/maintenance-bypass';
import { json, methodNotAllowed } from '../../_shared/http';

export const onRequestGet: AppPagesFunction = async ({ env }) => json({
  maintenance: isMaintenanceEnabled(env),
});

export const onRequest = () => methodNotAllowed(['GET']);
