import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestD1 } from './sqlite-d1';
import { getCharacterAlts, syncCharacterAccountSignals } from '../../functions/_shared/account-group-repository';
import { backfillAccountSignalBatch } from '../../functions/_shared/account-signal-backfill';
import { claimAccountSignalForBackground, completeAccountSignalClaim } from '../../functions/_shared/account-signal-queue';
import { findCharacterByOcid, upsertCanonicalNexonCharacter } from '../../functions/_shared/character-repository';
import type { Env } from '../../functions/_shared/env';
import type { CharacterWrite } from '../../functions/_shared/models';

let local: ReturnType<typeof createTestD1>;
let env: Env;
const baseTime = '2026-09-07T00:00:00.000Z';

const character = (name: string, overrides: Partial<CharacterWrite> = {}): CharacterWrite => ({
  ocid: `ocid-${name}`,
  characterName: name,
  worldName: '艾麗亞',
  jobName: '主教',
  level: 290,
  combatPower: 1_000_000,
  characterImage: 'image',
  guildName: '公會A',
  observedAt: baseTime,
  requestedAt: baseTime,
  nexonUpdatedAt: null,
  ...overrides,
});

const fullPayload = () => ({
  union_level: 8_000,
  union_grade: 'Grand Master Union',
});

const raiderPayload = () => ({
  use_preset_no: 1,
  union_block: Array.from({ length: 8 }, (_, index) => ({
    block_type: `type-${index}`,
    block_class: `class-${index}`,
    block_level: 250,
    block_control_point: { x: index, y: index + 1 },
    block_position: [{ x: index, y: index + 1 }],
  })),
});

const championPayload = () => ({
  union_champion: [
    { champion_name: '主角色', champion_grade: 'S', champion_class: '主教' },
    { champion_name: '分身角色', champion_grade: 'S', champion_class: '戰士' },
  ],
});

const installSignalApi = () => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = new URL(input).pathname;
    if (path.endsWith('/user/union-champion')) return Response.json(championPayload());
    if (path.endsWith('/user/union')) return Response.json(fullPayload());
    if (path.endsWith('/user/union-raider')) return Response.json(raiderPayload());
    throw new Error(`Unexpected endpoint ${path}`);
  }));
};

beforeEach(async () => {
  local = createTestD1();
  env = {
    DB: local.db,
    SURVEY_DB: local.db,
    NEXON_API_KEY: 'test-only',
    NEXON_RETRY_LIMIT: '1',
    NEXON_REQUEST_DELAY_MS: '0',
    ACCOUNT_SIGNAL_FRESHNESS_SECONDS: '86400',
    ACCOUNT_SIGNAL_BACKGROUND_REFRESH_SECONDS: '86400',
    CHARACTER_FRESHNESS_SECONDS: '900',
  };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(baseTime);
  await upsertCanonicalNexonCharacter(env.DB, character('主角色'), [{ source: 'nexon' }]);
  await upsertCanonicalNexonCharacter(env.DB, character('分身角色'), [{ source: 'nexon' }]);
});

afterEach(() => {
  local.sqlite.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('account-signal queue and on-demand synchronization', () => {
  it('enqueues canonical writes and on-demand full sync completes the same queue row', async () => {
    installSignalApi();
    expect(local.sqlite.prepare(`SELECT status FROM account_signal_sync WHERE ocid='ocid-主角色'`).get()?.status)
      .toBe('pending');

    const result = await getCharacterAlts(env, '主角色');
    const row = local.sqlite.prepare(`
      SELECT status, signal_count, completed_at FROM account_signal_sync
      WHERE ocid='ocid-主角色' AND signal_type='union_raider_full'
    `).get() as { status: string; signal_count: number; completed_at: string | null };
    expect(row.status).toBe('completed');
    expect(row.signal_count).toBe(1);
    expect(row.completed_at).toBe(baseTime);
    expect(result.alts.some((alt) => alt.characterName === '分身角色')).toBe(true);
  });

  it('reuses a fresh completed full signal while retaining champion roster refresh', async () => {
    installSignalApi();
    await getCharacterAlts(env, '主角色');
    const calls = vi.mocked(fetch);
    calls.mockClear();

    await getCharacterAlts(env, '主角色');
    const paths = calls.mock.calls.map(([input]) => new URL(String(input)).pathname);
    expect(paths.filter((path) => path.endsWith('/user/union'))).toHaveLength(0);
    expect(paths.filter((path) => path.endsWith('/user/union-raider'))).toHaveLength(0);
    expect(paths.filter((path) => path.endsWith('/user/union-champion'))).toHaveLength(1);
  });

  it('revalidates a stale full signal using the same freshness window', async () => {
    env.ACCOUNT_SIGNAL_FRESHNESS_SECONDS = '300';
    installSignalApi();
    await getCharacterAlts(env, '主角色');
    vi.setSystemTime(new Date(Date.parse(baseTime) + 301_000));
    vi.mocked(fetch).mockClear();

    await getCharacterAlts(env, '主角色');
    const paths = vi.mocked(fetch).mock.calls.map(([input]) => new URL(String(input)).pathname);
    expect(paths.filter((path) => path.endsWith('/user/union'))).toHaveLength(1);
    expect(paths.filter((path) => path.endsWith('/user/union-raider'))).toHaveLength(1);
  });

  it('background claims pending rows and marks them completed without a second consumer lease', async () => {
    env.ACCOUNT_SIGNAL_FRESHNESS_SECONDS = '300';
    env.ACCOUNT_SIGNAL_BACKGROUND_REFRESH_SECONDS = '300';
    installSignalApi();
    const first = await backfillAccountSignalBatch(env);
    expect(first).toMatchObject({ processed: 2, completed: 2, retry: 0, failed: 0 });
    expect(first.instrumentation.nexonUnion.count).toBe(2);
    expect(first.instrumentation.nexonUnionRaider.count).toBe(2);
    expect(first.instrumentation.characters).toBe(2);
    expect(first.instrumentation.p50WallMs).toBeGreaterThanOrEqual(0);
    expect(first.instrumentation.p95WallMs).toBeGreaterThanOrEqual(first.instrumentation.p50WallMs);
    expect(first.instrumentation.requestsPerSecond).toBeGreaterThanOrEqual(0);
    const second = await backfillAccountSignalBatch(env);
    expect(second.processed).toBe(0);
    expect((await findCharacterByOcid(env.DB, 'ocid-主角色'))?.ocid).toBe('ocid-主角色');
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM account_group_signals WHERE signal_type='union_raider_full'`).get()?.count)
      .toBe(2);
    expect(vi.mocked(fetch).mock.calls.filter(([input]) => new URL(String(input)).pathname.endsWith('/user/union')).length)
      .toBe(2);

    vi.setSystemTime(new Date(Date.parse(baseTime) + 301_000));
    vi.mocked(fetch).mockClear();
    const stale = await backfillAccountSignalBatch(env);
    expect(stale).toMatchObject({ processed: 2, completed: 2 });
    expect(vi.mocked(fetch).mock.calls.filter(([input]) => new URL(String(input)).pathname.endsWith('/user/union')).length)
      .toBe(2);
  });

  it('allows only one concurrent background claim for an OCID', async () => {
    const [first, second] = await Promise.all([
      claimAccountSignalForBackground(env.DB, 'ocid-主角色', 86_400),
      claimAccountSignalForBackground(env.DB, 'ocid-主角色', 86_400),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    const claim = first || second;
    await completeAccountSignalClaim(env.DB, claim!, 1);
    expect(local.sqlite.prepare(`SELECT status FROM account_signal_sync WHERE ocid='ocid-主角色'`).get()?.status)
      .toBe('completed');
  });

  it('does not requeue signals when the canonical upsert rejects an older official response', async () => {
    await upsertCanonicalNexonCharacter(env.DB, character('主角色', {
      nexonUpdatedAt: '2026-09-07T00:00:00.000Z',
    }), [{ source: 'nexon' }]);
    const claim = await claimAccountSignalForBackground(env.DB, 'ocid-主角色', 86_400);
    await completeAccountSignalClaim(env.DB, claim!, 1);
    await upsertCanonicalNexonCharacter(env.DB, character('主角色', {
      nexonUpdatedAt: '2026-09-06T00:00:00.000Z',
    }), [{ source: 'nexon' }]);
    expect(local.sqlite.prepare(`SELECT status FROM account_signal_sync WHERE ocid='ocid-主角色'`).get()?.status)
      .toBe('completed');
  });

  it('a new character with the same full fingerprint joins an existing group', async () => {
    installSignalApi();
    const firstCharacter = await findCharacterByOcid(env.DB, 'ocid-主角色');
    const secondCharacter = await findCharacterByOcid(env.DB, 'ocid-分身角色');
    const first = await syncCharacterAccountSignals(env, firstCharacter!, ['union_raider_full']);
    await syncCharacterAccountSignals(env, secondCharacter!, ['union_raider_full']);
    const main = await findCharacterByOcid(env.DB, 'ocid-主角色');
    const alt = await findCharacterByOcid(env.DB, 'ocid-分身角色');
    expect(first.signalCount).toBe(1);
    expect(main?.accountGroupId).not.toBeNull();
    expect(alt?.accountGroupId).toBe(main?.accountGroupId);
  });
});
