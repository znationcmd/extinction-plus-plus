import { readDb, writeDb } from '../../../lib/db';

export async function GET() {
  const db = readDb();
  return Response.json(db.deliveries || []);
}

export async function POST(req) {
  const body = await req.json();
  const db = readDb();
  db.deliveries = db.deliveries || [];
  const item = {
    id: body.id || String(Date.now()),
    ...body,
    createdAt: body.createdAt || new Date().toISOString()
  };
  db.deliveries.push(item);
  writeDb(db);
  return Response.json({ ok: true, item });
}
