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

const LEGACY_RANKING_CACHE_KEY = 'maplestory_recent_power_ranking_cache_v1';
const readBrowserRankingSnapshot = (): HolyBearPowerRankingEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEGACY_RANKING_CACHE_KEY) || '{}') as {
      items?: Array<Partial<HolyBearPowerRankingEntry> & { characterName?: string }>;
    };
    if (!Array.isArray(parsed.items)) return [];
    return parsed.items
      .filter((item) => item.characterName)
      .map((item) => ({
        ocid: String(item.ocid || ''),
        characterName: String(item.characterName),
        worldName: String(item.worldName || ''),
        jobName: String(item.jobName || ''),
        level: Number(item.level) || 0,
        characterImage: String(item.characterImage || ''),
        combatPower: Number(item.combatPower) || 0,
        guildName: item.guildName ?? null,
        rank: 0,
      }))
      .sort((left, right) => right.combatPower - left.combatPower || left.characterName.localeCompare(right.characterName))
      .map((item, index) => ({ ...item, rank: index + 1 }));
  } catch {
    return [];
  }
};

const browserRankingPage = (page: number, pageSize: number): HolyBearPowerRankingPage | null => {
  const items = readBrowserRankingSnapshot();
  if (!items.length) return null;
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize), page, pageSize, total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)), degraded: true,
  };
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
  if (!response.ok) {
    const cached = browserRankingPage(page, pageSize);
    if (cached) return cached;
    throw new Error(await parseError(response, `HolyBear 排行榜讀取失敗 (${response.status})`));
  }
  return response.json();
};

export const fetchHolyBearCharacterRank = async (name: string): Promise<HolyBearCharacterRank | null> => {
  const response = await fetch(`/api/rankings/character/${encodeURIComponent(name.trim())}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) {
    const normalized = name.trim().normalize('NFC').toLocaleLowerCase('zh-TW');
    const items = readBrowserRankingSnapshot();
    const entry = items.find((item) => item.characterName.normalize('NFC').toLocaleLowerCase('zh-TW') === normalized);
    if (entry) return { entry, rank: entry.rank, total: items.length, degraded: true };
    throw new Error(await parseError(response, `HolyBear 名次查詢失敗 (${response.status})`));
  }
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

export const invalidateHolyBearRankingCache = () => {
  // D1 ranking reads are paginated and no full ranking is retained in the browser.
};
