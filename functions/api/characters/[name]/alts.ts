import { getCharacterAlts } from '../../../_shared/account-group-repository';
import type { AppPagesFunction } from '../../../_shared/env';
import { errorResponse, HttpError, json, methodNotAllowed, singleParam } from '../../../_shared/http';

export const onRequestGet: AppPagesFunction<'name'> = async ({ env, params }) => {
  try {
    const name = singleParam(params.name).trim();
    if (!name) throw new HttpError(400, 'invalid_character_name', '請提供角色名稱');
    return json(await getCharacterAlts(env, name));
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
