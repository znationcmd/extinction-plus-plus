import * as THREE from '/vendor/three.module.js';

// A real WebGL support with thickness; photographic ornament remains a transparent texture.
export async function createShop3D(host,{src,type,label='Décoration'}){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,40);
 camera.position.set(0,0,7.5);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor(0x0c0912,0);renderer.domElement.setAttribute('aria-label','Aperçu orientable en relief de '+label);renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;cursor:grab';
 host.append(renderer.domElement);const group=new THREE.Group();scene.add(group);
 scene.add(new THREE.HemisphereLight(0xe8d7ff,0x222434,3));
 for(const [color,power,x,y,z]of [[0xffffff,5,3,4,6],[0x9ec9ff,3,-4,1,3],[0xd8b1ff,2,1,-3,4]]){const light=new THREE.DirectionalLight(color,power);light.position.set(x,y,z);scene.add(light)}
 const material=new THREE.MeshStandardMaterial({color:0x8a7d91,metalness:.65,roughness:.25});
 let w=5,h=2.8125;
 const textures=[];
 if(type==='decoration'||type==='badge'){
  w=3.5;h=3.5;const body=new THREE.Mesh(new THREE.TorusGeometry(1.43,.07,16,128),material);group.add(body);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.12,.08,96),new THREE.MeshStandardMaterial({color:0x3a2a4e,metalness:.3,roughness:.4}));disc.rotation.x=Math.PI/2;disc.position.z=-.08;group.add(disc);
 }else if(type==='frame'){
  const outer=new THREE.Shape();outer.moveTo(-2.2,-1.17);outer.lineTo(2.2,-1.17);outer.lineTo(2.2,1.17);outer.lineTo(-2.2,1.17);outer.closePath();
  const hole=new THREE.Path();hole.moveTo(-2.1,-1.07);hole.lineTo(-2.1,1.07);hole.lineTo(2.1,1.07);hole.lineTo(2.1,-1.07);hole.closePath();outer.holes.push(hole);
  const body=new THREE.Mesh(new THREE.ExtrudeGeometry(outer,{depth:.12,steps:1,bevelEnabled:true,bevelSegments:3,bevelThickness:.025,bevelSize:.025}),material);body.position.z=-.13;group.add(body);
  const card=new THREE.Mesh(new THREE.BoxGeometry(4.12,2.08,.05),new THREE.MeshStandardMaterial({color:0x221a2d,metalness:.15,roughness:.5}));card.position.z=-.05;group.add(card);
 }else{
  const support=new THREE.Mesh(new THREE.BoxGeometry(w,h,.09),material);support.position.z=-.05;group.add(support);
 }
 let disposed=false;
 try{
  let texture=await new THREE.TextureLoader().loadAsync(src);if(disposed){texture.dispose();return}
  if(type==='badge'){const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2048;const ctx=canvas.getContext('2d');ctx.drawImage(texture.image,0,0,2048,2048);ctx.font='bold 200px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e9dcff';ctx.shadowColor='#000';ctx.shadowBlur=12;ctx.fillText(label.toUpperCase(),1024,1024,1000);const combined=new THREE.CanvasTexture(canvas);texture.dispose();texture=combined;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);textures.push(texture);
  const photo=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.015,side:THREE.DoubleSide,toneMapped:false,depthWrite:false}));photo.position.z=.035;group.add(photo);
 }catch(error){renderer.dispose();renderer.domElement.remove();throw Error('Le visuel 3D ne peut pas être chargé.')}
 let drag=null,animation=0,motion=window.cmdPhotoMotionEnabled?.()??!matchMedia('(prefers-reduced-motion: reduce)').matches,lastTime=0;
 const draw=()=>{if(!disposed)renderer.render(scene,camera)};
 const resize=()=>{if(disposed)return;const r=host.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);camera.updateProjectionMatrix();draw()};
 const observer=new ResizeObserver(resize);observer.observe(host);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 renderer.domElement.addEventListener('pointerdown',e=>{motion=false;cancelAnimationFrame(animation);drag={x:e.clientX,y:e.clientY,pitch:group.rotation.x,yaw:group.rotation.y};renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.style.cursor='grabbing'});
 renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;group.rotation.y=clamp(drag.yaw+(e.clientX-drag.x)*.004,-.55,.55);group.rotation.x=clamp(drag.pitch+(e.clientY-drag.y)*.004,-.4,.4);draw()});
 const release=()=>{drag=null;renderer.domElement.style.cursor='grab'};renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',release);
 const reset=()=>{group.rotation.set(0,0,0);draw()};
 renderer.domElement.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)){e.preventDefault();motion=false;cancelAnimationFrame(animation);if(e.key==='Home')reset();if(e.key==='ArrowLeft')group.rotation.y=clamp(group.rotation.y-.08,-.55,.55);if(e.key==='ArrowRight')group.rotation.y=clamp(group.rotation.y+.08,-.55,.55);if(e.key==='ArrowUp')group.rotation.x=clamp(group.rotation.x-.08,-.4,.4);if(e.key==='ArrowDown')group.rotation.x=clamp(group.rotation.x+.08,-.4,.4);draw()}});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();host.dispatchEvent(new CustomEvent('cmd:preview-context-lost'))});
 const tick=time=>{if(disposed||!motion||document.hidden)return;const delta=lastTime?Math.min((time-lastTime)/1000,.06):0;lastTime=time;group.rotation.y=.15*Math.sin(time*.00025);group.rotation.x=.035*Math.cos(time*.0002);renderer.render(scene,camera);animation=requestAnimationFrame(tick)};
 const onMotion=e=>{motion=e.detail.enabled;cancelAnimationFrame(animation);lastTime=0;if(motion)animation=requestAnimationFrame(tick);else draw()};document.addEventListener('cmd:photo-motion',onMotion);
 resize();if(motion)animation=requestAnimationFrame(tick);
 return {reset,dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(animation);document.removeEventListener('cmd:photo-motion',onMotion);observer.disconnect();group.traverse(obj=>{obj.geometry?.dispose();if(obj.material){for(const m of Array.isArray(obj.material)?obj.material:[obj.material])m.dispose()}});textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove()}};
}
