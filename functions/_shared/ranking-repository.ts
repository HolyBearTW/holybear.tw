import type { CharacterRow, RankingEntry, RankingFilters } from './models';
import { normalizeCharacterName } from './character-repository';

const boundedInteger = (value: string | null, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

export const parseRankingFilters = (url: URL): RankingFilters => {
  const world = url.searchParams.get('world')?.trim().normalize('NFC') || undefined;
  const job = url.searchParams.get('job')?.trim().normalize('NFC') || undefined;
  const minLevelRaw = url.searchParams.get('minLevel');
  return {
    page: boundedInteger(url.searchParams.get('page'), 1, 1, 100_000),
    pageSize: boundedInteger(url.searchParams.get('pageSize'), 10, 1, 100),
    world,
    job,
    minLevel: minLevelRaw == null ? undefined : boundedInteger(minLevelRaw, 0, 0, 999),
  };
};

const whereForFilters = (filters: RankingFilters) => {
  const clauses: string[] = [];
  const bindings: unknown[] = [];
  if (filters.world) {
    bindings.push(filters.world);
    clauses.push(`world_name = ?${bindings.length}`);
  }
  if (filters.job) {
    bindings.push(filters.job);
    clauses.push(`job_name = ?${bindings.length}`);
  }
  if (filters.minLevel != null) {
    bindings.push(filters.minLevel);
    clauses.push(`level >= ?${bindings.length}`);
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    bindings,
  };
};

export const toRankingEntry = (row: CharacterRow, rank: number): RankingEntry => ({
  ocid: row.ocid,
  characterName: row.character_name,
  worldName: row.world_name,
  jobName: row.job_name,
  level: Number(row.level) || 0,
  combatPower: Number(row.combat_power) || 0,
  characterImage: row.character_image,
  guildName: row.guild_name,
  rank,
});

export const getCombatPowerRanking = async (db: D1Database, filters: RankingFilters) => {
  const where = whereForFilters(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  let countRow: { total: number } | null;
  if (where.sql) {
    countRow = await db.prepare(`SELECT COUNT(*) AS total FROM characters ${where.sql}`)
      .bind(...where.bindings).first<{ total: number }>();
  } else {
    try {
      countRow = await db.prepare('SELECT characters_total AS total FROM database_stats WHERE id = 1')
        .first<{ total: number }>();
    } catch (error) {
      if (!String(error).includes('no such table: database_stats')) throw error;
      countRow = await db.prepare('SELECT COUNT(*) AS total FROM characters').first<{ total: number }>();
    }
  }
  const total = Number(countRow?.total) || 0;
  const rows = await db.prepare(`
    SELECT *
    FROM characters
    ${where.sql}
    ORDER BY combat_power DESC, ocid ASC
    LIMIT ?${where.bindings.length + 1} OFFSET ?${where.bindings.length + 2}
  `).bind(...where.bindings, filters.pageSize, offset).all<CharacterRow>();

  return {
    items: rows.results.map((row, index) => toRankingEntry(row, offset + index + 1)),
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
};

export const getCharacterCombatPowerRank = async (db: D1Database, name: string) => {
  const normalizedName = normalizeCharacterName(name);
  if (!normalizedName) return null;
  const query = (totalSql: string) => db.prepare(`
    WITH target AS (
      SELECT * FROM characters
      WHERE normalized_name = ?1
      ORDER BY updated_at DESC, ocid ASC
      LIMIT 1
    )
    SELECT target.*,
      1 + (
        SELECT COUNT(*) FROM characters ranked
        WHERE ranked.combat_power > target.combat_power
           OR (ranked.combat_power = target.combat_power AND ranked.ocid < target.ocid)
      ) AS rank,
      (${totalSql}) AS total
    FROM target
  `).bind(normalizedName).first<CharacterRow & { rank: number; total: number }>();
  let row: (CharacterRow & { rank: number; total: number }) | null;
  try {
    row = await query('SELECT characters_total FROM database_stats WHERE id = 1');
  } catch (error) {
    if (!String(error).includes('no such table: database_stats')) throw error;
    row = await query('SELECT COUNT(*) FROM characters');
  }
  if (!row) return null;
  return { entry: toRankingEntry(row, Number(row.rank)), rank: Number(row.rank), total: Number(row.total) };
};
