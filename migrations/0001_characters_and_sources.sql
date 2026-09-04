PRAGMA foreign_keys = ON;

CREATE TABLE account_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  union_fingerprint TEXT,
  confidence TEXT NOT NULL DEFAULT 'unknown'
    CHECK (confidence IN ('high', 'probable', 'unknown')),
  first_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE characters (
  ocid TEXT PRIMARY KEY NOT NULL,
  character_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  world_name TEXT NOT NULL DEFAULT '',
  job_name TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  combat_power INTEGER NOT NULL DEFAULT 0 CHECK (combat_power >= 0),
  character_image TEXT NOT NULL DEFAULT '',
  guild_name TEXT,
  account_group_id INTEGER,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  nexon_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (account_group_id) REFERENCES account_groups(id) ON DELETE SET NULL
);

CREATE TABLE character_sources (
  ocid TEXT NOT NULL,
  source TEXT NOT NULL,
  source_character_id TEXT,
  source_first_seen_at TEXT NOT NULL,
  source_last_seen_at TEXT NOT NULL,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (ocid, source),
  FOREIGN KEY (ocid) REFERENCES characters(ocid) ON DELETE CASCADE
);

CREATE INDEX idx_characters_normalized_name
  ON characters(normalized_name);
CREATE INDEX idx_characters_combat_power
  ON characters(combat_power DESC, ocid ASC);
CREATE INDEX idx_characters_world_power
  ON characters(world_name, combat_power DESC, ocid ASC);
CREATE INDEX idx_characters_job_power
  ON characters(job_name, combat_power DESC, ocid ASC);
CREATE INDEX idx_characters_world_job_power
  ON characters(world_name, job_name, combat_power DESC, ocid ASC);
CREATE INDEX idx_characters_level_power
  ON characters(level, combat_power DESC, ocid ASC);
CREATE INDEX idx_characters_account_group
  ON characters(account_group_id);
CREATE INDEX idx_character_sources_source_id
  ON character_sources(source, source_character_id);
