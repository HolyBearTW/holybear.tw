ALTER TABLE growth_soul_tracking
  ADD COLUMN earliest_destiny_phase1_date TEXT;

ALTER TABLE growth_soul_tracking
  ADD COLUMN earliest_destiny_phase2_date TEXT;

CREATE UNIQUE INDEX idx_growth_destiny_first_phase2
  ON growth_soul_events(ocid) WHERE event_type = 'destiny_phase2';
