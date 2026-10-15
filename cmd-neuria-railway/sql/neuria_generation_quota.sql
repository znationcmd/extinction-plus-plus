-- CMD NEURIA: one successful AI generation per authenticated user per rolling 24h
-- Requires durable PostgreSQL and a verified account identity.
CREATE TABLE IF NOT EXISTS neuria_generation_quota (
  user_id TEXT PRIMARY KEY,
  last_success_at TIMESTAMPTZ NOT NULL,
  last_kind TEXT NOT NULL CHECK (last_kind IN ('oracle','pulse'))
);
CREATE INDEX IF NOT EXISTS neuria_generation_quota_last_success_idx ON neuria_generation_quota(last_success_at);
-- Claim and commit a slot in a SERIALIZABLE transaction with a per-user lock.
-- Do not charge on provider failures; keep a pending reservation until job completes.
