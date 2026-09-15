import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestD1, createTestR2 } from './sqlite-d1';
import { archiveMergeEvent, getRetentionGuardrails, mergeEventObjectKey, runRetention } from '../../functions/_shared/retention';
import { getRuntimeConfig } from '../../functions/_shared/runtime-config';
import { onRequestGet as getRetentionStatus } from '../../functions/api/admin/retention/status';
import type { Env } from '../../functions/_shared/env';

let local: ReturnType<typeof createTestD1>;
let env: Env;

const now = '2026-09-15T00:00:00.000Z';
const old = '2026-01-01T00:00:00.000Z';
const recent = '2026-09-10T00:00:00.000Z';

const seed = () => {
  local.sqlite.exec(`
    INSERT INTO import_jobs (id, source, status, started_at, updated_at, completed_at)
      VALUES (1, 'manual_seed', 'completed', '${old}', '${old}', '${old}'),
             (2, 'manual_seed', 'paused', '${old}', '${old}', NULL),
             (3, 'manual_seed', 'running', '${old}', '${recent}', NULL),
             (4, 'nexon_guild', 'completed', '${old}', '${old}', '${old}');
    UPDATE import_jobs SET lease_token = 'active-lease', lease_until = '2026-09-16T00:00:00.000Z' WHERE id = 4;
    INSERT INTO character_import_staging
      (id, import_job_id, source, source_id, character_name, normalized_name, status, updated_at)
      VALUES (1, 1, 'manual_seed', 'old-resolved', '舊', '舊', 'resolved', '${old}'),
             (2, 1, 'manual_seed', 'new-resolved', '新', '新', 'resolved', '${recent}'),
             (3, 2, 'manual_seed', 'paused-resolved', '停', '停', 'resolved', '${old}'),
             (4, 3, 'manual_seed', 'active-retry', '重', '重', 'retry', '${old}'),
             (5, 4, 'nexon_guild', 'leased-resolved', '鎖', '鎖', 'resolved', '${old}');
    INSERT INTO import_job_errors (id, import_job_id, source, error_message, created_at)
      VALUES (1, 1, 'manual_seed', 'old terminal', '${old}'),
             (2, 1, 'manual_seed', 'recent terminal', '${recent}'),
             (3, 2, 'manual_seed', 'paused', '${old}'),
             (4, 3, 'manual_seed', 'active', '${old}'),
             (5, 4, 'nexon_guild', 'leased', '${old}');
    INSERT INTO guild_import_candidates
      (id, import_job_id, world_name, guild_name, status, observed_at)
      VALUES (1, 1, '艾麗亞', '舊公會', 'completed', '${old}'),
             (2, 1, '艾麗亞', '新公會', 'completed', '${recent}'),
             (3, 2, '艾麗亞', '停公會', 'completed', '${old}'),
             (4, 3, '艾麗亞', '重試公會', 'retry', '${old}'),
             (5, 4, '艾麗亞', '鎖公會', 'completed', '${old}');
  `);
};

beforeEach(() => {
  local = createTestD1();
  const r2 = createTestR2();
  env = { DB: local.db, SURVEY_DB: local.db, EVIDENCE_ARCHIVE: r2.bucket };
  seed();
});

afterEach(() => local.sqlite.close());

describe('DB2 retention dry-run and guardrails', () => {
  it('protects active/paused rows and reports only terminal expired rows as eligible', async () => {
    const result = await runRetention(env, { dryRun: true, now });
    expect(result.rowsDeleted).toEqual({
      character_import_staging: 0,
      import_job_errors: 0,
      guild_import_candidates: 0,
      account_group_merge_events: 0,
    });
    expect(result.categories.character_import_staging).toMatchObject({ eligible: 1, skippedPaused: 1 });
    expect(result.categories.import_job_errors).toMatchObject({ eligible: 1, skippedActive: 2, skippedPaused: 1 });
    expect(result.categories.guild_import_candidates).toMatchObject({ eligible: 1, skippedPaused: 1 });
    expect(result.cutoff.staging).toBe('2026-08-16T00:00:00.000Z');
    expect(result.cutoff.importJobErrors).toBe('2026-06-17T00:00:00.000Z');
    expect(result.categories.character_import_staging).toMatchObject({
      oldestEligibleAt: old, oldestEligibleAgeSeconds: 22_204_800, newlyEligibleRows: 0,
    });
    expect(result.categories.character_import_staging.skippedActive).toBeGreaterThanOrEqual(2);
    expect(result.categories.import_job_errors.skippedActive).toBeGreaterThanOrEqual(2);
    expect(result.categories.guild_import_candidates.skippedActive).toBeGreaterThanOrEqual(2);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM character_import_staging').get()?.count).toBe(5);
  });

  it('deletes in bounded batches and is repeat-safe', async () => {
    const result = await runRetention(env, {
      dryRun: false, now, batchSize: 1, maxBatches: 2, maxRowsDeleted: 2, maxRuntimeMs: 5_000,
    });
    const deleted = Object.values(result.rowsDeleted).reduce((sum, value) => sum + value, 0);
    expect(deleted).toBeLessThanOrEqual(2);
    expect(result.limits).toMatchObject({ batchSize: 1, maxBatches: 2, maxRowsDeleted: 2 });
    const second = await runRetention(env, { dryRun: true, now });
    expect(second.categories.character_import_staging.eligible).toBeLessThanOrEqual(1);
    expect(second.categories.import_job_errors.eligible).toBeLessThanOrEqual(1);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM character_import_staging WHERE id = 5').get()?.count).toBe(1);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM import_job_errors WHERE id = 5').get()?.count).toBe(1);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM guild_import_candidates WHERE id = 5').get()?.count).toBe(1);
  });

  it('does not duplicate cleanup work when cron and fallback overlap', async () => {
    const [first, second] = await Promise.all([
      runRetention(env, { dryRun: false, now, batchSize: 500, maxBatches: 4, maxRowsDeleted: 10 }),
      runRetention(env, { dryRun: false, now, batchSize: 500, maxBatches: 4, maxRowsDeleted: 10 }),
    ]);
    const deleted = (result: Awaited<ReturnType<typeof runRetention>>) => Object.values(result.rowsDeleted)
      .reduce((sum, value) => sum + value, 0);
    expect(deleted(first) + deleted(second)).toBe(3);
    expect([first, second].filter((result) => result.errors.some((error) => error.message.includes('lease busy')))).toHaveLength(1);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM character_import_staging WHERE id = 5').get()?.count).toBe(1);
  });

  it('keeps retention disabled for missing and string false flags and protects admin status', async () => {
    expect(getRuntimeConfig(env).retentionEnabled).toBe(false);
    expect(getRuntimeConfig({ ...env, RETENTION_ENABLED: false as unknown as string }).retentionEnabled).toBe(false);
    expect(getRuntimeConfig({ ...env, RETENTION_ENABLED: 'false' }).retentionEnabled).toBe(false);
    expect(getRuntimeConfig({ ...env, RETENTION_ENABLED: 'true' }).retentionEnabled).toBe(true);
    const context = { env: { ...env, IMPORT_ADMIN_SECRET: 'admin-secret' } } as any;
    const unauthorized = await getRetentionStatus({ ...context, request: new Request('https://example.test/api/admin/retention/status') });
    expect(unauthorized.status).toBe(401);
    const authorized = await getRetentionStatus({
      ...context,
      request: new Request('https://example.test/api/admin/retention/status', {
        headers: { authorization: 'Bearer admin-secret' },
      }),
    });
    expect(authorized.status).toBe(200);
  });

  it('exposes bounded growth guardrails without reading JSON bodies', async () => {
    const guardrails = await getRetentionGuardrails(local.db);
    expect(guardrails).toMatchObject({
      characterSourcesRawJson: 0,
      accountGroupSignalsEvidenceJson: 0,
      importJobErrors: 5,
      stagingByStatus: { resolved: 4, retry: 1 },
      guildCandidatesByStatus: { completed: 4, retry: 1 },
    });
  });

  it('provides an idempotent, deterministic merge-event archive primitive without enabling deletion', async () => {
    const r2 = createTestR2();
    const row = { id: 42, timestamp: '2026-01-02T03:04:05.000Z', status: 'success' };
    const key = await archiveMergeEvent({ EVIDENCE_ARCHIVE: r2.bucket }, row);
    expect(key).toBe('account-group-merge-events/v1/2026/01/42.json');
    expect(key).toBe(mergeEventObjectKey(row));
    expect(r2.objects.get(key)).toContain('"id":42');
  });

  it('archives and deletes only verified old merge events within the shared budget', async () => {
    local.sqlite.exec(`
      INSERT INTO account_group_merge_events
        (id, timestamp, trigger_ocid, trigger_character, signal_type, fingerprint,
         source_group_id, target_group_id, merged_group_ids_json, merged_ocids_json,
         trigger_source, status, reason)
      VALUES (101, '${old}', 'ocid-101', '角色', 'same_fingerprint', 'fp-101',
        1, 2, '[]', '[]', 'test', 'success', 'verified'),
        (102, '${recent}', 'ocid-102', '角色', 'same_fingerprint', 'fp-102',
        1, 2, '[]', '[]', 'test', 'success', 'recent');
    `);
    const result = await runRetention(env, {
      dryRun: false, now, batchSize: 10, maxBatches: 4, maxRowsDeleted: 10, maxRuntimeMs: 5_000,
    });
    expect(result.errors).toEqual([]);
    expect(result.categories.account_group_merge_events).toMatchObject({
      eligible: 1, archived: 1, archiveFailures: 0, deleted: 1,
    });
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM account_group_merge_events WHERE id = 101').get()?.count).toBe(0);
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM account_group_merge_events WHERE id = 102').get()?.count).toBe(1);
  });

  it('keeps the D1 row when R2 archival or verification fails', async () => {
    local.sqlite.exec(`
      INSERT INTO account_group_merge_events
        (id, timestamp, trigger_ocid, trigger_character, signal_type, fingerprint,
         source_group_id, target_group_id, merged_group_ids_json, merged_ocids_json,
         trigger_source, status, reason)
      VALUES (201, '${old}', 'ocid-201', '角色', 'same_fingerprint', 'fp-201',
        1, 2, '[]', '[]', 'test', 'success', 'verified');
    `);
    const failingArchive = {
      put: async () => { throw new Error('R2 unavailable'); },
      get: async () => null,
    } as unknown as R2Bucket;
    const result = await runRetention({ DB: local.db, EVIDENCE_ARCHIVE: failingArchive }, {
      dryRun: false, now, batchSize: 10, maxBatches: 4, maxRowsDeleted: 10, maxRuntimeMs: 5_000,
    });
    expect(result.categories.account_group_merge_events).toMatchObject({ archived: 0, archiveFailures: 1, deleted: 0 });
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM account_group_merge_events WHERE id = 201').get()?.count).toBe(1);
  });

  it('does not PUT or DELETE merge events during dry-run', async () => {
    local.sqlite.exec(`
      INSERT INTO account_group_merge_events
        (id, timestamp, trigger_ocid, trigger_character, signal_type, fingerprint,
         source_group_id, target_group_id, merged_group_ids_json, merged_ocids_json,
         trigger_source, status, reason)
      VALUES (301, '${old}', 'ocid-301', '角色', 'same_fingerprint', 'fp-301',
        1, 2, '[]', '[]', 'test', 'success', 'verified');
    `);
    const put = vi.fn(async () => undefined);
    const get = vi.fn(async () => null);
    const dryEnv = { DB: local.db, EVIDENCE_ARCHIVE: { put, get } as unknown as R2Bucket };
    const result = await runRetention(dryEnv, { dryRun: true, now });
    expect(result.categories.account_group_merge_events).toMatchObject({ eligible: 1, archived: 0, deleted: 0 });
    expect(put).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(local.sqlite.prepare('SELECT COUNT(*) AS count FROM account_group_merge_events WHERE id = 301').get()?.count).toBe(1);
  });
});
