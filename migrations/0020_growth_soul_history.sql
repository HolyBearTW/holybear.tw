CREATE TABLE growth_soul_tracking (
  ocid TEXT PRIMARY KEY NOT NULL REFERENCES growth_profiles(ocid) ON DELETE CASCADE,
  last_synced_date TEXT,
  highest_grade INTEGER,
  previous_soul_name TEXT,
  previous_weapon_name TEXT,
  claim_token TEXT,
  claim_until TEXT,
  retry_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE growth_soul_events (
  ocid TEXT NOT NULL REFERENCES growth_profiles(ocid) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,
  event_type TEXT NOT NULL,
  before_value TEXT NOT NULL,
  after_value TEXT NOT NULL,
  PRIMARY KEY (ocid, snapshot_date, event_type)
);

CREATE UNIQUE INDEX idx_growth_soul_first_conversion
  ON growth_soul_events(ocid) WHERE event_type = 'soul_conversion';
