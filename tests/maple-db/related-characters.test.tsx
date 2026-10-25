// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RelatedCharacters from '../../.vitepress/theme/maplestory/components/RelatedCharacters';
import {
  fetchHolyBearAlts, fetchHolyBearCharacterRank, fetchHolyBearRankingSnapshot,
  type HolyBearAltRecord, type HolyBearAltsResponse,
} from '../../.vitepress/theme/maplestory/services/holyBearService';
import type { DashboardData } from '../../.vitepress/theme/maplestory/types';

vi.mock('../../.vitepress/theme/maplestory/services/holyBearService', () => ({
  fetchHolyBearAlts: vi.fn(), fetchHolyBearCharacterRank: vi.fn(), fetchHolyBearRankingSnapshot: vi.fn(),
}));
vi.mock('../../.vitepress/theme/maplestory/components/CharacterAvatar', () => ({ default: () => null }));

let root: Root;
let container: HTMLDivElement;
const alt = (overrides: Partial<HolyBearAltRecord> = {}): HolyBearAltRecord => ({
  ocid: 'alt-ocid', characterName: '近期角色', worldName: '艾麗亞', jobName: '主教',
  level: 290, combatPower: 123, characterImage: null, guildName: null,
  metadataAvailable: true, lastCheckedAt: '2026-10-25T00:00:00Z', isActive: true, dataStatus: 'current',
  ...overrides,
});
const data = { ocid: 'main-ocid', basic: { character_name: '主角色' } } as DashboardData;
const respond = (alts: HolyBearAltRecord[], unverifiedAlts: HolyBearAltRecord[]) => {
  vi.mocked(fetchHolyBearAlts).mockResolvedValue({
    alts, unverifiedAlts, freshnessDays: 30, resolution: { status: 'complete' },
  } as HolyBearAltsResponse);
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetAllMocks();
  vi.mocked(fetchHolyBearCharacterRank).mockResolvedValue(null);
  vi.mocked(fetchHolyBearRankingSnapshot).mockResolvedValue(new Map());
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

describe('related character display', () => {
  it('excludes old records from the count, ranking requests and clickable search cards', async () => {
    respond([alt()], [alt({ ocid: 'old-ocid', characterName: '舊名字', dataStatus: 'stale' })]);
    const select = vi.fn();
    await act(async () => root.render(<RelatedCharacters data={data} onSelectCharacter={select} />));
    expect(container.textContent).toContain('近期資料 1 個分身');
    expect(container.textContent).toContain('尚未重新確認 · 1 筆');
    expect(container.querySelector('[aria-label="查詢分身 舊名字"]')).toBeNull();
    expect(fetchHolyBearCharacterRank).toHaveBeenCalledExactlyOnceWith('近期角色');
    await act(async () => (container.querySelector('[aria-label="查詢分身 近期角色"]') as HTMLButtonElement).click());
    expect(select).toHaveBeenCalledExactlyOnceWith('近期角色');
  });

  it('renders a pending-only result without fetching ranks or the ranking snapshot', async () => {
    respond([], [alt({ dataStatus: 'unavailable', isActive: false })]);
    await act(async () => root.render(<RelatedCharacters data={data} onSelectCharacter={vi.fn()} />));
    expect(container.textContent).toContain('近期資料 0 個分身');
    expect(container.textContent).toContain('已停止收錄');
    expect(fetchHolyBearCharacterRank).not.toHaveBeenCalled();
    expect(fetchHolyBearRankingSnapshot).not.toHaveBeenCalled();
  });

  it('does not restore a static snapshot rank after the current ranking endpoint returns 404', async () => {
    respond([alt()], []);
    vi.mocked(fetchHolyBearRankingSnapshot).mockResolvedValue(new Map([['近期角色', 1]]));
    await act(async () => root.render(<RelatedCharacters data={data} onSelectCharacter={vi.fn()} />));
    expect(container.querySelector('.maple-related-rank')).toBeNull();
  });
});
