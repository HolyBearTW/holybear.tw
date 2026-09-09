import type { AppPagesFunction } from '../../_shared/env';
import { createGrowthProfile, getGrowthStatus, GROWTH_SHADOW_OCIDS } from '../../_shared/growth-tracker';
import { errorResponse, HttpError, json, methodNotAllowed } from '../../_shared/http';

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new HttpError(415, 'unsupported_media_type', '請使用 application/json');
    }
    const payload = await request.json().catch(() => null) as { ocid?: unknown } | null;
    const ocid = typeof payload?.ocid === 'string' ? payload.ocid.trim() : '';
    if (!GROWTH_SHADOW_OCIDS.has(ocid)) {
      throw new HttpError(403, 'growth_shadow_not_allowed', '此角色尚未開放本站成長追蹤');
    }
    await createGrowthProfile(env.DB, ocid);
    return json(await getGrowthStatus(env.DB, ocid), { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['POST']);
