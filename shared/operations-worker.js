const crypto=require('node:crypto');
const rcon=require('./rcon-tools');
const nitrado=require('./nitrado-api');
const secure=require('./secure-store');
const hosting=require('../dashboard/lib/hosting.cjs');
const ops=require('../dashboard/lib/game-operations.cjs');
function server(db,row){const s=rcon.findServer(db,row.guildId,row.serverId);if(!s||s.enabled===false)throw new Error('Serveur absent ou désactivé.');return {...s,guildId:row.guildId};}
async function runTask(db,task,deps={}){const s=server(db,task);if(task.action==='message'){const command=s.game==='dayz_pc'||s.rconProtocol==='battleye'?`say -1 ${task.message}`:s.game==='ark'?`ServerChat ${task.message}`:`Broadcast ${task.message}`;return (deps.rcon||rcon.send)(s,command);}
 return require('./restart-shop-worker').power({db,server:s,action:task.action,actorId:task.createdBy||'scheduled',saveDb:deps.saveDb,fetcher:deps.fetch});
}
async function tick({loadDb,saveDb,run=runTask,ban=require('./game-files').ban,now=Date.now()}){
 let db=await loadDb();ops.expire(db,now);
 for(const row of [...(db.scheduledTasks||[]),...(db.gameActions||[])])if(row.status==='running'){row.status='uncertain';row.error='Opération interrompue : vérifie le serveur avant de réactiver.';row.enabled=false;}
 await saveDb(db);
 const tasks=(db.scheduledTasks||[]).filter(t=>t.enabled!==false&&!['uncertain','failed','running'].includes(t.status)&&Date.parse(t.nextRunAt)<=now).slice(0,10).map(t=>t.id);
 for(const id of tasks){db=await loadDb();const task=db.scheduledTasks?.find(t=>t.id===id);if(!task||task.enabled===false||Date.parse(task.nextRunAt)>now)continue;task.status='running';task.startedAt=new Date(now).toISOString();await saveDb(db);
 try{await run(db,task,{saveDb});task.status='succeeded';task.lastRunAt=new Date(now).toISOString();task.error=null;if(task.intervalSeconds>0)task.nextRunAt=new Date(now+task.intervalSeconds*1000).toISOString();else task.enabled=false;}
 catch(e){task.status='uncertain';task.enabled=false;task.error='Commande non confirmée. Vérifie la connexion et l’état du serveur avant de réactiver.';}
 const channelId=rcon.findServer(db,task.guildId,task.serverId)?.feedChannelId;
 if(channelId)(db.liveAlerts||=[]).push({id:crypto.randomUUID(),guildId:task.guildId,serverId:task.serverId,channelId,content:`🕒 ${task.name} : ${task.status==='succeeded'?'commande acquittée':'commande non confirmée, tâche suspendue'}.`,createdAt:new Date(now).toISOString()});await saveDb(db);
 }
 db=await loadDb();const actions=(db.gameActions||[]).filter(a=>a.status==='queued').slice(0,10).map(a=>a.id);
 for(const id of actions){db=await loadDb();const a=db.gameActions?.find(a=>a.id===id&&a.status==='queued');if(!a)continue;a.status='running';await saveDb(db);try{const s=server(db,a);a.entry=await ban(db,s,a.playerUid,a.playerName);a.status='file_synced';a.result='Entrée vérifiée dans ban.txt. Le serveur doit charger sa liste pour appliquer le bannissement.';}catch(e){a.status='failed';a.error='Ajout au fichier de bans impossible. Vérifie identité, chemin et FTP.';}a.updatedAt=new Date().toISOString();await saveDb(db);}
}
module.exports={tick,runTask};
