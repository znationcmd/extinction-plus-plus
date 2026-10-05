const crypto=require('node:crypto');
const contents=require('./shop-items.cjs');
function map(db,s){return (db.maps||[]).find(m=>m.id===s.restartMapId&&m.guildId===s.guildId&&m.serverId===s.id&&m.game===s.game);}
function validate(s){
 if(!s.restartShopEnabled)return;
 if(!['dayz_pc','dayz_ps','dayz_xbox'].includes(s.game))throw new Error('La livraison au redémarrage concerne DayZ PC, Xbox et PlayStation.');
 if(!/^\/[A-Za-z0-9_./-]{1,220}$/.test(s.restartMissionPath||'')||s.restartMissionPath.includes('..')||s.restartMissionPath.endsWith('/'))throw new Error('Chemin FTP absolu de la mission requis, sans .. ni slash final.');
 if(!s.restartMapId||s.restartValidated!==true)throw new Error('Carte calibrée et essai Object Spawner confirmé par le staff requis.');
 if(!Number.isInteger(s.restartBootSeconds)||s.restartBootSeconds<120||s.restartBootSeconds>3600)throw new Error('Délai de chargement de 120 à 3600 secondes requis.');
 if(!Array.isArray(s.restartClasses)||!s.restartClasses.length||s.restartClasses.some(c=>!/^[A-Za-z0-9_]{1,100}$/.test(c)))throw new Error('Liste des classes DayZ testées requise.');
}
function prepare(db,s,item,position){
 validate(s);if(!s.restartShopEnabled||s.enabled===false)throw new Error('Livraison au redémarrage désactivée.');
 const m=map(db,s);if(!m||m.worldCoordinates!==true||![m.xMin,m.xMax,m.yMin,m.yMax].every(Number.isFinite)||m.xMin>=m.xMax||m.yMin>=m.yMax)throw new Error('Carte de livraison calibrée introuvable pour ce serveur.');
 const {x,y,z}=position;if(![x,y,z].every(Number.isFinite)||x<m.xMin||x>m.xMax||z<m.yMin||z>m.yMax||y< -100||y>3000)throw new Error('Position hors carte ou altitude invalide. X, Z et altitude Y sont obligatoires.');
 const items=contents.items(item);if(items.some(i=>!s.restartClasses.includes(i.className)))throw new Error('Cet article contient une classe non testée sur ce serveur.');
 return {serverId:s.id,items,x,y,z,deliveryMode:'dayz_restart',status:'restart_queued'};
}
function active(db,s){return (db.restartBatches||[]).find(b=>b.guildId===s.guildId&&b.serverId===s.id&&!['complete','reviewed','rejected'].includes(b.status));}
function begin(db,s,actorId){
 validate(s);if(!s.restartShopEnabled)throw new Error('Livraison au redémarrage non activée.');if(active(db,s))throw new Error('Un lot est déjà en cours ou demande une vérification.');
 const orders=(db.deliveries||[]).filter(d=>d.guildId===s.guildId&&d.serverId===s.id&&d.status==='restart_queued').slice(0,20);
 if(!orders.length)return null;
 for(const d of orders)prepare(db,s,{kitItems:JSON.stringify(d.items)},{x:d.x,y:d.y,z:d.z});
 const objects=orders.flatMap(d=>d.items.flatMap(i=>Array.from({length:i.quantity},()=>({name:i.className,pos:[d.x,d.y,d.z],ypr:[0,0,0],scale:1,enableCEPersistency:true}))));
 if(objects.length>500)throw new Error('500 objets maximum par lot ; réduire les commandes en attente.');
 const batch={id:crypto.randomUUID(),guildId:s.guildId,serverId:s.id,actorId,status:'requested',orderIds:orders.map(d=>d.id),missionPath:s.restartMissionPath,bootSeconds:s.restartBootSeconds,payload:JSON.stringify({Objects:objects}),createdAt:new Date().toISOString()};
 (db.restartBatches||=[]).push(batch);for(const d of orders)updateOrder(db,d.id,s.guildId,{status:'restart_reserved',restartBatchId:batch.id});return batch;
}
function updateOrder(db,id,gid,fields){for(const key of ['deliveries','shopPurchases']){const r=db[key]?.find(d=>d.id===id&&d.guildId===gid);if(r)Object.assign(r,fields);}}
function prepareBridge(db,s,item,position){
 if(s.game!=='ark'||!s.bridgeEnabled||!s.bridgeRestartValidated||!s.bridgeState?.capabilities?.delivery||!s.bridgeState?.capabilities?.restartGround||!Number.isFinite(Date.parse(s.bridgeState.checkedAt))||Date.parse(s.bridgeState.checkedAt)<Date.now()-120000)throw new Error('Adaptateur ARK au sol/redémarrage installé, connecté et testé requis.');
 const m=map(db,s);const {x,y,z}=position;if(!m||m.worldCoordinates!==true||![m.xMin,m.xMax,m.yMin,m.yMax].every(Number.isFinite)||![x,y,z].every(Number.isFinite)||x<m.xMin||x>m.xMax||z<m.yMin||z>m.yMax||Math.abs(y)>10000000)throw new Error('Position ARK calibrée et altitude exacte requises.');
 const items=contents.items(item);if(items.length>1&&!s.bridgeState.capabilities.kits)throw new Error('Kits non pris en charge par cet adaptateur.');
 return {serverId:s.id,items,x,y,z,deliveryMode:'bridge_restart',bridgeMode:'restart_ground',status:'bridge_queued'};
}
module.exports={prepareBridge,validate,map,prepare,active,begin,updateOrder};
