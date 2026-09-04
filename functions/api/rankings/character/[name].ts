import type { AppPagesFunction } from '../../../_shared/env';
import { errorResponse, HttpError, json, methodNotAllowed, singleParam } from '../../../_shared/http';
import { getCharacterCombatPowerRank } from '../../../_shared/ranking-repository';
import { cacheCharacterRank, getCachedCharacterRank } from '../../../_shared/ranking-cache';

export const onRequestGet: AppPagesFunction<'name'> = async ({ env, params, waitUntil }) => {
  const name = singleParam(params.name).trim();
  try {
    if (!name) throw new HttpError(400, 'invalid_character_name', '請提供角色名稱');
    const result = await getCharacterCombatPowerRank(env.DB, name);
    if (!result) throw new HttpError(404, 'character_not_ranked', 'HolyBear 排行榜尚未收錄此角色');
    waitUntil(cacheCharacterRank(name, result).catch((error: unknown) => console.error('Unable to cache character rank', error)));
    return json(result);
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error);
    console.error('D1 character rank unavailable; using cached snapshot', error);
    const cached = await getCachedCharacterRank(env, name).catch(() => null);
    if (cached) return json(cached, { headers: { 'x-holybear-degraded': 'ranking-cache' } });
    return json({
      error: { code: 'character_rank_temporarily_unavailable', message: '快取排行榜中找不到此角色' },
      degraded: true,
      unavailable: true,
    }, { status: 503 });
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
