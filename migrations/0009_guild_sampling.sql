PRAGMA foreign_keys = ON;

-- NULL marks legacy rows, which must pass the stricter official validation before reuse.
ALTER TABLE characters ADD COLUMN nexon_requested_at TEXT;
ALTER TABLE character_import_staging ADD COLUMN source_metadata_json TEXT;
ALTER TABLE import_jobs ADD COLUMN lease_token TEXT;
ALTER TABLE import_jobs ADD COLUMN lease_until TEXT;
CREATE UNIQUE INDEX idx_active_guild_import ON import_jobs(source)
  WHERE source = 'nexon_guild' AND status <> 'completed';

CREATE INDEX idx_characters_known_guilds ON characters(world_name, guild_name)
  WHERE guild_name IS NOT NULL AND guild_name <> '';

CREATE TABLE guild_import_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_job_id INTEGER NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  world_name TEXT NOT NULL,
  guild_name TEXT NOT NULL,
  oguild_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'retry', 'completed', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  last_error TEXT,
  member_count INTEGER,
  observed_at TEXT,
  UNIQUE(import_job_id, world_name, guild_name)
);
CREATE INDEX idx_guild_import_queue ON guild_import_candidates(import_job_id, status, next_retry_at, id);
