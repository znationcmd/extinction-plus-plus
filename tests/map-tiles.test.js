const test=require('node:test');
const assert=require('node:assert/strict');
const {visibleTiles}=require('../dashboard/lib/map-tiles.cjs');
const {publicMaps}=require('../dashboard/lib/public-maps.cjs');
const {project,unproject,validPin}=require('../dashboard/lib/map-model.cjs');
test('built-in maps are public without publishing tenant data and pins use visual coordinates',()=>{
 const view=publicMaps({maps:[],mapPins:[]});
 assert.equal(new Set(view.maps.map(m=>m.id)).size,view.maps.length);
 for(const game of ['dayz_pc','ark','arma','conan','palworld','7dtd','aniimo'])assert.ok(view.maps.some(m=>m.game===game));
 const map=view.maps.find(m=>m.game==='palworld');
 const coords=unproject(map,250,750);assert.deepEqual(coords,{x:25,y:75});assert.deepEqual(project(map,coords.x,coords.y),{x:250,y:750});
 assert.doesNotThrow(()=>validPin(map,{name:'Base',...coords}));
 assert.throws(()=>validPin(map,{name:'Outside',x:101,y:50}));
 assert.deepEqual(view.pins,[]);
});
test('visible XYZ tiles cover the viewport and stay bounded at all zoom levels',()=>{
 const map={id:'test',tileTemplate:'https://tiles.test/{z}/{x}/{y}.webp',tileMaxZoom:5};
 const full=visibleTiles(map,{x:0,y:0,size:1000});assert.equal(full.length,16);assert.equal(full[0].url,'https://tiles.test/2/0/0.webp');
 const cropped=visibleTiles(map,{x:300,y:400,size:100});assert.ok(cropped.length<=25);assert.ok(cropped.every(t=>t.x<400&&t.x+t.width>300&&t.y<500&&t.y+t.width>400));
 for(const terrain of publicMaps({}).maps) for(const v of [{x:0,y:0,size:1000},{x:950,y:950,size:50}]) assert.ok(visibleTiles(terrain,v).length<=64);
});
test('Reforger bottom origin and reverse LOD preserve terrain orientation',()=>{
 const map={id:'arma',tileTemplate:'https://tiles.test/{z}/{x}/{y}.jpg',tileBottomOrigin:true,tileReverseZoom:5,tileBaseGrid:4,tileMaxZoom:5};
 const full=visibleTiles(map,{x:0,y:0,size:1000});assert.equal(full.length,16);
 const southWest=full.find(t=>t.url==='https://tiles.test/5/0/0.jpg');assert.equal(southWest.y,750);
 const northWest=full.find(t=>t.url==='https://tiles.test/5/0/3.jpg');assert.equal(northWest.y,0);
 const arland=visibleTiles({...map,tileBaseGrid:1.25},{x:0,y:0,size:1000});assert.ok(arland.some(t=>t.y===0));
});
