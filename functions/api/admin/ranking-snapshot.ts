import { requireImportAdmin } from '../../_shared/admin-auth';
import type { AppPagesFunction } from '../../_shared/env';
import { errorResponse, json, methodNotAllowed } from '../../_shared/http';
import { refreshRankingSnapshot } from '../../_shared/ranking-cache';

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  try {
    requireImportAdmin(request, env);
    const snapshot = await refreshRankingSnapshot(env);
    return json({ ok: true, generatedAt: snapshot.generatedAt, items: snapshot.items.length, total: snapshot.total });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['POST']);
