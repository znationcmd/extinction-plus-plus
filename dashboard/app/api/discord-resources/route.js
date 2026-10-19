import {activeGuild,guarded} from '../../../lib/dashboard-auth';

export const dynamic='force-dynamic';

const idPattern=/^\d{15,22}$/;
async function fromDiscord(path,token){
  const endpoint='https://discord.com/api/v10'+path;
  for(let attempt=0;attempt<2;attempt++){
    const reply=await fetch(endpoint,{
      headers:{Authorization:'Bot '+token,Accept:'application/json'},
      cache:'no-store',signal:AbortSignal.timeout(12000)
    });
    if(reply.status===429&&attempt===0){
      const info=await reply.json().catch(()=>({}));
      const wait=Math.min(2000,Math.max(200,Math.ceil(Number(info.retry_after||1)*1000)));
      await new Promise(resolve=>setTimeout(resolve,wait));
      continue;
    }
    if(!reply.ok){
      const status=[401,403,404].includes(reply.status)?503:reply.status===429?503:502;
      throw Object.assign(new Error(reply.status===403?'Le bot ne peut pas consulter les salons ou les rôles de ce Discord. Vérifie ses autorisations.':reply.status===404?"Ce serveur Discord n'est pas accessible au bot.":'Catalogue Discord temporairement indisponible.'),{status});
    }
    const rows=await reply.json();
    if(!Array.isArray(rows))throw Object.assign(new Error('Réponse Discord inattendue.'),{status:502});
    return rows;
  }
  throw Object.assign(new Error('Discord limite les requêtes. Réessaie dans un instant.'),{status:503});
}

export const GET=guarded(async()=>{
  // activeGuild verifies the login and that this exact guild is selected and authorised.
  const guildId=String(await activeGuild());
  if(!idPattern.test(guildId))throw Object.assign(new Error('Sélectionne un Discord valide.'),{status:400});
  const token=String(process.env.DISCORD_TOKEN||process.env.TOKEN||process.env.BOT_TOKEN||'');
  if(!token)throw Object.assign(new Error('Le bot Discord n’est pas connecté à ce Dashboard.'),{status:503});
  const [channels,roles]=await Promise.all([
    fromDiscord('/guilds/'+guildId+'/channels',token),
    fromDiscord('/guilds/'+guildId+'/roles',token)
  ]);
  const cleanChannels=channels.filter(c=>[0,2,4,5,13,15].includes(Number(c.type)))
    .map(c=>({id:String(c.id),name:String(c.name||'Sans nom').slice(0,100),type:Number(c.type),
      parentId:c.parent_id?String(c.parent_id):null}))
    .sort((a,b)=>a.type-b.type||a.name.localeCompare(b.name,'fr'));
  const cleanRoles=roles.filter(r=>String(r.id)!==guildId)
    .map(r=>({id:String(r.id),name:String(r.name||'Sans nom').slice(0,100),
      position:Number(r.position||0),managed:Boolean(r.managed),color:Number(r.color||0)}))
    .sort((a,b)=>b.position-a.position||a.name.localeCompare(b.name,'fr'));
  return Response.json({guildId,channels:cleanChannels,roles:cleanRoles},{
    headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}
  });
});
