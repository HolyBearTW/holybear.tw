import type { CharacterRow } from './models';

const normalizeJob = (value: string) => value.replace(/[（）(),、\s]/g, '');

interface JobCountRow {
  job_name: string;
  source_count: number;
}

interface CandidateRow extends Pick<CharacterRow,
  'ocid' | 'character_name' | 'world_name' | 'job_name' | 'level' | 'combat_power' | 'character_image'> {
  job_rank?: number;
}

export interface RadarCandidate {
  ocid: string;
  characterName: string;
  worldName: string;
  jobName: string;
  level: number;
  combatPower: number;
  characterImage: string;
}

export interface RadarCandidateJobSummary {
  job: string;
  sourceCount: number;
  sampledCount: number;
}

export interface RadarCandidateResponse {
  schemaVersion: 1;
  degraded: false;
  partial: false;
  minimumLevel: number;
  samplesPerJob: number;
  sourceCount: number;
  sampledSourceCount: number;
  jobs: RadarCandidateJobSummary[];
  candidates: RadarCandidate[];
}

const readJobCounts = async (db: D1Database, minimumLevel: number) => (await db.prepare(`
  SELECT job_name, COUNT(*) AS source_count
  FROM characters
  WHERE level >= ?1 AND job_name <> ''
  GROUP BY job_name
  ORDER BY job_name
`).bind(minimumLevel).all<JobCountRow>()).results;

const groupJobCounts = (rows: JobCountRow[]) => {
  const grouped = new Map<string, { rawJobs: string[]; sourceCount: number }>();
  for (const row of rows) {
    const job = normalizeJob(row.job_name);
    if (!job) continue;
    const current = grouped.get(job) || { rawJobs: [], sourceCount: 0 };
    current.rawJobs.push(row.job_name);
    current.sourceCount += Number(row.source_count) || 0;
    grouped.set(job, current);
  }
  return grouped;
};

const targetRanks = (sourceCount: number, limit: number) => {
  if (sourceCount <= limit) return Array.from({ length: sourceCount }, (_, index) => index + 1);
  return Array.from({ length: limit }, (_, index) => (
    1 + Math.round(index * (sourceCount - 1) / (limit - 1))
  ));
};

const candidateColumns = `
  ocid, character_name, world_name, job_name, level, combat_power, character_image
`;

const readJobCandidates = async (
  db: D1Database,
  rawJobs: string[],
  sourceCount: number,
  minimumLevel: number,
  samplesPerJob: number,
) => {
  const jobPlaceholders = rawJobs.map((_, index) => `?${index + 2}`).join(', ');
  if (sourceCount <= samplesPerJob) {
    const result = await db.prepare(`
      SELECT ${candidateColumns}
      FROM characters INDEXED BY idx_characters_job_power
      WHERE level >= ?1 AND job_name IN (${jobPlaceholders})
      ORDER BY combat_power DESC, ocid ASC
    `).bind(minimumLevel, ...rawJobs).all<CandidateRow>();
    return result.results;
  }

  const ranks = targetRanks(sourceCount, samplesPerJob);
  const rankValues = ranks.map((rank) => `(${rank})`).join(', ');
  const result = await db.prepare(`
    WITH ranked AS (
      SELECT ${candidateColumns},
        ROW_NUMBER() OVER (ORDER BY combat_power DESC, ocid ASC) AS job_rank
      FROM characters INDEXED BY idx_characters_job_power
      WHERE level >= ?1 AND job_name IN (${jobPlaceholders})
    ), target_ranks(job_rank) AS (
      VALUES ${rankValues}
    )
    SELECT ${candidateColumns}, ranked.job_rank
    FROM ranked
    INNER JOIN target_ranks USING (job_rank)
    ORDER BY ranked.job_rank
  `).bind(minimumLevel, ...rawJobs).all<CandidateRow>();
  return result.results;
};

const toCandidate = (row: CandidateRow): RadarCandidate => ({
  ocid: row.ocid,
  characterName: row.character_name,
  worldName: row.world_name,
  jobName: row.job_name,
  level: Number(row.level) || 0,
  combatPower: Number(row.combat_power) || 0,
  characterImage: row.character_image,
});

export const getRadarCandidates = async (
  db: D1Database,
  { minimumLevel = 260, samplesPerJob = 500 } = {},
): Promise<RadarCandidateResponse> => {
  const grouped = groupJobCounts(await readJobCounts(db, minimumLevel));

  const sampledGroups: Array<{ job: string; sourceCount: number; rows: CandidateRow[] }> = [];
  const groups = [...grouped];
  const queryConcurrency = 4;
  for (let start = 0; start < groups.length; start += queryConcurrency) {
    sampledGroups.push(...await Promise.all(groups.slice(start, start + queryConcurrency).map(async ([job, group]) => {
      const rows = await readJobCandidates(db, group.rawJobs, group.sourceCount, minimumLevel, samplesPerJob);
      if (rows.length !== Math.min(group.sourceCount, samplesPerJob)) {
        throw new Error(`Radar candidate job ${job} returned an incomplete sample`);
      }
      return { job, sourceCount: group.sourceCount, rows };
    })));
  }

  const verifiedCounts = groupJobCounts(await readJobCounts(db, minimumLevel));
  if (JSON.stringify([...verifiedCounts]) !== JSON.stringify([...grouped])) {
    throw new Error('Radar candidate source changed while it was being sampled');
  }

  sampledGroups.sort((left, right) => {
    const leftTop = left.rows[0];
    const rightTop = right.rows[0];
    const powerOrder = Number(rightTop?.combat_power || 0) - Number(leftTop?.combat_power || 0);
    if (powerOrder) return powerOrder;
    const leftOcid = String(leftTop?.ocid || '');
    const rightOcid = String(rightTop?.ocid || '');
    return leftOcid < rightOcid ? -1 : leftOcid > rightOcid ? 1 : 0;
  });

  const jobs = sampledGroups.map(({ job, sourceCount, rows }) => ({
    job,
    sourceCount,
    sampledCount: rows.length,
  }));
  const candidates = sampledGroups.flatMap(({ rows }) => rows.map(toCandidate));
  return {
    schemaVersion: 1,
    degraded: false,
    partial: false,
    minimumLevel,
    samplesPerJob,
    sourceCount: jobs.reduce((sum, job) => sum + job.sourceCount, 0),
    sampledSourceCount: candidates.length,
    jobs,
    candidates,
  };
};
