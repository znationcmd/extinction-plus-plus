import { NextResponse } from 'next/server';
import { readDb, writeDb } from '../../../lib/jsonDb';

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json({
      success: true,
      requests: db.whitelist_requests || [],
      servers: db.servers || []
    });
  } catch (error) {
    console.error('GET /api/whitelist', error);
    return NextResponse.json(
      { success: false, error: error.message, requests: [], servers: [] },
      { status: 500 }
    );
  }
}
