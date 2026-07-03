import { NextResponse } from 'next/server';
import { ensureTables, getPool, normalizeWhitelist } from '../../../lib/pgdb';

export async function GET() {
  try {
    await ensureTables();
    const result = await getPool().query('SELECT * FROM whitelist_requests ORDER BY created_at DESC');
    return NextResponse.json({ success: true, requests: result.rows.map(normalizeWhitelist) });
  } catch (error) {
    console.error('GET /api/whitelist', error);
    return NextResponse.json({ success: false, error: error.message, requests: [] }, { status: 500 });
  }
}
