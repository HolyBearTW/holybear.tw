import type { Env } from './env';
import { HttpError } from './http';
import { requireSecret } from './runtime-config';

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

const requireBearerSecret = (request: Request, configured: string | undefined, name: string, failureMessage: string) => {
  const expected = requireSecret(configured, name);
  const authorization = request.headers.get('authorization') || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!supplied || !constantTimeEqual(supplied, expected)) {
    throw new HttpError(401, 'unauthorized', failureMessage);
  }
};

export const requireImportAdmin = (request: Request, env: Env) => {
  requireBearerSecret(request, env.IMPORT_ADMIN_SECRET, 'IMPORT_ADMIN_SECRET', 'Importer authorization failed');
};

export const requireSurveyAdmin = (request: Request, env: Env) => {
  requireBearerSecret(request, env.SURVEY_ADMIN_SECRET, 'SURVEY_ADMIN_SECRET', 'Survey administrator authorization failed');
};
