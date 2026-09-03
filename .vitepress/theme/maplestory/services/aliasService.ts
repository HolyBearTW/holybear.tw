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
  members: RelatedCharacter[];
}

interface AliasIndex {
  generatedAt: string;
  fingerprintVersion: number;
  characterGroups: Record<string, string>;
  signatureGroups: Record<string, string>;
}

let indexPromise: Promise<AliasIndex> | null = null;
const groupPromises = new Map<string, Promise<AliasGroup>>();

const loadAliasIndex = () => {
  if (!indexPromise) {
    indexPromise = fetch('/maplestory/aliases/index.json', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Alias index lookup failed: ${response.status}`);
        return response.json() as Promise<AliasIndex>;
      })
      .catch((error) => {
        indexPromise = null;
        throw error;
      });
  }
  return indexPromise;
};

const loadAliasGroup = (groupId: string, version: string) => {
  const cacheKey = `${groupId}:${version}`;
  let promise = groupPromises.get(cacheKey);
  if (!promise) {
    const params = new URLSearchParams({ v: version });
    promise = fetch(`/maplestory/aliases/groups/${encodeURIComponent(groupId)}.json?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Alias group lookup failed: ${response.status}`);
        return response.json() as Promise<AliasGroup>;
      })
      .catch((error) => {
        groupPromises.delete(cacheKey);
        throw error;
      });
    groupPromises.set(cacheKey, promise);
  }
  return promise;
};

export const preloadAliasIndex = () => loadAliasIndex().then(() => undefined);

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function findRelatedCharacters(data: DashboardData, signal?: AbortSignal): Promise<RelatedCharacter[]> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const index = await loadAliasIndex();
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const characterName = data.basic.character_name.normalize('NFC');
  let groupId = index.characterGroups[characterName];

  // A newly queried character can still match an existing group before the
  // next scheduled scan has added its name to the static index.
  if (!groupId) {
    const inputs = createAliasSignatureInputs(data.unionRaider, data.unionChampion);
    const signatures = await Promise.all(inputs.map(sha256));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    groupId = signatures.map((signature) => index.signatureGroups[signature]).find(Boolean) || '';
  }

  if (!groupId) return [];
  const group = await loadAliasGroup(groupId, index.generatedAt);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return group?.members.filter((member) => member.characterName !== characterName) || [];
}
