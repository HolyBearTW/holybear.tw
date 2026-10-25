-- Preserve historical records while excluding identities confirmed unavailable
-- by a current official response. Age alone never invalidates a character.
ALTER TABLE characters ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1
  CHECK (is_active IN (0, 1));
ALTER TABLE characters ADD COLUMN invalidated_at TEXT;
ALTER TABLE characters ADD COLUMN invalidation_reason TEXT;
ALTER TABLE database_stats ADD COLUMN active_characters_total INTEGER NOT NULL DEFAULT 0
  CHECK (active_characters_total >= 0);
UPDATE database_stats SET active_characters_total = characters_total WHERE id = 1;

-- Reuse the existing index count. Put validity before power so unavailable
-- high-power rows do not have to be scanned on each ranking page request.
DROP INDEX idx_characters_combat_power;
CREATE INDEX idx_characters_combat_power ON characters(is_active, combat_power DESC, ocid ASC);
DROP INDEX idx_characters_world_power;
CREATE INDEX idx_characters_world_power ON characters(world_name, is_active, combat_power DESC, ocid ASC);
DROP INDEX idx_characters_job_power;
CREATE INDEX idx_characters_job_power ON characters(job_name, is_active, combat_power DESC, ocid ASC);
DROP INDEX idx_characters_world_job_power;
CREATE INDEX idx_characters_world_job_power ON characters(world_name, job_name, is_active, combat_power DESC, ocid ASC);
DROP INDEX idx_characters_level_power;
CREATE INDEX idx_characters_level_power ON characters(level, combat_power DESC, ocid ASC, is_active);

DROP TRIGGER characters_stats_after_insert;
CREATE TRIGGER characters_stats_after_insert AFTER INSERT ON characters BEGIN
  UPDATE database_stats SET characters_total = characters_total + 1,
    active_characters_total = active_characters_total + NEW.is_active,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1;
END;

CREATE TRIGGER characters_resume_identity_signals
AFTER UPDATE OF is_active ON characters WHEN OLD.is_active = 0 AND NEW.is_active = 1 BEGIN
  UPDATE account_signal_sync SET status = 'pending', next_retry_at = NULL,
    last_error = NULL, attempt_count = 0, completed_at = NULL,
    queue_version = queue_version + 1, updated_at = NEW.updated_at
    WHERE ocid = NEW.ocid AND status = 'failed' AND last_error = OLD.invalidation_reason;
END;
DROP TRIGGER characters_stats_after_delete;
CREATE TRIGGER characters_stats_after_delete AFTER DELETE ON characters BEGIN
  UPDATE database_stats SET characters_total = MAX(0, characters_total - 1),
    active_characters_total = MAX(0, active_characters_total - OLD.is_active),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1;
END;
CREATE TRIGGER characters_stats_after_identity_update
AFTER UPDATE OF is_active ON characters WHEN OLD.is_active <> NEW.is_active BEGIN
  UPDATE database_stats SET active_characters_total = MAX(0, active_characters_total + NEW.is_active - OLD.is_active),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1;
END;

-- One invalidation stops existing work atomically. Daily scheduling must not
-- revive failed profiles; reactivation requires a successful canonical refresh.
CREATE TRIGGER characters_stop_invalid_identity
AFTER UPDATE OF is_active ON characters WHEN OLD.is_active = 1 AND NEW.is_active = 0 BEGIN
  UPDATE growth_profiles SET status = 'failed', next_retry_at = NULL,
    last_error = COALESCE(NEW.invalidation_reason, '此角色已停止收錄'), claim_token = NULL, claim_until = NULL,
    queue_version = queue_version + 1, updated_at = COALESCE(NEW.invalidated_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE ocid = NEW.ocid AND status <> 'failed';
  UPDATE account_signal_sync SET status = 'failed', next_retry_at = NULL,
    last_error = COALESCE(NEW.invalidation_reason, '此角色已停止收錄'), claim_token = NULL, claim_until = NULL,
    queue_version = queue_version + 1, updated_at = COALESCE(NEW.invalidated_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE ocid = NEW.ocid AND status <> 'failed';
END;
