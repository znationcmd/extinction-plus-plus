import { NextResponse } from 'next/server';
import { ensureTables, getPool, normalizeServer } from '../../../lib/pgdb';

export async function GET() {
  try {
    await ensureTables();
    const result = await getPool().query('SELECT * FROM servers ORDER BY created_at DESC');
    return NextResponse.json({ success: true, servers: result.rows.map(normalizeServer) });
  } catch (error) {
    console.error('GET /api/servers', error);
    return NextResponse.json({ success: false, error: error.message, servers: [] }, { status: 500 });
  }
}
