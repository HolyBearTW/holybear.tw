PRAGMA foreign_keys = ON;

CREATE TABLE import_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  last_page INTEGER NOT NULL DEFAULT 0 CHECK (last_page >= 0),
  checkpoint_json TEXT,
  imported_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  updated_count INTEGER NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  skipped_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  last_error TEXT,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);

CREATE TABLE character_import_staging (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_job_id INTEGER,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  world_name TEXT NOT NULL DEFAULT '',
  job_name TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  combat_power INTEGER NOT NULL DEFAULT 0 CHECK (combat_power >= 0),
  character_image TEXT NOT NULL DEFAULT '',
  ocid TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolving', 'resolved', 'retry', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_retry_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (source, source_id),
  FOREIGN KEY (import_job_id) REFERENCES import_jobs(id) ON DELETE SET NULL
);

CREATE TABLE import_job_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_job_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  page INTEGER,
  batch INTEGER,
  source_id TEXT,
  character_name TEXT,
  error_code TEXT,
  error_message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (import_job_id) REFERENCES import_jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_import_jobs_source_status
  ON import_jobs(source, status, updated_at DESC);
CREATE INDEX idx_staging_resolution_queue
  ON character_import_staging(source, status, next_retry_at, id);
CREATE INDEX idx_staging_job
  ON character_import_staging(import_job_id, status);
CREATE INDEX idx_staging_normalized_name
  ON character_import_staging(normalized_name);
CREATE INDEX idx_import_errors_job
  ON import_job_errors(import_job_id, created_at DESC);
