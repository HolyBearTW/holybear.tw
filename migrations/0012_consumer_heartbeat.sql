PRAGMA foreign_keys = ON;

-- One row per scheduler source keeps the primary heartbeat independent from
-- fallback activity. Queue ownership remains on each queue row's claim lease.
CREATE TABLE consumer_heartbeat (
  consumer_source TEXT PRIMARY KEY
    CHECK (consumer_source IN ('cloudflare_cron', 'github_actions_fallback')),
  last_invoked_at TEXT NOT NULL,
  last_success_at TEXT,
  last_error_at TEXT,
  last_error TEXT,
  last_result_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_consumer_heartbeat_success
  ON consumer_heartbeat(last_success_at, consumer_source);
