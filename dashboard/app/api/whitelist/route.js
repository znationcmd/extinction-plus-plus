import { NextResponse } from 'next/server';
import { readDb } from '../../../lib/db';

export async function GET() {
  try {
    const db = readDb();

    const ownerServers = Object.values(db.ownerConfigs || {})
      .flatMap(cfg => cfg.servers || []);

    const guildServers = Object.values(db.guilds || {})
      .flatMap(g => g.servers || []);

    const servers = [
      ...(db.servers || []),
      ...ownerServers,
      ...guildServers,
    ];

    const requests = [
      ...(db.whitelist_requests || []),
      ...(db.pendingWhitelist || []),
    ];

    return NextResponse.json({
      success: true,
      servers,
      requests,
    });
  } catch (error) {
    console.error('GET /api/whitelist', error);
    return NextResponse.json(
      { success: false, error: error.message, servers: [], requests: [] },
      { status: 500 }
    );
  }
}
