import { readDb, writeDb } from '../../../lib/db';
import { encrypt, decrypt, maskSecret } from '../../../lib/secure';
import { nitradoRequest, servicesSummary } from '../../../lib/nitrado';

function getGuildId(req, body = {}) {
  const url = new URL(req.url);
  return body.guildId || url.searchParams.get('guildId') || 'global';
}
function getToken(db, guildId) {
  const account = db.nitradoAccounts?.[guildId];
  return decrypt(account?.token || process.env.NITRADO_TOKEN || '');
}

export async function GET(req) {
  const db = readDb();
  const guildId = getGuildId(req);
  const token = getToken(db, guildId);
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'status';
  try {
    if (action === 'services') {
      const data = await nitradoRequest('/services', token);
      return Response.json({ ok: true, guildId, services: servicesSummary(data), raw: data });
    }
    if (action === 'servers') {
      const servers = (db.connectedServers || []).filter(s => s.guildId === guildId || guildId === 'global');
      return Response.json({ ok: true, guildId, servers });
    }
    return Response.json({
      ok: true,
      guildId,
      connected: Boolean(token),
      token: db.nitradoAccounts?.[guildId]?.token ? maskSecret(db.nitradoAccounts[guildId].token) : (process.env.NITRADO_TOKEN ? 'Railway global' : 'non configuré')
    });
  } catch (e) {
    return Response.json({ ok: false, guildId, error: String(e?.message || e) }, { status: 200 });
  }
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const db = readDb();
  const guildId = getGuildId(req, body);
  const action = body.action || 'connect';
  db.nitradoAccounts = db.nitradoAccounts || {};
  db.connectedServers = db.connectedServers || [];
  try {
    if (action === 'connect') {
      if (!body.token) return Response.json({ ok: false, error: 'token manquant' }, { status: 400 });
      const test = await nitradoRequest('/services', body.token);
      db.nitradoAccounts[guildId] = {
        guildId,
        token: encrypt(body.token),
        connectedAt: new Date().toISOString(),
        lastTestAt: new Date().toISOString(),
        servicesCount: servicesSummary(test).length
      };
      writeDb(db);
      return Response.json({ ok: true, guildId, services: servicesSummary(test) });
    }
    if (action === 'disconnect') {
      delete db.nitradoAccounts[guildId];
      writeDb(db);
      return Response.json({ ok: true, guildId });
    }
    const token = getToken(db, guildId);
    if (action === 'link-server') {
      const serviceId = String(body.serviceId || body.nitradoServiceId || '').trim();
      if (!serviceId) return Response.json({ ok: false, error: 'serviceId manquant' }, { status: 400 });
      const item = {
        id: body.id || `${guildId}_${serviceId}`,
        guildId,
        nitradoServiceId: serviceId,
        name: body.name || body.nom || `Serveur ${serviceId}`,
        game: body.game || body.jeu || 'dayz_pc',
        map: body.map || '',
        whitelistPath: body.whitelistPath || body.whitelist_path || '',
        rconHost: body.rconHost || '',
        rconPort: body.rconPort || '',
        provider: 'nitrado',
        linkedAt: new Date().toISOString()
      };
      db.connectedServers = db.connectedServers.filter(s => !(s.guildId === guildId && s.nitradoServiceId === serviceId));
      db.connectedServers.push(item);
      writeDb(db);
      return Response.json({ ok: true, server: item });
    }
    if (['start', 'stop', 'restart'].includes(action)) {
      const serviceId = String(body.serviceId || '').trim();
      if (!serviceId) return Response.json({ ok: false, error: 'serviceId manquant' }, { status: 400 });
      const data = await nitradoRequest(`/services/${serviceId}/gameservers/${action}`, token, { method: 'POST' });
      return Response.json({ ok: true, action, serviceId, data });
    }
    if (action === 'info') {
      const serviceId = String(body.serviceId || '').trim();
      const data = await nitradoRequest(`/services/${serviceId}/gameservers`, token);
      return Response.json({ ok: true, serviceId, data });
    }
    return Response.json({ ok: false, error: `action inconnue: ${action}` }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, guildId, error: String(e?.message || e) }, { status: 200 });
  }
}
