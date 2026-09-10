const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000];
export const GUILD_CLI_RESOLVER_DEFAULTS = Object.freeze({ batchSize: 64, concurrency: 12 });
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestFailure = (message, details = {}) => Object.assign(new Error(message), details);
const errorType = (error) => {
  if (error?.status) return `http_${error.status}`;
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return 'timeout';
  return 'network_error';
};

export const requestGuildImporter = async ({
  base,
  secret,
  body,
  jobId,
  fetchImpl = globalThis.fetch,
  sleep = wait,
  warn = console.warn,
  maxAttempts = RETRY_DELAYS_MS.length + 1,
  timeoutMs = Math.max(1_000, Number(process.env.GUILD_CLI_REQUEST_TIMEOUT_MS) || 120_000),
}) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(`${base}/api/admin/import/nexon_guild`, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return payload;
      throw requestFailure(
        payload?.error?.message || `Guild importer failed (${response.status})`,
        { status: response.status, code: payload?.error?.code || null },
      );
    } catch (error) {
      lastError = error;
      const status = Number(error?.status) || null;
      const transient = status === 429 || (status !== null && status >= 500 && status <= 599)
        || status === null;
      if (!transient) throw error;
      if (attempt >= maxAttempts) break;
      const delayMs = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
      warn(JSON.stringify({
        event: 'guild_cli_retry',
        jobId: jobId ?? null,
        status,
        code: error?.code ?? null,
        errorType: errorType(error),
        attempt,
        maxAttempts,
        nextRetryDelayMs: delayMs,
      }));
      await sleep(delayMs);
    }
  }
  const statusOrCode = lastError?.status || lastError?.code || errorType(lastError);
  throw requestFailure(
    `Guild importer job ${jobId ?? 'unknown'} transient failure (${statusOrCode}); ${maxAttempts} attempts exhausted. `
      + `Resume safely with --job ${jobId ?? '<id>'} --all.`,
    { status: lastError?.status, code: lastError?.code, cause: lastError },
  );
};

// Explicit, bounded operator entrypoint. It never creates a new round while resuming.
export const runGuildImport = async (args, dependencies = {}) => {
  const value = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1)
    ?? (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : undefined);
  const positiveInteger = (raw, label) => {
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer`);
    return parsed;
  };
  const start = args.includes('--start');
  const estimate = args.includes('--estimate');
  const allKnown = args.includes('--all-known');
  const batchSize = value('--batch-size') === undefined
    ? GUILD_CLI_RESOLVER_DEFAULTS.batchSize : positiveInteger(value('--batch-size'), '--batch-size');
  const concurrency = value('--concurrency') === undefined
    ? GUILD_CLI_RESOLVER_DEFAULTS.concurrency : positiveInteger(value('--concurrency'), '--concurrency');
  if (batchSize !== undefined && ![32, 64].includes(batchSize)) throw new Error('--batch-size must be 32 or 64');
  if (concurrency !== undefined && ![8, 12, 16].includes(concurrency)) throw new Error('--concurrency must be 8, 12, or 16');
  if (start && args.includes('--status')) throw new Error('--status requires --job and cannot start a round');
  if (estimate && (start || args.some((arg) => arg === '--job' || arg.startsWith('--job=')))) {
    throw new Error('--estimate cannot be combined with --start or --job');
  }
  if (estimate && args.includes('--status')) throw new Error('--estimate cannot be combined with --status');
  if (allKnown && !estimate) throw new Error('--all-known requires --estimate');
  const hasJob = args.some((arg) => arg === '--job' || arg.startsWith('--job='));
  if (!estimate && start === hasJob) throw new Error('Choose --start --max-guilds N, or --job ID to resume');
  if (allKnown && value('--max-guilds') !== undefined) throw new Error('--all-known cannot be combined with --max-guilds');
  const maxGuilds = (start || (estimate && !allKnown)) ? positiveInteger(value('--max-guilds'), '--max-guilds') : undefined;
  if (maxGuilds !== undefined && maxGuilds > 10_000) throw new Error('--max-guilds cannot exceed 10000');
  const base = String(process.env.HOLYBEAR_API_BASE_URL || '').replace(/\/+$/, '');
  const secret = process.env.IMPORT_ADMIN_SECRET;
  if (!base || !secret) throw new Error('HOLYBEAR_API_BASE_URL and IMPORT_ADMIN_SECRET are required');
  if (estimate) {
    const payload = await requestGuildImporter({
      base, secret, body: { action: 'estimate', ...(allKnown ? { allKnown: true } : { maxGuilds }) },
      fetchImpl: dependencies.fetchImpl, sleep: dependencies.sleep, warn: dependencies.warn,
    });
    console.log(JSON.stringify(payload));
    return;
  }
  const hasSteps = args.some((arg) => arg === '--steps' || arg.startsWith('--steps='));
  const limit = hasSteps ? positiveInteger(value('--steps'), '--steps') : args.includes('--all') ? Infinity : 1;
  let jobId = hasJob ? positiveInteger(value('--job'), '--job') : undefined;
  const call = async (body) => {
    const payload = await requestGuildImporter({
      base, secret, body, jobId,
      fetchImpl: dependencies.fetchImpl, sleep: dependencies.sleep, warn: dependencies.warn,
    });
    jobId = payload.job.id;
    console.log(JSON.stringify({ action: body.action, ...payload }));
    return payload;
  };
  let current = await call(start ? { action: 'start', maxGuilds } : { action: 'status', jobId });
  if (args.includes('--status')) return;
  // Steps count mutations, including start. Status reads do not consume a step.
  for (let steps = start ? 1 : 0; steps < limit && current.job.status !== 'completed'; steps += 1) {
    const checkpoint = current.job.checkpoint_json ? JSON.parse(current.job.checkpoint_json) : {};
    const action = checkpoint.stageComplete ? 'resolve' : 'stage';
    current = await call({ action, jobId, ...(action === 'resolve' ? { batchSize, concurrency } : {}) });
    if (current.waitingForRetry || (action === 'resolve' && current.processed === 0)) break;
    if (steps + 1 < limit && current.job.status !== 'completed') await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log(`Guild sampling checkpoint preserved. Resume with: npm run import:maple -- nexon_guild --job ${jobId} --steps 1 --batch-size ${batchSize} --concurrency ${concurrency}`);
};
