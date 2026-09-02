export interface MapleKitAliasMember {
  ocid: string;
  characterName: string;
  worldName: string;
  characterClass: string;
  characterLevel: number;
  characterImage: string;
  characterPower: string;
  maxCharacterPower: string;
  characterGuildName: string | null;
  characterDateCreate: string | null;
  isSelf: boolean;
  isResolved: boolean;
}

interface MapleKitAliasResponse {
  groupId: number | null;
  members: MapleKitAliasMember[];
  aliasGroup?: {
    members?: MapleKitAliasMember[];
  } | null;
}

export async function fetchMapleKitAliases(characterName: string, signal?: AbortSignal): Promise<MapleKitAliasMember[]> {
  const params = new URLSearchParams({ character_name: characterName });
  const response = await fetch(`/api/maplekit-character?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`MapleKit alias lookup failed: ${response.status}`);
  }

  const payload = await response.json() as MapleKitAliasResponse;
  if (Array.isArray(payload.members)) return payload.members;
  return Array.isArray(payload.aliasGroup?.members) ? payload.aliasGroup.members : [];
}
