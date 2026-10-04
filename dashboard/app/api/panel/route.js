import {readDb} from '../../../lib/db';
import {activeGuild,guarded} from '../../../lib/dashboard-auth';
import {session} from '../../../lib/mod-auth';
import {allServers} from '../../../lib/servers';
import panel from '../../../lib/panel-api.cjs';
import jobs from '../../../lib/bot-jobs.cjs';
export const GET=guarded(async req=>{const db=await readDb(),gid=await activeGuild(),s=allServers(db,gid).find(s=>s.id===new URL(req.url).searchParams.get('serverId'));if(!s)throw new Error('Serveur introuvable.');return Response.json(await panel.status(db,{...s,guildId:gid}));});
export const POST=guarded(async req=>{const body=await req.json(),db=await readDb(),gid=await activeGuild(),s=allServers(db,gid).find(s=>s.id===body.serverId);if(!s||!panel.configured(s)||s.enabled===false)throw new Error('Serveur ou API non configuré.');if(!['start','stop','restart'].includes(body.action))throw new Error('Action invalide.');const jobId=await jobs.enqueue(gid,(await session()).userId,'power',{serverId:s.id,action:body.action});return Response.json({jobId,message:'Commande du panel en attente du bot.'},{status:202});});
