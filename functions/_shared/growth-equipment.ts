import type { Env } from './env';
import { fetchNexonJson, NexonRequestError, runWithConcurrency } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';

const DAY_MS = 86_400_000;

export interface GrowthInvocationBudget {
  usedRequests: number;
  maxRequests: number;
}

export const consumeGrowthInvocationBudget = (invocationBudget?: GrowthInvocationBudget) => {
  if (!invocationBudget) return;
  if (invocationBudget.usedRequests >= invocationBudget.maxRequests) {
    throw new NexonRequestError(
      '單次排程 NEXON API 請求預算已達上限，稍後繼續同步',
      429,
      true,
      'invocation_budget_exhausted',
    );
  }
  invocationBudget.usedRequests += 1;
};

interface EquipmentCandidate {
  ocid: string;
  basic_last_synced_date: string;
  soul_last_synced_date: string | null;
  astra_last_synced_date: string | null;
  has_astra: number;
}

interface EquipmentTracking {
  ocid: string;
  last_synced_date: string | null;
  claim_until: string | null;
  retry_at: string | null;
  highest_grade?: number | null;
  previous_soul_name?: string | null;
  previous_weapon_name?: string | null;
  earliest_destiny_phase1_date?: string | null;
  earliest_destiny_phase2_date?: string | null;
  previous_item_name?: string | null;
  has_astra?: number;
}

interface EquipmentSnapshotRow {
  snapshot_date: string;
  soul_baseline: number;
  astra_baseline: number;
}

interface DestinyBackfillCandidate {
  ocid: string;
  target_date: string;
  last_checked_date: string | null;
}

interface DestinyBackfillTracking {
  ocid: string;
  target_date: string;
  last_checked_date: string | null;
  status: 'pending' | 'completed';
  scan_all: number;
  spot_check_status: 'not_applicable' | 'pending' | 'negative' | 'positive' | 'unavailable';
  spot_check_date: string | null;
  claim_token: string | null;
  claim_until: string | null;
  retry_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

/**
 * Gate for the historical Destiny backfill. Disabled by default; in 'canary' scope only the
 * explicit OCID allow-list may be processed; 'full' scope must be set explicitly.
 */
export const getDestinyBackfillGate = (env: Env) => {
  const config = getRuntimeConfig(env);
  if (!config.growthDestinyBackfillEnabled) return { enabled: false as const, ocids: null };
  if (config.growthDestinyBackfillScope === 'full') return { enabled: true as const, ocids: null };
  if (config.growthDestinyBackfillCanaryOcids.length === 0) return { enabled: false as const, ocids: null };
  return { enabled: true as const, ocids: config.growthDestinyBackfillCanaryOcids };
};

/**
 * A phase-scoped view over the shared invocation budget: increments always hit the single
 * shared counter, while the phase ceiling is bounded by both the shared max and `phaseCap`.
 */
export const createPhaseBudget = (
  shared: GrowthInvocationBudget,
  phaseCap: number,
): GrowthInvocationBudget => {
  const ceiling = shared.usedRequests + phaseCap;
  return {
    get usedRequests() { return shared.usedRequests; },
    set usedRequests(value: number) { shared.usedRequests = value; },
    get maxRequests() { return Math.min(shared.maxRequests, ceiling); },
  };
};

const destinyCandidateSnapshotSql = (targetDate: string) => `(
  gs.liberation_status IN ('2', '3')
  OR (
    gs.snapshot_date < '2025-12-03'
    AND gs.liberation_status = '1'
    AND EXISTS (
      SELECT 1 FROM growth_snapshots gs_pos
      WHERE gs_pos.ocid = gs.ocid
        AND gs_pos.liberation_status IN ('2', '3')
        AND gs_pos.snapshot_date <= ${targetDate}
    )
    AND NOT EXISTS (
      SELECT 1 FROM growth_snapshots gs_neg
      WHERE gs_neg.ocid = gs.ocid
        AND gs_neg.snapshot_date >= '2025-12-03'
        AND gs_neg.liberation_status IN ('0', '1')
        AND gs_neg.snapshot_date <= ${targetDate}
    )
  )
)`;

interface EquipmentObservation {
  date: string;
  soulBaseline: boolean;
  astraBaseline: boolean;
  grade: number | null;
  soulName: string | null;
  weaponName: string | null;
  astraName: string | null;
  destinyPhase1: boolean;
  destinyPhase2: boolean;
}

export interface EquipmentHistoryWeaponItem {
  item_equipment_part?: string;
  item_equipment_slot?: string;
  item_name?: string | null;
  item_level?: number | string | null;
  starforce?: string | number | null;
  scroll_upgrade?: string | number | null;
  scroll_upgradable_count?: string | number | null;
  scroll_upgradeable_count?: string | number | null;
  item_base_option?: {
    base_equipment_level?: number | string | null;
  } | null;
  item_etc_option?: {
    attack_power?: string | number | null;
    magic_power?: string | number | null;
  } | null;
  soul_name?: string | null;
  soul_weapon_grade?: string | null;
}

interface EquipmentHistory {
  item_equipment?: EquipmentHistoryWeaponItem[];
}

export const isDestinyWeaponPhase2 = (
  weapon: EquipmentHistoryWeaponItem | null | undefined,
): boolean => {
  if (!weapon) return false;
  const slot = String(weapon.item_equipment_slot || '').trim();
  const part = String(weapon.item_equipment_part || '').trim();
  if (slot !== '武器' && part !== '武器') return false;

  const itemName = String(weapon.item_name || '').trim();
  if (!itemName.startsWith('命運')) return false;

  const rawBaseLevel = weapon.item_base_option?.base_equipment_level ?? weapon.item_level;
  const baseLevel = Number(rawBaseLevel);
  if (Number.isFinite(baseLevel) && baseLevel > 0 && baseLevel !== 250) return false;

  if (Number(weapon.scroll_upgrade) !== 9) return false;

  const rawUpgradable = weapon.scroll_upgradable_count ?? weapon.scroll_upgradeable_count;
  if (rawUpgradable !== undefined && rawUpgradable !== null && String(rawUpgradable).trim() !== '') {
    if (Number(rawUpgradable) !== 0) return false;
  }

  const etcAttack = Number(weapon.item_etc_option?.attack_power ?? 0);
  const etcMagic = Number(weapon.item_etc_option?.magic_power ?? 0);
  return etcAttack === 81 || etcMagic === 81;
};

export const isDestinyWeaponPhase1 = (
  weapon: EquipmentHistoryWeaponItem | null | undefined,
): boolean => {
  if (!weapon || isDestinyWeaponPhase2(weapon)) return false;
  const slot = String(weapon.item_equipment_slot || '').trim();
  const part = String(weapon.item_equipment_part || '').trim();
  if (slot !== '武器' && part !== '武器') return false;

  const itemName = String(weapon.item_name || '').trim();
  if (!itemName.startsWith('命運')) return false;

  const rawBaseLevel = weapon.item_base_option?.base_equipment_level ?? weapon.item_level;
  const baseLevel = Number(rawBaseLevel);
  if (Number.isFinite(baseLevel) && baseLevel > 0 && baseLevel !== 250) return false;

  if (weapon.scroll_upgrade !== undefined && weapon.scroll_upgrade !== null && String(weapon.scroll_upgrade).trim() !== '') {
    if (Number(weapon.scroll_upgrade) !== 8) return false;
  }

  const rawUpgradable = weapon.scroll_upgradable_count ?? weapon.scroll_upgradeable_count;
  if (rawUpgradable !== undefined && rawUpgradable !== null && String(rawUpgradable).trim() !== '') {
    if (Number(rawUpgradable) !== 0) return false;
  }

  const etcAttackRaw = weapon.item_etc_option?.attack_power;
  const etcMagicRaw = weapon.item_etc_option?.magic_power;
  if (etcAttackRaw !== undefined || etcMagicRaw !== undefined) {
    const etcAttack = Number(etcAttackRaw ?? 0);
    const etcMagic = Number(etcMagicRaw ?? 0);
    if (etcAttack !== 72 && etcMagic !== 72) return false;
  }

  return true;
};

export const minIsoDate = (
  left: string | null | undefined,
  right: string | null | undefined,
): string | null => {
  const a = left?.trim() || null;
  const b = right?.trim() || null;
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
};

export const upsertDestinyPhase2EventStatement = (
  db: D1Database,
  ocid: string,
  token: string,
  earliestPhase1Date: string | null,
  earliestPhase2Date: string,
  tokenTable: 'growth_soul_tracking' | 'growth_destiny_backfill' = 'growth_soul_tracking',
) => {
  const hasPriorPhase1Evidence = Boolean(
    earliestPhase1Date && earliestPhase1Date < earliestPhase2Date,
  );
  const beforeValue = hasPriorPhase1Evidence ? '命運一階' : '';
  const afterValue = hasPriorPhase1Evidence ? '命運二階' : '首次觀測到命運二階';
  return db.prepare(`
    INSERT INTO growth_soul_events (ocid, snapshot_date, event_type, before_value, after_value)
    SELECT ?1, ?2, 'destiny_phase2', ?3, ?4
    WHERE EXISTS (SELECT 1 FROM ${tokenTable} WHERE ocid = ?1 AND claim_token = ?5)
    ON CONFLICT(ocid) WHERE event_type = 'destiny_phase2' DO UPDATE SET
      snapshot_date = CASE
        WHEN excluded.snapshot_date < growth_soul_events.snapshot_date THEN excluded.snapshot_date
        ELSE growth_soul_events.snapshot_date
      END,
      before_value = CASE
        WHEN excluded.snapshot_date <= growth_soul_events.snapshot_date THEN excluded.before_value
        ELSE growth_soul_events.before_value
      END,
      after_value = CASE
        WHEN excluded.snapshot_date <= growth_soul_events.snapshot_date THEN excluded.after_value
        ELSE growth_soul_events.after_value
      END
  `).bind(ocid, earliestPhase2Date, beforeValue, afterValue, token);
};

export const ensureDestinyBackfillRegistered = async (
  db: D1Database,
  timestamp = new Date().toISOString(),
  ocids: string[] | null = null,
) => {
  // Never overwrites an existing row, so redeploying the Worker cannot reset progress.
  const canaryFilterSql = ocids
    ? `AND s.ocid IN (${ocids.map((_, index) => `?${index + 2}`).join(', ')})`
    : '';
  await db.prepare(`
    INSERT INTO growth_destiny_backfill (
      ocid, target_date, last_checked_date, status, spot_check_status, completed_at, updated_at
    )
    SELECT
      s.ocid,
      s.last_synced_date,
      CASE WHEN EXISTS (
        SELECT 1 FROM growth_snapshots gs
        WHERE gs.ocid = s.ocid
          AND gs.snapshot_date <= s.last_synced_date
          AND ${destinyCandidateSnapshotSql('s.last_synced_date')}
      ) THEN NULL ELSE s.last_synced_date END,
      CASE WHEN EXISTS (
        SELECT 1 FROM growth_snapshots gs
        WHERE gs.ocid = s.ocid
          AND gs.snapshot_date <= s.last_synced_date
          AND ${destinyCandidateSnapshotSql('s.last_synced_date')}
      ) THEN 'pending' ELSE 'completed' END,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM growth_snapshots gs
          WHERE gs.ocid = s.ocid
            AND gs.snapshot_date <= s.last_synced_date
            AND ${destinyCandidateSnapshotSql('s.last_synced_date')}
        ) THEN 'not_applicable'
        WHEN EXISTS (
          SELECT 1 FROM growth_snapshots gs
          WHERE gs.ocid = s.ocid AND gs.snapshot_date <= s.last_synced_date
        ) THEN 'pending'
        ELSE 'not_applicable'
      END,
      CASE WHEN EXISTS (
        SELECT 1 FROM growth_snapshots gs
        WHERE gs.ocid = s.ocid
          AND gs.snapshot_date <= s.last_synced_date
          AND ${destinyCandidateSnapshotSql('s.last_synced_date')}
      ) THEN NULL ELSE ?1 END,
      ?1
    FROM growth_soul_tracking s
    WHERE s.last_synced_date IS NOT NULL
      ${canaryFilterSql}
      AND NOT EXISTS (
        SELECT 1 FROM growth_destiny_backfill b WHERE b.ocid = s.ocid
      )
  `).bind(timestamp, ...(ocids ?? [])).run();
};

const dateSpanDays = (fromDate: string | null, toDate: string, defaultStart: string) => {
  const start = fromDate ? Date.parse(`${fromDate}T00:00:00Z`) + DAY_MS : Date.parse(`${defaultStart}T00:00:00Z`);
  const end = Date.parse(`${toDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  return Math.max(1, Math.floor((end - start) / DAY_MS) + 1);
};

const estimateCandidateDates = (candidate: EquipmentCandidate, batchSize: number) => {
  const soulPending = !candidate.soul_last_synced_date
    || candidate.soul_last_synced_date < candidate.basic_last_synced_date;
  const astraPending = !candidate.has_astra && (
    !candidate.astra_last_synced_date
    || candidate.astra_last_synced_date < candidate.basic_last_synced_date
  );
  const soulDays = soulPending
    ? dateSpanDays(candidate.soul_last_synced_date, candidate.basic_last_synced_date, '2026-07-28')
    : 0;
  const astraDays = astraPending
    ? dateSpanDays(candidate.astra_last_synced_date, candidate.basic_last_synced_date, '2026-07-14')
    : 0;
  return Math.min(batchSize, Math.max(1, soulDays, astraDays));
};

const parseEquipmentPayload = (
  payload: EquipmentHistory,
  row: EquipmentSnapshotRow,
): EquipmentObservation => {
  const items = payload.item_equipment || [];
  const weapon = items.find((item) => item.item_equipment_slot === '武器' || item.item_equipment_part === '武器');
  const gradeText = String(weapon?.soul_weapon_grade ?? '').trim();
  const numericGrade = Number(gradeText.match(/\d+/)?.[0]);
  const chineseGrade = gradeText.match(/第?([一二三四五六七八九十])(?:階級|階段)?/);
  const grade = numericGrade >= 1 && numericGrade <= 10 ? numericGrade
    : chineseGrade ? '一二三四五六七八九十'.indexOf(chineseGrade[1]) + 1 : null;
  const astraItem = items.find((item) => item.item_equipment_slot === '阿斯特拉輔助武器神之子'
    || item.item_equipment_part === '阿斯特拉輔助武器神之子')
    || items.find((item) => item.item_equipment_slot === '輔助武器');
  return {
    date: row.snapshot_date,
    soulBaseline: Boolean(row.soul_baseline),
    astraBaseline: Boolean(row.astra_baseline),
    grade,
    soulName: weapon?.soul_name?.trim() || null,
    weaponName: weapon?.item_name?.trim() || null,
    astraName: astraItem?.item_name?.trim() || null,
    destinyPhase1: isDestinyWeaponPhase1(weapon),
    destinyPhase2: isDestinyWeaponPhase2(weapon),
  };
};

const releaseAndScheduleRetry = async (env: Env, ocid: string, token: string) => {
  const retryAt = new Date(Date.now() + 300_000).toISOString();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE growth_soul_tracking SET claim_token = NULL, claim_until = NULL, retry_at = ?3, updated_at = ?4 WHERE ocid = ?1 AND claim_token = ?2`)
      .bind(ocid, token, retryAt, now),
    env.DB.prepare(`UPDATE growth_astra_tracking SET claim_token = NULL, claim_until = NULL, retry_at = ?3, updated_at = ?4 WHERE ocid = ?1 AND claim_token = ?2`)
      .bind(ocid, token, retryAt, now),
  ]);
};

export const backfillGrowthEquipmentBatch = async (
  env: Env,
  invocationBudget?: GrowthInvocationBudget,
) => {
  const config = getRuntimeConfig(env);
  if (invocationBudget && invocationBudget.usedRequests >= invocationBudget.maxRequests) {
    return { processedDates: 0, processedProfiles: 0, completedProfiles: 0, requests: 0, transportAttempts: 0 };
  }

  const timestamp = new Date().toISOString();

  const candidateRows = await env.DB.prepare(`
    SELECT p.ocid, p.basic_last_synced_date,
      s.last_synced_date AS soul_last_synced_date,
      a.last_synced_date AS astra_last_synced_date,
      COALESCE(a.has_astra, 0) AS has_astra
    FROM growth_profiles p
    LEFT JOIN growth_soul_tracking s ON s.ocid = p.ocid
    LEFT JOIN growth_astra_tracking a ON a.ocid = p.ocid
    LEFT JOIN growth_destiny_backfill b ON b.ocid = p.ocid
    WHERE p.basic_last_synced_date IS NOT NULL
      AND (s.last_synced_date IS NULL OR s.last_synced_date < p.basic_last_synced_date
        OR (COALESCE(a.has_astra, 0) = 0
          AND (a.last_synced_date IS NULL OR a.last_synced_date < p.basic_last_synced_date)))
      AND (s.claim_until IS NULL OR s.claim_until <= ?1)
      AND (a.claim_until IS NULL OR a.claim_until <= ?1)
      AND (b.claim_until IS NULL OR b.claim_until <= ?1)
      AND (s.last_synced_date >= p.basic_last_synced_date OR s.retry_at IS NULL OR s.retry_at <= ?1)
      AND (COALESCE(a.has_astra, 0) = 1 OR a.last_synced_date >= p.basic_last_synced_date
        OR a.retry_at IS NULL OR a.retry_at <= ?1)
    ORDER BY
      CASE
        WHEN s.last_synced_date IS NOT NULL
          AND (COALESCE(a.has_astra, 0) = 1 OR a.last_synced_date IS NOT NULL)
          THEN 0
        ELSE 1
      END,
      p.created_at,
      p.ocid
    LIMIT ?2
  `).bind(timestamp, config.growthEquipmentProfileConcurrency).all<EquipmentCandidate>();

  if (candidateRows.results.length === 0) {
    return { processedDates: 0, processedProfiles: 0, completedProfiles: 0, requests: 0, transportAttempts: 0 };
  }

  const remainingBudget = invocationBudget
    ? Math.max(0, invocationBudget.maxRequests - invocationBudget.usedRequests)
    : Number.POSITIVE_INFINITY;
  if (remainingBudget <= 0) {
    return { processedDates: 0, processedProfiles: 0, completedProfiles: 0, requests: 0, transportAttempts: 0 };
  }
  const targetDateBudget = Math.min(
    remainingBudget,
    Math.max(config.growthBackfillBatchSize * 2, config.growthEquipmentDateConcurrency),
  );
  const maxCandidateCount = Math.min(
    config.growthEquipmentProfileConcurrency,
    remainingBudget,
  );
  const selectedCandidates: EquipmentCandidate[] = [];
  let budgetedDates = 0;
  for (const candidate of candidateRows.results) {
    const estimated = estimateCandidateDates(candidate, config.growthBackfillBatchSize);
    if (selectedCandidates.length > 0 && budgetedDates + estimated > targetDateBudget) break;
    selectedCandidates.push(candidate);
    budgetedDates += estimated;
    if (selectedCandidates.length >= maxCandidateCount) break;
  }

  const lease = new Date(Date.now() + config.growthClaimLeaseSeconds * 1_000).toISOString();
  // Claim each candidate in its own isolated D1 batch so a SQL error on one
  // profile never aborts or rolls back other profiles in the same round.
  const claimOutcomes = await Promise.allSettled(
    selectedCandidates.map(async (candidate) => {
      const token = crypto.randomUUID();
      const batchResult = await env.DB.batch([
        env.DB.prepare(`INSERT INTO growth_soul_tracking (ocid, updated_at) VALUES (?1, ?2) ON CONFLICT(ocid) DO NOTHING`)
          .bind(candidate.ocid, timestamp),
        env.DB.prepare(`INSERT INTO growth_astra_tracking (ocid, updated_at) VALUES (?1, ?2) ON CONFLICT(ocid) DO NOTHING`)
          .bind(candidate.ocid, timestamp),
        env.DB.prepare(`
          UPDATE growth_soul_tracking SET claim_token = ?2, claim_until = ?3
          WHERE ocid = ?1 AND (claim_until IS NULL OR claim_until <= ?4)
            AND NOT EXISTS (
              SELECT 1 FROM growth_destiny_backfill b
              WHERE b.ocid = ?1 AND b.claim_until IS NOT NULL AND b.claim_until > ?4
            )
          RETURNING *
        `).bind(candidate.ocid, token, lease, timestamp),
        env.DB.prepare(`
          UPDATE growth_astra_tracking SET claim_token = ?2, claim_until = ?3
          WHERE ocid = ?1 AND (claim_until IS NULL OR claim_until <= ?4)
            AND NOT EXISTS (
              SELECT 1 FROM growth_destiny_backfill b
              WHERE b.ocid = ?1 AND b.claim_until IS NOT NULL AND b.claim_until > ?4
            )
          RETURNING *
        `).bind(candidate.ocid, token, lease, timestamp),
      ]);
      const soul = (batchResult[2] as D1Result<EquipmentTracking>).results?.[0] ?? null;
      const astra = (batchResult[3] as D1Result<EquipmentTracking>).results?.[0] ?? null;
      if (soul && astra) {
        return { candidate, token, soul, astra };
      }
      if (soul) {
        await env.DB.prepare(`UPDATE growth_soul_tracking SET claim_token = NULL, claim_until = NULL WHERE ocid = ?1 AND claim_token = ?2`)
          .bind(candidate.ocid, token).run();
      } else if (astra) {
        await env.DB.prepare(`UPDATE growth_astra_tracking SET claim_token = NULL, claim_until = NULL WHERE ocid = ?1 AND claim_token = ?2`)
          .bind(candidate.ocid, token).run();
      }
      return null;
    }),
  );

  const claimedProfiles: Array<{
    candidate: EquipmentCandidate;
    token: string;
    soul: EquipmentTracking;
    astra: EquipmentTracking;
  }> = [];
  for (const outcome of claimOutcomes) {
    if (outcome.status === 'fulfilled' && outcome.value !== null) {
      claimedProfiles.push(outcome.value);
    }
  }
  if (claimedProfiles.length === 0) {
    return { processedDates: 0, processedProfiles: 0, completedProfiles: 0, requests: 0, transportAttempts: 0 };
  }

  const rowLimit = Number.isFinite(remainingBudget)
    ? Math.max(
        1,
        Math.min(
          config.growthBackfillBatchSize,
          Math.floor(remainingBudget / Math.max(1, claimedProfiles.length)),
        ),
      )
    : config.growthBackfillBatchSize;
  const snapshotOutcomes = await Promise.allSettled(
    claimedProfiles.map(async (profile) => {
      const { candidate, soul, astra } = profile;
      const rows = await env.DB.prepare(`
        SELECT gs.snapshot_date AS snapshot_date,
          CASE WHEN ?3 IS NULL THEN gs.snapshot_date = (
            SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-29'
          ) ELSE 0 END AS soul_baseline,
          CASE WHEN ?4 IS NULL AND ?5 = 0 THEN gs.snapshot_date = (
            SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-15'
          ) ELSE 0 END AS astra_baseline
        FROM growth_snapshots gs
        WHERE gs.ocid = ?1 AND gs.snapshot_date <= ?2 AND (
          (?3 IS NOT NULL AND gs.snapshot_date > ?3)
          OR (?3 IS NULL AND gs.snapshot_date >= '2026-07-29')
          OR (?3 IS NULL AND gs.snapshot_date = (
            SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-29'
          ))
          OR (?4 IS NOT NULL AND ?5 = 0 AND gs.snapshot_date > ?4)
          OR (?4 IS NULL AND ?5 = 0 AND gs.snapshot_date >= '2026-07-15')
          OR (?4 IS NULL AND ?5 = 0 AND gs.snapshot_date = (
            SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-15'
          ))
        )
        ORDER BY gs.snapshot_date LIMIT ?6
      `).bind(
        candidate.ocid,
        candidate.basic_last_synced_date,
        soul.last_synced_date,
        astra.last_synced_date,
        astra.has_astra ?? 0,
        rowLimit,
      ).all<EquipmentSnapshotRow>();
      return {
        ...profile,
        rowLimit,
        rows: rows.results,
        observations: new Array<EquipmentObservation | null>(rows.results.length).fill(null),
        earliestAstraIndex: Number.POSITIVE_INFINITY,
        failedError: null as unknown,
      };
    }),
  );

  const profileContexts: Array<{
    candidate: EquipmentCandidate;
    token: string;
    soul: EquipmentTracking;
    astra: EquipmentTracking;
    rowLimit: number;
    rows: EquipmentSnapshotRow[];
    observations: Array<EquipmentObservation | null>;
    earliestAstraIndex: number;
    failedError: unknown;
  }> = [];

  for (let i = 0; i < snapshotOutcomes.length; i += 1) {
    const outcome = snapshotOutcomes[i];
    if (outcome.status === 'fulfilled') {
      profileContexts.push(outcome.value);
    } else {
      const failedProfile = claimedProfiles[i];
      await releaseAndScheduleRetry(env, failedProfile.candidate.ocid, failedProfile.token).catch(() => undefined);
    }
  }

  const dateTasks: Array<{ profileIndex: number; rowIndex: number }> = [];
  for (let profileIndex = 0; profileIndex < profileContexts.length; profileIndex += 1) {
    const { rows } = profileContexts[profileIndex];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      dateTasks.push({ profileIndex, rowIndex });
    }
  }

  let requests = 0;
  let transportAttempts = 0;
  await runWithConcurrency(dateTasks, config.growthEquipmentDateConcurrency, 0, async ({ profileIndex, rowIndex }) => {
    const context = profileContexts[profileIndex];
    if (context.failedError !== null) return;
    const row = context.rows[rowIndex];
    const isSoulDate = context.soul.last_synced_date === null
      ? row.snapshot_date >= '2026-07-29' || Boolean(row.soul_baseline)
      : row.snapshot_date > context.soul.last_synced_date;
    if (!isSoulDate && rowIndex > context.earliestAstraIndex) {
      context.observations[rowIndex] = {
        date: row.snapshot_date,
        soulBaseline: Boolean(row.soul_baseline),
        astraBaseline: Boolean(row.astra_baseline),
        grade: null,
        soulName: null,
        weaponName: null,
        astraName: null,
        destinyPhase1: false,
        destinyPhase2: false,
      };
      return;
    }

    let logicalRequestStarted = false;
    try {
      const payload = await fetchNexonJson<EquipmentHistory>(
        env,
        `/character/item-equipment?ocid=${encodeURIComponent(context.candidate.ocid)}&date=${row.snapshot_date}`,
        () => {
          consumeGrowthInvocationBudget(invocationBudget);
          if (!logicalRequestStarted) {
            logicalRequestStarted = true;
            requests += 1;
          }
        },
        () => {
          transportAttempts += 1;
        },
      );
      const observation = parseEquipmentPayload(payload, row);
      if (observation.astraName?.startsWith('阿斯特拉')) {
        context.earliestAstraIndex = Math.min(context.earliestAstraIndex, rowIndex);
      }
      context.observations[rowIndex] = observation;
    } catch (error) {
      if (error instanceof NexonRequestError && error.status === 400 && error.nexonCode === 'OPENAPI00003') {
        context.observations[rowIndex] = {
          date: row.snapshot_date,
          soulBaseline: Boolean(row.soul_baseline),
          astraBaseline: Boolean(row.astra_baseline),
          grade: null,
          soulName: null,
          weaponName: null,
          astraName: null,
          destinyPhase1: false,
          destinyPhase2: false,
        };
        return;
      }
      if (context.failedError === null) {
        context.failedError = error;
      }
    }
  });

  let processedDates = 0;
  let processedProfiles = 0;
  let completedProfiles = 0;

  // Commit each profile in its own isolated D1 batch transaction so a SQL
  // failure on one profile never rolls back or blocks other profiles.
  await Promise.allSettled(
    profileContexts.map(async (context) => {
      const { candidate, token, soul, astra, rowLimit: contextRowLimit, rows, observations, failedError } = context;
      if (failedError !== null) {
        await releaseAndScheduleRetry(env, candidate.ocid, token);
        return;
      }

      try {
        let soulDate = soul.last_synced_date;
        let highestGrade = soul.highest_grade ?? null;
        let previousSoulName = soul.previous_soul_name ?? null;
        let previousWeaponName = soul.previous_weapon_name ?? null;
        let earliestDestinyPhase1Date = soul.earliest_destiny_phase1_date ?? null;
        let earliestDestinyPhase2Date = soul.earliest_destiny_phase2_date ?? null;
        let destinyTrackingChanged = false;
        let astraDate = astra.last_synced_date;
        let previousItemName = astra.previous_item_name ?? null;
        let hasAstra = Boolean(astra.has_astra);
        let lastSoulDate: string | null = null;
        let lastAstraDate: string | null = null;
        const statements: D1PreparedStatement[] = [];

        for (let rowIndex = 0; rowIndex < observations.length; rowIndex += 1) {
          const observation = observations[rowIndex];
          if (!observation) continue;
          const {
            date,
            soulBaseline,
            astraBaseline,
            grade,
            soulName,
            weaponName,
            astraName,
            destinyPhase1,
            destinyPhase2,
          } = observation;
          const isSoulDate = soul.last_synced_date === null
            ? date >= '2026-07-29' || soulBaseline
            : date > soul.last_synced_date;
          const isAstraDate = astra.last_synced_date === null
            ? date >= '2026-07-15' || astraBaseline
            : date > astra.last_synced_date;

          if (destinyPhase1) {
            const updated = minIsoDate(earliestDestinyPhase1Date, date);
            if (updated !== earliestDestinyPhase1Date) {
              earliestDestinyPhase1Date = updated;
              destinyTrackingChanged = true;
            }
          }
          if (destinyPhase2) {
            const updated = minIsoDate(earliestDestinyPhase2Date, date);
            if (updated !== earliestDestinyPhase2Date) {
              earliestDestinyPhase2Date = updated;
              destinyTrackingChanged = true;
            }
          }

          if (isSoulDate) {
            if (grade !== null) {
              if (highestGrade === null && previousSoulName && previousWeaponName && previousWeaponName === weaponName) {
                statements.push(env.DB.prepare(`
                  INSERT INTO growth_soul_events (ocid, snapshot_date, event_type, before_value, after_value)
                  SELECT ?1, ?2, 'soul_conversion', ?3, ?4
                  WHERE EXISTS (SELECT 1 FROM growth_soul_tracking WHERE ocid = ?1 AND claim_token = ?5)
                  ON CONFLICT DO NOTHING
                `).bind(candidate.ocid, date, previousSoulName, `靈魂武器第 ${grade} 階段`, token));
              } else if (highestGrade !== null && grade > highestGrade) {
                statements.push(env.DB.prepare(`
                  INSERT INTO growth_soul_events (ocid, snapshot_date, event_type, before_value, after_value)
                  SELECT ?1, ?2, 'soul_grade', ?3, ?4
                  WHERE EXISTS (SELECT 1 FROM growth_soul_tracking WHERE ocid = ?1 AND claim_token = ?5)
                  ON CONFLICT DO NOTHING
                `).bind(candidate.ocid, date, `第 ${highestGrade} 階段`, `第 ${grade} 階段`, token));
              }
              highestGrade = Math.max(highestGrade ?? 0, grade);
              previousSoulName = null;
              previousWeaponName = null;
            } else if (soulName) {
              previousSoulName = soulName;
              previousWeaponName = weaponName;
            }
            lastSoulDate = date;
          }

          if (!hasAstra && isAstraDate) {
            if (astraName?.startsWith('阿斯特拉')) {
              if (previousItemName) {
                statements.push(env.DB.prepare(`
                  INSERT INTO growth_astra_events (ocid, snapshot_date, before_value, after_value)
                  SELECT ?1, ?2, ?3, ?4
                  WHERE EXISTS (SELECT 1 FROM growth_astra_tracking WHERE ocid = ?1 AND claim_token = ?5)
                  ON CONFLICT DO NOTHING
                `).bind(candidate.ocid, date, previousItemName, astraName, token));
              }
              hasAstra = true;
            } else if (astraName) {
              previousItemName = astraName;
            }
            lastAstraDate = date;
          }
        }

        if (soul.last_synced_date === null || soul.last_synced_date < candidate.basic_last_synced_date) {
          soulDate = rows.length < contextRowLimit
            ? candidate.basic_last_synced_date : lastSoulDate ?? soul.last_synced_date;
        }
        if (hasAstra) {
          astraDate = candidate.basic_last_synced_date;
        } else if (astra.last_synced_date === null || astra.last_synced_date < candidate.basic_last_synced_date) {
          astraDate = rows.length < contextRowLimit
            ? candidate.basic_last_synced_date : lastAstraDate ?? astra.last_synced_date;
        }

        if (earliestDestinyPhase2Date && destinyTrackingChanged) {
          statements.push(
            upsertDestinyPhase2EventStatement(
              env.DB,
              candidate.ocid,
              token,
              earliestDestinyPhase1Date,
              earliestDestinyPhase2Date,
              'growth_soul_tracking',
            ),
          );
        }

        const now = new Date().toISOString();
        const soulComplete = Boolean(soulDate && soulDate >= candidate.basic_last_synced_date);
        const astraComplete = hasAstra || Boolean(astraDate && astraDate >= candidate.basic_last_synced_date);

        statements.push(
          env.DB.prepare(`
            UPDATE growth_soul_tracking SET last_synced_date = ?3, highest_grade = ?4,
              previous_soul_name = ?5, previous_weapon_name = ?6,
              earliest_destiny_phase1_date = CASE
                WHEN earliest_destiny_phase1_date IS NULL THEN ?7
                WHEN ?7 IS NULL THEN earliest_destiny_phase1_date
                WHEN ?7 < earliest_destiny_phase1_date THEN ?7
                ELSE earliest_destiny_phase1_date
              END,
              earliest_destiny_phase2_date = CASE
                WHEN earliest_destiny_phase2_date IS NULL THEN ?8
                WHEN ?8 IS NULL THEN earliest_destiny_phase2_date
                WHEN ?8 < earliest_destiny_phase2_date THEN ?8
                ELSE earliest_destiny_phase2_date
              END,
              claim_token = NULL, claim_until = NULL, retry_at = NULL, updated_at = ?9
            WHERE ocid = ?1 AND claim_token = ?2
          `).bind(
            candidate.ocid,
            token,
            soulDate,
            highestGrade,
            previousSoulName,
            previousWeaponName,
            earliestDestinyPhase1Date,
            earliestDestinyPhase2Date,
            now,
          ),
          env.DB.prepare(`
            UPDATE growth_astra_tracking SET last_synced_date = ?3, previous_item_name = ?4,
              has_astra = ?5, claim_token = NULL, claim_until = NULL, retry_at = NULL, updated_at = ?6
            WHERE ocid = ?1 AND claim_token = ?2
          `).bind(candidate.ocid, token, astraDate, previousItemName, hasAstra ? 1 : 0, now),
        );

        await env.DB.batch(statements);
        processedDates += rows.length;
        processedProfiles += 1;
        if (soulComplete && astraComplete) {
          completedProfiles += 1;
        }
      } catch {
        await releaseAndScheduleRetry(env, candidate.ocid, token).catch(() => undefined);
      }
    }),
  );

  return {
    processedDates,
    processedProfiles,
    completedProfiles,
    requests,
    transportAttempts,
    ocid: claimedProfiles[0].candidate.ocid,
  };
};

const releaseDestinyBackfillClaim = async (
  env: Env,
  ocid: string,
  token: string,
  scheduleRetry: boolean,
) => {
  const now = new Date().toISOString();
  const retryAt = scheduleRetry ? new Date(Date.now() + 300_000).toISOString() : null;
  await env.DB.prepare(`
    UPDATE growth_destiny_backfill
    SET claim_token = NULL, claim_until = NULL, retry_at = ?3, updated_at = ?4
    WHERE ocid = ?1 AND claim_token = ?2
  `).bind(ocid, token, retryAt, now).run();
};

export const backfillGrowthDestinyHistoryBatch = async (
  env: Env,
  invocationBudget?: GrowthInvocationBudget,
) => {
  const config = getRuntimeConfig(env);
  const gate = getDestinyBackfillGate(env);
  if (!gate.enabled) {
    return { processedDates: 0, processedProfiles: 0, completedProfiles: 0, requests: 0, transportAttempts: 0 };
  }
  if (invocationBudget && invocationBudget.usedRequests >= invocationBudget.maxRequests) {
    return { processedDates: 0, processedProfiles: 0, completedProfiles: 0, requests: 0, transportAttempts: 0 };
  }

  const timestamp = new Date().toISOString();
  await ensureDestinyBackfillRegistered(env.DB, timestamp, gate.ocids);

  const canaryOcids = gate.ocids ?? [];
  const canaryFilterSql = gate.ocids
    ? `AND b.ocid IN (${canaryOcids.map((_, index) => `?${index + 3}`).join(', ')})`
    : '';
  const candidateRows = await env.DB.prepare(`
    SELECT b.ocid, b.target_date, b.last_checked_date
    FROM growth_destiny_backfill b
    LEFT JOIN growth_soul_tracking s ON s.ocid = b.ocid
    WHERE b.status = 'pending'
      AND (b.claim_until IS NULL OR b.claim_until <= ?1)
      AND (b.retry_at IS NULL OR b.retry_at <= ?1)
      AND (s.claim_until IS NULL OR s.claim_until <= ?1)
      ${canaryFilterSql}
    ORDER BY
      CASE WHEN b.last_checked_date IS NOT NULL THEN 0 ELSE 1 END,
      b.ocid
    LIMIT ?2
  `).bind(timestamp, config.growthEquipmentProfileConcurrency, ...canaryOcids).all<DestinyBackfillCandidate>();

  if (candidateRows.results.length === 0) {
    return { processedDates: 0, processedProfiles: 0, completedProfiles: 0, requests: 0, transportAttempts: 0 };
  }

  const remainingBudget = invocationBudget
    ? Math.max(0, invocationBudget.maxRequests - invocationBudget.usedRequests)
    : Number.POSITIVE_INFINITY;
  if (remainingBudget <= 0) {
    return { processedDates: 0, processedProfiles: 0, completedProfiles: 0, requests: 0, transportAttempts: 0 };
  }

  const targetDateBudget = Math.min(
    remainingBudget,
    Math.max(config.growthBackfillBatchSize * 2, config.growthEquipmentDateConcurrency),
  );
  const maxCandidateCount = Math.min(
    config.growthEquipmentProfileConcurrency,
    remainingBudget,
  );
  const selectedCandidates: DestinyBackfillCandidate[] = [];
  let budgetedDates = 0;
  for (const candidate of candidateRows.results) {
    const estimated = Math.min(
      config.growthBackfillBatchSize,
      dateSpanDays(candidate.last_checked_date, candidate.target_date, '2025-12-03'),
    );
    if (selectedCandidates.length > 0 && budgetedDates + estimated > targetDateBudget) break;
    selectedCandidates.push(candidate);
    budgetedDates += estimated;
    if (selectedCandidates.length >= maxCandidateCount) break;
  }

  const lease = new Date(Date.now() + config.growthClaimLeaseSeconds * 1_000).toISOString();
  const claimOutcomes = await Promise.allSettled(
    selectedCandidates.map(async (candidate) => {
      const token = crypto.randomUUID();
      const batchResult = await env.DB.batch([
        env.DB.prepare(`INSERT INTO growth_soul_tracking (ocid, updated_at) VALUES (?1, ?2) ON CONFLICT(ocid) DO NOTHING`)
          .bind(candidate.ocid, timestamp),
        env.DB.prepare(`
          UPDATE growth_destiny_backfill
          SET claim_token = ?2, claim_until = ?3
          WHERE ocid = ?1
            AND status = 'pending'
            AND (claim_until IS NULL OR claim_until <= ?4)
            AND NOT EXISTS (
              SELECT 1 FROM growth_soul_tracking s
              WHERE s.ocid = ?1 AND s.claim_until IS NOT NULL AND s.claim_until > ?4
            )
          RETURNING *
        `).bind(candidate.ocid, token, lease, timestamp),
      ]);
      const backfill = (batchResult[1] as D1Result<DestinyBackfillTracking>).results?.[0] ?? null;
      if (!backfill) return null;
      const soul = await env.DB.prepare(`
        SELECT ocid, last_synced_date, claim_until, retry_at,
          earliest_destiny_phase1_date, earliest_destiny_phase2_date
        FROM growth_soul_tracking
        WHERE ocid = ?1
      `).bind(candidate.ocid).first<EquipmentTracking>();
      return { candidate, token, backfill, soul };
    }),
  );

  const claimedProfiles: Array<{
    candidate: DestinyBackfillCandidate;
    token: string;
    backfill: DestinyBackfillTracking;
    soul: EquipmentTracking | null;
  }> = [];
  for (const outcome of claimOutcomes) {
    if (outcome.status === 'fulfilled' && outcome.value !== null) {
      claimedProfiles.push(outcome.value);
    }
  }
  if (claimedProfiles.length === 0) {
    return { processedDates: 0, processedProfiles: 0, completedProfiles: 0, requests: 0, transportAttempts: 0 };
  }

  const rowLimit = Number.isFinite(remainingBudget)
    ? Math.max(
        1,
        Math.min(
          config.growthBackfillBatchSize,
          Math.floor(remainingBudget / Math.max(1, claimedProfiles.length)),
        ),
      )
    : config.growthBackfillBatchSize;

  const snapshotOutcomes = await Promise.allSettled(
    claimedProfiles.map(async (profile) => {
      const { candidate, backfill } = profile;
      const rows = await env.DB.prepare(`
        SELECT gs.snapshot_date AS snapshot_date,
          0 AS soul_baseline,
          0 AS astra_baseline
        FROM growth_snapshots gs
        WHERE gs.ocid = ?1
          AND (?2 IS NULL OR gs.snapshot_date > ?2)
          AND gs.snapshot_date <= ?3
          AND (
            ${destinyCandidateSnapshotSql('?3')}
            OR ?5 = 1
          )
        ORDER BY gs.snapshot_date ASC
        LIMIT ?4
      `).bind(
        candidate.ocid,
        backfill.last_checked_date,
        backfill.target_date,
        rowLimit,
        backfill.scan_all ? 1 : 0,
      ).all<EquipmentSnapshotRow>();
      return {
        ...profile,
        rowLimit,
        rows: rows.results,
        observations: new Array<EquipmentObservation | null>(rows.results.length).fill(null),
        failedError: null as unknown,
      };
    }),
  );

  const profileContexts: Array<{
    candidate: DestinyBackfillCandidate;
    token: string;
    backfill: DestinyBackfillTracking;
    soul: EquipmentTracking | null;
    rowLimit: number;
    rows: EquipmentSnapshotRow[];
    observations: Array<EquipmentObservation | null>;
    failedError: unknown;
  }> = [];

  for (let i = 0; i < snapshotOutcomes.length; i += 1) {
    const outcome = snapshotOutcomes[i];
    if (outcome.status === 'fulfilled') {
      profileContexts.push(outcome.value);
    } else {
      const failedProfile = claimedProfiles[i];
      await releaseDestinyBackfillClaim(env, failedProfile.candidate.ocid, failedProfile.token, true)
        .catch(() => undefined);
    }
  }

  const dateTasks: Array<{ profileIndex: number; rowIndex: number }> = [];
  for (let profileIndex = 0; profileIndex < profileContexts.length; profileIndex += 1) {
    const { rows } = profileContexts[profileIndex];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      dateTasks.push({ profileIndex, rowIndex });
    }
  }

  let requests = 0;
  let transportAttempts = 0;
  // First-pass historical backfill intentionally does NOT stop early when Phase 1 + Phase 2
  // are seen; every qualifying historical date up to target_date is verified in order.
  await runWithConcurrency(dateTasks, config.growthEquipmentDateConcurrency, 0, async ({ profileIndex, rowIndex }) => {
    const context = profileContexts[profileIndex];
    if (context.failedError !== null) return;
    const row = context.rows[rowIndex];

    let logicalRequestStarted = false;
    try {
      const payload = await fetchNexonJson<EquipmentHistory>(
        env,
        `/character/item-equipment?ocid=${encodeURIComponent(context.candidate.ocid)}&date=${row.snapshot_date}`,
        () => {
          consumeGrowthInvocationBudget(invocationBudget);
          if (!logicalRequestStarted) {
            logicalRequestStarted = true;
            requests += 1;
          }
        },
        () => {
          transportAttempts += 1;
        },
      );
      context.observations[rowIndex] = parseEquipmentPayload(payload, row);
    } catch (error) {
      if (context.failedError === null) {
        context.failedError = error;
      }
    }
  });

  let processedDates = 0;
  let processedProfiles = 0;
  let completedProfiles = 0;

  await Promise.allSettled(
    profileContexts.map(async (context) => {
      const { candidate, token, backfill, soul, rowLimit: contextRowLimit, rows, observations, failedError } = context;
      const isBudgetExhausted = failedError instanceof NexonRequestError
        && failedError.code === 'invocation_budget_exhausted';

      // Determine the contiguous prefix of dates completed without gaps from index 0
      const completedPrefix: EquipmentObservation[] = [];
      for (const obs of observations) {
        if (!obs) break;
        completedPrefix.push(obs);
      }

      if (failedError !== null && completedPrefix.length === 0) {
        await releaseDestinyBackfillClaim(env, candidate.ocid, token, !isBudgetExhausted);
        return;
      }

      try {
        let earliestDestinyPhase1Date = soul?.earliest_destiny_phase1_date ?? null;
        let earliestDestinyPhase2Date = soul?.earliest_destiny_phase2_date ?? null;
        let destinyTrackingChanged = false;

        for (const obs of completedPrefix) {
          if (obs.destinyPhase1) {
            const updated = minIsoDate(earliestDestinyPhase1Date, obs.date);
            if (updated !== earliestDestinyPhase1Date) {
              earliestDestinyPhase1Date = updated;
              destinyTrackingChanged = true;
            }
          }
          if (obs.destinyPhase2) {
            const updated = minIsoDate(earliestDestinyPhase2Date, obs.date);
            if (updated !== earliestDestinyPhase2Date) {
              earliestDestinyPhase2Date = updated;
              destinyTrackingChanged = true;
            }
          }
        }

        const now = new Date().toISOString();
        const allRowsCompleted = failedError === null && completedPrefix.length === rows.length;
        const exhaustedRange = allRowsCompleted && (
          rows.length < contextRowLimit
          || (completedPrefix.at(-1)?.date ?? backfill.target_date) >= backfill.target_date
        );
        const nextCheckedDate = exhaustedRange
          ? backfill.target_date
          : completedPrefix.at(-1)?.date ?? backfill.last_checked_date;
        const nextStatus: 'pending' | 'completed' = exhaustedRange ? 'completed' : 'pending';
        const nextCompletedAt = exhaustedRange ? now : null;
        const nextRetryAt = failedError !== null && !isBudgetExhausted
          ? new Date(Date.now() + 300_000).toISOString()
          : null;

        const statements: D1PreparedStatement[] = [];
        if (destinyTrackingChanged) {
          statements.push(
            env.DB.prepare(`
              UPDATE growth_soul_tracking
              SET
                earliest_destiny_phase1_date = CASE
                  WHEN earliest_destiny_phase1_date IS NULL THEN ?2
                  WHEN ?2 IS NULL THEN earliest_destiny_phase1_date
                  WHEN ?2 < earliest_destiny_phase1_date THEN ?2
                  ELSE earliest_destiny_phase1_date
                END,
                earliest_destiny_phase2_date = CASE
                  WHEN earliest_destiny_phase2_date IS NULL THEN ?3
                  WHEN ?3 IS NULL THEN earliest_destiny_phase2_date
                  WHEN ?3 < earliest_destiny_phase2_date THEN ?3
                  ELSE earliest_destiny_phase2_date
                END,
                updated_at = ?4
              WHERE ocid = ?1
                AND EXISTS (
                  SELECT 1 FROM growth_destiny_backfill b
                  WHERE b.ocid = ?1 AND b.claim_token = ?5
                )
            `).bind(
              candidate.ocid,
              earliestDestinyPhase1Date,
              earliestDestinyPhase2Date,
              now,
              token,
            ),
          );
        }
        if (earliestDestinyPhase2Date && destinyTrackingChanged) {
          statements.push(
            upsertDestinyPhase2EventStatement(
              env.DB,
              candidate.ocid,
              token,
              earliestDestinyPhase1Date,
              earliestDestinyPhase2Date,
              'growth_destiny_backfill',
            ),
          );
        }
        statements.push(
          env.DB.prepare(`
            UPDATE growth_destiny_backfill
            SET last_checked_date = ?3,
              status = ?4,
              completed_at = ?5,
              claim_token = NULL,
              claim_until = NULL,
              retry_at = ?6,
              updated_at = ?7
            WHERE ocid = ?1 AND claim_token = ?2
          `).bind(
            candidate.ocid,
            token,
            nextCheckedDate,
            nextStatus,
            nextCompletedAt,
            nextRetryAt,
            now,
          ),
        );

        await env.DB.batch(statements);
        processedDates += completedPrefix.length;
        processedProfiles += 1;
        if (nextStatus === 'completed') {
          completedProfiles += 1;
        }
      } catch {
        await releaseDestinyBackfillClaim(env, candidate.ocid, token, true).catch(() => undefined);
      }
    }),
  );

  return {
    processedDates,
    processedProfiles,
    completedProfiles,
    requests,
    transportAttempts,
    ocid: claimedProfiles[0].candidate.ocid,
  };
};

/**
 * One-time spot check for profiles that have no Destiny candidate snapshot: fetch the equipment
 * of the latest saved snapshot once. A positive result promotes the profile back to a full
 * historical scan (even if its backfill row was already 'completed'). A negative result is
 * recorded as 'negative' only; it never proves the profile never held a Destiny weapon.
 */
export const backfillGrowthDestinySpotCheckBatch = async (
  env: Env,
  invocationBudget?: GrowthInvocationBudget,
) => {
  const zero = {
    processedDates: 0,
    processedProfiles: 0,
    completedProfiles: 0,
    positives: 0,
    requests: 0,
    transportAttempts: 0,
  };
  const config = getRuntimeConfig(env);
  const gate = getDestinyBackfillGate(env);
  if (!gate.enabled) return zero;
  if (invocationBudget && invocationBudget.usedRequests >= invocationBudget.maxRequests) return zero;

  const timestamp = new Date().toISOString();
  await ensureDestinyBackfillRegistered(env.DB, timestamp, gate.ocids);

  const remainingBudget = invocationBudget
    ? Math.max(0, invocationBudget.maxRequests - invocationBudget.usedRequests)
    : Number.POSITIVE_INFINITY;
  if (remainingBudget <= 0) return zero;

  const canaryOcids = gate.ocids ?? [];
  const canaryFilterSql = gate.ocids
    ? `AND b.ocid IN (${canaryOcids.map((_, index) => `?${index + 3}`).join(', ')})`
    : '';
  const limit = Math.min(config.growthEquipmentProfileConcurrency, remainingBudget);
  const candidateRows = await env.DB.prepare(`
    SELECT b.ocid, b.target_date, b.last_checked_date
    FROM growth_destiny_backfill b
    LEFT JOIN growth_soul_tracking s ON s.ocid = b.ocid
    WHERE b.spot_check_status = 'pending'
      AND b.status = 'completed'
      AND (b.claim_until IS NULL OR b.claim_until <= ?1)
      AND (b.retry_at IS NULL OR b.retry_at <= ?1)
      AND (s.claim_until IS NULL OR s.claim_until <= ?1)
      ${canaryFilterSql}
    ORDER BY b.ocid
    LIMIT ?2
  `).bind(timestamp, limit, ...canaryOcids).all<DestinyBackfillCandidate>();
  if (candidateRows.results.length === 0) return zero;

  const lease = new Date(Date.now() + config.growthClaimLeaseSeconds * 1_000).toISOString();
  const claimOutcomes = await Promise.allSettled(
    candidateRows.results.map(async (candidate) => {
      const token = crypto.randomUUID();
      const claimed = await env.DB.prepare(`
        UPDATE growth_destiny_backfill
        SET claim_token = ?2, claim_until = ?3
        WHERE ocid = ?1
          AND spot_check_status = 'pending'
          AND (claim_until IS NULL OR claim_until <= ?4)
          AND NOT EXISTS (
            SELECT 1 FROM growth_soul_tracking s
            WHERE s.ocid = ?1 AND s.claim_until IS NOT NULL AND s.claim_until > ?4
          )
        RETURNING ocid
      `).bind(candidate.ocid, token, lease, timestamp).all<{ ocid: string }>();
      if (!claimed.results?.[0]) return null;
      const latest = await env.DB.prepare(`
        SELECT MAX(snapshot_date) AS snapshot_date
        FROM growth_snapshots
        WHERE ocid = ?1 AND snapshot_date <= ?2
      `).bind(candidate.ocid, candidate.target_date).first<{ snapshot_date: string | null }>();
      return { candidate, token, date: latest?.snapshot_date ?? null };
    }),
  );
  const claimed: Array<{
    candidate: DestinyBackfillCandidate;
    token: string;
    date: string | null;
    result?: 'positive' | 'negative' | 'unavailable' | 'failed' | 'budget';
  }> = [];
  for (const outcome of claimOutcomes) {
    if (outcome.status === 'fulfilled' && outcome.value) claimed.push(outcome.value);
  }
  if (claimed.length === 0) return zero;

  let requests = 0;
  let transportAttempts = 0;
  await runWithConcurrency(claimed, config.growthEquipmentDateConcurrency, 0, async (item) => {
    if (!item.date) {
      item.result = 'unavailable';
      return;
    }
    let logicalRequestStarted = false;
    try {
      const payload = await fetchNexonJson<EquipmentHistory>(
        env,
        `/character/item-equipment?ocid=${encodeURIComponent(item.candidate.ocid)}&date=${item.date}`,
        () => {
          consumeGrowthInvocationBudget(invocationBudget);
          if (!logicalRequestStarted) {
            logicalRequestStarted = true;
            requests += 1;
          }
        },
        () => {
          transportAttempts += 1;
        },
      );
      const observation = parseEquipmentPayload(payload, {
        snapshot_date: item.date,
        soul_baseline: 0,
        astra_baseline: 0,
      });
      item.result = observation.destinyPhase1 || observation.destinyPhase2 ? 'positive' : 'negative';
    } catch (error) {
      if (error instanceof NexonRequestError && error.code === 'invocation_budget_exhausted') {
        item.result = 'budget';
      } else {
        item.result = 'failed';
      }
    }
  });

  let processedProfiles = 0;
  let positives = 0;
  await Promise.allSettled(
    claimed.map(async (item) => {
      const { candidate, token, result, date } = item;
      if (result === 'budget' || result === 'failed' || !result) {
        await releaseDestinyBackfillClaim(env, candidate.ocid, token, result === 'failed').catch(() => undefined);
        return;
      }
      const now = new Date().toISOString();
      try {
        if (result === 'positive') {
          // Promote back to a full scan of every saved snapshot, even if previously 'completed'.
          await env.DB.prepare(`
            UPDATE growth_destiny_backfill
            SET spot_check_status = 'positive', spot_check_date = ?3,
              scan_all = 1, status = 'pending', last_checked_date = NULL, completed_at = NULL,
              claim_token = NULL, claim_until = NULL, retry_at = NULL, updated_at = ?4
            WHERE ocid = ?1 AND claim_token = ?2
          `).bind(candidate.ocid, token, date, now).run();
          positives += 1;
        } else {
          await env.DB.prepare(`
            UPDATE growth_destiny_backfill
            SET spot_check_status = ?3, spot_check_date = ?4,
              claim_token = NULL, claim_until = NULL, retry_at = NULL, updated_at = ?5
            WHERE ocid = ?1 AND claim_token = ?2
          `).bind(candidate.ocid, token, result, date, now).run();
        }
        processedProfiles += 1;
      } catch {
        await releaseDestinyBackfillClaim(env, candidate.ocid, token, true).catch(() => undefined);
      }
    }),
  );

  return {
    processedDates: processedProfiles,
    processedProfiles,
    completedProfiles: 0,
    positives,
    requests,
    transportAttempts,
  };
};
