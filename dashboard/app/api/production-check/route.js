import { readDb, dbPath } from '../../../lib/db';
import { pgHealth } from '../../../lib/postgres';
import fs from 'fs';

export async function GET() {
  const db = readDb();
  let postgres = { enabled:false };
  try { postgres = await pgHealth(); } catch (e) { postgres = { enabled:true, ok:false, error:String(e?.message || e) }; }
  const checks = {
    dashboard: true,
    databaseFile: fs.existsSync(dbPath()),
    postgres,
    discordBotToken: Boolean(process.env.DISCORD_TOKEN || process.env.TOKEN),
    discordOAuth: Boolean((process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID) && (process.env.CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET)),
    dashboardUrl: Boolean(process.env.DASHBOARD_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN),
    encryptionSecret: Boolean(process.env.SECRET_KEY || process.env.SESSION_SECRET || process.env.ENCRYPTION_SECRET),
    openAi: Boolean(process.env.OPENAI_API_KEY),
    globalNitrado: Boolean(process.env.NITRADO_TOKEN),
    guildCount: Object.keys(db.guilds || {}).length,
    nitradoAccounts: Object.keys(db.nitradoAccounts || {}).length,
    connectedServers: (db.connectedServers || []).length,
    whitelistPending: (db.pendingWhitelist || []).length,
    whitelistApproved: (db.whitelistApproved || []).length,
    modules: { battlepass:Boolean(db.battlepass?.levels), interpol:Array.isArray(db.interpol), rp:Boolean(db.rp?.jobs), alarms:Array.isArray(db.alarms), shop:Array.isArray(db.shop), rcon:Array.isArray(db.rconProfiles) }
  };
  const missing = Object.entries(checks).filter(([k,v]) => typeof v === 'boolean' && !v).map(([k])=>k);
  return Response.json({ ok:true, productionReady: missing.length === 0 && checks.postgres.enabled !== false, missing, checks, dbPath: dbPath(), time:new Date().toISOString() });
}
