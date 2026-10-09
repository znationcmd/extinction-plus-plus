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
  addEventListener(){},querySelectorAll(){return []}
 };
 const window={requestAnimationFrame(){}};
 vm.runInNewContext(source,{window,document,console},{filename:"cmd-profile-scene.js"});
 assert.ok(window.__testProfileEditor,"Editor source no longer exposes renderSheet");
 const click=(attribute,value)=>{
  const prop=attribute.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  const node=area.querySelectorAll("[data-"+attribute+"]").find(x=>x.dataset[prop]===value);
  assert.ok(node,"Button not found: "+attribute+"="+value);
  node.click();
 };
 return {area,window,click,render:window.__testProfileEditor.renderSheet};
}

test("CMD Sphere avatar navigation, haircuts and beards remain clickable",()=>{
 const {area,window,click,render}=makeEditor();
 render("avatar");
 for(const part of ["person","hair","beard","face","accessory"])click("avatar-part",part);
 click("avatar-part","hair");
 assert.equal(area.querySelectorAll("[data-groom-key]").length,16);
 click("groom-style","undercut");
 assert.equal(window.cmdSphereSceneState().hair,"undercut");
 click("avatar-part","beard");
 assert.equal(area.querySelectorAll("[data-groom-key]").length,8);
 click("groom-style","full");
 assert.equal(window.cmdSphereSceneState().beard,"full");
 click("avatar-part","face");
 assert.equal(window.cmdSphereSceneState().hair,"undercut");
 assert.equal(window.cmdSphereSceneState().beard,"full");
});

test("CMD Sphere dressing, scene and pet/vehicle switches remain clickable",()=>{
 const {area,window,click,render}=makeEditor();
 render("mode");
 assert.ok(area.querySelectorAll("[data-scene-choice]").length>15);
 click("scene-choice","top");
 render("scene");
 assert.ok(area.querySelectorAll("[data-scene-choice]").some(el=>el.dataset.value==="neonforest"));
 render("pet");
 click("universe-tab","vehicle");
 assert.ok(area.querySelectorAll("[data-scene-choice]").some(el=>el.dataset.value==="kart"));
 const car=area.querySelectorAll("[data-scene-choice]").find(el=>el.dataset.value==="kart");
 car.click();
 assert.equal(window.cmdSphereSceneState().vehicle,"kart");
 click("universe-tab","home");
 assert.ok(area.querySelectorAll("[data-scene-choice]").some(el=>el.dataset.value==="villa"));
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
