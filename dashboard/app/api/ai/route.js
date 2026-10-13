import {guarded} from '../../../lib/dashboard-auth';
export const POST=guarded(async req=>{
 let body;try{body=await req.json()}catch{return Response.json({error:'JSON invalide'},{status:400})}
 const message=typeof body?.message==='string'?body.message.trim():'';
 if(!message||message.length>1000)return Response.json({error:'Question invalide (1000 caractères maximum)'},{status:400});
 const history=Array.isArray(body.history)?body.history.slice(-12).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,1200)})):[];
 try{
  const upstream=await fetch('https://cmd-ai-cpu-web-production.up.railway.app/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,history}),signal:AbortSignal.timeout(50000),cache:'no-store'});
  const data=await upstream.json().catch(()=>({error:'Réponse CMD NEURIA invalide'}));
  return Response.json(upstream.ok?{reply:String(data.reply||'')}:{error:String(data.error||'CMD NEURIA indisponible')},{status:upstream.status});
 }catch{return Response.json({error:'CMD NEURIA momentanément indisponible'},{status:503})}
});
