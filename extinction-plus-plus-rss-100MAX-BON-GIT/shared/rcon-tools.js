const { Rcon } = require('rcon-client');
const config = require('../config');

function normalize(s) { return String(s || '').trim().toLowerCase(); }

function getAllServers(db, guildId) {
  const list = [];
  const cfg = db.guilds?.[guildId];
  if (cfg?.servers) list.push(...cfg.servers.map(s => ({ ...s, guildId })));
  for (const [key, s] of Object.entries(config.ARK_SERVERS || {})) {
    list.push({
      id: key,
      name: s.name || key,
      game: 'ark',
      map: s.map || '',
      rconHost: s.host,
      rconPort: s.rconPort,
      rconPassword: s.password,
      provider: 'config'
    });
  }
  return list;
}

function findServer(db, guildId, query) {
  const q = normalize(query);
  return getAllServers(db, guildId).find(s =>
    normalize(s.id) === q || normalize(s.name) === q || normalize(s.server) === q
  );
}

function getRconConfig(server) {
  return {
    host: server.rconHost || server.rcon_host || server.host || server.ip,
    port: Number(server.rconPort || server.rcon_port || server.rcon || server.port || 0),
    password: server.rconPassword || server.rcon_password || server.password || ''
  };
}

async function send(server, command) {
  const r = getRconConfig(server);
  if (!r.host || !r.port || !r.password) {
    throw new Error('RCON non configuré. Il faut rcon_host, rcon_port et rcon_password. Pour GPortal, active RCON dans le panel puis copie host/port/password.');
  }
  const client = await Rcon.connect({ host: r.host, port: r.port, password: r.password });
  try { return await client.send(command); }
  finally { client.end(); }
}

module.exports = { getAllServers, findServer, send, getRconConfig };
