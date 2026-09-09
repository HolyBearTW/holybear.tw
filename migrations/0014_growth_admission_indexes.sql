-- Admission checks count recently-created and queued profiles before accepting
-- another permanent Growth tracker. These indexes keep those bounded checks
-- independent of the total snapshot population.
CREATE INDEX idx_growth_profiles_created_at
  ON growth_profiles(created_at);

CREATE INDEX idx_growth_profiles_queue_age
  ON growth_profiles(status, updated_at, ocid);
