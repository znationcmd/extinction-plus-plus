import { readDb } from '../../../lib/db';
export async function GET(){ const db=readDb(); return Response.json((db.events||[]).slice(-100).reverse()); }
