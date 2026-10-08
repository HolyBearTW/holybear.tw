import type { AppPagesFunction } from '../../../_shared/env';
import { requireSurveyAdmin } from '../../../_shared/admin-auth';
import { errorResponse, HttpError, json, methodNotAllowed } from '../../../_shared/http';

type ReportFilter = 'all' | 'generated' | 'waiting';
type SyncStatus = 'pending' | 'running' | 'retry' | 'completed' | 'failed';

interface GrowthAdminRow {
  ocid: string;
  character_name: string;
  world_name: string;
  job_name: string;
  character_level: number | null;
  created_at: string;
  history_start_date: string | null;
  last_synced_date: string | null;
  sync_target_date: string;
  sync_status: SyncStatus;
  next_retry_at: string | null;
  latest_snapshot_date: string | null;
  report_updated_at: string | null;
  snapshot_count: number;
}

const profileJoins = `
  FROM growth_profiles p
  LEFT JOIN characters c ON c.ocid = p.ocid
  LEFT JOIN growth_snapshots s ON s.ocid = p.ocid
    AND s.snapshot_date = (SELECT MAX(snapshot_date) FROM growth_snapshots WHERE ocid = p.ocid)
`;
const hasReport = 'EXISTS (SELECT 1 FROM growth_snapshots WHERE ocid = p.ocid)';
const syncStatus = `CASE WHEN p.status IN ('pending', 'retry') AND p.claim_until > ?1
  THEN 'running' ELSE p.status END`;

const integerParam = (value: string | null, fallback: number, min: number, max: number) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new HttpError(400, 'invalid_pagination', '分頁參數格式不正確');
  }
  return parsed;
};

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    // Authenticate before accessing either database. This endpoint never writes
    // tracking data or invokes the NEXON client/scheduler.
    requireSurveyAdmin(request, env);
    const params = new URL(request.url).searchParams;
    const query = (params.get('query') || '').trim();
    const report = (params.get('report') || 'all') as ReportFilter;
    const status = params.get('status') || 'all';
    if (query.length > 100) throw new HttpError(400, 'invalid_query', '搜尋文字最多 100 個字');
    if (!['all', 'generated', 'waiting'].includes(report)
      || !['all', 'pending', 'running', 'retry', 'completed', 'failed'].includes(status)) {
      throw new HttpError(400, 'invalid_filter', '篩選條件格式不正確');
    }
    const limit = integerParam(params.get('limit'), 50, 1, 100);
    const offset = integerParam(params.get('offset'), 0, 0, 10_000_000);
    const checkedAt = new Date().toISOString();
    const values: (string | number)[] = [checkedAt];
    const conditions = ['?1 IS NOT NULL'];
    const bind = (value: string | number) => {
      values.push(value);
      return `?${values.length}`;
    };
    if (query) {
      const pattern = bind(`%${query.replace(/[\\%_]/g, '\\$&')}%`);
      conditions.push(`(p.character_name LIKE ${pattern} ESCAPE '\\'
        OR c.character_name LIKE ${pattern} ESCAPE '\\'
        OR s.character_name LIKE ${pattern} ESCAPE '\\'
        OR p.ocid LIKE ${pattern} ESCAPE '\\')`);
    }
    if (report === 'generated') conditions.push(hasReport);
    if (report === 'waiting') conditions.push(`NOT ${hasReport}`);
    if (status !== 'all') conditions.push(`(${syncStatus}) = ${bind(status)}`);
    const where = `WHERE ${conditions.join(' AND ')}`;
    const limitParam = `?${values.length + 1}`;
    const offsetParam = `?${values.length + 2}`;

    const [summary, matched, page] = await Promise.all([
      env.DB.prepare(`
        SELECT COUNT(*) AS totalProfiles,
          COALESCE(SUM(${hasReport}), 0) AS generatedReports,
          COALESCE(SUM(p.status IN ('pending', 'retry')), 0) AS syncingProfiles,
          COALESCE(SUM(p.status = 'failed'), 0) AS failedProfiles
        FROM growth_profiles p
      `).first<{ totalProfiles: number; generatedReports: number; syncingProfiles: number; failedProfiles: number }>(),
      env.DB.prepare(`SELECT COUNT(*) AS total ${profileJoins} ${where}`)
        .bind(...values).first<{ total: number }>(),
      env.DB.prepare(`
        SELECT p.ocid,
          COALESCE(NULLIF(s.character_name, ''), NULLIF(c.character_name, ''), p.character_name) AS character_name,
          COALESCE(s.world_name, c.world_name, '') AS world_name,
          COALESCE(s.job_name, c.job_name, '') AS job_name,
          COALESCE(s.character_level, c.level) AS character_level,
          p.created_at, p.history_start_date, p.last_synced_date, p.sync_target_date,
          ${syncStatus} AS sync_status, p.next_retry_at,
          s.snapshot_date AS latest_snapshot_date,
          (SELECT MAX(updated_at) FROM growth_snapshots WHERE ocid = p.ocid) AS report_updated_at,
          (SELECT COUNT(*) FROM growth_snapshots WHERE ocid = p.ocid) AS snapshot_count
        ${profileJoins} ${where}
        ORDER BY report_updated_at DESC, p.created_at DESC, p.ocid ASC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `).bind(...values, limit, offset).all<GrowthAdminRow>(),
    ]);
    const total = Number(matched?.total) || 0;
    return json({
      summary: summary || { totalProfiles: 0, generatedReports: 0, syncingProfiles: 0, failedProfiles: 0 },
      query, report, status, total, limit, offset,
      hasMore: offset + page.results.length < total,
      checkedAt,
      reports: page.results.map((row) => ({
        ocid: row.ocid,
        characterName: row.character_name,
        worldName: row.world_name,
        jobName: row.job_name,
        level: row.character_level,
        createdAt: row.created_at,
        historyStartDate: row.history_start_date,
        lastSyncedDate: row.last_synced_date,
        syncTargetDate: row.sync_target_date,
        status: row.sync_status,
        nextRetryAt: row.next_retry_at,
        latestSnapshotDate: row.latest_snapshot_date,
        reportUpdatedAt: row.report_updated_at,
        snapshotCount: row.snapshot_count,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequest = () => methodNotAllowed(['GET']);
