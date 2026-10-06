import { cache } from 'react';
import { cookies } from 'next/headers';
import { session, discord, authorize, sameOrigin, failure } from './mod-auth';
import { redirect } from 'next/navigation';
function canManageGuild(g){if(g?.owner)return true;try{const p=BigInt(g?.permissions||'0');return Boolean((p&8n)||(p&32n))}catch{return false}}
export const activeGuild=cache(async function activeGuild() {
  const s=await session();
  const selected=(await cookies()).get('extinction_guild')?.value;
  const guilds=await discord('/users/@me/guilds',s.token);
  const id=selected || guilds.find(canManageGuild)?.id;
  if(!id) throw Object.assign(new Error('Choisis un Discord dans Paramètres.'),{status:403});
  const guild=guilds.find(g=>String(g.id)===String(id));
  if(!guild)throw Object.assign(new Error('Accès refusé à ce Discord.'),{status:403});
  if(!canManageGuild(guild))await authorize(id,false,{session:s,guilds});
  return id;
});
export function guarded(handler) {
  return async function(req,context) {
    try {
      if(req.method!=='GET' && req.method!=='HEAD') sameOrigin(req);
      const id=await activeGuild();
      const requested=new URL(req.url).searchParams.get('guildId');
      if(requested && requested!==id) throw Object.assign(new Error('Choisis ce Discord dans Paramètres avant de continuer.'),{status:403});
      if(req.method!=='GET' && req.method!=='HEAD') {
        const length=Number(req.headers.get('content-length')||0);
        if(length>1024*1024) throw Object.assign(new Error('Requête trop volumineuse.'),{status:413});
        if(!req.headers.get('content-type')?.includes('application/json')) throw Object.assign(new Error('JSON requis.'),{status:415});
        const reader=req.clone().body?.getReader();let size=0;const chunks=[];
        if(reader) while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>1024*1024){await reader.cancel();throw Object.assign(new Error('Requête trop volumineuse.'),{status:413});}chunks.push(Buffer.from(r.value));}
        const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
        if(body.guildId && body.guildId!==id) throw Object.assign(new Error('Discord différent de la sélection.'),{status:403});
      }
      const response=await handler(req,context);
      response.headers.set('Cache-Control','no-store');return response;
    } catch(e) {return failure(e);}
  };
}
export async function requirePage() {
  try {await activeGuild();} catch(e) {if(e.status===401)redirect('/login');if(e.status===403)redirect('/select-discord');throw e;}
}
