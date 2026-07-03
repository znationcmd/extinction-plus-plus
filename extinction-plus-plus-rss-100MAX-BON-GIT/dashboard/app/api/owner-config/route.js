import { readDb, writeDb } from '../../../lib/db';

function emptyConfig(guildId = 'default') {
  return {
    guildId,
    nitradoToken: '',
    servers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get('guildId') || 'default';
  const db = readDb();
  db.ownerConfigs = db.ownerConfigs || {};
  return Response.json(db.ownerConfigs[guildId] || emptyConfig(guildId));
}

export async function POST(req) {
  const body = await req.json();
  const guildId = body.guildId || 'default';
  const db = readDb();
  db.ownerConfigs = db.ownerConfigs || {};
  const previous = db.ownerConfigs[guildId] || emptyConfig(guildId);

  const config = {
    ...previous,
    guildId,
    nitradoToken: body.nitradoToken || previous.nitradoToken || '',
    servers: Array.isArray(body.servers) ? body.servers : previous.servers || [],
    updatedAt: new Date().toISOString()
  };

  db.ownerConfigs[guildId] = config;
  db.servers = db.servers || [];

  for (const s of config.servers) {
    const id = s.id || `${guildId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const serverRecord = { ...s, id, guildId, ownerManaged: true, updatedAt: new Date().toISOString() };
    const idx = db.servers.findIndex(x => x.id === id);
    if (idx >= 0) db.servers[idx] = { ...db.servers[idx], ...serverRecord };
    else db.servers.push(serverRecord);
  }

  writeDb(db);
  return Response.json({ ok: true, config });
}
