const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../dashboard/lib/restart-shop.cjs'),worker=require('../shared/restart-shop-worker'),review=require('../dashboard/lib/delivery-review.cjs');
function fixture(game='dayz_xbox'){
 const s={id:'s',guildId:'g',game,enabled:true,restartShopEnabled:true,restartValidated:true,restartMissionPath:'/mission',restartMapId:'m',restartBootSeconds:120,restartClasses:['BandageDressing']};
 const db={guilds:{g:{servers:[s]}},maps:[{id:'m',guildId:'g',serverId:'s',game,worldCoordinates:true,xMin:0,xMax:10000,yMin:0,yMax:10000}],deliveries:[],shopPurchases:[]};return {s,db};
}
function order(db,s,id='a'){const row={id,guildId:'g',userId:'u',price:10,...model.prepare(db,s,{className:'BandageDressing',quantity:2},{x:0,y:200,z:500})};db.deliveries.push(row);db.shopPurchases.push({...row});return row;}
test('DayZ PC and both consoles require tested classes, calibrated scoped map and exact altitude',()=>{
 for(const game of ['dayz_pc','dayz_ps','dayz_xbox']){const {db,s}=fixture(game);const r=order(db,s);assert.equal(r.x,0);assert.equal(r.items.length,1);assert.throws(()=>model.prepare(db,s,{className:'BandageDressing'},{x:1,z:2}),/altitude/);assert.throws(()=>model.prepare(db,s,{className:'Unknown'},{x:1,y:5,z:2}),/non testée/);db.maps[0].guildId='other';assert.throws(()=>order(db,s),/calibrée/);}
 assert.throws(()=>model.validate({...fixture().s,restartMissionPath:'/a/../b'}),/Chemin/);assert.throws(()=>model.validate({...fixture().s,restartBootSeconds:1}),/Délai/);
});
test('restart batch reserves once, blocks refunds until own file is cleared and is guild isolated',()=>{
 const {db,s}=fixture();order(db,s);db.deliveries.push({...db.deliveries[0],id:'foreign',guildId:'other'});const b=model.begin(db,s,'admin');assert.deepEqual(b.orderIds,['a']);assert.equal(JSON.parse(b.payload).Objects.length,2);assert.equal(JSON.parse(b.payload).Objects[0].enableCEPersistency,true);assert.throws(()=>model.begin(db,s,'admin'),/déjà/);assert.throws(()=>review.review(db,'g','a','cancelled','checked','admin'),/en cours/);assert.equal(db.deliveries[1].status,'restart_queued');
});
test('controlled cycle preflights, stops, writes while stopped, starts then clears only after load delay',async()=>{
 const {db,s}=fixture();order(db,s);const b=model.begin(db,s,'admin');let state='started';const calls=[],deps={loadDb:async()=>db,saveDb:async()=>{},status:async()=>({status:state}),power:async(_,__,a)=>{calls.push(a)},write:async(_,__,___,payload,opts)=>{calls.push(opts?.checkOnly?'check':JSON.parse(payload).Objects.length?'publish':'clear')}};
 await worker.tick({...deps,now:0});assert.deepEqual(calls,['check','stop']);assert.equal(b.status,'waiting_stop');state='stopped';await worker.tick({...deps,now:30000});assert.deepEqual(calls,['check','stop','publish','start']);state='started';await worker.tick({...deps,now:60000});await worker.tick({...deps,now:179999});assert.equal(b.status,'loading');await worker.tick({...deps,now:180000});assert.equal(b.status,'complete');assert.equal(calls.at(-1),'clear');assert.equal(db.deliveries[0].status,'restart_spawn_unverified');await worker.tick({...deps,now:300000});assert.equal(calls.filter(x=>x==='publish').length,1);
});
test('crashes and partial writes never retry or refund automatically',async()=>{
 for(const phase of ['writing','sending_start','clearing']){const {db,s}=fixture();order(db,s);const b=model.begin(db,s,'admin');b.status=phase;let writes=0;await worker.tick({loadDb:async()=>db,saveDb:async()=>{},status:async()=>({status:'started'}),write:async()=>writes++});assert.equal(b.status,'uncertain');assert.equal(writes,0);assert.throws(()=>review.review(db,'g','a','cancelled','checked','admin'),/en cours/);await worker.tick({loadDb:async()=>db,saveDb:async()=>{}});assert.equal(writes,0);}
});
test('FTP staging preserves config and unrelated spawners, verifies temp and rejects stale files',async()=>{
 const {db,s}=fixture();order(db,s);const b=model.begin(db,s,'admin'),remote={'/mission/cfggameplay.json':JSON.stringify({WorldsData:{objectSpawnersArr:['other.json',worker.FILE]}}),['/mission/'+worker.FILE]:worker.EMPTY},original=remote['/mission/cfggameplay.json'];let closed=0;
 const ftp={downloadTo:async(out,p)=>{if(!(p in remote))throw Error('missing');out.end(remote[p]);await new Promise((r,j)=>{out.on('finish',r);out.on('error',j)})},uploadFrom:async(input,p)=>{let text='';for await(const chunk of input)text+=chunk;remote[p]=text},rename:async(a,c)=>{remote[c]=remote[a];delete remote[a]},close:()=>closed++};
 await worker.write(db,s,b,worker.EMPTY,{connect:async()=>ftp,checkOnly:true});assert.equal(remote['/mission/'+worker.FILE],worker.EMPTY);await worker.write(db,s,b,b.payload,{connect:async()=>ftp});assert.equal(remote['/mission/cfggameplay.json'],original);await worker.write(db,s,b,worker.EMPTY,{connect:async()=>ftp});assert.equal(remote['/mission/'+worker.FILE],worker.EMPTY);remote['/mission/'+worker.FILE]=JSON.stringify({Objects:[{name:'ExistingBase'}]});await assert.rejects(worker.write(db,s,b,b.payload,{connect:async()=>ftp}),/ancien/);assert.equal(closed,4);
});
test('recovery checks stable state and clears file before permitting staff review',async()=>{
 const {db,s}=fixture();order(db,s);const b=model.begin(db,s,'admin');b.status='uncertain';let cleared=false;
 await worker.recover({db,server:s,batchId:b.id,note:'Objets absents vérifiés',actorId:'admin',saveDb:async()=>{assert.equal(cleared,true)},status:async()=>({status:'stopped'}),write:async()=>{cleared=true}});assert.equal(b.status,'reviewed');assert.equal(db.deliveries[0].status,'restart_spawn_unverified');assert.equal(model.active(db,s),undefined);
});
test('ARK ground delivery rejects absent adapters and transfers restart mode and altitude through bridge',()=>{
 const {db,s}=fixture('ark');s.restartShopEnabled=false;s.bridgeEnabled=true;s.bridgeRestartValidated=true;s.bridgeState={checkedAt:new Date().toISOString(),capabilities:{delivery:true,restartGround:true,kits:true}};
 const item={className:'PrimalItemResource_Stone_C',quantity:1};const r=model.prepareBridge(db,s,item,{x:10,y:15000,z:50});db.deliveries.push({id:'ark1',guildId:'g',...r});const bridge=require('../dashboard/lib/game-bridge.cjs'),claim=bridge.claim(db,s);assert.equal(claim.mode,'restart_ground');assert.equal(claim.y,15000);assert.equal(bridge.claim(db,s),null);s.bridgeState.capabilities.restartGround=false;assert.throws(()=>model.prepareBridge(db,s,item,{x:1,y:1,z:1}),/Adaptateur/);
});

test('preflight failure releases reservations before any server action',async()=>{const {db,s}=fixture();order(db,s);const b=model.begin(db,s,'admin');let powers=0;await worker.tick({loadDb:async()=>db,saveDb:async()=>{},status:async()=>({status:'started'}),write:async()=>{throw Error('missing configuration')},power:async()=>powers++});assert.equal(powers,0);assert.equal(b.status,'rejected');assert.equal(db.deliveries[0].status,'restart_queued');assert.equal(model.active(db,s),undefined);});
