export interface MaplerHousePowerRankingEntry {
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  characterImage: string;
  combatPower: number;
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
    items?: MaplerHouseTrackedItem[];
  };
}

const MAPLERHOUSE_TRACKED_API = 'https://api.maplerhouse.cn/api/v1/tms/characters/history/tracked?page=1&page_size=10&sort=combat_power&sort_order=desc&min_level=260';

const parseCombatPower = (value: string | number): number => {
  if (typeof value === 'number') return value;
  return parseInt(value.replace(/,/g, ''), 10) || 0;
};

export const fetchMaplerHousePowerRanking = async (): Promise<MaplerHousePowerRankingEntry[]> => {
  const response = await fetch(MAPLERHOUSE_TRACKED_API, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Mapler House API 回應失敗 (${response.status})`);
  }

  const payload: MaplerHouseTrackedResponse = await response.json();
  const items = payload.data?.items;

  if (payload.status !== 'success' || !Array.isArray(items)) {
    throw new Error('Mapler House API 資料格式異常');
  }

  return items.map((item) => ({
    characterName: item.name,
    worldName: item.world,
    jobName: item.job,
    level: item.level,
    characterImage: item.avatar,
    combatPower: parseCombatPower(item.combatPower),
  }));
};
