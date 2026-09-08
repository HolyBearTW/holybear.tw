import { requireConsumerFallback } from '../../../_shared/admin-auth';
import { runFallbackConsumer } from '../../../_shared/consumer-coordination';
import type { AppPagesFunction } from '../../../_shared/env';
import { errorResponse, json, methodNotAllowed } from '../../../_shared/http';

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  try {
    requireConsumerFallback(request, env);
    return json(await runFallbackConsumer(env));
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['POST']);
