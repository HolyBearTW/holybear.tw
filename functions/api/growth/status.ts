import type { AppPagesFunction } from '../../_shared/env';
import { getGrowthStatus, GROWTH_SHADOW_OCIDS } from '../../_shared/growth-tracker';
import { errorResponse, HttpError, json, methodNotAllowed } from '../../_shared/http';

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    const ocid = new URL(request.url).searchParams.get('ocid')?.trim() || '';
    if (!GROWTH_SHADOW_OCIDS.has(ocid)) {
      throw new HttpError(403, 'growth_shadow_not_allowed', '此角色尚未開放本站成長追蹤');
    }
    return json(await getGrowthStatus(env.DB, ocid));
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
