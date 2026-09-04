import type { AppPagesFunction } from '../../_shared/env';
import { errorResponse, json, methodNotAllowed } from '../../_shared/http';
import { getCombatPowerRanking, parseRankingFilters } from '../../_shared/ranking-repository';

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    const filters = parseRankingFilters(new URL(request.url));
    const ranking = await getCombatPowerRanking(env.DB, filters);
    return json(ranking);
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
