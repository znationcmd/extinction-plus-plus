import { readDb, dbPath } from '../../../lib/db';
import fs from 'fs';

export async function GET() {
  const db = readDb();
  const checks = {
    dashboard: true,
    databaseFile: fs.existsSync(dbPath()),
    discordToken: Boolean(process.env.DISCORD_TOKEN || process.env.TOKEN),
    clientId: Boolean(process.env.CLIENT_ID),
    clientSecret: Boolean(process.env.CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET),
    dashboardUrl: Boolean(process.env.DASHBOARD_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN),
    databaseUrl: Boolean(process.env.DATABASE_URL),
    openAi: Boolean(process.env.OPENAI_API_KEY),
    encryptionSecret: Boolean(process.env.SECRET_KEY || process.env.SESSION_SECRET || process.env.ENCRYPTION_SECRET),
    globalNitrado: Boolean(process.env.NITRADO_TOKEN),
    guilds: Object.keys(db.guilds || {}).length,
    nitradoAccounts: Object.keys(db.nitradoAccounts || {}).length,
    connectedServers: (db.connectedServers || []).length,
    modules: {
      battlepass: Boolean(db.battlepass), interpol: Array.isArray(db.interpol), rp: Boolean(db.rp), alarms: Array.isArray(db.alarms), shop: Array.isArray(db.shop), whitelist: Array.isArray(db.pendingWhitelist)
    }
  };
  const ready = checks.databaseFile && checks.encryptionSecret && checks.clientId && checks.clientSecret && checks.dashboardUrl;
  return Response.json({ ok: true, ready, dbPath: dbPath(), checks, time: new Date().toISOString() });
}
