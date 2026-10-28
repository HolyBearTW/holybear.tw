-- Persist independent historical backfill progress for Destiny Weapon Phase 1/2
-- so existing profiles whose growth_soul_tracking.last_synced_date already
-- caught up to basic_last_synced_date can be backfilled once without resetting
-- soul/astra cursors or colliding with daily incremental equipment sync.
--
-- Rollback note: DROP TABLE growth_destiny_backfill only removes this progress table.
-- It does NOT revert growth_soul_tracking.earliest_destiny_phase*_date or
-- growth_soul_events rows written by an executed backfill; restore those from the
-- pre-run backup.

CREATE TABLE IF NOT EXISTS growth_destiny_backfill (
  ocid TEXT PRIMARY KEY NOT NULL REFERENCES growth_profiles(ocid) ON DELETE CASCADE,
  target_date TEXT NOT NULL,
  last_checked_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  -- 1 = scan every saved snapshot (used when a spot check found a Destiny weapon on a
  -- profile whose liberation_status never suggested one).
  scan_all INTEGER NOT NULL DEFAULT 0 CHECK (scan_all IN (0, 1)),
  -- One-time spot check of the latest saved snapshot for profiles without candidate
  -- snapshots. 'negative' does NOT prove the profile never held a Destiny weapon.
  spot_check_status TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (spot_check_status IN ('not_applicable', 'pending', 'negative', 'positive', 'unavailable')),
  spot_check_date TEXT,
  claim_token TEXT,
  claim_until TEXT,
  retry_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_growth_destiny_backfill_queue
  ON growth_destiny_backfill (status, retry_at, claim_until, ocid);

CREATE INDEX IF NOT EXISTS idx_growth_destiny_backfill_spot_check
  ON growth_destiny_backfill (spot_check_status, retry_at, claim_until, ocid);
