-- Persist independent historical backfill progress for Destiny Weapon Phase 1/2
-- so existing profiles whose growth_soul_tracking.last_synced_date already
-- caught up to basic_last_synced_date can be backfilled once without resetting
-- soul/astra cursors or colliding with daily incremental equipment sync.

CREATE TABLE IF NOT EXISTS growth_destiny_backfill (
  ocid TEXT PRIMARY KEY NOT NULL REFERENCES growth_profiles(ocid) ON DELETE CASCADE,
  target_date TEXT NOT NULL,
  last_checked_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  claim_token TEXT,
  claim_until TEXT,
  retry_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_growth_destiny_backfill_queue
  ON growth_destiny_backfill (status, retry_at, claim_until, ocid);
