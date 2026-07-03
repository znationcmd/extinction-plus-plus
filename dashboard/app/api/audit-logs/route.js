import { readDb } from '../../../lib/db';
export async function GET(req){ const db = readDb(); const u = new URL(req.url); const guildId = u.searchParams.get('guildId'); let logs = db.auditLogs || []; if (guildId) logs = logs.filter(l => String(l.guildId) === String(guildId)); return Response.json({ ok:true, auditLogs: logs.slice(-300).reverse() }); }
