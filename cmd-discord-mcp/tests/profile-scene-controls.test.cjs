const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

class ClickTarget {
 constructor(data){this.dataset=data;this.listeners={};this.scrollTop=0;this.isConnected=true}
 addEventListener(type,callback){(this.listeners[type]??=[]).push(callback)}
 click(){assert.equal(this.listeners.click?.length,1,"Missing click listener");for(const callback of this.listeners.click)callback()}
}

function makeEditor(){
 const source=fs.readFileSync(path.join(__dirname,"../cmd-profile-scene.js"),"utf8").replace(
  "window.cmdSphereSceneState=()=>({...state});",
  "window.cmdSphereSceneState=()=>({...state});window.__testProfileEditor={renderSheet};"
 );
 const area={
  _html:"",nodes:[],scrollTop:0,closest(){return null},
  set innerHTML(html){
   this._html=html;this.nodes=[];
   for(const tag of html.match(/<(?:button|input|select)\b[^>]*>/g)||[]){
    const data={};
    for(const match of tag.matchAll(/\bdata-([a-z-]+)="([^"]+)"/g))
     data[match[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=match[2];
    if(Object.keys(data).length)this.nodes.push(new ClickTarget(data));
   }
  },
  get innerHTML(){return this._html},
  querySelectorAll(selector){
   const key=selector.match(/data-([a-z-]+)/)?.[1]?.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
   return key?this.nodes.filter(node=>key in node.dataset):[];
  }
 };
 const document={
  readyState:"loading",
  querySelector(selector){return selector==="#cmdSceneOptions"?area:null},
  getElementById(){return null},
  createElement(){return {id:"",textContent:"",style:{}}},
  head:{append(){}},
  addEventListener(){},querySelectorAll(){return []}
 };
 const window={requestAnimationFrame(){}};
 vm.runInNewContext(source,{window,document,console,fetch:async()=>({ok:false})},{filename:"cmd-profile-scene.js"});
 assert.ok(window.__testProfileEditor,"Editor source no longer exposes renderSheet");
 const click=(attribute,value)=>{
  const prop=attribute.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  const node=area.querySelectorAll("[data-"+attribute+"]").find(x=>x.dataset[prop]===value);
  assert.ok(node,"Button not found: "+attribute+"="+value);
  node.click();
 };
 return {area,window,click,render:window.__testProfileEditor.renderSheet};
}

test("CMD Sphere only offers the 68 approved complete avatars",()=>{
 const {area,render}=makeEditor();render("avatar");assert.equal(area.querySelectorAll("[data-imported-avatar]").length,68);assert.equal(area.querySelectorAll("[data-avatar-part]").length,0);
});

test("CMD Sphere dressing, scene and pet/vehicle switches remain clickable",()=>{
 const {area,window,click,render}=makeEditor();
 render("mode");
 assert.ok(area.querySelectorAll("[data-scene-choice]").length>15);
 click("scene-choice","top");
 render("scene");
 assert.ok(area.querySelectorAll("[data-scene-choice]").some(el=>el.dataset.value==="catalog-scene-1"));
 render("pet");
 click("universe-tab","vehicle");
 assert.ok(area.querySelectorAll("[data-scene-choice]").some(el=>el.dataset.value==="catalog-vehicle-27"));
 const car=area.querySelectorAll("[data-scene-choice]").find(el=>el.dataset.value==="catalog-vehicle-27");
 car.click();
 assert.equal(window.cmdSphereSceneState().vehicle,"catalog-vehicle-27");
 click("universe-tab","home");
 assert.ok(area.querySelectorAll("[data-scene-choice]").some(el=>el.dataset.value==="catalog-home-1"));
});


test("CMD Sphere renders and selects each of the 68 distinct avatars, including last",()=>{
 const {area,window,click,render}=makeEditor();
 render("avatar");
 const avatarButtons=area.querySelectorAll("[data-imported-avatar]");
 assert.equal(avatarButtons.length,68,"All 68 unique avatar choices must be present");
 assert.equal(new Set(avatarButtons.map(button=>button.dataset.importedAvatar)).size,68);
 for(let i=0;i<68;i++){
  click("imported-avatar",String(i));
  const state=window.cmdSphereSceneState();
  assert.equal(state.avatarPreset,"reference-avatar-"+i);
  assert.equal(state.avatarStyle,"2d");
  assert.equal(area.querySelectorAll("[data-imported-avatar]").length,68);
 }
});


test("CMD Sphere scene API saves every imported avatar in 2D without resetting it to 3D",async()=>{
 const {handleCmdProfileScene}=await import("../cmd-profile-scene-api.js");
 for(let index=0;index<68;index++){
  let storedScene=null;
  const pool={async query(sql,args){
   if(sql.includes("UPDATE cmd_global_profiles SET cmd_avatar_scene="))storedScene=JSON.parse(args[1]);
   return {rows:[]};
  }};
  const req={
   method:"POST",
   async *[Symbol.asyncIterator](){
    yield Buffer.from(JSON.stringify({scene:{scene:"forest",avatarPreset:"reference-avatar-"+index,avatarStyle:"2d"}}));
   }
  };
  const res={
   status:0,body:"",writeHead(code){this.status=code;return this},
   end(value){this.body=String(value);return this}
  };
  const handled=await handleCmdProfileScene(req,res,new URL("https://cmd-sphere.up.railway.app/api/profile/scene"),{pool,auth:{user:{id:"test-user"}}});
  assert.equal(handled,true);
  assert.equal(res.status,200,res.body);
  assert.equal(storedScene?.avatarPreset,"reference-avatar-"+index);
  assert.equal(storedScene?.avatarStyle,"2d");
  assert.equal(JSON.parse(res.body).scene.avatarPreset,"reference-avatar-"+index);
 }
});


test("CMD Sphere catalogue offers every pet, vehicle, home and scene as an independent selectable option",()=>{
 const {area,window,render}=makeEditor();
 const choose=(key,value)=>{
  const el=area.querySelectorAll("[data-scene-choice]").find(button=>button.dataset.sceneChoice===key&&button.dataset.value===value);
  assert.ok(el,"Missing "+key+" option: "+value);
  el.click();
  assert.equal(window.cmdSphereSceneState()[key],value);
 };
 const switchUniverse=(name)=>{
  const el=area.querySelectorAll("[data-universe-tab]").find(button=>button.dataset.universeTab===name);
  assert.ok(el);el.click();
 };
 render("pet");
 const pets=area.querySelectorAll("[data-scene-choice]").filter(b=>b.dataset.sceneChoice==="pet").map(b=>b.dataset.value);
 assert.ok(pets.length>=37,"Missing pet catalogue variants");
 assert.equal(new Set(pets).size,pets.length,"Duplicate pet choices");
 for(const pet of pets)choose("pet",pet);
 assert.equal(window.cmdSphereSceneState().petStyle,"2d");
 switchUniverse("vehicle");
 const vehicles=area.querySelectorAll("[data-scene-choice]").filter(b=>b.dataset.sceneChoice==="vehicle").map(b=>b.dataset.value);
 assert.ok(vehicles.length>=22,"Vehicle catalogue incomplete");
 for(const vehicle of vehicles)choose("vehicle",vehicle);
 switchUniverse("home");
 const homes=area.querySelectorAll("[data-scene-choice]").filter(b=>b.dataset.sceneChoice==="home").map(b=>b.dataset.value);
 assert.ok(homes.length>=18,"Home catalogue incomplete");
 for(const home of homes)choose("home",home);
 render("scene");
 for(const index of [1,18,150])choose("scene","catalog-scene-"+index);
});

test("CMD Sphere trims pet and house sprites into PNGs, preserving scene proportions",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../cmd-profile-scene.js"),"utf8");
 assert.match(source,/sprite\.toDataURL\("image\/png"\)/);
 assert.match(source,/sprite\.width=right-left\+1\+pad\*2/);
 assert.match(source,/sceneTiles\[n\]/);
 assert.match(source,/background-size:contain/);
 assert.doesNotMatch(source,/const trim=removeCornerBadges/,"Scene artwork should not be cropped just to remove crowns");
});

test("Individual animal and vehicle catalogue saves every ID and serves separate RGBA PNG assets",async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,"../public/universe/v1/manifest.json"),"utf8"));
 const {handleCmdProfileScene}=await import("../cmd-profile-scene-api.js");
 for(const [group,key] of [["pets","pet"],["vehicles","vehicle"],["homes","home"],["scenes","scene"]]){
  const entries=manifest[group];assert.equal(new Set(entries.map(x=>x.id)).size,entries.length);
  for(const item of entries){
   const png=fs.readFileSync(path.join(__dirname,"../public",item.src));
   if(item.src.endsWith(".png")){assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");assert.equal(png[25],6,"PNG must retain RGBA transparency");
   assert.ok(png.readUInt32BE(16)>20&&png.readUInt32BE(20)>20,"Empty or truncated catalogue item: "+item.id);}else{assert.equal(png.subarray(8,12).toString(),"WEBP")}
   let stored;
   const pool={async query(sql,args){if(sql.includes("UPDATE cmd_global_profiles SET cmd_avatar_scene="))stored=JSON.parse(args[1]);return {rows:[]}}};
   const req={method:"POST",async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify({scene:{scene:"forest",[key]:item.id,petStyle:"2d",vehicle:key==="vehicle"?item.id:"catalog-vehicle-27",avatarPreset:"reference-avatar-67",avatarStyle:"2d"}}))}};
   const res={writeHead(code){assert.equal(code,200);return this},end(body){assert.equal(JSON.parse(body).scene[key],item.id)}};
   await handleCmdProfileScene(req,res,new URL("https://cmd-sphere.up.railway.app/api/profile/scene"),{pool,auth:{user:{id:"test-user"}}});
   assert.equal(stored[key],item.id);assert.equal(stored.avatarPreset,"reference-avatar-67");
  }
 }
});

// Regression: a saved restored wallpaper cannot be silently erased by a rolling deployment.
test("saved supplemental background ID survives a temporarily missing manifest",async()=>{
 const {handleCmdProfileScene}=await import("../cmd-profile-scene-api.js");
 const saved="cmd-restored-asset-unavailable-during-rollout";
 let record={cmd_avatar_scene:{scene:saved,avatarPreset:"reference-avatar-67",top:"jacket",pet:"none"}};
 const pool={async query(sql,args){
  if(sql.startsWith("SELECT cmd_avatar_scene"))return {rows:[record]};
  if(sql.startsWith("UPDATE cmd_global_profiles SET cmd_avatar_scene="))record={...record,cmd_avatar_scene:JSON.parse(args[1])};
  return {rows:[]};
 }};
 const response=()=>({status:0,body:"",writeHead(code){this.status=code;return this},end(value){this.body=String(value);return this}});
 const url=new URL("https://cmd-sphere.up.railway.app/api/profile/scene");
 const auth={user:{id:"regression-user"}};
 const read=response();
 await handleCmdProfileScene({method:"GET"},read,url,{pool,auth});
 assert.equal(read.status,200);
 assert.equal(JSON.parse(read.body).scene.scene,saved);
 const req={method:"POST",async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify({scene:record.cmd_avatar_scene}))}};
 const write=response();
 await handleCmdProfileScene(req,write,url,{pool,auth});
 assert.equal(write.status,200);
 assert.equal(record.cmd_avatar_scene.scene,saved);
 assert.equal(record.cmd_avatar_scene.top,"jacket");
 assert.equal(record.cmd_avatar_scene.avatarPreset,"reference-avatar-67");
});
