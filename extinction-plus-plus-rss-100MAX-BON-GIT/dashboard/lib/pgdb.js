import { Pool } from 'pg';

let pool;
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function ensureTables() {
  const p = getPool();
  await p.query(`
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
  `);
  await p.query(`
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
  `);
}

export function normalizeServer(row) {
  const data = row.data || {};
  return {
    ...data,
    id: row.id,
    guildId: row.guild_id,
    name: row.name,
    game: row.game,
    map: row.map,
    platform: row.platform,
    provider: row.provider,
    nitradoId: row.nitrado_id,
    nitradoServiceId: row.nitrado_service_id,
    ip: row.ip,
    port: row.port,
    image: row.image,
    enabled: row.enabled,
    createdAt: row.created_at
  };
}

export function normalizeWhitelist(row) {
  const data = row.data || {};
  return {
    ...data,
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    server: row.server,
    map: row.map,
    plateforme: row.platform,
    platform: row.platform,
    pseudo: row.pseudo,
    status: row.status,
    createdAt: row.created_at
  };
}
