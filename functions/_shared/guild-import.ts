import type { Env } from './env';
import { HttpError } from './http';
import {
  budgetAfter,
  checkpointSeedPage,
  getImportJob,
  maybeCompleteImportJob,
  resolveStagingBatch,
  type ImportJobRow,
  type ResolutionBatchOptions,
} from './import-repository';
import type { SeedCharacter } from './importers/importer';
import { fetchNexonJson, NexonRequestError, type NexonRequestMetric } from './nexon-client';
import { getRuntimeConfig } from './runtime-config';
import { normalizeCharacterName } from './character-repository';

interface GuildCandidate {
  id: number;
  world_name: string;
  guild_name: string;
  oguild_id: string | null;
  attempt_count: number;
}
interface GuildBasic {
  date?: string | null;
  world_name?: string;
  guild_name?: string;
  guild_member_count?: number;
  guild_member?: string[];
}
interface GuildCandidateRow {
  world_name: string;
  guild_name: string;
}
const nowIso = () => new Date().toISOString();
const checkpointOf = (job: ImportJobRow) => job.checkpoint_json ? JSON.parse(job.checkpoint_json) : {};

export interface GuildEstimate {
  attemptedGuilds: number;
  successfulGuilds: number;
  guildCandidates: number;
  guildApiRequests: number;
  guildApiRequestsExpected: number;
  rosterMemberOccurrences: number;
  uniqueRosterCharacters: number;
  existingCharacters: number;
  newCharacters: number;
  existingCharactersNeedingUpdate: number;
  U: number;
  K: number;
  estimatedCharacterApiRequests: number;
  failedGuilds: number;
  errors: Array<{ worldName: string; guildName: string; message: string }>;
  errorStats: { 429: number; 403: number; timeout: number; '5xx': number; retry: number };
}

export const withGuildImportLock = async <T>(env: Env, jobId: number, task: () => Promise<T>) => {
  const token = crypto.randomUUID();
  const lock = await env.DB.prepare(`UPDATE import_jobs SET lease_token = ?2, lease_until = ?3
    WHERE id = ?1 AND source = 'nexon_guild' AND (lease_until IS NULL OR lease_until <= ?4) RETURNING id`)
    .bind(jobId, token, new Date(Date.now() + 600_000).toISOString(), nowIso()).first();
  if (!lock) throw new HttpError(409, 'guild_import_busy', 'This guild sampling job is already running');
  try { return await task(); }
  finally {
    await env.DB.prepare('UPDATE import_jobs SET lease_token = NULL, lease_until = NULL WHERE id = ?1 AND lease_token = ?2')
      .bind(jobId, token).run();
  }
};

export const initializeGuildCandidates = async (env: Env, job: ImportJobRow, maxGuilds: number) => {
  if (checkpointOf(job).guildCandidatesInitialized) return job;
  if (!Number.isSafeInteger(maxGuilds) || maxGuilds < 1 || maxGuilds > 10_000) {
    throw new HttpError(400, 'invalid_guild_limit', 'maxGuilds must be between 1 and 10000');
  }
  // Only the site's existing character table supplies candidates; no discovery API or crawler.
  const population = await env.DB.prepare('SELECT characters_total AS total FROM database_stats WHERE id = 1').first<{ total: number }>();
  const budget = await budgetAfter(env.DB, job, Number(population?.total) * 2 + 10, maxGuilds * 3 + 2, getRuntimeConfig(env));
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO guild_import_candidates (import_job_id, world_name, guild_name)
      SELECT ?1, world_name, guild_name FROM characters
      WHERE guild_name IS NOT NULL AND guild_name <> '' AND TRIM(guild_name) <> '' AND TRIM(world_name) <> ''
      GROUP BY world_name, guild_name ORDER BY world_name, guild_name LIMIT ?2`)
      .bind(job.id, maxGuilds),
    env.DB.prepare(`UPDATE import_jobs SET status = 'running', checkpoint_json = ?2,
      d1_budget_date = ?3, d1_rows_read_estimate = ?4, d1_rows_written_estimate = ?5, updated_at = ?6 WHERE id = ?1`)
      .bind(job.id, JSON.stringify({ guildCandidatesInitialized: true, maxGuilds, stageComplete: false }),
        budget.date, budget.rowsRead, budget.rowsWritten, nowIso()),
  ]);
  return (await getImportJob(env.DB, job.id))!;
};

export const guildMembersToSeeds = (candidate: GuildCandidate, basic: GuildBasic, observedAt: string): SeedCharacter[] => {
  if (basic.world_name !== candidate.world_name || basic.guild_name !== candidate.guild_name
    || !Array.isArray(basic.guild_member) || !Number.isSafeInteger(basic.guild_member_count)
    || basic.guild_member_count !== basic.guild_member.length
    || basic.guild_member.some((name) => typeof name !== 'string' || !name.trim())
    || (basic.date != null && !Number.isFinite(Date.parse(basic.date)))) {
    throw new NexonRequestError('Official guild roster is incomplete or has a mismatched identity', null, true, 'invalid_guild_roster');
  }
  return [...new Set(basic.guild_member.map((name) => name.trim().normalize('NFC')))].map((characterName) => ({
    // Guild membership can change; a character has a stable candidate key across guilds in a world.
    sourceId: JSON.stringify([candidate.world_name, characterName]),
    characterName,
    worldName: candidate.world_name,
    jobName: '', level: 0, combatPower: 0, characterImage: '', // Staging only; never canonical data.
    sourceUpdatedAt: basic.date == null ? null : new Date(basic.date).toISOString(),
    observedAt,
    sourceMetadataJson: JSON.stringify({ oguildId: candidate.oguild_id, worldName: candidate.world_name,
      guildName: candidate.guild_name, rosterObservedAt: observedAt }),
  }));
};

const readKnownGuildCandidates = async (env: Env, maxGuilds?: number) => {
  if (maxGuilds !== undefined && (!Number.isSafeInteger(maxGuilds) || maxGuilds < 1 || maxGuilds > 10_000)) {
    throw new HttpError(400, 'invalid_guild_limit', 'maxGuilds must be between 1 and 10000');
  }
  const query = `SELECT world_name, guild_name FROM characters
    WHERE guild_name IS NOT NULL AND TRIM(guild_name) <> '' AND TRIM(world_name) <> ''
    GROUP BY world_name, guild_name ORDER BY world_name, guild_name${maxGuilds === undefined ? '' : ' LIMIT ?1'}`;
  const result = maxGuilds === undefined
    ? await env.DB.prepare(query).all<GuildCandidateRow>()
    : await env.DB.prepare(query).bind(maxGuilds).all<GuildCandidateRow>();
  return result.results.map((row, index) => ({ id: index + 1, world_name: row.world_name, guild_name: row.guild_name,
    oguild_id: null, attempt_count: 0 }));
};

const findExistingGuildMembers = async (env: Env, keys: Array<{ worldName: string; normalizedName: string }>) => {
  const existing = new Set<string>();
  const byWorld = new Map<string, string[]>();
  for (const key of keys) {
    const values = byWorld.get(key.worldName) ?? [];
    values.push(key.normalizedName);
    byWorld.set(key.worldName, values);
  }
  for (const [worldName, names] of byWorld) {
    for (let offset = 0; offset < names.length; offset += 90) {
      const chunk = [...new Set(names.slice(offset, offset + 90))];
      const rows = await env.DB.prepare(`SELECT world_name, normalized_name FROM characters
        WHERE world_name = ?1 AND normalized_name IN (${chunk.map((_, index) => `?${index + 2}`).join(', ')})`)
        .bind(worldName, ...chunk).all<{ world_name: string; normalized_name: string }>();
      for (const row of rows.results) existing.add(`${row.world_name}\u0000${row.normalized_name}`);
    }
  }
  return existing;
};

/**
 * Read-only estimate: expands only official guild endpoints, then compares the
 * roster names with characters. It does not create an import job or write D1.
 */
export const estimateGuildSampling = async (env: Env, maxGuilds?: number): Promise<GuildEstimate> => {
  const candidates = await readKnownGuildCandidates(env, maxGuilds);
  const unique = new Map<string, { worldName: string; normalizedName: string }>();
  let rosterMemberOccurrences = 0;
  let guildApiRequests = 0;
  let failedGuilds = 0;
  let attemptedGuilds = 0;
  const errors: GuildEstimate['errors'] = [];
  const errorStats: GuildEstimate['errorStats'] = { 429: 0, 403: 0, timeout: 0, '5xx': 0, retry: 0 };
  const recordRequestMetric = (metric: NexonRequestMetric) => {
    if (metric.attempt > 0) errorStats.retry += 1;
    if (metric.status === 429) errorStats[429] += 1;
    else if (metric.status === 403) errorStats[403] += 1;
    else if (metric.status != null && metric.status >= 500) errorStats['5xx'] += 1;
    else if (metric.errorKind === 'timeout') errorStats.timeout += 1;
  };
  for (const candidate of candidates) {
    attemptedGuilds += 1;
    try {
      const params = new URLSearchParams({ guild_name: candidate.guild_name, world_name: candidate.world_name });
      const guildId = await fetchNexonJson<{ oguild_id?: string }>(
        env,
        `/guild/id?${params}`,
        () => { guildApiRequests += 1; },
        recordRequestMetric,
      );
      if (typeof guildId.oguild_id !== 'string' || !guildId.oguild_id.trim()) {
        throw new NexonRequestError('NEXON did not return a guild ID', null, false, 'missing_guild_id');
      }
      const basic = await fetchNexonJson<GuildBasic>(
        env,
        `/guild/basic?oguild_id=${encodeURIComponent(guildId.oguild_id)}`,
        () => { guildApiRequests += 1; },
        recordRequestMetric,
      );
      const members = guildMembersToSeeds(candidate, basic, nowIso());
      rosterMemberOccurrences += Array.isArray(basic.guild_member) ? basic.guild_member.length : 0;
      for (const member of members) unique.set(`${member.worldName}\u0000${normalizeCharacterName(member.characterName)}`, {
        worldName: member.worldName, normalizedName: normalizeCharacterName(member.characterName),
      });
    } catch (error) {
      failedGuilds += 1;
      errors.push({ worldName: candidate.world_name, guildName: candidate.guild_name,
        message: error instanceof Error ? error.message : String(error) });
      const status = error instanceof NexonRequestError ? error.status : null;
      // A 403 is an account/key-level failure. Stop safely instead of
      // hammering every remaining guild with a known-invalid credential.
      if (status === 401 || status === 403) break;
    }
  }
  const existing = await findExistingGuildMembers(env, [...unique.values()]);
  const existingCharacters = [...unique.keys()].filter((key) => existing.has(key)).length;
  const newCharacters = unique.size - existingCharacters;
  return {
    attemptedGuilds,
    successfulGuilds: attemptedGuilds - failedGuilds,
    guildCandidates: candidates.length,
    guildApiRequests,
    guildApiRequestsExpected: candidates.length * 2,
    rosterMemberOccurrences,
    uniqueRosterCharacters: unique.size,
    existingCharacters,
    newCharacters,
    // Existing guild members are source-only under the requested strategy.
    existingCharactersNeedingUpdate: 0,
    U: newCharacters,
    K: 0,
    estimatedCharacterApiRequests: newCharacters * 3,
    failedGuilds,
    errors,
    errorStats,
  };
};

export const guildProgress = async (env: Env, jobId: number) => {
  const rows = await env.DB.prepare(`SELECT status, COUNT(*) AS total FROM guild_import_candidates
    WHERE import_job_id = ?1 GROUP BY status`).bind(jobId).all<{ status: string; total: number }>();
  const counts = { pending: 0, retry: 0, completed: 0, failed: 0 };
  for (const row of rows.results) counts[row.status as keyof typeof counts] = Number(row.total);
  return { ...counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) };
};

export const stageNextGuild = async (env: Env, job: ImportJobRow) => {
  if (!checkpointOf(job).guildCandidatesInitialized) throw new HttpError(409, 'guild_not_initialized', 'Start a guild sampling round first');
  if (checkpointOf(job).stageComplete) return { job, processed: 0, guilds: await guildProgress(env, job.id) };
  const config = getRuntimeConfig(env);
  const candidate = await env.DB.prepare(`SELECT * FROM guild_import_candidates WHERE import_job_id = ?1
    AND (status = 'pending' OR (status = 'retry' AND next_retry_at <= ?2))
    ORDER BY id LIMIT 1`).bind(job.id, nowIso()).first<GuildCandidate>();
  if (!candidate) return finishGuildStage(env, job, 0);
  // Reserve a bounded API attempt's bookkeeping before making network calls.
  const budget = await budgetAfter(env.DB, job, 10, 20, config);
  await env.DB.prepare(`UPDATE import_jobs SET d1_budget_date = ?2, d1_rows_read_estimate = ?3,
    d1_rows_written_estimate = ?4 WHERE id = ?1`).bind(job.id, budget.date, budget.rowsRead, budget.rowsWritten).run();
  let requests = 0;
  let basic: GuildBasic | undefined;
  let items: SeedCharacter[] | undefined;
  let observedAt = nowIso();
  try {
    if (!candidate.oguild_id) {
      const params = new URLSearchParams({ guild_name: candidate.guild_name, world_name: candidate.world_name });
      const id = await fetchNexonJson<{ oguild_id?: string }>(env, `/guild/id?${params}`, () => { requests += 1; });
      if (typeof id.oguild_id !== 'string' || !id.oguild_id.trim()) {
        throw new NexonRequestError('NEXON did not return a guild ID', null, true, 'missing_guild_id');
      }
      candidate.oguild_id = id.oguild_id;
      await env.DB.prepare('UPDATE guild_import_candidates SET oguild_id = ?2 WHERE id = ?1')
        .bind(candidate.id, candidate.oguild_id).run();
    }
    basic = await fetchNexonJson<GuildBasic>(env, `/guild/basic?oguild_id=${encodeURIComponent(candidate.oguild_id)}`, () => { requests += 1; });
    observedAt = nowIso();
    items = guildMembersToSeeds(candidate, basic, observedAt);
  } catch (error) {
    if (error instanceof NexonRequestError && (error.status === 401 || error.status === 403)) throw error;
    const retryable = !(error instanceof NexonRequestError) || error.retryable;
    const attempts = candidate.attempt_count + 1;
    const retry = retryable && attempts < config.nexonRetryLimit;
    const message = error instanceof Error ? error.message : String(error);
    await env.DB.batch([
      env.DB.prepare(`UPDATE guild_import_candidates SET status = ?2, attempt_count = ?3,
        next_retry_at = ?4, last_error = ?5 WHERE id = ?1`)
        .bind(candidate.id, retry ? 'retry' : 'failed', attempts,
          retry ? new Date(Date.now() + Math.min(3_600_000, 30_000 * 2 ** (attempts - 1))).toISOString() : null, message.slice(0, 1000)),
      env.DB.prepare(`INSERT INTO import_job_errors(import_job_id, source, source_id, error_code, error_message)
        VALUES (?1, 'nexon_guild', ?2, ?3, ?4)`)
        .bind(job.id, String(candidate.id), error instanceof NexonRequestError ? error.code : 'guild_fetch_failed', message.slice(0, 1000)),
    ]);
  } finally {
    await env.DB.prepare('UPDATE import_jobs SET nexon_request_count = nexon_request_count + ?2 WHERE id = ?1')
      .bind(job.id, requests).run();
  }
  if (!basic || !items) return finishGuildStage(env, (await getImportJob(env.DB, job.id))!, 1);
  // Queue the entire validated roster and commit the guild checkpoint atomically.
  const currentJob = (await getImportJob(env.DB, job.id))!;
  await checkpointSeedPage(env, currentJob, {
    page: currentJob.last_page + 1, pageSize: items.length, total: null, items, complete: false,
  }, [env.DB.prepare(`UPDATE guild_import_candidates SET status = 'completed', member_count = ?2,
    observed_at = ?3, last_error = NULL, next_retry_at = NULL WHERE id = ?1`)
    .bind(candidate.id, basic.guild_member_count!, observedAt)]);
  return finishGuildStage(env, (await getImportJob(env.DB, job.id))!, 1);
};

const finishGuildStage = async (env: Env, job: ImportJobRow, processed: number) => {
  const guilds = await guildProgress(env, job.id);
  const complete = guilds.pending + guilds.retry === 0;
  await env.DB.prepare('UPDATE import_jobs SET checkpoint_json = ?2, updated_at = ?3 WHERE id = ?1')
    .bind(job.id, JSON.stringify({ ...checkpointOf(job), stageComplete: complete, guilds }), nowIso()).run();
  return { job: await maybeCompleteImportJob(env.DB, job.id), processed, guilds,
    waitingForRetry: !complete && processed === 0 };
};

export const resolveGuildMembers = async (env: Env, job: ImportJobRow, options: ResolutionBatchOptions = {}) => {
  if (!checkpointOf(job).stageComplete) throw new HttpError(409, 'guild_stage_incomplete', 'Finish the guild roster stage before resolving characters');
  if (job.status === 'completed') return { job, processed: 0 };
  return resolveStagingBatch(env, job, options);
};

export const recoverGuildImportBatch = async (env: Env) => {
  const timestamp = nowIso();
  const job = await env.DB.prepare(`
    SELECT j.* FROM import_jobs j
    WHERE j.source = 'nexon_guild'
      AND j.status = 'running'
      AND json_extract(j.checkpoint_json, '$.stageComplete') = 1
      AND (j.lease_until IS NULL OR j.lease_until <= ?1)
      AND EXISTS (
        SELECT 1 FROM character_import_staging s
        WHERE s.import_job_id = j.id
          AND (
            s.status IN ('pending', 'resolving')
            OR (s.status = 'retry' AND (s.next_retry_at IS NULL OR s.next_retry_at <= ?1))
          )
      )
    ORDER BY j.updated_at, j.id
    LIMIT 1
  `).bind(timestamp).first<ImportJobRow>();
  if (!job) return { processed: 0, claimed: false, reason: 'no_eligible_guild_job' };

  try {
    return await withGuildImportLock(env, job.id, async () => {
      const current = await getImportJob(env.DB, job.id);
      if (!current || current.status !== 'running' || !checkpointOf(current).stageComplete) {
        return { processed: 0, claimed: true, jobId: job.id, reason: 'job_no_longer_eligible' };
      }
      const result = await resolveGuildMembers(env, current);
      return { ...result, claimed: true, jobId: job.id };
    });
  } catch (error) {
    if (error instanceof HttpError && error.code === 'guild_import_busy') {
      return { processed: 0, claimed: false, jobId: job.id, reason: 'guild_import_busy' };
    }
    throw error;
  }
};
