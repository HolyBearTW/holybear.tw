CREATE TABLE growth_astra_tracking (
  ocid TEXT PRIMARY KEY NOT NULL REFERENCES growth_profiles(ocid) ON DELETE CASCADE,
  last_synced_date TEXT,
  previous_item_name TEXT,
  has_astra INTEGER NOT NULL DEFAULT 0,
  claim_token TEXT,
  claim_until TEXT,
  retry_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE growth_astra_events (
  ocid TEXT PRIMARY KEY NOT NULL REFERENCES growth_profiles(ocid) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,
  before_value TEXT NOT NULL,
  after_value TEXT NOT NULL
);
