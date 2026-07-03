const { Pool } = require('pg');

let pool;
function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

async function ensureTables() {
  const p = getPool();
  if (!p) return false;
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
  return true;
}

async function upsertServer(server) {
  const p = getPool();
  if (!p) return false;
  await ensureTables();
  await p.query(`
    INSERT INTO servers (id, guild_id, name, game, map, platform, provider, nitrado_id, nitrado_service_id, ip, port, image, enabled, created_at, data)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,COALESCE($14::timestamptz,NOW()),$15::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      guild_id=EXCLUDED.guild_id,
      name=EXCLUDED.name,
      game=EXCLUDED.game,
      map=EXCLUDED.map,
      platform=EXCLUDED.platform,
      provider=EXCLUDED.provider,
      nitrado_id=EXCLUDED.nitrado_id,
      nitrado_service_id=EXCLUDED.nitrado_service_id,
      ip=EXCLUDED.ip,
      port=EXCLUDED.port,
      image=EXCLUDED.image,
      enabled=EXCLUDED.enabled,
      data=EXCLUDED.data;
  `, [
    String(server.id), String(server.guildId || server.guild_id || ''), server.name || '', server.game || '', server.map || '',
    server.platform || '', server.provider || '', server.nitradoId || '', server.nitradoServiceId || server.nitradoId || '',
    server.ip || '', server.port || '', server.image || '', server.enabled !== false, server.createdAt || null, JSON.stringify(server)
  ]);
  return true;
}

async function addWhitelistRequest(req) {
  const p = getPool();
  if (!p) return false;
  await ensureTables();
  await p.query(`
    INSERT INTO whitelist_requests (id, guild_id, user_id, server, map, platform, pseudo, status, created_at, data)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz,NOW()),$10::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      guild_id=EXCLUDED.guild_id,
      user_id=EXCLUDED.user_id,
      server=EXCLUDED.server,
      map=EXCLUDED.map,
      platform=EXCLUDED.platform,
      pseudo=EXCLUDED.pseudo,
      status=EXCLUDED.status,
      data=EXCLUDED.data;
  `, [
    String(req.id), String(req.guildId || req.guild_id || ''), String(req.userId || req.user_id || ''),
    req.server || '', req.map || '', req.plateforme || req.platform || '', req.pseudo || '', req.status || 'pending',
    req.createdAt || null, JSON.stringify(req)
  ]);
  return true;
}

module.exports = { ensureTables, upsertServer, addWhitelistRequest };
