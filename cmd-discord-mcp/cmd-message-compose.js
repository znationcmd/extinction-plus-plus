/* CMD Sphere — private-message composer for the existing native DM APIs. */
(()=>{"use strict";if(window.__cmdMessagesComposerLoaded)return;
if(!document.getElementById("newDmBtn"))return;window.__cmdMessagesComposerLoaded=true;
const $=(s,r=document)=>r.querySelector(s);
let visible=false,group=false,friends=[],results=[],chosen=new Set(),serial=0,debounce=null;
const modal=document.createElement("div");modal.className="cmd-newdm-backdrop";
modal.innerHTML='<section class="cmd-newdm-sheet" role="dialog" aria-modal="true" aria-labelledby="cmdNewDmTitle">'+
 '<header class="cmd-newdm-head"><button type="button" id="cmdNewDmClose" aria-label="Fermer">✕</button><h2 id="cmdNewDmTitle">Nouveau message</h2></header>'+
 '<div class="cmd-newdm-search"><label for="cmdNewDmSearch">À :</label><input id="cmdNewDmSearch" autocomplete="off" maxlength="80" placeholder="Rechercher tes amis"></div>'+
 '<div class="cmd-newdm-scroll"><div class="cmd-newdm-shortcuts" id="cmdNewDmShortcuts">'+
 '<button type="button" id="cmdNewDmMakeGroup"><span>👥</span>Nouveau groupe<b>›</b></button>'+
 '<button type="button" id="cmdNewDmAddFriend"><span>♙＋</span>Ajouter un ami<b>›</b></button></div>'+
 '<div class="cmd-newdm-label" id="cmdNewDmLabel">Suggestions</div><div id="cmdNewDmList"></div></div>'+
 '<div class="cmd-newdm-footer" id="cmdNewDmFooter"><input id="cmdNewDmGroupName" placeholder="Nom du groupe" maxlength="100"><button type="button" id="cmdNewDmCreateGroup">Créer</button></div>'+
 '<p class="cmd-newdm-status" id="cmdNewDmStatus" role="status" aria-live="polite"></p></section>';
document.body.append(modal);
const search=$("#cmdNewDmSearch"),list=$("#cmdNewDmList"),status=$("#cmdNewDmStatus");
const note=(s,bad=false)=>{status.textContent=s||"";status.style.color=bad?"#ffa5a5":"#d0bedc"};
const api=async(url,method="GET",body)=>{
 const r=await fetch(url,{method,cache:"no-store",credentials:"same-origin",headers:body?{"content-type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Action refusée");return j;
};
function close(){modal.classList.remove("on");visible=false;chosen.clear();search.value="";note("")}
$("#cmdNewDmClose").onclick=close;
modal.addEventListener("click",e=>{if(e.target===modal)close()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&visible)close()});
function render(rows){
 list.replaceChildren();$("#cmdNewDmLabel").textContent=search.value.trim()?"Résultats":"Suggestions · Amis";
 if(!rows.length){const p=document.createElement("p");p.style.cssText="padding:10px;color:#b6b0bd";p.textContent=search.value?"Aucun utilisateur trouvé.":"Aucun ami pour le moment. Utilise la recherche.";list.append(p);return}
 for(const item of rows){
  const username=String(item.username||"");if(!username)continue;
  const btn=document.createElement("button");btn.type="button";btn.className="cmd-newdm-person"+(chosen.has(username)?" chosen":"");
  let avatar;
  if(item.avatar&&/^(https?:|data:image\/)/i.test(item.avatar)){
   avatar=document.createElement("img");avatar.src=item.avatar;avatar.alt="";avatar.referrerPolicy="no-referrer";avatar.loading="lazy";
  }else{avatar=document.createElement("span");avatar.className="cmd-newdm-avatar";avatar.textContent=String(item.displayName||username).charAt(0).toUpperCase()}
  const labels=document.createElement("span");labels.className="cmd-newdm-person-label";
  const name=document.createElement("strong");name.textContent=item.displayName||username;
  const desc=document.createElement("small");desc.textContent="@"+username+(friends.some(f=>f.username===username)?" · Ami":"");
  labels.append(name,desc);btn.append(avatar,labels);
  if(group){const check=document.createElement("span");check.className="cmd-newdm-check";check.textContent=chosen.has(username)?"✓":"";btn.append(check)}
  btn.onclick=()=>{if(group){if(chosen.has(username))chosen.delete(username);else chosen.add(username);render(rows)}else void startMessage(username)};
  list.append(btn);
 }
}
async function startMessage(username){
 note("Ouverture de la conversation…");
 try{const out=await api("/api/dm/start","POST",{username});location.assign("/messages?open="+encodeURIComponent(out.thread.id))}
 catch(e){note(e.message,true)}
}
async function loadFriends(){
 try{const j=await api("/api/friends");friends=(j.friends||[]).filter(x=>x.username);if(visible&&!search.value)render(friends)}
 catch(e){note("Liste d'amis indisponible : "+e.message,true)}
}
async function lookup(value){
 const seq=++serial;if(!value.trim()){results=[];render(friends);return}
 try{const j=await api("/api/dm/search?q="+encodeURIComponent(value.trim()));if(seq!==serial||!visible)return;results=(j.users||[]).filter(x=>x.username);render(results)}
 catch(e){if(seq===serial)note(e.message,true)}
}
search.addEventListener("input",()=>{clearTimeout(debounce);debounce=setTimeout(()=>void lookup(search.value),180)});
function openComposer(isGroup=false){
 group=!!isGroup;visible=true;chosen.clear();search.value="";note("");modal.classList.add("on");
 $("#cmdNewDmTitle").textContent=group?"Nouveau groupe":"Nouveau message";
 $("#cmdNewDmShortcuts").hidden=group;
 $("#cmdNewDmFooter").classList.toggle("on",group);
 $("#cmdNewDmGroupName").value="";
 render(friends);void loadFriends();
 setTimeout(()=>{if(visible)search.focus({preventScroll:true})},30);
}
$("#cmdNewDmMakeGroup").onclick=()=>openComposer(true);
$("#cmdNewDmAddFriend").onclick=()=>{close();const q=document.getElementById("q");q?.focus();q?.scrollIntoView({block:"nearest"})};
$("#cmdNewDmCreateGroup").onclick=async()=>{
 if(!chosen.size){note("Sélectionne au moins un ami.",true);return}
 const button=$("#cmdNewDmCreateGroup");button.disabled=true;
 try{const result=await api("/api/groups/create","POST",{name:$("#cmdNewDmGroupName").value.trim()||"Groupe CMD",usernames:[...chosen]});location.assign("/messages?open=group:"+encodeURIComponent(result.group.id))}
 catch(e){note(e.message,true)}finally{button.disabled=false}
};
document.addEventListener("click",e=>{
 const button=e.target.closest?.("#newDmBtn,#newGroup");if(!button)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openComposer(button.id==="newGroup");
},true);
window.cmdOpenNewMessage=openComposer;
})();
