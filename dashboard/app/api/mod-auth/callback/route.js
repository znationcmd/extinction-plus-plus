import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { seal, unseal, origin, cookieOptions, discord, failure, createSession, sessionLifetime } from '../../../../lib/mod-auth';
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
    if(saved.bridgeTarget){
      const secret=String(process.env.DISCORD_BRIDGE_SECRET||'');
      if(secret.length<32)throw new Error('DISCORD_BRIDGE_SECRET doit contenir au moins 32 caractères.');
      const all=await discord('/users/@me/guilds',token.access_token);
      const canManage=g=>{if(g?.owner)return true;try{const p=BigInt(g?.permissions||'0');return Boolean((p&8n)||(p&32n))}catch{return false}};
      const guilds=all.filter(canManage).slice(0,50).map(g=>({id:String(g.id),name:String(g.name||g.id).slice(0,100),icon:g.icon||null,owner:Boolean(g.owner),permissions:String(g.permissions||'0')}));
      const avatar=user.avatar?`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${String(user.avatar).startsWith('a_')?'gif':'png'}?size=256`:null;
      const banner=user.banner?`https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${String(user.banner).startsWith('a_')?'gif':'png'}?size=1024`:null;
      const payload=Buffer.from(JSON.stringify({v:1,exp:Date.now()+5*60*1000,user:{id:String(user.id),name:String(user.username||'Discord').slice(0,100),displayName:String(user.global_name||user.username||'Discord').slice(0,100),avatar,banner,accentColor:user.accent_color??null,avatarDecorationData:user.avatar_decoration_data||null,collectibles:user.collectibles||null,primaryGuild:user.primary_guild||null},guilds})).toString('base64url');
      const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
      const target=new URL('/auth/discord-bridge',saved.bridgeTarget);target.searchParams.set('token',payload+'.'+sig);if(saved.bridgeState)target.searchParams.set('state',saved.bridgeState);
      return NextResponse.redirect(target);
    }
    const persistent = await createSession(token,user);
    const res = NextResponse.redirect(`${origin()}${saved.returnTo==='/groups'?'/groups':'/select-discord'}`);
    res.cookies.set('extinction_mod_session', seal(persistent), { ...cookieOptions, maxAge:sessionLifetime });
    return res;
  } catch(e) { return failure(e); }
}
