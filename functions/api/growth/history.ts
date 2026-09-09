import type { AppPagesFunction } from '../../_shared/env';
import { getGrowthHistory, GROWTH_SHADOW_OCIDS } from '../../_shared/growth-tracker';
import { errorResponse, HttpError, json, methodNotAllowed } from '../../_shared/http';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    const params = new URL(request.url).searchParams;
    const ocid = params.get('ocid')?.trim() || '';
    const start = params.get('start') || '';
    const end = params.get('end') || '';
    if (!GROWTH_SHADOW_OCIDS.has(ocid)) {
      throw new HttpError(403, 'growth_shadow_not_allowed', '此角色尚未開放本站成長追蹤');
    }
    if (!DATE_PATTERN.test(start) || !DATE_PATTERN.test(end) || start > end) {
      throw new HttpError(400, 'invalid_growth_range', '成長紀錄日期範圍不正確');
    }
    const startTime = Date.parse(`${start}T00:00:00Z`);
    const endTime = Date.parse(`${end}T00:00:00Z`);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)
      || endTime - startTime > 366 * 86_400_000) {
      throw new HttpError(400, 'invalid_growth_range', '成長紀錄一次最多查詢 367 天');
    }
    const history = await getGrowthHistory(env.DB, ocid, start, end);
    if (!history) throw new HttpError(404, 'growth_profile_not_found', '尚未建立成長檔案');
    return json(history);
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
