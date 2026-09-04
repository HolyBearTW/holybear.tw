import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DEFAULT_MANUAL_SEED_DIR, readManualSeedPage, scanManualSeedDirectory } from './manual-seed-files.mjs';

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

const parseEnvFile = async (filename) => {
  try {
    const contents = await readFile(filename, 'utf8');
    return Object.fromEntries(contents.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || match[1].startsWith('#')) return [];
      return [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]];
    }));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
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
const latestJob = async () => (await query(`SELECT * FROM import_jobs WHERE source = '${SOURCE}' ORDER BY id DESC LIMIT 1;`))[0] ?? null;
const createJob = async () => {
  const now = new Date().toISOString();
  await query(`INSERT INTO import_jobs (source, status, started_at, updated_at) VALUES ('${SOURCE}', 'pending', ${sqlLiteral(now)}, ${sqlLiteral(now)});`);
  return latestJob();
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

export const pageStagingSql = (job, parsed, processedPages, filename, expectedTotalPages, partialTargetPage) => {
  const statements = [];
  for (let offset = 0; offset < parsed.items.length; offset += 20) {
    const values = parsed.items.slice(offset, offset + 20).map((item) => stagingValues(job.id, item)).join(',\n');
    statements.push(`INSERT INTO character_import_staging (
      import_job_id, source, source_id, character_name, normalized_name, world_name,
      job_name, level, combat_power, character_image, source_updated_at, observed_at
    ) VALUES ${values}
    ON CONFLICT(source, source_id) DO UPDATE SET
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
  statements.push(`UPDATE import_jobs SET status='running', last_page=${checkpointPage},
    checkpoint_json=${sqlLiteral(checkpoint)}, imported_count=imported_count+${parsed.validRecords},
    completed_at=NULL, last_error=NULL, updated_at=${sqlLiteral(now)} WHERE id=${job.id};`);
  return statements.join('\n');
};

const metrics = async () => (await query(`SELECT
  (SELECT imported_count FROM import_jobs WHERE source='${SOURCE}' ORDER BY id DESC LIMIT 1) AS raw_records_scanned,
  (SELECT COUNT(*) FROM character_import_staging WHERE source='${SOURCE}') AS staging_total,
  (SELECT COUNT(*) FROM character_import_staging WHERE source='${SOURCE}' AND status='resolved') AS resolved,
  (SELECT COUNT(*) FROM character_import_staging WHERE source='${SOURCE}' AND status IN ('pending','resolving')) AS pending,
  (SELECT COUNT(*) FROM character_import_staging WHERE source='${SOURCE}' AND status='retry') AS retry_pending,
  (SELECT COUNT(*) FROM character_import_staging WHERE source='${SOURCE}' AND status='failed') AS failed,
  (SELECT COUNT(*) FROM characters) AS characters_total,
  (SELECT COUNT(*) FROM character_sources) AS character_sources_total;`))[0] ?? {};

const checkpointSummary = async () => {
  const job = await latestJob();
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
const fetchNexon = async (pathname, settings, budget) => {
  let lastError;
  for (let attempt = 0; attempt < settings.retryLimit; attempt += 1) {
    if (budget.used >= budget.maximum) throw new RequestBudgetReached('NEXON request budget reached');
    budget.used += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      const response = await fetch(`${NEXON_URL}${pathname}`, {
        headers: { accept: 'application/json', 'x-nxopen-api-key': settings.apiKey },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (response.ok) return await response.json();
      const error = new Error(`NEXON request failed (${response.status})`);
      error.status = response.status;
      error.retryable = response.status === 429 || response.status >= 500;
      if (!error.retryable) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof RequestBudgetReached || error?.retryable === false) throw error;
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
    if (attempt + 1 < settings.retryLimit) await wait(Math.min(30_000, 750 * (2 ** attempt)));
  }
  throw lastError;
};

const normalizeName = (value) => String(value ?? '').trim().normalize('NFC').toLocaleLowerCase('zh-TW');
const resolveCharacter = async (row, settings, budget) => {
  const requestedName = String(row.character_name).trim().normalize('NFC');
  const id = row.ocid ? { ocid: row.ocid } : await fetchNexon(`/id?character_name=${encodeURIComponent(requestedName)}`, settings, budget);
  const basic = await fetchNexon(`/character/basic?ocid=${encodeURIComponent(id.ocid)}`, settings, budget);
  const stat = await fetchNexon(`/character/stat?ocid=${encodeURIComponent(id.ocid)}`, settings, budget);
  const combatPowerValue = stat.final_stat?.find((item) => item.stat_name === '戰鬥力' || item.stat_name === 'Combat Power')?.stat_value;
  const combatPower = Number(String(combatPowerValue ?? '').replaceAll(',', ''));
  const observedAt = new Date().toISOString();
  return {
    ocid: id.ocid,
    characterName: String(basic.character_name || requestedName).normalize('NFC'),
    normalizedName: normalizeName(basic.character_name || requestedName),
    worldName: String(basic.world_name ?? ''),
    jobName: String(basic.character_class ?? ''),
    level: Math.max(0, Math.trunc(Number(basic.character_level) || 0)),
    combatPower: Number.isFinite(combatPower) ? Math.max(0, Math.trunc(combatPower)) : 0,
    characterImage: String(basic.character_image ?? ''),
    guildName: basic.character_guild_name ?? null,
    observedAt,
  };
};

const sourceSql = (character, source, sourceId, observedAt, sourceUpdatedAt, rawJson = null) => `INSERT INTO character_sources (
  ocid, source, source_character_id, source_first_seen_at, source_last_seen_at,
  raw_json, created_at, updated_at, source_updated_at
) VALUES (${sqlLiteral(character.ocid)}, ${sqlLiteral(source)}, ${sqlLiteral(sourceId)}, ${sqlLiteral(observedAt)},
  ${sqlLiteral(observedAt)}, ${sqlLiteral(rawJson)}, ${sqlLiteral(observedAt)}, ${sqlLiteral(observedAt)}, ${sqlLiteral(sourceUpdatedAt)})
ON CONFLICT(ocid, source) DO UPDATE SET
  source_character_id=COALESCE(excluded.source_character_id, character_sources.source_character_id),
  source_first_seen_at=MIN(character_sources.source_first_seen_at, excluded.source_first_seen_at),
  source_last_seen_at=MAX(character_sources.source_last_seen_at, excluded.source_last_seen_at),
  source_updated_at=COALESCE(excluded.source_updated_at, character_sources.source_updated_at),
  raw_json=COALESCE(excluded.raw_json, character_sources.raw_json), updated_at=excluded.updated_at;`;

export const canonicalSql = (row, character) => {
  const sourceMetadata = JSON.stringify({
    worldName: row.world_name,
    jobName: row.job_name,
    level: row.level,
    combatPower: row.combat_power,
  });
  return `INSERT INTO characters (
    ocid, character_name, normalized_name, world_name, job_name, level, combat_power,
    character_image, guild_name, first_seen_at, last_seen_at, nexon_updated_at, created_at, updated_at
  ) VALUES (${sqlLiteral(character.ocid)}, ${sqlLiteral(character.characterName)}, ${sqlLiteral(character.normalizedName)},
    ${sqlLiteral(character.worldName)}, ${sqlLiteral(character.jobName)}, ${character.level}, ${character.combatPower},
    ${sqlLiteral(character.characterImage)}, ${sqlLiteral(character.guildName)}, ${sqlLiteral(character.observedAt)},
    ${sqlLiteral(character.observedAt)}, ${sqlLiteral(character.observedAt)}, ${sqlLiteral(character.observedAt)}, ${sqlLiteral(character.observedAt)})
  ON CONFLICT(ocid) DO UPDATE SET character_name=excluded.character_name, normalized_name=excluded.normalized_name,
    world_name=excluded.world_name, job_name=excluded.job_name, level=excluded.level,
    combat_power=excluded.combat_power, character_image=excluded.character_image, guild_name=excluded.guild_name,
    first_seen_at=MIN(characters.first_seen_at, excluded.first_seen_at),
    last_seen_at=MAX(characters.last_seen_at, excluded.last_seen_at),
    nexon_updated_at=excluded.nexon_updated_at, updated_at=excluded.updated_at;
  ${sourceSql(character, SOURCE, row.source_id, row.observed_at || character.observedAt, row.source_updated_at, sourceMetadata)}
  ${sourceSql(character, 'nexon', character.ocid, character.observedAt, character.observedAt)}
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
  return `UPDATE character_import_staging SET status=${sqlLiteral(retryable ? 'retry' : 'failed')},
    attempt_count=${attempts}, next_retry_at=${sqlLiteral(retryAt)}, last_error=${sqlLiteral(message)}, updated_at=${sqlLiteral(now)} WHERE id=${row.id};
  INSERT INTO import_job_errors (import_job_id, source, source_id, character_name, error_code, error_message, created_at)
  VALUES (${job.id}, '${SOURCE}', ${sqlLiteral(row.source_id)}, ${sqlLiteral(row.character_name)},
    ${sqlLiteral(error?.status ? `http_${error.status}` : 'resolution_failed')}, ${sqlLiteral(message)}, ${sqlLiteral(now)});`;
};

const resolutionRows = (jobId, limit) => query(`SELECT s.id, s.source_id, s.character_name, s.ocid, s.attempt_count,
  s.source_updated_at, s.observed_at, s.world_name, s.job_name, s.level, s.combat_power
FROM character_import_staging s WHERE s.import_job_id=${jobId}
  AND (s.status IN ('pending','resolving') OR (s.status='retry' AND (s.next_retry_at IS NULL OR s.next_retry_at<=${sqlLiteral(new Date().toISOString())})))
ORDER BY s.id LIMIT ${limit};`);

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

const runManualSeedImportCore = async (args) => {
  const directory = optionValue(args, '--dir', DEFAULT_MANUAL_SEED_DIR);
  const throughPage = integer(optionValue(args, '--through-page', Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER, 1);
  const scan = await scanManualSeedDirectory(directory, ({ scanned, total }) => console.error(`scan ${scanned}/${total}`));
  const selected = scan.summaries.filter(({ page }) => page <= throughPage);
  console.log(JSON.stringify({ event: 'scan', ...printScan(scan, selected) }));
  if (args.includes('--dry-run')) return;
  if (!args.includes('--status') && !args.includes('--all')) throw new Error('Choose --status, --dry-run, or --all');

  let job = await latestJob();
  const processed = new Set((checkpointOf(job).processedPages ?? []).map(Number));
  if (args.includes('--status')) {
    console.log(JSON.stringify({
      event: 'status',
      processedPages: processed.size,
      maxProcessedPage: contiguousCheckpoint([...processed]),
      ...await metrics(),
      checkpoint: await checkpointSummary(),
    }));
    return;
  }
  if (scan.invalidFiles.length || scan.duplicatePages.length || scan.invalidRecords > 0) {
    throw new Error('Manual seed validation failed; D1 was not modified');
  }
  if (!job) job = await createJob();
  const expectedTotalPages = Math.max(...scan.schema.totalPages);
  const available = new Map(selected.map((summary) => [summary.page, summary]));
  const firstPending = contiguousCheckpoint([...processed]) + 1;
  const lastSelected = selected.at(-1)?.page ?? 0;
  for (let page = firstPending; page <= lastSelected; page += 1) {
    if (!available.has(page)) throw new Error(`Missing page ${page}; checkpoint was not advanced across the gap`);
  }

  const before = await metrics();
  const newPages = selected.filter(({ page }) => !processed.has(page));
  const pagesPerWrite = integer(process.env.MANUAL_SEED_PAGES_PER_D1_BATCH, 5, 1, 10);
  for (let offset = 0; offset < newPages.length; offset += pagesPerWrite) {
    const statements = [];
    for (const summary of newPages.slice(offset, offset + pagesPerWrite)) {
      const parsed = await readManualSeedPage(summary.absolutePath, summary.page);
      processed.add(summary.page);
      statements.push(pageStagingSql(
        job,
        parsed,
        [...processed].sort((a, b) => a - b),
        summary.filename,
        expectedTotalPages,
        lastSelected,
      ));
    }
    await executeSql(statements.join('\n'));
    console.log(JSON.stringify({ event: 'stage', pagesProcessed: Math.min(offset + pagesPerWrite, newPages.length), totalNewPages: newPages.length, checkpoint: contiguousCheckpoint([...processed]) }));
  }

  const afterStage = await metrics();
  const localEnv = { ...await parseEnvFile(path.resolve('.env')), ...await parseEnvFile(path.resolve('.env.local')), ...process.env };
  const apiKey = localEnv.NEXON_API_KEY || localEnv.VITE_NEXON_API_KEY;
  if (!apiKey) throw new Error('NEXON_API_KEY is required after staging; staging checkpoint was preserved');
  const settings = {
    apiKey,
    concurrency: integer(localEnv.NEXON_CONCURRENCY, 2, 1, 4),
    requestDelayMs: integer(localEnv.NEXON_REQUEST_DELAY_MS, 200, 0, 10_000),
    retryLimit: integer(localEnv.NEXON_RETRY_LIMIT, 5, 1, 8),
    timeoutMs: integer(localEnv.NEXON_REQUEST_TIMEOUT_MS, 10_000, 1000, 30_000),
  };
  const budget = { used: 0, maximum: integer(localEnv.MANUAL_SEED_NEXON_REQUEST_BUDGET, 900, 1, 1_000_000) };
  let budgetReached = false;
  while (!budgetReached && budget.used < budget.maximum) {
    const rows = await resolutionRows(job.id, settings.concurrency);
    if (!rows.length) break;
    const results = await Promise.allSettled(rows.map(async (row, index) => {
      if (index > 0 && settings.requestDelayMs) await wait(index * settings.requestDelayMs);
      return resolveCharacter(row, settings, budget);
    }));
    const statements = [];
    for (let index = 0; index < rows.length; index += 1) {
      const result = results[index];
      if (result.status === 'fulfilled') statements.push(canonicalSql(rows[index], result.value));
      else if (result.reason instanceof RequestBudgetReached) budgetReached = true;
      else statements.push(failureSql(job, rows[index], result.reason, settings.retryLimit));
    }
    if (statements.length) await executeSql(statements.join('\n'));
    if (budget.used % 90 < settings.concurrency * 3) console.log(JSON.stringify({ event: 'resolve', nexonRequestsUsed: budget.used, ...await metrics() }));
  }
  const finalMetrics = await metrics();
  const inserted = Number(afterStage.staging_total) - Number(before.staging_total);
  console.log(JSON.stringify({
    event: 'final',
    manualPartialComplete: newPages.length === 0 || contiguousCheckpoint([...processed]) >= lastSelected,
    overallComplete: contiguousCheckpoint([...processed]) >= expectedTotalPages,
    processedFiles: processed.size,
    processedPages: processed.size,
    maxProcessedPage: contiguousCheckpoint([...processed]),
    stagingInserted: inserted,
    stagingUpdated: Math.max(0, Number(afterStage.raw_records_scanned) - Number(before.raw_records_scanned) - inserted),
    nexonRequestsUsed: budget.used,
    nexonRequestBudget: budget.maximum,
    ...finalMetrics,
    checkpoint: await checkpointSummary(),
  }));
};

export const runManualSeedImport = async (args = process.argv.slice(2)) => {
  try {
    return await runManualSeedImportCore(args);
  } catch (error) {
    if (!(error instanceof D1QuotaReached) && !isD1QuotaError(error)) throw error;
    console.log(JSON.stringify({
      event: 'paused',
      reason: 'd1_daily_row_read_quota',
      checkpointPreserved: true,
      resumeCommand: 'yarn import:maple manual --dir data/manual-character-seed --all',
    }));
    return { paused: true, reason: 'd1_daily_row_read_quota' };
  }
};
