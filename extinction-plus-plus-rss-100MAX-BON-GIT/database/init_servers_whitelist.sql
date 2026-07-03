CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  guild_id TEXT,
  name TEXT,
  game TEXT,
  map TEXT,
  platform TEXT,
  provider TEXT,
  nitrado_id TEXT,
  nitrado_service_id TEXT,
  ip TEXT,
  port TEXT,
  image TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS whitelist_requests (
  id TEXT PRIMARY KEY,
  guild_id TEXT,
  user_id TEXT,
  server TEXT,
  map TEXT,
  platform TEXT,
  pseudo TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB DEFAULT '{}'::jsonb
);
