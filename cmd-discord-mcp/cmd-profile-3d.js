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
 if(!frame.person||!["glasses","sunglasses","cap","hat","crown","earrings","necklace"].includes(choice))return;
 const bounds=new THREE.Box3().setFromObject(frame.person),size=new THREE.Vector3();bounds.getSize(size);
 const headY=bounds.max.y-size.y*.115;
 const group=new THREE.Group();
 const dark=new THREE.MeshStandardMaterial({color:choice==="glasses"?0xb8d7ef:0x252633,metalness:.15,roughness:.3,transparent:true,opacity:.86});
 const frameMat=new THREE.MeshStandardMaterial({color:0x282332,metalness:.35,roughness:.4});
 if(choice==="earrings"||choice==="necklace"){
   const jewel=new THREE.MeshStandardMaterial({color:0xe1bee8,metalness:.62,roughness:.26});
   if(choice==="earrings"){
    for(const x of [-.245,.245]){const hoop=new THREE.Mesh(new THREE.TorusGeometry(.045,.013,8,16),jewel);hoop.position.set(x,headY-.18,bounds.max.z+.02);group.add(hoop)}
   }else{
    const chain=new THREE.Mesh(new THREE.TorusGeometry(.185,.012,8,28),jewel);chain.rotation.x=Math.PI/2.3;chain.position.set(0,headY-.62,bounds.max.z-.1);group.add(chain);
   }
  }else if(choice==="glasses"||choice==="sunglasses"){
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
function makeCivilian(state){
  // An original, self-contained civilian mesh: no military GLB, uploads or third-party avatar service.
  // Garments are distinct 3D meshes and are rebuilt when the outfit changes.
  const root=new THREE.Group();
  const female=state.gender==="female";
  const mat=(color,roughness=.83)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});
  const skin=mat(state.skin||"#e8ad7e",.92);
  const hair=mat(state.hairColor||"#33241e",.87);
  const top=mat(state.topColor||"#7549b9",.9);
  const trim=mat("#dfd8e5"),eye=mat(state.eyeColor||"#28222e",.58),lips=mat("#9c5e60");
  const pant=mat(state.bottom==="dark"||state.bottom==="formal"?"#262b3a":state.bottom==="cargo"?"#64705a":state.bottom==="shorts"?"#a3a9c2":"#47638c");
  const footwear=mat(state.shoes==="boots"?"#44342c":state.shoes==="formal"?"#22242d":state.shoes==="sandals"?"#c29e74":"#e7eaf0");
  const add=(g,m,x,y,z,parent=root)=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh};
  const sphere=(x,y,z,sx,sy,sz,m,parent=root)=>{const mesh=add(new THREE.SphereGeometry(1,24,16),m,x,y,z,parent);mesh.scale.set(sx,sy,sz);return mesh};
  const torsoWidth=(female?.32:.38)*(state.bodyType==="slim"?.87:state.bodyType==="athletic"?1.13:1);
  const head=sphere(0,2.69,0,.262,.34,.245,skin);
  sphere(0,2.37,0,.112,.16,.116,skin);
  for(const x of [-.104,.104]){
   sphere(x,2.725,.222,.024,.018,.011,eye);
   const brow=add(new THREE.BoxGeometry(.092,.018,.022),hair,x,2.795,.231);brow.rotation.z=x>0?-.08:.08;
  }
  sphere(0,2.628,.244,state.nose==="small"?.032:state.nose==="defined"?.057:.045,state.nose==="small"?.048:.071,.055,skin);
  sphere(0,state.mouth==="neutral"?2.529:2.518,.228,state.mouth==="soft"?.052:.073,state.mouth==="neutral"?.011:.017,.018,lips);
  for(const x of [-.255,.255])sphere(x,2.688,0,.056,.09,.055,skin);
  const hairStyle=state.hair||"short";
  if(hairStyle!=="shaved"){
   sphere(0,2.946,-.035,.272,hairStyle==="curly"?.155:.105,.256,hair);
   if(hairStyle==="bob"||hairStyle==="long"){
    for(const x of [-.236,.236])sphere(x,hairStyle==="long"?2.59:2.725,-.035,.09,hairStyle==="long"?.41:.235,.19,hair);
   }else if(hairStyle==="ponytail"){
    sphere(0,2.79,-.285,.105,.31,.1,hair);
   }else if(hairStyle==="curly"){
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;sphere(Math.sin(a)*.21,2.969,Math.cos(a)*.17,.095,.087,.095,hair)}
   }
  }else sphere(0,2.949,-.035,.253,.042,.228,hair);
  const upper=sphere(0,2.017,0,torsoWidth,.47,.224,top);
  const waist=sphere(0,1.655,0,.304,.18,.207,top);
  if(state.top==="dress"){
   const skirt=add(new THREE.CylinderGeometry(.30,.53,.81,32),top,0,1.40,0);skirt.scale.z=.77;
  }else if(state.top==="jacket"||state.top==="hoodie"||state.top==="sweater"||state.top==="coat"||state.top==="suit"){
   const open=state.top==="jacket"||state.top==="suit";
   const layer=mat(open?"#33313c":state.topColor||"#7549b9");
   for(const x of [-1,1]){
    const panel=add(new THREE.BoxGeometry(torsoWidth*.86,.77,.075),open?top:layer,x*torsoWidth*.52,2.003,.228);
    panel.rotation.z=x*.04;
   }
   if(state.top==="hoodie"||state.top==="sweater"){
    const hood=add(new THREE.TorusGeometry(.235,.075,9,24),top,0,2.388,-.065);hood.rotation.x=Math.PI*.18;
    add(new THREE.BoxGeometry(.30,.19,.055),top,0,1.79,.292);
   }else{
    for(const x of [-1,1]){
     const lapel=add(new THREE.BoxGeometry(.11,.39,.028),state.top==="suit"?trim:layer,x*.125,2.21,.28);lapel.rotation.z=x*-.36;
    }
   }
  }else if(state.top==="shirt"||state.top==="polo"){
   for(const x of [-1,1]){
    const collar=add(new THREE.BoxGeometry(.16,.10,.04),trim,x*.115,2.389,.216);collar.rotation.z=x*.4;
   }
  }else if(state.top==="sport"){
   for(const x of [-1,1])add(new THREE.BoxGeometry(.027,.54,.014),trim,x*.215,2.05,.216);
  }
  const shortSleeves=["tshirt","sport","dress","polo"].includes(state.top);
  const arms=[];
  for(const side of [-1,1]){
   const pivot=new THREE.Group();pivot.position.set(side*(torsoWidth+.055),2.29,0);root.add(pivot);arms.push(pivot);
   const sleeveLength=shortSleeves?.225:.43;
   const sleeve=add(new THREE.CylinderGeometry(.125,.12,sleeveLength,18),top,0,-sleeveLength*.46,0,pivot);
   sleeve.rotation.z=side*-.11;
   add(new THREE.CylinderGeometry(.092,.074,.61,18),skin,side*.028,-.60,0,pivot);
   sphere(side*.028,-.945,.015,.102,.105,.08,skin,pivot);
   pivot.rotation.z=side*-.10;
  }
  const legs=[];
  const skirt=state.bottom==="skirt"||state.top==="dress";
  if(state.bottom==="skirt"&&state.top!=="dress"){
   const garment=add(new THREE.CylinderGeometry(.30,.49,.55,24),pant,0,1.428,0);garment.scale.z=.8;
  }
  for(const side of [-1,1]){
   const pivot=new THREE.Group();pivot.position.set(side*.168,1.53,0);root.add(pivot);legs.push(pivot);
   const shortPants=skirt||state.bottom==="shorts";
   add(new THREE.CylinderGeometry(.158,.127,shortPants?.37:.9,18),pant,0,shortPants?-.18:-.46,0,pivot);
   if(shortPants)add(new THREE.CylinderGeometry(.125,.096,.57,18),skin,0,-.77,0,pivot);
   if(state.shoes==="boots")add(new THREE.CylinderGeometry(.13,.15,.38,16),footwear,0,-1.21,.005,pivot);
   const shoe=add(new THREE.BoxGeometry(.288,.18,.455),footwear,0,-1.34,.12,pivot);
   if(state.shoes==="sneakers")add(new THREE.BoxGeometry(.30,.04,.47),trim,0,-1.44,.12,pivot);
  }
  root.userData.cmdCivilian=true;root.userData.cmdRig={head,arms,legs};
  return root;
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
 if(frame.person){const lookKey=[state.topColor,state.top,state.bottom,state.shoes,state.gender,state.bodyType,state.skin,state.eyeColor,state.nose,state.mouth,state.hairColor,state.hair,state.accessory].join("-");if(frame.lookKey!==lookKey){if(frame.person.userData.cmdCivilian){frame.base.remove(frame.person);frame.person=makeCivilian(state);frame.base.add(frame.person)}else{applyOutfit(frame.person,state.topColor,state.top);applyAppearance(frame.person,state)}applyAccessory(frame,state);frame.lookKey=lookKey}
 if(frame.poseKey!==state.pose){setPose(frame,state);frame.poseKey=state.pose}}
 void setPet(frame,state);
 updateWorld(frame,state);
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
    const scene=new THREE.Scene(),root=makeCivilian(preset);
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
