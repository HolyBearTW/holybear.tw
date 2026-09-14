import type { Env } from './env';

/**
 * The natural key of an account signal row. These fields are the row's
 * immutable identity: a changed fingerprint creates a new signal row rather
 * than changing the identity of an existing row.
 */
export interface EvidenceIdentity {
  ocid: string;
  signalType: string;
  fingerprintVersion: number;
  unionFingerprint: string;
}

export interface EvidenceRow extends EvidenceIdentity {
  evidenceJson?: string | null;
}

const digestHex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const stableJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableJsonValue(item)]),
  );
};

/**
 * Normalize JSON payloads before hashing so retries from equivalent objects
 * address the same immutable R2 object. Invalid legacy text is preserved as
 * text and remains deterministic rather than being silently discarded.
 */
export const canonicalJsonPayload = (payload: string) => {
  try { return JSON.stringify(stableJsonValue(JSON.parse(payload))); } catch { return payload; }
};

/**
 * Hash the complete natural identity instead of using the mutable group ID.
 * The fixed tuple encoding prevents delimiter ambiguity and remains stable
 * across account-group convergence and merge operations.
 */
export const evidenceObjectKey = async (identity: EvidenceIdentity) => {
  const identityJson = JSON.stringify([
    identity.ocid,
    identity.signalType,
    identity.fingerprintVersion,
    identity.unionFingerprint,
  ]);
  return `account-signals/v1/${await digestHex(identityJson)}.json`;
};

const evidenceBucket = (env: Pick<Env, 'EVIDENCE_ARCHIVE'>) => {
  if (!env.EVIDENCE_ARCHIVE) {
    throw new Error('Evidence archive is not configured');
  }
  return env.EVIDENCE_ARCHIVE;
};

export interface CharacterSourcePayloadIdentity {
  ocid: string;
  source: string;
}

export interface StoredCharacterSourcePayload {
  objectKey: string;
  sha256: string;
  size: number;
  storedAt: string;
  contentType: string;
}

export const characterSourceObjectKey = async (
  identity: CharacterSourcePayloadIdentity,
  sha256: string,
) => `character-sources/v1/${encodeURIComponent(identity.ocid)}/${encodeURIComponent(identity.source)}/${sha256}.json`;

export const writeCharacterSourcePayload = async (
  env: Pick<Env, 'EVIDENCE_ARCHIVE'>,
  identity: CharacterSourcePayloadIdentity,
  payload: string,
): Promise<StoredCharacterSourcePayload> => {
  const normalized = canonicalJsonPayload(payload);
  const sha256 = await digestHex(normalized);
  const objectKey = await characterSourceObjectKey(identity, sha256);
  const contentType = 'application/json; charset=utf-8';
  await evidenceBucket(env).put(objectKey, normalized, {
    httpMetadata: { contentType },
  });
  return {
    objectKey,
    sha256,
    size: new TextEncoder().encode(normalized).byteLength,
    storedAt: new Date().toISOString(),
    contentType,
  };
};

/**
 * Store a new immutable payload before publishing its D1 core row. R2 errors
 * deliberately propagate so the caller can leave its queue item retryable;
 * there is no DB1 payload fallback.
 */
export const writeEvidencePayload = async (
  env: Pick<Env, 'EVIDENCE_ARCHIVE'>,
  identity: EvidenceIdentity,
  payload: string,
) => {
  const key = await evidenceObjectKey(identity);
  await evidenceBucket(env).put(key, payload, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  return key;
};

/**
 * Mixed-mode reads preserve legacy rows and support new rows whose body lives
 * in R2. A missing R2 object is returned as null so callers can decide how to
 * represent an unavailable optional audit payload.
 */
export const readEvidencePayload = async (
  env: Pick<Env, 'EVIDENCE_ARCHIVE'>,
  row: EvidenceRow,
) => {
  if (row.evidenceJson) return row.evidenceJson;
  const object = await evidenceBucket(env).get(await evidenceObjectKey(row));
  return object ? object.text() : null;
};
