import { NextResponse } from 'next/server';
import { readDb } from '../../../lib/jsonDb';

export async function GET() {
  try {
    const db = await readDb();

    const requests = db.pendingWhitelist || db.whitelist_requests || [];

    const servers = [
      ...(db.connectedServers || []),
      ...Object.values(db.guilds || {}).flatMap(g => g.servers || [])
    ];

    return NextResponse.json({
      success: true,
      requests,
      servers
    });
  } catch (error) {
    console.error('GET /api/whitelist', error);
    return NextResponse.json(
      { success: false, error: error.message, requests: [], servers: [] },
      { status: 500 }
    );
  }
}
