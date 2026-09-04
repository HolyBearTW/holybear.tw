import { afterEach, describe, expect, it, vi } from 'vitest';
import { MaplerHouseImporter } from '../../functions/_shared/importers/maplerhouse-importer';
import { resolveNexonCharacter } from '../../functions/_shared/nexon-client';
import type { Env } from '../../functions/_shared/env';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('seed importer retries', () => {
  it('retries a transient MaplerHouse network failure and skips invalid entries', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('temporary timeout');
      return Response.json({
        status: 'success',
        data: {
          page: 1,
          pageSize: 2,
          total: 1,
          items: [
            { name: '有效角色', level: 280, combatPower: '1,000' },
            { name: '   ', level: 1 },
          ],
        },
      });
    }) as typeof fetch;
    const page = await new MaplerHouseImporter().fetchPage(1, 2);
    expect(calls).toBe(2);
    expect(page.items).toHaveLength(1);
    expect(page.complete).toBe(true);
  });
});

describe('NEXON resolution', () => {
  it('backs off after 429 and resolves name to official OCID/basic/stat', async () => {
    let idCalls = 0;
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes('/id?')) {
        idCalls += 1;
        if (idCalls === 1) return new Response('{}', { status: 429 });
        return Response.json({ ocid: 'official-ocid' });
      }
      if (url.includes('/character/basic?')) {
        return Response.json({
          character_name: '測試角色', world_name: '艾麗亞', character_class: '主教',
          character_level: 290, character_image: 'image', character_guild_name: '公會',
        });
      }
      if (url.includes('/character/stat?')) {
        return Response.json({ final_stat: [{ stat_name: '戰鬥力', stat_value: '12,345' }] });
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch;
    const env = {
      NEXON_API_KEY: 'test-only',
      NEXON_RETRY_LIMIT: '2',
      NEXON_REQUEST_TIMEOUT_MS: '2000',
    } as Env;
    const result = await resolveNexonCharacter(env, '測試角色');
    expect(idCalls).toBe(2);
    expect(result).toMatchObject({ ocid: 'official-ocid', characterName: '測試角色', combatPower: 12_345 });
  });
});
