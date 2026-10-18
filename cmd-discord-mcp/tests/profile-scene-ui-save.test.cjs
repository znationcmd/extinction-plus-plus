const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../cmd-profile-scene.js'),'utf8');
const begin=code.indexOf('async function save(){');
const end=code.indexOf('\nasync function initialize()',begin);
assert.ok(begin>0&&end>begin,'Editor save handler exists');
const saveBlock=code.slice(begin,end);
function mount(initial,serverScene){
 const calls=[],controls=new Map();
 const get=id=>{if(!controls.has(id))controls.set(id,{disabled:false,textContent:''});return controls.get(id)};
 const sandbox={initial,serverScene,calls,controls,console};
 const runner='(function(){'+
  'let busy=false,state={...initial},savedState={...initial},custom=null,savedCustom=null,customDirty=false,'+
  'characterPhoto=null,savedCharacterPhoto=null,characterDirty=false,animalPhoto=null,savedAnimalPhoto=null,animalDirty=false;'+
  'let sheet={hidden:false}; const defaults={};const $=id=>controls.get(id)||({disabled:false,textContent:""});'+
  'for(const id of ["#cmdSceneSave","#cmdScenePreviewSave","#cmdSceneNotice"])controls.set(id,{disabled:false,textContent:""});'+
  'let presentationCount=0;const present=()=>{presentationCount++};'+
  'const cleanCatalogueState=o=>({...o});const setTimeout=fn=>fn();'+
  'const document={body:{classList:{remove(){}}}};'+
  'const fetch=async(url,request)=>{const sent=JSON.parse(request.body);calls.push({url,sent});'+
  'return {ok:true,json:async()=>({scene:{...serverScene,...sent.scene}})}};'+
  saveBlock+
  ';return {save,edit:x=>{Object.assign(state,x)},clearBackground:()=>{customDirty=true;custom=null},'+
  'status:()=>({state,savedState,customDirty,presentationCount})};})()';
 return {api:vm.runInNewContext(runner,sandbox,{filename:'cmd-profile-scene-save.js'}),calls,get};
}
test('Editor sends only modified scene keys and does not overwrite a second device',async()=>{
 const base={scene:'neonforest',pet:'fox',avatarPreset:'reference-avatar-67',avatarStyle:'2d',vehicle:'kart'};
 const remote={...base,pet:'catalog-pet-42'};
 const h=mount(base,remote);
 h.api.edit({vehicle:'catalog-vehicle-27'});
 await h.api.save();
 assert.equal(h.calls.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].sent.scene)),{vehicle:'catalog-vehicle-27'});
 assert.equal(h.api.status().state.pet,'catalog-pet-42');
 assert.equal(h.api.status().state.avatarPreset,'reference-avatar-67');
 assert.equal(h.api.status().savedState.pet,'catalog-pet-42');
 assert.equal(h.api.status().presentationCount,1);
});
test('Editor explicitly sends image removal but does not touch scene fields',async()=>{
 const old={scene:'cmd-restored-forest',avatarPreset:'guardian',avatarStyle:'3d'};
 const h=mount(old,old);
 h.api.clearBackground();
 await h.api.save();
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].sent.customBackground,null);
 assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].sent.scene)),{});
 assert.equal(h.api.status().state.avatarStyle,'3d');
});
test('Profile editor load never silently converts previously saved 3D or illustrated modes',()=>{
 const init=code.slice(code.indexOf('async function initialize(){'));
 assert.doesNotMatch(init,/if\(state\.(avatarStyle|petStyle)===/);
 assert.match(init,/savedState=\{\.\.\.state\}/);
});
