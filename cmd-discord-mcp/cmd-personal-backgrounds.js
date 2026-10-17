/* CMD Sphere — unified personal wallpapers in the premium panel (photo 2).
   Same settings in installed PWA and web: global, or server. No channel-only scope. */
(()=>{"use strict";
if(window.__cmdUnifiedWallpapers)return;window.__cmdUnifiedWallpapers=true;
const PRESETS={
 aurora:["#bd65ff","#26103c","radial-gradient(ellipse at 15% 15%,#bd65ff88,transparent 45%),radial-gradient(ellipse at 75% 65%,#6d28d988,transparent 55%),linear-gradient(130deg,#070510,#26103c,#0a0820)"],
 violet:["#7117bd","#1d123d","radial-gradient(circle at 25% 20%,#7e22ce77,transparent 50%),linear-gradient(145deg,#160e35,#271345,#080e26)"],
 ocean:["#06b6d4","#102b53","radial-gradient(circle at 70% 10%,#06b6d477,transparent 55%),linear-gradient(145deg,#051d32,#102b53,#0d101f)"],
 forest:["#22c55e","#123c2b","radial-gradient(circle at 30% 35%,#22c55e55,transparent 55%),linear-gradient(145deg,#081d1b,#123c2b,#0d101f)"],
 sunset:["#fb7185","#522545","radial-gradient(circle at 60% 25%,#fb718577,transparent 55%),linear-gradient(145deg,#40123c,#522545,#14102b)"],
 midnight:["#818cf8","#090d25","radial-gradient(circle at 80% 15%,#818cf855,transparent 55%),linear-gradient(145deg,#090d25,#1e1b4b,#030712)"],
 rose:["#f472b6","#542b63","radial-gradient(circle at 20% 10%,#f472b677,transparent 55%),linear-gradient(145deg,#321333,#542b63,#171127)"]
};
const GALLERY={
 "prairie-fleurie":"Prairie fleurie",
 "fourrure-sauvage":"Fourrure sauvage",
 "coeur-obsidienne":"Cœur d’obsidienne",
 "emeraudes":"Émeraudes",
 "nebuleuse-violette":"Nébuleuse violette",
 "ville-neon":"Ville néon",
 "diamant":"Diamant",
 "portail-violet":"Portail violet",
 "voie-lactee":"Voie lactée",
 "navire-fantome":"Navire fantôme"
};
const validGallery=v=>typeof v==="string"&&v.startsWith("gallery:")&&Object.prototype.hasOwnProperty.call(GALLERY,v.slice(8));
const validChoice=v=>validPreset(v)||validGallery(v);
const wallpaperUrl=slug=>"/cmd-wallpapers/"+slug+".webp";
const $=s=>document.querySelector(s);
const sid=()=>{
 let id="";try{if(typeof S!=="undefined"&&S?.nativeGuild?.id)id=String(S.nativeGuild.id)}catch{}
 if(!id)try{if(typeof CHAT!=="undefined"&&CHAT?.guildId)id=String(CHAT.guildId)}catch{}
 if(!id)id=new URLSearchParams(location.search).get("guildId")||"";
 return /^[a-zA-Z0-9_-]{1,100}$/.test(id)?id:"";
};
const scope=()=>sid()?"server:"+sid():"global";
const localKey=k=>"cmd-personal-wallpaper:"+k;
const endpoint=k=>"/api/cmd/personal-wallpaper?scope="+encodeURIComponent(k);
const validPreset=v=>typeof v==="string"&&/^preset:(aurora|violet|ocean|forest|sunset|midnight|rose)$/.test(v);
let db;
function database(){
 if(!db)db=new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error("Stockage non disponible"));return}
  const req=indexedDB.open("cmd-personal-scenes",1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("backgrounds"))req.result.createObjectStore("backgrounds")};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 return db;
}
async function disk(action,key,value){
 const db=await database();return new Promise((resolve,reject)=>{
  const transaction=db.transaction("backgrounds",action==="get"?"readonly":"readwrite");
  const store=transaction.objectStore("backgrounds");
  const req=action==="put"?store.put(value,key):action==="delete"?store.delete(key):store.get(key);
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function fetchAccount(key){
 const r=await fetch(endpoint(key),{credentials:"same-origin",cache:"no-store"});
 if(!r.ok)throw Error("Fond distant indisponible");
 const data=await r.json(),value=data?.image;
 if(validChoice(value))return value;
 if(typeof value==="string"&&value.startsWith("data:image/webp;base64,")){
  return await(await fetch(value)).blob();
 }
 return null;
}
async function saveAccount(key,value){
 let image=value;
 if(value instanceof Blob)image=await new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(value);
 });
 const r=await fetch(endpoint(key),{method:"PUT",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({image})});
 if(!r.ok)throw Error("Synchronisation indisponible ("+r.status+")");
}
async function eraseAccount(key){
 const r=await fetch(endpoint(key),{method:"DELETE",credentials:"same-origin"});
 if(!r.ok)throw Error("Suppression distante indisponible");
}
const pending=Object.create(null);
async function stored(key){
 if(Object.prototype.hasOwnProperty.call(pending,key))return pending[key];
 const cloud=await fetchAccount(key).catch(()=>null);if(cloud)return cloud;
 let preset=null;try{preset=localStorage.getItem(localKey(key))}catch{}
 if(validChoice(preset))return preset;
 return await disk("get",key).catch(()=>null);
}
let last="",current=null,objectUrl="",sequence=0;const touched=new Set();
function targets(){
 // One background per visible *screen*, never on nested ancestors. This avoids
 // repeated/scaled copies and works after the iPhone chat moves into its body portal.
 const overlay=$("#channelOverlay");
 const channel=overlay?.classList.contains("on")?overlay.querySelector("#channelMessages"):null;
 const dm=$("#msgs")||$("#messages");
 const workspace=$("#workspace");
 const server=workspace?.querySelector(".cmd-server-panel")?workspace:null;
 const other=$(".cmd-app")||$(".sphere-app:not(.cmd-chat-mobile-portal)")||document.body;
 // Only paint the visible context. Inactive chat overlays are often still in
 // the DOM and must not swallow the general background applied to the app.
 return [...new Set([channel,dm,server,(!channel&&!dm&&!server)?other:null].filter(Boolean))];
}
function clear(){
 for(const el of touched){
   if(!el.isConnected)continue;
   el.classList.remove("cmd-unified-background");
   for(const prop of ["background-image","background-size","background-position","background-repeat","background-attachment","background-color"])el.style.removeProperty(prop);
 }
 touched.clear();
 if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=""}
}
function wallpaperStyle(value){
 if(validPreset(value))return {image:PRESETS[value.slice(7)][2],size:"cover",position:"center",repeat:"no-repeat"};
 if(validGallery(value)){
  const url="url("+JSON.stringify(wallpaperUrl(value.slice(8)))+")";
  return {image:"linear-gradient(#0b071a55,#0b071a55),"+url+","+url,
          size:"100% 100%,contain,cover",position:"center,center,center",
          repeat:"no-repeat,no-repeat,no-repeat"};
 }
 if(value instanceof Blob){
  if(!objectUrl)objectUrl=URL.createObjectURL(value);
  const url="url("+JSON.stringify(objectUrl)+")";
  // On portrait iPhone, preserve 100% of a landscape artwork without distortion.
  // The same photo fills the unused margins underneath the uncropped foreground.
  return {image:"linear-gradient(#0b071a55,#0b071a55),"+url+","+url,
          size:"100% 100%,contain,cover",position:"center,center,center",
          repeat:"no-repeat"};
 }
 return null;
}
function setSurface(el,style){
 for(const [key,value] of [["background-image",style.image],["background-size",style.size],
  ["background-position",style.position],["background-repeat",style.repeat],
  ["background-attachment","scroll"],["background-color","#130e22"]])
   el.style.setProperty(key,value,"important");
 el.classList.add("cmd-unified-background");
 touched.add(el);
}
let renderedStyle=null;
function render(value){
 clear();current=value;
 renderedStyle=wallpaperStyle(value);
 if(!renderedStyle)return;
 for(const el of targets())setSurface(el,renderedStyle);
}
async function paint(force=false){
 const key=scope();
 if(!force&&last===key){
  if(renderedStyle){
   const next=new Set(targets());
   for(const old of [...touched]){
    if(!next.has(old)){
      for(const prop of ["background-image","background-size","background-position","background-repeat","background-attachment","background-color"])old.style.removeProperty(prop);
      old.classList.remove("cmd-unified-background");touched.delete(old);
    }
   }
   for(const el of next)if(!touched.has(el))setSurface(el,renderedStyle);
  }
  return;
 }
 last=key;const version=++sequence;
 const own=await stored(key),fallback=key==="global"?null:await stored("global");
 if(version!==sequence||key!==scope())return;
 render(own||fallback);
}
function refresh(){last="";void paint(true)}
const css=document.createElement("style");css.id="cmdUnifiedWallpaperCSS";
css.textContent=[
 '#cmdWallpaperBackdrop{position:fixed;inset:0;z-index:12990;background:#080510ad;display:none}',
 '#cmdWallpaperBackdrop.on{display:block}',
 '#cmdWallpaperBackdrop[hidden],#cmdWallpaperPanel[hidden]{display:none!important}',
 '#cmdWallpaperPanel{position:fixed!important;bottom:max(12px,env(safe-area-inset-bottom,0px))!important;left:50%!important;right:auto!important;transform:translateX(-50%)!important;z-index:13000!important;width:min(660px,calc(100vw - 26px))!important;max-height:calc(92dvh - env(safe-area-inset-top,0px))!important;overflow:auto!important;box-sizing:border-box!important;padding:22px!important;color:#f9efff!important;border:1.5px solid #a77bd7!important;border-radius:23px!important;background:linear-gradient(145deg,#281634,#160d23)!important;box-shadow:inset 0 2px #ffffff24,0 24px 70px #000b!important}',
 '#cmdWallpaperPanel h3{font:800 clamp(21px,5vw,28px)/1.2 system-ui;margin:0 0 15px}',
 '#cmdWallpaperPanel p{color:#e2d3ed;font:15px/1.5 system-ui;margin:0 0 13px}',
 '#cmdWallpaperPanel .cmd-wallpaper-mode{width:100%;min-height:46px;padding:10px 12px;margin-bottom:14px;background:#36234c;color:#fff;border:1px solid #ab82de;border-radius:11px;font:650 15px system-ui}',
 '#cmdWallpaperPanel .cmd-wallpaper-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:13px 0 16px}',

 '#cmdWallpaperPanel .cmd-wallpaper-heading{font:800 17px/1.3 system-ui;color:#f4dcff;margin:15px 0 8px}',
 '#cmdWallpaperPanel .cmd-wallpaper-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:8px 0 16px}',
 '#cmdWallpaperPanel .cmd-wallpaper-photo{display:flex;flex-direction:column;align-items:stretch;gap:7px;background:linear-gradient(150deg,#362344,#21132f);color:#f8edff;border:1px solid #a480d6;border-radius:14px;padding:7px;min-width:0;box-shadow:inset 0 1px #fff4,0 5px 14px #0008;cursor:pointer}',
 '#cmdWallpaperPanel .cmd-wallpaper-photo img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:9px;background:#18101f}',
 '#cmdWallpaperPanel .cmd-wallpaper-photo span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:650 12px/1.4 system-ui;padding:2px 3px 5px}',
 '#cmdWallpaperPanel .cmd-wallpaper-photo:focus-visible{outline:3px solid #8adfff;outline-offset:2px}',

 '#cmdWallpaperPanel .cmd-wallpaper-preset{min-width:0;min-height:76px;padding:12px 5px;color:white;border:1px solid #c6a2dd;border-radius:15px;font:650 14px system-ui;box-shadow:inset 0 2px #ffffff66,0 5px 0 #0a0616,0 8px 16px #0008;text-shadow:0 1px 4px #000b}',
 '#cmdWallpaperPanel .cmd-wallpaper-action{display:flex;align-items:center;justify-content:center;gap:9px;min-height:48px;width:100%;margin-top:11px;padding:12px;border:1px solid #a882d0;border-radius:12px;background:linear-gradient(150deg,#473054,#24152e);color:white;font:650 14px system-ui;cursor:pointer}',
 '#cmdWallpaperPanel .cmd-wallpaper-state{display:block;margin:11px 0;color:#d3bcf0;font:12px/1.5 system-ui;overflow-wrap:anywhere}',
 '#cmdWallpaperPanel .cmd-wallpaper-file{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip-path:inset(50%)}',
 '#cmdWallpaperPanel :is(button,select,label):focus-visible{outline:3px solid #8adfff;outline-offset:2px}',
 // Keep the user's chosen image visible in the native chat, DM and server list.
 '#channelMessages.cmd-unified-background,#msgs.cmd-unified-background,#messages.cmd-unified-background,#workspace.cmd-unified-background{background-origin:border-box!important;background-clip:border-box!important}',
 '#channelMessages.cmd-unified-background{min-width:0!important;width:100%!important}',
 '#workspace.cmd-unified-background>.cmd-server-panel{background-color:transparent!important}',
 '#cmdWallpaperPanel .cmd-wallpaper-state{min-height:18px}',

 '@media(max-width:480px){#cmdWallpaperPanel{padding:16px!important}#cmdWallpaperPanel .cmd-wallpaper-grid{gap:7px}#cmdWallpaperPanel .cmd-wallpaper-preset{min-height:66px;font-size:12px}}'
].join("\n");
document.head.append(css);
const backdrop=document.createElement("div");backdrop.id="cmdWallpaperBackdrop";backdrop.hidden=true;
const panel=document.createElement("section");panel.id="cmdWallpaperPanel";panel.hidden=true;
panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-labelledby","cmdWallpaperTitle");
const title=document.createElement("h3");title.id="cmdWallpaperTitle";title.textContent="Fond de cette conversation";
const help=document.createElement("p");help.textContent="Choisis une ambiance ou une photo. Applique le fond partout dans CMD Sphere ou seulement à ce serveur. Tes réglages peuvent suivre ton compte.";
const mode=document.createElement("select");mode.className="cmd-wallpaper-mode";mode.setAttribute("aria-label","Où appliquer le fond d'écran");
mode.innerHTML='<option value="global">Fond principal (partout)</option><option value="server">Fond par serveur</option>';
const selected=()=>mode.value==="server"&&sid()?"server:"+sid():"global";
const grid=document.createElement("div");grid.className="cmd-wallpaper-grid";
const galleryHeading=document.createElement("h4");galleryHeading.className="cmd-wallpaper-heading";galleryHeading.textContent="Fonds d’écran illustrés";
const galleryGrid=document.createElement("div");galleryGrid.className="cmd-wallpaper-gallery";galleryGrid.id="cmdWallpaperGallery";
const state=document.createElement("span");state.className="cmd-wallpaper-state";state.setAttribute("role","status");
const reset=document.createElement("button");reset.type="button";reset.className="cmd-wallpaper-action";reset.textContent="Rétablir le fond par défaut";
const upload=document.createElement("label");upload.className="cmd-wallpaper-action";upload.textContent="Importer mon image";
const picker=document.createElement("input");picker.type="file";picker.accept="image/jpeg,image/png,image/webp";picker.className="cmd-wallpaper-file";upload.append(picker);
const close=document.createElement("button");close.type="button";close.className="cmd-wallpaper-action";close.textContent="Fermer";
panel.append(title,help,mode,grid,galleryHeading,galleryGrid,reset,upload,close,state);document.body.append(backdrop,panel);
for(const [name,config] of Object.entries(PRESETS)){
 const button=document.createElement("button");button.type="button";button.className="cmd-wallpaper-preset";
 button.textContent=name;button.style.backgroundImage="linear-gradient(135deg,"+config[0]+","+config[1]+")";
 button.addEventListener("click",async()=>{
  const key=selected(),value="preset:"+name;
  try{localStorage.setItem(localKey(key),value)}catch{}
  pending[key]=value;await disk("delete",key).catch(()=>{});refresh();
  try{await saveAccount(key,value);delete pending[key];refresh();state.textContent="Fond synchronisé avec ton compte"}catch{state.textContent="Fond enregistré ici, synchronisation indisponible"}
 });grid.append(button);
}
// The seven original gradients remain. These ten user-supplied images are
// added as real, privately selectable wallpaper choices on the same panel.
for(const [slug,label] of Object.entries(GALLERY)){
 const button=document.createElement("button");button.type="button";button.className="cmd-wallpaper-photo";
 button.dataset.wallpaper=slug;button.setAttribute("aria-label","Choisir le fond "+label);
 const preview=document.createElement("img");preview.src=wallpaperUrl(slug);
 preview.loading="lazy";preview.decoding="async";preview.alt="";
 const caption=document.createElement("span");caption.textContent=label;
 button.append(preview,caption);
 button.addEventListener("click",async()=>{
  const key=selected(),value="gallery:"+slug;
  try{localStorage.setItem(localKey(key),value)}catch{}
  pending[key]=value;await disk("delete",key).catch(()=>{});refresh();
  try{await saveAccount(key,value);delete pending[key];refresh();
    state.textContent="Fond « "+label+" » synchronisé avec ton compte";
  }catch{state.textContent="Fond « "+label+" » enregistré sur cet appareil ; synchronisation indisponible"}
 });
 galleryGrid.append(button);
}
function closePanel(){panel.hidden=true;backdrop.hidden=true;backdrop.classList.remove("on")}
function openPanel(){
 const option=mode.querySelector('option[value="server"]');option.disabled=!sid();mode.value=sid()?"server":"global";
 state.textContent="Choisis où appliquer le fond.";panel.hidden=false;backdrop.hidden=false;backdrop.classList.add("on");
 $("#channelToolSheet")?.classList.remove("on");$("#cmdDmToolSheet")?.classList.remove("on");
}
backdrop.addEventListener("click",closePanel);close.addEventListener("click",closePanel);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden)closePanel()});
reset.addEventListener("click",async()=>{
 const key=selected();try{localStorage.removeItem(localKey(key))}catch{}
 pending[key]=null;await disk("delete",key).catch(()=>{});refresh();
 try{await eraseAccount(key);delete pending[key];refresh();state.textContent="Fond supprimé et synchronisé"}catch{state.textContent="Fond supprimé ici ; synchronisation indisponible"}
});
picker.addEventListener("change",async()=>{
 const file=picker.files?.[0];if(!file)return;
 try{
  if(file.size>25*1024*1024)throw Error("Image trop volumineuse (maximum 25 Mo)");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Format non pris en charge");
  const image=window.createImageBitmap?await createImageBitmap(file):await new Promise((resolve,reject)=>{
   const img=new Image(),url=URL.createObjectURL(file);
   img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
   img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("Image non prise en charge"))};
   img.src=url;
  });
  const w=image.width||image.naturalWidth,h=image.height||image.naturalHeight;
  if(!w||!h||w>16000||h>16000)throw Error("Dimensions non prises en charge");
  const ratio=Math.min(1,1800/w,1800/h),canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
  const context=canvas.getContext("2d");if(!context)throw Error("Impossible de préparer l'image");
  context.drawImage(image,0,0,canvas.width,canvas.height);
  if(typeof image.close==="function")image.close();
  // Preserve the original orientation: no squashing or forced 16:9 crop.
  // Ensure account sync stays below the server's ~625 KB WebP limit.
  let blob=null;
  for(let attempt=0;attempt<9;attempt++){
    const quality=Math.max(.46,.86-attempt*.055);
    blob=await new Promise(done=>canvas.toBlob(done,"image/webp",quality));
    if(!blob)throw Error("Conversion impossible");
    if(blob.size<=600000)break;
    if(attempt%2===1){
      const w2=Math.max(1,Math.round(canvas.width*.83)),h2=Math.max(1,Math.round(canvas.height*.83));
      const tmp=document.createElement("canvas");tmp.width=w2;tmp.height=h2;
      const ctx=tmp.getContext("2d");if(!ctx)throw Error("Redimensionnement impossible");
      ctx.drawImage(canvas,0,0,w2,h2);canvas.width=w2;canvas.height=h2;
      context.drawImage(tmp,0,0);
    }
  }
  if(!blob||blob.size>600000)throw Error("Photo impossible à synchroniser sous 600 Ko");
  const key=selected();pending[key]=blob;await disk("put",key,blob).catch(()=>{});try{localStorage.removeItem(localKey(key))}catch{}
  refresh();
  try{await saveAccount(key,blob);delete pending[key];refresh();state.textContent="Photo synchronisée avec ton compte"}catch{state.textContent="Photo enregistrée ici ; synchronisation indisponible"}
 }catch(e){state.textContent="Import impossible : "+e.message}finally{picker.value=""}
});
function mount(){
 // The native + menu has exactly one launcher, #toolFiles, managed by cmd-chat-polish.js.
 const native=$("#toolFiles");
 if(native){native.dataset.cmdUnifiedBackground="1";const t=native.querySelector("span");if(t)t.textContent="Fond d’écran"}
 // Private messages have no #toolFiles; add just ONE launcher to their + menu.
 const grid=$("#cmdDmToolSheet .compose-sheet-grid");
 if(grid&&!$("#channelToolSheet")&&!grid.querySelector("[data-cmd-background-tool]")){
  const button=document.createElement("button");button.type="button";button.className="compose-tool";button.dataset.cmdBackgroundTool="1";
  button.innerHTML='<b aria-hidden="true">▧</b><span>Fond d’écran</span>';button.addEventListener("click",openPanel);grid.append(button);
 }
 // Old duplicate control is retired (its private settings remain stored).
 $("#cmdPersonalBackgroundPanel")?.remove();
 const redundant=$("#channelToolSheet [data-cmd-background-tool]");
 if(redundant)redundant.remove();
}
window.cmdPersonalBackgrounds={open:openPanel,close:closePanel,refresh,scope};
mount();refresh();
const overlay=$("#channelOverlay");
if(overlay&&window.MutationObserver){
 new MutationObserver(()=>{void paint()}).observe(overlay,{attributes:true,attributeFilter:["class"]});
}
setInterval(()=>{mount();void paint()},1800);
window.addEventListener("focus",refresh);window.addEventListener("pageshow",refresh);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
window.addEventListener("popstate",refresh);
window.addEventListener("resize",()=>{void paint()},{passive:true});
window.addEventListener("orientationchange",()=>{void paint()},{passive:true});
window.addEventListener("storage",e=>{if(e.key?.startsWith("cmd-personal-wallpaper:"))refresh()});
})();