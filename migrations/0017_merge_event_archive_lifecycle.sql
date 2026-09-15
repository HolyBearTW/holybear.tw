PRAGMA foreign_keys = ON;

-- Merge events remain immutable (the no-update trigger is retained), but
-- verified R2 archives may be removed from D1 by the bounded retention runner.
-- The runner always archives and verifies first, then rechecks the timestamp
-- in its bounded DELETE statement.
DROP TRIGGER IF EXISTS account_group_merge_events_no_delete;
