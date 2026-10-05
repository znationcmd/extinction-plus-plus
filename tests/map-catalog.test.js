const test=require('node:test'),assert=require('node:assert/strict');
const atlas=require('../dashboard/lib/atlas.cjs');
test('map catalogue exposes unique maps, Reforger and genuine background variants',()=>{
 const maps=require('../dashboard/lib/builtin-maps.json');assert.equal(new Set(maps.map(m=>m.id)).size,maps.length);
 const arma=atlas.publicView({},'arma');assert.equal(arma.maps.length,3);
 for(const m of arma.maps){assert.equal(m.variants.length,2);assert.ok(m.variants[0].tileTemplate.includes('maps.izurvive.com'));}
 const dayz=atlas.publicView({},'dayz');assert.equal(dayz.maps.length,49);assert.ok(dayz.maps.some(m=>m.id==='builtin-dayz-siberia'&&m.modded));
 assert.equal(dayz.maps.find(m=>m.id==='builtin-dayz-chernarusplus').variants.length,2);
});
test('ARK gunpowder planner expands sparkpowder using its real batch yield',()=>{
 const data=require('../dashboard/lib/ark-recipes.cjs'),craft=require('../dashboard/lib/crafting-plan.cjs');
 const r=data.recipes.find(r=>r.id==='ark-recipe-gunpowder');const result=craft.expand([{...r,quantity:3}],data.recipes);
 assert.deepEqual(Object.fromEntries(result.materials.map(r=>[r.name,r.amount])),{Silex:4,Pierre:2,Charbon:3});
});
