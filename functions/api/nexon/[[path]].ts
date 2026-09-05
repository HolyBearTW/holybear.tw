import type { AppPagesFunction } from '../../_shared/env';
import { errorResponse, HttpError, methodNotAllowed } from '../../_shared/http';
import { assertAllowedBrowserOrigin, buildNexonProxyTarget } from '../../_shared/nexon-proxy';
import { requireSecret } from '../../_shared/runtime-config';

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

export const onRequestGet: AppPagesFunction<'path'> = async ({ env, params, request, waitUntil }) => {
  try {
    const rawPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
    const path = rawPath.replace(/^\/+|\/+$/g, '');
    if (!ALLOWED_PATHS.has(path)) throw new HttpError(404, 'unknown_nexon_route', 'Unknown NEXON route');
    assertAllowedBrowserOrigin(request);
    const incomingUrl = new URL(request.url);
    const target = buildNexonProxyTarget(path, incomingUrl);

    const edgeCache = typeof caches !== 'undefined'
      ? (caches as CacheStorage & { default: Cache }).default
      : null;
    const cacheKey = new Request(incomingUrl.toString(), { method: 'GET' });
    const cached = edgeCache ? await edgeCache.match(cacheKey) : undefined;
    if (cached) return cached;

    const response = await fetch(target, {
      headers: {
        accept: 'application/json',
        'x-nxopen-api-key': requireSecret(env.NEXON_API_KEY, 'NEXON_API_KEY'),
      },
    });
    const proxied = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': response.ok ? 'public, max-age=60, s-maxage=900' : 'no-store',
      },
    });
    if (response.ok && edgeCache) waitUntil(edgeCache.put(cacheKey, proxied.clone()));
    return proxied;
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
