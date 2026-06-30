import { readDb } from '../../../lib/db';
export async function GET(){ const db=readDb(); return Response.json(Object.entries(db.guilds||{}).map(([id,data])=>({id,...data}))); }
