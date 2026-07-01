import { readDb, writeDb } from '../../../lib/db';
function id(){ return `${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }
export async function GET(req) { const db=readDb(); const url=new URL(req.url); const guildId=url.searchParams.get('guildId'); let list=db.alarms||[]; if(guildId) list=list.filter(x=>x.guildId===guildId); return Response.json({ok:true, alarms:list}); }
export async function POST(req) { const body=await req.json().catch(()=>({})); const db=readDb(); db.alarms=db.alarms||[]; const action=body.action||'create';
 if(action==='create'){ const item={ id:body.id||id(), guildId:body.guildId||'global', serverId:body.serverId||'', server:body.server||'', name:body.name||body.nom||'Alarme', x:Number(body.x||0), z:Number(body.z||0), radius:Number(body.radius||body.rayon||50), type:body.type||'base', enabled:body.enabled!==false, triggers:[], createdAt:new Date().toISOString()}; db.alarms.push(item); writeDb(db); return Response.json({ok:true,alarm:item}); }
 const item=db.alarms.find(x=>String(x.id)===String(body.id)); if(!item) return Response.json({ok:false,error:'alarme introuvable'},{status:404});
 if(action==='trigger') item.triggers=[...(item.triggers||[]),{id:id(),player:body.player||'',message:body.message||'Déclenchement alarme',createdAt:new Date().toISOString()}];
 if(action==='toggle') item.enabled=Boolean(body.enabled); if(action==='update') Object.assign(item, body.patch||{}); writeDb(db); return Response.json({ok:true,alarm:item}); }
