import path from 'node:path';
import { BACKGROUND_JOB_IDS, disableBackgroundJob } from './background-watchdog-state.mjs';
import { requestStop } from './manual-import-runtime.mjs';

const projectRoot = process.cwd();
disableBackgroundJob(BACKGROUND_JOB_IDS.accountSignals, projectRoot);
process.env.HOLYBEAR_IMPORT_RUNTIME_DIR = path.join(projectRoot, '.wrangler', 'account-signal-backfill');
console.log(JSON.stringify(requestStop(projectRoot)));
