import { HttpError } from './http';

const NEXON_BASE_URL = 'https://open.api.nexon.com/maplestorytw/v1';

const COMMON_OCID_PARAMS = new Set(['ocid', 'date']);
const PATH_PARAMS: Record<string, ReadonlySet<string>> = {
  id: new Set(['character_name']),
  'character/skill': new Set(['ocid', 'date', 'character_skill_grade']),
};

const validateSingleValue = (key: string, value: string) => {
  if (key === 'character_name') {
    const normalized = value.trim().normalize('NFC');
    if (!normalized || [...normalized].length > 64) {
      throw new HttpError(400, 'invalid_character_name', '角色名稱格式不正確');
    }
    return normalized;
  }
  if (key === 'ocid') {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(value)) {
      throw new HttpError(400, 'invalid_ocid', 'OCID 格式不正確');
    }
    return value;
  }
  if (key === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new HttpError(400, 'invalid_date', '日期格式不正確');
    }
    return value;
  }
  if (key === 'character_skill_grade') {
    if (!/^\d{1,2}$/.test(value)) {
      throw new HttpError(400, 'invalid_skill_grade', '技能等級格式不正確');
    }
    return value;
  }
  return value;
};

export const assertAllowedBrowserOrigin = (request: Request) => {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== requestUrl.origin) {
    throw new HttpError(403, 'cross_origin_blocked', '不允許跨站呼叫 NEXON proxy');
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpError(403, 'cross_site_blocked', '不允許跨站呼叫 NEXON proxy');
  }
};

export const buildNexonProxyTarget = (path: string, requestUrl: URL) => {
  const allowedParams = PATH_PARAMS[path] ?? COMMON_OCID_PARAMS;
  const target = new URL(`${NEXON_BASE_URL}/${path}`);

  for (const key of requestUrl.searchParams.keys()) {
    if (!allowedParams.has(key)) {
      throw new HttpError(400, 'unsupported_query_parameter', `不支援的查詢參數：${key}`);
    }
    const values = requestUrl.searchParams.getAll(key);
    if (values.length !== 1) {
      throw new HttpError(400, 'duplicate_query_parameter', `查詢參數不可重複：${key}`);
    }
    target.searchParams.set(key, validateSingleValue(key, values[0]));
  }

  const required = path === 'id' ? 'character_name' : 'ocid';
  if (!target.searchParams.has(required)) {
    throw new HttpError(400, 'missing_query_parameter', `缺少必要查詢參數：${required}`);
  }
  return target;
};
