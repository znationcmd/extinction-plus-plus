/* CMD Sphere — personal messages: working new-message sheet. */
(()=>{
"use strict";
if(window.__cmdMessagePolish)return;window.__cmdMessagePolish=true;
const $=q=>document.querySelector(q),button=$("#newDmBtn"),search=$("#q");
if(!button||!search)return;
const style=document.createElement("style");style.textContent="\n#cmdComposeOverlay[hidden]{display:none!important}\n#cmdComposeOverlay{position:fixed;inset:0;z-index:100080;background:#100e17de;display:flex;align-items:flex-end;justify-content:center;color:#fff;font-family:system-ui}\n#cmdComposeOverlay .cmd-compose-panel{width:min(640px,100%);height:min(87dvh,810px);display:flex;flex-direction:column;background:#242329;border-radius:22px 22px 0 0;padding:15px 17px calc(15px + env(safe-area-inset-bottom));box-shadow:0 -15px 60px #0009;min-height:0}\n#cmdComposeOverlay .cmd-compose-head{display:flex;justify-content:center;position:relative;align-items:center;min-height:45px;margin-bottom:13px}\n#cmdComposeOverlay .cmd-compose-head h2{font-size:19px;margin:0}\n#cmdComposeOverlay .cmd-compose-close{position:absolute;left:0;top:0;border:0;background:transparent;color:white;font-size:27px;width:40px;height:40px}\n#cmdComposeOverlay .cmd-compose-search{display:flex;align-items:center;border:1px solid #6676ff;border-radius:13px;min-height:50px;padding:0 12px;background:#17171c;gap:8px}\n#cmdComposeOverlay .cmd-compose-search input{flex:1;min-width:0;border:0;outline:none;background:transparent;color:white;font:16px system-ui;padding:12px 0}\n#cmdComposeOverlay .cmd-compose-actions{margin:14px 0;background:#333238;border-radius:13px;overflow:hidden;flex-shrink:0}\n#cmdComposeOverlay .cmd-compose-actions button{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:57px;padding:14px 16px;border:0;border-bottom:1px solid #ffffff17;background:none;color:white;text-align:left;font:650 15px system-ui}\n#cmdComposeOverlay .cmd-compose-actions button:last-child{border:0}\n#cmdComposeOverlay .cmd-compose-results{overflow-y:auto;min-height:0;flex:1;overscroll-behavior:contain}\n#cmdComposeOverlay .cmd-compose-results h3{font-size:13px;color:#aaa7b3;margin:8px 0}\n#cmdComposeOverlay .cmd-compose-user{width:100%;display:flex;align-items:center;gap:12px;min-height:65px;padding:9px 4px;background:transparent;border:0;border-bottom:1px solid #ffffff13;text-align:left;color:#fff}\n#cmdComposeOverlay .cmd-compose-user img,#cmdComposeOverlay .cmd-compose-fallback{width:43px;height:43px;border-radius:50%;object-fit:cover;background:#44414d;flex:0 0 43px;display:grid;place-items:center}\n#cmdComposeOverlay .cmd-compose-user strong{display:block;font:700 15px system-ui;overflow-wrap:anywhere}\n#cmdComposeOverlay .cmd-compose-user small{display:block;font:12px system-ui;color:#aaa5b4;margin-top:3px}\n#cmdComposeOverlay button{cursor:pointer}\n@media(max-width:600px){.app .side .dmTools{display:flex!important;gap:8px!important;align-items:center!important;justify-content:space-between!important}.app .side .dmTools #newDmBtn{background:#5865ed!important;border-radius:12px!important;color:#fff!important;min-width:43px!important;height:43px!important;font-size:25px!important}}\n";document.head.append(style);
const overlay=document.createElement("div");overlay.id="cmdComposeOverlay";overlay.hidden=true;overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","Nouveau message");
overlay.innerHTML='<section class="cmd-compose-panel"><header class="cmd-compose-head"><button type="button" class="cmd-compose-close" aria-label="Fermer">✕</button><h2>Nouveau message</h2></header><div class="cmd-compose-search"><label for="cmdComposeSearch">À :</label><input type="search" id="cmdComposeSearch" placeholder="Rechercher tes amis" autocomplete="off"></div><div class="cmd-compose-actions"><button type="button" id="cmdComposeGroup">👥 Nouveau groupe <span>›</span></button><button type="button" id="cmdComposeFriend">👤 Ajouter un ami <span>›</span></button></div><div class="cmd-compose-results" id="cmdComposeResults" aria-live="polite"><p>Chargement des amis…</p></div></section>';
document.body.append(overlay);
const input=$("#cmdComposeSearch"),results=$("#cmdComposeResults");
let timer=0,seq=0;
function close(){overlay.hidden=true}
function render(people,heading){
 results.replaceChildren();const title=document.createElement("h3");title.textContent=heading;results.append(title);
 if(!people.length){const empty=document.createElement("p");empty.textContent="Aucun utilisateur correspondant.";results.append(empty);return}
 for(const user of people.slice(0,65)){
  const row=document.createElement("button");row.type="button";row.className="cmd-compose-user";
  const avatar=document.createElement(user.avatar?"img":"span");
  if(user.avatar){avatar.src=user.avatar;avatar.alt="";avatar.loading="lazy"}else{avatar.className="cmd-compose-fallback";avatar.textContent="👤"}
  const labels=document.createElement("span"),name=document.createElement("strong"),sub=document.createElement("small");
  name.textContent=user.displayName||user.username||"Utilisateur";sub.textContent=user.username?"@"+user.username:"";
  labels.append(name,sub);row.append(avatar,labels);
  row.onclick=async()=>{
   if(!user.username)return;row.disabled=true;const old=name.textContent;name.textContent="Ouverture…";
   try{const response=await fetch("/api/dm/start",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({username:user.username})});
    const data=await response.json().catch(()=>({}));if(!response.ok||!data.thread?.id)throw Error(data.error||"Conversation impossible");
    location.href="/messages?open="+encodeURIComponent(data.thread.id);
   }catch(e){name.textContent=old;row.disabled=false;results.prepend(Object.assign(document.createElement("p"),{textContent:e.message||"Impossible d’ouvrir la conversation"}))}
  };results.append(row)
 }
}
async function suggest(){
 const ticket=++seq;results.textContent="Chargement des amis…";
 try{const response=await fetch("/api/friends",{credentials:"same-origin",cache:"no-store"});if(!response.ok)throw Error();const data=await response.json();if(ticket===seq)render(Array.isArray(data.friends)?data.friends:[],"Suggestions")}
 catch{if(ticket===seq)results.textContent="Amis indisponibles. Saisis un pseudo pour rechercher."}
}
async function lookup(query){
 const ticket=++seq;results.textContent="Recherche…";
 try{const response=await fetch("/api/dm/search?q="+encodeURIComponent(query),{credentials:"same-origin"});const data=await response.json();
  if(!response.ok)throw Error(data.error||"Recherche indisponible");if(ticket===seq)render(Array.isArray(data.users)?data.users:[],"Résultats")}
 catch(error){if(ticket===seq)results.textContent=error.message||"Recherche impossible"}
}
function open(){overlay.hidden=false;input.value="";void suggest();input.focus({preventScroll:true})}
button.onclick=open;overlay.querySelector(".cmd-compose-close").onclick=close;
overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
overlay.querySelector("#cmdComposeGroup").onclick=()=>{close();$("#newGroup")?.click()};
overlay.querySelector("#cmdComposeFriend").onclick=()=>{close();$("#friendsBtn")?.click()};
input.addEventListener("input",()=>{clearTimeout(timer);const q=input.value.trim();timer=setTimeout(()=>q?lookup(q):suggest(),q?220:0)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.hidden){e.preventDefault();close()}});
for(const [id,label] of [["focusSearch","Rechercher des messages"],["inboxBtn","Boîte de réception"],["friendsBtn","Gérer mes amis"],["newDmBtn","Nouveau message"]]){const el=$("#"+id);if(el){el.title=label;el.setAttribute("aria-label",label)}}
})();