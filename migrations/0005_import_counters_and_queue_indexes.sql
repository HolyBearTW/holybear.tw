PRAGMA foreign_keys = ON;

ALTER TABLE import_jobs ADD COLUMN staging_inserted_count INTEGER NOT NULL DEFAULT 0 CHECK (staging_inserted_count >= 0);
ALTER TABLE import_jobs ADD COLUMN staging_updated_count INTEGER NOT NULL DEFAULT 0 CHECK (staging_updated_count >= 0);
ALTER TABLE import_jobs ADD COLUMN resolved_count INTEGER NOT NULL DEFAULT 0 CHECK (resolved_count >= 0);
ALTER TABLE import_jobs ADD COLUMN pending_count INTEGER NOT NULL DEFAULT 0 CHECK (pending_count >= 0);
ALTER TABLE import_jobs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0);
ALTER TABLE import_jobs ADD COLUMN created_count INTEGER NOT NULL DEFAULT 0 CHECK (created_count >= 0);
ALTER TABLE import_jobs ADD COLUMN nexon_request_count INTEGER NOT NULL DEFAULT 0 CHECK (nexon_request_count >= 0);
ALTER TABLE import_jobs ADD COLUMN d1_budget_date TEXT;
ALTER TABLE import_jobs ADD COLUMN d1_rows_read_estimate INTEGER NOT NULL DEFAULT 0 CHECK (d1_rows_read_estimate >= 0);
ALTER TABLE import_jobs ADD COLUMN d1_rows_written_estimate INTEGER NOT NULL DEFAULT 0 CHECK (d1_rows_written_estimate >= 0);

-- One-time reconciliation for jobs created before incremental counters existed.
-- Aggregate staging once instead of issuing several correlated COUNT scans.
CREATE TABLE migration_0005_import_counter_backfill AS
SELECT import_job_id,
  COUNT(*) AS staging_inserted_count,
  SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
  SUM(CASE WHEN status IN ('pending', 'resolving') THEN 1 ELSE 0 END) AS pending_count,
  SUM(CASE WHEN status = 'retry' THEN 1 ELSE 0 END) AS retry_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count
FROM character_import_staging
WHERE import_job_id IS NOT NULL
GROUP BY import_job_id;

UPDATE import_jobs
SET staging_inserted_count = COALESCE((
      SELECT staging_inserted_count FROM migration_0005_import_counter_backfill b WHERE b.import_job_id = import_jobs.id
    ), 0),
    staging_updated_count = MAX(0, imported_count - COALESCE((
      SELECT staging_inserted_count FROM migration_0005_import_counter_backfill b WHERE b.import_job_id = import_jobs.id
    ), 0)),
    resolved_count = COALESCE((SELECT resolved_count FROM migration_0005_import_counter_backfill b WHERE b.import_job_id = import_jobs.id), 0),
    pending_count = COALESCE((SELECT pending_count FROM migration_0005_import_counter_backfill b WHERE b.import_job_id = import_jobs.id), 0),
    retry_count = COALESCE((SELECT retry_count FROM migration_0005_import_counter_backfill b WHERE b.import_job_id = import_jobs.id), 0),
    failed_count = MAX(failed_count, COALESCE((SELECT failed_count FROM migration_0005_import_counter_backfill b WHERE b.import_job_id = import_jobs.id), 0));

DROP TABLE migration_0005_import_counter_backfill;

CREATE INDEX idx_import_jobs_source_id
  ON import_jobs(source, id DESC);
CREATE INDEX idx_staging_job_resolution_queue
  ON character_import_staging(import_job_id, status, next_retry_at, id);
