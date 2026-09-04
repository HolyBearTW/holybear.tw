import type { Env } from './env';
import type { RankingEntry, RankingFilters } from './models';
import { normalizeCharacterName } from './character-repository';
import { getCombatPowerRanking } from './ranking-repository';
import { getRuntimeConfig } from './runtime-config';
import bundledRankingSnapshot from '../../public/maplestory/rankings/current.json';

interface RankingPage {
  items: RankingEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  degraded?: boolean;
  snapshotAt?: string;
}

interface RankingSnapshot {
  generatedAt: string;
  total: number;
  items: RankingEntry[];
}

const cacheOrigin = 'https://holybear.tw/__ranking-cache';
const cacheHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=604800' };
const rankingCache = () => (caches as unknown as { default: Cache }).default;
const pageKey = (filters: RankingFilters) => {
  const params = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
  if (filters.world) params.set('world', filters.world);
  if (filters.job) params.set('job', filters.job);
  if (filters.minLevel != null) params.set('minLevel', String(filters.minLevel));
  return new Request(`${cacheOrigin}/pages?${params}`);
};
const characterKey = (name: string) => new Request(`${cacheOrigin}/characters/${encodeURIComponent(normalizeCharacterName(name))}`);
const snapshotKey = () => new Request(`${cacheOrigin}/snapshot`);

const readCache = async <T>(key: Request): Promise<T | null> => {
  const response = await rankingCache().match(key);
  return response ? response.json<T>() : null;
};
const writeCache = (key: Request, value: unknown) => rankingCache().put(
  key,
  new Response(JSON.stringify(value), { headers: cacheHeaders }),
);

const readSnapshot = async (): Promise<RankingSnapshot | null> => {
  const cached = await readCache<RankingSnapshot>(snapshotKey());
  if (cached) return cached;
  return bundledRankingSnapshot as RankingSnapshot;
};

export const cacheRankingPage = (filters: RankingFilters, page: RankingPage) => writeCache(pageKey(filters), page);
export const cacheCharacterRank = (name: string, result: unknown) => writeCache(characterKey(name), result);

export const refreshRankingSnapshot = async (env: Env) => {
  const pageSize = getRuntimeConfig(env).rankingSnapshotSize;
  const page = await getCombatPowerRanking(env.DB, { page: 1, pageSize });
  const snapshot: RankingSnapshot = { generatedAt: new Date().toISOString(), total: page.total, items: page.items };
  await Promise.all([
    writeCache(snapshotKey(), snapshot),
    writeCache(pageKey({ page: 1, pageSize: 10 }), { ...page, items: page.items.slice(0, 10), pageSize: 10, totalPages: Math.max(1, Math.ceil(page.total / 10)) }),
  ]);
  return snapshot;
};

export const getCachedRankingPage = async (filters: RankingFilters): Promise<RankingPage | null> => {
  const exact = await readCache<RankingPage>(pageKey(filters));
  if (exact) return { ...exact, degraded: true };
  const snapshot = await readSnapshot();
  if (!snapshot) return null;
  const matching = snapshot.items.filter((entry) => (
    (!filters.world || entry.worldName === filters.world)
    && (!filters.job || entry.jobName === filters.job)
    && (filters.minLevel == null || entry.level >= filters.minLevel)
  ));
  const offset = (filters.page - 1) * filters.pageSize;
  const items = matching.slice(offset, offset + filters.pageSize);
  if (!items.length && offset > 0) return null;
  return {
    items,
    page: filters.page,
    pageSize: filters.pageSize,
    total: filters.world || filters.job || filters.minLevel != null ? matching.length : snapshot.total,
    totalPages: Math.max(1, Math.ceil((filters.world || filters.job || filters.minLevel != null ? matching.length : snapshot.total) / filters.pageSize)),
    degraded: true,
    snapshotAt: snapshot.generatedAt,
  };
};

export const getCachedCharacterRank = async (name: string) => {
  const exact = await readCache<{ entry: RankingEntry; rank: number; total: number }>(characterKey(name));
  if (exact) return { ...exact, degraded: true };
  const snapshot = await readSnapshot();
  if (!snapshot) return null;
  const normalized = normalizeCharacterName(name);
  const entry = snapshot.items.find((item) => normalizeCharacterName(item.characterName) === normalized);
  return entry ? { entry, rank: entry.rank, total: snapshot.total, degraded: true, snapshotAt: snapshot.generatedAt } : null;
};
