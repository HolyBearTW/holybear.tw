PRAGMA foreign_keys = ON;

-- Exact unfiltered ranking totals without scanning the characters index on
-- every visitor request. The initial count is paid once during migration;
-- triggers keep the singleton counter current afterward.
CREATE TABLE database_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  characters_total INTEGER NOT NULL DEFAULT 0 CHECK (characters_total >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO database_stats (id, characters_total)
SELECT 1, COUNT(*) FROM characters;

CREATE TRIGGER characters_stats_after_insert
AFTER INSERT ON characters
BEGIN
  UPDATE database_stats SET characters_total = characters_total + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1;
END;

CREATE TRIGGER characters_stats_after_delete
AFTER DELETE ON characters
BEGIN
  UPDATE database_stats SET characters_total = MAX(0, characters_total - 1),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1;
END;
