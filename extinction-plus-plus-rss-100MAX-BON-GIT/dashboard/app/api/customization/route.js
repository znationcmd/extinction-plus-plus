import { readDb, writeDb } from '../../../lib/db';
export async function GET(req){ const id=new URL(req.url).searchParams.get('guildId'); const db=readDb(); return Response.json(db.guilds?.[id]?.theme || {}); }
export async function POST(req){ const {guildId,theme}=await req.json(); const db=readDb(); db.guilds=db.guilds||{}; db.guilds[guildId]=db.guilds[guildId]||{id:guildId,servers:[],shop:[]}; db.guilds[guildId].theme=theme; writeDb(db); return Response.json({ok:true}); }
