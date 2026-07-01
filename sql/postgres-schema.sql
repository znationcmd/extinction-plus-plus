-- Extinction++ RSS PostgreSQL schema (Railway)
CREATE TABLE IF NOT EXISTS guilds (
  guild_id TEXT PRIMARY KEY,
  guild_name TEXT,
  owner_id TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nitrado_accounts (
  guild_id TEXT PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
  token_encrypted TEXT NOT NULL,
  services_count INTEGER DEFAULT 0,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_test_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS connected_servers (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  nitrado_service_id TEXT,
  name TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT 'dayz_pc',
  map TEXT,
  whitelist_path TEXT,
  rcon_host TEXT,
  rcon_port TEXT,
  rcon_password_encrypted TEXT,
  provider TEXT NOT NULL DEFAULT 'nitrado',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS whitelist_requests (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  server_id TEXT,
  discord_id TEXT,
  player_name TEXT,
  steam_id TEXT,
  dayz_uid TEXT,
  platform TEXT DEFAULT 'PC',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  reason TEXT
);
CREATE TABLE IF NOT EXISTS economy_accounts (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  cash BIGINT NOT NULL DEFAULT 0,
  bank BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guild_id, user_id)
);
CREATE TABLE IF NOT EXISTS module_records (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  module TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_module_records_guild_module ON module_records(guild_id, module);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  guild_id TEXT,
  actor_id TEXT,
  action TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
