import crypto from 'crypto';
import { cookies } from 'next/headers';
import store from './dayz-mod-store.cjs';

export function origin() {
  const url = new URL(process.env.DASHBOARD_URL || process.env.PUBLIC_URL || 'http://localhost:3000');
  return url.origin;
}
function key() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32 || /change[_ -]?me|change-moi|change_this/i.test(value)) throw new Error('SESSION_SECRET doit être un secret aléatoire de 32 caractères minimum.');
  return crypto.createHash('sha256').update(value).digest();
}
export function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}
export function unseal(value) {
  try {
    const data = Buffer.from(value || '', 'base64url');
    const cipher = crypto.createDecipheriv('aes-256-gcm', key(), data.subarray(0,12));
    cipher.setAuthTag(data.subarray(12,28));
    const result = JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]));
    return result.expires > Date.now() ? result : null;
  } catch { return null; }
}
export const cookieOptions = { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' };
export async function discord(path, token) {
  const res = await fetch(`https://discord.com/api/v10${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw Object.assign(new Error('Connexion Discord expirée ou accès refusé.'), { status: res.status === 401 ? 401 : 403 });
  return res.json();
}
export async function session() {
  const jar = await cookies();
  const s = unseal(jar.get('extinction_mod_session')?.value);
  if (!s) throw Object.assign(new Error('Connecte-toi avec Discord.'), { status: 401 });
  return s;
}
export async function authorize(guildId, ownerOnly = false) {
  if (!/^\d{15,22}$/.test(guildId || '')) throw Object.assign(new Error('Discord invalide.'), { status: 400 });
  const s = await session();
  const guilds = await discord('/users/@me/guilds', s.token);
  const guild = guilds.find(g => g.id === guildId);
  if (!guild) throw Object.assign(new Error('Accès refusé à ce Discord.'), { status: 403 });
  const p = await store.ready();
  const { rows } = await p.query('SELECT role_ids FROM dayz_mod_access WHERE guild_id=$1', [guildId]);
  const roles = rows[0]?.role_ids || [];
  const member = guild.owner ? null : await discord(`/users/@me/guilds/${guildId}/member`, s.token);
  if (ownerOnly ? !guild.owner : !store.allowed(guild.owner, member?.roles || [], roles)) throw Object.assign(new Error('Réservé au propriétaire et aux rôles Fondateur autorisés.'), { status: 403 });
  return { ...s, guild, roles };
}
export function sameOrigin(req) {
  if (req.headers.get('origin') !== origin()) throw Object.assign(new Error('Origine refusée.'), { status: 403 });
}
export function failure(e) {
  const status = e.status || 400;
  return Response.json({ error: status >= 500 ? 'Erreur du service de mise à jour.' : e.message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
