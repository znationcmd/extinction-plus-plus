import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { seal, origin, cookieOptions, failure } from '../../../../lib/mod-auth';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) throw new Error('CLIENT_ID et CLIENT_SECRET Discord requis sur le Dashboard.');
    const state = crypto.randomBytes(32).toString('hex');
    const url = new URL('https://discord.com/oauth2/authorize');
    url.search = new URLSearchParams({ client_id: process.env.CLIENT_ID, response_type: 'code', redirect_uri: `${origin()}/api/mod-auth/callback`, scope: 'identify guilds guilds.members.read', state }).toString();
    const res = NextResponse.redirect(url);
    res.cookies.set('extinction_mod_oauth', seal({ state, expires: Date.now()+600000 }), { ...cookieOptions, maxAge: 600 });
    return res;
  } catch(e) { return failure(e); }
}
