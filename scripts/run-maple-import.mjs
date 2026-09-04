const [sourceArg = '', maxStepsArg = '100'] = process.argv.slice(2);
const source = sourceArg.toLowerCase();
if (source !== 'maplerhouse') {
  throw new Error('Usage: node scripts/run-maple-import.mjs maplerhouse [maxSteps]');
}

const baseUrl = String(process.env.HOLYBEAR_API_BASE_URL || '').replace(/\/+$/, '');
const secret = process.env.IMPORT_ADMIN_SECRET;
if (!baseUrl || !secret) {
  throw new Error('HOLYBEAR_API_BASE_URL and IMPORT_ADMIN_SECRET are required');
}

const maxSteps = Math.max(1, Math.min(10_000, Number.parseInt(maxStepsArg, 10) || 100));
const delayMs = Math.max(0, Number.parseInt(process.env.IMPORT_REQUEST_DELAY_MS || '1000', 10) || 0);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let jobId;
let action = 'stage';

const callImporter = async () => {
  const response = await fetch(`${baseUrl}/api/admin/import/${source}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ action, jobId }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `Importer failed (${response.status})`);
  jobId = payload.job?.id;
  return payload;
};

for (let step = 1; step <= maxSteps; step += 1) {
  const payload = await callImporter();
  const checkpoint = payload.job?.checkpoint_json
    ? JSON.parse(payload.job.checkpoint_json)
    : {};
  console.log(JSON.stringify({
    source,
    jobId,
    action,
    step,
    page: payload.page ?? payload.job?.last_page,
    processed: payload.batch ?? payload.processed ?? 0,
    created: payload.created ?? 0,
    updated: payload.updated ?? 0,
    retry: payload.retry ?? 0,
    failed: payload.failed ?? 0,
    status: payload.job?.status,
  }));

  if (action === 'stage' && checkpoint.stageComplete) action = 'resolve';
  if (payload.job?.status === 'completed') process.exit(0);
  if (action === 'resolve' && payload.processed === 0) {
    console.log(`No resolution rows are ready for job ${jobId}; retry windows and checkpoint were preserved.`);
    process.exit(0);
  }
  if (step < maxSteps && delayMs > 0) await wait(delayMs);
}

console.log(`Checkpoint saved for job ${jobId}; rerun the same command to resume.`);
