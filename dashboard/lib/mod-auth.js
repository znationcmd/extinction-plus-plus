import crypto from 'crypto';
import { cookies } from 'next/headers';
import store from './dayz-mod-store.cjs';
import secure from './secure-store.cjs';
import sessions from './discord-sessions.cjs';

export function origin() {
  const url = new URL(process.env.DASHBOARD_URL || process.env.PUBLIC_URL || 'http://localhost:3000');
  return url.origin;
}
function key() {
  const value = secure.configuredSecrets().find(secure.validSecret);
  if (!value || value.length < 32 || /change[_ -]?me|change-moi|change_this/i.test(value)) throw new Error('SESSION_SECRET ou ENCRYPTION_KEY doit être un secret aléatoire de 32 caractères minimum.');
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
  if (!res.ok) throw Object.assign(new Error(res.status===429?'Discord limite temporairement les requêtes. Réessaie dans un instant.':res.status>=500?'Discord est temporairement indisponible.':'Connexion Discord expirée ou accès refusé.'), { status: res.status===429||res.status>=500?503:res.status===401?401:403 });
  return res.json();
}
export async function session() {
  const jar = await cookies();
  const s = unseal(jar.get('extinction_mod_session')?.value);
  if (!s) throw Object.assign(new Error('Connecte-toi avec Discord.'), { status: 401 });
  if(!s.sid)return s; // Existing short sessions remain usable until their normal expiry.
  return sessions.resolve({pool:await store.ready(),sid:s.sid,seal,unseal,refresh:refreshDiscord});
}
export async function refreshDiscord(refreshToken) {
  const reply=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.CLIENT_ID,client_secret:process.env.CLIENT_SECRET,grant_type:'refresh_token',refresh_token:refreshToken}),signal:AbortSignal.timeout(15000)});
  if(!reply.ok){const error=await reply.json().catch(()=>({}));const revoked=error.error==='invalid_grant';throw Object.assign(new Error(revoked?'Autorisation Discord révoquée. Reconnecte-toi.':'Discord temporairement indisponible, réessaie.'),{status:revoked?401:503});}
  return reply.json();
}
export async function createSession(token,user){return sessions.create({pool:await store.ready(),seal,token,user});}
export async function revokeSession(s){if(s?.sid)await sessions.revoke(await store.ready(),s.sid);}
export const sessionLifetime=sessions.lifetime;

export async function authorize(guildId, ownerOnly = false, context) {
  if (!/^\d{15,22}$/.test(guildId || '')) throw Object.assign(new Error('Discord invalide.'), { status: 400 });
  const s = context?.session || await session();
  const guilds = context?.guilds || await discord('/users/@me/guilds', s.token);
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
  const status = e.status || (e.name==='SyntaxError'?400: /connect|timeout|database|postgres|stockage/i.test(e.message||'')?503:400);
  return Response.json({ error: status >= 500 ? 'Service temporairement indisponible. Vérifie le stockage et les accès.' : e.message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
