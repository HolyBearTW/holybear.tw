import aliasIndex from '../data/tmsAliasIndex.json';
import type { DashboardData } from '../types';
import { createAliasSignatureInputs } from './aliasFingerprint.js';

export interface RelatedCharacter {
  characterName: string;
  worldName: string;
  characterClass: string;
  characterLevel: number;
  characterImage: string;
  characterPower: string;
  maxCharacterPower: string;
  combatPowerRank: number | null;
  characterGuildName: string | null;
  characterDateCreate: string | null;
}

interface AliasGroup {
  id: string;
  signatures: string[];
  members: RelatedCharacter[];
}

interface AliasIndex {
  fingerprintVersion: number;
  groups: AliasGroup[];
}

const index = aliasIndex as AliasIndex;

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function findRelatedCharacters(data: DashboardData, signal?: AbortSignal): Promise<RelatedCharacter[]> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const characterName = data.basic.character_name;
  let group = index.groups.find((item) => item.members.some((member) => member.characterName === characterName));

  // A newly queried character can still match an existing group before the
  // next scheduled scan has added its name to the static index.
  if (!group) {
    const inputs = createAliasSignatureInputs(data.unionRaider, data.unionChampion);
    const signatures = await Promise.all(inputs.map(sha256));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const signatureSet = new Set(signatures);
    group = index.groups.find((item) => item.signatures.some((signature) => signatureSet.has(signature)));
  }

  return group?.members.filter((member) => member.characterName !== characterName) || [];
}
