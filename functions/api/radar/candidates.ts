import type { AppPagesFunction } from '../../_shared/env';
import { json, methodNotAllowed } from '../../_shared/http';
import { hasValidRadarAutomationAccess } from '../../_shared/maintenance-bypass';
import { getRadarCandidates } from '../../_shared/radar-candidate-repository';

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  if (!hasValidRadarAutomationAccess(request, env)) {
    return json({ error: { code: 'unauthorized', message: 'Radar automation authorization failed' } }, { status: 401 });
  }
  try {
    return json(await getRadarCandidates(env.DB));
  } catch (error) {
    console.error('Unable to build radar candidates', error);
    return json({
      degraded: true,
      unavailable: true,
      partial: true,
      error: { code: 'radar_candidates_unavailable', message: 'Radar candidates are temporarily unavailable' },
    }, { status: 503 });
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
