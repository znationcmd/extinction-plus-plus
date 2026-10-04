const test=require('node:test');
const assert=require('node:assert/strict');
const {publicMaps}=require('../dashboard/lib/public-maps.cjs');
test('public maps exclude private maps, credentials and tenant identifiers',()=>{
  const result=publicMaps({maps:[{id:'private',guildId:'g',imageUrl:'secret'},{id:'public',guildId:'g',serverId:'s',public:true,name:'Terrain',password:'secret'}],mapPins:[{id:'base',mapId:'public',guildId:'g',name:'Base'}],servers:[{password:'secret'}]});
  assert.deepEqual(result.maps.filter(m=>!m.id.startsWith('builtin-')).map(m=>m.id),['public']);
  const custom=result.maps.find(m=>m.id==='public');
  assert.equal('password' in custom,false);
  assert.equal('guildId' in custom,false);
  assert.equal('serverId' in custom,false);
  assert.deepEqual(result.pins,[]);
  assert.deepEqual(result.servers,[]);
});
test('public pins require explicit publication and matching tenant; withdrawing map removes pins',()=>{
  const db={maps:[{id:'m',guildId:'g',public:true,publicPins:true}],mapPins:[{id:'one',mapId:'m',guildId:'g',name:'POI',token:'secret'},{id:'foreign',mapId:'m',guildId:'other',name:'Private'}]};
  const pins=publicMaps(db).pins;
  assert.deepEqual(pins.map(p=>p.id),['one']);
  assert.equal('token' in pins[0],false);
  db.maps[0].public=false;
  assert.equal(publicMaps(db).maps.some(m=>m.id==='m'),false);
  assert.deepEqual(publicMaps(db).pins,[]);
});
