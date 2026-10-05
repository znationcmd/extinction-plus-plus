const { Pool } = require('pg');
const crypto = require('crypto');
let pool;
let tables;
function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL requis pour partager les mises à jour entre bot et Dashboard.');
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.on('error',()=>console.error('Mods DayZ : connexion PostgreSQL indisponible.'));
  }
  return pool;
}
async function ready() {
  if (!tables) tables = (async()=>{
    const connection=await getPool().connect();
    try {
      await connection.query('BEGIN');
      await connection.query('SELECT pg_advisory_xact_lock(221100,1700)');
      await connection.query(`
    CREATE TABLE IF NOT EXISTS dashboard_discord_sessions (
      id TEXT PRIMARY KEY, payload TEXT NOT NULL, expires BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS dashboard_discord_session_expiry ON dashboard_discord_sessions(expires);
    CREATE TABLE IF NOT EXISTS dayz_mod_servers (
      id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, service_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL, token TEXT NOT NULL, config JSONB NOT NULL DEFAULT '{}',
      state JSONB NOT NULL DEFAULT '{}', heartbeat TIMESTAMPTZ, active BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS dayz_mod_access (
      guild_id TEXT PRIMARY KEY, role_ids JSONB NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS dayz_mod_jobs (
      id TEXT PRIMARY KEY, server_id TEXT NOT NULL REFERENCES dayz_mod_servers(id),
      service_id TEXT NOT NULL, actor_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued',
      phase TEXT NOT NULL DEFAULT 'En attente', created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS dayz_mod_one_job ON dayz_mod_jobs(service_id)
      WHERE status IN ('queued','running');
      `);
      await connection.query('COMMIT');
    } catch(e) {await connection.query('ROLLBACK').catch(()=>{});throw e;}
    finally {connection.release();}
  })().catch(e => { tables = null; throw e; });
  await tables;
  return getPool();
}
function isDayzPC(s) {
  return s.game === 'dayz_pc' || (String(s.game).toLowerCase() === 'dayz' && String(s.platform).toLowerCase() === 'pc');
}
function validateConfig(value) {
  if (!value || !Array.isArray(value.mods) || value.mods.length > 100) throw new Error('Liste de 100 mods maximum requise.');
  const mods = value.mods.map(m => {
    if (!/^\d{1,20}$/.test(String(m.id)) || !/^@[A-Za-z0-9_-]{1,80}$/.test(m.folder)) throw new Error('ID Workshop numérique et dossier @NomDuMod requis.');
    return { id: String(m.id), folder: m.folder };
  });
  if (new Set(mods.map(m => m.id)).size !== mods.length || new Set(mods.map(m => m.folder.toLowerCase())).size !== mods.length) throw new Error('Un mod ou un dossier est présent deux fois.');
  const root = String(value.root || '').replace(/\/$/, '');
  if (!/^\/[A-Za-z0-9_./ -]+$/.test(root) || root.split('/').some(x => x === '..' || x === '.') || root === '') throw new Error('Chemin FTP absolu requis, sans . ni ...');
  const delayMinutes = Number(value.delayMinutes ?? 10);
  if (!Number.isInteger(delayMinutes) || delayMinutes < 0 || delayMinutes > 60) throw new Error('Délai de 0 à 60 minutes requis.');
  const channelId = String(value.channelId || '');
  if (channelId && !/^\d{15,22}$/.test(channelId)) throw new Error('ID du salon Discord invalide.');
  if ((delayMinutes > 0 || value.autoUpdate === true) && !channelId) throw new Error('Un salon Discord est requis pour les avertissements.');
  return { mods, root, delayMinutes, channelId, autoUpdate: value.autoUpdate === true };
}
function allowed(owner, memberRoles, founderRoles) {
  return owner === true || founderRoles.some(id => memberRoles.includes(id));
}
async function enqueue(server, actorId) {
  const p = await ready();
  if (!server.active || !server.config.mods?.length) throw new Error('Serveur ou mods non configurés.');
  if (!server.heartbeat || Date.now() - new Date(server.heartbeat).getTime() > 90000) throw new Error('Le bot de mise à jour est hors ligne.');
  if (!server.state.workerReady) throw new Error(server.state.workerIssue || 'SteamCMD et le compte Steam ne sont pas configurés.');
  if (server.state.recoveryRequired) throw new Error('Vérification manuelle requise après une opération interrompue.');
  const id = crypto.randomUUID();
  const connection = await p.connect();
  try {
    await connection.query('BEGIN');
    const {rows} = await connection.query('SELECT active,config,state FROM dayz_mod_servers WHERE id=$1 FOR UPDATE', [server.id]);
    if (!rows[0]?.active || !rows[0].config.mods?.length) throw new Error('Serveur ou mods non configurés.');
    if (rows[0].state.recoveryRequired) throw new Error('Vérification manuelle requise après une opération interrompue.');
    await connection.query('INSERT INTO dayz_mod_jobs(id,server_id,service_id,actor_id) VALUES($1,$2,$3,$4)', [id, server.id, server.service_id, actorId]);
    await connection.query('COMMIT');
  } catch (e) {
    await connection.query('ROLLBACK');
    if (e.code === '23505') throw new Error('Une mise à jour est déjà en cours pour ce serveur.'); throw e;
  } finally {connection.release();}
  return id;
}
module.exports = { ready, getPool, isDayzPC, validateConfig, allowed, enqueue };
