export interface RelatedCharacter {
  ocid: string | null;
  characterName: string;
  worldName: string;
  characterClass: string;
  characterLevel: number | null;
  characterImage: string | null;
  characterPower: string | null;
  maxCharacterPower: string | null;
  combatPowerRank: number | null;
  characterGuildName: string | null;
  characterDateCreate: string | null;
  metadataAvailable?: boolean;
  lastCheckedAt: string | null;
  dataStatus: 'current' | 'stale' | 'unverified' | 'unavailable';
}

interface D1AltRecord {
  ocid: string | null;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number | null;
  combatPower: number | null;
  characterImage: string | null;
  guildName: string | null;
  metadataAvailable: boolean;
  lastCheckedAt?: string | null;
  dataStatus?: RelatedCharacter['dataStatus'];
}

export const fromD1Alt = (character: D1AltRecord): RelatedCharacter => ({
  ocid: character.ocid,
  characterName: character.characterName,
  worldName: character.worldName,
  characterClass: character.jobName,
  characterLevel: character.level,
  characterImage: character.characterImage,
  characterPower: character.combatPower == null ? null : String(character.combatPower),
  maxCharacterPower: character.combatPower == null ? null : String(character.combatPower),
  combatPowerRank: null,
  characterGuildName: character.guildName,
  characterDateCreate: null,
  metadataAvailable: character.metadataAvailable,
  lastCheckedAt: character.lastCheckedAt ?? null,
  dataStatus: character.dataStatus ?? 'unverified',
});
