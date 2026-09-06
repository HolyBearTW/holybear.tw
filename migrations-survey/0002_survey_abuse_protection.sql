ALTER TABLE survey_responses
  ADD COLUMN ip_fingerprint TEXT NOT NULL DEFAULT '';

ALTER TABLE survey_responses
  ADD COLUMN risk_flags TEXT NOT NULL DEFAULT '';

ALTER TABLE survey_responses
  ADD COLUMN is_suspicious INTEGER NOT NULL DEFAULT 0
    CHECK (is_suspicious IN (0, 1));

CREATE INDEX idx_survey_responses_fingerprint_created_at
  ON survey_responses(ip_fingerprint, created_at);

CREATE INDEX idx_survey_responses_suspicious_created_at
  ON survey_responses(is_suspicious, created_at DESC, id DESC);

CREATE TABLE survey_abuse_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'network_cooldown',
      'duplicate_browser',
      'turnstile_failed',
      'schema_invalid'
    )),
  ip_fingerprint TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_survey_abuse_events_fingerprint_created_at
  ON survey_abuse_events(ip_fingerprint, created_at DESC);

CREATE INDEX idx_survey_abuse_events_type_created_at
  ON survey_abuse_events(event_type, created_at DESC);
