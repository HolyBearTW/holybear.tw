PRAGMA foreign_keys = ON;

-- New source payloads live in R2; these nullable columns preserve backwards
-- compatibility with rows that still contain the legacy D1 body.
ALTER TABLE character_sources ADD COLUMN raw_object_key TEXT;
ALTER TABLE character_sources ADD COLUMN raw_sha256 TEXT;
ALTER TABLE character_sources ADD COLUMN raw_size INTEGER;
ALTER TABLE character_sources ADD COLUMN raw_stored_at TEXT;
ALTER TABLE character_sources ADD COLUMN raw_content_type TEXT;

CREATE INDEX idx_character_sources_raw_locator
  ON character_sources(raw_object_key);

-- A single mutable row is deliberately used instead of an append-only log.
CREATE TABLE IF NOT EXISTS maintenance_state (
  name TEXT PRIMARY KEY CHECK (name = 'retention'),
  last_started_at TEXT,
  last_finished_at TEXT,
  last_result_json TEXT,
  updated_at TEXT NOT NULL
);

-- Short-lived mutex for overlapping Cron/fallback invocations.  The lease is
-- deliberately recoverable after a worker interruption; it is not a durable
-- claim on any data row.
ALTER TABLE maintenance_state ADD COLUMN lease_token TEXT;
ALTER TABLE maintenance_state ADD COLUMN lease_until TEXT;

INSERT OR IGNORE INTO maintenance_state (name, updated_at)
VALUES ('retention', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE INDEX idx_staging_retention
  ON character_import_staging(import_job_id, status, updated_at, id);
CREATE INDEX idx_import_errors_retention
  ON import_job_errors(import_job_id, created_at, id);
CREATE INDEX idx_guild_candidates_retention
  ON guild_import_candidates(import_job_id, status, observed_at, id);
