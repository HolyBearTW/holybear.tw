import type { RelatedCharacter } from './aliasService';

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
}

export const fromD1Alt = (character: D1AltRecord): RelatedCharacter => ({
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
});

export const mergeRelatedCharacters = (
  d1Members: RelatedCharacter[],
  staticMembers: RelatedCharacter[],
) => {
  const merged = new Map<string, RelatedCharacter>();
  for (const member of staticMembers) {
    merged.set(member.characterName.normalize('NFC').toLocaleLowerCase('zh-TW'), member);
  }
  for (const member of d1Members) {
    const key = member.characterName.normalize('NFC').toLocaleLowerCase('zh-TW');
    const fallback = merged.get(key);
    // A queue placeholder proves the relationship only. It must not erase a
    // complete metadata snapshot while the background refresh is pending.
    if (member.metadataAvailable === false && fallback) continue;
    merged.set(key, {
      ...fallback,
      ...member,
      characterDateCreate: fallback?.characterDateCreate ?? member.characterDateCreate,
    });
  }
  return [...merged.values()];
};
