import { readDb, writeDb } from '../../../lib/db';
function id(){ return `${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }
export async function GET(req) { const db=readDb(); const url=new URL(req.url); const guildId=url.searchParams.get('guildId'); let list=db.interpol||[]; if(guildId) list=list.filter(x=>x.guildId===guildId); return Response.json({ok:true, dossiers:list}); }
export async function POST(req) { const body=await req.json().catch(()=>({})); const db=readDb(); db.interpol=db.interpol||[]; const action=body.action||'create';
 if(action==='create'){ const item={ id:body.id||id(), guildId:body.guildId||'global', player:body.player||body.joueur||'', playerId:body.playerId||'', reason:body.reason||body.raison||'', status:body.status||'open', reports:body.reports||[], sanctions:body.sanctions||[], notes:body.notes||'', createdBy:body.createdBy||'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()}; db.interpol.push(item); writeDb(db); return Response.json({ok:true,dossier:item}); }
 const item=db.interpol.find(x=>String(x.id)===String(body.id)); if(!item) return Response.json({ok:false,error:'dossier introuvable'},{status:404});
 if(action==='addReport') item.reports=[...(item.reports||[]),{id:id(),text:body.text||body.reason||'',by:body.by||'',createdAt:new Date().toISOString()}];
 if(action==='addSanction') item.sanctions=[...(item.sanctions||[]),{id:id(),type:body.type||'warning',reason:body.reason||'',duration:body.duration||'',by:body.by||'',createdAt:new Date().toISOString()}];
 if(action==='close') item.status='closed'; if(action==='update') Object.assign(item, body.patch||{}); item.updatedAt=new Date().toISOString(); writeDb(db); return Response.json({ok:true,dossier:item}); }
