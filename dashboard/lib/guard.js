import { getSession } from './auth';

export function requireSession(req) {
  const session = getSession(req);
  if (!session) return { ok:false, response: Response.json({ ok:false, error:'Connexion Discord requise' }, { status:401 }) };
  return { ok:true, session };
}

export function requireGuildAccess(req, guildId) {
  const checked = requireSession(req);
  if (!checked.ok) return checked;
  const allowed = (checked.session.guilds || []).some(g => String(g.id) === String(guildId));
  if (!allowed) return { ok:false, response: Response.json({ ok:false, error:'Accès refusé à ce Discord' }, { status:403 }) };
  return checked;
}
