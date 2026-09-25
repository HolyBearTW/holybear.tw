import type { AppPagesFunction } from '../../_shared/env';
import {
  admitGrowthProfile,
  getGrowthStatus,
  GrowthAdmissionError,
  normalizeGrowthOcid,
} from '../../_shared/growth-tracker';
import { verifyGrowthTurnstile } from '../../_shared/growth-turnstile';
import { errorResponse, HttpError, json, methodNotAllowed } from '../../_shared/http';

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new HttpError(415, 'unsupported_media_type', '請使用 application/json');
    }
    const payload = await request.json().catch(() => null) as { ocid?: unknown } | null;
    const ocid = normalizeGrowthOcid(payload?.ocid);
    if (!ocid) throw new HttpError(400, 'invalid_growth_ocid', '角色識別碼格式不正確');

    // Existing profiles are a read/status fast path. This intentionally runs
    // before Turnstile, quota checks, or NEXON identity validation so viewing
    // an already-created report never depends on a one-time browser token.
    const existing = await getGrowthStatus(env.DB, ocid);
    if (existing.tracked) return json(existing, { status: 202 });

    await verifyGrowthTurnstile(request, env);

    // A concurrent first-create request may have inserted the row while this
    // request was verifying. Recheck before any admission-side NEXON call.
    const raced = await getGrowthStatus(env.DB, ocid);
    if (raced.tracked) return json(raced, { status: 202 });

    await admitGrowthProfile(env, ocid);
    return json(await getGrowthStatus(env.DB, ocid), { status: 202 });
  } catch (error) {
    if (error instanceof GrowthAdmissionError) {
      return json(
        { error: { code: error.code, message: error.message } },
        {
          status: error.status,
          headers: error.retryAfterSeconds ? { 'retry-after': String(error.retryAfterSeconds) } : undefined,
        },
      );
    }
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['POST']);
