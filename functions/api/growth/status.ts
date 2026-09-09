import type { AppPagesFunction } from '../../_shared/env';
import { getGrowthStatus, normalizeGrowthOcid } from '../../_shared/growth-tracker';
import { errorResponse, HttpError, json, methodNotAllowed } from '../../_shared/http';

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    const ocid = normalizeGrowthOcid(new URL(request.url).searchParams.get('ocid'));
    if (!ocid) throw new HttpError(400, 'invalid_growth_ocid', '角色識別碼格式不正確');
    return json(await getGrowthStatus(env.DB, ocid));
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
