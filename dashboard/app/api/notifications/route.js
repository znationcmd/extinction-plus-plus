import { readDb, writeDb } from '../../../lib/db';

export async function GET() {
  const db = readDb();
  return Response.json(db.notifications || []);
}

export async function POST(req) {
  const body = await req.json();
  const db = readDb();
  db.notifications = db.notifications || [];
  const item = {
    id: body.id || String(Date.now()),
    ...body,
    createdAt: body.createdAt || new Date().toISOString()
  };
  db.notifications.push(item);
  writeDb(db);
  return Response.json({ ok: true, item });
}
