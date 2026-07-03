import fs from 'fs';
import path from 'path';

export function dbPath() {
  if (process.env.BOT_DATABASE_PATH) return path.resolve(process.cwd(), process.env.BOT_DATABASE_PATH);
  return path.resolve(process.cwd(), '..', 'shared', 'database.json');
}

function defaultDb() {
  return {
    version: 8,
    guilds: {}, ownerConfigs: {}, users: {}, sessions: {},
    events: [], auditLogs: [], notifications: [], backups: [],
    pendingWhitelist: [], whitelistApproved: [], whitelistRejected: [], steamLinks: [],
    shopPurchases: [], shop: [], shopCategories: [], deliveries: [],
    battlepass: { levels: [], xp: [], rewards: [], claims: [] }, quests: [],
    rp: { jobs: [], licenses: [], fines: [], warrants: [], companies: [], properties: [], salaries: [], citizens: [] },
    interpol: [], alarms: [], economy: { currencies: [], transactions: [] }, bank: { accounts: [] },
    tickets: [], leaderboard: [], stats: { players: 0, shops: 0, kills: 0, orders: 0 },
    coupons: [], promotions: [], plugins: [], aiAssistant: { enabled: false, knowledge: [] },
    nitradoServers: [], nitradoAccounts: {}, connectedServers: [], saasAudit: [], rconProfiles: []
  };
}

export function normalizeDb(parsed = {}) {
  const base = defaultDb();
  return {
    ...base,
    ...parsed,
    rp: { ...base.rp, ...(parsed.rp || {}) },
    economy: { ...base.economy, ...(parsed.economy || {}) },
    bank: { ...base.bank, ...(parsed.bank || {}) },
    stats: { ...base.stats, ...(parsed.stats || {}) },
    battlepass: { ...base.battlepass, ...(parsed.battlepass || {}) },
    aiAssistant: { ...base.aiAssistant, ...(parsed.aiAssistant || {}) },
    guilds: parsed.guilds || {}, ownerConfigs: parsed.ownerConfigs || {}, sessions: parsed.sessions || {},
    pendingWhitelist: Array.isArray(parsed.pendingWhitelist) ? parsed.pendingWhitelist : [],
    connectedServers: Array.isArray(parsed.connectedServers) ? parsed.connectedServers : [],
    nitradoAccounts: parsed.nitradoAccounts || {}
  };
}

export function readDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return defaultDb();
  try { return normalizeDb(JSON.parse(fs.readFileSync(p, 'utf8'))); }
  catch { return defaultDb(); }
}

export function writeDb(db) {
  const p = dbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const normalized = normalizeDb(db);
  const tmp = `${p}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(normalized, null, 2), 'utf8');
  fs.renameSync(tmp, p);
}

export function addAudit(db, entry) {
  db.auditLogs = db.auditLogs || [];
  db.auditLogs.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`, at: new Date().toISOString(), ...entry });
  if (db.auditLogs.length > 5000) db.auditLogs = db.auditLogs.slice(-5000);
}

export function guildOwnsServer(db, guildId, serverId) {
  return (db.connectedServers || []).some(s => String(s.guildId) === String(guildId) && (String(s.id) === String(serverId) || String(s.nitradoServiceId) === String(serverId)));
}

export const GAME_LABELS = {
  dayz_pc: 'DayZ PC', dayz_ps: 'DayZ PlayStation', dayz_xbox: 'DayZ Xbox', ark: 'ARK Crossplay', palworld: 'Palworld', arma: 'Arma Reforger', conan: 'Conan Exiles'
};
