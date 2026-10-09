/* CMD Sphere civilian avatar editor. Original procedural civilians with interchangeable mesh garments; legacy custom GLB supported read-only. */
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
 const frame={wrapper,renderer,camera,scene,base,mixers:[],person:null,pet:null,modelKey:"",petKey:"",lookKey:"",poseKey:"",activeAnimation:null,sourceAnimations:[],personMixer:null,petMixer:null,token:0,petToken:0,angle:0,last:performance.now(),lastDraw:0,running:false,kind,requested:false,zoom:1,currentPose:"stand"};
 let pointer=null;
 wrapper.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;pointer={x:e.clientX,id:e.pointerId};wrapper.setPointerCapture?.(e.pointerId)});
 wrapper.addEventListener("pointermove",e=>{if(!pointer||e.pointerId!==pointer.id)return;frame.angle+=(e.clientX-pointer.x)*.008;pointer.x=e.clientX});
 wrapper.addEventListener("wheel",e=>{e.preventDefault();frame.zoom=THREE.MathUtils.clamp(frame.zoom+Math.sign(e.deltaY)*.08,.70,1.5);frame.resize()},{passive:false});
 const stop=()=>pointer=null;wrapper.addEventListener("pointerup",stop);wrapper.addEventListener("pointercancel",stop);
 frame.resize=()=>{
  if(!wrapper.isConnected)return;
  const w=Math.max(1,wrapper.clientWidth),h=Math.max(1,wrapper.clientHeight);
  camera.aspect=w/h;camera.position.set(0,1.62,(h/w>1.4?7.7:6.45)*frame.zoom);camera.lookAt(0,1.42,0);camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
 };
 frame.render=()=>{
  if(!frame.wrapper.isConnected){frame.running=false;return}
  const now=performance.now(),delta=Math.min((now-frame.last)/1000,.06);frame.last=now;
  const insideHidden=!!wrapper.closest("[hidden]");
  if(!document.hidden&&visible&&!insideHidden&&now-frame.lastDraw>(reduced?140:35)){
   frame.lastDraw=now;
   if(!reduced){frame.mixers.forEach(m=>m.update(delta));animateCivilian(frame,now)}
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
 if(!frame.person||!["glasses","sunglasses","roundglasses","aviator","mask","cap","hat","beanie","bucket","cowboy","crown","earrings","studs","hoops","necklace"].includes(choice))return;
 const bounds=new THREE.Box3().setFromObject(frame.person),size=new THREE.Vector3();bounds.getSize(size);
 const civilian=!!frame.person.userData.cmdCivilian;
 const headY=civilian?2.68:bounds.max.y-size.y*.115;
 const group=new THREE.Group();
 const dark=new THREE.MeshStandardMaterial({color:choice==="glasses"?0xb8d7ef:0x252633,metalness:.15,roughness:.3,transparent:true,opacity:.86});
 const frameMat=new THREE.MeshStandardMaterial({color:0x282332,metalness:.35,roughness:.4});
 if(["earrings","studs","hoops","necklace"].includes(choice)){
   const jewel=new THREE.MeshStandardMaterial({color:0xe1bee8,metalness:.62,roughness:.26});
   if(["earrings","studs","hoops"].includes(choice)){
    for(const x of [-.275,.275]){const hoop=new THREE.Mesh(choice==="studs"?new THREE.SphereGeometry(.024,16,12):new THREE.TorusGeometry(choice==="hoops"?.075:.045,.013,8,16),jewel);hoop.position.set(x,headY-.14,civilian?.115:bounds.max.z+.02);group.add(hoop)}
   }else{
    const chain=new THREE.Mesh(new THREE.TorusGeometry(.185,.012,8,28),jewel);chain.rotation.x=Math.PI/2.3;chain.position.set(0,headY-.57,civilian?.198:bounds.max.z-.1);group.add(chain);
   }
  }else if(["glasses","sunglasses","roundglasses","aviator","mask"].includes(choice)){
  for(const x of [-.143,.143]){
   const lens=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),dark);
   lens.scale.set(choice==="roundglasses"?.092:choice==="aviator"?.133:choice==="mask"?.151:.115,choice==="roundglasses"?.095:choice==="mask"?.110:.081,.014);lens.position.set(x,0,.012);group.add(lens);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(.111,.010,8,28),frameMat);
   rim.scale.y=choice==="roundglasses"?1.0:choice==="mask"?.90:.73;rim.position.set(x,0,.026);group.add(rim);
  }
  const bridge=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.08,12),frameMat);
  bridge.rotation.z=Math.PI/2;bridge.position.z=.033;group.add(bridge);
  group.position.set(0,headY+.040,civilian?.287:bounds.max.z+.045);
 }else{
  const hat=new THREE.Mesh(new THREE.CylinderGeometry(choice==="crown"?.17:.22,.21,choice==="beanie"?.28:choice==="cowboy"?.24:.13,20),new THREE.MeshStandardMaterial({color:choice==="crown"?0xe3bb63:0x49405f,roughness:.8}));
  group.add(hat);
  if(!["crown","beanie"].includes(choice)){const brim=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.018,24),hat.material);brim.position.y=-.07;group.add(brim)}
  group.position.set(0,headY+.18,0);
 }
 frame.base.add(group);frame.accessoryMesh=group;
}

function applyWearableExtras(frame,state){
 if(frame.wearableExtras){frame.base.remove(frame.wearableExtras);frame.wearableExtras.traverse(o=>{if(o.isMesh){o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m?.dispose())}});frame.wearableExtras=null}
 if(!frame.person?.userData?.cmdCivilian)return;
 const group=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:0xeac25d,metalness:.88,roughness:.19});
 const glass=new THREE.MeshStandardMaterial({color:0xf7eafa,metalness:.12,roughness:.25});
 const leather=new THREE.MeshStandardMaterial({color:0x6d4c47,roughness:.84});
 const add=(geometry,material,x,y,z,parent=group)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh};
 const orb=(x,y,z,r,material=metal)=>add(new THREE.SphereGeometry(r,16,12),material,x,y,z);
 const ring=(x,y,z,r=.039,axis="z")=>{const m=add(new THREE.TorusGeometry(r,.010,8,24),metal,x,y,z);if(axis==="y")m.rotation.x=Math.PI/2;return m};
 const selection=String(state.piercing||"none");
 if(selection==="nose-stud")orb(.079,2.566,.286,.016);
 if(selection==="nose-ring")ring(-.066,2.535,.284,.034);
 if(selection==="septum")ring(0,2.536,.288,.046);
 if(selection==="brow-left"||selection==="brow-right"){const x=selection.endsWith("left")?-.174:.174;orb(x,2.821,.230,.016);orb(x+.039,2.824,.233,.014)}
 if(selection==="lip-left"||selection==="lip-right")ring(selection.endsWith("left")?-.085:.085,2.475,.233,.025);
 if(selection==="labret")orb(0,2.437,.235,.022);
 if(selection==="double-lip"){ring(-.073,2.472,.228,.024);ring(.073,2.472,.228,.024)}
 if(selection==="ear-studs"||selection==="ear-hoops"||selection==="ear-chain")for(const x of [-.305,.305]){
   if(selection==="ear-studs")orb(x,2.616,.092,.024);
   else{ring(x,2.603,.084,selection==="ear-chain"?.048:.060);if(selection==="ear-chain")orb(x,2.527,.084,.024,glass)}
 }
 const bag=String(state.bag||"none");
 if(bag!=="none"){
  const backpack=bag==="backpack",mini=["mini","clutch"].includes(bag);
  const width=mini?.19:backpack?.36:.28,height=mini?.18:backpack?.49:.30;
  const x=backpack?0:.65,y=backpack?1.96:1.49,z=backpack?-.36:.13;
  const body=add(new THREE.BoxGeometry(width,height,mini?.09:.18),leather,x,y,z);
  body.scale.z=backpack?1.2:1;
  const handle=add(new THREE.TorusGeometry(width*.39,.022,8,24,Math.PI),metal,x,y+height*.5-.01,z);
  handle.rotation.z=Math.PI;
  if(bag==="crossbody"){
   const strap=add(new THREE.CylinderGeometry(.021,.021,1.53,12),leather,.33,2.035,.237);
   strap.rotation.z=-.48;
  }else if(backpack)for(const offset of [-.145,.145]){
   const strap=add(new THREE.CylinderGeometry(.022,.022,.81,12),leather,offset,2.08,-.195);strap.rotation.z=offset>0?-.2:.2;
  }
  const buckle=add(new THREE.BoxGeometry(.060,.048,.019),metal,x,y,z+(backpack?-.115:.096));
 }
 if(group.children.length){frame.base.add(group);frame.wearableExtras=group}
}
function setPose(frame,state){
 frame.currentPose=state.pose||"stand";
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

function makeCivilian(state){
 // CMD Sphere original stylized-human avatar: organic PBR shapes, individual hair and facial hair.
 // Meshes are authored locally and require no uploads, user GLB files, or proprietary avatar APIs.
 const root=new THREE.Group(),female=state.gender==="female";
 const mat=(color,rough=.83,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
 const skin=mat(state.skin||"#e8ad7e",.88),hair=mat(state.hairColor||"#201b27",.77);
 const beard=mat(state.beardColor||state.hairColor||"#201b27",.88),top=mat(state.topColor||"#7549b9",.82),trim=mat("#edf0f4",.72),lips=mat("#995b59",.82);
 const pupil=mat("#1c1821",.26),iris=mat(state.eyeColor||"#28222e",.33),white=mat("#f8f3ee",.2),brow=hair;
 const pant=mat(state.bottom==="dark"||state.bottom==="formal"?"#292b3a":state.bottom==="cargo"?"#66735d":state.bottom==="shorts"?"#a3aec7":"#536a89",.9);
 const shoes=mat(state.shoes==="boots"?"#4c3934":state.shoes==="formal"?"#26232c":state.shoes==="sandals"?"#b99574":"#e8ebf2",.64);
 const add=(geo,m,x,y,z,parent=root)=>{const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh};
 const oval=(x,y,z,rx,ry,rz,m,parent=root)=>{const mesh=add(new THREE.SphereGeometry(1,40,28),m,x,y,z,parent);mesh.scale.set(rx,ry,rz);return mesh};
 const strand=(p0,p1,r0,r1,m,parent=root)=>{const a=new THREE.Vector3(...p0),b=new THREE.Vector3(...p1),v=new THREE.Vector3().subVectors(b,a);const mesh=add(new THREE.CylinderGeometry(r1,r0,v.length(),12,1),m,0,0,0,parent);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());mesh.position.copy(a.add(b).multiplyScalar(.5));return mesh};
 const curl=(x,y,z,r,m=hair,parent=head)=>oval(x,y,z,r,r*.96,r,m,parent);
 const faceShape=state.faceShape||"oval",head=new THREE.Group();head.position.set(0,2.68,0);root.add(head);
 const faceW=faceShape==="round"?.305:faceShape==="square"?.292:faceShape==="heart"?.287:.280;
 const faceH=faceShape==="round"?.292:faceShape==="square"?.321:.342;
 oval(0,0,0,faceW,faceH,.248,skin,head);
 if(faceShape==="square")oval(0,-.18,.005,.253,.13,.202,skin,head);
 if(faceShape==="heart")oval(0,.12,.003,.286,.185,.230,skin,head);
 for(const side of [-1,1]){
  oval(side*(faceW+.007),-.015,-.007,.058,.102,.060,skin,head);
  oval(side*(faceW+.047),-.012,.040,.018,.048,.020,mat(state.skin||"#e8ad7e",.97),head);
 }
 const eyeY=.045,eyew=state.eyeShape==="wide"?.082:state.eyeShape==="almond"?.079:.071,eyeh=state.eyeShape==="wide"?.056:state.eyeShape==="almond"?.036:.046;
 for(const side of [-1,1]){
  const x=side*.115;
  oval(x,eyeY,.227,eyew,eyeh,.031,white,head);
  oval(x,eyeY,.253,.039,.040,.015,iris,head);
  oval(x,eyeY,.267,.020,.026,.008,pupil,head);
  oval(x-.013,eyeY+.014,.275,.011,.012,.006,white,head);
  const browWidth=state.browStyle==="thin"?.013:state.browStyle==="thick"?.032:.022;
  const pts=[new THREE.Vector3(x-side*.07,.131,.235),new THREE.Vector3(x,.139+(state.browStyle==="arched"?.034:0),.251),new THREE.Vector3(x+side*.07,.131,.232)];
  head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,browWidth,8,false),brow));
  const crease=mat("#5e3132",.95);
  oval(x,-.073,.228,.066,.011,.008,crease,head).material.transparent=true;
  crease.opacity=.17;
 }
 const noseScale=state.nose==="small"?.70:state.nose==="defined"?1.28:1;
 oval(0,-.069,.246,.038*noseScale,.078*noseScale,.052*noseScale,skin,head);
 oval(0,-.132,.281,.052*noseScale,.030,.026,skin,head);
 const mouth=state.mouth||"smile";
 const smile=mouth==="neutral"?0:mouth==="soft"?.014:.026;
 const mouthPoints=[[-.085,-.202+smile,.222],[-.041,-.209,.235],[0,-.215,.245],[.041,-.209,.235],[.085,-.202+smile,.222]];
 head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPoints.map(a=>new THREE.Vector3(...a))),16,.008,8,false),lips));
 oval(0,-.236,.232,.073,.013,.015,mat("#c47a78",.9),head);
 // Sculpted coiffures: avoid square plates and disconnected cube-shaped fringe.
 const style=state.hair||"short";
 const darkHair=mat(state.hairColor||"#201b27",.94);
 const cap=(height=.14)=>oval(0,.277,.002,faceW*1.037,height,.252,hair,head);
 const lock=(x,yy,zz,rx,ry,rz,angle=0)=>{const o=oval(x,yy,zz,rx,ry,rz,hair,head);o.rotation.z=angle;return o};
 if(style==="shaved"){oval(0,.293,-.012,faceW*1.01,.044,.240,darkHair,head)}
 else if(style==="buzz"){cap(.067);for(let i=0;i<18;i++){const a=i*2.399;lock(Math.sin(a)*.22,.324+Math.cos(a*2)*.005,Math.cos(a)*.17,.037,.043,.038)}}
 else if(style==="afro"||style==="curly"){
  cap(.137);
  const count=style==="afro"?34:22,r=style==="afro"?.072:.059;
  for(let i=0;i<count;i++){const a=i*2.399,rad=.06+Math.sqrt((i+.4)/count)*.231;
   const x=Math.cos(a)*rad,z=Math.sin(a)*rad-.005;
   lock(x,.311+Math.max(0,.10*(1-rad))+(style==="afro"?.070:.013)+Math.sin(i*2.7)*.028,z,r,r*1.12,r)}
  if(style==="afro")for(let i=0;i<11;i++){const a=i*2.7;lock(Math.sin(a)*.27,.21,Math.cos(a)*.17,.055,.079,.062)}
 }
 else{
  cap(style==="fade"||style==="undercut"?.099:.145);
  if(style==="long"||style==="wavy"||style==="bob"||style==="ponytail"||style==="braids"||style==="locs"){
   const longHair=["long","wavy","ponytail","braids","locs"].includes(style);
   if(style==="ponytail"){
    for(let i=0;i<6;i++){const a=i*1.05;lock(Math.sin(a)*.10,.09-i*.062,-.277-i*.013,.105,.14,.082)}
   }else if(style==="braids"||style==="locs"){
    for(const side of [-1,1])for(let i=0;i<5;i++){
     const x=side*(.18+i*.016),z=.12-(i*.067);
     for(let k=0;k<8;k++)lock(x+Math.sin(k*1.6+i)*.013,.14-k*.091,z,.028,.043,.030)}
   }else for(const side of [-1,1]){
    for(let i=0;i<5;i++){const x=side*(.222+i*.013),z=.133-i*.083;
     const yy=longHair?-.24:-.08;
     const layer=lock(x,yy,z,.060,longHair?.46:.28,.076,side*(style==="wavy"?.12:.025));
     if(style==="wavy")layer.rotation.x=Math.sin(i*1.2)*.14}
   }
  }
  const sideSweep=style==="swept"||style==="undercut"||style==="quiff";
  const textured=["crop","short","fade","undercut","quiff","swept","wavy","long","bob"].includes(style);
  if(textured)for(let i=0;i<13;i++){
   const x=-.237+i*.039;
   const raised=style==="quiff"?.093:style==="swept"?.046:style==="wavy"?.052:0;
   lock(x+(sideSweep?.027:0),.300+raised+Math.sin(i*1.32)*.023,.147+Math.cos(i*.8)*.055,
     .043,.087+raised*.3,.075,sideSweep?-.30:-.07);
  }
  if(style==="crop"||style==="short")for(let i=0;i<6;i++)lock(-.18+i*.068,.236,.234,.044,.051,.058,.17);
  if(style==="fade"||style==="undercut")for(const side of [-1,1])oval(side*.267,.155,-.035,.027,.11,.174,darkHair,head);
 }
 // Real, independent beard selectors; beard is a group attached to the face, not a flat sticker.
 const beardStyle=state.beard||"none";
 if(beardStyle!=="none"){
  const stubble=beardStyle==="stubble";
  const whiskers=stubble?mat(state.beardColor||state.hairColor||"#201b27",.97):beard;
  if(stubble){whiskers.transparent=true;whiskers.opacity=.65}
  if(["stubble","short","trimmed","full","long"].includes(beardStyle)){
   const len=beardStyle==="long"?.29:beardStyle==="full"?.21:beardStyle==="trimmed"?.135:beardStyle==="short"?.10:.045;
   for(const side of [-1,1]){
    oval(side*.191,-.169,.130,.087,.128,.101,whiskers,head);
    oval(side*.128,-.275,.112,.103,len+.028,.119,whiskers,head);
   }
   oval(0,-.299-(len-.10)*.32,.132,.172,len,.145,whiskers,head);
  }
  if(beardStyle==="goatee"){
   oval(0,-.306,.175,.119,.117,.112,whiskers,head);
   oval(0,-.397,.131,.088,.11,.078,whiskers,head);
  }
  if(beardStyle!=="stubble"){
   if(beardStyle==="mustache"||beardStyle==="goatee"||["short","trimmed","full","long"].includes(beardStyle)){
    for(const side of [-1,1]){const t=oval(side*.067,-.172,.269,.076,.031,.027,whiskers,head);t.rotation.z=side*.15}
   }
  }
 }
 // Soft proportional physique, articulated arms and legs, fully modelled garments.
 const torsoWidth=(female?.335:.383)*(state.bodyType==="slim"?.87:state.bodyType==="athletic"?1.10:1);
 const shoulders=oval(0,2.045,0,torsoWidth,.435,.236,top);
 oval(0,1.755,.009,torsoWidth*.82,.27,.201,top);
 oval(0,2.322,-.005,.105,.157,.104,skin);
 const hip=oval(0,1.515,0,.310,.185,.219,pant);
 const topStyle=state.top||"hoodie";
 if(topStyle==="dress"||state.bottom==="skirt"){
  const garment=add(new THREE.CylinderGeometry(.281,topStyle==="dress"?.49:.40,topStyle==="dress"?.70:.46,40,1),top,0,topStyle==="dress"?1.485:1.385,.015);
  garment.scale.z=.84;
 }
 if(["hoodie","sweater","jacket","coat","suit"].includes(topStyle)){
  const outer=mat(topStyle==="jacket"?"#363540":topStyle==="suit"?"#283342":state.topColor||"#7549b9",.9);
  for(const side of [-1,1]){
   const panel=oval(side*torsoWidth*.49,2.03,.232,torsoWidth*.48,.370,.053,topStyle==="jacket"||topStyle==="suit"?outer:top);
   panel.rotation.z=side*-.064;
   if(["jacket","coat","suit"].includes(topStyle)){
    const lapel=oval(side*.105,2.257,.265,.077,.190,.023,topStyle==="suit"?trim:outer);lapel.rotation.z=side*.38;
   }
  }
  if(topStyle==="hoodie")oval(0,2.310,-.125,.230,.18,.120,top);
 }
 if(["shirt","polo","suit"].includes(topStyle))for(const side of [-1,1]){
  const collar=oval(side*.102,2.331,.197,.118,.063,.024,trim);collar.rotation.z=side*.43;
 }
 if(topStyle==="sport")for(const side of [-1,1])strand([side*.21,2.23,.234],[side*.21,1.82,.238],.016,.016,trim);
 const shortSleeves=["tshirt","polo","sport","dress"].includes(topStyle);
 const arms=[];
 for(const side of [-1,1]){
  const pivot=new THREE.Group();pivot.position.set(side*(torsoWidth+.011),2.285,0);root.add(pivot);arms.push(pivot);
  oval(side*.036,-.168,0,.133,shortSleeves?.218:.320,.141,top,pivot);
  if(shortSleeves)oval(side*.051,-.570,.003,.090,.259,.094,skin,pivot);
  else oval(side*.051,-.620,.004,.112,.262,.104,top,pivot);
  oval(side*.054,-.827,.016,.096,.126,.087,skin,pivot);
  for(let i=0;i<4;i++)oval(side*.054+(i-1.5)*.036,-.921,.059,.022,.074,.029,skin,pivot);
  pivot.rotation.z=side*-.11;
 }
 const legs=[];
 for(const side of [-1,1]){
  const pivot=new THREE.Group();pivot.position.set(side*.174,1.485,0);root.add(pivot);legs.push(pivot);
  const shortPants=state.bottom==="shorts"||state.bottom==="skirt"||topStyle==="dress";
  oval(0,-.280,0,.167,.350,.173,shortPants?pant:pant,pivot);
  if(shortPants){oval(0,-.749,.013,.115,.331,.122,skin,pivot)}
  else oval(0,-.860,.010,.133,.313,.137,pant,pivot);
  if(state.shoes==="boots")oval(0,-1.219,.010,.145,.250,.145,shoes,pivot);
  oval(0,-1.308,.135,.163,.113,.261,shoes,pivot);
  if(state.shoes==="sneakers")oval(0,-1.399,.150,.171,.025,.265,trim,pivot);
 }
 root.userData.cmdCivilian=true;root.userData.cmdRig={head,arms,legs};
 return root;
}

function releaseCivilian(group){
 if(!group?.userData?.cmdCivilian)return;
 group.traverse(node=>{if(!node.isMesh)return;node.geometry?.dispose();const materials=Array.isArray(node.material)?node.material:[node.material];materials.forEach(mat=>mat?.dispose())});
}
function animateCivilian(frame,now){
 const rig=frame.person?.userData?.cmdRig;if(!rig)return;
 const t=now*.0033,pose=frame.currentPose||"stand";
 const stride=pose==="run"?.75:pose==="walk"?.43:pose==="dance"?.35:0;
 rig.legs.forEach((leg,i)=>leg.rotation.x=stride*Math.sin(t*(pose==="run"?3.3:1.8)+i*Math.PI));
 rig.arms.forEach((arm,i)=>{
  arm.rotation.x=-stride*.7*Math.sin(t*(pose==="run"?3.3:1.8)+i*Math.PI);
  arm.rotation.z=(i===0?-.13:.13);
 });
 if(pose==="wave"||pose==="peace"){rig.arms[1].rotation.z=2.48+Math.sin(t*2)*.14;rig.arms[1].rotation.x=-.25}
 if(pose==="crossed"){rig.arms[0].rotation.z=-1.13;rig.arms[1].rotation.z=1.13;rig.arms[0].rotation.x=-.55;rig.arms[1].rotation.x=-.55}
 if(pose==="dance"){rig.arms[0].rotation.z=-1.1+Math.sin(t*1.8)*.3;rig.arms[1].rotation.z=1.1-Math.sin(t*1.8)*.3}
 rig.head.rotation.y=Math.sin(t*.3)*.045;
}

function createWorldMiniature(kind,type){
 if(!kind||kind==="none")return null;
 const root=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color:type==="home"?0xcab7a0:0x9365d0,roughness:.65}),glass=new THREE.MeshStandardMaterial({color:0x85b4cc,roughness:.26}),dark=new THREE.MeshStandardMaterial({color:0x292532,roughness:.9}),roof=new THREE.MeshStandardMaterial({color:0x5c4967,roughness:.76});
 const add=(geo,mat,x,y,z)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);root.add(mesh);return mesh};
 if(type==="home"){
  const high=["apartment","castle","villa"].includes(kind)?1.65:1;
  add(new THREE.BoxGeometry(1,high,.85),paint,0,high/2,0);
  if(["cottage","house","cabin","beach","snow","tree"].includes(kind)){const m=add(new THREE.ConeGeometry(.81,.5,4),roof,0,high+.25,0);m.rotation.y=Math.PI/4}
  else add(new THREE.BoxGeometry(1.11,.14,.95),roof,0,high+.07,0);
  add(new THREE.BoxGeometry(.24,.5,.02),dark,0,.25,.43);
  for(const x of [-.34,.34])for(let y=.61;y<high;y+=.45)add(new THREE.BoxGeometry(.22,.23,.02),glass,x,y,.44);
  if(kind==="tree")root.position.y=.4;
  root.scale.setScalar(.5);root.position.x=-1.13;root.position.z=-1;
 }else{
  const tiny=["motorcycle","scooter","bike","kart"].includes(kind);
  if(kind==="rocket"){
   add(new THREE.CylinderGeometry(.25,.25,1.2,18),paint,0,.7,0);
   add(new THREE.ConeGeometry(.26,.4,18),roof,0,1.48,0);
  }else if(kind==="plane"){
   add(new THREE.CapsuleGeometry(.23,.6,6,12),paint,0,.6,0).rotation.x=Math.PI/2;
   add(new THREE.BoxGeometry(1.7,.08,.26),roof,0,.67,0);
  }else if(kind==="boat"){
   const hull=add(new THREE.SphereGeometry(.7,20,12),paint,0,.35,0);hull.scale.set(.6,.3,1.25);
   add(new THREE.BoxGeometry(.5,.35,.48),glass,0,.64,0);
  }else{
   add(new THREE.BoxGeometry(tiny?1.05:1.58,tiny?.25:.37,tiny?.45:.83),paint,0,.51,0);
   if(!tiny)add(new THREE.BoxGeometry(.9,.40,.74),glass,0,.89,0);
   for(const x of (tiny?[-.44,.44]:[-.56,.56]))for(const z of [-.39,.39]){
    const w=add(new THREE.CylinderGeometry(tiny?.17:.23,tiny?.17:.23,.15,16),dark,x,.23,z);w.rotation.z=Math.PI/2;
   }
  }
  root.scale.setScalar(.4);root.position.set(1.1,.01,.2);
 }
 return root;
}
function updateWorld(frame,state){
 const key=String(state.vehicle||"none")+":"+String(state.home||"none");
 if(frame.worldKey===key)return;
 if(frame.worldGroup)frame.base.remove(frame.worldGroup);
 const props=new THREE.Group(),car=createWorldMiniature(state.vehicle,"vehicle"),house=createWorldMiniature(state.home,"home");
 if(car)props.add(car);if(house)props.add(house);
 frame.base.add(props);frame.worldGroup=props;frame.worldKey=key;
}
function makeProceduralPet(kind){
 const root=new THREE.Group(),shade=kind==="wolf"?0x8996a8:kind==="fox"?0xd28c55:kind==="rabbit"?0xe6dddf:kind==="cat"?0xb2a4a9:0xb8916b;
 const fur=new THREE.MeshStandardMaterial({color:shade,roughness:.9}),eyes=new THREE.MeshStandardMaterial({color:0x282632});
 const ball=(x,y,z,a,b,c,m=fur)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),m);o.position.set(x,y,z);o.scale.set(a,b,c);root.add(o);return o};
 ball(0,.48,0,.28,.32,.4);ball(0,.87,.31,.26,.26,.25);
 for(const x of [-.11,.11]){ball(x,.94,.54,.027,.026,.017,eyes);ball(x,.19,.29,.09,.18,.11);ball(x,.19,-.21,.09,.18,.11)}
 ball(0,.82,.56,.04,.037,.023,eyes);
 for(const x of [-.18,.18])ball(x,kind==="rabbit"?1.19:1.075,.24,.073,kind==="rabbit"?.28:.15,.082);
 return root;
}
function setPerson(frame,state){
 const id=state.avatarModel==="custom"?"customAvatar":"civilian";
 if(frame.modelKey===id&&frame.person){frame.wrapper.classList.add("cmd-real-3d-ready");return}
 const token=++frame.token;
 const install=(cloned,animations=[])=>{
  if(frame.token!==token)return;
  if(frame.person){frame.base.remove(frame.person);releaseCivilian(frame.person)}
  frame.base.add(cloned);frame.person=cloned;frame.modelKey=id;
  frame.mixers=[];if(frame.petMixer)frame.mixers.push(frame.petMixer);
  frame.lookKey="";frame.poseKey="";frame.sourceAnimations=animations;
  frame.activeAnimation="";frame.personMixer=animations.length?new THREE.AnimationMixer(cloned):null;
  if(frame.personMixer){frame.mixers.push(frame.personMixer);setPose(frame,state)}
  applyAccessory(frame,state);applyWearableExtras(frame,state);frame.wrapper.classList.add("cmd-real-3d-ready");setNotice(frame,"");
 };
 if(id==="civilian"){install(makeCivilian(state));return}
 setNotice(frame,"Chargement du personnage 3D…");
 loadGLB(modelUrls[id]).then(data=>{if(frame.token!==token)return;const cloned=cloneSkinned(data.scene);normalize(cloned,3.15,-.1,0);install(cloned,data.animations||[])}).catch(e=>{console.warn("[CMD 3D avatar]",e);setNotice(frame,"Impossible de charger le personnage personnalisé.")});
}
async function setPet(frame,state){
 const knownPets={fox:"fox",cat:"cat",horse:"horse",bird:"parrot",duck:"duck",flamingo:"flamingo",stork:"stork"};
 const id=state.pet==="none"?null:(knownPets[state.pet]||"procedural:"+state.pet);
 if(!id){
  if(frame.pet){frame.base.remove(frame.pet);frame.pet=null}if(frame.petMixer){frame.mixers=frame.mixers.filter(x=>x!==frame.petMixer);frame.petMixer=null}frame.petKey="";frame.petToken++;
  frame.wrapper.dataset.pet3d="off";return;
 }
 if(frame.petKey===id&&frame.pet)return;
 const ticket=++frame.petToken;
 try{
  const data=id.startsWith("procedural:")?{scene:makeProceduralPet(state.pet),animations:[]}:await loadGLB(modelUrls[id]);if(frame.petToken!==ticket)return;
  if(frame.pet){frame.base.remove(frame.pet);frame.pet=null}
  if(frame.petMixer){frame.mixers=frame.mixers.filter(x=>x!==frame.petMixer);frame.petMixer=null}
  const cloned=cloneSkinned(data.scene);normalize(cloned,.84,1.18,.26);cloned.rotation.y=-.35;
  frame.base.add(cloned);frame.pet=cloned;frame.petKey=id;frame.wrapper.dataset.pet3d="on";
  if(data.animations?.length){
   const mixer=new THREE.AnimationMixer(cloned);const clip=data.animations.find(x=>/survey|idle/i.test(x.name))||data.animations[0];
   mixer.clipAction(clip).play();frame.petMixer=mixer;frame.mixers.push(mixer);
  }
 }catch(e){console.warn("[CMD 3D pet]",e);if(frame.petToken!==ticket)return;const pet=makeProceduralPet(state.pet);normalize(pet,.84,1.18,.26);if(frame.pet)frame.base.remove(frame.pet);frame.base.add(pet);frame.pet=pet;frame.petKey=id;frame.wrapper.dataset.pet3d="on"}
}
function update(frame,state){
 if(!frame)return;
 if(state.avatarStyle!=="3d"){frame.wrapper.classList.remove("cmd-real-3d-ready");frame.wrapper.dataset.disabled="true";return}
 frame.wrapper.dataset.disabled="false";
 void setPerson(frame,state);
 if(frame.person){const lookKey=[state.topColor,state.top,state.bottom,state.shoes,state.gender,state.bodyType,state.skin,state.eyeColor,state.nose,state.mouth,state.hairColor,state.hair,state.beard,state.beardColor,state.faceShape,state.browStyle,state.eyeShape,state.accessory,state.piercing,state.bag].join("-");if(frame.lookKey!==lookKey){if(frame.person.userData.cmdCivilian){frame.base.remove(frame.person);releaseCivilian(frame.person);frame.person=makeCivilian(state);frame.base.add(frame.person)}else{applyOutfit(frame.person,state.topColor,state.top);applyAppearance(frame.person,state)}applyAccessory(frame,state);applyWearableExtras(frame,state);frame.lookKey=lookKey}
 if(frame.poseKey!==state.pose){setPose(frame,state);frame.poseKey=state.pose}}
 void setPet(frame,state);
 updateWorld(frame,state);
}
const avatarThumbCache=new Map();
let avatarThumbBusy=false,avatarThumbQueued=false;
async function renderAvatarCards(){
 if(avatarThumbBusy){avatarThumbQueued=true;return}
 const buttons=[...document.querySelectorAll("#cmdSceneOptions [data-avatar-preset],#cmdSceneOptions [data-groom-key]")];
 if(!buttons.length)return;
 avatarThumbBusy=true;
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:"low-power"});
  renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const state=snapshot();
  for(let i=0;i<buttons.length;i++){
   const button=buttons[i];if(!button.isConnected)continue;
   const preset=button.dataset.avatarPreset?window.cmdSphereAvatarPresets?.find(p=>p.id===button.dataset.avatarPreset):null;
   const key=button.dataset.groomKey;
   const variant=button.dataset.groomStyle;
   if(!preset&&(!key||!variant))continue;
   const appearance=preset?{...state,...preset}:{...state,[key]:variant};
   const faceOnly=!!key;
   const cacheKey=preset?"preset|"+preset.id:"groom|"+key+"|"+variant+"|"+[state.gender,state.skin,state.hairColor,state.beard,state.beardColor,state.hair,state.faceShape,state.browStyle,state.eyeShape,state.mouth,state.nose].join("|");
   let picture=avatarThumbCache.get(cacheKey);
   if(!picture){
    const w=faceOnly?138:176,h=faceOnly?150:218;
    renderer.setSize(w,h,false);
    const scene=new THREE.Scene(),figure=makeCivilian(appearance);
    scene.add(figure);scene.add(new THREE.HemisphereLight(0xf8efff,0x655073,2.8));
    const keyLight=new THREE.DirectionalLight(0xffe7d8,3.2);keyLight.position.set(-3,6,5);scene.add(keyLight);
    const rim=new THREE.DirectionalLight(0xcbb1ff,2.2);rim.position.set(2,4,-3);scene.add(rim);
    const camera=new THREE.PerspectiveCamera(faceOnly?36:31,w/h,.1,25);
    if(faceOnly){camera.position.set(0,2.66,1.75);camera.lookAt(0,2.67,0)}
    else{camera.position.set(0,1.69,6.45);camera.lookAt(0,1.57,0)}
    renderer.render(scene,camera);
    picture=renderer.domElement.toDataURL("image/png");
    if(avatarThumbCache.size>=48)avatarThumbCache.delete(avatarThumbCache.keys().next().value);
    avatarThumbCache.set(cacheKey,picture);
    figure.traverse(mesh=>{
     if(mesh.isMesh){mesh.geometry?.dispose();const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const mat of mats)mat?.dispose()}
    });
   }
   const holder=button.querySelector(faceOnly?".cmd-groom-thumb":".cmd-scene-model-photo");
   if(holder&&picture){
    const img=new Image();img.alt=faceOnly?"Aperçu 3D "+(button.getAttribute("aria-label")||""):("Avatar 3D "+preset.name);
    img.src=picture;img.loading="lazy";holder.replaceChildren(img);
   }
   // Time-slice GPU previews so the iPhone can keep scrolling and tapping.
   if(i%4===3)await new Promise(resolve=>requestAnimationFrame(resolve));
  }
 }catch(error){console.warn("[CMD Sphere portraits 3D]",error)}
 finally{
  renderer?.dispose();renderer?.forceContextLoss();avatarThumbBusy=false;
  if(avatarThumbQueued){avatarThumbQueued=false;requestAnimationFrame(renderAvatarCards)}
 }
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
