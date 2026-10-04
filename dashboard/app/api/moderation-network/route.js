import crypto from 'crypto';
import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {readDb,writeDb} from '../../../lib/db';
import {allServers} from '../../../lib/servers';
import network from '../../../lib/moderation-network.cjs';
export const GET=guarded(async()=>Response.json(await network.list(await activeGuild())));
export const POST=guarded(async req=>{const body=await req.json(),gid=await activeGuild();
 if(body.action==='create')return Response.json(await network.insert(body.name,gid));
 if(body.action==='join')return Response.json(await network.join(body.code,gid));
 if(body.action==='apply'){const n=(await network.list(gid)).find(n=>n.id===body.networkId);const report=n?.reports.find(r=>r.id===body.reportId&&r.status==='published');if(!report)throw new Error('Signalement actif introuvable dans un réseau rejoint.');const db=await readDb(),s=allServers(db,gid).find(s=>s.id===body.serverId);if(!s||s.game!==report.game||!s.banPath)throw new Error('Serveur du même jeu avec fichier ban.txt configuré requis.');if((db.gameActions||[]).some(a=>a.guildId===gid&&a.serverId===s.id&&a.networkReportId===report.id&&a.status!=='failed'))throw new Error('Ce signalement a déjà été transmis à ce serveur.');(db.gameActions||=[]).push({id:crypto.randomUUID(),guildId:gid,serverId:s.id,playerUid:report.playerUid,playerName:report.playerName,kind:'ban',reason:report.reason,networkReportId:report.id,status:'queued',createdAt:new Date().toISOString()});await writeDb(db);return Response.json({ok:true,message:'Ajout au fichier de bans en attente du bot.'});}
 return Response.json(await network.update(body.networkId,gid,body.action,body));});
