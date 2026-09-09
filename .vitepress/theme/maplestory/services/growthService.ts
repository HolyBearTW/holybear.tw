import {
  createMaplerHouseGrowthProfile,
  fetchMaplerHouseCharacterHistory,
  fetchMaplerHouseHistoryStatus,
  type MaplerHouseCharacterHistory,
  type MaplerHouseHistoryStatus,
} from './maplerhouseService';

export type GrowthHistoryStatus = MaplerHouseHistoryStatus & { progress?: number };
export type GrowthCharacterHistory = MaplerHouseCharacterHistory;

export const NEXON_GROWTH_SHADOW_OCID = 'a3e399217d603631033dd65ebaa08275';
export const usesNexonGrowthShadow = (ocid: string) => ocid === NEXON_GROWTH_SHADOW_OCID;

const parseError = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.message || fallback;
  } catch {
    return fallback;
  }
};

export const fetchGrowthHistoryStatus = async (ocid: string): Promise<GrowthHistoryStatus> => {
  if (!usesNexonGrowthShadow(ocid)) return fetchMaplerHouseHistoryStatus(ocid);
  const response = await fetch(`/api/growth/status?ocid=${encodeURIComponent(ocid)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await parseError(response, `成長檔案狀態讀取失敗 (${response.status})`));
  return response.json();
};

export const createGrowthProfile = async (ocid: string) => {
  if (!usesNexonGrowthShadow(ocid)) return createMaplerHouseGrowthProfile(ocid);
  const response = await fetch('/api/growth/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ocid }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await parseError(response, `生成成長檔案失敗 (${response.status})`));
  return response.json();
};

export const fetchGrowthCharacterHistory = async (
  ocid: string,
  start: string,
  end: string,
): Promise<GrowthCharacterHistory> => {
  if (!usesNexonGrowthShadow(ocid)) return fetchMaplerHouseCharacterHistory(ocid, start, end);
  const params = new URLSearchParams({ ocid, start, end });
  const response = await fetch(`/api/growth/history?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await parseError(response, `成長紀錄讀取失敗 (${response.status})`));
  return response.json();
};
