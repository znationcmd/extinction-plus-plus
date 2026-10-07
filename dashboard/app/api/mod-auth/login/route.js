import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { seal, origin, cookieOptions, failure } from '../../../../lib/mod-auth';
export const dynamic = 'force-dynamic';
function bridgeTarget(value){
  if(!value)return null;
  let target;try{target=new URL(value)}catch{throw new Error('Dashboard partenaire invalide.');}
  const allowed=String(process.env.DISCORD_BRIDGE_TARGETS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(target.protocol!=='https:'||!allowed.includes(target.origin))throw new Error('Dashboard partenaire non autorisé.');
  return target.origin;
}
export async function GET(req) {
  try {
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) throw new Error('CLIENT_ID et CLIENT_SECRET Discord requis sur le Dashboard.');
    const requestUrl=new URL(req.url);
    const bridge=bridgeTarget(requestUrl.searchParams.get('bridge'));
    const bridgeState=requestUrl.searchParams.get('bridge_state');
    if(bridgeState&&bridgeState.length>7000)throw new Error('État de connexion partenaire trop volumineux.');
    const state = crypto.randomBytes(32).toString('hex');
    const url = new URL('https://discord.com/oauth2/authorize');
    url.search = new URLSearchParams({ client_id: process.env.CLIENT_ID, response_type: 'code', redirect_uri: `${origin()}/api/mod-auth/callback`, scope: 'identify guilds guilds.members.read', state }).toString();
    const res = NextResponse.redirect(url);
    const returnTo=requestUrl.searchParams.get('next')==='groups'?'/groups':'/select-discord';
    res.cookies.set('extinction_mod_oauth', seal({ state, returnTo, bridgeTarget:bridge, bridgeState:bridgeState||null, expires: Date.now()+600000 }), { ...cookieOptions, maxAge: 600 });
    return res;
  } catch(e) { return failure(e); }
}
