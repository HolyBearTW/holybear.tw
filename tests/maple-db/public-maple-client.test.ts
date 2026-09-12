/// <reference lib="dom" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadClient = async () => import('../../.vitepress/theme/maplestory/services/nexonService');

describe('public MapleStory client requests', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads a basic profile without a maintenance bypass key', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/id?')) return Response.json({ ocid: 'public-ocid' });
      if (url.includes('/character/basic?')) return Response.json({
        character_name: '公開角色',
        character_level: 295,
        character_image: 'https://example.com/public-character.png',
      });
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchCharacterBasic } = await loadClient();
    const basic = await fetchCharacterBasic('公開角色', '');

    expect(basic?.character_level).toBe(295);
    expect(basic?.character_image).toBe('https://example.com/public-character.png');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a basic profile after a maintenance response instead of caching the failure', async () => {
    let maintenanceEnded = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!maintenanceEnded) {
        return Response.json({ maintenance: true, message: '系統維護中' }, { status: 503 });
      }
      if (url.includes('/id?')) return Response.json({ ocid: 'restored-ocid' });
      if (url.includes('/character/basic?')) return Response.json({
        character_name: '恢復角色',
        character_level: 290,
        character_image: 'https://example.com/restored-character.png',
      });
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchCharacterBasic } = await loadClient();
    await expect(fetchCharacterBasic('恢復角色', '')).resolves.toBeNull();

    maintenanceEnded = true;
    await expect(fetchCharacterBasic('恢復角色', '')).resolves.toMatchObject({
      character_level: 290,
      character_image: 'https://example.com/restored-character.png',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('loads BOSS teammate data without a maintenance bypass key', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/id?')) return Response.json({ ocid: 'teammate-ocid' });
      if (url.includes('/character/basic?')) return Response.json({
        character_name: '隊友角色',
        character_class: '主教',
        character_level: 285,
      });
      if (url.includes('/character/stat?')) return Response.json({
        final_stat: [
          { stat_name: '戰鬥力', stat_value: '123,456,789' },
          { stat_name: '神秘力量', stat_value: '1320' },
          { stat_name: '真實之力', stat_value: '660' },
        ],
      });
      if (url.includes('/character/symbol-equipment?')) return Response.json({ symbol: [] });
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchBossTeammateProfile } = await loadClient();
    await expect(fetchBossTeammateProfile('隊友角色', '')).resolves.toEqual({
      characterName: '隊友角色',
      characterClass: '主教',
      level: 285,
      combatPower: 123456789,
      arc: 1320,
      aut: 660,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
