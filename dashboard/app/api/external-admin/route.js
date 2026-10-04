import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {session} from '../../../lib/mod-auth';
import {readDb} from '../../../lib/db';
import {allServers} from '../../../lib/servers';
import external from '../../../lib/external-admin.cjs';
import jobs from '../../../lib/bot-jobs.cjs';
function server(db,gid,id){const s=allServers(db,gid).find(s=>s.id===id&&s.enabled!==false);if(!s)throw new Error('Serveur de ce Discord introuvable ou désactivé.');return s;}
export const GET=guarded(async req=>{const q=new URL(req.url).searchParams,gid=await activeGuild(),s=server(await readDb(),gid,q.get('serverId'));try{if(q.get('provider')==='cftools')return Response.json(await external.cfRead(s,q.get('action')||'status',q.get('playerUid')));if(q.get('provider')==='battlemetrics')return Response.json(await external.bmRead(s,q.get('action')||'status'));throw new Error('Choisis CFTools ou BattleMetrics.');}catch(e){if(!external.configured(s,q.get('provider')))throw new Error('Configure les accès du connecteur dans Serveurs.');throw new Error('Connexion refusée ou réponse indisponible. Vérifie les identifiants, autorisations et droits du compte sur le serveur.');}});
export const POST=guarded(async req=>{const b=await req.json(),gid=await activeGuild(),s=server(await readDb(),gid,b.serverId);if(!external.configured(s,'cftools'))throw new Error('Connecte CFTools dans Serveurs.');const a=external.action(b);if(a.action==='ban'&&!s.cfBanlistId)throw new Error('Banlist CFTools requise.');const jobId=await jobs.enqueue(gid,(await session()).userId,'cftools',{serverId:s.id,...a});return Response.json({ok:true,jobId,message:'Action en attente du bot ; consulte son résultat.'},{status:202});});
