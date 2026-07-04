import { NextResponse } from 'next/server';
import { ensureTables, getPool, normalizeWhitelist } from '../../../lib/pgdb';

export async function GET() {
  try {
    await ensureTables();
    const res = await fetch(`${process.env.DASHBOARD_URL}/api/whitelist`, { cache: 'no-store' });
    const data = await res.json();
    return data.requests || [];
    return NextResponse.json({ success: true, requests:
  } catch (error) {
    console.error('GET /api/whitelist', error);
    return NextResponse.json({ success: false, error: error.message, requests: [] }, { status: 500 });
  }
}
