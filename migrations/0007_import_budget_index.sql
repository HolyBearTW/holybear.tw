PRAGMA foreign_keys = ON;

CREATE INDEX idx_import_jobs_budget_date
  ON import_jobs(d1_budget_date);
