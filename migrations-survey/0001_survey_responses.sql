PRAGMA foreign_keys = ON;

CREATE TABLE survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  anonymous_id TEXT NOT NULL UNIQUE,
  usage_frequency TEXT NOT NULL
    CHECK (usage_frequency IN ('frequent', 'occasional', 'rare', 'stopped')),
  satisfaction_score INTEGER NOT NULL
    CHECK (satisfaction_score BETWEEN 1 AND 5),
  support_continue TEXT NOT NULL
    CHECK (support_continue IN ('support', 'indifferent', 'oppose')),
  future_use_intent TEXT NOT NULL
    CHECK (future_use_intent IN ('will', 'depends', 'uncertain', 'will_not')),
  improvement_feedback TEXT NOT NULL DEFAULT ''
    CHECK (length(improvement_feedback) <= 2000),
  other_feedback TEXT NOT NULL DEFAULT ''
    CHECK (length(other_feedback) <= 2000)
);

CREATE INDEX idx_survey_responses_created_at
  ON survey_responses(created_at DESC, id DESC);
CREATE INDEX idx_survey_responses_satisfaction
  ON survey_responses(satisfaction_score);
CREATE INDEX idx_survey_responses_usage
  ON survey_responses(usage_frequency);
CREATE INDEX idx_survey_responses_support
  ON survey_responses(support_continue);
CREATE INDEX idx_survey_responses_future_use
  ON survey_responses(future_use_intent);
