import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet as getGrowthAdmin, onRequest as growthAdminMethod } from '../../functions/api/admin/growth';
import { onRequestGet as getAdminSession, onRequest as adminSessionMethod } from '../../functions/api/admin/session';
import type { Env } from '../../functions/_shared/env';
import { createTestD1 } from './sqlite-d1';

const PASSWORD = 'test-survey-admin-secret';
let local: ReturnType<typeof createTestD1>;
let env: Env;

beforeEach(() => {
  local = createTestD1();
  env = { DB: local.db, SURVEY_ADMIN_SECRET: PASSWORD } as Env;
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => { local.sqlite.close(); vi.unstubAllGlobals(); });

const request = (search = '', password: string | null = PASSWORD) => new Request(`https://example.test/api/admin/growth${search}`, {
  headers: password === null ? {} : { authorization: `Bearer ${password}` },
});
const get = (search = '') => getGrowthAdmin({ env, request: request(search) } as never);
interface AdminData {
  summary: { totalProfiles: number; generatedReports: number; syncingProfiles: number; failedProfiles: number };
  total: number;
  reports: { ocid: string }[];
}
const data = async (search = '') => (await get(search)).json() as Promise<AdminData>;
const addProfile = (id: string, name: string, status = 'completed', claimUntil: string | null = null) => {
  local.sqlite.prepare(`
    INSERT INTO growth_profiles (ocid, character_name, scan_start_date, history_start_date,
      last_synced_date, sync_target_date, status, created_at, updated_at, claim_until, claim_token, last_error)
    VALUES (?, ?, '2026-10-01', '2026-10-01', '2026-10-06', '2026-10-07', ?,
      '2026-10-01T00:00:00.000Z', '2026-10-08T05:00:00.000Z', ?, 'private-claim', 'private-diagnostic')
  `).run(id, name, status, claimUntil);
};
const addSnapshot = (id: string, date: string, updatedAt: string, name = '目前角色名稱') => {
  local.sqlite.prepare(`
    INSERT INTO growth_snapshots (ocid, snapshot_date, source_date, character_name, world_name, job_name,
      character_level, character_exp, character_exp_rate, fetched_at, updated_at)
    VALUES (?, ?, ?, ?, '艾麗亞', '卡蒂娜', 280, 12345, 12.5, ?, ?)
  `).run(id, date, date, name, updatedAt, updatedAt);
};

describe('shared administrator authorization', () => {
  it('validates the existing survey password without querying either database', async () => {
    const prepare = vi.spyOn(local.db, 'prepare');
    const response = await getAdminSession({ env, request: request() } as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(prepare).not.toHaveBeenCalled();
  });

  it.each([null, 'wrong-password'])('rejects password %s before querying any data', async (password) => {
    const prepare = vi.spyOn(local.db, 'prepare');
    for (const handler of [getAdminSession, getGrowthAdmin]) {
      const response = await handler({ env, request: request('', password) } as never);
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect(prepare).not.toHaveBeenCalled();
  });

  it('supports only GET for both new administration endpoints', () => {
    for (const handler of [growthAdminMethod, adminSessionMethod]) {
      const response = handler();
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET');
    }
  });
});

describe('read-only growth report administration', () => {
  it('uses actual snapshot writes as the report update time and prefers the latest historical identity', async () => {
    addProfile('a', '過去角色名稱');
    addSnapshot('a', '2026-10-06', '2026-10-07T01:00:00.000Z');
    addSnapshot('a', '2026-10-07', '2026-10-07T03:00:00.000Z');
    // Repairing an older day is still a report update. Queue claims/profile
    // bookkeeping on Oct 8 must not change the reported content update time.
    local.sqlite.prepare("UPDATE growth_snapshots SET updated_at = '2026-10-07T06:00:00.000Z' WHERE snapshot_date = '2026-10-06'").run();
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json() as AdminData;
    expect(body.reports).toEqual([expect.objectContaining({
      ocid: 'a', characterName: '目前角色名稱', worldName: '艾麗亞', jobName: '卡蒂娜', level: 280,
      reportUpdatedAt: '2026-10-07T06:00:00.000Z', latestSnapshotDate: '2026-10-07',
      lastSyncedDate: '2026-10-06', snapshotCount: 2, status: 'completed',
    })]);
    expect(JSON.stringify(body)).not.toContain('private-claim');
    expect(JSON.stringify(body)).not.toContain('private-diagnostic');
  });

  it('retains generated reports during daily refresh/retry/failure and identifies profiles awaiting their first report', async () => {
    addProfile('a', '每日同步', 'pending'); addSnapshot('a', '2026-10-06', '2026-10-07T01:00:00.000Z');
    addProfile('b', '重試角色', 'retry'); addSnapshot('b', '2026-10-06', '2026-10-07T01:00:00.000Z');
    addProfile('c', '失敗角色', 'failed'); addSnapshot('c', '2026-10-06', '2026-10-07T01:00:00.000Z');
    addProfile('d', '新角色', 'pending');
    const all = await data();
    expect(all.summary).toEqual({ totalProfiles: 4, generatedReports: 3, syncingProfiles: 3, failedProfiles: 1 });
    const generated = await data('?report=generated');
    expect(generated.total).toBe(3);
    const waiting = await data('?report=waiting');
    expect(waiting.total).toBe(1);
    expect(waiting.reports[0]).toMatchObject({ ocid: 'd', characterName: '新角色', reportUpdatedAt: null, latestSnapshotDate: null, snapshotCount: 0 });
    expect(waiting.summary).toEqual(all.summary);
  });

  it('shows a live lease as running while expired leases remain pending', async () => {
    addProfile('a', '執行角色', 'pending', new Date(Date.now() + 60_000).toISOString());
    addProfile('b', '等待角色', 'pending', new Date(Date.now() - 60_000).toISOString());
    addProfile('c', '重試角色', 'retry');
    expect((await data('?status=running')).reports.map((row) => row.ocid)).toEqual(['a']);
    expect((await data('?status=pending')).reports.map((row) => row.ocid)).toEqual(['b']);
    expect((await data('?status=retry')).reports.map((row) => row.ocid)).toEqual(['c']);
  });

  it('combines search, generated-report and status filters and searches literal SQL wildcard characters', async () => {
    addProfile('abcd', '測試角色', 'retry');
    addSnapshot('abcd', '2026-10-06', '2026-10-07T01:00:00.000Z', '百分比%_\\角色');
    addProfile('efgh', '普通角色', 'completed');
    addSnapshot('efgh', '2026-10-06', '2026-10-07T01:00:00.000Z', '普通角色');
    const search = `?query=${encodeURIComponent('%_\\')}&report=generated&status=retry`;
    const result = await data(search);
    expect(result.total).toBe(1);
    expect(result.reports[0].ocid).toBe('abcd');
    expect((await data('?query=ABCD')).total).toBe(1);
    expect((await data('?query=%27%20OR%201%3D1--')).total).toBe(0);
  });

  it('paginates in report-update order and determines the last page from the filtered total', async () => {
    addProfile('a', '舊報告'); addSnapshot('a', '2026-10-06', '2026-10-07T01:00:00.000Z');
    addProfile('b', '新報告'); addSnapshot('b', '2026-10-06', '2026-10-07T02:00:00.000Z');
    addProfile('c', '未生成', 'pending');
    const first = await data('?report=generated&limit=1');
    expect(first).toMatchObject({ total: 2, offset: 0, limit: 1, hasMore: true });
    expect(first.reports[0].ocid).toBe('b');
    const last = await data('?report=generated&limit=1&offset=1');
    expect(last).toMatchObject({ total: 2, offset: 1, limit: 1, hasMore: false });
    expect(last.reports[0].ocid).toBe('a');
  });

  it('returns an empty summary when no reports have been requested', async () => {
    expect(await (await get()).json()).toMatchObject({
      summary: { totalProfiles: 0, generatedReports: 0, syncingProfiles: 0, failedProfiles: 0 },
      total: 0, reports: [], hasMore: false,
    });
  });

  it.each(['?limit=0', '?limit=101', '?limit=1.5', '?offset=-1', '?offset=Infinity', '?report=invalid', '?status=invalid', `?query=${'a'.repeat(101)}`])('rejects invalid parameters %s before querying', async (search) => {
    const prepare = vi.spyOn(local.db, 'prepare');
    expect((await get(search)).status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('does not write either database or make outgoing API requests', async () => {
    addProfile('a', '追蹤角色'); addSnapshot('a', '2026-10-06', '2026-10-07T01:00:00.000Z');
    const before = local.sqlite.prepare('SELECT total_changes() AS changes').get();
    const surveyPrepare = vi.fn(() => { throw new Error('survey database must not be accessed'); });
    env.SURVEY_DB = { prepare: surveyPrepare } as unknown as D1Database;
    expect((await get()).status).toBe(200);
    expect(local.sqlite.prepare('SELECT total_changes() AS changes').get()).toEqual(before);
    expect(surveyPrepare).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
