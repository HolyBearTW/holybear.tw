import type { Env } from './env';
import { json } from './http';

const PROTECTED_API_PREFIXES = [
  '/api/nexon',
  '/api/characters',
  '/api/rankings',
] as const;

const textEncoder = new TextEncoder();

const constantTimeEqual = (left: string, right: string) => {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return mismatch === 0;
};

export const isMaintenanceProtectedPath = (pathname: string) => PROTECTED_API_PREFIXES.some(
  (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
);

export const hasValidMaintenanceBypass = (request: Request, env: Env) => {
  const configuredKey = env.MAINTENANCE_BYPASS_KEY;
  const providedKey = request.headers.get('x-bypass-key');
  return Boolean(
    configuredKey
    && providedKey
    && constantTimeEqual(providedKey, configuredKey),
  );
};

export const maintenanceResponse = () => json(
  { maintenance: true, message: '系統維護中' },
  { status: 503 },
);
