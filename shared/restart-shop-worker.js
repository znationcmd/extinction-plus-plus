const {Readable}=require('node:stream');
const crypto=require('node:crypto');
const model=require('../dashboard/lib/restart-shop.cjs');
const files=require('./game-files');
const panel=require('../dashboard/lib/panel-api.cjs');
const servers=require('./rcon-tools');
const FILE='extinction-shop-orders.json';
const EMPTY=JSON.stringify({Objects:[]});
const running=s=>['started','running','online'].includes(s);
const stopped=s=>['stopped','offline'].includes(s);
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
async function write(db,s,b,payload,deps={}){
 const ftp=await (deps.connect||files.connect)(db,s);try{
  const cfg=JSON.parse((await files.download(ftp,b.missionPath+'/cfggameplay.json',0,1024*1024)).toString('utf8').replace(/^\uFEFF/,''));
  if(!cfg.WorldsData?.objectSpawnersArr?.includes(FILE))throw new Error('Référence Object Spawner absente.');
  const target=b.missionPath+'/'+FILE,before=(await files.download(ftp,target,0,1024*1024)).toString('utf8');
  const parsed=JSON.parse(before);if(!Array.isArray(parsed.Objects)||Object.keys(parsed).some(k=>k!=='Objects'))throw new Error('Fichier dédié non reconnu.');
  if(deps.checkOnly){if(parsed.Objects.length)throw new Error('Fichier dédié non vide avant le cycle.');return;}
  if(parsed.Objects.length&&digest(before)!==digest(b.payload))throw new Error('Un ancien fichier de livraison doit être vérifié.');
  await ftp.uploadFrom(Readable.from([payload]),target+'.tmp');
  if(digest((await files.download(ftp,target+'.tmp',0,1024*1024)).toString('utf8'))!==digest(payload))throw new Error('Transfert temporaire non confirmé.');
  // Only the dedicated file is replaced. Mission configuration and other spawners stay untouched.
  await ftp.rename(target+'.tmp',target);
  if(digest((await files.download(ftp,target,0,1024*1024)).toString('utf8'))!==digest(payload))throw new Error('Fichier final non confirmé.');
 }finally{ftp.close();}
}
async function tick({loadDb,saveDb,now=Date.now(),...deps}){
 let db=await loadDb();const ids=(db.restartBatches||[]).filter(b=>!['complete','reviewed','rejected','uncertain'].includes(b.status)).map(b=>b.id);
 for(const id of ids){db=await loadDb();const b=db.restartBatches?.find(b=>b.id===id);if(!b)continue;const found=servers.findServer(db,b.guildId,b.serverId),s=found&&{...found,guildId:b.guildId};
  try{
   if(!s)throw new Error('Serveur absent.');
   if(['sending_stop','writing','sending_start','clearing'].includes(b.status))throw new Error('Opération interrompue.');
   const status=(await (deps.status||panel.status)(db,s)).status;
   if(b.status==='requested'){
    if(!running(status)&&!stopped(status)){b.firstCheckedAt??=now;if(now-b.firstCheckedAt>900000)throw new Error('État initial non confirmé.');await saveDb(db);continue;}
    await (deps.write||write)(db,s,b,EMPTY,{...deps,checkOnly:true});
    if(running(status)){b.status='sending_stop';b.changedAt=now;await saveDb(db);await (deps.power||panel.power)(db,s,'stop');}
    b.status='waiting_stop';b.changedAt=now;await saveDb(db);
   }else if(b.status==='waiting_stop'){
    if(!stopped(status)){if(now-b.changedAt>900000)throw new Error('Arrêt non confirmé.');continue;}
    b.status='writing';await saveDb(db);await (deps.write||write)(db,s,b,b.payload,deps);
    b.status='sending_start';await saveDb(db);await (deps.power||panel.power)(db,s,'start');b.status='waiting_start';b.changedAt=now;await saveDb(db);
   }else if(b.status==='waiting_start'){
    if(!running(status)){if(now-b.changedAt>900000)throw new Error('Démarrage non confirmé.');continue;}
    b.status='loading';b.startedObservedAt=now;await saveDb(db);
   }else if(b.status==='loading'){
    if(!running(status))throw new Error('Serveur interrompu avant le nettoyage.');
    if(now-b.startedObservedAt<b.bootSeconds*1000)continue;
    b.status='clearing';await saveDb(db);await (deps.write||write)(db,s,b,EMPTY,deps);
    b.status='complete';b.completedAt=new Date(now).toISOString();for(const orderId of b.orderIds)model.updateOrder(db,orderId,b.guildId,{status:'restart_spawn_unverified',restartCompletedAt:b.completedAt});await saveDb(db);
   }
  }catch(e){if(b.status==='requested'){b.status='rejected';b.error='Préparation refusée avant toute action du serveur. Vérifie la configuration et le fichier dédié vide puis relance Redémarrer.';for(const orderId of b.orderIds)model.updateOrder(db,orderId,b.guildId,{status:'restart_queued'});await saveDb(db);continue;}b.status='uncertain';b.error='Cycle interrompu ou fichiers non confirmés. Vérifie le panel et le fichier extinction-shop-orders.json avant toute reprise.';for(const orderId of b.orderIds)model.updateOrder(db,orderId,b.guildId,{status:'restart_uncertain'});await saveDb(db);}
 }
}
async function power({db,server,action,actorId,saveDb,fetcher}){
 const s={...server};if(model.active(db,s))throw new Error('Lot de livraison actif : attendre la fin ou traiter sa reprise avant toute action du panel.');
 if(action==='restart'&&s.restartShopEnabled){const batch=model.begin(db,s,actorId);if(batch){await saveDb(db);return 'Redémarrage avec livraison placé en file. Le bot arrêtera, préparera puis démarrera le serveur ; confirmation en jeu par le staff requise.';}}
 await panel.power(db,s,action,fetcher);return 'Demande acceptée par le panel. Vérifie ensuite le statut du serveur.';
}
async function recover({db,server,batchId,note,actorId,saveDb,...deps}){
 const b=db.restartBatches?.find(b=>b.id===batchId&&b.guildId===server.guildId&&b.serverId===server.id);
 if(!b||b.status!=='uncertain')throw new Error('Lot incertain introuvable.');
 if(typeof note!=='string'||note.trim().length<10||note.length>1000)throw new Error('Compte rendu de vérification en jeu et du panel requis.');
 const state=(await (deps.status||panel.status)(db,server)).status;if(!running(state)&&!stopped(state))throw new Error('Attends un état stable du serveur.');
 await (deps.write||write)(db,server,b,EMPTY,deps);
 b.status='reviewed';b.reviewedBy=actorId;b.reviewNote=note.trim();b.reviewedAt=new Date().toISOString();
 for(const orderId of b.orderIds)model.updateOrder(db,orderId,b.guildId,{status:'restart_spawn_unverified'});
 await saveDb(db);return 'Fichier de livraison vidé et reprise débloquée. Confirme ou annule séparément chaque commande après vérification en jeu.';
}
module.exports={tick,write,power,recover,FILE,EMPTY};
