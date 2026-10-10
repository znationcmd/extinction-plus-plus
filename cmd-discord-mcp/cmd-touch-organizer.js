/* CMD Sphere: mobile/desktop gestures for community rail, folders and floating shortcuts.
   Server/folder changes are saved on the account through existing authenticated APIs.
   Launcher locations are stored locally on this device. No Discord permissions modified. */
(function(){
 "use strict";
 if(window.__cmdTouchOrganizer)return;window.__cmdTouchOrganizer=true;
 const URLS={folders:"/api/folders",save:"/api/folders/save",remove:"/api/folders/delete",layout:"/api/server-layout"};
 const $=q=>document.querySelector(q);
 let rail=null,gesture=null,ghost=null,hovered=null,saving=false;
 function notice(message,error){
  const box=document.createElement("div");box.className="cmd-organizer-toast";box.textContent=message;box.setAttribute("role","status");
  if(error)box.classList.add("error");document.body.append(box);setTimeout(()=>box.remove(),2600);
 }
 async function request(url,body){
  const res=await fetch(url,{method:body?"POST":"GET",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
  const out=await res.json().catch(()=>({}));if(!res.ok)throw Error(out.error||"Enregistrement indisponible");return out;
 }
 const isMessages=()=>Boolean($("#msgRailGuilds"));
 function railKey(node){
  if(!node)return "";
  if(node.dataset.folderChildKey)return node.dataset.folderChildKey;
  const key=node.dataset.layoutKey;if(key)return key;
  if(node.matches(".railSrv.folderChild")){
   const href=node.getAttribute("href")||"";
   const m=href.match(/^\/native\/([^/?#]+)/);if(m)return "native:"+decodeURIComponent(m[1]);
   const id=new URL(href,location.origin).searchParams.get("openGuild");if(id)return "discord:"+id;
  }
  return "";
 }
 function folderId(node){return node?.closest("[data-folder-id]")?.dataset.folderId||""}
 function findNode(target){
  if(!target?.closest)return null;
  const child=target.closest("[data-folder-child-key],.railSrv.folderChild");
  if(child&&rail.contains(child))return child;
  const top=target.closest("[data-layout-key]");
  if(top&&rail.contains(top))return top;
  return null;
 }
 function topItem(el){return el?.parentElement===rail?el:null}
 function childrenOf(folder){
  const root=folder.querySelector(".rail-folder-servers,.railFolderServers");
  return root?[...root.children].filter(x=>railKey(x)):[];
 }
 function visibleFolder(node){return Boolean(node?.dataset?.layoutKey?.startsWith("folder:"))}
 function clearHighlight(){
  if(hovered){hovered.classList.remove("cmd-organizer-drop");hovered=null}
 }
 function dragVisual(g){
  ghost=document.createElement("div");ghost.className="cmd-organizer-ghost";
  ghost.textContent=g.el.title||"Serveur";
  const content=g.el.querySelector("img");if(content){const im=content.cloneNode();im.removeAttribute("id");ghost.prepend(im)}
  document.body.append(ghost);
 }
 function updateGhost(e){if(ghost){ghost.style.left=e.clientX+"px";ghost.style.top=e.clientY+"px"}}
 function activate(g){
  if(gesture!==g)return;g.ready=true;
  g.el.classList.add("cmd-organizer-source");
  window.__suppressRailClick=Date.now()+1700;
  if(navigator.vibrate)try{navigator.vibrate(12)}catch{}
  dragVisual(g);updateGhost({clientX:g.x,clientY:g.y});
 }
 function cancel(reset=true){
  if(!gesture)return;
  clearTimeout(gesture.timer);
  gesture.el.classList.remove("cmd-organizer-source");
  clearHighlight();ghost?.remove();ghost=null;
  if(reset)gesture=null;
 }
 function candidate(e){
  const hit=document.elementFromPoint(e.clientX,e.clientY);
  const node=findNode(hit);
  return node===gesture?.el?null:node;
 }
 function highlight(node){if(node===hovered)return;clearHighlight();hovered=node;if(node)node.classList.add("cmd-organizer-drop")}
 function onRailDown(e){
  if(saving||gesture||e.button!==0&&!["touch","pen"].includes(e.pointerType))return;
  if(!rail||!rail.contains(e.target))return;
  const node=findNode(e.target),key=railKey(node);
  if(!node||!key)return;
  if(e.target.closest("a[href]")?.classList.contains("railAdd"))return;
  e.stopPropagation(); // The legacy server-sorter must not start a competing gesture.
  gesture={id:e.pointerId,el:node,key,from:folderId(node),x:e.clientX,y:e.clientY,ready:false,moved:false,timer:null};
  const g=gesture;g.timer=setTimeout(()=>activate(g),350);
 }
 function onRailMove(e){
  const g=gesture;if(!g||e.pointerId!==g.id)return;
  const delta=Math.hypot(e.clientX-g.x,e.clientY-g.y);
  if(!g.ready){
   if(delta>9){clearTimeout(g.timer);gesture=null}
   return;
  }
  e.preventDefault();e.stopPropagation();g.moved=g.moved||delta>8;
  updateGhost(e);
  const target=candidate(e);
  highlight(target);
  const scroll=rail.closest(".server-rail,.rail");
  if(scroll){const box=scroll.getBoundingClientRect();
   if(e.clientY<box.top+52)scroll.scrollTop-=11;
   if(e.clientY>box.bottom-52)scroll.scrollTop+=11;
  }
 }
 function layoutKeys(){
  return [...rail.children].map(x=>x.dataset.layoutKey||"").filter(Boolean);
 }
 async function saveLayout(keys){await request(URLS.layout,{itemKeys:keys})}
 async function reloadRail(){
  if(typeof window.__cmdRefreshGuildRail==="function"){await window.__cmdRefreshGuildRail();return}
  location.reload();
 }
 async function saveFolderInto(sourceKey,folder){
  const records=(await request(URLS.folders)).folders||[];
  const record=records.find(x=>String(x.id)===String(folder));if(!record)throw Error("Dossier introuvable");
  const serverKeys=[...new Set([...(record.serverKeys||[]),sourceKey])];
  if(serverKeys.length>100)throw Error("Un dossier contient au maximum 100 serveurs");
  await request(URLS.save,{id:record.id,name:record.name,color:record.color,serverKeys});
 }
 async function createFolder(sourceKey,targetKey,beforeKeys){
  const folders=(await request(URLS.folders)).folders||[];
  if(folders.some(f=>f.serverKeys?.includes(sourceKey)&&f.serverKeys?.includes(targetKey)))return;
  const result=await request(URLS.save,{name:"Nouveau dossier",color:"#8b5cf6",serverKeys:[targetKey,sourceKey]});
  const id=result.folder?.id;if(!id)throw Error("Création du dossier non confirmée");
  const next=beforeKeys.filter(x=>x!==sourceKey&&x!==targetKey);
  const where=Math.min(beforeKeys.indexOf(sourceKey),beforeKeys.indexOf(targetKey));
  next.splice(Math.max(0,where),0,"folder:"+id);
  await saveLayout(next);
 }
 async function leaveFolder(sourceKey,from,at,target){
  const folders=(await request(URLS.folders)).folders||[];
  const f=folders.find(x=>String(x.id)===String(from));if(!f)return;
  const keys=(f.serverKeys||[]).filter(x=>x!==sourceKey);
  if(keys.length)await request(URLS.save,{id:f.id,name:f.name,color:f.color,serverKeys:keys});
  else await request(URLS.remove,{id:f.id});
  const order=layoutKeys().filter(x=>x!=="folder:"+from||keys.length);
  const index=target?Math.max(0,order.indexOf(railKey(target))):order.length;
  order.splice(index,0,sourceKey);
  await saveLayout([...new Set(order)]);
 }
 async function dropAction(g,target,e){
  if(!g.moved||!target)return;
  const targetKey=railKey(target),top=topItem(target),tFolder=folderId(target);
  if(!targetKey||targetKey===g.key)return;
  const fromTop=topItem(g.el);
  const sourceFolder=g.from;
  const destFolder=tFolder||targetKey.startsWith("folder:")? (tFolder||targetKey.slice(7)) : "";
  if(destFolder&&g.key.startsWith("folder:"))return;
  if(destFolder){
    if(destFolder===sourceFolder){ // reorder inside the current folder
     const folders=(await request(URLS.folders)).folders||[];
     const f=folders.find(x=>String(x.id)===destFolder);if(!f)return;
     const keys=(f.serverKeys||[]).filter(k=>k!==g.key);
     const at=keys.indexOf(targetKey);keys.splice(at<0?keys.length:at,0,g.key);
     await request(URLS.save,{id:f.id,name:f.name,color:f.color,serverKeys:keys});
    }else await saveFolderInto(g.key,destFolder);
    await reloadRail();notice("Serveur déplacé dans le dossier");return;
  }
  if(targetKey.startsWith("folder:"))return;
  const box=target.getBoundingClientRect();
  const mid=e.clientY>box.top+box.height*.23&&e.clientY<box.bottom-box.height*.23;
  // Dropping an icon over the centre of another top-level server groups them.
  if(mid&&!g.key.startsWith("folder:")&&!sourceFolder&&top){
    await createFolder(g.key,targetKey,layoutKeys());
    await reloadRail();notice("Dossier créé");return;
  }
  if(sourceFolder){await leaveFolder(g.key,sourceFolder,e.clientY,target);await reloadRail();notice("Serveur sorti du dossier");return}
  if(fromTop&&top){
    const keys=layoutKeys().filter(x=>x!==g.key);
    const t=keys.indexOf(targetKey);if(t<0)return;
    keys.splice(t+(e.clientY>box.top+box.height/2?1:0),0,g.key);
    await saveLayout(keys);
    rail.insertBefore(g.el,e.clientY>box.top+box.height/2?top.nextSibling:top);
    notice("Ordre des serveurs enregistré");
  }
 }
 function onRailUp(e){
  const g=gesture;if(!g||g.id!==e.pointerId)return;
  clearTimeout(g.timer);
  if(!g.ready){gesture=null;return}
  e.stopPropagation();e.preventDefault();
  window.__suppressRailClick=Date.now()+1200;
  const target=candidate(e),moved=g.moved;
  cancel();
  if(!moved)return;
  saving=true;
  dropAction(g,target,e).catch(err=>notice(err.message||"Déplacement impossible",true)).finally(()=>{saving=false});
 }
 function installRail(){
  const el=$("#railGuilds")||$("#msgRailGuilds");
  if(!el||el===rail)return;
  rail=el;
  rail.addEventListener("pointerdown",onRailDown,true);
  window.addEventListener("pointermove",onRailMove,true);
  window.addEventListener("pointerup",onRailUp,true);
  window.addEventListener("pointercancel",e=>{if(gesture?.id===e.pointerId)cancel()},true);
  rail.addEventListener("click",e=>{if(Date.now()<(window.__suppressRailClick||0)){e.preventDefault();e.stopImmediatePropagation()}},true);
  notice("Maintiens un serveur pour le déplacer ou créer un dossier");
 }
 // Floating CMD AI, Studio Pub and Invite Friends; drag with a finger and keep normal taps.
 const floatSelectors=[["#cmdAiLauncher","ai"],["#cmdPromoLaunch","studio"],[".cmd-invite-floating","invite"]];
 const floatKey="cmd_sphere_floating_controls_v3";
 function readPrefs(){try{return JSON.parse(localStorage.getItem(floatKey)||"{}")}catch{return {}}}
 function setFloatPos(node,pos){
  node.style.setProperty("position","fixed","important");
  node.style.setProperty("left",Math.max(8,Math.min(innerWidth-node.offsetWidth-8,pos.x))+"px","important");
  node.style.setProperty("top",Math.max(8,Math.min(innerHeight-node.offsetHeight-8,pos.y))+"px","important");
  node.style.setProperty("right","auto","important");
  node.style.setProperty("bottom","auto","important");
  node.style.setProperty("z-index","990","important");
 }
 function installFloat(node,key){
  if(node.dataset.cmdFloatDraggable)return;
  node.dataset.cmdFloatDraggable=key;
  node.style.touchAction="none";node.title=(node.title||node.textContent.trim())+" · Appui long pour déplacer";
  const saved=readPrefs()[key];if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))setFloatPos(node,saved);
  let start=null;
  node.addEventListener("pointerdown",e=>{
   if(e.button!==0&&!["touch","pen"].includes(e.pointerType))return;
   const rect=node.getBoundingClientRect();
   start={id:e.pointerId,x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,ready:false,moved:false};
   const g=start;
   g.timer=setTimeout(()=>{if(g!==start)return;g.ready=true;node.classList.add("cmd-float-moving")},320);
  },true);
  node.addEventListener("pointermove",e=>{
   const g=start;if(!g||g.id!==e.pointerId)return;
   const distance=Math.hypot(e.clientX-g.x,e.clientY-g.y);
   if(!g.ready){if(distance>9){clearTimeout(g.timer);start=null}return}
   e.preventDefault();e.stopPropagation();
   g.moved=true;
   setFloatPos(node,{x:g.left+e.clientX-g.x,y:g.top+e.clientY-g.y});
  },true);
  const finish=e=>{
   const g=start;if(!g||e.pointerId!==g.id)return;
   clearTimeout(g.timer);start=null;node.classList.remove("cmd-float-moving");
   if(g.ready&&g.moved){
    e.preventDefault();e.stopPropagation();
    const p={x:parseFloat(node.style.left),y:parseFloat(node.style.top)};
    try{localStorage.setItem(floatKey,JSON.stringify({...readPrefs(),[key]:p}))}catch{}
    node.dataset.cmdSuppressUntil=String(Date.now()+900);
   }
  };
  node.addEventListener("pointerup",finish,true);
  node.addEventListener("pointercancel",finish,true);
  node.addEventListener("click",e=>{
   if(Date.now()<Number(node.dataset.cmdSuppressUntil||0)){e.preventDefault();e.stopImmediatePropagation()}
  },true);
 }
 function findFloaters(){
  for(const [selector,key] of floatSelectors){const node=$(selector);if(node)installFloat(node,key)}
 }
 const style=document.createElement("style");style.textContent=[
 ".cmd-organizer-toast{position:fixed;z-index:100000;bottom:calc(70px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);max-width:88vw;background:#312046;color:white;padding:11px 16px;border-radius:13px;border:1px solid #c6a6e788;box-shadow:0 5px 30px #000a;font:700 12px system-ui;text-align:center;pointer-events:none}",
 ".cmd-organizer-toast.error{background:#782b45}",
 ".cmd-organizer-ghost{position:fixed;z-index:99998;pointer-events:none;left:0;top:0;transform:translate(-50%,-50%);background:#6b4ba9e8;border:2px solid white;border-radius:18px;width:65px;height:65px;display:grid;place-items:center;overflow:hidden;box-shadow:0 12px 45px #0009;color:#fff;font:600 10px system-ui;text-align:center}",
 ".cmd-organizer-ghost img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#26233d}",
 ".cmd-organizer-source{opacity:.28!important}",
 ".cmd-organizer-drop{outline:3px solid #b6f9ef!important;outline-offset:2px;box-shadow:0 0 17px #b6f9ef77!important}",
 "#railGuilds>[data-layout-key],#msgRailGuilds>[data-layout-key],#railGuilds [data-folder-child-key],#msgRailGuilds .folderChild{touch-action:none;-webkit-user-select:none;user-select:none}",
 ".cmd-float-moving{box-shadow:0 0 0 3px #e0b6ff,0 14px 36px #000b!important;opacity:.9}"
 ].join("\n");document.head.append(style);
 let scheduled=false;
 const monitor=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;installRail();findFloaters()})};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",monitor,{once:true});else monitor();
 new MutationObserver(monitor).observe(document.documentElement,{subtree:true,childList:true});
 window.addEventListener("resize",()=>{const p=readPrefs();for(const [sel,key] of floatSelectors){const n=$(sel);if(n&&p[key])setFloatPos(n,p[key])}});
})();