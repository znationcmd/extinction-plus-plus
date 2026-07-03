import { readDb, writeDb, addAudit } from '../../../lib/db';
function makeId(){ return `${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
export async function GET(req) {
  const db = readDb(); const u = new URL(req.url); const guildId = u.searchParams.get('guildId'); const discordId = u.searchParams.get('discordId');
  let rows = db.steamLinks || []; if (guildId) rows = rows.filter(r => String(r.guildId) === String(guildId)); if (discordId) rows = rows.filter(r => String(r.discordId) === String(discordId));
  return Response.json({ ok:true, steamLinks: rows });
}
export async function POST(req) {
  const body = await req.json().catch(()=>({})); const db = readDb(); db.steamLinks = db.steamLinks || []; const action = body.action || 'link';
  if (action === 'unlink') { db.steamLinks = db.steamLinks.filter(r => !(String(r.guildId)===String(body.guildId) && String(r.discordId)===String(body.discordId))); addAudit(db,{guildId:body.guildId, actorId:body.adminId||body.discordId, action:'steam.unlink', targetId:body.discordId}); writeDb(db); return Response.json({ ok:true }); }
  const item = { id:body.id || makeId(), guildId:body.guildId || 'global', discordId:String(body.discordId || ''), steamId:String(body.steamId || ''), dayzUid:String(body.dayzUid || body.uid || ''), playerName:body.playerName || '', verified:Boolean(body.verified), updatedAt:new Date().toISOString() };
  if (!item.discordId || (!item.steamId && !item.dayzUid)) return Response.json({ ok:false, error:'discordId + steamId/dayzUid requis' }, { status:400 });
  db.steamLinks = db.steamLinks.filter(r => !(String(r.guildId)===String(item.guildId) && String(r.discordId)===String(item.discordId))); db.steamLinks.push(item); addAudit(db,{guildId:item.guildId, actorId:body.adminId||item.discordId, action:'steam.link', targetId:item.discordId}); writeDb(db); return Response.json({ ok:true, item });
}
