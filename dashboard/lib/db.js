import appStore from './app-store.cjs';
import tenant from './tenant.cjs';
import { activeGuild, requirePage } from './dashboard-auth';
import fs from 'fs';
import path from 'path';

export function dbPath() {
  if (process.env.BOT_DATABASE_PATH) {
    return path.resolve(process.cwd(), process.env.BOT_DATABASE_PATH);
  }
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.cwd(), '..', process.env.DATABASE_PATH);
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
    notifications: [],
    radioMessages: [],
    radioBroadcasts: []
  };
}

const originals = new WeakMap();
export async function readDb() {
  const id = await activeGuild();
  const raw = await appStore.read(dbPath(), defaultDb());
  const scoped = tenant.view(raw,id);
  originals.set(scoped,{raw,id});
  return scoped;
}
export async function readPageDb() {
  await requirePage();
  return readDb();
}
export async function writeDb(db) {
  const saved=originals.get(db);
  if(!saved) throw new Error('Lecture du stockage requise.');
  await appStore.write(dbPath(),tenant.apply(saved.raw,db,saved.id));
}

export const GAME_LABELS = {
  dayz_pc: 'DayZ PC',
  dayz_ps: 'DayZ PlayStation',
  dayz_xbox: 'DayZ Xbox',
  ark: 'ARK Crossplay',
  palworld: 'Palworld',
  arma: 'Arma Reforger',
  conan: 'Conan Exiles',
  '7dtd':'7 Days to Die',
  aniimo:'Aniimo',
  rust: 'Rust'
};
