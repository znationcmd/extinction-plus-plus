import { guarded } from '../../../lib/dashboard-auth';
import { NextResponse } from 'next/server';
import { readDb } from '../../../lib/db';

async function handleGET() {
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

export const GET=guarded(handleGET);

import {activeGuild} from '../../../lib/dashboard-auth';
import {session} from '../../../lib/mod-auth';
import jobs from '../../../lib/bot-jobs.cjs';
export const POST=guarded(async req=>{const {requestId,decision}=await req.json();if(!['approve','reject'].includes(decision))throw new Error('Décision invalide.');const id=await activeGuild(),db=await readDb();if(!(db.pendingWhitelist||[]).some(r=>r.id===requestId))throw new Error('Demande introuvable.');const jobId=await jobs.enqueue(id,(await session()).userId,'whitelist',{requestId,decision});return Response.json({ok:true,jobId,message:'Validation en attente du bot.'},{status:202});});
