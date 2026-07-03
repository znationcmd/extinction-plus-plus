import { readDb, writeDb } from '../../../lib/db';
export async function GET(){ return Response.json(readDb().battlepass || {}); }
export async function POST(req){ const body=await req.json(); const db=readDb(); db.battlepass=body; writeDb(db); return Response.json({ok:true}); }
