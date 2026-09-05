import path from 'node:path';
import { readRuntimeState } from './manual-import-runtime.mjs';

process.env.HOLYBEAR_IMPORT_RUNTIME_DIR = path.join(process.cwd(), '.wrangler', 'account-signal-backfill');
console.log(JSON.stringify(readRuntimeState(process.cwd()), null, 2));
