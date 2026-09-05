import { loadManualImportEnvironment } from './manual-import-config.mjs';
import { clearRuntimeState, stopRequested, updateRuntimeState } from './manual-import-runtime.mjs';

const projectRoot = process.cwd();
const environment = await loadManualImportEnvironment({ cwd: projectRoot });
const baseUrl = String(environment.HOLYBEAR_API_BASE_URL || 'https://holybear.tw').replace(/\/+$/, '');
const secret = environment.IMPORT_ADMIN_SECRET;
if (!secret) throw new Error('IMPORT_ADMIN_SECRET is required');

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const idleDelayMs = Math.max(5_000, Number.parseInt(environment.ACCOUNT_SIGNAL_BACKFILL_IDLE_DELAY_MS || '30000', 10));
const requestDelayMs = Math.max(250, Number.parseInt(environment.ACCOUNT_SIGNAL_BACKFILL_REQUEST_DELAY_MS || '1000', 10));
let batches = 0;
let processed = 0;
let completed = 0;
let retry = 0;
let failed = 0;
let signals = 0;

const saveState = (extra = {}) => updateRuntimeState({
  pid: process.pid,
  startedAt: process.env.ACCOUNT_SIGNAL_BACKFILL_STARTED_AT || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  baseUrl,
  batches,
  processed,
  completed,
  retry,
  failed,
  signals,
  ...extra,
}, projectRoot);

const requestBatch = async () => {
  const response = await fetch(`${baseUrl}/api/admin/account-signals/backfill`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, accept: 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Account signal backfill failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
};

saveState({ status: 'running' });
try {
  while (!stopRequested(projectRoot)) {
    let payload;
    try {
      payload = await requestBatch();
    } catch (error) {
      const retryable = error?.status === 429 || error?.status >= 500;
      saveState({ status: retryable ? 'waiting' : 'failed', lastError: String(error?.message || error) });
      if (!retryable) throw error;
      await wait(idleDelayMs);
      continue;
    }

    batches += 1;
    processed += Number(payload.processed) || 0;
    completed += Number(payload.completed) || 0;
    retry += Number(payload.retry) || 0;
    failed += Number(payload.failed) || 0;
    signals += Number(payload.signals) || 0;
    saveState({
      status: payload.processed === 0 ? 'waiting' : 'running',
      sourceImportRunning: Boolean(payload.sourceImportRunning),
      sourcePending: Number(payload.sourcePending) || 0,
      lastBatch: payload,
      lastError: null,
    });
    process.stdout.write(`${JSON.stringify({ event: 'account-signal-backfill', batches, ...payload })}\n`);

    if (payload.processed === 0) {
      if (!payload.sourceImportRunning) break;
      await wait(idleDelayMs);
    } else {
      await wait(requestDelayMs);
    }
  }
  saveState({ status: stopRequested(projectRoot) ? 'stopped' : 'completed', completedAt: new Date().toISOString() });
} finally {
  if (process.env.HOLYBEAR_ACCOUNT_SIGNAL_BACKGROUND === '1') clearRuntimeState(process.pid, projectRoot);
}
