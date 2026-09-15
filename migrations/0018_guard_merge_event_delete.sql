PRAGMA foreign_keys = ON;

-- Merge events remain immutable (the no-update trigger is retained). Verified
-- R2 archives may be removed only while the bounded retention runner holds its
-- lease; direct/admin DELETE statements remain blocked by this guard.
CREATE TRIGGER IF NOT EXISTS account_group_merge_events_guarded_delete
BEFORE DELETE ON account_group_merge_events
WHEN NOT EXISTS (
  SELECT 1 FROM maintenance_state
  WHERE name = 'retention' AND lease_token IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'account_group_merge_events delete requires retention lease');
END;
