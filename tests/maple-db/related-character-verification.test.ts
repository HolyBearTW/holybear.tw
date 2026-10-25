import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestD1 } from './sqlite-d1';
import { upsertCanonicalNexonCharacter } from '../../functions/_shared/character-repository';
import { verifyRelatedCharacterNames } from '../../functions/_shared/related-character-verification';
import { classifyRelatedCharacters, type RelatedCharacterRecord } from '../../functions/_shared/related-character-policy';
import { createGrowthProfile } from '../../functions/_shared/growth-tracker';
import type { Env } from '../../functions/_shared/env';

let local: ReturnType<typeof createTestD1>;
let env: Env;
const now = '2026-10-26T00:00:00.000Z';
const member = (name = '匯入分身', at = '2026-09-17T00:00:00.000Z'): RelatedCharacterRecord => ({
  ocid: `ocid-${name}`, characterName: name, worldName: '艾麗亞', jobName: '主教',
  level: 290, combatPower: 100, characterImage: 'image', guildName: null,
  metadataAvailable: true, lastCheckedAt: at, isActive: true,
});
const seed = async (row: RelatedCharacterRecord) => upsertCanonicalNexonCharacter(env.DB, {
  ocid: row.ocid!, characterName: row.characterName, worldName: row.worldName, jobName: row.jobName,
  level: row.level!, combatPower: row.combatPower!, characterImage: row.characterImage!, guildName: row.guildName,
  requestedAt: row.lastCheckedAt!, observedAt: row.lastCheckedAt!,
}, [{ source: 'nexon' }]);
beforeEach(() => {
  local = createTestD1();
  env = { DB: local.db, SURVEY_DB: local.db, NEXON_API_KEY: 'test-only', NEXON_RETRY_LIMIT: '1' };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const cache = new Map<string, Response>();
  vi.stubGlobal('caches', { default: {
    match: vi.fn(async (key: Request) => cache.get(key.url)?.clone()),
    put: vi.fn(async (key: Request, response: Response) => { cache.set(key.url, response.clone()); }),
    delete: vi.fn(async (key: Request) => cache.delete(key.url)),
  } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); local.sqlite.close(); });

describe('evidence-based related-character name checks', () => {
  it('keeps older imported roles and caches successful checks without D1 access', async () => {
    const rows = Array.from({ length: 7 }, (_, index) => `匯入測試角色${index + 1}`)
      .map((name, index) => member(name, index === 0 ? '2026-09-25T00:00:00Z' : '2026-09-09T00:00:00Z'));
    for (const row of rows) await seed(row);
    const prepare = vi.spyOn(env.DB, 'prepare');
    const fetchMock = vi.fn(async (input: string) => Response.json({
      ocid: `ocid-${new URL(input).searchParams.get('character_name')}`,
    }));
    vi.stubGlobal('fetch', fetchMock);
    const first = classifyRelatedCharacters(await verifyRelatedCharacterNames(env, rows, 'main'), 'main');
    expect(first.alts.map((row) => row.characterName)).toEqual(rows.map((row) => row.characterName));
    expect(first.unverifiedAlts).toEqual([]);
    await verifyRelatedCharacterNames(env, rows, 'main');
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(prepare).not.toHaveBeenCalled();
    expect(rows[0].lastCheckedAt).toBe('2026-09-25T00:00:00Z');
  });

  it('checks again after the short cache expires and then excludes a newly unavailable name', async () => {
    const row = member();
    await seed(row);
    const fetchMock = vi.fn(async () => Response.json({ ocid: row.ocid }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await verifyRelatedCharacterNames(env, [row], 'main'))[0].isActive).toBe(true);
    vi.setSystemTime(new Date(Date.parse(now) + 300_001));
    fetchMock.mockImplementation(async () => Response.json({ error: { name: 'OPENAPI00004' } }, { status: 400 }));
    expect((await verifyRelatedCharacterNames(env, [row], 'main'))[0].isActive).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['OPENAPI00003', 'OPENAPI00004'])('moves only an officially unavailable name (%s) and stops its existing work', async (code) => {
    const row = member();
    await seed(row);
    await createGrowthProfile(env.DB, row.ocid!);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { name: code } }, { status: 400 })));
    const result = classifyRelatedCharacters(await verifyRelatedCharacterNames(env, [row], 'main'), 'main');
    expect(result.alts).toHaveLength(0);
    expect(result.unverifiedAlts).toEqual([expect.objectContaining({ ocid: row.ocid, dataStatus: 'unavailable' })]);
    expect(local.sqlite.prepare('SELECT is_active FROM characters').get()?.is_active).toBe(0);
    expect(local.sqlite.prepare('SELECT status FROM growth_profiles').get()?.status).toBe('failed');
    expect(local.sqlite.prepare('SELECT active_characters_total FROM database_stats').get()?.active_characters_total).toBe(0);
  });

  it('excludes an old name assigned to another OCID without importing the unrelated new owner', async () => {
    const row = member();
    await seed(row);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ocid: 'different-owner' })));
    expect((await verifyRelatedCharacterNames(env, [row], 'main'))[0].isActive).toBe(false);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS n FROM characters').get()?.n).toBe(1);
  });

  it('uses official name evidence even if a recent import refreshed retained basic data for an old OCID', async () => {
    const row = member('剛匯入的舊名字', now);
    await seed(row);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { name: 'OPENAPI00004' } }, { status: 400 })));
    expect((await verifyRelatedCharacterNames(env, [row], 'main'))[0].isActive).toBe(false);
  });

  it.each([
    { status: 429, code: 'OPENAPI00007' }, { status: 503, code: 'OPENAPI00011' },
    { status: 400, code: 'OPENAPI00005' }, { status: 400, code: 'OPENAPI00006' },
    { status: 403, code: 'OPENAPI00002' }, { status: 404, code: '' },
    { status: 200, code: '' },
  ])('keeps known roles on an uncertain response $status/$code without D1 writes', async ({ status, code }) => {
    const row = member();
    await seed(row);
    const prepare = vi.spyOn(env.DB, 'prepare');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { name: code } }, { status })));
    const result = classifyRelatedCharacters(await verifyRelatedCharacterNames(env, [row], 'main'), 'main');
    expect(result.alts).toHaveLength(1);
    expect(result.unverifiedAlts).toHaveLength(0);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('keeps known roles on network failure without changing the stored validation timestamp', async () => {
    const row = member();
    await seed(row);
    const prepare = vi.spyOn(env.DB, 'prepare');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network unavailable'); }));
    expect((await verifyRelatedCharacterNames(env, [row], 'main'))[0]).toEqual(row);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('respects a newer canonical rename instead of invalidating it with a late negative reply', async () => {
    const row = member();
    await seed(row);
    let release: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { release = resolve; })));
    const checking = verifyRelatedCharacterNames(env, [row], 'main');
    while (!release) await Promise.resolve();
    await seed({ ...row, characterName: '最新名字', lastCheckedAt: '2026-10-26T00:00:01.000Z' });
    release(Response.json({ error: { name: 'OPENAPI00003' } }, { status: 400 }));
    expect((await checking)[0]).toMatchObject({ characterName: '最新名字', isActive: true });
    expect(local.sqlite.prepare('SELECT is_active FROM characters').get()?.is_active).toBe(1);
  });
});
