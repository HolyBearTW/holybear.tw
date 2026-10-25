// Imported account relations remain known regardless of metadata age. Only
// an explicit official identity failure can move a record out of the list.

export interface RelatedCharacterRecord {
  ocid: string | null;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number | null;
  combatPower: number | null;
  characterImage: string | null;
  guildName: string | null;
  metadataAvailable: boolean;
  lastCheckedAt: string | null;
  isActive: boolean;
}

export type RelatedCharacterDataStatus = 'current' | 'stale' | 'unverified' | 'unavailable';
const nameKey = (member: RelatedCharacterRecord) => (
  `${member.worldName.trim().normalize('NFC')}\u0000${member.characterName.trim().normalize('NFC').toLocaleLowerCase('zh-TW')}`
);
const checkedTime = (member: RelatedCharacterRecord) => Date.parse(member.lastCheckedAt || '');

export const mergeRelatedCharacters = (members: RelatedCharacterRecord[]) => {
  const identified = new Map<string, RelatedCharacterRecord>();
  for (const member of members) {
    if (!member.ocid || !member.characterName.trim()) continue;
    const previous = identified.get(member.ocid);
    if (!previous || (checkedTime(member) || 0) > (checkedTime(previous) || 0)
      || (member.lastCheckedAt === previous.lastCheckedAt && member.metadataAvailable && !previous.metadataAvailable)) {
      identified.set(member.ocid, member);
    }
  }
  const knownNames = new Set([...identified.values()].map(nameKey));
  const unresolved = new Map<string, RelatedCharacterRecord>();
  for (const member of members) {
    if (!member.ocid && member.characterName.trim() && !knownNames.has(nameKey(member))) {
      unresolved.set(nameKey(member), member);
    }
  }
  return [...identified.values(), ...unresolved.values()];
};

export const classifyRelatedCharacters = (members: RelatedCharacterRecord[], currentOcid: string) => {
  const classified = mergeRelatedCharacters(members)
    .filter((member) => member.ocid !== currentOcid)
    .map((member) => {
      const dataStatus: RelatedCharacterDataStatus = member.isActive ? 'current' : 'unavailable';
      return { ...member, dataStatus };
    });
  return {
    alts: classified.filter((member) => member.dataStatus === 'current'),
    unverifiedAlts: classified.filter((member) => member.dataStatus !== 'current'),
  };
};
