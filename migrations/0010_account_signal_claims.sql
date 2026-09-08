PRAGMA foreign_keys = ON;

-- A lease makes the existing pending/retry/completed queue safe for more than
-- one consumer (for example the legacy Windows worker and the Production
-- Cron worker) without adding a fourth public status.
ALTER TABLE account_signal_sync ADD COLUMN claim_token TEXT;
ALTER TABLE account_signal_sync ADD COLUMN claim_until TEXT;
ALTER TABLE account_signal_sync ADD COLUMN queue_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_account_signal_sync_claim
  ON account_signal_sync(signal_type, status, next_retry_at, claim_until, ocid);
