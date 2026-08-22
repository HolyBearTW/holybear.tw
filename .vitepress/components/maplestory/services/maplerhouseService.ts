export interface MaplerHousePowerRankingEntry {
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  characterImage: string;
  combatPower: number;
}

export interface MaplerHousePowerRankingPage {
  items: MaplerHousePowerRankingEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MaplerHouseCharacterRank {
  entry: MaplerHousePowerRankingEntry;
  rank: number;
  total: number;
}

export interface MaplerHouseHistoryStatus {
  tracked: boolean;
  historyStartDate?: string | null;
  lastSyncedDate?: string | null;
  availableEndDate?: string | null;
  dailyLimit?: number;
  dailySubmitted?: number;
  job?: {
    status?: 'pending' | 'running' | 'completed' | 'failed' | string;
    lastProcessedDate?: string | null;
    error?: string | null;
  } | null;
}

export interface MaplerHouseHistoryDay {
  date: string;
  level: number;
  exp: string;
  expRate: string;
  expGain: string;
  expPending?: boolean;
  growthPercent?: number | null;
  growthBucket: number;
  active: boolean;
  name?: string;
  world?: string;
  class?: string;
  guild?: string;
  liberationStatus?: string;
}

export interface MaplerHouseHistoryEvent {
  date: string;
  type: 'level' | 'name' | 'class' | 'world' | 'guild' | 'liberation' | 'dojang' | string;
  title?: string;
  from: string;
  to: string;
}

export interface MaplerHouseCharacterHistory {
  server: string;
  ocid: string;
  start: string;
  end: string;
  days: MaplerHouseHistoryDay[];
  stats: {
    activeDays: number;
    longestStreak: number;
    levelGain: number;
    bestDay: { date: string; expGain: string } | null;
  };
  events: MaplerHouseHistoryEvent[];
  historyStartDate?: string | null;
  lastSyncedDate?: string | null;
  availableEndDate?: string | null;
}

interface MaplerHouseTrackedItem {
  name: string;
  avatar: string;
  world: string;
  job: string;
  level: number;
  combatPower: string | number;
}

interface MaplerHouseTrackedResponse {
  status: string;
  code: number;
  data?: {
    page?: number;
    pageSize?: number;
    total?: number;
    items?: MaplerHouseTrackedItem[];
  };
}

interface MaplerHouseHistoryStatusResponse {
  status: string;
  code: number;
  message?: string;
  data?: MaplerHouseHistoryStatus;
}

interface MaplerHouseCharacterHistoryResponse {
  status: string;
  code: number;
  message?: string;
  data?: MaplerHouseCharacterHistory;
}

const MAPLERHOUSE_TRACKED_API = 'https://api.maplerhouse.cn/api/v1/tms/characters/history/tracked';
const RANKING_PAGE_SIZE = 10;
const FULL_RANKING_PAGE_SIZE = 100;
const FULL_RANKING_CACHE_MS = 5 * 60 * 1000;

let fullRankingCache: { items: MaplerHousePowerRankingEntry[]; expiresAt: number } | null = null;
let fullRankingPromise: Promise<MaplerHousePowerRankingEntry[]> | null = null;

export const invalidateMaplerHouseRankingCache = () => {
  fullRankingCache = null;
};

const parseCombatPower = (value: string | number): number => {
  if (typeof value === 'number') return value;
  return parseInt(value.replace(/,/g, ''), 10) || 0;
};

const buildTrackedApiUrl = (page: number, pageSize: number) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort: 'combat_power',
    sort_order: 'desc',
    min_level: '260',
  });
  return `${MAPLERHOUSE_TRACKED_API}?${params.toString()}`;
};

export const fetchMaplerHousePowerRanking = async (
  page = 1,
  pageSize = RANKING_PAGE_SIZE,
): Promise<MaplerHousePowerRankingPage> => {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.max(1, Math.min(FULL_RANKING_PAGE_SIZE, Math.trunc(pageSize)));
  const response = await fetch(buildTrackedApiUrl(safePage, safePageSize), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`近期戰力排名服務回應失敗 (${response.status})`);
  }

  const payload: MaplerHouseTrackedResponse = await response.json();
  const responseData = payload.data;
  const items = responseData?.items;

  if (payload.status !== 'success' || !Array.isArray(items)) {
    throw new Error('近期戰力排名資料格式異常');
  }

  const parsedItems = items.map((item) => ({
    characterName: item.name,
    worldName: item.world,
    jobName: item.job,
    level: item.level,
    characterImage: item.avatar,
    combatPower: parseCombatPower(item.combatPower),
  }));

  const resolvedPage = responseData?.page ?? safePage;
  const resolvedPageSize = responseData?.pageSize ?? safePageSize;
  const total = responseData?.total ?? parsedItems.length;

  return {
    items: parsedItems,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / resolvedPageSize)),
  };
};

const fetchFullMaplerHousePowerRanking = async (): Promise<MaplerHousePowerRankingEntry[]> => {
  if (fullRankingCache && fullRankingCache.expiresAt > Date.now()) {
    return fullRankingCache.items;
  }

  if (!fullRankingPromise) {
    fullRankingPromise = (async () => {
      const firstPage = await fetchMaplerHousePowerRanking(1, FULL_RANKING_PAGE_SIZE);
      const remainingPages = await Promise.all(
        Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          fetchMaplerHousePowerRanking(index + 2, FULL_RANKING_PAGE_SIZE),
        ),
      );
      const items = [firstPage, ...remainingPages].flatMap((result) => result.items);
      fullRankingCache = {
        items,
        expiresAt: Date.now() + FULL_RANKING_CACHE_MS,
      };
      return items;
    })().finally(() => {
      fullRankingPromise = null;
    });
  }

  return fullRankingPromise;
};

const normalizeCharacterName = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase();

export const fetchMaplerHouseCharacterRank = async (
  characterName: string,
): Promise<MaplerHouseCharacterRank | null> => {
  const normalizedName = normalizeCharacterName(characterName);
  if (!normalizedName) return null;

  const items = await fetchFullMaplerHousePowerRanking();
  const index = items.findIndex((item) => normalizeCharacterName(item.characterName) === normalizedName);
  if (index < 0) return null;

  return {
    entry: items[index],
    rank: index + 1,
    total: items.length,
  };
};

const parseMaplerHouseError = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    return payload?.message || payload?.error || fallback;
  } catch {
    return fallback;
  }
};

export const fetchMaplerHouseHistoryStatus = async (
  ocid: string,
): Promise<MaplerHouseHistoryStatus> => {
  const params = new URLSearchParams({ ocid });
  const response = await fetch(
    `${MAPLERHOUSE_TRACKED_API.replace('/tracked', '/status')}?${params.toString()}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error(await parseMaplerHouseError(response, `成長檔案狀態讀取失敗 (${response.status})`));
  }

  const payload: MaplerHouseHistoryStatusResponse = await response.json();
  if (payload.status !== 'success' || !payload.data) {
    throw new Error(payload.message || '成長檔案狀態格式異常');
  }
  return payload.data;
};

export const createMaplerHouseGrowthProfile = async (
  ocid: string,
): Promise<MaplerHouseHistoryStatusResponse> => {
  const response = await fetch(MAPLERHOUSE_TRACKED_API.replace('/tracked', '/track'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ocid }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseMaplerHouseError(response, `生成成長檔案失敗 (${response.status})`));
  }

  const payload: MaplerHouseHistoryStatusResponse = await response.json();
  if (payload.status !== 'success') {
    throw new Error(payload.message || '成長檔案服務未接受建立請求');
  }
  return payload;
};

export const fetchMaplerHouseCharacterHistory = async (
  ocid: string,
  start: string,
  end: string,
): Promise<MaplerHouseCharacterHistory> => {
  const params = new URLSearchParams({ ocid, start, end });
  const response = await fetch(
    `${MAPLERHOUSE_TRACKED_API.replace('/tracked', '')}?${params.toString()}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error(await parseMaplerHouseError(response, `成長紀錄讀取失敗 (${response.status})`));
  }

  const payload: MaplerHouseCharacterHistoryResponse = await response.json();
  if (payload.status !== 'success' || !payload.data || !Array.isArray(payload.data.days)) {
    throw new Error(payload.message || '成長紀錄資料格式異常');
  }
  return payload.data;
};
