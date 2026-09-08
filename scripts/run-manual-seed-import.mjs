import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DEFAULT_MANUAL_SEED_DIR, readManualSeedPage, scanManualSeedDirectory } from './manual-seed-files.mjs';
import {
  loadManualImportEnvironment,
  manualImportSettings,
  publicManualImportSettings,
} from './manual-import-config.mjs';
import { readRuntimeState, stopRequested, updateRuntimeState } from './manual-import-runtime.mjs';
import { createLocalNexonRateLimiter } from './nexon-request-limiter.mjs';
import { addResolverMetrics, createResolverMetrics, recordResolverRequest, summarizeResolverMetrics } from './resolver-metrics.mjs';
import { canonicalUpdateGuard, parseNexonCharacter, stagingRequeueAssignments, validateCharacterWrite } from '../functions/_shared/character-policy.mjs';

const SOURCE = 'manual_seed';
const DATABASE = 'holybear-maple-db';
const NEXON_URL = 'https://open.api.nexon.com/maplestorytw/v1';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class D1QuotaReached extends Error {
  constructor(message) {
    super(message);
    this.name = 'D1QuotaReached';
  }
}

export class ImportD1BudgetReached extends Error {
  constructor(kind) {
    super(`Importer paused before reaching the configured D1 ${kind} safety budget`);
    this.name = 'ImportD1BudgetReached';
    this.kind = kind;
  }
}

export const isD1QuotaError = (error) => {
  const message = String(error?.message ?? error);
  return message.includes('code: 7500') || /exceeded D1[^\n]*daily row read limit/i.test(message);
};

const integer = (value, fallback, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

const optionValue = (args, name, fallback) => {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

export const sqlLiteral = (value) => {
  if (value == null) return 'NULL';
  if (typeof value === 'number') return String(Math.trunc(value));
  return `'${String(value).replaceAll("'", "''")}'`;
};

const parseWranglerJson = (output) => {
  const start = output.indexOf('[');
  if (start < 0) throw new Error(`Wrangler did not return JSON: ${output.slice(0, 300)}`);
  return JSON.parse(output.slice(start));
};

const wranglerPath = () => [
  path.resolve('node_modules', 'wrangler', 'bin', 'wrangler.js'),
  process.env.APPDATA && path.join(process.env.APPDATA, 'npm', 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
  process.env.npm_config_prefix && path.join(process.env.npm_config_prefix, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
].filter(Boolean).find((candidate) => existsSync(candidate));

const spawnWrangler = (args) => new Promise((resolve, reject) => {
  const executable = wranglerPath();
  if (!executable) return reject(new Error('Wrangler CLI was not found'));
  const child = spawn(process.execPath, [executable, 'd1', 'execute', DATABASE, '--remote', '--json', '--yes', ...args], {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (code) => code === 0
    ? resolve(stdout)
    : reject(new Error(`Wrangler D1 failed (${code}): ${(stderr || stdout).slice(-1500)}`)));
});

const runWrangler = async (args, attempts = 3) => {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return parseWranglerJson(await spawnWrangler(args));
    } catch (error) {
      lastError = error;
      if (isD1QuotaError(error)) throw new D1QuotaReached(String(error?.message ?? error));
      if (attempt + 1 < attempts) await wait(Math.min(15_000, 1000 * (2 ** attempt)));
    }
  }
  throw lastError;
};

const query = async (sql) => (await runWrangler(['--command', sql])).flatMap((entry) => entry.results ?? []);
const executeSql = async (sql) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'holybear-manual-seed-'));
  const filename = path.join(directory, 'batch.sql');
  try {
    await writeFile(filename, sql, 'utf8');
    return await runWrangler(['--file', filename]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

const checkpointOf = (job) => {
  try { return job?.checkpoint_json ? JSON.parse(job.checkpoint_json) : {}; } catch { return {}; }
};

const utcDate = () => new Date().toISOString().slice(0, 10);
const budgetAfter = async (job, readDelta, writeDelta, settings) => {
  const date = utcDate();
  const rowsRead = (job?.d1_budget_date === date ? Number(job.d1_rows_read_estimate) || 0 : 0) + readDelta;
  const rowsWritten = (job?.d1_budget_date === date ? Number(job.d1_rows_written_estimate) || 0 : 0) + writeDelta;
  const others = (await query(`SELECT
    COALESCE(SUM(d1_rows_read_estimate),0) AS rows_read,
    COALESCE(SUM(d1_rows_written_estimate),0) AS rows_written
    FROM import_jobs WHERE d1_budget_date=${sqlLiteral(date)} AND id<>${Number(job.id)};`))[0] ?? {};
  if (rowsRead + Number(others.rows_read || 0) > settings.readMaximum) throw new ImportD1BudgetReached('read');
  if (rowsWritten + Number(others.rows_written || 0) > settings.writeMaximum) throw new ImportD1BudgetReached('write');
  return { date, rowsRead, rowsWritten };
};
const latestJob = async () => (await query(`SELECT * FROM import_jobs WHERE source = '${SOURCE}' ORDER BY id DESC LIMIT 1;`))[0] ?? null;
const createJob = async () => {
  const now = new Date().toISOString();
  await query(`INSERT INTO import_jobs (source, status, started_at, updated_at) VALUES ('${SOURCE}', 'pending', ${sqlLiteral(now)}, ${sqlLiteral(now)});`);
  return latestJob();
};

export const manualImportTerminalStatus = (overallComplete, activeStagingCount) => (
  overallComplete && Number(activeStagingCount) === 0 ? 'completed' : 'paused'
);

export const markManualImportRunningSql = (jobId, timestamp = new Date().toISOString()) => `
  UPDATE import_jobs SET status='running', completed_at=NULL,
    updated_at=${sqlLiteral(timestamp)}
  WHERE id=${Number(jobId)} AND source='${SOURCE}'
    AND status IN ('pending','paused','running');`;

export const finalizeManualImportSql = (
  jobId,
  status,
  timestamp = new Date().toISOString(),
) => {
  if (status !== 'paused' && status !== 'completed') throw new Error(`Invalid manual import terminal status: ${status}`);
  const completed = status === 'completed';
  const activeGuard = completed
    ? `AND NOT EXISTS (
      SELECT 1 FROM character_import_staging
      WHERE import_job_id=${Number(jobId)} AND status IN ('pending','resolving','retry')
    )`
    : '';
  return `
    UPDATE import_jobs SET status=${sqlLiteral(status)},
      completed_at=${completed ? sqlLiteral(timestamp) : 'NULL'},
      pending_count=${completed ? '0' : 'pending_count'},
      retry_count=${completed ? '0' : 'retry_count'},
      last_error=${completed ? 'NULL' : 'last_error'},
      updated_at=${sqlLiteral(timestamp)}
    WHERE id=${Number(jobId)} AND source='${SOURCE}' AND status='running'
      ${activeGuard};`;
};

const markManualImportRunning = async (jobId) => {
  await executeSql(markManualImportRunningSql(jobId));
  const job = await latestJob();
  if (!job || Number(job.id) !== Number(jobId) || job.status !== 'running') {
    throw new Error(`Could not mark manual import job ${jobId} as running`);
  }
  return job;
};

const finalizeManualImportJob = async (jobId, overallComplete) => {
  const active = (await query(`SELECT COUNT(*) AS total FROM character_import_staging
    WHERE import_job_id=${Number(jobId)} AND status IN ('pending','resolving','retry');`))[0] ?? {};
  const status = manualImportTerminalStatus(overallComplete, Number(active.total) || 0);
  await executeSql(finalizeManualImportSql(jobId, status));
  const job = await latestJob();
  if (!job || Number(job.id) !== Number(jobId) || job.status !== status) {
    throw new Error(`Could not finalize manual import job ${jobId} as ${status}`);
  }
  return job;
};

const contiguousCheckpoint = (pages) => {
  const found = new Set(pages);
  let page = 0;
  while (found.has(page + 1)) page += 1;
  return page;
};

const stagingValues = (jobId, item) => `(
  ${jobId}, '${SOURCE}', ${sqlLiteral(item.sourceId)}, ${sqlLiteral(item.characterName)},
  ${sqlLiteral(item.normalizedName)}, ${sqlLiteral(item.worldName)}, ${sqlLiteral(item.jobName)},
  ${item.level}, ${item.combatPower}, ${sqlLiteral(item.characterImage)},
  ${sqlLiteral(item.sourceUpdatedAt)}, ${sqlLiteral(item.observedAt)}
)`;

export const pageStagingSql = (
  job,
  parsed,
  processedPages,
  filename,
  expectedTotalPages,
  partialTargetPage,
  budget = null,
) => {
  const statements = [];
  const items = [...new Map(parsed.items.map((item) => [item.sourceId, item])).values()];
  for (let offset = 0; offset < items.length; offset += 20) {
    const chunk = items.slice(offset, offset + 20);
    const values = chunk.map((item) => stagingValues(job.id, item)).join(',\n');
    statements.push(`UPDATE import_jobs SET pending_count=pending_count+${chunk.length}-(
      SELECT COUNT(*) FROM character_import_staging WHERE source='manual_seed' AND import_job_id=${job.id}
      AND source_id IN (${chunk.map((item) => sqlLiteral(item.sourceId)).join(',')})
    ) WHERE id=${job.id};`);
    statements.push(`INSERT INTO character_import_staging (
      import_job_id, source, source_id, character_name, normalized_name, world_name,
      job_name, level, combat_power, character_image, source_updated_at, observed_at
    ) VALUES ${values}
    ON CONFLICT(source, source_id) DO UPDATE SET
      ${stagingRequeueAssignments},
      import_job_id=excluded.import_job_id, character_name=excluded.character_name,
      normalized_name=excluded.normalized_name, world_name=excluded.world_name,
      job_name=excluded.job_name, level=excluded.level, combat_power=excluded.combat_power,
      character_image=excluded.character_image,
      source_updated_at=COALESCE(excluded.source_updated_at, character_import_staging.source_updated_at),
      observed_at=excluded.observed_at, updated_at=excluded.updated_at;`);
  }
  const now = new Date().toISOString();
  const checkpointPage = contiguousCheckpoint(processedPages);
  const checkpoint = JSON.stringify({
    mode: 'manual-files',
    processedPages,
    lastFile: filename,
    manualPartialComplete: checkpointPage >= partialTargetPage,
    overallComplete: checkpointPage >= expectedTotalPages,
    expectedTotalPages,
  });
  const inserted = parsed.newUniqueRecords ?? parsed.validRecords;
  const updated = parsed.duplicateRecords ?? 0;
  const budgetSql = budget ? `,
    d1_budget_date=${sqlLiteral(budget.date)},
    d1_rows_read_estimate=${budget.rowsRead},
    d1_rows_written_estimate=${budget.rowsWritten}` : '';
  statements.push(`UPDATE import_jobs SET status='running', last_page=${checkpointPage},
    checkpoint_json=${sqlLiteral(checkpoint)}, imported_count=imported_count+${parsed.validRecords},
    staging_inserted_count=staging_inserted_count+${inserted},
    staging_updated_count=staging_updated_count+${updated}${budgetSql},
    completed_at=NULL, last_error=NULL, updated_at=${sqlLiteral(now)} WHERE id=${job.id};`);
  return statements.join('\n');
};

const jobMetrics = (job) => ({
  raw_records_scanned: Number(job?.imported_count ?? 0),
  staging_total: Number(job?.staging_inserted_count ?? 0),
  staging_inserted: Number(job?.staging_inserted_count ?? 0),
  staging_updated: Number(job?.staging_updated_count ?? 0),
  resolved: Number(job?.resolved_count ?? 0),
  pending: Number(job?.pending_count ?? 0),
  retry_pending: Number(job?.retry_count ?? 0),
  failed: Number(job?.failed_count ?? 0),
  canonical_upserts: Number(job?.resolved_count ?? 0),
  characters_created_known: Number(job?.created_count ?? 0),
  canonical_updated_known: Number(job?.updated_count ?? 0),
  canonical_disposition_unknown: Math.max(
    0,
    Number(job?.resolved_count ?? 0) - Number(job?.created_count ?? 0) - Number(job?.updated_count ?? 0),
  ),
  nexon_requests: Number(job?.nexon_request_count ?? 0),
  metricsSource: 'import_jobs_counters',
});

const checkpointSummary = (job) => {
  const checkpoint = checkpointOf(job);
  return {
    page: Number(job?.last_page ?? 0),
    lastFile: checkpoint.lastFile ?? null,
    expectedTotalPages: Number(checkpoint.expectedTotalPages ?? 0),
    manualPartialComplete: Boolean(checkpoint.manualPartialComplete),
    overallComplete: Boolean(checkpoint.overallComplete),
  };
};

class RequestBudgetReached extends Error {}
const fetchNexon = async (pathname, settings, budget, onMetric) => {
  let lastError;
  for (let attempt = 0; attempt < settings.retryLimit; attempt += 1) {
    if (budget.used >= budget.maximum) throw new RequestBudgetReached('NEXON request budget reached');
    budget.used += 1;
    const startedAt = Date.now();
    let status = null;
    let ok = false;
    let errorKind;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      await (settings.rateLimiter?.acquire?.() ?? Promise.resolve());
      const response = await fetch(`${NEXON_URL}${pathname}`, {
        headers: { accept: 'application/json', 'x-nxopen-api-key': settings.apiKey },
        cache: 'no-store',
        signal: controller.signal,
      });
      status = response.status;
      if (response.ok) {
        const payload = await response.json();
        ok = true;
        return payload;
      }
      const error = new Error(`NEXON request failed (${response.status})`);
      error.status = response.status;
      error.retryable = response.status === 429 || response.status >= 500;
      if (response.status === 429 && settings.adaptiveState) settings.adaptiveState.rateLimited = true;
      if (!error.retryable) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof RequestBudgetReached || error?.retryable === false) throw error;
      errorKind = error?.name === 'AbortError' ? 'timeout' : 'network';
      lastError = error;
    } finally {
      clearTimeout(timeout);
      onMetric?.({ pathname, path: pathname, attempt, latencyMs: Math.max(0, Date.now() - startedAt), status, ok, errorKind });
    }
    if (attempt + 1 < settings.retryLimit) await wait(Math.min(30_000, 750 * (2 ** attempt)));
  }
  throw lastError;
};

const normalizeName = (value) => String(value ?? '').trim().normalize('NFC').toLocaleLowerCase('zh-TW');
export const resolveCharacter = async (row, settings, budget, metrics = null) => {
  const requestedAt = new Date().toISOString();
  const requestedName = String(row.character_name).trim().normalize('NFC');
  const onMetric = metrics ? (metric) => recordResolverRequest(metrics, metric) : undefined;
  const id = row.ocid ? { ocid: row.ocid } : await fetchNexon(`/id?character_name=${encodeURIComponent(requestedName)}`, settings, budget, onMetric);
  const [basic, stat] = await Promise.all([
    fetchNexon(`/character/basic?ocid=${encodeURIComponent(id.ocid)}`, settings, budget, onMetric),
    fetchNexon(`/character/stat?ocid=${encodeURIComponent(id.ocid)}`, settings, budget, onMetric),
  ]);
  const observedAt = new Date().toISOString();
  const character = parseNexonCharacter(id.ocid, basic, stat, requestedAt, observedAt);
  return {
    ...character,
    normalizedName: normalizeName(character.characterName),
  };
};

const sourceSql = (character, source, sourceId, observedAt, sourceUpdatedAt, rawJson = null) => `INSERT INTO character_sources (
  ocid, source, source_character_id, source_first_seen_at, source_last_seen_at,
  raw_json, created_at, updated_at, source_updated_at
) VALUES (${sqlLiteral(character.ocid)}, ${sqlLiteral(source)}, ${sqlLiteral(sourceId)}, ${sqlLiteral(observedAt)},
  ${sqlLiteral(observedAt)}, ${sqlLiteral(rawJson)}, ${sqlLiteral(observedAt)}, ${sqlLiteral(observedAt)}, ${sqlLiteral(sourceUpdatedAt)})
ON CONFLICT(ocid, source) DO UPDATE SET
  source_character_id=CASE WHEN excluded.source_last_seen_at >= character_sources.source_last_seen_at
    THEN COALESCE(excluded.source_character_id, character_sources.source_character_id) ELSE character_sources.source_character_id END,
  source_first_seen_at=MIN(character_sources.source_first_seen_at, excluded.source_first_seen_at),
  source_last_seen_at=MAX(character_sources.source_last_seen_at, excluded.source_last_seen_at),
  source_updated_at=CASE WHEN excluded.source_updated_at IS NULL THEN character_sources.source_updated_at
    WHEN character_sources.source_updated_at IS NULL THEN excluded.source_updated_at
    ELSE MAX(excluded.source_updated_at, character_sources.source_updated_at) END,
  raw_json=CASE WHEN excluded.source_last_seen_at >= character_sources.source_last_seen_at
    THEN COALESCE(excluded.raw_json, character_sources.raw_json) ELSE character_sources.raw_json END,
  updated_at=MAX(character_sources.updated_at, excluded.updated_at);`;

export const canonicalSql = (row, character) => {
  validateCharacterWrite(character);
  const sourceMetadata = JSON.stringify({
    worldName: row.world_name,
    jobName: row.job_name,
    level: row.level,
    combatPower: row.combat_power,
  });
  return `INSERT INTO characters (
    ocid, character_name, normalized_name, world_name, job_name, level, combat_power,
    character_image, guild_name, first_seen_at, last_seen_at, nexon_updated_at, created_at, updated_at, nexon_requested_at
  ) VALUES (${sqlLiteral(character.ocid)}, ${sqlLiteral(character.characterName)}, ${sqlLiteral(normalizeName(character.characterName))},
    ${sqlLiteral(character.worldName)}, ${sqlLiteral(character.jobName)}, ${character.level}, ${character.combatPower},
    ${sqlLiteral(character.characterImage)}, ${sqlLiteral(character.guildName)}, ${sqlLiteral(character.observedAt)},
    ${sqlLiteral(character.observedAt)}, ${sqlLiteral(character.nexonUpdatedAt ?? null)}, ${sqlLiteral(character.observedAt)}, ${sqlLiteral(character.observedAt)},
    ${sqlLiteral(character.requestedAt ?? character.observedAt)})
  ON CONFLICT(ocid) DO UPDATE SET character_name=excluded.character_name, normalized_name=excluded.normalized_name,
    world_name=excluded.world_name, job_name=excluded.job_name, level=excluded.level,
    combat_power=excluded.combat_power, character_image=excluded.character_image, guild_name=excluded.guild_name,
    first_seen_at=MIN(characters.first_seen_at, excluded.first_seen_at),
    last_seen_at=MAX(characters.last_seen_at, excluded.last_seen_at),
    nexon_updated_at=excluded.nexon_updated_at, nexon_requested_at=excluded.nexon_requested_at, updated_at=excluded.updated_at
    ${canonicalUpdateGuard};
  ${sourceSql(character, SOURCE, row.source_id, row.observed_at || character.observedAt, row.source_updated_at, sourceMetadata)}
  ${sourceSql(character, 'nexon', character.ocid, character.observedAt, character.nexonUpdatedAt ?? null)}
  INSERT INTO account_signal_sync (
    ocid, signal_type, status, signal_count, attempt_count,
    next_retry_at, last_error, last_attempted_at, completed_at,
    created_at, updated_at, queue_version
  )
  SELECT ${sqlLiteral(character.ocid)}, 'union_raider_full', 'pending', 0, 0,
    NULL, NULL, NULL, NULL, ${sqlLiteral(character.observedAt)}, ${sqlLiteral(character.observedAt)}, 0
  WHERE EXISTS (
    SELECT 1 FROM characters
    WHERE ocid=${sqlLiteral(character.ocid)}
      AND updated_at=${sqlLiteral(character.observedAt)}
      AND nexon_requested_at=${sqlLiteral(character.requestedAt ?? character.observedAt)}
      AND ((nexon_updated_at=${sqlLiteral(character.nexonUpdatedAt ?? null)})
        OR (nexon_updated_at IS NULL AND ${sqlLiteral(character.nexonUpdatedAt ?? null)} IS NULL))
  )
  ON CONFLICT(ocid, signal_type) DO UPDATE SET
    status='pending', signal_count=0, next_retry_at=NULL, last_error=NULL, completed_at=NULL,
    queue_version=account_signal_sync.queue_version+1,
    updated_at=${sqlLiteral(character.observedAt)},
    claim_token=CASE WHEN account_signal_sync.claim_until IS NOT NULL
      AND account_signal_sync.claim_until > ${sqlLiteral(character.observedAt)}
      THEN account_signal_sync.claim_token ELSE NULL END,
    claim_until=CASE WHEN account_signal_sync.claim_until IS NOT NULL
      AND account_signal_sync.claim_until > ${sqlLiteral(character.observedAt)}
      THEN account_signal_sync.claim_until ELSE NULL END;
  UPDATE character_import_staging SET status='resolved', ocid=${sqlLiteral(character.ocid)},
    attempt_count=attempt_count+1, next_retry_at=NULL, last_error=NULL,
    updated_at=${sqlLiteral(character.observedAt)} WHERE id=${row.id};`;
};

const failureSql = (job, row, error, retryLimit) => {
  const attempts = Number(row.attempt_count) + 1;
  const retryable = error?.retryable !== false && attempts < retryLimit;
  const now = new Date().toISOString();
  const retryAt = retryable ? new Date(Date.now() + Math.min(3_600_000, 30_000 * (2 ** Math.max(0, attempts - 1)))).toISOString() : null;
  const message = String(error?.message ?? error).slice(0, 1000);
  return {
    status: retryable ? 'retry' : 'failed',
    sql: `UPDATE character_import_staging SET status=${sqlLiteral(retryable ? 'retry' : 'failed')},
    attempt_count=${attempts}, next_retry_at=${sqlLiteral(retryAt)}, last_error=${sqlLiteral(message)}, updated_at=${sqlLiteral(now)} WHERE id=${row.id};
  INSERT INTO import_job_errors (import_job_id, source, source_id, character_name, error_code, error_message, created_at)
  VALUES (${job.id}, '${SOURCE}', ${sqlLiteral(row.source_id)}, ${sqlLiteral(row.character_name)},
    ${sqlLiteral(error?.status ? `http_${error.status}` : 'resolution_failed')}, ${sqlLiteral(message)}, ${sqlLiteral(now)});`,
  };
};

const resolutionRows = (jobId, limit) => query(`SELECT s.id, s.source_id, s.character_name, s.ocid, s.status, s.attempt_count,
  s.source_updated_at, s.observed_at, s.world_name, s.job_name, s.level, s.combat_power
FROM character_import_staging s WHERE s.import_job_id=${jobId}
  AND (s.status IN ('pending','resolving') OR (s.status='retry' AND (s.next_retry_at IS NULL OR s.next_retry_at<=${sqlLiteral(new Date().toISOString())})))
ORDER BY s.id LIMIT ${limit};`);

const settleWithConcurrency = async (items, concurrency, delayMs, worker) => {
  const results = new Array(items.length);
  let cursor = 0;
  let nextStartAt = Date.now();
  const take = () => {
    const index = cursor;
    cursor += 1;
    const scheduledAt = Math.max(Date.now(), nextStartAt);
    nextStartAt = scheduledAt + delayMs;
    return { index, waitMs: Math.max(0, scheduledAt - Date.now()) };
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const { index, waitMs } = take();
      if (index >= items.length) return;
      if (waitMs > 0) await wait(waitMs);
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }));
  return results;
};

const productionCounts = async () => (await query(`SELECT
  COALESCE((SELECT characters_total FROM database_stats WHERE id=1), 0) AS characters_total,
  (SELECT COUNT(*) FROM character_sources) AS character_sources_total;`))[0] ?? {};

const printScan = (scan, selected) => ({
  filesDiscovered: scan.filesFound,
  selectedFiles: selected.length,
  minPage: selected[0]?.page ?? null,
  maxPage: selected.at(-1)?.page ?? null,
  missingPages: scan.missingPages,
  duplicatePages: scan.duplicatePages,
  invalidFiles: scan.invalidFiles,
  rawRecords: selected.reduce((sum, page) => sum + page.rawRecords, 0),
  validRecords: selected.reduce((sum, page) => sum + page.validRecords, 0),
  invalidRecords: scan.invalidRecords,
  duplicateRecords: scan.duplicateRecords,
  schema: scan.schema,
});

const refreshRankingSnapshot = async (environment) => {
  const baseUrl = String(environment.HOLYBEAR_API_BASE_URL || '').replace(/\/+$/, '');
  const secret = environment.IMPORT_ADMIN_SECRET;
  if (!baseUrl || !secret) return { refreshed: false, reason: 'snapshot_endpoint_not_configured' };
  const response = await fetch(`${baseUrl}/api/admin/ranking-snapshot`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });
  if (!response.ok) throw new Error(`Ranking snapshot refresh failed (${response.status})`);
  return { refreshed: true, ...await response.json() };
};

const runManualSeedImportCore = async (args) => {
  const directory = optionValue(args, '--dir', DEFAULT_MANUAL_SEED_DIR);
  const throughPage = integer(optionValue(args, '--through-page', Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER, 1);
  const scan = await scanManualSeedDirectory(directory, ({ scanned, total }) => console.error(`scan ${scanned}/${total}`));
  const selected = scan.summaries.filter(({ page }) => page <= throughPage);
  console.log(JSON.stringify({ event: 'scan', ...printScan(scan, selected) }));
  if (args.includes('--dry-run')) return;
  if (!args.includes('--status') && !args.includes('--all')) throw new Error('Choose --status, --dry-run, or --all');

  const localEnv = await loadManualImportEnvironment();
  const configuredSettings = manualImportSettings(localEnv);
  const backgroundMode = process.env.HOLYBEAR_MANUAL_IMPORT_BACKGROUND === '1';
  const shouldStop = () => backgroundMode && stopRequested();
  let job = await latestJob();
  let processed = new Set((checkpointOf(job).processedPages ?? []).map(Number));
  if (args.includes('--status')) {
    const runtime = readRuntimeState();
    const counts = await productionCounts();
    const alive = Boolean(runtime.alive);
    const startedAt = alive ? runtime.startedAt ?? null : null;
    const baseline = alive ? Number(runtime.resolvedAtStart) : Number.NaN;
    const elapsedMinutes = startedAt ? Math.max(0, (Date.now() - Date.parse(startedAt)) / 60_000) : 0;
    const resolvedNow = Number(job?.resolved_count ?? 0);
    console.log(JSON.stringify({
      event: 'status',
      background_alive: alive,
      pid: alive ? runtime.pid : null,
      importer_started_at: startedAt,
      characters_per_minute: elapsedMinutes > 0 && Number.isFinite(baseline)
        ? Number(((resolvedNow - baseline) / elapsedMinutes).toFixed(2))
        : null,
      effective_settings: alive && runtime.settings
        ? runtime.settings
        : publicManualImportSettings(configuredSettings),
      processedPages: processed.size,
      maxProcessedPage: contiguousCheckpoint([...processed]),
      ...jobMetrics(job),
      characters_total: Number(counts.characters_total ?? 0),
      character_sources_total: Number(counts.character_sources_total ?? 0),
      checkpoint: checkpointSummary(job),
    }));
    return;
  }
  if (scan.invalidFiles.length || scan.duplicatePages.length || scan.invalidRecords > 0) {
    throw new Error('Manual seed validation failed; D1 was not modified');
  }
  if (args.includes('--refresh')) {
    if (readRuntimeState().alive || Number(job?.pending_count) > 0 || Number(job?.retry_count) > 0) {
      throw new Error('Finish/stop the existing manual import before starting a refresh round');
    }
    job = await createJob();
    processed = new Set();
  }
  if (!job) job = await createJob();
  const jobAlreadyCompleted = job.status === 'completed';
  if (!jobAlreadyCompleted) job = await markManualImportRunning(job.id);
  const expectedTotalPages = Math.max(...scan.schema.totalPages);
  const available = new Map(selected.map((summary) => [summary.page, summary]));
  const firstPending = contiguousCheckpoint([...processed]) + 1;
  const lastSelected = selected.at(-1)?.page ?? 0;
  for (let page = firstPending; page <= lastSelected; page += 1) {
    if (!available.has(page)) throw new Error(`Missing page ${page}; checkpoint was not advanced across the gap`);
  }

  const newPages = selected.filter(({ page }) => !processed.has(page));
  const pagesPerWrite = integer(localEnv.MANUAL_SEED_PAGES_PER_D1_BATCH, 5, 1, 10);
  const d1Budget = {
    readMaximum: configuredSettings.d1ReadBudget,
    writeMaximum: configuredSettings.d1WriteBudget,
  };
  let runStagingInserted = 0;
  let runStagingUpdated = 0;
  for (let offset = 0; offset < newPages.length; offset += pagesPerWrite) {
    if (shouldStop()) break;
    const statements = [];
    const batchPages = newPages.slice(offset, offset + pagesPerWrite);
    const parsedPages = [];
    for (const summary of batchPages) {
      const parsed = await readManualSeedPage(summary.absolutePath, summary.page);
      parsedPages.push({ summary, parsed });
    }
    const batchRecords = parsedPages.reduce((sum, { parsed }) => sum + parsed.validRecords, 0);
    const budget = await budgetAfter(job, batchRecords + 5, batchRecords * 5 + 2, d1Budget);
    for (const { summary, parsed } of parsedPages) {
      processed.add(summary.page);
      runStagingInserted += parsed.newUniqueRecords ?? parsed.validRecords;
      runStagingUpdated += parsed.duplicateRecords ?? 0;
      statements.push(pageStagingSql(
        job,
        parsed,
        [...processed].sort((a, b) => a - b),
        summary.filename,
        expectedTotalPages,
        lastSelected,
        budget,
      ));
    }
    await executeSql(statements.join('\n'));
    job = await latestJob();
    console.log(JSON.stringify({ event: 'stage', pagesProcessed: Math.min(offset + pagesPerWrite, newPages.length), totalNewPages: newPages.length, checkpoint: contiguousCheckpoint([...processed]) }));
  }

  const apiKey = localEnv.NEXON_API_KEY || localEnv.VITE_NEXON_API_KEY;
  if (!apiKey) throw new Error('NEXON_API_KEY is required after staging; staging checkpoint was preserved');
  const adaptiveState = { rateLimited: false };
  const settings = {
    apiKey,
    ...configuredSettings,
    adaptiveState,
    rateLimiter: createLocalNexonRateLimiter(configuredSettings.globalRateLimit),
  };
  const budget = { used: 0, maximum: configuredSettings.nexonRequestBudget };
  let budgetReached = false;
  let runResolved = 0;
  let activeConcurrency = settings.concurrency;
  let activeDelayMs = settings.requestDelayMs;
  let stableBatches = 0;
  if (backgroundMode) {
    updateRuntimeState({
      resolvedAtStart: Number(job?.resolved_count ?? 0),
      settings: {
        ...publicManualImportSettings(settings),
        activeConcurrency,
        activeDelayMs,
      },
    });
  }
  while (!budgetReached && budget.used < budget.maximum && !shouldStop()) {
    job = await latestJob();
    const projectedD1Budget = await budgetAfter(job, settings.batchSize * 5 + 8, settings.batchSize * 10 + 5, d1Budget);
    const batchMetrics = createResolverMetrics();
    const batchStartedAt = Date.now();
    const rowsReadStartedAt = Date.now();
    const rows = await resolutionRows(job.id, settings.batchSize);
    batchMetrics.d1ReadLatencyMs.push(Date.now() - rowsReadStartedAt);
    if (!rows.length) break;
    const requestCountBeforeBatch = budget.used;
    adaptiveState.rateLimited = false;
    const results = await settleWithConcurrency(
      rows,
      activeConcurrency,
      activeDelayMs,
      async (row) => {
        const metrics = createResolverMetrics();
        const characterStartedAt = Date.now();
        try {
          const character = await resolveCharacter(row, settings, budget, metrics);
          metrics.characterWallMs.push(Date.now() - characterStartedAt);
          return { character, metrics };
        } catch (error) {
          metrics.characterWallMs.push(Date.now() - characterStartedAt);
          if (error instanceof RequestBudgetReached) throw error;
          throw { resolutionError: error, metrics };
        }
      },
    );
    const statements = [];
    let resolved = 0;
    let pendingDecrease = 0;
    let retryDelta = 0;
    let failed = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const result = results[index];
      const row = rows[index];
      if (result.status === 'fulfilled') {
        addResolverMetrics(batchMetrics, result.value.metrics);
        statements.push(canonicalSql(row, result.value.character));
        resolved += 1;
        if (row.status === 'retry') retryDelta -= 1;
        else pendingDecrease += 1;
      }
      else if (result.reason instanceof RequestBudgetReached) budgetReached = true;
      else {
        if (result.reason?.metrics) addResolverMetrics(batchMetrics, result.reason.metrics);
        const failure = failureSql(job, row, result.reason?.resolutionError ?? result.reason, settings.retryLimit);
        statements.push(failure.sql);
        if (failure.status === 'retry') {
          if (row.status !== 'retry') {
            pendingDecrease += 1;
            retryDelta += 1;
          }
        } else {
          failed += 1;
          if (row.status === 'retry') retryDelta -= 1;
          else pendingDecrease += 1;
        }
      }
    }
    const resolvedCharacters = results.flatMap((result) => result.status === 'fulfilled' ? [result.value.character] : []);
    const uniqueResolvedCharacters = [...new Map(resolvedCharacters.map((item) => [item.ocid, item])).values()];
    const existingReadStartedAt = Date.now();
    const existingOcids = resolvedCharacters.length
      ? new Set((await query(`SELECT ocid FROM characters WHERE ocid IN (${uniqueResolvedCharacters.map((item) => sqlLiteral(item.ocid)).join(',')});`)).map((item) => item.ocid))
      : new Set();
    batchMetrics.d1ReadLatencyMs.push(Date.now() - existingReadStartedAt);
    const created = uniqueResolvedCharacters.filter((item) => !existingOcids.has(item.ocid)).length;
    const updated = resolved - created;
    statements.push(`UPDATE import_jobs SET
      resolved_count=resolved_count+${resolved},
      pending_count=MAX(0,pending_count-${pendingDecrease}),
      retry_count=MAX(0,retry_count+${retryDelta}),
      created_count=created_count+${created},
      updated_count=updated_count+${updated},
      failed_count=failed_count+${failed},
      nexon_request_count=nexon_request_count+${Math.max(0, budget.used - requestCountBeforeBatch)},
      d1_budget_date=${sqlLiteral(projectedD1Budget.date)},
      d1_rows_read_estimate=${projectedD1Budget.rowsRead},
      d1_rows_written_estimate=${projectedD1Budget.rowsWritten},
      updated_at=${sqlLiteral(new Date().toISOString())}
      WHERE id=${job.id};`);
    if (statements.length) {
      const writeStartedAt = Date.now();
      await executeSql(statements.join('\n'));
      batchMetrics.d1WriteLatencyMs.push(Date.now() - writeStartedAt);
    }
    console.log(JSON.stringify({
      event: 'resolve-benchmark',
      concurrency: activeConcurrency,
      requestDelayMs: activeDelayMs,
      globalRateLimit: settings.globalRateLimit,
      ...summarizeResolverMetrics(batchMetrics, Date.now() - batchStartedAt),
    }));
    runResolved += resolved;
    if (adaptiveState.rateLimited) {
      activeConcurrency = Math.max(1, Math.floor(activeConcurrency / 2));
      activeDelayMs = Math.min(10_000, Math.max(1_000, activeDelayMs * 2));
      stableBatches = 0;
      await wait(30_000);
    } else {
      stableBatches += 1;
      if (stableBatches >= 10) {
        activeConcurrency = Math.min(settings.concurrency, activeConcurrency + 1);
        activeDelayMs = Math.max(settings.requestDelayMs, Math.floor(activeDelayMs / 2));
        stableBatches = 0;
      }
    }
    if (backgroundMode) {
      updateRuntimeState({ settings: {
        ...publicManualImportSettings(settings),
        activeConcurrency,
        activeDelayMs,
      } });
    }
    if (budget.used % 90 < settings.batchSize * 3) {
      job = await latestJob();
      console.log(JSON.stringify({ event: 'resolve', nexonRequestsUsed: budget.used, ...jobMetrics(job) }));
    }
  }
  job = await latestJob();
  const rankingSnapshot = runResolved > 0
    ? await refreshRankingSnapshot(localEnv).catch((error) => ({ refreshed: false, reason: String(error?.message ?? error) }))
    : { refreshed: false, reason: 'no_newly_resolved_characters' };
  const overallComplete = contiguousCheckpoint([...processed]) >= expectedTotalPages;
  if (!jobAlreadyCompleted) job = await finalizeManualImportJob(job.id, overallComplete);
  console.log(JSON.stringify({
    event: 'final',
    manualPartialComplete: newPages.length === 0 || contiguousCheckpoint([...processed]) >= lastSelected,
    overallComplete,
    processedFiles: processed.size,
    processedPages: processed.size,
    maxProcessedPage: contiguousCheckpoint([...processed]),
    stagingInserted: runStagingInserted,
    stagingUpdated: runStagingUpdated,
    nexonRequestsUsed: budget.used,
    nexonRequestBudget: budget.maximum,
    stopRequested: shouldStop(),
    effectiveSettings: {
      ...publicManualImportSettings(settings),
      activeConcurrency,
      activeDelayMs,
    },
    rankingSnapshot,
    ...jobMetrics(job),
    checkpoint: checkpointSummary(job),
  }));
};

export const runManualSeedImport = async (args = process.argv.slice(2)) => {
  try {
    return await runManualSeedImportCore(args);
  } catch (error) {
    if (!(error instanceof D1QuotaReached) && !(error instanceof ImportD1BudgetReached) && !isD1QuotaError(error)) throw error;
    console.log(JSON.stringify({
      event: 'paused',
      reason: error instanceof ImportD1BudgetReached ? `import_d1_${error.kind}_budget` : 'd1_daily_row_read_quota',
      checkpointPreserved: true,
      resumeCommand: 'yarn import:maple manual --dir data/manual-character-seed --all',
    }));
    return { paused: true, reason: error instanceof ImportD1BudgetReached ? `import_d1_${error.kind}_budget` : 'd1_daily_row_read_quota' };
  }
};
