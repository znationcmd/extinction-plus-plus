import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {session,discord,authorize,sameOrigin,failure,cookieOptions,sessionLifetime} from '../../../lib/mod-auth';
import {readPageDb as readDb} from '../../../lib/db';

const iconUrl=g=>g.icon?`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.webp?size=128`:null;
function canManageGuild(g){
  if(g?.owner)return true;
  try{const p=BigInt(g?.permissions||'0');return Boolean((p&8n)||(p&32n))}catch{return false}
}

async function botGuildIds(){
  const token=process.env.DISCORD_TOKEN||process.env.TOKEN||process.env.BOT_TOKEN||'';
  if(!token)return null;
  try{
    const r=await fetch('https://discord.com/api/v10/users/@me/guilds',{headers:{Authorization:`Bot ${token}`},cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!r.ok)return null;
    return new Set((await r.json()).map(g=>String(g.id)));
  }catch{return null}
}
async function knownGuildIds(){
  const ids=new Set();
  try{
    const db=await readDb();
    for(const id of Object.keys(db.guilds||{}))ids.add(String(id));
    for(const s of db.connectedServers||[])if(s?.guildId)ids.add(String(s.guildId));
    for(const id of Object.keys(db.nitradoAccounts||{}))if(/^\d{15,22}$/.test(id))ids.add(String(id));
  }catch{}
  const env=String(process.env.GUILD_ID||'');
  if(/^\d{15,22}$/.test(env))ids.add(env);
  return ids;
}

export async function GET(){
  try{
    const s=await session();
    const all=await discord('/users/@me/guilds',s.token);
    const liveInstalled=await botGuildIds();
    const installed=liveInstalled||await knownGuildIds();
    const guilds=[];
    const clientId=String(process.env.CLIENT_ID||'');
    const inviteFor=id=>clientId?`https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&permissions=268454928&integration_type=0&scope=bot%20applications.commands&guild_id=${encodeURIComponent(id)}&disable_guild_select=true`:null;
    for(const g of all){
      const isInstalled=installed.has(String(g.id));
      if(canManageGuild(g)){
        guilds.push({id:g.id,name:g.name,icon:iconUrl(g),owner:Boolean(g.owner),manager:true,installed:isInstalled,inviteUrl:isInstalled?null:inviteFor(g.id)});
        continue;
      }
      if(!isInstalled)continue;
      try{
        await authorize(g.id,false,{session:s,guilds:all});
        guilds.push({id:g.id,name:g.name,icon:iconUrl(g),owner:false,manager:false,installed:true,inviteUrl:null});
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
    const liveInstalled=await botGuildIds();
    const installed=liveInstalled||await knownGuildIds();
    if(installed.size&&!installed.has(String(guildId)))throw Object.assign(new Error('EXTINCTION ++ RSS n’est pas installé sur ce Discord.'),{status:404});
    const s=await session(),all=await discord('/users/@me/guilds',s.token),guild=all.find(g=>String(g.id)===String(guildId));
    if(!guild)throw Object.assign(new Error('Accès refusé à ce Discord.'),{status:403});
    if(!canManageGuild(guild))await authorize(guildId,false,{session:s,guilds:all});
    const r=NextResponse.json({ok:true});
    r.cookies.set('extinction_guild',guildId,{...cookieOptions,maxAge:sessionLifetime});
    return r;
  }catch(e){return failure(e)}
}
