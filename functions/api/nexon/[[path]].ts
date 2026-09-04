import type { AppPagesFunction } from '../../_shared/env';
import { errorResponse, HttpError, methodNotAllowed } from '../../_shared/http';
import { requireSecret } from '../../_shared/runtime-config';

const NEXON_BASE_URL = 'https://open.api.nexon.com/maplestorytw/v1';
const ALLOWED_PATHS = new Set([
  'id',
  'character/basic', 'character/stat', 'character/symbol-equipment',
  'character/item-equipment', 'character/ability', 'character/hyper-stat',
  'character/link-skill', 'character/pet-equipment', 'character/familiar',
  'character/set-effect', 'character/vmatrix', 'character/hexamatrix',
  'character/hexamatrix-stat', 'character/dojang', 'character/skill',
  'character/popularity', 'character/cashitem-equipment',
  'character/beauty-equipment', 'character/android-equipment',
  'user/union', 'user/union-raider', 'user/union-artifact', 'user/union-champion',
]);

export const onRequestGet: AppPagesFunction<'path'> = async ({ env, params, request }) => {
  try {
    const rawPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
    const path = rawPath.replace(/^\/+|\/+$/g, '');
    if (!ALLOWED_PATHS.has(path)) throw new HttpError(404, 'unknown_nexon_route', 'Unknown NEXON route');
    const incomingUrl = new URL(request.url);
    const target = new URL(`${NEXON_BASE_URL}/${path}`);
    incomingUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
    const response = await fetch(target, {
      headers: {
        accept: 'application/json',
        'x-nxopen-api-key': requireSecret(env.NEXON_API_KEY, 'NEXON_API_KEY'),
      },
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': response.ok ? 'public, max-age=60, s-maxage=900' : 'no-store',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
