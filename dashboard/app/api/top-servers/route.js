import {session} from '../../../lib/mod-auth';
import {isProjectOwner} from '../../../lib/project-owner';

const base=()=>String(process.env.TOP_SERVERS_API_URL||'https://bot-ark-production.up.railway.app').replace(/\/$/,'');
const key=()=>String(process.env.TOP_SERVERS_WRITE_KEY||'');

async function central(path,{method='GET',body,write=false}={}){
 const headers={Accept:'application/json'};
 if(method!=='GET')headers['Content-Type']='application/json';
 if(write&&key())headers.Authorization='Bearer '+key();
 const r=await fetch(base()+path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(data.error||'Top Serveurs indisponible.'),{status:r.status});
 return data;
}

export async function GET(){
 try{
  const servers=await central('/api/top-servers');
  let canAdd=false;
  try{const s=await session();canAdd=await isProjectOwner(s.userId);}catch{}
  return Response.json({servers,canAdd});
 }catch(e){return Response.json({error:e.message},{status:e.status||502});}
}

export async function POST(req){
 try{
  const body=await req.json();
  if(body.action==='vote')return Response.json(await central('/api/top-servers/'+encodeURIComponent(String(body.id||''))+'/vote',{method:'POST',body:{}}));
  const s=await session();
  if(!await isProjectOwner(s.userId))return Response.json({error:'Réservé au propriétaire.'},{status:403});
  const server=await central('/api/top-servers',{method:'POST',body:{...body,source_bot:'EXTINCTION ++ RSS'},write:true});
  return Response.json(server);
 }catch(e){return Response.json({error:e.message||'Opération impossible.'},{status:e.status||500});}
}
