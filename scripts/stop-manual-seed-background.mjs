import { requestStop } from './manual-import-runtime.mjs';
import { BACKGROUND_JOB_IDS, disableBackgroundJob } from './background-watchdog-state.mjs';

disableBackgroundJob(BACKGROUND_JOB_IDS.manualImport);
console.log(JSON.stringify(requestStop()));
