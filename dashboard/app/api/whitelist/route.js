import { readDb, writeDb } from '../../../lib/db';
import { decrypt } from '../../../lib/secure';
import { appendWhitelistUid } from '../../../lib/nitrado';

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export async function GET(req) {
  const db = readDb();
  const url = new URL(req.url);
  const guildId = url.searchParams.get('guildId');
  let list = db.pendingWhitelist || [];
  if (guildId) list = list.filter(x => x.guildId === guildId);
  return Response.json({ ok: true, whitelist: list });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const db = readDb();
  db.pendingWhitelist = db.pendingWhitelist || [];
  db.whitelistApproved = db.whitelistApproved || [];
  const action = body.action || 'create';
  if (action === 'create') {
    const item = {
      id: body.id || uid(), guildId: body.guildId || 'global', serverId: body.serverId || '', server: body.server || '', map: body.map || '',
      discordId: body.discordId || '', playerName: body.playerName || body.pseudo || '', steamId: body.steamId || '', dayzUid: body.dayzUid || body.uid || '',
      platform: body.platform || body.plateforme || 'PC', status: 'pending', createdAt: new Date().toISOString()
    };
    db.pendingWhitelist.push(item); writeDb(db); return Response.json({ ok: true, item });
  }
  const id = String(body.id || '');
  const idx = db.pendingWhitelist.findIndex(x => String(x.id) === id);
  if (idx === -1) return Response.json({ ok: false, error: 'demande introuvable' }, { status: 404 });
  const item = db.pendingWhitelist[idx];
  if (action === 'approve') {
    item.status = 'approved'; item.approvedAt = new Date().toISOString(); item.approvedBy = body.adminId || '';
    let nitradoSync = null;
    if (body.syncNitrado) {
      try {
        const server = (db.connectedServers || []).find(s => String(s.id) === String(item.serverId) || (s.guildId === item.guildId && (String(s.nitradoServiceId) === String(body.serviceId || '') || String(s.name) === String(item.server || ''))));
        const token = decrypt(db.nitradoAccounts?.[item.guildId]?.token || process.env.NITRADO_TOKEN || '');
        nitradoSync = await appendWhitelistUid({
          serviceId: body.serviceId || server?.nitradoServiceId,
          whitelistPath: body.whitelistPath || server?.whitelistPath,
          uid: item.dayzUid || item.steamId || item.playerName,
          token
        });
      } catch (e) {
        nitradoSync = { ok:false, error:String(e?.message || e) };
      }
    }
    db.whitelistApproved.push({ ...item, nitradoSync }); db.pendingWhitelist.splice(idx, 1); writeDb(db);
    return Response.json({ ok: true, approved: item, nitradoSync, note: nitradoSync ? 'Validation locale + tentative sync Nitrado.' : 'Validation locale OK. Active syncNitrado pour écrire dans Nitrado.' });
  }
  if (action === 'reject') {
    item.status = 'rejected'; item.rejectedAt = new Date().toISOString(); item.reason = body.reason || '';
    db.pendingWhitelist.splice(idx, 1); writeDb(db); return Response.json({ ok: true, rejected: item });
  }
  return Response.json({ ok: false, error: `action inconnue: ${action}` }, { status: 400 });
}
