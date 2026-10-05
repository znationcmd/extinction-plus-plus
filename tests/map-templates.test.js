const test=require('node:test'),assert=require('node:assert/strict');
const templates=require('../dashboard/lib/map-templates.cjs');
const model=require('../dashboard/lib/map-model.cjs');
const {publicMaps}=require('../dashboard/lib/public-maps.cjs');
test('server background variants preserve tile geometry without granting delivery calibration',()=>{
 const bg=templates.background('dayz_xbox','builtin-dayz-chernarusplus','satellite');
 assert.ok(bg.tileTemplate.includes('/satellite/'));
 assert.equal(bg.worldCoordinates,undefined);
 assert.throws(()=>templates.background('ark','builtin-dayz-chernarusplus'),/incompatible/);
 assert.throws(()=>templates.background('dayz_pc','builtin-dayz-chernarusplus','unknown'),/Variante/);
 const saved=model.validateMap({id:'server-map',game:'dayz_xbox',worldCoordinates:false,xMin:0,xMax:15360,yMin:0,yMax:15360,flipY:true,...bg});
 const published=publicMaps({maps:[{...saved,public:true,password:'secret'}]}).maps.find(m=>m.id==='server-map');
 assert.equal(published.tileTemplate,bg.tileTemplate);assert.equal(published.password,undefined);
 assert.equal(saved.worldCoordinates,false);
});
test('ASA terrain archives can be selected as local backgrounds but arbitrary local paths cannot',()=>{
 const bg=templates.background('ark','builtin-ark-genesis-part-1-asa-asi','biomes');
 const saved=model.validateMap({game:'ark',xMin:-100,xMax:100,yMin:-100,yMax:100,...bg});
 assert.equal(saved.imageUrl,'/companion/asi/genesis-part-1-biomes.webp');
 assert.throws(()=>model.validateMap({...saved,imageUrl:'/companion/../../secret'}),/HTTPS/);
 assert.throws(()=>model.validateMap({...saved,imageUrl:'https://user:password@example.com/map.png'}),/HTTPS/);
});
