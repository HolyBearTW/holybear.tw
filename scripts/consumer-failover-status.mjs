import { loadManualImportEnvironment } from './manual-import-config.mjs';

const environment = { ...process.env, ...await loadManualImportEnvironment({ cwd: process.cwd() }) };
const baseUrl = String(environment.HOLYBEAR_API_BASE_URL || 'https://holybear.tw').replace(/\/$/, '');
const secret = environment.CONSUMER_FALLBACK_SECRET;
if (!secret) throw new Error('CONSUMER_FALLBACK_SECRET is required');

const response = await fetch(`${baseUrl}/api/internal/consumer/status`, {
  headers: { authorization: `Bearer ${secret}`, accept: 'application/json' },
  cache: 'no-store',
});
const payload = await response.json().catch(() => null);
if (!response.ok) {
  throw new Error(`Consumer status failed (${response.status}): ${JSON.stringify(payload)}`);
}
console.log(JSON.stringify(payload, null, 2));
