import type { Env } from './env';
import {
  isDestinyWeaponPhase1,
  isDestinyWeaponPhase2,
  minIsoDate,
  upsertDestinyPhase2EventStatement,
  type EquipmentHistoryWeaponItem,
} from './growth-equipment';
import { fetchNexonJson, NexonRequestError, runWithConcurrency } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';

interface SoulTracking {
  ocid: string;
  last_synced_date: string | null;
  highest_grade: number | null;
  previous_soul_name: string | null;
  previous_weapon_name: string | null;
  earliest_destiny_phase1_date?: string | null;
  earliest_destiny_phase2_date?: string | null;
}

interface EquipmentHistory {
  item_equipment?: EquipmentHistoryWeaponItem[];
}

// The equipment endpoint returns the active preset in item_equipment.
const soulObservation = (payload: EquipmentHistory | null) => {
  const weapon = payload?.item_equipment?.find((item) => item.item_equipment_slot === '武器'
    || item.item_equipment_part === '武器');
  const gradeText = String(weapon?.soul_weapon_grade ?? '').trim();
  const numeric = Number(gradeText.match(/\d+/)?.[0]);
  const chinese = gradeText.match(/第?([一二三四五六七八九十])(?:階級|階段)?/);
  const grade = numeric >= 1 && numeric <= 10 ? numeric
    : chinese ? '一二三四五六七八九十'.indexOf(chinese[1]) + 1 : null;
  return {
    grade,
    soulName: weapon?.soul_name?.trim() || null,
    weaponName: weapon?.item_name?.trim() || null,
    destinyPhase1: isDestinyWeaponPhase1(weapon),
    destinyPhase2: isDestinyWeaponPhase2(weapon),
  };
};

// This queue is separate from the basic/dojang queue: backfilling equipment
// must not reset existing growth profiles or delay their regular refreshes.
export const backfillGrowthSoulBatch = async (env: Env) => {
  const timestamp = new Date().toISOString();
  const candidate = await env.DB.prepare(`
    SELECT p.ocid, p.basic_last_synced_date
    FROM growth_profiles p LEFT JOIN growth_soul_tracking s ON s.ocid = p.ocid
    WHERE p.basic_last_synced_date IS NOT NULL
      AND (s.last_synced_date IS NULL OR s.last_synced_date < p.basic_last_synced_date)
      AND (s.claim_until IS NULL OR s.claim_until <= ?1)
      AND (s.retry_at IS NULL OR s.retry_at <= ?1)
    ORDER BY COALESCE(s.updated_at, p.created_at), p.ocid LIMIT 1
  `).bind(timestamp).first<{ ocid: string; basic_last_synced_date: string }>();
  if (!candidate) return { processedDates: 0 };

  await env.DB.prepare(`
    INSERT INTO growth_soul_tracking (ocid, updated_at) VALUES (?1, ?2)
    ON CONFLICT(ocid) DO NOTHING
  `).bind(candidate.ocid, timestamp).run();
  const token = crypto.randomUUID();
  const lease = new Date(Date.now() + 600_000).toISOString();
  const state = await env.DB.prepare(`
    UPDATE growth_soul_tracking SET claim_token = ?2, claim_until = ?3
    WHERE ocid = ?1 AND (claim_until IS NULL OR claim_until <= ?4)
    RETURNING *
  `).bind(candidate.ocid, token, lease, timestamp).first<SoulTracking>();
  if (!state) return { processedDates: 0 };

  try {
    const config = getRuntimeConfig(env);
    const rows = await env.DB.prepare(`
      SELECT snapshot_date FROM growth_snapshots
      WHERE ocid = ?1 AND (?2 IS NULL OR snapshot_date > ?2) AND snapshot_date <= ?3
        AND (snapshot_date >= '2026-07-29' OR snapshot_date = (
          SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-29'
        ))
      ORDER BY snapshot_date LIMIT ?4
    `).bind(candidate.ocid, state.last_synced_date, candidate.basic_last_synced_date,
      config.growthBackfillBatchSize).all<{ snapshot_date: string }>();
    const settled = await runWithConcurrency(rows.results, config.growthDateConcurrency, 0, async (row) => {
      try {
        const payload = await fetchNexonJson<EquipmentHistory>(env,
          `/character/item-equipment?ocid=${encodeURIComponent(candidate.ocid)}&date=${row.snapshot_date}`);
        return { date: row.snapshot_date, ...soulObservation(payload) };
      } catch (error) {
        if (error instanceof NexonRequestError && error.status === 400 && error.nexonCode === 'OPENAPI00003') {
          return {
            date: row.snapshot_date,
            grade: null,
            soulName: null,
            weaponName: null,
            destinyPhase1: false,
            destinyPhase2: false,
          };
        }
        throw error;
      }
    });
    const rejected = settled.find((result) => result.status === 'rejected');
    if (rejected?.status === 'rejected') throw rejected.reason;
    let highest = state.highest_grade;
    let previousSoulName = state.previous_soul_name;
    let previousWeaponName = state.previous_weapon_name;
    let earliestDestinyPhase1Date = state.earliest_destiny_phase1_date ?? null;
    let earliestDestinyPhase2Date = state.earliest_destiny_phase2_date ?? null;
    let destinyTrackingChanged = false;
    const statements: D1PreparedStatement[] = [];
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      const { date, grade, soulName, weaponName, destinyPhase1, destinyPhase2 } = result.value;
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
      if (grade !== null) {
        if (highest === null && previousSoulName && previousWeaponName && previousWeaponName === weaponName) {
          statements.push(env.DB.prepare(`
            INSERT INTO growth_soul_events (ocid, snapshot_date, event_type, before_value, after_value)
            SELECT ?1, ?2, 'soul_conversion', ?3, ?4
            WHERE EXISTS (SELECT 1 FROM growth_soul_tracking WHERE ocid = ?1 AND claim_token = ?5)
            ON CONFLICT DO NOTHING
          `).bind(candidate.ocid, date, previousSoulName, `靈魂武器第 ${grade} 階段`, token));
        } else if (highest !== null && grade > highest) {
          statements.push(env.DB.prepare(`
            INSERT INTO growth_soul_events (ocid, snapshot_date, event_type, before_value, after_value)
            SELECT ?1, ?2, 'soul_grade', ?3, ?4
            WHERE EXISTS (SELECT 1 FROM growth_soul_tracking WHERE ocid = ?1 AND claim_token = ?5)
            ON CONFLICT DO NOTHING
          `).bind(candidate.ocid, date, `第 ${highest} 階段`, `第 ${grade} 階段`, token));
        }
        highest = Math.max(highest ?? 0, grade);
      }
      if (grade !== null) {
        previousSoulName = null;
        previousWeaponName = null;
      } else if (soulName) {
        previousSoulName = soulName;
        previousWeaponName = weaponName;
      }
    }
    if (earliestDestinyPhase2Date && destinyTrackingChanged) {
      statements.push(
        upsertDestinyPhase2EventStatement(
          env.DB,
          candidate.ocid,
          token,
          earliestDestinyPhase1Date,
          earliestDestinyPhase2Date,
        ),
      );
    }
    const processedDate = rows.results.at(-1)?.snapshot_date || candidate.basic_last_synced_date;
    statements.push(env.DB.prepare(`
      UPDATE growth_soul_tracking SET last_synced_date = ?3, highest_grade = ?4,
        previous_soul_name = ?5, previous_weapon_name = ?6,
        earliest_destiny_phase1_date = ?7, earliest_destiny_phase2_date = ?8,
        claim_token = NULL, claim_until = NULL, retry_at = NULL, updated_at = ?9
      WHERE ocid = ?1 AND claim_token = ?2
    `).bind(
      candidate.ocid,
      token,
      processedDate,
      highest,
      previousSoulName,
      previousWeaponName,
      earliestDestinyPhase1Date,
      earliestDestinyPhase2Date,
      new Date().toISOString(),
    ));
    await env.DB.batch(statements);
    return { processedDates: rows.results.length, ocid: candidate.ocid };
  } catch (error) {
    await env.DB.prepare(`
      UPDATE growth_soul_tracking SET claim_token = NULL, claim_until = NULL,
        retry_at = ?3, updated_at = ?4 WHERE ocid = ?1 AND claim_token = ?2
    `).bind(candidate.ocid, token, new Date(Date.now() + 300_000).toISOString(), new Date().toISOString()).run();
    throw error;
  }
};
