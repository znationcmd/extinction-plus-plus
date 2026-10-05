const test=require('node:test'),assert=require('node:assert/strict'),craft=require('../dashboard/lib/crafting-plan.cjs'),atlas=require('../dashboard/lib/atlas.cjs');
const recipe=(id,name,yieldAmount,ingredients)=>({id,name,yield:yieldAmount,ingredients});
test('recursive plans expand shared ingredients and reuse whole-batch surplus',()=>{
 const ingot=recipe('ingot','Ingot',3,[{name:'Ore',amount:2}]);
 const plan=[{...recipe('a','Tool A',1,[{name:'Ingot',amount:2}]),quantity:1},{...recipe('b','Tool B',1,[{name:'Ingot',amount:2}]),quantity:1}];
 const out=craft.expand(plan,[ingot]);assert.deepEqual(out.materials,[{name:'Ore',amount:4}]);assert.deepEqual(out.steps,[{name:'Ingot',amount:2}]);assert.deepEqual(out.leftovers,[{name:'Ingot',amount:2}]);
});
test('alternative recipes and cycles are reported rather than guessed or looped',()=>{
 const r=recipe('root','Target',1,[{name:'A',amount:2}]);const a=recipe('a','A',1,[{name:'B',amount:1}]),b=recipe('b','B',1,[{name:'A',amount:1}]);
 const cycle=craft.expand([{...r,quantity:1}],[a,b]);assert.equal(cycle.warnings.length,1);assert.deepEqual(cycle.materials,[{name:'A',amount:2}]);
 const alternative=craft.expand([{...r,quantity:1}],[a,{...a,id:'a2'}]);assert.equal(alternative.warnings.length,1);assert.deepEqual(alternative.materials,[{name:'A',amount:2}]);
});
test('plan imports resolve IDs against the current catalog and reject forged ingredients',()=>{
 const r=recipe('a','A',2,[{name:'Ore',amount:3}]);assert.equal(craft.parseImport({format:'extinction-crafting-plan-v1',plan:[{id:'a',quantity:3,ingredients:[]}]},[r])[0].ingredients[0].amount,3);
 assert.throws(()=>craft.parseImport({format:'extinction-crafting-plan-v1',plan:[{id:'missing',quantity:1}]},[r]));assert.throws(()=>craft.parseImport({format:'extinction-crafting-plan-v1',plan:[{id:'a',quantity:0}]},[r]));
});
test('Aniimo production adds verified recipes, harvesting metadata and no fabricated positions',()=>{
 const guide=atlas.publicView({},'aniimo').library;assert.equal(guide.recipes.length,154);assert.equal(guide.items.length,217);
 const pod=guide.recipes.find(r=>r.name==='Aniipod');assert.equal(pod.station,'Aniipod Maker');assert.deepEqual(craft.totals([{...pod,quantity:2}]),[{name:'Rock',amount:24}]);
 const rock=guide.items.find(i=>i.name==='Rock');assert.equal(rock.station,'Mine');assert.equal(rock.stats.yield,6);assert.equal(rock.x,undefined);assert.equal(guide.items.find(i=>i.sourceName==='star').category,'Origine non renseignée');assert.ok(!guide.items.some(i=>i.sourceName==='star'&&i.station==='Starfall Hammock'));assert.equal(guide.creatures.length,86);
});
