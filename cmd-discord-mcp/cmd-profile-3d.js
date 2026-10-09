/* CMD Sphere — WebGL PBR 3D portrait. Real glTF humans with rigged animations.
   GLB reference assets: three.js (Soldier, Michelle), Khronos CC0/CC BY Fox.
   User may upload their own textured, fully rigged, legally owned GLB characters/pets. */
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
THREE.Cache.enabled=true;
const loader=new GLTFLoader();
const modelUrls={soldier:"/cmd-three/models/Soldier.glb",michelle:"/cmd-three/models/Michelle.glb",fox:"/cmd-three/models/Fox.glb",customAvatar:"/api/profile/3d/avatar",customPet:"/api/profile/3d/pet"};
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
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power",preserveDrawingBuffer:false});
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
 const frame={wrapper,renderer,camera,scene,base,mixers:[],person:null,pet:null,modelKey:"",petKey:"",token:0,angle:0,last:performance.now(),running:false,kind,requested:false};
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
  const now=performance.now(),delta=Math.min((now-frame.last)/1000,.04);frame.last=now;
  if(!document.hidden&&visible&&!wrapper.closest("[hidden]")){
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
   const m=mat.clone();m.color.lerp(tint,look==="vivid"?.4:.24);return m;
  });
  obj.material=Array.isArray(obj.material)?replacements:replacements[0];
 });
}
function setNotice(frame,message){
 const el=frame.wrapper.querySelector(".cmd-real-3d-loading");if(el){el.hidden=!message;if(message)el.textContent=message}
}
async function setPerson(frame,state){
 const id=state.avatarModel==="custom"?"customAvatar":state.gender==="female"?"michelle":"soldier";
 if(frame.modelKey===id&&frame.person)return;
 const token=++frame.token;setNotice(frame,"Chargement du personnage 3D…");
 try{
  const data=await loadGLB(modelUrls[id]);
  if(frame.token!==token)return;
  if(frame.person){frame.base.remove(frame.person);frame.person=null}
  const cloned=data.scene.clone(true); // animated SkinnedMesh requires clone skeleton; handled by model's own root and default static pose
  normalize(cloned,3.15,-.1,0);
  cloned.rotation.y=.0;
  applyOutfit(cloned,state.topColor,state.top);
  frame.base.add(cloned);frame.person=cloned;frame.modelKey=id;
  frame.mixers=[];
  if(data.animations?.length){
   const mixer=new THREE.AnimationMixer(cloned);
   const clip=data.animations.find(x=>/idle/i.test(x.name))||data.animations.find(x=>/walk/i.test(x.name));
   if(clip){mixer.clipAction(clip).play();frame.mixers.push(mixer)}
  }
  frame.wrapper.classList.add("cmd-real-3d-ready");setNotice(frame,"");
 }catch(e){console.warn("[CMD 3D avatar]",e);setNotice(frame,"Modèle indisponible. Utilise « Importer mon modèle 3D » ou actualise.")}
}
async function setPet(frame,state){
 const id=state.petModel==="custom"?"customPet":state.pet==="fox"?"fox":null;
 if(!id){
  if(frame.pet){frame.base.remove(frame.pet);frame.pet=null}frame.petKey="";
  frame.wrapper.dataset.pet3d="off";return;
 }
 if(frame.petKey===id&&frame.pet)return;
 const ticket=++frame.petToken;
 try{
  const data=await loadGLB(modelUrls[id]);if(frame.petToken!==ticket)return;
  if(frame.pet){frame.base.remove(frame.pet);frame.pet=null}
  const cloned=data.scene.clone(true);normalize(cloned,.84,1.18,.26);cloned.rotation.y=-.35;
  frame.base.add(cloned);frame.pet=cloned;frame.petKey=id;frame.wrapper.dataset.pet3d="on";
  if(data.animations?.length){
   const mixer=new THREE.AnimationMixer(cloned);const clip=data.animations.find(x=>/survey|idle/i.test(x.name))||data.animations[0];
   mixer.clipAction(clip).play();frame.mixers.push(mixer);
  }
 }catch(e){console.warn("[CMD 3D pet]",e);frame.wrapper.dataset.pet3d="off"}
}
function update(frame,state){
 if(!frame)return;
 if(state.avatarStyle!=="3d"){frame.wrapper.classList.remove("cmd-real-3d-ready");return}
 void setPerson(frame,state);
 void setPet(frame,state);
}
function snapshot(){
 return window.cmdSphereSceneState?.()||currentState||{avatarStyle:"illustrated"};
}
function refresh(){
 const state=snapshot();currentState=state;
 if(!editor){const mount=document.querySelector("#cmdSceneHero");if(mount)editor=createCanvas(mount,"editor")}
 if(editor)update(editor,state);
 // Profile banner remains a personalized scene; renderer only starts when a 3D profile is saved.
 const profile=document.querySelector("#cmdSceneBackdrop");
 if(!banner&&profile&&state.avatarStyle==="3d"&&document.querySelector("#cmdSceneWrap.cmd-scene-active"))banner=createCanvas(profile,"banner");
 if(banner)update(banner,state);
}
document.addEventListener("cmd-avatar-3d:update",refresh);
document.addEventListener("visibilitychange",()=>visible=!document.hidden);
window.cmdProfile3D={refresh,invalidateCustom:kind=>{const url=modelUrls[kind==="pet"?"customPet":"customAvatar"];models.delete(url);if(editor){if(kind==="pet")editor.petKey="";else editor.modelKey=""}if(banner){if(kind==="pet")banner.petKey="";else banner.modelKey=""}refresh()}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh);else refresh();
