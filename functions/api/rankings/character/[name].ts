import type { AppPagesFunction } from '../../../_shared/env';
import { errorResponse, HttpError, json, methodNotAllowed, singleParam } from '../../../_shared/http';
import { getCharacterCombatPowerRank } from '../../../_shared/ranking-repository';

export const onRequestGet: AppPagesFunction<'name'> = async ({ env, params }) => {
  try {
    const name = singleParam(params.name).trim();
    if (!name) throw new HttpError(400, 'invalid_character_name', '請提供角色名稱');
    const result = await getCharacterCombatPowerRank(env.DB, name);
    if (!result) throw new HttpError(404, 'character_not_ranked', 'HolyBear 排行榜尚未收錄此角色');
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
