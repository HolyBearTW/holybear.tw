import type {
  CharacterRow,
  CharacterSourceWrite,
  CharacterWrite,
  PublicCharacter,
} from './models';

export const normalizeCharacterName = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase('zh-TW');

export const toPublicCharacter = (row: CharacterRow): PublicCharacter => ({
  ocid: row.ocid,
  characterName: row.character_name,
  normalizedName: row.normalized_name,
  worldName: row.world_name,
  jobName: row.job_name,
  level: Number(row.level) || 0,
  combatPower: Number(row.combat_power) || 0,
  characterImage: row.character_image,
  guildName: row.guild_name,
  accountGroupId: row.account_group_id == null ? null : Number(row.account_group_id),
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  nexonUpdatedAt: row.nexon_updated_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCharacterByName = async (db: D1Database, name: string) => {
  const normalizedName = normalizeCharacterName(name);
  if (!normalizedName) return null;
  const row = await db.prepare(`
    SELECT * FROM characters
    WHERE normalized_name = ?1
    ORDER BY updated_at DESC, ocid ASC
    LIMIT 1
  `).bind(normalizedName).first<CharacterRow>();
  return row ? toPublicCharacter(row) : null;
};

export const findCharacterByOcid = async (db: D1Database, ocid: string) => {
  const row = await db.prepare('SELECT * FROM characters WHERE ocid = ?1 LIMIT 1')
    .bind(ocid)
    .first<CharacterRow>();
  return row ? toPublicCharacter(row) : null;
};

export const upsertCharacter = async (
  db: D1Database,
  character: CharacterWrite,
  sources: CharacterSourceWrite[],
) => {
  const observedAt = character.observedAt ?? new Date().toISOString();
  const normalizedName = normalizeCharacterName(character.characterName);
  if (!character.ocid || !normalizedName) throw new Error('Character OCID and name are required');

  const existed = Boolean(await db.prepare('SELECT 1 AS found FROM characters WHERE ocid = ?1 LIMIT 1')
    .bind(character.ocid)
    .first<{ found: number }>());

  const statements: D1PreparedStatement[] = [db.prepare(`
    INSERT INTO characters (
      ocid, character_name, normalized_name, world_name, job_name, level,
      combat_power, character_image, guild_name, first_seen_at, last_seen_at,
      nexon_updated_at, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10, ?11, ?10, ?10)
    ON CONFLICT(ocid) DO UPDATE SET
      character_name = excluded.character_name,
      normalized_name = excluded.normalized_name,
      world_name = excluded.world_name,
      job_name = excluded.job_name,
      level = excluded.level,
      combat_power = excluded.combat_power,
      character_image = excluded.character_image,
      guild_name = excluded.guild_name,
      first_seen_at = MIN(characters.first_seen_at, excluded.first_seen_at),
      last_seen_at = MAX(characters.last_seen_at, excluded.last_seen_at),
      nexon_updated_at = COALESCE(excluded.nexon_updated_at, characters.nexon_updated_at),
      updated_at = excluded.updated_at
  `).bind(
    character.ocid,
    character.characterName.normalize('NFC'),
    normalizedName,
    character.worldName,
    character.jobName,
    Math.max(0, Math.trunc(character.level)),
    Math.max(0, Math.trunc(character.combatPower)),
    character.characterImage,
    character.guildName,
    observedAt,
    character.nexonUpdatedAt ?? null,
  )];

  for (const source of sources) {
    const sourceObservedAt = source.observedAt ?? observedAt;
    statements.push(db.prepare(`
      INSERT INTO character_sources (
        ocid, source, source_character_id, source_first_seen_at,
        source_last_seen_at, raw_json, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?4)
      ON CONFLICT(ocid, source) DO UPDATE SET
        source_character_id = COALESCE(excluded.source_character_id, character_sources.source_character_id),
        source_first_seen_at = MIN(character_sources.source_first_seen_at, excluded.source_first_seen_at),
        source_last_seen_at = MAX(character_sources.source_last_seen_at, excluded.source_last_seen_at),
        raw_json = COALESCE(excluded.raw_json, character_sources.raw_json),
        updated_at = excluded.updated_at
    `).bind(
      character.ocid,
      source.source,
      source.sourceCharacterId ?? null,
      sourceObservedAt,
      source.rawJson ?? null,
    ));
  }

  await db.batch(statements);
  const stored = await findCharacterByOcid(db, character.ocid);
  if (!stored) throw new Error('Character upsert did not return a row');
  return { character: stored, created: !existed };
};

export const isCharacterFresh = (
  character: PublicCharacter,
  freshnessSeconds: number,
  now = Date.now(),
) => {
  const timestamp = Date.parse(character.nexonUpdatedAt ?? character.updatedAt);
  return Number.isFinite(timestamp) && now - timestamp <= freshnessSeconds * 1000;
};
