import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {session} from '../../../lib/mod-auth';
import {readDb} from '../../../lib/db';
import {allServers} from '../../../lib/servers';
import games from '../../../lib/games.cjs';
import jobs from '../../../lib/bot-jobs.cjs';
export const GET=guarded(async()=>Response.json(await jobs.list(await activeGuild())));
export const POST=guarded(async req=>{const {serverId,command}=await req.json(),id=await activeGuild(),db=await readDb(),s=allServers(db,id).find(s=>s.id===serverId);if(!s)throw new Error('Serveur introuvable.');const c=games.capability(s);if(!c.rcon&&!(s.game==='arma'&&s.rconProtocol==='battleye'))throw new Error('RCON non disponible pour ce jeu ou protocole.');if(typeof command!=='string'||!command.trim()||command.length>4096||command.includes('\0'))throw new Error('Commande invalide.');const jobId=await jobs.enqueue(id,(await session()).userId,'rcon',{serverId,command});return Response.json({ok:true,jobId,message:'Commande en attente du bot. Consulte son résultat.'},{status:202});});
