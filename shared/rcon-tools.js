const { Rcon } = require('rcon-client');
const config = require('../config');
const secure = require('./secure-store');
const games = require('../dashboard/lib/games.cjs');
const battleye = require('./battleye-rcon');

function normalize(s) { return String(s || '').trim().toLowerCase(); }

function getAllServers(db, guildId) {
  const list = [];
  const cfg = db.guilds?.[guildId];
  if (cfg?.servers) list.push(...cfg.servers.map(s => ({ ...s, guildId })));
  for (const [key, s] of Object.entries(guildId === config.GUILD_ID ? config.ARK_SERVERS || {} : {})) {
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
  list.push(...(db.connectedServers || []).filter(s => s.guildId === guildId));
  return [...new Map(list.map(s => [s.id,s])).values()];
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
    password: secure.decrypt(server.rconPassword || server.rcon_password || server.password || '')
  };
}

async function send(server, command) {
  const game=games.normalize(server.game,server.platform);
  const protocol=game==='arma' ? (server.rconProtocol==='battleye'?'battleye':null) : games.games[game].rcon;
  if(!protocol)throw new Error('RCON indisponible pour ce jeu ou protocole non configuré. Arma Reforger exige un port BattlEye explicitement sélectionné.');
  const r = getRconConfig(server);
  if (!r.host || !r.port || !r.password) {
    throw new Error('RCON non configuré. Il faut rcon_host, rcon_port et rcon_password. Pour GPortal, active RCON dans le panel puis copie host/port/password.');
  }
  if(protocol==='battleye')return battleye.send(r,command);
  const client = await Rcon.connect({ host: r.host, port: r.port, password: r.password, timeout: 10000 });
  try { return await client.send(command); }
  finally { client.end(); }
}

module.exports = { getAllServers, findServer, send, getRconConfig };
