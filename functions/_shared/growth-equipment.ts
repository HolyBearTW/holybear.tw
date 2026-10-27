import type { Env } from './env';
import { fetchNexonJson, NexonRequestError, runWithConcurrency } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';

interface EquipmentTracking {
  ocid: string;
  last_synced_date: string | null;
  claim_until: string | null;
  retry_at: string | null;
  highest_grade?: number | null;
  previous_soul_name?: string | null;
  previous_weapon_name?: string | null;
  previous_item_name?: string | null;
  has_astra?: number;
}

interface EquipmentHistory {
  item_equipment?: Array<{
    item_equipment_part?: string;
    item_equipment_slot?: string;
    item_name?: string | null;
    soul_name?: string | null;
    soul_weapon_grade?: string | null;
  }>;
}

export const backfillGrowthEquipmentBatch = async (env: Env) => {
  const timestamp = new Date().toISOString();
  const candidate = await env.DB.prepare(`
    SELECT p.ocid, p.basic_last_synced_date
    FROM growth_profiles p
    LEFT JOIN growth_soul_tracking s ON s.ocid = p.ocid
    LEFT JOIN growth_astra_tracking a ON a.ocid = p.ocid
    WHERE p.basic_last_synced_date IS NOT NULL
      AND (s.last_synced_date IS NULL OR s.last_synced_date < p.basic_last_synced_date
        OR (COALESCE(a.has_astra, 0) = 0
          AND (a.last_synced_date IS NULL OR a.last_synced_date < p.basic_last_synced_date)))
      AND (s.claim_until IS NULL OR s.claim_until <= ?1)
      AND (a.claim_until IS NULL OR a.claim_until <= ?1)
      AND (s.last_synced_date >= p.basic_last_synced_date OR s.retry_at IS NULL OR s.retry_at <= ?1)
      AND (COALESCE(a.has_astra, 0) = 1 OR a.last_synced_date >= p.basic_last_synced_date
        OR a.retry_at IS NULL OR a.retry_at <= ?1)
    ORDER BY MIN(COALESCE(s.updated_at, p.created_at), COALESCE(a.updated_at, p.created_at)), p.ocid
    LIMIT 1
  `).bind(timestamp).first<{ ocid: string; basic_last_synced_date: string }>();
  if (!candidate) return { processedDates: 0 };

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO growth_soul_tracking (ocid, updated_at) VALUES (?1, ?2) ON CONFLICT(ocid) DO NOTHING`)
      .bind(candidate.ocid, timestamp),
    env.DB.prepare(`INSERT INTO growth_astra_tracking (ocid, updated_at) VALUES (?1, ?2) ON CONFLICT(ocid) DO NOTHING`)
      .bind(candidate.ocid, timestamp),
  ]);
  const token = crypto.randomUUID();
  const lease = new Date(Date.now() + 600_000).toISOString();
  const soul = await env.DB.prepare(`
    UPDATE growth_soul_tracking SET claim_token = ?2, claim_until = ?3
    WHERE ocid = ?1 AND (claim_until IS NULL OR claim_until <= ?4)
    RETURNING *
  `).bind(candidate.ocid, token, lease, timestamp).first<EquipmentTracking>();
  if (!soul) return { processedDates: 0 };
  const astra = await env.DB.prepare(`
    UPDATE growth_astra_tracking SET claim_token = ?2, claim_until = ?3
    WHERE ocid = ?1 AND (claim_until IS NULL OR claim_until <= ?4)
    RETURNING *
  `).bind(candidate.ocid, token, lease, timestamp).first<EquipmentTracking>();
  if (!astra) {
    await env.DB.prepare(`UPDATE growth_soul_tracking SET claim_token = NULL, claim_until = NULL WHERE ocid = ?1 AND claim_token = ?2`)
      .bind(candidate.ocid, token).run();
    return { processedDates: 0 };
  }

  try {
    const config = getRuntimeConfig(env);
    const rows = await env.DB.prepare(`
      SELECT snapshot_date,
        snapshot_date = (SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-29') AS soul_baseline,
        snapshot_date = (SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-15') AS astra_baseline
      FROM growth_snapshots
      WHERE ocid = ?1 AND snapshot_date <= ?2 AND (
        (?3 IS NOT NULL AND snapshot_date > ?3)
        OR (?3 IS NULL AND snapshot_date >= '2026-07-29')
        OR (?3 IS NULL AND snapshot_date = (
          SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-29'
        ))
        OR (?4 IS NOT NULL AND ?5 = 0 AND snapshot_date > ?4)
        OR (?4 IS NULL AND ?5 = 0 AND snapshot_date >= '2026-07-15')
        OR (?4 IS NULL AND ?5 = 0 AND snapshot_date = (
          SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-15'
        ))
      )
      ORDER BY snapshot_date LIMIT ?6
    `).bind(candidate.ocid, candidate.basic_last_synced_date, soul.last_synced_date,
      astra.last_synced_date, astra.has_astra ?? 0, config.growthBackfillBatchSize)
      .all<{ snapshot_date: string; soul_baseline: number; astra_baseline: number }>();
    const settled = await runWithConcurrency(rows.results, config.growthDateConcurrency, 0, async (row) => {
      try {
        const payload = await fetchNexonJson<EquipmentHistory>(env,
          `/character/item-equipment?ocid=${encodeURIComponent(candidate.ocid)}&date=${row.snapshot_date}`);
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
        };
      } catch (error) {
        if (error instanceof NexonRequestError && error.status === 400 && error.nexonCode === 'OPENAPI00003') {
          return {
            date: row.snapshot_date,
            soulBaseline: Boolean(row.soul_baseline),
            astraBaseline: Boolean(row.astra_baseline),
            grade: null,
            soulName: null,
            weaponName: null,
            astraName: null,
          };
        }
        throw error;
      }
    });
    const rejected = settled.find((result) => result.status === 'rejected');
    if (rejected?.status === 'rejected') throw rejected.reason;

    let soulDate = soul.last_synced_date;
    let highestGrade = soul.highest_grade ?? null;
    let previousSoulName = soul.previous_soul_name ?? null;
    let previousWeaponName = soul.previous_weapon_name ?? null;
    let astraDate = astra.last_synced_date;
    let previousItemName = astra.previous_item_name ?? null;
    let hasAstra = Boolean(astra.has_astra);
    let lastSoulDate: string | null = null;
    let lastAstraDate: string | null = null;
    const statements: D1PreparedStatement[] = [];

    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      const { date, soulBaseline, astraBaseline, grade, soulName, weaponName, astraName } = result.value;
      const isSoulDate = soul.last_synced_date === null
        ? date >= '2026-07-29' || soulBaseline
        : date > soul.last_synced_date;
      const isAstraDate = astra.last_synced_date === null
        ? date >= '2026-07-15' || astraBaseline
        : date > astra.last_synced_date;

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
      soulDate = rows.results.length < config.growthBackfillBatchSize
        ? candidate.basic_last_synced_date : lastSoulDate ?? soul.last_synced_date;
    }
    if (hasAstra) {
      astraDate = candidate.basic_last_synced_date;
    } else if (astra.last_synced_date === null || astra.last_synced_date < candidate.basic_last_synced_date) {
      astraDate = rows.results.length < config.growthBackfillBatchSize
        ? candidate.basic_last_synced_date : lastAstraDate ?? astra.last_synced_date;
    }

    const now = new Date().toISOString();
    statements.push(env.DB.prepare(`
      UPDATE growth_soul_tracking SET last_synced_date = ?3, highest_grade = ?4,
        previous_soul_name = ?5, previous_weapon_name = ?6,
        claim_token = NULL, claim_until = NULL, retry_at = NULL, updated_at = ?7
      WHERE ocid = ?1 AND claim_token = ?2
    `).bind(candidate.ocid, token, soulDate, highestGrade, previousSoulName, previousWeaponName, now));
    statements.push(env.DB.prepare(`
      UPDATE growth_astra_tracking SET last_synced_date = ?3, previous_item_name = ?4,
        has_astra = ?5, claim_token = NULL, claim_until = NULL, retry_at = NULL, updated_at = ?6
      WHERE ocid = ?1 AND claim_token = ?2
    `).bind(candidate.ocid, token, astraDate, previousItemName, hasAstra ? 1 : 0, now));
    await env.DB.batch(statements);
    return { processedDates: rows.results.length, ocid: candidate.ocid };
  } catch (error) {
    const retryAt = new Date(Date.now() + 300_000).toISOString();
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`UPDATE growth_soul_tracking SET claim_token = NULL, claim_until = NULL, retry_at = ?3, updated_at = ?4 WHERE ocid = ?1 AND claim_token = ?2`)
        .bind(candidate.ocid, token, retryAt, now),
      env.DB.prepare(`UPDATE growth_astra_tracking SET claim_token = NULL, claim_until = NULL, retry_at = ?3, updated_at = ?4 WHERE ocid = ?1 AND claim_token = ?2`)
        .bind(candidate.ocid, token, retryAt, now),
    ]);
    throw error;
  }
};
