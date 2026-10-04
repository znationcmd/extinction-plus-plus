import {readDb,writeDb} from '../../../lib/db';
import {activeGuild,guarded} from '../../../lib/dashboard-auth';
import {allServers,publicServer,validateServer,saveServers} from '../../../lib/servers';
export const GET=guarded(async()=>{const db=await readDb(),id=await activeGuild();return Response.json({success:true,servers:allServers(db,id).map(publicServer)});});
async function mutate(req){const body=await req.json(),db=await readDb(),id=await activeGuild(),servers=allServers(db,id);const idx=servers.findIndex(s=>s.id===body.id);if(req.method!=='POST'&&idx<0)throw Object.assign(new Error('Serveur introuvable.'),{status:404});let server;if(req.method==='DELETE')servers.splice(idx,1);else {server=validateServer(body,req.method==='PATCH'?servers[idx]:{},id);if(req.method==='PATCH')servers[idx]=server;else servers.push(server);}saveServers(db,id,servers);await writeDb(db);return Response.json({ok:true,server:server&&publicServer(server)});}
export const POST=guarded(mutate),PATCH=guarded(mutate),DELETE=guarded(mutate);
