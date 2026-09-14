import type { D1Database } from '@cloudflare/workers-types';

export const ACCOUNT_SIGNAL_TYPE = 'union_raider_full' as const;
export const ACCOUNT_CHAMPION_SIGNAL_TYPE = 'union_champion_roster' as const;
export type AccountSignalQueueType = typeof ACCOUNT_SIGNAL_TYPE | typeof ACCOUNT_CHAMPION_SIGNAL_TYPE;
// Longer than the configured production retry/timeout envelope. A crashed
// worker may leave a row leased temporarily, but another worker will never
// consume the same signal while the original request can still be running.
export const ACCOUNT_SIGNAL_CLAIM_LEASE_MS = 600_000;
const ACCOUNT_SIGNAL_ON_DEMAND_WAIT_MS = 90_000;

export interface AccountSignalClaim {
  ocid: string;
  signalType: AccountSignalQueueType;
  token: string;
  claimUntil: string;
  queueVersion: number;
}

interface AccountSignalSyncRow {
  ocid: string;
  signal_type: AccountSignalQueueType;
  status: 'pending' | 'completed' | 'retry' | 'failed';
  signal_count: number;
  attempt_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  last_attempted_at: string | null;
  completed_at: string | null;
  queue_version: number;
  claim_token: string | null;
  claim_until: string | null;
}

export type AccountSignalSync = Pick<AccountSignalSyncRow,
  'ocid' | 'signal_type' | 'status' | 'signal_count' | 'attempt_count'
  | 'next_retry_at' | 'last_error' | 'last_attempted_at' | 'completed_at'
  | 'queue_version' | 'claim_token' | 'claim_until'>;

const nowIso = () => new Date().toISOString();
const leaseUntil = (now: number) => new Date(now + ACCOUNT_SIGNAL_CLAIM_LEASE_MS).toISOString();
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const isAccountSignalFresh = (
  row: Pick<AccountSignalSync, 'status' | 'completed_at'> | null | undefined,
  freshnessSeconds: number,
  now = Date.now(),
) => {
  if (!row || row.status !== 'completed' || !row.completed_at) return false;
  const completedAt = Date.parse(row.completed_at);
  return Number.isFinite(completedAt)
    && now >= completedAt
    && now - completedAt <= freshnessSeconds * 1000;
};

/**
 * The canonical write uses this statement in the same D1 batch as the
 * character upsert. The EXISTS guard means a source-only update or an older
 * rejected canonical response cannot enqueue account-signals.
 */
export const enqueueAccountSignalStatement = (
  db: D1Database,
  ocid: string,
  observedAt: string,
  requestedAt: string,
  nexonUpdatedAt: string | null,
) => db.prepare(`
  INSERT INTO account_signal_sync (
    ocid, signal_type, status, signal_count, attempt_count,
    next_retry_at, last_error, last_attempted_at, completed_at,
    created_at, updated_at, queue_version
  )
  SELECT ?1, ?2, 'pending', 0, 0, NULL, NULL, NULL, NULL, ?3, ?3, 0
  WHERE EXISTS (
    SELECT 1 FROM characters
    WHERE ocid = ?1 AND updated_at = ?3 AND nexon_requested_at = ?4
      AND ((nexon_updated_at = ?5) OR (nexon_updated_at IS NULL AND ?5 IS NULL))
  )
  ON CONFLICT(ocid, signal_type) DO UPDATE SET
    status = 'pending',
    signal_count = 0,
    next_retry_at = NULL,
    last_error = NULL,
    completed_at = NULL,
    queue_version = account_signal_sync.queue_version + 1,
    updated_at = ?3,
    claim_token = CASE
      WHEN account_signal_sync.claim_until IS NOT NULL
        AND account_signal_sync.claim_until > ?3
      THEN account_signal_sync.claim_token ELSE NULL END,
    claim_until = CASE
      WHEN account_signal_sync.claim_until IS NOT NULL
        AND account_signal_sync.claim_until > ?3
      THEN account_signal_sync.claim_until ELSE NULL END
`).bind(ocid, ACCOUNT_SIGNAL_TYPE, observedAt, requestedAt, nexonUpdatedAt);

export const ensureAccountSignalQueueRow = async (
  db: D1Database,
  ocid: string,
  signalType: AccountSignalQueueType = ACCOUNT_SIGNAL_TYPE,
) => {
  const timestamp = nowIso();
  await db.prepare(`
    INSERT INTO account_signal_sync (
      ocid, signal_type, status, signal_count, attempt_count,
      created_at, updated_at, queue_version
    ) VALUES (?1, ?2, 'pending', 0, 0, ?3, ?3, 0)
    ON CONFLICT(ocid, signal_type) DO NOTHING
  `).bind(ocid, signalType, timestamp).run();
};

export const getAccountSignalSync = async (
  db: D1Database,
  ocid: string,
  signalType: AccountSignalQueueType = ACCOUNT_SIGNAL_TYPE,
) => db.prepare(`
  SELECT ocid, signal_type, status, signal_count, attempt_count,
    next_retry_at, last_error, last_attempted_at, completed_at,
    queue_version, claim_token, claim_until
  FROM account_signal_sync
  WHERE ocid = ?1 AND signal_type = ?2
  LIMIT 1
`).bind(ocid, signalType).first<AccountSignalSync>();

const claimEligible = async (
  db: D1Database,
  ocid: string,
  now: string,
  signalType: AccountSignalQueueType = ACCOUNT_SIGNAL_TYPE,
) => {
  const row = await getAccountSignalSync(db, ocid, signalType);
  if (!row || !(
    row.status === 'pending'
    || (row.status === 'retry' && (!row.next_retry_at || row.next_retry_at <= now))
  )) return null;
  if (row.claim_until && row.claim_until > now) return null;

  const token = crypto.randomUUID();
  const until = leaseUntil(Date.parse(now));
  const claimed = await db.prepare(`
    UPDATE account_signal_sync SET
      claim_token = ?3, claim_until = ?4,
      last_attempted_at = ?5, updated_at = ?5
    WHERE ocid = ?1 AND signal_type = ?2
      AND queue_version = ?6
      AND (status = 'pending' OR (status = 'retry' AND (next_retry_at IS NULL OR next_retry_at <= ?5)))
      AND (claim_until IS NULL OR claim_until <= ?5)
      AND (
        ?7 = ?2
        OR NOT EXISTS (
          SELECT 1 FROM account_signal_sync active_full
          WHERE active_full.ocid = ?1
            AND active_full.signal_type = ?7
            AND active_full.claim_until IS NOT NULL
            AND active_full.claim_until > ?5
        )
      )
    RETURNING ocid, signal_type, claim_token, claim_until, queue_version
  `).bind(ocid, signalType, token, until, now, row.queue_version, ACCOUNT_SIGNAL_TYPE)
    .first<{ ocid: string; signal_type: AccountSignalQueueType; claim_token: string; claim_until: string; queue_version: number }>();
  if (!claimed) return null;
  return {
    ocid: claimed.ocid,
    signalType: claimed.signal_type,
    token: claimed.claim_token,
    claimUntil: claimed.claim_until,
    queueVersion: Number(claimed.queue_version),
  } satisfies AccountSignalClaim;
};

/** Claim one pending/retry row. A null result means another consumer owns it. */
export const claimAccountSignalForBackground = async (
  db: D1Database,
  ocid: string,
  freshnessSeconds: number,
  signalType: AccountSignalQueueType = ACCOUNT_SIGNAL_TYPE,
) => {
  await ensureAccountSignalQueueRow(db, ocid, signalType);
  const now = nowIso();
  const staleBefore = new Date(Date.now() - freshnessSeconds * 1000).toISOString();
  // A stale successful row becomes ordinary pending work. The claim predicate
  // below still owns the actual lease, so a concurrent consumer cannot reset a
  // live claim.
  await db.prepare(`
    UPDATE account_signal_sync SET
      status = 'pending', next_retry_at = NULL, last_error = NULL,
      completed_at = NULL, queue_version = queue_version + 1, updated_at = ?3
    WHERE ocid = ?1 AND signal_type = ?2 AND status = 'completed'
      AND (completed_at IS NULL OR completed_at <= ?4)
      AND (claim_until IS NULL OR claim_until <= ?3)
  `).bind(ocid, signalType, now, staleBefore).run();
  return claimEligible(db, ocid, nowIso(), signalType);
};

export const claimAccountChampionSignalForBackground = async (
  db: D1Database,
  ocid: string,
) => claimAccountSignalForBackground(db, ocid, 31_536_000, ACCOUNT_CHAMPION_SIGNAL_TYPE);

/**
 * On-demand /alts requests get the same lease as the background consumer.
 * Fresh completed rows are reused; missing, pending, retry, or stale rows are
 * requeued and claimed after waiting for any active background claim.
 */
export const claimAccountSignalForOnDemand = async (
  db: D1Database,
  ocid: string,
  freshnessSeconds: number,
) => {
  await ensureAccountSignalQueueRow(db, ocid, ACCOUNT_SIGNAL_TYPE);
  const deadline = Date.now() + ACCOUNT_SIGNAL_ON_DEMAND_WAIT_MS;
  let requested = false;
  while (Date.now() < deadline) {
    const now = nowIso();
    const row = await getAccountSignalSync(db, ocid, ACCOUNT_SIGNAL_TYPE);
    if (isAccountSignalFresh(row, freshnessSeconds)) return null;
    if (row?.claim_until && row.claim_until > now) {
      await sleep(100);
      continue;
    }
    if (!requested) {
      const resetAt = nowIso();
      await db.prepare(`
      UPDATE account_signal_sync SET status = 'pending',
          signal_count = 0, next_retry_at = NULL, last_error = NULL,
          completed_at = NULL, queue_version = queue_version + 1,
          updated_at = ?3
        WHERE ocid = ?1 AND signal_type = ?2
          AND (claim_until IS NULL OR claim_until <= ?3)
      `).bind(ocid, ACCOUNT_SIGNAL_TYPE, resetAt).run();
      requested = true;
    }
    const claimed = await claimEligible(db, ocid, nowIso(), ACCOUNT_SIGNAL_TYPE);
    if (claimed) return claimed;
    await sleep(100);
  }
  throw new Error('Account signal sync is busy; retry the on-demand request');
};

export const completeAccountSignalClaim = async (
  db: D1Database,
  claim: AccountSignalClaim,
  signalCount: number,
  completionReason: string | null = null,
) => {
  const timestamp = nowIso();
  await db.prepare(`
    UPDATE account_signal_sync SET
      status = CASE WHEN queue_version = ?5 THEN 'completed' ELSE 'pending' END,
      signal_count = ?3,
      attempt_count = attempt_count + 1,
      next_retry_at = NULL,
      last_error = CASE WHEN queue_version = ?5 THEN ?7 ELSE last_error END,
      completed_at = CASE WHEN queue_version = ?5 THEN ?4 ELSE completed_at END,
      updated_at = ?4,
      claim_token = NULL,
      claim_until = NULL
    WHERE ocid = ?1 AND signal_type = ?2 AND queue_version = ?5 AND claim_token = ?6
  `).bind(claim.ocid, claim.signalType, Math.max(0, Math.trunc(signalCount)), timestamp,
    claim.queueVersion, claim.token, completionReason).run();
};

export const failAccountSignalClaim = async (
  db: D1Database,
  claim: AccountSignalClaim,
  error: unknown,
  retryable: boolean,
  retryLimit: number,
) => {
  const current = await getAccountSignalSync(db, claim.ocid, claim.signalType);
  const attempts = (Number(current?.attempt_count) || 0) + 1;
  const shouldRetry = retryable && attempts < retryLimit;
  const timestamp = nowIso();
  const retryAt = shouldRetry
    ? new Date(Date.now() + Math.min(3_600_000, 30_000 * (2 ** Math.max(0, attempts - 1)))).toISOString()
    : null;
  const message = error instanceof Error ? error.message : String(error);
  await db.prepare(`
    UPDATE account_signal_sync SET
      status = CASE WHEN queue_version = ?5 THEN ?3 ELSE 'pending' END,
      attempt_count = attempt_count + 1,
      next_retry_at = CASE WHEN queue_version = ?5 THEN ?4 ELSE NULL END,
      last_error = ?6,
      updated_at = ?7,
      claim_token = NULL,
      claim_until = NULL
    WHERE ocid = ?1 AND signal_type = ?2 AND queue_version = ?5 AND claim_token = ?8
  `).bind(claim.ocid, claim.signalType, shouldRetry ? 'retry' : 'failed', retryAt,
    claim.queueVersion, message.slice(0, 1000), timestamp, claim.token).run();
  return { shouldRetry, attempts };
};
