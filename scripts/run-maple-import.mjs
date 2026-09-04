const args = process.argv.slice(2);
const source = String(args[0] || '').toLowerCase();
if (source === 'manual') {
  const { runManualSeedImport } = await import('./run-manual-seed-import.mjs');
  await runManualSeedImport(args.slice(1));
  process.exit(0);
}
const fullMode = args.includes('--all') || args.includes('--until-complete');
const numericLimit = args.slice(1).find((argument) => /^\d+$/.test(argument));
if (source !== 'maplerhouse') {
  throw new Error('Usage: yarn import:maple <maplerhouse|manual> [steps|--all]');
}

const baseUrl = String(process.env.HOLYBEAR_API_BASE_URL || '').replace(/\/+$/, '');
const secret = process.env.IMPORT_ADMIN_SECRET;
if (!baseUrl || !secret) throw new Error('HOLYBEAR_API_BASE_URL and IMPORT_ADMIN_SECRET are required');

const maxRequests = fullMode
  ? Math.max(0, Number.parseInt(process.env.IMPORT_MAX_REQUESTS_PER_RUN || '0', 10) || 0)
  : Math.max(1, Math.min(10_000, Number.parseInt(numericLimit || '100', 10)));
const delayMs = Math.max(0, Number.parseInt(process.env.IMPORT_REQUEST_DELAY_MS || '1000', 10) || 0);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let requestsUsed = 0;

const apiRequest = async (requestPath, init = {}) => {
  const response = await fetch(`${baseUrl}${requestPath}`, {
    ...init,
    headers: {
      authorization: `Bearer ${secret}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Importer failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
};

const status = () => apiRequest('/api/admin/import/status');
const latestJob = (jobs) => jobs.find((job) => job.source === source);
const checkpointOf = (job) => job?.checkpoint_json ? JSON.parse(job.checkpoint_json) : {};
const canContinue = () => maxRequests === 0 || requestsUsed < maxRequests;
const callImporter = async (action, jobId) => {
  requestsUsed += 1;
  return apiRequest(`/api/admin/import/${source}`, {
    method: 'POST',
    body: JSON.stringify({ action, jobId }),
  });
};
const logProgress = (action, payload) => console.log(JSON.stringify({
  source,
  jobId: payload.job?.id,
  action,
  page: payload.page ?? payload.job?.last_page,
  processed: payload.batch ?? payload.processed ?? 0,
  created: payload.created ?? 0,
  updated: payload.updated ?? 0,
  retry: payload.retry ?? 0,
  failed: payload.failed ?? 0,
  status: payload.job?.status,
  requestsUsed,
}));

const stageSource = async () => {
  const snapshot = await status();
  let job = latestJob(snapshot.jobs);
  if (job?.status === 'completed' || checkpointOf(job).stageComplete) return job;
  while (canContinue()) {
    const payload = await callImporter('stage', job?.id);
    job = payload.job;
    logProgress('stage', payload);
    if (checkpointOf(job).stageComplete) return job;
    if (delayMs > 0) await wait(delayMs);
  }
  return job;
};

const resolveSource = async () => {
  const snapshot = await status();
  let job = latestJob(snapshot.jobs);
  if (!job || job.status === 'completed' || !checkpointOf(job).stageComplete) return job;
  while (canContinue()) {
    const payload = await callImporter('resolve', job.id);
    job = payload.job;
    logProgress('resolve', payload);
    if (job?.status === 'completed') return job;
    if (payload.processed === 0) {
      console.log(`No ${source} resolution rows are ready; retry checkpoint is preserved.`);
      return job;
    }
    if (delayMs > 0) await wait(delayMs);
  }
  return job;
};

try {
  if (canContinue()) await stageSource();
  if (canContinue()) await resolveSource();
} catch (error) {
  const retryable = error.status === 429 || error.status >= 500;
  console.error(`Seed stopped safely after ${requestsUsed} requests: ${error.message}`);
  console.error('The server-side checkpoint and error record were preserved; rerun the same command to resume.');
  process.exitCode = retryable ? 0 : 1;
}

const finalStatus = await status().catch(() => null);
if (finalStatus) console.log(JSON.stringify({ requestsUsed, ...finalStatus.metrics }));
if (!canContinue()) console.log('Per-run request budget reached; rerun the same command to resume.');
