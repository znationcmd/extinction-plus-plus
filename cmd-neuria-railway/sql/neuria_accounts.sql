-- CMD NEURIA account storage schema (PostgreSQL)
-- Run migrations on a persistent database before enabling email signup.
CREATE TABLE IF NOT EXISTS neuria_accounts (
 id UUID PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 password_salt TEXT NOT NULL,
 password_iterations INTEGER NOT NULL DEFAULT 210000,
 email_verified BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS neuria_sessions (
 id UUID PRIMARY KEY,
 account_id UUID NOT NULL REFERENCES neuria_accounts(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL,
 revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS neuria_sessions_account_idx ON neuria_sessions(account_id);
CREATE INDEX IF NOT EXISTS neuria_sessions_expiry_idx ON neuria_sessions(expires_at);
-- Security: do not enable password login before implementing email verification,
-- CSRF protection, rate limits, session rotation and secure cookie handling.
