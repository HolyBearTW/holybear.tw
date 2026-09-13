PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS account_group_merge_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  trigger_ocid TEXT NOT NULL,
  trigger_character TEXT NOT NULL,
  signal_type TEXT,
  fingerprint TEXT,
  source_group_id INTEGER,
  target_group_id INTEGER,
  merged_group_ids_json TEXT NOT NULL DEFAULT '[]',
  merged_ocids_json TEXT NOT NULL DEFAULT '[]',
  trigger_source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_group_merge_events_timestamp
  ON account_group_merge_events(timestamp DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_account_group_merge_events_trigger
  ON account_group_merge_events(trigger_ocid, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_account_group_merge_events_target
  ON account_group_merge_events(target_group_id, timestamp DESC);

CREATE TRIGGER IF NOT EXISTS account_group_merge_events_no_update
BEFORE UPDATE ON account_group_merge_events
BEGIN
  SELECT RAISE(ABORT, 'account_group_merge_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS account_group_merge_events_no_delete
BEFORE DELETE ON account_group_merge_events
BEGIN
  SELECT RAISE(ABORT, 'account_group_merge_events is append-only');
END;
