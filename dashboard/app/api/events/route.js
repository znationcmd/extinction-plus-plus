import { guarded } from '../../../lib/dashboard-auth';
import { readDb } from '../../../lib/db';
async function handleGET(){ const db=(await readDb()); return Response.json((db.events||[]).slice(-100).reverse()); }

export const GET=guarded(handleGET);
