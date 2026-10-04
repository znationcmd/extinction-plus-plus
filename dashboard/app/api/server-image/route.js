import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {readDb,writeDb} from '../../../lib/db';
import {allServers,saveServers} from '../../../lib/servers';
import images from '../../../lib/server-images.cjs';
export const GET=guarded(async req=>{const gid=await activeGuild(),sid=new URL(req.url).searchParams.get('serverId');if(!allServers(await readDb(),gid).some(s=>s.id===sid))return new Response(null,{status:404});const row=await images.read(gid,sid);if(!row)return new Response(null,{status:404});return new Response(row.image,{headers:{'Content-Type':row.mime_type,'X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Cache-Control':'private, no-store'}});});
async function mutate(req){const b=await req.json(),gid=await activeGuild(),db=await readDb(),servers=allServers(db,gid),s=servers.find(s=>s.id===b.serverId);if(!s)throw new Error('Serveur de ce Discord introuvable.');if(req.method==='DELETE'){s.image='';saveServers(db,gid,servers);await writeDb(db);await images.remove(gid,s.id);}else{await images.save(gid,s.id,b.image);s.image='/api/server-image?serverId='+encodeURIComponent(s.id);saveServers(db,gid,servers);await writeDb(db);}return Response.json({ok:true,image:s.image});}
export const POST=guarded(mutate),DELETE=guarded(mutate);
