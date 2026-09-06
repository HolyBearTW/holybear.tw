import { requireSurveyAdmin } from '../../../_shared/admin-auth';
import type { AppPagesFunction } from '../../../_shared/env';
import { errorResponse, HttpError, json, methodNotAllowed, singleParam } from '../../../_shared/http';

export const onRequestDelete: AppPagesFunction<'id'> = async ({ env, params, request }) => {
  try {
    requireSurveyAdmin(request, env);
    if (!env.SURVEY_DB) throw new HttpError(503, 'survey_storage_unavailable', '問卷資料庫尚未設定');
    const id = Number.parseInt(singleParam(params.id), 10);
    if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, 'invalid_survey_id', '回覆編號不正確');

    const result = await env.SURVEY_DB.prepare('DELETE FROM survey_responses WHERE id = ?1').bind(id).run();
    if (!result.meta.changes) throw new HttpError(404, 'survey_response_not_found', '找不到這筆問卷回覆');
    return json({ ok: true, deletedId: id });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['DELETE']);
