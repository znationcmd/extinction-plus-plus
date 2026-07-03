import { readDb, writeDb } from '../../../lib/db';

export async function GET() {
  return Response.json(readDb().rp || {});
}

export async function POST(req) {
  const body = await req.json();
  const db = readDb();
  db.rp = db.rp || { jobs: [], licenses: [], fines: [], warrants: [], companies: [], properties: [], salaries: [] };

  if (body.type === 'job') {
    const job = {
      id: body.id || String(Date.now()),
      serverId: body.serverId || '',
      name: body.name || 'Métier',
      salary: body.salary || 0,
      permissions: body.permissions || [],
      createdAt: new Date().toISOString()
    };
    db.rp.jobs.push(job);
    writeDb(db);
    return Response.json({ ok: true, job });
  }

  writeDb(db);
  return Response.json({ ok: true, rp: db.rp });
}
