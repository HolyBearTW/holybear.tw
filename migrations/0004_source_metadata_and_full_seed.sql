PRAGMA foreign_keys = ON;

ALTER TABLE character_sources ADD COLUMN source_updated_at TEXT;

ALTER TABLE character_import_staging ADD COLUMN source_updated_at TEXT;
ALTER TABLE character_import_staging ADD COLUMN observed_at TEXT;

UPDATE character_import_staging
SET observed_at = created_at
WHERE observed_at IS NULL;

CREATE INDEX idx_character_sources_source_updated
  ON character_sources(source, source_updated_at DESC);
