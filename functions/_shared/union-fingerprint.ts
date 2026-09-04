interface ChampionMember {
  champion_name?: string;
  champion_grade?: string;
  champion_class?: string;
}

export interface UnionChampionResponse {
  union_champion?: ChampionMember[];
}

export const canonicalizeChampionRoster = (payload: UnionChampionResponse) => {
  const members = (payload.union_champion || [])
    .map((member) => ({
      name: String(member.champion_name || '').trim().normalize('NFC').toLocaleLowerCase(),
      grade: String(member.champion_grade || '').trim().normalize('NFC'),
      class: String(member.champion_class || '').trim().normalize('NFC'),
    }))
    .filter((member) => member.name)
    .sort((left, right) => left.name.localeCompare(right.name));
  return members.length >= 2 ? JSON.stringify({ members }) : null;
};

export const hashChampionRoster = async (payload: UnionChampionResponse) => {
  const canonical = canonicalizeChampionRoster(payload);
  if (!canonical) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return {
    canonical,
    fingerprint: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  };
};
