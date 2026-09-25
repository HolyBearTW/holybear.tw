import type { Env } from './env';
import { HttpError } from './http';

export const GROWTH_TURNSTILE_TOKEN_MAX_LENGTH = 2_048;

type TurnstileVerificationResponse = {
  success?: boolean;
};

/**
 * Verify the one-time browser token used only when a new Growth profile is
 * first admitted. The secret and token stay server-side and are never logged
 * or persisted.
 */
export const verifyGrowthTurnstile = async (request: Request, env: Env) => {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new HttpError(503, 'growth_verification_unavailable', '安全驗證服務暫時無法使用，請稍後再試');
  }

  const token = request.headers.get('x-turnstile-token')?.trim();
  if (!token || token.length > GROWTH_TURNSTILE_TOKEN_MAX_LENGTH) {
    throw new HttpError(400, 'turnstile_required', '請先完成安全驗證');
  }

  let response: Response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    });
  } catch {
    throw new HttpError(503, 'growth_verification_unavailable', '安全驗證服務暫時無法使用，請稍後再試');
  }

  if (!response.ok) {
    throw new HttpError(503, 'growth_verification_unavailable', '安全驗證服務暫時無法使用，請稍後再試');
  }

  let result: TurnstileVerificationResponse;
  try {
    result = await response.json() as TurnstileVerificationResponse;
  } catch {
    throw new HttpError(503, 'growth_verification_unavailable', '安全驗證服務暫時無法使用，請稍後再試');
  }

  if (result.success !== true) {
    throw new HttpError(403, 'turnstile_rejected', '安全驗證未通過，請重新嘗試');
  }
};
