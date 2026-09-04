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

export const requireImportAdmin = (request: Request, env: Env) => {
  const configured = requireSecret(env.IMPORT_ADMIN_SECRET, 'IMPORT_ADMIN_SECRET');
  const authorization = request.headers.get('authorization') || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!supplied || !constantTimeEqual(supplied, configured)) {
    throw new HttpError(401, 'unauthorized', 'Importer authorization failed');
  }
};
