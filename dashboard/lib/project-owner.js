let cache={ids:[],expires:0};

function explicitIds(){
 return String(process.env.PREMIUM_OWNER_DISCORD_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
}

export async function projectOwnerIds(){
 const ids=new Set(explicitIds());
 if(cache.expires>Date.now()){for(const id of cache.ids)ids.add(id);return ids;}
 const token=String(process.env.DISCORD_TOKEN||'').replace(/^Bot\s+/i,'').trim();
 if(token){
  try{
   const r=await fetch('https://discord.com/api/v10/oauth2/applications/@me',{headers:{Authorization:'Bot '+token},cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(r.ok){
    const app=await r.json();
    if(app.owner?.id)ids.add(String(app.owner.id));
    if(app.team?.owner_user_id)ids.add(String(app.team.owner_user_id));
   }
  }catch{}
 }
 cache={ids:[...ids],expires:Date.now()+300000};
 return ids;
}
export async function isProjectOwner(userId){return (await projectOwnerIds()).has(String(userId));}
