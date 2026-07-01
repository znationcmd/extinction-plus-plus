import crypto from 'crypto';
import { readDb, writeDb } from './db';

function secret() {
  return process.env.SESSION_SECRET || process.env.SECRET_KEY || process.env.ENCRYPTION_SECRET || 'CHANGE_ME_EXTINCTION_RSS_SESSION_SECRET';
}

export function baseUrl(req) {
  const env = process.env.NEXT_PUBLIC_BASE_URL || process.env.DASHBOARD_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
  if (env) return env.startsWith('http') ? env : `https://${env}`;
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function makeSession(user, guilds = []) {
  return {
    id: crypto.randomUUID(),
    user,
    guilds,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
  };
}

export function cookieValue(sessionId) {
  return `${sessionId}.${sign(sessionId)}`;
}

export function parseCookie(header = '') {
  const found = String(header).split(';').map(x => x.trim()).find(x => x.startsWith('extinction_session='));
  if (!found) return '';
  const raw = decodeURIComponent(found.slice('extinction_session='.length));
  const [id, sig] = raw.split('.');
  if (!id || !sig || sign(id) !== sig) return '';
  return id;
}

export function getSession(req) {
  const id = parseCookie(req.headers.get('cookie') || '');
  if (!id) return null;
  const db = readDb();
  const session = db.sessions?.[id];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    delete db.sessions[id];
    writeDb(db);
    return null;
  }
  return session;
}

export function saveSession(session) {
  const db = readDb();
  db.sessions = db.sessions || {};
  db.sessions[session.id] = session;
  writeDb(db);
}

export function clearSession(req) {
  const id = parseCookie(req.headers.get('cookie') || '');
  if (!id) return;
  const db = readDb();
  if (db.sessions?.[id]) {
    delete db.sessions[id];
    writeDb(db);
  }
}

export function isGuildAdmin(guild) {
  const perms = BigInt(guild.permissions || '0');
  const ADMINISTRATOR = 0x8n;
  const MANAGE_GUILD = 0x20n;
  return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD || guild.owner === true;
}
