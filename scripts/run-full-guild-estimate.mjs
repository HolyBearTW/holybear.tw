import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { loadManualImportEnvironment } from './manual-import-config.mjs';
import { createLocalNexonRateLimiter } from './nexon-request-limiter.mjs';

const DATABASE = 'holybear-maple-db';
const NEXON_URL = 'https://open.api.nexon.com/maplestorytw/v1';
const STATE_VERSION = 1;
const ERROR_KEYS = ['429', '403', 'timeout', '5xx', 'retry'];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const integer = (value, fallback, minimum, maximum) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

const optionValue = (args, name, fallback) => {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const normalizeName = (value) => String(value ?? '').trim().normalize('NFC').toLocaleLowerCase('zh-TW');
const memberKey = (worldName, characterName) => `${worldName}\u0000${normalizeName(characterName)}`;
const emptyErrors = () => ({ 429: 0, 403: 0, timeout: 0, '5xx': 0, retry: 0 });

export class GuildEstimateRequestError extends Error {
  constructor(message, status = null, retryable = false, code = 'guild_estimate_request_failed') {
    super(message);
    this.name = 'GuildEstimateRequestError';
    this.status = status;
    this.retryable = retryable;
    this.code = code;
  }
}

export const validateGuildRoster = (candidate, basic) => {
  if (basic?.world_name !== candidate.world_name || basic?.guild_name !== candidate.guild_name
    || !Array.isArray(basic?.guild_member) || !Number.isSafeInteger(basic?.guild_member_count)
    || basic.guild_member_count !== basic.guild_member.length
    || basic.guild_member.some((name) => typeof name !== 'string' || !name.trim())
    || (basic.date != null && !Number.isFinite(Date.parse(basic.date)))) {
    throw new GuildEstimateRequestError(
      'Official guild roster is incomplete or has a mismatched identity',
      null,
      false,
      'invalid_guild_roster',
    );
  }
  return [...new Set(basic.guild_member.map((name) => memberKey(candidate.world_name, name)))];
};

const runWithConcurrency = async (items, concurrency, task) => {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }));
  return results;
};

export const runGuildEstimateBatch = async (candidates, { fetchJson, concurrency = 4 }) => {
  const startedAt = Date.now();
  const results = await runWithConcurrency(candidates, concurrency, async (candidate) => {
    const params = new URLSearchParams({ guild_name: candidate.guild_name, world_name: candidate.world_name });
    const id = await fetchJson(`/guild/id?${params}`);
    if (typeof id?.oguild_id !== 'string' || !id.oguild_id.trim()) {
      throw new GuildEstimateRequestError('NEXON did not return a guild ID', null, false, 'missing_guild_id');
    }
    const basic = await fetchJson(`/guild/basic?oguild_id=${encodeURIComponent(id.oguild_id)}`);
    const uniqueMembers = validateGuildRoster(candidate, basic);
    return {
      rosterTotal: basic.guild_member.length,
      uniqueMembers,
    };
  });
  const uniqueMembers = new Set();
  const failedGuilds = [];
  let rosterTotal = 0;
  let successfulGuilds = 0;
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const candidate = candidates[index];
    if (result.status === 'fulfilled') {
      successfulGuilds += 1;
      rosterTotal += result.value.rosterTotal;
      for (const key of result.value.uniqueMembers) uniqueMembers.add(key);
      continue;
    }
    const error = result.reason;
    if (error instanceof GuildEstimateRequestError && (error.status === 401 || error.status === 403)) throw error;
    failedGuilds.push({
      worldName: candidate.world_name,
      guildName: candidate.guild_name,
      message: error instanceof Error ? error.message : String(error),
      status: error instanceof GuildEstimateRequestError ? error.status : null,
      code: error instanceof GuildEstimateRequestError ? error.code : 'unexpected_error',
    });
  }
  return {
    attemptedGuilds: candidates.length,
    successfulGuilds,
    failedGuilds,
    rosterTotal,
    uniqueMembers: [...uniqueMembers],
    elapsedMs: Date.now() - startedAt,
  };
};

export const aggregateGuildEstimate = (batches, existingKeys, activeElapsedMs = 0) => {
  const unique = new Set();
  const failedGuilds = [];
  const errorStats = emptyErrors();
  let attemptedGuilds = 0;
  let successfulGuilds = 0;
  let guildApiRequests = 0;
  let rosterTotal = 0;
  let elapsedMs = activeElapsedMs;
  for (const batch of batches) {
    attemptedGuilds += Number(batch.attemptedGuilds) || 0;
    successfulGuilds += Number(batch.successfulGuilds) || 0;
    guildApiRequests += Number(batch.guildApiRequests) || 0;
    rosterTotal += Number(batch.rosterTotal) || 0;
    elapsedMs += Number(batch.elapsedMs) || 0;
    failedGuilds.push(...(batch.failedGuilds || []));
    for (const key of batch.uniqueMembers || []) unique.add(key);
    for (const key of ERROR_KEYS) errorStats[key] += Number(batch.errorStats?.[key]) || 0;
  }
  const existingCharacters = [...unique].filter((key) => existingKeys.has(key)).length;
  const U = unique.size - existingCharacters;
  const failureReasons = {};
  for (const failure of failedGuilds) {
    const key = failure.code || failure.message || 'unknown_error';
    failureReasons[key] = (failureReasons[key] || 0) + 1;
  }
  return {
    attemptedGuilds,
    successfulGuilds,
    failedGuilds: failedGuilds.length,
    failures: failedGuilds,
    failureReasons,
    guildApiRequests,
    rosterTotal,
    deduplicatedCharacters: unique.size,
    existingCharacters,
    U,
    newCharacterRatio: unique.size > 0 ? U / unique.size : 0,
    estimatedCharacterApiRequests: U * 3,
    elapsedMs,
    errorStats,
  };
};

const parseWranglerJson = (output) => {
  const start = output.indexOf('[');
  if (start < 0) throw new Error(`Wrangler did not return JSON: ${output.slice(0, 300)}`);
  return JSON.parse(output.slice(start));
};

export const createUtf8ChunkDecoder = () => {
  const decoder = new StringDecoder('utf8');
  return {
    write: (chunk) => decoder.write(chunk),
    end: () => decoder.end(),
  };
};

export const assertValidUtf8Snapshot = (label, value) => {
  const invalid = [];
  const visit = (current) => {
    if (typeof current === 'string' && current.includes('\uFFFD')) invalid.push(current);
    else if (Array.isArray(current)) current.forEach(visit);
    else if (current && typeof current === 'object') Object.values(current).forEach(visit);
  };
  visit(value);
  if (invalid.length > 0) {
    throw new Error(`${label} contains Unicode replacement characters; rerun with --reset to rebuild the snapshot`);
  }
};

const wranglerPath = (environment) => [
  path.resolve('node_modules', 'wrangler', 'bin', 'wrangler.js'),
  environment.APPDATA && path.join(environment.APPDATA, 'npm', 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
  environment.npm_config_prefix && path.join(environment.npm_config_prefix, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
].filter(Boolean).find((candidate) => existsSync(candidate));

const queryProductionD1 = async (environment, sql) => {
  const executable = wranglerPath(environment);
  if (!executable) throw new Error('Wrangler CLI was not found');
  const output = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [executable, 'd1', 'execute', DATABASE,
      '--remote', '--env', 'production', '--json', '--yes', '--command', sql], {
      cwd: process.cwd(), env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdoutDecoder = createUtf8ChunkDecoder();
    const stderrDecoder = createUtf8ChunkDecoder();
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += stdoutDecoder.write(chunk); });
    child.stderr.on('data', (chunk) => { stderr += stderrDecoder.write(chunk); });
    child.on('error', reject);
    child.on('close', (code) => {
      stdout += stdoutDecoder.end();
      stderr += stderrDecoder.end();
      if (code === 0) resolve(stdout);
      else reject(new Error(`Wrangler D1 read failed (${code}): ${(stderr || stdout).slice(-1500)}`));
    });
  });
  return parseWranglerJson(output).flatMap((entry) => entry.results || []);
};

const atomicJson = async (filename, value) => {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try {
    await rename(temporary, filename);
  } catch (error) {
    if (error?.code !== 'EEXIST' && error?.code !== 'EPERM') throw error;
    await rm(filename, { force: true });
    await rename(temporary, filename);
  }
};

const readJson = async (filename) => JSON.parse(await readFile(filename, 'utf8'));
export const fullGuildEstimateStatePaths = (cwd = process.cwd()) => {
  const directory = path.join(cwd, '.wrangler', 'full-guild-estimate');
  return {
    directory,
    state: path.join(directory, 'latest.json'),
    candidates: path.join(directory, 'candidates.json'),
    existing: path.join(directory, 'existing-character-keys.json'),
    batches: path.join(directory, 'batches'),
  };
};

const batchFilename = (directory, offset) => path.join(directory, `${String(offset).padStart(6, '0')}.json`);

export const advanceEstimateState = (state, committedBatch, timestamp = new Date().toISOString()) => {
  if (Number(committedBatch.offset) !== Number(state.nextOffset)
    || !Number.isSafeInteger(committedBatch.attemptedGuilds)
    || committedBatch.attemptedGuilds < 1) {
    throw new Error('Committed estimate batch does not match the current checkpoint');
  }
  return {
    ...state,
    status: 'running',
    nextOffset: state.nextOffset + committedBatch.attemptedGuilds,
    updatedAt: timestamp,
    currentBatch: null,
    lastError: null,
  };
};

const createOfficialFetcher = (environment, rateLimiter, metrics) => async (requestPath) => {
  let lastError = null;
  const retryLimit = integer(environment.NEXON_RETRY_LIMIT, 5, 1, 8);
  const timeoutMs = integer(environment.NEXON_REQUEST_TIMEOUT_MS, 10_000, 1_000, 30_000);
  for (let attempt = 0; attempt < retryLimit; attempt += 1) {
    if (attempt > 0) metrics.errorStats.retry += 1;
    await rateLimiter.acquire();
    metrics.guildApiRequests += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${NEXON_URL}${requestPath}`, {
        headers: { accept: 'application/json', 'x-nxopen-api-key': environment.NEXON_API_KEY },
        cache: 'no-store', signal: controller.signal,
      });
      if (response.ok) return response.json();
      if (response.status === 429) metrics.errorStats[429] += 1;
      else if (response.status === 403) metrics.errorStats[403] += 1;
      else if (response.status >= 500) metrics.errorStats['5xx'] += 1;
      const retryable = response.status === 429 || response.status >= 500;
      const error = new GuildEstimateRequestError(
        `NEXON guild API failed (${response.status})`, response.status, retryable,
        response.status === 429 ? 'rate_limited' : response.status >= 500 ? 'server_error' : 'request_rejected',
      );
      if (!retryable) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof GuildEstimateRequestError && !error.retryable) throw error;
      if (error?.name === 'AbortError') {
        metrics.errorStats.timeout += 1;
        lastError = new GuildEstimateRequestError('NEXON guild API timeout', null, true, 'timeout');
      } else if (!(error instanceof GuildEstimateRequestError)) {
        lastError = new GuildEstimateRequestError(
          error instanceof Error ? error.message : String(error), null, true, 'network_error',
        );
      }
    } finally {
      clearTimeout(timeout);
    }
    if (attempt + 1 < retryLimit) await wait(Math.min(30_000, 500 * (2 ** attempt)));
  }
  throw lastError || new GuildEstimateRequestError('NEXON guild API failed', null, true);
};

const loadBatches = async (paths, nextOffset, batchSize) => {
  const batches = [];
  for (let offset = 0; offset < nextOffset; offset += batchSize) {
    batches.push(await readJson(batchFilename(paths.batches, offset)));
  }
  return batches;
};

export const runFullGuildEstimate = async (args = process.argv.slice(2)) => {
  if (!args.includes('--execute')) {
    throw new Error('Read-only full estimate requires explicit --execute');
  }
  const cwd = process.cwd();
  const paths = fullGuildEstimateStatePaths(cwd);
  if (args.includes('--reset')) await rm(paths.directory, { recursive: true, force: true });
  const environment = { ...process.env, ...await loadManualImportEnvironment({ cwd }) };
  environment.NEXON_API_KEY ||= environment.VITE_NEXON_API_KEY;
  if (!environment.NEXON_API_KEY) throw new Error('NEXON_API_KEY is required');
  const requestedBatchSize = integer(optionValue(args, '--batch-size', 100), 100, 1, 500);
  const concurrency = integer(optionValue(args, '--concurrency', 4), 4, 1, 16);
  const globalRateLimit = integer(optionValue(
    args, '--global-rate-limit', environment.NEXON_GLOBAL_RPS_LIMIT || 50,
  ), 50, 1, 450);
  let state;
  let candidates;
  let existingKeys;
  if (existsSync(paths.state)) {
    state = await readJson(paths.state);
    if (state.version !== STATE_VERSION) throw new Error('Unsupported full estimate state version');
    if (state.batchSize !== requestedBatchSize) throw new Error(`Resume requires --batch-size ${state.batchSize}`);
    candidates = await readJson(paths.candidates);
    existingKeys = new Set(await readJson(paths.existing));
    assertValidUtf8Snapshot('Guild estimate candidates', candidates);
    assertValidUtf8Snapshot('Guild estimate existing-character keys', [...existingKeys]);
  } else {
    const snapshotStartedAt = Date.now();
    candidates = await queryProductionD1(environment, `SELECT world_name, guild_name FROM characters
      WHERE guild_name IS NOT NULL AND TRIM(guild_name) <> '' AND TRIM(world_name) <> ''
      GROUP BY world_name, guild_name ORDER BY world_name, guild_name;`);
    const existingRows = await queryProductionD1(environment,
      'SELECT world_name, normalized_name FROM characters ORDER BY world_name, normalized_name;');
    existingKeys = new Set(existingRows.map((row) => `${row.world_name}\u0000${row.normalized_name}`));
    assertValidUtf8Snapshot('Guild estimate candidates', candidates);
    assertValidUtf8Snapshot('Guild estimate existing-character keys', [...existingKeys]);
    await atomicJson(paths.candidates, candidates);
    await atomicJson(paths.existing, [...existingKeys]);
    state = {
      version: STATE_VERSION,
      status: 'running',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      batchSize: requestedBatchSize,
      concurrency,
      globalRateLimit,
      candidateCount: candidates.length,
      existingCharacterBaseline: existingKeys.size,
      nextOffset: 0,
      snapshotElapsedMs: Date.now() - snapshotStartedAt,
    };
    await atomicJson(paths.state, state);
  }
  const activeConcurrency = Number(state.concurrency) || concurrency;
  const activeGlobalRateLimit = Number(state.globalRateLimit) || globalRateLimit;
  const rateLimiter = createLocalNexonRateLimiter(activeGlobalRateLimit);
  while (state.nextOffset < candidates.length) {
    const offset = state.nextOffset;
    const existingBatchFile = batchFilename(paths.batches, offset);
    if (existsSync(existingBatchFile)) {
      const committed = await readJson(existingBatchFile);
      state = advanceEstimateState(state, committed);
      await atomicJson(paths.state, state);
      continue;
    }
    const chunk = candidates.slice(offset, offset + state.batchSize);
    state = { ...state, status: 'running', updatedAt: new Date().toISOString(),
      currentBatch: { offset, size: chunk.length }, lastError: null };
    await atomicJson(paths.state, state);
    const metrics = { guildApiRequests: 0, errorStats: emptyErrors() };
    try {
      const result = await runGuildEstimateBatch(chunk, {
        concurrency: activeConcurrency,
        fetchJson: createOfficialFetcher(environment, rateLimiter, metrics),
      });
      const batch = { offset, ...result, guildApiRequests: metrics.guildApiRequests, errorStats: metrics.errorStats };
      await atomicJson(existingBatchFile, batch);
      state = advanceEstimateState(state, batch);
      const batches = await loadBatches(paths, state.nextOffset, state.batchSize);
      state.summary = aggregateGuildEstimate(batches, existingKeys, state.snapshotElapsedMs);
      await atomicJson(paths.state, state);
      console.log(JSON.stringify({ event: 'guild-estimate-batch', offset, size: chunk.length,
        nextOffset: state.nextOffset, total: candidates.length,
        batch: {
          attemptedGuilds: batch.attemptedGuilds,
          successfulGuilds: batch.successfulGuilds,
          failedGuilds: batch.failedGuilds.length,
          guildApiRequests: batch.guildApiRequests,
          rosterTotal: batch.rosterTotal,
          deduplicatedCharacters: batch.uniqueMembers.length,
          elapsedMs: batch.elapsedMs,
          errorStats: batch.errorStats,
        },
        summary: state.summary }));
    } catch (error) {
      state = { ...state, status: 'failed', updatedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : String(error),
        lastAttemptMetrics: metrics };
      await atomicJson(paths.state, state);
      throw error;
    }
  }
  const batches = await loadBatches(paths, state.nextOffset, state.batchSize);
  const summary = aggregateGuildEstimate(batches, existingKeys, state.snapshotElapsedMs);
  state = { ...state, status: 'completed', completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), currentBatch: null, summary };
  await atomicJson(paths.state, state);
  console.log(JSON.stringify({ event: 'guild-estimate-completed', ...summary }));
  return summary;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runFullGuildEstimate().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
