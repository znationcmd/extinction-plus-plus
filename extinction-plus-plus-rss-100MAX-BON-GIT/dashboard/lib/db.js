import fs from 'fs';
import path from 'path';

export function dbPath() {
  if (process.env.BOT_DATABASE_PATH) {
    return path.resolve(process.cwd(), process.env.BOT_DATABASE_PATH);
  }
  return path.resolve(process.cwd(), '..', 'shared', 'database.json');
}

function defaultDb() {
  return {
    guilds: {},
    ownerConfigs: {},
    users: {},
    events: [],
    pendingWhitelist: [],
    shopPurchases: [],
    shop: [],
    shopCategories: [],
    deliveries: [],
    battlepass: { levels: [] },
    quests: [],
    rp: { jobs: [], licenses: [], fines: [], warrants: [], companies: [], properties: [], salaries: [] },
    interpol: [],
    alarms: [],
    economy: { currencies: [], transactions: [] },
    bank: { accounts: [] },
    tickets: [],
    leaderboard: [],
    stats: { players: 0, shops: 0, kills: 0, orders: 0 },
    coupons: [],
    promotions: [],
    plugins: [],
    aiAssistant: { enabled: false, knowledge: [] },
    nitradoServers: [],
    nitradoAccounts: {},
    connectedServers: [],
    saasAudit: [],
    backups: [],
    notifications: []
  };
}

export function readDb() {
  const p = dbPath();
  const base = defaultDb();
  if (!fs.existsSync(p)) return base;

  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      ...base,
      ...parsed,
      rp: { ...base.rp, ...(parsed.rp || {}) },
      economy: { ...base.economy, ...(parsed.economy || {}) },
      bank: { ...base.bank, ...(parsed.bank || {}) },
      stats: { ...base.stats, ...(parsed.stats || {}) },
      battlepass: { ...base.battlepass, ...(parsed.battlepass || {}) },
      aiAssistant: { ...base.aiAssistant, ...(parsed.aiAssistant || {}) }
    };
  } catch {
    return base;
  }
}

export function writeDb(db) {
  const p = dbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(db, null, 2), 'utf8');
}

export const GAME_LABELS = {
  dayz_pc: 'DayZ PC',
  dayz_ps: 'DayZ PlayStation',
  dayz_xbox: 'DayZ Xbox',
  ark: 'ARK Crossplay',
  palworld: 'Palworld',
  arma: 'Arma Reforger',
  conan: 'Conan Exiles'
};
