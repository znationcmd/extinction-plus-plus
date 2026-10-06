import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {session,discord,authorize,sameOrigin,failure,cookieOptions,sessionLifetime} from '../../../lib/mod-auth';

const iconUrl=g=>g.icon?`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.webp?size=128`:null;

async function botGuildIds(){
  const token=process.env.DISCORD_TOKEN||process.env.TOKEN||process.env.BOT_TOKEN||'';
  if(!token)return null;
  try{
    const r=await fetch('https://discord.com/api/v10/users/@me/guilds',{headers:{Authorization:`Bot ${token}`},cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!r.ok)return null;
    return new Set((await r.json()).map(g=>String(g.id)));
  }catch{return null}
}

export async function GET(){
  try{
    const s=await session();
    const all=await discord('/users/@me/guilds',s.token);
    const installed=await botGuildIds();
    const guilds=[];
    for(const g of all){
      if(installed&&!installed.has(String(g.id)))continue;
      if(g.owner)guilds.push({id:g.id,name:g.name,icon:iconUrl(g),owner:true,installed:true});
      else try{
        await authorize(g.id,false,{session:s,guilds:all});
        guilds.push({id:g.id,name:g.name,icon:iconUrl(g),owner:false,installed:true});
      }catch(e){if(e.status!==403)throw e}
    }
    const selectedGuildId=(await cookies()).get('extinction_guild')?.value||null;
    return Response.json({guilds,selectedGuildId},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return failure(e)}
}

export async function POST(req){
  try{
    sameOrigin(req);
    const {guildId}=await req.json();
    const installed=await botGuildIds();
    if(installed&&!installed.has(String(guildId)))throw Object.assign(new Error('EXTINCTION ++ RSS n’est pas installé sur ce Discord.'),{status:404});
    await authorize(guildId);
    const r=NextResponse.json({ok:true});
    r.cookies.set('extinction_guild',guildId,{...cookieOptions,maxAge:sessionLifetime});
    return r;
  }catch(e){return failure(e)}
}
