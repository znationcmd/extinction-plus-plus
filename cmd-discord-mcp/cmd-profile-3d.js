/* CMD Sphere — WebGL PBR 3D portrait. Real glTF humans with rigged animations.
   GLB reference assets: three.js (Soldier, Michelle), Khronos CC0/CC BY Fox.
   User may upload their own textured, fully rigged, legally owned GLB characters/pets. */
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {clone as cloneSkinned} from "three/addons/utils/SkeletonUtils.js";
THREE.Cache.enabled=true;
const loader=new GLTFLoader();
const modelUrls={soldier:"/cmd-three/models/Soldier.glb",michelle:"/cmd-three/models/Michelle.glb",fox:"/cmd-three/models/Fox.glb",cat:"/cmd-three/models/Cat.glb",horse:"/cmd-three/models/Horse.glb",parrot:"/cmd-three/models/Parrot.glb",flamingo:"/cmd-three/models/Flamingo.glb",stork:"/cmd-three/models/Stork.glb",duck:"/cmd-three/models/Duck.glb",customAvatar:"/api/profile/3d/avatar",customPet:"/api/profile/3d/pet"};
const models=new Map();
let editor=null,banner=null,currentState=null,visible=true;
const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
const loadGLB=url=>{
 if(!models.has(url))models.set(url,new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject)).catch(e=>{models.delete(url);throw e}));
 return models.get(url);
};
function createCanvas(mount,kind){
 if(!mount)return null;
 const wrapper=document.createElement("div");wrapper.className="cmd-real-3d cmd-real-3d-"+kind;
 wrapper.setAttribute("aria-label","Personnage en trois dimensions. Glisse horizontalement pour le faire tourner.");
 wrapper.innerHTML='<span class="cmd-real-3d-loading">Chargement du modèle 3D…</span>';
 mount.prepend(wrapper);
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power",preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(1.6,window.devicePixelRatio||1));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=false;
  renderer.setClearColor(0x000000,0);
  wrapper.prepend(renderer.domElement);
 }catch(e){wrapper.querySelector(".cmd-real-3d-loading").textContent="3D indisponible sur cet appareil.";wrapper.classList.add("cmd-real-3d-unavailable");return null}
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(32,1,.01,80);
 camera.position.set(0,1.7,7.6);
 const ambient=new THREE.HemisphereLight(0xe1eafa,0x503a5f,3.05);scene.add(ambient);
 const key=new THREE.DirectionalLight(0xfff0e4,3.3);key.position.set(-2.7,6.4,6);scene.add(key);
 const rim=new THREE.DirectionalLight(0x8974fe,2.2);rim.position.set(3.5,4.2,-2);scene.add(rim);
 const fill=new THREE.PointLight(0xd941ef,19,11);fill.position.set(3,1,2.2);scene.add(fill);
 const base=new THREE.Group();scene.add(base);
 const frame={wrapper,renderer,camera,scene,base,mixers:[],person:null,pet:null,modelKey:"",petKey:"",lookKey:"",poseKey:"",activeAnimation:null,sourceAnimations:[],personMixer:null,petMixer:null,token:0,petToken:0,angle:0,last:performance.now(),lastDraw:0,running:false,kind,requested:false};
 let pointer=null;
 wrapper.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;pointer={x:e.clientX,id:e.pointerId};wrapper.setPointerCapture?.(e.pointerId)});
 wrapper.addEventListener("pointermove",e=>{if(!pointer||e.pointerId!==pointer.id)return;frame.angle+=(e.clientX-pointer.x)*.008;pointer.x=e.clientX});
 const stop=()=>pointer=null;wrapper.addEventListener("pointerup",stop);wrapper.addEventListener("pointercancel",stop);
 frame.resize=()=>{
  if(!wrapper.isConnected)return;
  const w=Math.max(1,wrapper.clientWidth),h=Math.max(1,wrapper.clientHeight);
  camera.aspect=w/h;camera.position.set(0,1.62,h/w>1.4?7.7:6.45);camera.lookAt(0,1.42,0);camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
 };
 frame.render=()=>{
  if(!frame.wrapper.isConnected){frame.running=false;return}
  const now=performance.now(),delta=Math.min((now-frame.last)/1000,.06);frame.last=now;
  const insideHidden=!!wrapper.closest("[hidden]");
  if(!document.hidden&&visible&&!insideHidden&&now-frame.lastDraw>(reduced?140:35)){
   frame.lastDraw=now;
   if(!reduced)frame.mixers.forEach(m=>m.update(delta));
   base.rotation.y+=(frame.angle-base.rotation.y)*.06;
   if(!reduced&&frame.person)frame.person.position.y=Math.sin(now*.00135)*.013;
   renderer.render(scene,camera);
  }
  requestAnimationFrame(frame.render);
 };
 frame.resize();frame.running=true;requestAnimationFrame(frame.render);
 window.addEventListener("resize",frame.resize,{passive:true});
 return frame;
}
function normalize(mesh,height,x,z){
 mesh.position.set(0,0,0);mesh.scale.setScalar(1);
 mesh.updateMatrixWorld(true);
 const bb=new THREE.Box3().setFromObject(mesh);
 const sz=new THREE.Vector3();bb.getSize(sz);
 const center=new THREE.Vector3();bb.getCenter(center);
 if(sz.y<.0001||!Number.isFinite(sz.y))throw Error("Géométrie GLB vide.");
 const scalar=height/sz.y;mesh.scale.setScalar(scalar);
 mesh.position.set(x-center.x*scalar,-bb.min.y*scalar,z-center.z*scalar);
 return mesh;
}
function applyOutfit(group,color,look){
 const tint=new THREE.Color(color||"#fff");
 group.traverse(obj=>{
  if(!obj.isMesh||!obj.material)return;
  const mats=Array.isArray(obj.material)?obj.material:[obj.material];
  const replacements=mats.map(mat=>{
   if(!mat||!mat.isMeshStandardMaterial)return mat;
   const name=(String(mat.name||"")+" "+String(obj.name||"")).toLowerCase();
   if(/skin|head|face|hair|eye|teeth|mouth|hand|finger|neck/.test(name))return mat;
   if(!/shirt|coat|jacket|uniform|armor|body|suit|cloth|top|vest|fabric|trouser|pant|pants/.test(name))return mat;
   const m=mat.userData?.cmdProfileMaterial?mat:mat.clone();
   if(!m.userData.cmdProfileMaterial){m.userData.cmdProfileMaterial=true;m.userData.cmdOriginalColor=m.color.getHex()}
   m.color.setHex(m.userData.cmdOriginalColor).lerp(tint,.38);return m;
  });
  obj.material=Array.isArray(obj.material)?replacements:replacements[0];
 });
}

function applyAppearance(group,state){
 const skin=new THREE.Color(state.skin||"#e8ad7e"),hair=new THREE.Color(state.hairColor||"#201b27");
 group.traverse(node=>{
  if(!node.isMesh||!node.material)return;
  const objName=String(node.name||"").toLowerCase();
  const map=mat=>{
   if(!mat?.isMeshStandardMaterial)return mat;
   const label=(objName+" "+String(mat.name||"")).toLowerCase();
   const isHair=/hair|eyebrow|brow|beard|scalp/.test(label);
   const isSkin=/skin|face|head|neck|hand|flesh/.test(label)&&!/helmet|hood|armor|cloth/.test(label);
   if(!isHair&&!isSkin)return mat;
   const clone=mat.userData?.cmdAppearanceMaterial?mat:mat.clone();
   if(!clone.userData.cmdAppearanceMaterial){clone.userData.cmdAppearanceMaterial=true;clone.userData.cmdBaseTint=clone.color.getHex()}
   clone.color.setHex(clone.userData.cmdBaseTint).lerp(isHair?hair:skin,isHair?.43:.24);
   return clone;
  };
  node.material=Array.isArray(node.material)?node.material.map(map):map(node.material);
 });
}
function applyAccessory(frame,state){
 if(frame.accessoryMesh){frame.base.remove(frame.accessoryMesh);frame.accessoryMesh=null}
 const choice=state.accessory;
 if(!frame.person||!["glasses","sunglasses","cap","hat","crown"].includes(choice))return;
 const bounds=new THREE.Box3().setFromObject(frame.person),size=new THREE.Vector3();bounds.getSize(size);
 const headY=bounds.max.y-size.y*.115;
 const group=new THREE.Group();
 const dark=new THREE.MeshStandardMaterial({color:choice==="glasses"?0xb8d7ef:0x252633,metalness:.15,roughness:.3,transparent:true,opacity:.86});
 const frameMat=new THREE.MeshStandardMaterial({color:0x282332,metalness:.35,roughness:.4});
 if(choice==="glasses"||choice==="sunglasses"){
  for(const x of [-.14,.14]){const lens=new THREE.Mesh(new THREE.BoxGeometry(.235,.135,.025),dark);lens.position.set(x,0,.01);group.add(lens)}
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(.08,.025,.035),frameMat);bridge.position.z=.02;group.add(bridge);
  group.position.set(0,headY-.045,bounds.max.z+.045);
 }else{
  const hat=new THREE.Mesh(new THREE.CylinderGeometry(choice==="crown"?.17:.22,.21,choice==="crown"?.19:.13,20),new THREE.MeshStandardMaterial({color:choice==="crown"?0xe3bb63:0x49405f,roughness:.8}));
  group.add(hat);
  if(choice!=="crown"){const brim=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.018,24),hat.material);brim.position.y=-.07;group.add(brim)}
  group.position.set(0,headY+.18,0);
 }
 frame.base.add(group);frame.accessoryMesh=group;
}
function setPose(frame,state){
 if(!frame.personMixer||!frame.sourceAnimations.length)return;
 const desired=state.pose==="run"?/run/i:state.pose==="walk"?/walk/i:state.pose==="dance"?/dance|samba/i:/idle|breath|stand|relax/i;
 const clip=frame.sourceAnimations.find(x=>desired.test(x.name))||frame.sourceAnimations.find(x=>/idle|breath|stand|relax|walk/i.test(x.name))||frame.sourceAnimations.find(x=>!/tpose|t-pose|bindpose|restpose/i.test(x.name))||frame.sourceAnimations[0];
 if(frame.activeAnimation===clip.name&&frame.personMixer.existingAction(clip)?.isRunning())return;
 frame.personMixer.stopAllAction();frame.personMixer.clipAction(clip).reset().fadeIn(.23).play();
 frame.activeAnimation=clip.name;
}
function setNotice(frame,message){
 const el=frame.wrapper.querySelector(".cmd-real-3d-loading");if(el){el.hidden=!message;if(message)el.textContent=message}
}
async function makeCivilian(state){
 const root=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:state.skin||"#e8ad7e",roughness:.9}),hair=new THREE.MeshStandardMaterial({color:state.hairColor||"#33241e",roughness:.94});
 const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.84});
 const top=mat(state.topColor||"#ffffff"),denim=mat(state.bottom==="dark"?"#292d39":state.bottom==="cargo"?"#686e5b":"#476c99"),shoe=mat(state.shoes==="boots"?"#4b382d":"#e3e6ec");
 const add=(geometry,material,x,y,z,parent=root)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m};
 const female=state.gender==="female"||state.avatarModel==="michelle";
 add(new THREE.CapsuleGeometry(.27,.13,8,16),skin,0,2.72,0);
 add(new THREE.SphereGeometry(.285,24,16),skin,0,2.76,.015).scale.set(1,.98,.84);
 add(new THREE.SphereGeometry(.29,24,16),hair,0,2.93,-.045).scale.set(1,.42,.95);
 for(const x of [-.105,.105]){add(new THREE.SphereGeometry(.018,12,8),mat("#29212a"),x,2.77,.248)}
 add(new THREE.CapsuleGeometry(.055,.055,5,12),skin,0,2.64,.25).rotation.x=Math.PI/2;
 const torso=add(new THREE.CylinderGeometry(female?.33:.38,.31,.83,24),top,0,1.99,0);
 const collar=add(new THREE.TorusGeometry(.13,.018,8,20),mat("#ececf0"),0,2.42,.04);collar.rotation.x=Math.PI/2;
 const sleeve=state.top==="tshirt"||state.top==="sport"?.18:state.top==="dress"?.44:.47;
 for(const x of [-1,1]){
  const arm=add(new THREE.CylinderGeometry(.115,.09,sleeve,14),top,x*.43,2.23,0);arm.rotation.z=x*.25;
  const fore=add(new THREE.CylinderGeometry(.09,.075,.68-sleeve*.5,12),skin,x*(.48+sleeve*.12),1.79,0);fore.rotation.z=x*.08;
  add(new THREE.SphereGeometry(.105,12,12),skin,x*.52,1.48,0);
  const shorts=state.bottom==="shorts"||state.bottom==="skirt";
  add(new THREE.CylinderGeometry(.17,.135,shorts?.38:.94,16),denim,x*.17,shorts?1.26:.99,0);
  if(shorts)add(new THREE.CylinderGeometry(.125,.095,.55,14),skin,x*.17,.81,0);
  add(new THREE.BoxGeometry(.29,.19,.48),shoe,x*.17,.14,.105);
 }
 if(state.bottom==="skirt"||state.top==="dress")add(new THREE.CylinderGeometry(.3,.46,.55,24),top,0,1.42,0);
 if(state.top==="jacket"||state.top==="hoodie"){const zip=add(new THREE.BoxGeometry(.015,.68,.012),mat("#dddce0"),0,2.02,.317);zip.rotation.y=0}
 if(state.top==="suit"){add(new THREE.BoxGeometry(.1,.55,.014),mat("#e8e8e8"),0,2.04,.318)}
 root.userData.cmdCivilian=true;return root;
}
function setPerson(frame,state){
 const id=state.avatarModel==="custom"?"customAvatar":"civilian";
 if(frame.modelKey===id&&frame.person){frame.wrapper.classList.add("cmd-real-3d-ready");return}
 const token=++frame.token;
 const install=(cloned,animations=[])=>{
  if(frame.token!==token)return;
  if(frame.person)frame.base.remove(frame.person);
  frame.base.add(cloned);frame.person=cloned;frame.modelKey=id;
  frame.mixers=[];if(frame.petMixer)frame.mixers.push(frame.petMixer);
  frame.lookKey="";frame.poseKey="";frame.sourceAnimations=animations;
  frame.activeAnimation="";frame.personMixer=animations.length?new THREE.AnimationMixer(cloned):null;
  if(frame.personMixer){frame.mixers.push(frame.personMixer);setPose(frame,state)}
  applyAccessory(frame,state);frame.wrapper.classList.add("cmd-real-3d-ready");setNotice(frame,"");
 };
 if(id==="civilian"){install(makeCivilian(state));return}
 setNotice(frame,"Chargement du personnage 3D…");
 loadGLB(modelUrls[id]).then(data=>{if(frame.token!==token)return;const cloned=cloneSkinned(data.scene);normalize(cloned,3.15,-.1,0);install(cloned,data.animations||[])}).catch(e=>{console.warn("[CMD 3D avatar]",e);setNotice(frame,"Impossible de charger le personnage personnalisé.")});
}
async function setPet(frame,state){
 const knownPets={fox:"fox",cat:"cat",horse:"horse",bird:"parrot",duck:"duck",flamingo:"flamingo",stork:"stork"};
 const id=state.pet==="none"?null:(knownPets[state.pet]||null);
 if(!id){
  if(frame.pet){frame.base.remove(frame.pet);frame.pet=null}if(frame.petMixer){frame.mixers=frame.mixers.filter(x=>x!==frame.petMixer);frame.petMixer=null}frame.petKey="";frame.petToken++;
  frame.wrapper.dataset.pet3d="off";return;
 }
 if(frame.petKey===id&&frame.pet)return;
 const ticket=++frame.petToken;
 try{
  const data=await loadGLB(modelUrls[id]);if(frame.petToken!==ticket)return;
  if(frame.pet){frame.base.remove(frame.pet);frame.pet=null}
  if(frame.petMixer){frame.mixers=frame.mixers.filter(x=>x!==frame.petMixer);frame.petMixer=null}
  const cloned=cloneSkinned(data.scene);normalize(cloned,.84,1.18,.26);cloned.rotation.y=-.35;
  frame.base.add(cloned);frame.pet=cloned;frame.petKey=id;frame.wrapper.dataset.pet3d="on";
  if(data.animations?.length){
   const mixer=new THREE.AnimationMixer(cloned);const clip=data.animations.find(x=>/survey|idle/i.test(x.name))||data.animations[0];
   mixer.clipAction(clip).play();frame.petMixer=mixer;frame.mixers.push(mixer);
  }
 }catch(e){console.warn("[CMD 3D pet]",e);frame.wrapper.dataset.pet3d="off"}
}
function update(frame,state){
 if(!frame)return;
 if(state.avatarStyle!=="3d"){frame.wrapper.classList.remove("cmd-real-3d-ready");frame.wrapper.dataset.disabled="true";return}
 frame.wrapper.dataset.disabled="false";
 void setPerson(frame,state);
 if(frame.person){const lookKey=[state.topColor,state.top,state.skin,state.hairColor,state.hair,state.accessory].join("-");if(frame.lookKey!==lookKey){if(frame.person.userData.cmdCivilian){frame.base.remove(frame.person);frame.person=makeCivilian(state);frame.base.add(frame.person)}else{applyOutfit(frame.person,state.topColor,state.top);applyAppearance(frame.person,state)}applyAccessory(frame,state);frame.lookKey=lookKey}
 if(frame.poseKey!==state.pose){setPose(frame,state);frame.poseKey=state.pose}}
 void setPet(frame,state);
}
const avatarThumbCache=new Map();
let avatarThumbBusy=false;

async function renderAvatarCards(){
 if(avatarThumbBusy)return;
 const buttons=[...document.querySelectorAll("#cmdSceneOptions [data-avatar-preset]")];
 if(!buttons.length)return;
 avatarThumbBusy=true;
 let renderer=null;
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:"low-power"});
  renderer.setPixelRatio(1);renderer.setSize(176,218,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  for(const button of buttons){
   const preset=window.cmdSphereAvatarPresets?.find(p=>p.id===button.dataset.avatarPreset);
   if(!preset)continue;
   let picture=avatarThumbCache.get(preset.id);
   if(!picture){
    const model=await loadGLB(modelUrls[preset.model]);
    const scene=new THREE.Scene(),root=cloneSkinned(model.scene);
    normalize(root,3.05,0,0);
    applyOutfit(root,preset.topColor,preset.top);applyAppearance(root,preset);
    scene.add(root);scene.add(new THREE.HemisphereLight(0xe7e2fc,0x483251,3.0));
    const main=new THREE.DirectionalLight(0xffeddc,3.2);main.position.set(-2.7,5,6);scene.add(main);
    const rim=new THREE.DirectionalLight(0x9c70ff,2.0);rim.position.set(2,4,-3);scene.add(rim);
    const camera=new THREE.PerspectiveCamera(31,176/218,.1,40);
    camera.position.set(0,1.8,6.4);camera.lookAt(0,2.0,0);
    renderer.render(scene,camera);picture=renderer.domElement.toDataURL("image/png");
    avatarThumbCache.set(preset.id,picture);
   }
   const holder=document.querySelector('#cmdSceneOptions [data-avatar-preset="'+preset.id+'"] .cmd-scene-model-photo');
   if(holder&&picture){const img=new Image();img.alt="Portrait 3D "+preset.name;img.src=picture;holder.replaceChildren(img)}
  }
 }catch(error){console.warn("[CMD Sphere portraits intégrés]",error)}
 finally{renderer?.dispose();renderer?.forceContextLoss();avatarThumbBusy=false}
}
const lookThumbCache=new Map();
function renderLookCards(){
 const area=document.querySelector("#cmdSceneOptions"),frame=editor;
 if(!area||!frame?.person||!frame.renderer||!frame.wrapper.isConnected||frame.wrapper.closest("[hidden]"))return;
 const tiles=area.querySelectorAll(".cmd-scene-look-tile[data-look]");
 if(!tiles.length)return;
 const state=snapshot(),cacheKey=frame.modelKey+"-"+state.gender;
 const w=126,h=172,renderer=frame.renderer;
 try{
  frame.camera.aspect=w/h;
  frame.camera.position.set(0,1.54,6.8);frame.camera.lookAt(0,1.52,0);frame.camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
  for(const tile of tiles){
   const ix=Number(tile.dataset.look),look=window.cmdSphereLookList?.[ix];
   if(!look)continue;
   const key=cacheKey+"-"+String(look.topColor);
   let data=lookThumbCache.get(key);
   if(!data){
    applyOutfit(frame.person,look.topColor,look.top);
    frame.scene.updateMatrixWorld(true);
    renderer.render(frame.scene,frame.camera);
    data=renderer.domElement.toDataURL("image/png");
    if(lookThumbCache.size>20)lookThumbCache.delete(lookThumbCache.keys().next().value);
    lookThumbCache.set(key,data);
   }
   const holder=tile.querySelector(".cmd-scene-look-model");
   if(!holder)continue;
   const image=new Image();image.className="cmd-scene-3d-look";image.loading="lazy";image.alt="Aperçu du vêtement en 3D";image.src=data;
   holder.replaceChildren(image);tile.classList.add("cmd-scene-3d-look-ready");
  }
 }catch(e){console.warn("[CMD 3D looks]",e.message)}
 finally{
  applyOutfit(frame.person,state.topColor,state.top);
  frame.resize();frame.renderer.render(frame.scene,frame.camera);
 }
}
function snapshot(){
 return window.cmdSphereSceneState?.()||currentState||{avatarStyle:"illustrated"};
}
function refresh(){
 const state=snapshot();currentState=state;
 if(!editor){const mount=document.querySelector("#cmdSceneHero");if(mount)editor=createCanvas(mount,"editor")}
 if(editor)update(editor,state);
 // Profile banner remains a personalized scene; renderer only starts when a 3D profile is saved.
 const profile=document.querySelector("#bannerTap");
 if(!banner&&profile&&state.avatarStyle==="3d"&&document.querySelector("#cmdSceneWrap.cmd-scene-active"))banner=createCanvas(profile,"banner");
 if(banner){banner.wrapper.hidden=!document.querySelector("#cmdSceneWrap.cmd-scene-active");update(banner,state)}
}
document.addEventListener("cmd-avatar-3d:update",refresh);
document.addEventListener("visibilitychange",()=>visible=!document.hidden);
window.cmdProfile3D={refresh,renderLookCards,renderAvatarCards,invalidateCustom:kind=>{const url=modelUrls[kind==="pet"?"customPet":"customAvatar"];models.delete(url);if(editor){if(kind==="pet")editor.petKey="";else editor.modelKey=""}if(banner){if(kind==="pet")banner.petKey="";else banner.modelKey=""}refresh()}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh);else refresh();
