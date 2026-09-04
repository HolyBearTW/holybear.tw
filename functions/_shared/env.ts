export interface Env {
  DB: D1Database;
  NEXON_API_KEY?: string;
  IMPORT_ADMIN_SECRET?: string;
  CHARACTER_FRESHNESS_SECONDS?: string;
  IMPORT_SOURCE_PAGE_SIZE?: string;
  NEXON_RESOLUTION_BATCH_SIZE?: string;
  NEXON_CONCURRENCY?: string;
  NEXON_REQUEST_DELAY_MS?: string;
  NEXON_RETRY_LIMIT?: string;
  NEXON_REQUEST_TIMEOUT_MS?: string;
  IMPORT_D1_READ_BUDGET?: string;
  IMPORT_D1_WRITE_BUDGET?: string;
  RANKING_SNAPSHOT_SIZE?: string;
}

export type AppPagesFunction<Params extends string = string> = PagesFunction<Env, Params>;
