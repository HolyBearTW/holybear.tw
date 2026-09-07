// Shared by Pages and the local manual importer: never turn missing API fields into data.
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const timestamp = (value) => text(value) && Number.isFinite(Date.parse(value));

export class InvalidNexonCharacterError extends Error {
  retryable = true;
  code = 'invalid_nexon_character';
}

export const validateCharacterWrite = (character) => {
  if (!text(character.ocid) || !text(character.characterName) || !text(character.worldName)
    || !text(character.jobName) || !text(character.characterImage)
    || !Number.isSafeInteger(character.level) || character.level <= 0
    || !Number.isSafeInteger(character.combatPower) || character.combatPower < 0
    || (character.requestedAt != null && !timestamp(character.requestedAt))
    || (character.observedAt != null && !timestamp(character.observedAt))
    || (character.nexonUpdatedAt != null && !timestamp(character.nexonUpdatedAt))
    || !(character.guildName === null || typeof character.guildName === 'string')) {
    throw new InvalidNexonCharacterError('NEXON character response is missing valid basic/stat fields');
  }
};

export const parseNexonCharacter = (ocid, basic, stat, requestedAt, observedAt) => {
  const rawPower = stat?.final_stat?.find((item) => (
    item.stat_name === '戰鬥力' || item.stat_name === 'Combat Power'
  ))?.stat_value;
  const powerText = typeof rawPower === 'number' || typeof rawPower === 'string'
    ? String(rawPower).trim() : '';
  const combatPower = /^\d+(?:,\d{3})*$/.test(powerText) ? Number(powerText.replaceAll(',', '')) : NaN;
  const dates = [basic?.date, stat?.date];
  if (dates.some((date) => date != null && !timestamp(date))
    || (dates.every((date) => date != null) && Date.parse(dates[0]) !== Date.parse(dates[1]))) {
    throw new InvalidNexonCharacterError('NEXON basic/stat dates are invalid or inconsistent');
  }
  const date = dates.find((value) => value != null);
  const character = {
    ocid,
    characterName: typeof basic?.character_name === 'string' ? basic.character_name.trim().normalize('NFC') : '',
    worldName: basic?.world_name,
    jobName: basic?.character_class,
    level: basic?.character_level,
    combatPower,
    characterImage: basic?.character_image,
    guildName: basic?.character_guild_name === '' ? null : basic?.character_guild_name,
    requestedAt,
    observedAt,
    nexonUpdatedAt: date == null ? null : new Date(date).toISOString(),
  };
  validateCharacterWrite(character);
  return character;
};

// Compare official data dates when both are known; otherwise compare request START times.
// A late response must not win just because its network request finished later.
// Legacy rows have no requested_at and are revalidated before they can be reused.
export const canonicalUpdateGuard = `
  WHERE CASE
    WHEN characters.nexon_requested_at IS NOT NULL
      AND characters.nexon_updated_at IS NOT NULL AND excluded.nexon_updated_at IS NOT NULL
    THEN julianday(excluded.nexon_updated_at) > julianday(characters.nexon_updated_at)
      OR (julianday(excluded.nexon_updated_at) = julianday(characters.nexon_updated_at)
        AND julianday(excluded.nexon_requested_at) >= julianday(characters.nexon_requested_at))
    ELSE julianday(excluded.nexon_requested_at) >= julianday(COALESCE(characters.nexon_requested_at, characters.updated_at))
  END`;

export const stagingRequeueAssignments = `
  status = CASE WHEN character_import_staging.import_job_id IS NOT excluded.import_job_id
    THEN 'pending' ELSE character_import_staging.status END,
  attempt_count = CASE WHEN character_import_staging.import_job_id IS NOT excluded.import_job_id
    THEN 0 ELSE character_import_staging.attempt_count END,
  next_retry_at = CASE WHEN character_import_staging.import_job_id IS NOT excluded.import_job_id
    THEN NULL ELSE character_import_staging.next_retry_at END,
  last_error = CASE WHEN character_import_staging.import_job_id IS NOT excluded.import_job_id
    THEN NULL ELSE character_import_staging.last_error END`;
