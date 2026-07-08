import { NextResponse } from 'next/server';
import { readDb, writeDb } from '../../../lib/jsonDb';

export async function GET() {
  try {
    const db = await readDb();

    const servers = [
      ...(db.connectedServers || []),
      ...Object.values(db.guilds || {}).flatMap(g => g.servers || [])
    ];

    return NextResponse.json({
      success: true,
      servers
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      servers: []
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const db = await readDb();

    const server = {
      id: body.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: body.name || body.nom || 'Serveur sans nom',
      game: body.game || body.jeu || 'dayz',
      map: body.map || '',
      platform: body.platform || body.plateforme || '',
      ip: body.ip || '',
      port: body.port || '',
      nitradoId: body.nitradoId || body.service_id || '',
      whitelistEnabled: body.whitelistEnabled ?? true,
      shopEnabled: body.shopEnabled ?? true,
      createdAt: new Date().toISOString()
    };

    db.connectedServers = db.connectedServers || [];
    db.connectedServers.push(server);

    await writeDb(db);

    return NextResponse.json({
      success: true,
      server
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
