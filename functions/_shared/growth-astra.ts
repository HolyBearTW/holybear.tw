import type { Env } from './env';
import { fetchNexonJson, NexonRequestError, runWithConcurrency } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';

interface AstraTracking {
  last_synced_date: string | null;
  previous_item_name: string | null;
  has_astra: number;
}

interface EquipmentHistory {
  item_equipment?: Array<{
    item_equipment_slot?: string;
    item_equipment_part?: string;
    item_name?: string | null;
  }>;
}

export const backfillGrowthAstraBatch = async (env: Env) => {
  const timestamp = new Date().toISOString();
  const candidate = await env.DB.prepare(`
    SELECT p.ocid, p.basic_last_synced_date
    FROM growth_profiles p LEFT JOIN growth_astra_tracking a ON a.ocid = p.ocid
    WHERE p.basic_last_synced_date IS NOT NULL
      AND (a.last_synced_date IS NULL OR a.last_synced_date < p.basic_last_synced_date)
      AND (a.claim_until IS NULL OR a.claim_until <= ?1)
      AND (a.retry_at IS NULL OR a.retry_at <= ?1)
    ORDER BY COALESCE(a.updated_at, p.created_at), p.ocid LIMIT 1
  `).bind(timestamp).first<{ ocid: string; basic_last_synced_date: string }>();
  if (!candidate) return { processedDates: 0 };

  await env.DB.prepare(`
    INSERT INTO growth_astra_tracking (ocid, updated_at) VALUES (?1, ?2)
    ON CONFLICT(ocid) DO NOTHING
  `).bind(candidate.ocid, timestamp).run();
  const token = crypto.randomUUID();
  const lease = new Date(Date.now() + 600_000).toISOString();
  const state = await env.DB.prepare(`
    UPDATE growth_astra_tracking SET claim_token = ?2, claim_until = ?3
    WHERE ocid = ?1 AND (claim_until IS NULL OR claim_until <= ?4)
    RETURNING *
  `).bind(candidate.ocid, token, lease, timestamp).first<AstraTracking>();
  if (!state) return { processedDates: 0 };

  try {
    const config = getRuntimeConfig(env);
    const rows = await env.DB.prepare(`
      SELECT snapshot_date FROM growth_snapshots
      WHERE ocid = ?1 AND (?2 IS NULL OR snapshot_date > ?2) AND snapshot_date <= ?3
        AND (snapshot_date >= '2026-07-15' OR snapshot_date = (
          SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = ?1 AND snapshot_date < '2026-07-15'
        ))
      ORDER BY snapshot_date LIMIT ?4
    `).bind(candidate.ocid, state.last_synced_date, candidate.basic_last_synced_date,
      config.growthBackfillBatchSize).all<{ snapshot_date: string }>();
    const settled = await runWithConcurrency(rows.results, config.growthDateConcurrency, 0, async ({ snapshot_date: date }) => {
      try {
        const payload = await fetchNexonJson<EquipmentHistory>(env,
          `/character/item-equipment?ocid=${encodeURIComponent(candidate.ocid)}&date=${date}`);
        const items = payload.item_equipment || [];
        // Zero has an additional Astra-only slot while its original weapon
        // remains in the ordinary secondary slot.
        const item = items.find((entry) => entry.item_equipment_slot === '阿斯特拉輔助武器神之子'
          || entry.item_equipment_part === '阿斯特拉輔助武器神之子')
          || items.find((entry) => entry.item_equipment_slot === '輔助武器');
        return { date, itemName: item?.item_name?.trim() || null };
      } catch (error) {
        if (error instanceof NexonRequestError && error.status === 400 && error.nexonCode === 'OPENAPI00003') {
          return { date, itemName: null };
        }
        throw error;
      }
    });
    const rejected = settled.find((result) => result.status === 'rejected');
    if (rejected?.status === 'rejected') throw rejected.reason;
    let previousName = state.previous_item_name;
    let hasAstra = Boolean(state.has_astra);
    const statements: D1PreparedStatement[] = [];
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      const { date, itemName } = result.value;
      if (!itemName) continue;
      if (itemName.startsWith('阿斯特拉')) {
        if (!hasAstra && previousName) {
          statements.push(env.DB.prepare(`
            INSERT INTO growth_astra_events (ocid, snapshot_date, before_value, after_value)
            SELECT ?1, ?2, ?3, ?4
            WHERE EXISTS (SELECT 1 FROM growth_astra_tracking WHERE ocid = ?1 AND claim_token = ?5)
            ON CONFLICT DO NOTHING
          `).bind(candidate.ocid, date, previousName, itemName, token));
        }
        hasAstra = true;
      } else if (!hasAstra) {
        previousName = itemName;
      }
    }
    const processedDate = rows.results.at(-1)?.snapshot_date || candidate.basic_last_synced_date;
    statements.push(env.DB.prepare(`
      UPDATE growth_astra_tracking SET last_synced_date = ?3, previous_item_name = ?4,
        has_astra = ?5, claim_token = NULL, claim_until = NULL, retry_at = NULL, updated_at = ?6
      WHERE ocid = ?1 AND claim_token = ?2
    `).bind(candidate.ocid, token, processedDate, previousName, hasAstra ? 1 : 0, new Date().toISOString()));
    await env.DB.batch(statements);
    return { processedDates: rows.results.length, ocid: candidate.ocid };
  } catch (error) {
    await env.DB.prepare(`
      UPDATE growth_astra_tracking SET claim_token = NULL, claim_until = NULL,
        retry_at = ?3, updated_at = ?4 WHERE ocid = ?1 AND claim_token = ?2
    `).bind(candidate.ocid, token, new Date(Date.now() + 300_000).toISOString(), new Date().toISOString()).run();
    throw error;
  }
};
