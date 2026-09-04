export interface HolyBearPowerRankingEntry {
  ocid: string;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  characterImage: string;
  combatPower: number;
  guildName?: string | null;
  rank: number;
}

export interface HolyBearPowerRankingPage {
  items: HolyBearPowerRankingEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  degraded?: boolean;
  snapshotAt?: string;
}

export interface HolyBearCharacterRank {
  entry: HolyBearPowerRankingEntry;
  rank: number;
  total: number;
  degraded?: boolean;
  snapshotAt?: string;
}

export interface HolyBearCharacterResponse {
  character: HolyBearPowerRankingEntry & {
    normalizedName: string;
    accountGroupId: number | null;
    firstSeenAt: string;
    lastSeenAt: string;
    nexonUpdatedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  updatedAt: string;
  stale: boolean;
  source: 'd1' | 'nexon';
  discovered?: boolean;
}

export interface HolyBearAltsResponse {
  character: HolyBearCharacterResponse['character'];
  accountGroup: { id: number; confidence: 'high' | 'probable' | 'unknown'; lastVerifiedAt: string | null } | null;
  confidence: 'high' | 'probable' | 'unknown';
  alts: Array<{
    ocid: string;
    characterName: string;
    worldName: string;
    jobName: string;
    level: number;
    combatPower: number;
    characterImage: string;
    guildName: string | null;
  }>;
  lastVerifiedAt: string | null;
  disclosure: string;
}

const parseError = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    return payload?.error?.message || fallback;
  } catch {
    return fallback;
  }
};

export const fetchHolyBearPowerRanking = async (
  page = 1,
  pageSize = 10,
  filters: { world?: string; job?: string; minLevel?: number } = {},
): Promise<HolyBearPowerRankingPage> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.world) params.set('world', filters.world);
  if (filters.job) params.set('job', filters.job);
  if (filters.minLevel != null) params.set('minLevel', String(filters.minLevel));
  const response = await fetch(`/api/rankings/combat-power?${params}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await parseError(response, `HolyBear 排行榜讀取失敗 (${response.status})`));
  return response.json();
};

export const fetchHolyBearCharacterRank = async (name: string): Promise<HolyBearCharacterRank | null> => {
  const response = await fetch(`/api/rankings/character/${encodeURIComponent(name.trim())}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await parseError(response, `HolyBear 名次查詢失敗 (${response.status})`));
  return response.json();
};

export const fetchHolyBearCharacter = async (name: string): Promise<HolyBearCharacterResponse> => {
  const response = await fetch(`/api/characters/${encodeURIComponent(name.trim())}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await parseError(response, `HolyBear 角色查詢失敗 (${response.status})`));
  return response.json();
};

export const fetchHolyBearAlts = async (name: string, signal?: AbortSignal): Promise<HolyBearAltsResponse> => {
  const response = await fetch(`/api/characters/${encodeURIComponent(name.trim())}/alts`, {
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error(await parseError(response, `HolyBear 分身查詢失敗 (${response.status})`));
  return response.json();
};

let rankingSnapshotPromise: Promise<Map<string, number>> | null = null;
export const fetchHolyBearRankingSnapshot = () => {
  if (!rankingSnapshotPromise) {
    rankingSnapshotPromise = fetch('/maplestory/rankings/current.json', { cache: 'force-cache' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Ranking snapshot failed (${response.status})`);
        const snapshot = await response.json() as { items?: HolyBearPowerRankingEntry[] };
        return new Map((snapshot.items || []).map((item) => [
          item.characterName.normalize('NFC').toLocaleLowerCase('zh-TW'),
          item.rank,
        ]));
      })
      .catch(() => new Map<string, number>());
  }
  return rankingSnapshotPromise;
};

export const invalidateHolyBearRankingCache = () => {
  // D1 ranking reads are paginated and no full ranking is retained in the browser.
};
