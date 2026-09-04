PRAGMA foreign_keys = ON;

CREATE TABLE ranking_snapshots (
  ocid TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  combat_power INTEGER NOT NULL DEFAULT 0 CHECK (combat_power >= 0),
  rank INTEGER CHECK (rank IS NULL OR rank > 0),
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  world_name TEXT NOT NULL DEFAULT '',
  job_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (ocid, snapshot_date),
  FOREIGN KEY (ocid) REFERENCES characters(ocid) ON DELETE CASCADE
);

CREATE TABLE account_group_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ocid TEXT NOT NULL,
  account_group_id INTEGER,
  signal_type TEXT NOT NULL,
  fingerprint_version INTEGER NOT NULL,
  union_fingerprint TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'unknown'
    CHECK (confidence IN ('high', 'probable', 'unknown')),
  evidence_json TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (ocid, signal_type, fingerprint_version, union_fingerprint),
  FOREIGN KEY (ocid) REFERENCES characters(ocid) ON DELETE CASCADE,
  FOREIGN KEY (account_group_id) REFERENCES account_groups(id) ON DELETE SET NULL
);

CREATE INDEX idx_ranking_snapshots_date_power
  ON ranking_snapshots(snapshot_date, combat_power DESC, ocid ASC);
CREATE INDEX idx_ranking_snapshots_ocid_date
  ON ranking_snapshots(ocid, snapshot_date DESC);
CREATE INDEX idx_account_signals_fingerprint
  ON account_group_signals(signal_type, fingerprint_version, union_fingerprint);
CREATE INDEX idx_account_signals_group
  ON account_group_signals(account_group_id);
