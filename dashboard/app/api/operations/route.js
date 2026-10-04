import crypto from 'crypto';
import {session} from '../../../lib/mod-auth';
import {readDb,writeDb} from '../../../lib/db';
import {activeGuild,guarded} from '../../../lib/dashboard-auth';
import {allServers} from '../../../lib/servers';
import {clean} from '../../../lib/collection-route';
import ops from '../../../lib/game-operations.cjs';
const schemas={bounties:{serverId:'string',targetUid:'string',targetName:'string',creatorId:'string',amount:'integer',hours:'integer',status:'string',claimedBy:'string',evidence:'string'},factions:{name:'string',serverId:'string',leaderId:'string',members:'strings'},playerLinks:{serverId:'string',userId:'string',uid:'string',name:'string',verified:'boolean'},eventRules:{name:'string',serverId:'string',type:'string',amount:'integer',cooldownSeconds:'integer',requireLinkedVictim:'boolean',enabled:'boolean'},scheduledTasks:{name:'string',serverId:'string',action:'string',message:'string',nextRunAt:'string',intervalSeconds:'integer',enabled:'boolean'},gameActions:{serverId:'string',playerUid:'string',playerName:'string',reason:'string'}};
function key(req){const k=new URL(req.url).searchParams.get('collection');if(!schemas[k])throw new Error('Module inconnu.');return k;}
export const GET=guarded(async req=>{const db=await readDb();return Response.json(db[key(req)]||[]);});
async function mutate(req){const k=key(req),gid=await activeGuild(),db=await readDb(),body=await req.json(),rows=db[k]||=[],idx=rows.findIndex(r=>r.id===body.id);if(req.method!=='POST'&&idx<0)throw new Error('Entrée introuvable.');const previous=idx>=0?rows[idx]:{},data=clean(body,schemas[k]);
 if(req.method==='DELETE'){if(k==='bounties'||k==='gameActions')throw new Error('Annule la prime ; les sanctions restent dans l’historique.');if(k==='factions'&&previous.treasury>0)throw new Error('Vide la trésorerie avant de supprimer la faction.');if(k==='scheduledTasks'&&previous.status==='running')throw new Error('Tâche en cours.');rows.splice(idx,1);}
 else{let row={...previous,...data,id:previous.id||crypto.randomUUID(),guildId:gid,createdAt:previous.createdAt||new Date().toISOString()};const s=allServers(db,gid).find(s=>s.id===row.serverId);if(!s)throw new Error('Copie l’ID exact du serveur affiché dans Serveurs.');
 if(k==='bounties'){if(req.method==='POST')row=ops.createBounty(db,gid,data);else{if(data.status==='claimed')ops.settleBounty(db,gid,previous.id,data.claimedBy,data.evidence,(await session()).userId);else if(data.status==='cancelled')ops.cancelBounty(db,previous);else throw new Error('Choisis annulation ou validation avec preuve.');row=previous;}}
 if(k==='playerLinks'){if(!/^\d{15,22}$/.test(row.userId||'')||!row.uid||/[\r\n\0]/.test(row.uid)||row.uid.length>100)throw new Error('ID Discord et UID du jeu requis.');if(rows.some(l=>l.id!==row.id&&l.serverId===row.serverId&&(l.uid===row.uid||l.userId===row.userId)))throw new Error('Ce joueur ou cet UID possède déjà une liaison sur ce serveur.');row.verifiedBy='staff';}
 if(k==='factions'){if(!row.name||!/^\d{15,22}$/.test(row.leaderId||''))throw new Error('Nom et ID Discord du chef requis.');row.members=[...new Set([row.leaderId,...row.members||[]])];if(row.members.length>100||row.members.some(v=>!/^\d{15,22}$/.test(v)))throw new Error('100 membres maximum, avec leur ID Discord.');if(rows.some(f=>f.id!==row.id&&f.serverId===row.serverId&&f.members?.some(m=>row.members.includes(m))))throw new Error('Un joueur ne peut appartenir qu’à une faction par serveur.');row.treasury=previous.treasury||0;}
 if(k==='eventRules'){if(row.type!=='kill')throw new Error('La récompense automatique disponible est liée aux kills.');ops.integer(row.amount,1);ops.integer(row.cooldownSeconds??300,0,86400);}
 if(k==='scheduledTasks'){row=ops.validateTask(row,previous);if(previous.status==='running')throw new Error('Tâche en cours.');if(row.action!=='message'&&s.provider&&s.provider!=='nitrado'&&s.apiType!=='pterodactyl')throw new Error('Actions programmées : Nitrado ou connecteur Pterodactyl requis.');row.status='scheduled';row.error=null;}
 if(k==='gameActions'){if(req.method!=='POST')throw new Error('Une sanction terminée ne peut être modifiée.');if(!s.banPath)throw new Error('Configure ban.txt dans Serveurs.');row.kind='ban';row.status='queued';}
 if(k!=='bounties'||req.method!=='POST'){if(idx>=0)rows[idx]=row;else rows.push(row);}
 }
 await writeDb(db);return Response.json({ok:true});}
export const POST=guarded(mutate),PATCH=guarded(mutate),DELETE=guarded(mutate);
