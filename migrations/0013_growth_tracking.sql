PRAGMA foreign_keys = ON;

-- A profile is a permanent opt-in to server-side growth tracking. "completed"
-- means caught up to sync_target_date, not terminal; the scheduler requeues it
-- whenever a newer TMS history date becomes available.
CREATE TABLE growth_profiles (
  ocid TEXT PRIMARY KEY NOT NULL,
  character_name TEXT NOT NULL DEFAULT '',
  scan_start_date TEXT NOT NULL,
  history_start_date TEXT,
  basic_last_synced_date TEXT,
  dojang_last_synced_date TEXT,
  last_synced_date TEXT,
  sync_target_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'retry', 'completed', 'failed')),
  phase TEXT NOT NULL DEFAULT 'basic'
    CHECK (phase IN ('basic', 'dojang')),
  dojang_mode TEXT NOT NULL DEFAULT 'unknown'
    CHECK (dojang_mode IN ('unknown', 'no_record', 'daily')),
  current_processing_date TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_retry_at TEXT,
  last_error TEXT,
  claim_token TEXT,
  claim_until TEXT,
  queue_version INTEGER NOT NULL DEFAULT 0 CHECK (queue_version >= 0),
  nexon_request_count INTEGER NOT NULL DEFAULT 0 CHECK (nexon_request_count >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);

CREATE TABLE growth_snapshots (
  ocid TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  source_date TEXT,
  character_name TEXT NOT NULL,
  world_name TEXT NOT NULL,
  job_name TEXT NOT NULL,
  character_level INTEGER NOT NULL CHECK (character_level >= 0),
  character_exp INTEGER NOT NULL CHECK (character_exp >= 0),
  character_exp_rate REAL NOT NULL CHECK (character_exp_rate >= 0),
  guild_name TEXT,
  liberation_status TEXT,
  dojang_best_floor INTEGER CHECK (dojang_best_floor IS NULL OR dojang_best_floor >= 0),
  dojang_best_time INTEGER CHECK (dojang_best_time IS NULL OR dojang_best_time >= 0),
  dojang_record_date TEXT,
  dojang_state TEXT NOT NULL DEFAULT 'not_collected'
    CHECK (dojang_state IN ('not_collected', 'no_record', 'available')),
  fetched_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (ocid, snapshot_date),
  FOREIGN KEY (ocid) REFERENCES growth_profiles(ocid) ON DELETE CASCADE
);

CREATE INDEX idx_growth_profiles_queue
  ON growth_profiles(status, next_retry_at, claim_until, updated_at);

CREATE TABLE growth_scheduler_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_target_date TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO growth_scheduler_state (id, last_target_date) VALUES (1, NULL);
