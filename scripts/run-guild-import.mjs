// Explicit, bounded operator entrypoint. No scheduler and no automatic new round on resume.
export const runGuildImport = async (args) => {
  const value = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1)
    ?? (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : undefined);
  const positiveInteger = (raw, label) => {
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer`);
    return parsed;
  };
  const start = args.includes('--start');
  const estimate = args.includes('--estimate');
  if (start && args.includes('--status')) throw new Error('--status requires --job and cannot start a round');
  if (estimate && (start || args.some((arg) => arg === '--job' || arg.startsWith('--job=')))) {
    throw new Error('--estimate cannot be combined with --start or --job');
  }
  if (estimate && args.includes('--status')) throw new Error('--estimate cannot be combined with --status');
  const hasJob = args.some((arg) => arg === '--job' || arg.startsWith('--job='));
  if (!estimate && start === hasJob) throw new Error('Choose --start --max-guilds N, or --job ID to resume');
  const maxGuilds = (start || estimate) ? positiveInteger(value('--max-guilds'), '--max-guilds') : undefined;
  if (maxGuilds > 10_000) throw new Error('--max-guilds cannot exceed 10000');
  const base = String(process.env.HOLYBEAR_API_BASE_URL || '').replace(/\/+$/, '');
  const secret = process.env.IMPORT_ADMIN_SECRET;
  if (!base || !secret) throw new Error('HOLYBEAR_API_BASE_URL and IMPORT_ADMIN_SECRET are required');
  if (estimate) {
    const response = await fetch(`${base}/api/admin/import/nexon_guild`, {
      method: 'POST', headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'estimate', maxGuilds }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `Guild estimate failed (${response.status})`);
    console.log(JSON.stringify(payload));
    return;
  }
  const hasSteps = args.some((arg) => arg === '--steps' || arg.startsWith('--steps='));
  const limit = hasSteps ? positiveInteger(value('--steps'), '--steps') : args.includes('--all') ? Infinity : 1;
  let jobId = hasJob ? positiveInteger(value('--job'), '--job') : undefined;
  const call = async (body) => {
    const response = await fetch(`${base}/api/admin/import/nexon_guild`, {
      method: 'POST', headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `Guild importer failed (${response.status}); resume job ${jobId ?? 'from status'}`);
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
    current = await call({ action, jobId });
    if (current.waitingForRetry || (action === 'resolve' && current.processed === 0)) break;
    if (steps + 1 < limit && current.job.status !== 'completed') await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log(`Guild sampling checkpoint preserved. Resume with: npm run import:maple -- nexon_guild --job ${jobId} --steps 1`);
};
