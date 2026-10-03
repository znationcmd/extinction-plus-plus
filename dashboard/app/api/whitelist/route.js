import { NextResponse } from 'next/server';
import { readDb } from '../../../lib/db';

export async function GET() {
  try {
    const db = await readDb();

    return NextResponse.json({
      success: true,
      requests: db.pendingWhitelist || [],
      servers: [
        ...(db.connectedServers || []),
        ...Object.values(db.guilds || {}).flatMap(g => g.servers || [])
      ]
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      requests: [],
      servers: []
    }, { status: 500 });
  }
}
