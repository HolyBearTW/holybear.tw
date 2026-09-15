import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestD1, createTestR2 } from './sqlite-d1';
import { syncCharacterAccountSignals } from '../../functions/_shared/account-group-repository';
import { backfillAccountSignalBatch } from '../../functions/_shared/account-signal-backfill';
import { characterSourceObjectKey, evidenceObjectKey, readEvidencePayload, writeEvidencePayload } from '../../functions/_shared/evidence-storage';
import { upsertCanonicalNexonCharacter, upsertCanonicalNexonCharacterWithStorage, findCharacterByOcid } from '../../functions/_shared/character-repository';
import type { Env } from '../../functions/_shared/env';

const identity = {
  ocid: 'ocid-evidence',
  signalType: 'union_raider_full',
  fingerprintVersion: 1,
  unionFingerprint: 'a'.repeat(64),
};
const payload = JSON.stringify({ union: { level: 8000 }, presets: [] });

let local: ReturnType<typeof createTestD1>;
let evidence: ReturnType<typeof createTestR2>;
let env: Env;

const character = {
  ocid: identity.ocid,
  characterName: '證據角色',
  worldName: '艾麗亞',
  jobName: '主教',
  level: 290,
  combatPower: 1_000_000,
  characterImage: 'image',
  guildName: '公會',
  observedAt: '2026-09-07T00:00:00.000Z',
  requestedAt: '2026-09-07T00:00:00.000Z',
  nexonUpdatedAt: null,
};

beforeEach(async () => {
  local = createTestD1();
  evidence = createTestR2();
  env = {
    DB: local.db,
    SURVEY_DB: local.db,
    EVIDENCE_ARCHIVE: evidence.bucket,
    NEXON_API_KEY: 'test-only',
    NEXON_RETRY_LIMIT: '1',
    NEXON_REQUEST_DELAY_MS: '0',
  };
  await upsertCanonicalNexonCharacter(env.DB, character, [{ source: 'nexon' }]);
});

afterEach(() => {
  local.sqlite.close();
  vi.unstubAllGlobals();
});

describe('R2 evidence storage', () => {
  it('uses a stable natural-identity key and supports R2 reads', async () => {
    const key = await evidenceObjectKey(identity);
    expect(key).toMatch(/^account-signals\/v1\/[0-9a-f]{64}\.json$/);
    expect(await evidenceObjectKey({ ...identity, unionFingerprint: identity.unionFingerprint })).toBe(key);
    await writeEvidencePayload(env, identity, payload);
    expect(evidence.objects.get(key)).toBe(payload);
    expect(await readEvidencePayload(env, identity)).toBe(payload);
  });

  it('propagates R2 failures without a DB1 fallback', async () => {
    const failingBucket = {
      put: vi.fn(async () => { throw new Error('R2 unavailable'); }),
      get: vi.fn(async () => null),
    } as unknown as R2Bucket;
    await expect(writeEvidencePayload({ EVIDENCE_ARCHIVE: failingBucket }, identity, payload))
      .rejects.toThrow('R2 unavailable');
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM account_group_signals').get()?.count).toBe(0);
  });

  it('leaves a queue item retryable when the R2 write fails', async () => {
    env.NEXON_RETRY_LIMIT = '3';
    const failingBucket = {
      put: vi.fn(async () => { throw new Error('R2 unavailable'); }),
      get: vi.fn(async () => null),
    } as unknown as R2Bucket;
    env.EVIDENCE_ARCHIVE = failingBucket;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      if (path.endsWith('/user/union')) return Response.json({ union_level: 8000, union_grade: 'Grand Master' });
      if (path.endsWith('/user/union-raider')) return Response.json({
        use_preset_no: 1,
        union_block: Array.from({ length: 8 }, (_, index) => ({
          block_type: `type-${index}`, block_class: `class-${index}`, block_level: 250,
          block_control_point: { x: index, y: index },
          block_position: [{ x: index, y: index }],
        })),
      });
      throw new Error(`Unexpected endpoint ${path}`);
    }));
    const result = await backfillAccountSignalBatch(env);
    expect(result).toMatchObject({ processed: 1, completed: 0, retry: 1, failed: 0 });
    expect(local.sqlite.prepare(`SELECT status FROM account_signal_sync
      WHERE ocid = ?1 AND signal_type = 'union_raider_full'`).get(identity.ocid)?.status).toBe('retry');
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM account_group_signals').get()?.count).toBe(0);
  });

  it('writes a new signal body to R2 and leaves its D1 body null', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      if (path.endsWith('/user/union')) return Response.json({ union_level: 8000, union_grade: 'Grand Master' });
      if (path.endsWith('/user/union-raider')) return Response.json({
        use_preset_no: 1,
        union_block: Array.from({ length: 8 }, (_, index) => ({
          block_type: `type-${index}`, block_class: `class-${index}`, block_level: 250,
          block_control_point: { x: index, y: index },
          block_position: [{ x: index, y: index }],
        })),
      });
      throw new Error(`Unexpected endpoint ${path}`);
    }));
    const stored = await syncCharacterAccountSignals(
      env,
      (await findCharacterByOcid(env.DB, identity.ocid))!,
      ['union_raider_full'],
    );
    expect(stored.signalCount).toBe(1);
    expect(local.sqlite.prepare(`SELECT evidence_json FROM account_group_signals
      WHERE ocid = ?1 AND signal_type = 'union_raider_full'`).get(identity.ocid)?.evidence_json).toBeNull();
    expect(evidence.objects.size).toBe(1);
  });

  it('preserves a legacy D1 body on an existing-row upsert', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      if (path.endsWith('/user/union')) return Response.json({ union_level: 8000, union_grade: 'Grand Master' });
      if (path.endsWith('/user/union-raider')) return Response.json({
        use_preset_no: 1,
        union_block: Array.from({ length: 8 }, (_, index) => ({
          block_type: `type-${index}`, block_class: `class-${index}`, block_level: 250,
          block_control_point: { x: index, y: index },
          block_position: [{ x: index, y: index }],
        })),
      });
      throw new Error(`Unexpected endpoint ${path}`);
    }));
    const row = (await findCharacterByOcid(env.DB, identity.ocid))!;
    await syncCharacterAccountSignals(env, row, ['union_raider_full']);
    await env.DB.prepare(`UPDATE account_group_signals SET evidence_json = '{"legacy":true}'
      WHERE ocid = ?1 AND signal_type = 'union_raider_full'`).bind(identity.ocid).run();
    await syncCharacterAccountSignals(env, (await findCharacterByOcid(env.DB, identity.ocid))!, ['union_raider_full']);
    expect(local.sqlite.prepare(`SELECT evidence_json FROM account_group_signals
      WHERE ocid = ?1 AND signal_type = 'union_raider_full'`).get(identity.ocid)?.evidence_json)
      .toBe('{"legacy":true}');
  });

  it('reuses the same key for retry and does not create duplicate objects', async () => {
    const key = await writeEvidencePayload(env, identity, payload);
    const retryKey = await writeEvidencePayload(env, identity, payload);
    expect(retryKey).toBe(key);
    expect(evidence.objects.size).toBe(1);
    expect(evidence.objects.get(key)).toBe(payload);
  });

  it('retries a D1 failure with the same R2 key and one object', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      if (path.endsWith('/user/union')) return Response.json({ union_level: 8000, union_grade: 'Grand Master' });
      if (path.endsWith('/user/union-raider')) return Response.json({
        use_preset_no: 1,
        union_block: Array.from({ length: 8 }, (_, index) => ({
          block_type: `type-${index}`, block_class: `class-${index}`, block_level: 250,
          block_control_point: { x: index, y: index },
          block_position: [{ x: index, y: index }],
        })),
      });
      throw new Error(`Unexpected endpoint ${path}`);
    }));
    const originalDb = env.DB;
    let failOnce = true;
    env.DB = {
      prepare: (sql: string) => originalDb.prepare(sql),
      batch: async (statements: D1PreparedStatement[]) => {
        if (failOnce) {
          failOnce = false;
          throw new Error('D1 unavailable');
        }
        return originalDb.batch(statements);
      },
    } as unknown as D1Database;
    await expect(syncCharacterAccountSignals(env, (await findCharacterByOcid(env.DB, identity.ocid))!, ['union_raider_full']))
      .rejects.toThrow('D1 unavailable');
    env.DB = originalDb;
    await syncCharacterAccountSignals(env, (await findCharacterByOcid(env.DB, identity.ocid))!, ['union_raider_full']);
    expect(evidence.objects.size).toBe(1);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM account_group_signals').get()?.count).toBe(1);
  });

  it('reads a legacy D1 body without requiring an R2 binding', async () => {
    await expect(readEvidencePayload({}, { ...identity, evidenceJson: '{"legacy":true}' })).resolves.toBe('{"legacy":true}');
  });
});

describe('R2 character source storage', () => {
  it('publishes source JSON before D1 and stores only a locator for new writes', async () => {
    const sourcePayload = '{"worldName":"艾麗亞","guildName":"公會","members":[2,1]}';
    const stored = await upsertCanonicalNexonCharacterWithStorage(env, character, [
      { source: 'nexon' },
      { source: 'nexon_guild', sourceCharacterId: 'guild-1', rawJson: sourcePayload },
    ]);
    const row = local.sqlite.prepare(`SELECT raw_json, raw_object_key, raw_sha256, raw_size, raw_stored_at
      FROM character_sources WHERE ocid = ?1 AND source = 'nexon_guild'`).get(identity.ocid);
    expect(row?.raw_json).toBeNull();
    expect(row?.raw_object_key).toMatch(/^character-sources\/v1\//);
    expect(row?.raw_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Number(row?.raw_size)).toBeGreaterThan(0);
    expect(row?.raw_stored_at).toBeTruthy();
    expect(evidence.objects.has(row?.raw_object_key as string)).toBe(true);
    expect(stored.character.ocid).toBe(identity.ocid);
    await expect(characterSourceObjectKey({ ocid: identity.ocid, source: 'nexon_guild' }, row?.raw_sha256 as string))
      .resolves.toBe(row?.raw_object_key);
  });

  it('does not publish a false-success D1 row when the R2 put fails', async () => {
    const failingBucket = { put: vi.fn(async () => { throw new Error('R2 unavailable'); }) } as unknown as R2Bucket;
    const isolated = createTestD1();
    const failingEnv = { ...env, DB: isolated.db, EVIDENCE_ARCHIVE: failingBucket };
    await expect(upsertCanonicalNexonCharacterWithStorage(failingEnv, character, [
      { source: 'nexon' },
      { source: 'nexon_guild', rawJson: '{"guild":"失敗"}' },
    ])).rejects.toThrow('R2 unavailable');
    expect(isolated.sqlite.prepare('SELECT COUNT(*) AS count FROM characters').get()?.count).toBe(0);
    isolated.sqlite.close();
  });
});
