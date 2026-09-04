import type { AppPagesFunction } from '../../_shared/env';
import { errorResponse, json, methodNotAllowed } from '../../_shared/http';
import { getCombatPowerRanking, parseRankingFilters } from '../../_shared/ranking-repository';
import { cacheRankingPage, getCachedRankingPage } from '../../_shared/ranking-cache';

export const onRequestGet: AppPagesFunction = async ({ env, request, waitUntil }) => {
  const filters = parseRankingFilters(new URL(request.url));
  try {
    const ranking = await getCombatPowerRanking(env.DB, filters);
    waitUntil(cacheRankingPage(filters, ranking).catch((error: unknown) => console.error('Unable to cache ranking page', error)));
    return json(ranking);
  } catch (error) {
    console.error('D1 ranking unavailable; using cached snapshot', error);
    const cached = await getCachedRankingPage(env, filters).catch(() => null);
    if (cached) return json(cached, { headers: { 'x-holybear-degraded': 'ranking-cache' } });
    return json({
      error: { code: 'ranking_temporarily_unavailable', message: '排行榜主資料源與快取目前皆無法使用' },
      degraded: true,
      unavailable: true,
    }, { status: 503 });
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
