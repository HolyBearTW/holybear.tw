PRAGMA foreign_keys = ON;

CREATE TABLE account_signal_sync (
  ocid TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'retry', 'failed')),
  signal_count INTEGER NOT NULL DEFAULT 0 CHECK (signal_count >= 0),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_retry_at TEXT,
  last_error TEXT,
  last_attempted_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (ocid, signal_type),
  FOREIGN KEY (ocid) REFERENCES characters(ocid) ON DELETE CASCADE
);

CREATE INDEX idx_account_signal_sync_queue
  ON account_signal_sync(signal_type, status, next_retry_at, ocid);
