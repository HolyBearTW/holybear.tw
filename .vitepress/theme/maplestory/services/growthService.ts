import type {
  MaplerHouseCharacterHistory,
  MaplerHouseHistoryStatus,
} from './maplerhouseService';

type GrowthJobStatus = NonNullable<MaplerHouseHistoryStatus['job']> & {
  phase?: 'basic' | 'dojang';
  currentProcessingDate?: string | null;
  nextRetryAt?: string | null;
};

export type GrowthHistoryStatus = Omit<MaplerHouseHistoryStatus, 'job'> & {
  progress?: number;
  currentProcessingDate?: string | null;
  job?: GrowthJobStatus | null;
};
export type GrowthCharacterHistory = MaplerHouseCharacterHistory;

export const GROWTH_PROVIDER = 'nexon_primary' as const;

const parseError = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.message || fallback;
  } catch {
    return fallback;
  }
};

export const fetchGrowthHistoryStatus = async (ocid: string): Promise<GrowthHistoryStatus> => {
  const response = await fetch(`/api/growth/status?ocid=${encodeURIComponent(ocid)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await parseError(response, `成長檔案狀態讀取失敗 (${response.status})`));
  return response.json();
};

export const createGrowthProfile = async (ocid: string) => {
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
  const params = new URLSearchParams({ ocid, start, end });
  const response = await fetch(`/api/growth/history?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await parseError(response, `成長紀錄讀取失敗 (${response.status})`));
  return response.json();
};
