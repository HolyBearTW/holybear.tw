import {
  findCharacterByWorldAndName,
  isCanonicalCharacterMetadataComplete,
  normalizeCharacterName,
  upsertCanonicalNexonCharacter,
} from './character-repository';
import type { Env } from './env';
import { NexonRequestError, resolveNexonCharacter, runWithConcurrency } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';

const CLAIM_LEASE_MS = 600_000;
const FAILED_REVALIDATE_MS = 86_400_000;
const nowIso = () => new Date().toISOString();

export interface CharacterMetadataRefreshRequest {
  characterName: string;
  expectedWorldName: string;
  ocid?: string | null;
  reason: 'missing_character' | 'incomplete_metadata';
}

interface CharacterMetadataRefreshRow {
  id: number;
  normalized_name: string;
  character_name: string;
  expected_world_name: string;
  ocid: string | null;
  reason: string;
  status: 'pending' | 'completed' | 'retry' | 'failed';
  attempt_count: number;
  next_retry_at: string | null;
  claim_token: string | null;
  claim_until: string | null;
  queue_version: number;
}

interface CharacterMetadataRefreshClaim {
  row: CharacterMetadataRefreshRow;
  token: string;
  queueVersion: number;
}

export const enqueueCharacterMetadataRefreshStatement = (
  db: D1Database,
  request: CharacterMetadataRefreshRequest,
  timestamp = nowIso(),
) => db.prepare(`
  INSERT INTO character_metadata_refresh (
    normalized_name, character_name, expected_world_name, ocid, reason,
    status, attempt_count, created_at, updated_at, queue_version
  ) VALUES (?1, ?2, ?3, ?4, ?5, 'pending', 0, ?6, ?6, 0)
  ON CONFLICT(normalized_name, expected_world_name) DO UPDATE SET
    character_name = excluded.character_name,
    ocid = COALESCE(excluded.ocid, character_metadata_refresh.ocid),
    reason = excluded.reason,
    status = CASE
      WHEN character_metadata_refresh.status = 'completed'
        OR (character_metadata_refresh.status = 'failed' AND character_metadata_refresh.updated_at <= ?7)
      THEN 'pending'
      ELSE character_metadata_refresh.status END,
    attempt_count = CASE
      WHEN character_metadata_refresh.status = 'completed'
        OR (character_metadata_refresh.status = 'failed' AND character_metadata_refresh.updated_at <= ?7)
      THEN 0
      ELSE character_metadata_refresh.attempt_count END,
    next_retry_at = CASE
      WHEN character_metadata_refresh.status = 'completed'
        OR (character_metadata_refresh.status = 'failed' AND character_metadata_refresh.updated_at <= ?7)
      THEN NULL
      ELSE character_metadata_refresh.next_retry_at END,
    last_error = CASE
      WHEN character_metadata_refresh.status = 'completed'
        OR (character_metadata_refresh.status = 'failed' AND character_metadata_refresh.updated_at <= ?7)
      THEN NULL
      ELSE character_metadata_refresh.last_error END,
    completed_at = CASE
      WHEN character_metadata_refresh.status = 'completed'
        OR (character_metadata_refresh.status = 'failed' AND character_metadata_refresh.updated_at <= ?7)
      THEN NULL
      ELSE character_metadata_refresh.completed_at END,
    queue_version = CASE
      WHEN character_metadata_refresh.status = 'completed'
        OR (character_metadata_refresh.status = 'failed' AND character_metadata_refresh.updated_at <= ?7)
      THEN character_metadata_refresh.queue_version + 1
      ELSE character_metadata_refresh.queue_version END,
    updated_at = CASE
      WHEN character_metadata_refresh.status = 'failed' AND character_metadata_refresh.updated_at > ?7
      THEN character_metadata_refresh.updated_at ELSE excluded.updated_at END
`).bind(
  normalizeCharacterName(request.characterName),
  request.characterName.trim().normalize('NFC'),
  request.expectedWorldName.trim().normalize('NFC'),
  request.ocid ?? null,
  request.reason,
  timestamp,
  new Date(Date.parse(timestamp) - FAILED_REVALIDATE_MS).toISOString(),
);

export const enqueueCharacterMetadataRefreshes = async (
  db: D1Database,
  requests: CharacterMetadataRefreshRequest[],
) => {
  const unique = new Map<string, CharacterMetadataRefreshRequest>();
  for (const request of requests) {
    const normalizedName = normalizeCharacterName(request.characterName);
    const worldName = request.expectedWorldName.trim().normalize('NFC');
    if (!normalizedName || !worldName) continue;
    unique.set(`${worldName}\u0000${normalizedName}`, request);
  }
  if (unique.size === 0) return 0;
  const timestamp = nowIso();
  await db.batch([...unique.values()].map((request) => (
    enqueueCharacterMetadataRefreshStatement(db, request, timestamp)
  )));
  return unique.size;
};

const claimRow = async (db: D1Database, row: CharacterMetadataRefreshRow) => {
  const timestamp = nowIso();
  const token = crypto.randomUUID();
  const claimUntil = new Date(Date.now() + CLAIM_LEASE_MS).toISOString();
  const claimed = await db.prepare(`
    UPDATE character_metadata_refresh SET
      claim_token = ?2, claim_until = ?3, last_attempted_at = ?4, updated_at = ?4
    WHERE id = ?1 AND queue_version = ?5
      AND (status = 'pending' OR (status = 'retry' AND (next_retry_at IS NULL OR next_retry_at <= ?4)))
      AND (claim_until IS NULL OR claim_until <= ?4)
    RETURNING id
  `).bind(row.id, token, claimUntil, timestamp, row.queue_version).first<{ id: number }>();
  return claimed ? { row, token, queueVersion: row.queue_version } satisfies CharacterMetadataRefreshClaim : null;
};

const completeClaim = async (db: D1Database, claim: CharacterMetadataRefreshClaim, ocid: string) => {
  const timestamp = nowIso();
  await db.prepare(`
    UPDATE character_metadata_refresh SET
      ocid = ?2,
      status = CASE WHEN queue_version = ?3 THEN 'completed' ELSE 'pending' END,
      attempt_count = attempt_count + 1,
      next_retry_at = NULL,
      last_error = NULL,
      completed_at = CASE WHEN queue_version = ?3 THEN ?4 ELSE completed_at END,
      claim_token = NULL,
      claim_until = NULL,
      updated_at = ?4
    WHERE id = ?1 AND claim_token = ?5
  `).bind(claim.row.id, ocid, claim.queueVersion, timestamp, claim.token).run();
};

const failClaim = async (
  db: D1Database,
  claim: CharacterMetadataRefreshClaim,
  error: unknown,
  retryLimit: number,
) => {
  const attempts = Number(claim.row.attempt_count) + 1;
  const explicitlyRetryable = error instanceof NexonRequestError
    ? error.retryable
    : (error as { retryable?: boolean } | null)?.retryable !== false;
  const retry = explicitlyRetryable && attempts < retryLimit;
  const timestamp = nowIso();
  const retryAt = retry
    ? new Date(Date.now() + Math.min(3_600_000, 30_000 * (2 ** Math.max(0, attempts - 1)))).toISOString()
    : null;
  const message = error instanceof Error ? error.message : String(error);
  await db.prepare(`
    UPDATE character_metadata_refresh SET
      status = CASE WHEN queue_version = ?3 THEN ?2 ELSE 'pending' END,
      attempt_count = attempt_count + 1,
      next_retry_at = CASE WHEN queue_version = ?3 THEN ?4 ELSE NULL END,
      last_error = ?5,
      claim_token = NULL,
      claim_until = NULL,
      updated_at = ?6
    WHERE id = ?1 AND claim_token = ?7
  `).bind(claim.row.id, retry ? 'retry' : 'failed', claim.queueVersion, retryAt,
    message.slice(0, 1000), timestamp, claim.token).run();
  return retry;
};

export const refreshCharacterMetadataBatch = async (env: Env) => {
  const config = getRuntimeConfig(env);
  const timestamp = nowIso();
  const eligible = await env.DB.prepare(`
    SELECT * FROM character_metadata_refresh
    WHERE (status = 'pending' OR (status = 'retry' AND (next_retry_at IS NULL OR next_retry_at <= ?1)))
      AND (claim_until IS NULL OR claim_until <= ?1)
    ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
      COALESCE(next_retry_at, ''), id
    LIMIT ?2
  `).bind(timestamp, config.characterMetadataRefreshBatchSize).all<CharacterMetadataRefreshRow>();

  const claims: CharacterMetadataRefreshClaim[] = [];
  for (const row of eligible.results) {
    const claim = await claimRow(env.DB, row);
    if (claim) claims.push(claim);
  }

  let requestCount = 0;
  const settled = await runWithConcurrency(
    claims,
    config.characterMetadataRefreshConcurrency,
    config.characterMetadataRefreshDelayMs,
    async (claim) => {
      const existing = await findCharacterByWorldAndName(
        env.DB,
        claim.row.character_name,
        claim.row.expected_world_name,
      );
      if (existing && isCanonicalCharacterMetadataComplete(existing)) return existing;
      const character = await resolveNexonCharacter(
        env,
        claim.row.character_name,
        existing?.ocid || claim.row.ocid,
        () => { requestCount += 1; },
        claim.row.expected_world_name,
      );
      await upsertCanonicalNexonCharacter(env.DB, character, [{
        source: 'nexon',
        sourceCharacterId: character.ocid,
        observedAt: character.observedAt,
        sourceUpdatedAt: character.nexonUpdatedAt,
      }]);
      return character;
    },
  );

  let completed = 0;
  let retry = 0;
  let failed = 0;
  for (let index = 0; index < claims.length; index += 1) {
    const outcome = settled[index];
    if (outcome.status === 'fulfilled') {
      await completeClaim(env.DB, claims[index], outcome.value.ocid);
      completed += 1;
    } else if (await failClaim(env.DB, claims[index], outcome.reason, config.nexonRetryLimit)) {
      retry += 1;
    } else {
      failed += 1;
    }
  }

  return { processed: claims.length, completed, retry, failed, nexonRequests: requestCount };
};
