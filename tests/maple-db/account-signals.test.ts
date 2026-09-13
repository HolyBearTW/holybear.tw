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

const installNamedSignalApi = (
  championNames: string[],
  failures: Partial<Record<'union-champion' | 'union' | 'union-raider', number>> = {},
) => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = new URL(input).pathname;
    const endpoint = path.split('/').pop() as keyof typeof failures;
    if (failures[endpoint]) return new Response('temporary failure', { status: failures[endpoint] });
    if (path.endsWith('/user/union-champion')) return Response.json({
      union_champion: championNames.map((name) => ({
        champion_name: name,
        champion_grade: 'S',
        champion_class: '主教',
      })),
    });
    if (path.endsWith('/user/union')) return Response.json(fullPayload());
    if (path.endsWith('/user/union-raider')) return Response.json(raiderPayload());
    throw new Error(`Unexpected endpoint ${path}`);
  }));
};

const seedCharacter = async (name: string) => {
  await upsertCanonicalNexonCharacter(env.DB, character(name), [{ source: 'nexon' }]);
};

const seedSignal = async (
  name: string,
  fingerprint: string,
  type: 'union_champion_roster' | 'union_raider_full' = 'union_raider_full',
  groupId: number | null = null,
) => {
  const validFingerprint = fingerprint.padEnd(64, '0').slice(0, 64);
  await env.DB.prepare(`
    INSERT INTO account_group_signals (
      ocid, account_group_id, signal_type, fingerprint_version, union_fingerprint,
      confidence, evidence_json, first_seen_at, last_seen_at, created_at, updated_at
    ) VALUES (?1, ?2, ?3, 1, ?4, 'high', '{}', ?5, ?5, ?5, ?5)
  `).bind(`ocid-${name}`, groupId, type, validFingerprint, baseTime).run();
};

const seedGroup = async (names: string[]) => {
  const row = await env.DB.prepare(`
    INSERT INTO account_groups (
      union_fingerprint, confidence, first_seen_at, last_verified_at, created_at, updated_at
    ) VALUES ('seed', 'high', ?1, ?1, ?1, ?1) RETURNING id
  `).bind(baseTime).first<{ id: number }>();
  for (const name of names) {
    await env.DB.prepare('UPDATE characters SET account_group_id=?1 WHERE ocid=?2')
      .bind(row!.id, `ocid-${name}`).run();
    await env.DB.prepare('UPDATE account_group_signals SET account_group_id=?1 WHERE ocid=?2')
      .bind(row!.id, `ocid-${name}`).run();
  }
  return row!.id;
};

const altNames = (result: Awaited<ReturnType<typeof getCharacterAlts>>) => (
  result.alts.map((alt) => alt.characterName).sort((left, right) => left.localeCompare(right))
);

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
  vi.restoreAllMocks();
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

  it('converges a cold first search across every reachable signal layer', async () => {
    for (const name of ['冷A', '冷B', '冷C', '冷D']) await seedCharacter(name);
    await seedSignal('冷A', 'edge-ab');
    await seedSignal('冷B', 'edge-ab');
    await seedSignal('冷B', 'edge-bc');
    await seedSignal('冷C', 'edge-bc');
    await seedSignal('冷C', 'edge-cd');
    await seedSignal('冷D', 'edge-cd');
    installNamedSignalApi(['冷A', '冷B']);

    const result = await getCharacterAlts(env, '冷A');
    expect(altNames(result)).toEqual(['冷B', '冷C', '冷D']);
    expect(result.resolution.status).toBe('complete');
    expect(result.resolution).toMatchObject({
      scope: 'available_signal_graph',
      officialAccountComplete: false,
    });
  });

  it('requires signal type, fingerprint version, and fingerprint to all match', async () => {
    for (const name of ['嚴格A', '嚴格B', '嚴格C']) await seedCharacter(name);
    await seedSignal('嚴格A', 'same-digest', 'union_raider_full');
    await seedSignal('嚴格B', 'same-digest', 'union_champion_roster');
    await seedSignal('嚴格C', 'same-digest', 'union_raider_full');
    await env.DB.prepare(`UPDATE account_group_signals SET fingerprint_version=2
      WHERE ocid='ocid-嚴格C'`).run();
    installNamedSignalApi(['嚴格A']);

    const result = await getCharacterAlts(env, '嚴格A');
    expect(result.alts).toHaveLength(0);
  });

  it('returns the same closure for cold first search A and cold first search B', async () => {
    for (const name of ['順序A', '順序B', '順序C']) await seedCharacter(name);
    await seedSignal('順序A', 'order-edge');
    await seedSignal('順序B', 'order-edge');
    await seedSignal('順序B', 'order-tail');
    await seedSignal('順序C', 'order-tail');
    installNamedSignalApi(['順序A', '順序B']);

    const fromA = await getCharacterAlts(env, '順序A');
    local.sqlite.exec('UPDATE characters SET account_group_id=NULL; UPDATE account_group_signals SET account_group_id=NULL; DELETE FROM account_groups;');
    const fromB = await getCharacterAlts(env, '順序B');
    expect(new Set(['順序A', ...altNames(fromA)])).toEqual(new Set(['順序B', ...altNames(fromB)]));
  });

  it('is order independent for A then B and B then A', async () => {
    for (const name of ['往返A', '往返B', '往返C']) await seedCharacter(name);
    for (const name of ['往返A', '往返B', '往返C']) await seedSignal(name, 'round-trip');
    installNamedSignalApi(['往返A', '往返B']);

    const aThenB = [await getCharacterAlts(env, '往返A'), await getCharacterAlts(env, '往返B')];
    local.sqlite.exec('UPDATE characters SET account_group_id=NULL; UPDATE account_group_signals SET account_group_id=NULL; DELETE FROM account_groups;');
    const bThenA = [await getCharacterAlts(env, '往返B'), await getCharacterAlts(env, '往返A')];
    const expected = new Set(['往返A', '往返B', '往返C']);
    for (const result of [...aThenB, ...bThenA]) {
      expect(new Set([result.character.characterName, ...altNames(result)])).toEqual(expected);
    }
  });

  it('converges concurrent searches of two characters onto one group', async () => {
    for (const name of ['同時A', '同時B', '同時C']) await seedCharacter(name);
    for (const name of ['同時A', '同時B', '同時C']) await seedSignal(name, 'concurrent-edge');
    installNamedSignalApi(['同時A', '同時B']);

    const [fromA, fromB] = await Promise.all([
      getCharacterAlts(env, '同時A'),
      getCharacterAlts(env, '同時B'),
    ]);
    expect(new Set(['同時A', ...altNames(fromA)])).toEqual(new Set(['同時A', '同時B', '同時C']));
    expect(new Set(['同時B', ...altNames(fromB)])).toEqual(new Set(['同時A', '同時B', '同時C']));
    const groups = local.sqlite.prepare(`SELECT COUNT(DISTINCT account_group_id) AS count
      FROM characters WHERE character_name IN ('同時A','同時B','同時C')`).get();
    expect(groups?.count).toBe(1);
  });

  it('atomically converges concurrent requests with different overlapping groups without orphans', async () => {
    for (const name of ['重疊A', '重疊B', '重疊C', '重疊D']) await seedCharacter(name);
    await seedSignal('重疊A', 'left-only');
    await seedSignal('重疊B', 'left-only');
    await seedSignal('重疊C', 'right-only');
    await seedSignal('重疊D', 'right-only');
    await seedGroup(['重疊A', '重疊B']);
    await seedGroup(['重疊C', '重疊D']);
    installNamedSignalApi(['重疊A', '重疊C']);

    await Promise.all([
      getCharacterAlts(env, '重疊A'),
      getCharacterAlts(env, '重疊C'),
    ]);
    const referencedGroups = local.sqlite.prepare(`SELECT COUNT(DISTINCT c.account_group_id) AS count
      FROM characters c WHERE c.character_name IN ('重疊A','重疊B','重疊C','重疊D')`).get();
    const mismatches = local.sqlite.prepare(`SELECT COUNT(*) AS count
      FROM account_group_signals s JOIN characters c ON c.ocid=s.ocid
      WHERE c.character_name IN ('重疊A','重疊B','重疊C','重疊D')
        AND s.account_group_id IS NOT c.account_group_id`).get();
    const orphans = local.sqlite.prepare(`SELECT COUNT(*) AS count FROM account_groups g
      LEFT JOIN characters c ON c.account_group_id=g.id
      LEFT JOIN account_group_signals s ON s.account_group_id=g.id
      WHERE c.ocid IS NULL AND s.id IS NULL`).get();
    expect(referencedGroups?.count).toBe(1);
    expect(mismatches?.count).toBe(0);
    expect(orphans?.count).toBe(0);
  });

  it('uses existing signals even when some related queue rows are pending', async () => {
    for (const name of ['待處理A', '待處理B', '待處理C']) await seedCharacter(name);
    for (const name of ['待處理A', '待處理B', '待處理C']) await seedSignal(name, 'pending-edge');
    await env.DB.prepare(`UPDATE account_signal_sync SET status='pending' WHERE ocid='ocid-待處理C'`).run();
    installNamedSignalApi(['待處理A', '待處理B']);

    const result = await getCharacterAlts(env, '待處理A');
    expect(altNames(result)).toEqual(['待處理B', '待處理C']);
  });

  it('rejects an anomalously large fingerprint component before any group mutation', async () => {
    const names = Array.from({ length: 81 }, (_, index) => `異常圖${index + 1}`);
    for (const name of names) {
      await seedCharacter(name);
      await seedSignal(name, 'oversized-component');
    }
    installNamedSignalApi([names[0], names[1]]);

    await expect(getCharacterAlts(env, names[0])).rejects.toThrow(/exceeds safety limit \(81\)/);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM characters
      WHERE character_name LIKE '異常圖%' AND account_group_id IS NOT NULL`).get()?.count).toBe(0);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM account_group_merge_events
      WHERE trigger_character='異常圖1' AND status='failed'`).get()?.count).toBe(1);
  });

  it('atomically merges two existing groups and appends an immutable audit event', async () => {
    for (const name of ['群組A', '群組B', '群組C', '群組D']) await seedCharacter(name);
    for (const name of ['群組A', '群組B']) await seedSignal(name, 'merge-edge');
    await seedSignal('群組C', 'group-c');
    await seedSignal('群組D', 'group-d');
    const firstGroup = await seedGroup(['群組A', '群組C']);
    const secondGroup = await seedGroup(['群組B', '群組D']);
    installNamedSignalApi(['群組A', '群組B']);

    const result = await getCharacterAlts(env, '群組A');
    expect(altNames(result)).toEqual(['群組B', '群組C', '群組D']);
    const event = local.sqlite.prepare(`SELECT * FROM account_group_merge_events
      WHERE status='success' ORDER BY id DESC LIMIT 1`).get() as Record<string, unknown>;
    expect(event.target_group_id).toBe(Math.min(firstGroup, secondGroup));
    expect(JSON.parse(String(event.merged_group_ids_json))).toContain(Math.max(firstGroup, secondGroup));
    expect(event.trigger_source).toBe('interactive_search');
    expect(() => local.sqlite.exec(`UPDATE account_group_merge_events SET reason='changed'`))
      .toThrow(/append-only/);
  });

  it('rolls back every required mutation when a merge batch fails and records only failure audit', async () => {
    for (const name of ['失敗A', '失敗B']) await seedCharacter(name);
    await seedSignal('失敗A', 'failure-edge');
    await seedSignal('失敗B', 'failure-edge');
    const firstGroup = await seedGroup(['失敗A']);
    const secondGroup = await seedGroup(['失敗B']);
    local.sqlite.exec(`CREATE TRIGGER force_account_merge_failure
      BEFORE UPDATE OF account_group_id ON characters
      WHEN NEW.character_name='失敗B'
      BEGIN SELECT RAISE(ABORT, 'forced merge failure'); END;`);
    installNamedSignalApi(['失敗A', '失敗B']);

    await expect(getCharacterAlts(env, '失敗A')).rejects.toThrow(/forced merge failure/);
    const rows = local.sqlite.prepare(`SELECT character_name, account_group_id FROM characters
      WHERE character_name IN ('失敗A','失敗B') ORDER BY character_name`).all() as Array<{
        character_name: string; account_group_id: number;
      }>;
    expect(rows.map((row) => row.account_group_id)).toEqual([firstGroup, secondGroup]);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM account_group_merge_events
      WHERE trigger_character='失敗A' AND status='success'`).get()?.count).toBe(0);
    expect(local.sqlite.prepare(`SELECT COUNT(*) AS count FROM account_group_merge_events
      WHERE trigger_character='失敗A' AND status='failed'`).get()?.count).toBe(1);
  });

  it('returns 12 alts for the 神之小K／光之宅男小K convergence fixture before the second search', async () => {
    const grouped = ['神之小K', '光之宅男小K', ...Array.from({ length: 8 }, (_, index) => `既有分身${index + 1}`)];
    for (const name of grouped) await seedCharacter(name);
    await seedSignal('神之小K', 'k-first-edge');
    await seedSignal('光之宅男小K', 'k-first-edge');
    await seedSignal('光之宅男小K', 'k-large-edge');
    for (const name of grouped.slice(2)) await seedSignal(name, 'k-large-edge');
    installNamedSignalApi(['神之小K', '冠軍分身1', '冠軍分身2', '冠軍分身3']);

    const first = await getCharacterAlts(env, '神之小K');
    expect(first.alts).toHaveLength(12);
    const second = await getCharacterAlts(env, '光之宅男小K');
    expect(second.alts).toHaveLength(12);
    expect(new Set(['神之小K', ...altNames(first)]))
      .toEqual(new Set(['光之宅男小K', ...altNames(second)]));
  });

  it('marks external signal failures as partial instead of architectural incompleteness', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    installNamedSignalApi(['主角色', '分身角色'], { 'union-champion': 500 });
    const result = await getCharacterAlts(env, '主角色');
    expect(result.resolution.status).toBe('partial');
    expect(result.resolution.partialReasons).toEqual([
      expect.objectContaining({ signalType: 'union_champion_roster', retryable: true }),
    ]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"event":"account_alts_resolved"'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"returnedAlts"'));
  });
});
