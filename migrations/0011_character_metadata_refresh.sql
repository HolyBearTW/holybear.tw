PRAGMA foreign_keys = ON;

-- Names discovered through account signals may not have a canonical character
-- yet, so this queue intentionally permits a NULL OCID and has no character FK.
CREATE TABLE character_metadata_refresh (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  normalized_name TEXT NOT NULL,
  character_name TEXT NOT NULL,
  expected_world_name TEXT NOT NULL,
  ocid TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'retry', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_retry_at TEXT,
  last_error TEXT,
  last_attempted_at TEXT,
  completed_at TEXT,
  claim_token TEXT,
  claim_until TEXT,
  queue_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (normalized_name, expected_world_name)
);

CREATE INDEX idx_character_metadata_refresh_queue
  ON character_metadata_refresh(status, next_retry_at, claim_until, id);
CREATE INDEX idx_character_metadata_refresh_ocid
  ON character_metadata_refresh(ocid);
