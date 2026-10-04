import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { seal, unseal, origin, cookieOptions, discord, failure } from '../../../../lib/mod-auth';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const jar = await cookies();
  const saved = unseal(jar.get('extinction_mod_oauth')?.value);
  jar.delete('extinction_mod_oauth');
  try {
    const url = new URL(req.url);
    if (!saved || saved.state !== url.searchParams.get('state') || !url.searchParams.get('code')) throw new Error('Connexion Discord invalide. Recommence la connexion.');
    const reply = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'Content-Type':'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id:process.env.CLIENT_ID, client_secret:process.env.CLIENT_SECRET, grant_type:'authorization_code', code:url.searchParams.get('code'), redirect_uri:`${origin()}/api/mod-auth/callback` }), signal: AbortSignal.timeout(15000) });
    if (!reply.ok) throw new Error('Discord a refusé la connexion.');
    const token = await reply.json();
    const user = await discord('/users/@me', token.access_token);
    const lifetime = Math.min(Number(token.expires_in), 3600);
    const res = NextResponse.redirect(`${origin()}/dayz-mods`);
    res.cookies.set('extinction_mod_session', seal({ token:token.access_token, userId:user.id, name:user.username, expires:Date.now()+lifetime*1000 }), { ...cookieOptions, maxAge:lifetime });
    return res;
  } catch(e) { return failure(e); }
}
