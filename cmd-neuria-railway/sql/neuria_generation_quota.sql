-- CMD NEURIA: two independent rolling 24-hour quotas per verified account.
-- One successful Oracle generation AND one successful Pulse generation per 24h.
-- Durable PostgreSQL required. Apply migration before enabling generation.
CREATE TABLE IF NOT EXISTS neuria_generation_quota (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('oracle','pulse')),
  last_success_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, kind)
);
CREATE INDEX IF NOT EXISTS neuria_generation_quota_last_success_idx ON neuria_generation_quota(last_success_at);
-- A successful Oracle generation must never consume a Pulse allowance, or vice versa.
-- Reserve atomically per (user_id, kind) before GPU work; release on failure.
-- Only commit last_success_at on verified successful model output.
