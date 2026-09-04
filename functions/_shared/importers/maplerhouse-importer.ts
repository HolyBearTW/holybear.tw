import { normalizeCharacterName } from '../character-repository';
import type { SeedImporter, SeedPage } from './importer';

const TRACKED_API = 'https://api.maplerhouse.cn/api/v1/tms/characters/history/tracked';
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

interface TrackedItem {
  ocid?: string;
  name?: string;
  avatar?: string;
  world?: string;
  job?: string;
  level?: number;
  combatPower?: string | number;
}

interface TrackedResponse {
  status?: string;
  data?: {
    page?: number;
    pageSize?: number;
    total?: number;
    items?: TrackedItem[];
  };
}

const parsePower = (value: string | number | undefined) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

const fetchTracked = async (url: string, attempts = 5): Promise<TrackedResponse> => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (response.ok) return await response.json<TrackedResponse>();
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`MaplerHouse rejected the request (${response.status})`);
      }
      lastError = new Error(`MaplerHouse temporarily unavailable (${response.status})`);
    } catch (error) {
      lastError = error;
    }
    if (attempt + 1 < attempts) await wait(Math.min(10_000, 500 * (2 ** attempt)));
  }
  throw lastError instanceof Error ? lastError : new Error('MaplerHouse request failed');
};

export class MaplerHouseImporter implements SeedImporter {
  readonly source = 'maplerhouse' as const;

  async fetchPage(page: number, pageSize: number): Promise<SeedPage> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      sort: 'combat_power',
      sort_order: 'desc',
    });
    const payload = await fetchTracked(`${TRACKED_API}?${params.toString()}`);
    const responseItems = payload.data?.items;
    if (payload.status !== 'success' || !Array.isArray(responseItems)) {
      throw new Error('MaplerHouse tracked response has an unexpected shape');
    }
    const items = responseItems.flatMap((item) => {
      const characterName = String(item.name || '').trim().normalize('NFC');
      if (!characterName) return [];
      const normalizedName = normalizeCharacterName(characterName);
      return [{
        sourceId: String(item.ocid || normalizedName),
        characterName,
        worldName: String(item.world || ''),
        jobName: String(item.job || ''),
        level: Math.max(0, Number(item.level) || 0),
        combatPower: parsePower(item.combatPower),
        characterImage: String(item.avatar || ''),
        ocid: item.ocid || null,
      }];
    });
    const totalValue = Number(payload.data?.total);
    const total = Number.isFinite(totalValue) ? totalValue : null;
    return {
      page: Number(payload.data?.page) || page,
      pageSize: Number(payload.data?.pageSize) || pageSize,
      total,
      items,
      complete: responseItems.length < pageSize || (total != null && page * pageSize >= total),
    };
  }
}
