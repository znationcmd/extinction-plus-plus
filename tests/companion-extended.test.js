const test=require('node:test'),assert=require('node:assert/strict');
const atlas=require('../dashboard/lib/atlas.cjs'),catalog=require('../dashboard/lib/catalog-model.cjs'),crafting=require('../dashboard/lib/crafting-plan.cjs');
test('Palworld locations use their own source pixel maps and item recipes retain images and yields',()=>{
 const data=atlas.publicView({},'palworld');assert.equal(data.entries.length,777);
 const first=data.entries.find(e=>e.id==='pal-default-1');assert.equal(first.x,Math.round(5639/8192*100*1e6)/1e6);assert.equal(first.z,Math.round(4033/8192*100*1e6)/1e6);
 for(const point of data.entries){assert.ok(data.maps.some(m=>m.id===point.mapId));assert.ok(point.x>=0&&point.x<=100&&point.z>=0&&point.z<=100);assert.ok(!point.guildId);}
 const guide=data.library;assert.ok(guide.items.length>1000);assert.equal(guide.buildings.length,491);assert.equal(guide.knowledge.length,586);
 const pal=guide.creatures.find(c=>c.name==='Lamball');assert.ok(pal.habitatImages.day.includes('/maps/'));assert.ok(pal.skills.length>0);
 const recipe=guide.recipes.find(r=>r.name==='Mega Sphere');assert.ok(recipe.imageUrl.startsWith('https://raw.githubusercontent.com/'));assert.ok(recipe.ingredients.some(i=>i.name==='Wood'&&i.amount===3));
 const building=guide.buildings.find(r=>r.name==='Wheat Plantation');assert.deepEqual(crafting.totals([{...building,quantity:2}]),[{name:'Stone',amount:30},{name:'Wheat Seeds',amount:6},{name:'Wood',amount:30}]);
});
test('Aniimo detail facts include official stats, branching evolution and region names without precise coordinates',()=>{
 const data=atlas.publicView({},'aniimo');assert.equal(data.library.creatures.length,86);assert.equal(data.entries.length,0);
 const first=data.library.creatures.find(c=>c.id==='001');assert.equal(first.stats.hp,67);assert.equal(first.stats.physicalAttack,90);assert.ok(first.habitats.includes('Crête des crocs'));assert.ok(first.evolution.some(e=>e.name==='Inferlupin'));assert.ok(first.abilities.length>0);assert.equal(first.x,undefined);
});
test('Conan archived recipes link knowledge and aggregate direct material costs',()=>{
 const data=atlas.publicView({},'conan').library;assert.ok(data.version.includes('2019'));assert.equal(data.items.length,2479);assert.equal(data.recipes.length,2875);assert.equal(data.knowledge.length,268);
 const recipe=data.recipes.find(r=>r.id==='recipe-4150');assert.equal(recipe.name,'Sign (Alchemist)');assert.equal(recipe.yield,1);assert.equal(recipe.ingredients.length,2);
 const totals=crafting.totals([{...recipe,quantity:3}]);assert.equal(totals.reduce((sum,row)=>sum+row.amount,0),45);
 const knowledge=data.knowledge.find(k=>k.name==='Survivalist');assert.equal(knowledge.level,1);assert.ok(catalog.related(data,knowledge).unlocks.length>0);
});
test('DayZ full class catalog includes harvest materials without publishing nonpositive-nominal building loot',()=>{
 const data=atlas.publicView({},'dayz'),guide=data.library;assert.equal(guide.items.length,2007);const stone=guide.resources.find(r=>r.name==='SmallStone');assert.ok(stone);assert.ok(Object.values(stone.nominals).every(n=>n<=0));assert.ok(guide.resources.some(r=>r.name==='Firewood'));
 assert.ok(guide.items.find(i=>i.name==='AKM').imageSourceUrl.includes('File:AKM'));assert.ok(guide.items.find(i=>i.name==='AKM').maps.length>0);
 for(const list of Object.values(data.lootCatalog.items))assert.ok(!list.some(i=>i.name==='SmallStone'));
});
test('nested source statistics and material references remain available in catalog details',()=>{
 assert.deepEqual(catalog.stats({Attack:{Melee:100,Ranged:120},Speed:{Run:440},unknown:null}),[{name:'Attack / Melee',value:100},{name:'Attack / Ranged',value:120},{name:'Speed / Run',value:440}]);
 const guide=atlas.publicView({},'palworld').library,wood=catalog.rows(guide,'resources').find(r=>r.name==='Wood');assert.ok(wood);assert.ok(catalog.related(guide,wood).recipes.some(r=>r.name==='Mega Sphere'));
});
test('ARK KO estimate matches source formula and rejects unsupported methods and invalid multipliers',()=>{
 const data=require('../dashboard/lib/ark-creatures.cjs'),taming=require('../dashboard/lib/taming-estimate.cjs');const rex=data.ASE.creatures.find(c=>c.id==='/Game/PrimalEarth/Dinos/Rex/Rex_Character_BP.Rex_Character_BP');
 const result=taming.estimate(rex,'Exceptional Kibble',150);assert.equal(result.quantity,17);assert.equal(result.seconds,3479);assert.equal(result.bonusLevel,74);assert.ok(result.effectiveness>.98&&result.effectiveness<1);
 assert.equal(taming.estimate(rex,'Exceptional Kibble',150,2).quantity,9);assert.throws(()=>taming.estimate(rex,'Exceptional Kibble',150,0));assert.throws(()=>taming.estimate({...rex,taming:{...rex.taming,violent:false}},'Exceptional Kibble',150));assert.throws(()=>taming.estimate(rex,'invented',150));
});
