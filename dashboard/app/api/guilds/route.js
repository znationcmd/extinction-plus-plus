import { guarded } from '../../../lib/dashboard-auth';
import { readDb } from '../../../lib/db';
async function handleGET(){ const db=(await readDb()); return Response.json(Object.entries(db.guilds||{}).map(([id,data])=>({id,name:data.name||id}))); }

export const GET=guarded(handleGET);
