/* CMD Sphere: role creation, 3 steps. Roles and assignments remain local to CMD Sphere. */
(function(){
"use strict";
if(window.cmdOpenRoleWizard)return;
const groups=[
 ["Générales",[["viewChannels","Voir les salons"],["manageGuild","Gérer le serveur"],["manageChannels","Gérer les salons"],["manageRoles","Gérer les rôles"],["createInstantInvite","Créer des invitations"],["manageEmojisAndStickers","Gérer les emojis"],["manageWebhooks","Gérer les webhooks"],["viewAuditLog","Voir le journal d’audit"],["administrator","Administrateur"]]],
 ["Membres",[["changeNickname","Changer de pseudo"],["manageNicknames","Gérer les pseudos"],["kickMembers","Expulser des membres"],["banMembers","Bannir des membres"],["moderateMembers","Exclure temporairement des membres"]]],
 ["Textes",[["sendMessages","Envoyer des messages"],["readHistory","Lire l’historique"],["manageMessages","Gérer les messages"],["embedLinks","Intégrer des liens"],["attachFiles","Joindre des fichiers"],["addReactions","Ajouter des réactions"],["mentionEveryone","Mentionner tout le monde"],["createPublicThreads","Créer des fils publics"],["manageThreads","Gérer les fils"]]],
 ["Vocal",[["connect","Se connecter"],["speak","Parler"],["stream","Partager sa caméra"],["muteMembers","Rendre muets des membres"],["deafenMembers","Rendre sourds des membres"],["moveMembers","Déplacer des membres"],["useSoundboard","Utiliser la table de mixage"]]]
];
const memberKeys=["viewChannels","sendMessages","readHistory","connect","speak","createInstantInvite","changeNickname","addReactions"];
const moderatorKeys=[...memberKeys,"manageMessages","kickMembers","banMembers","moderateMembers","muteMembers"];
const managerKeys=[...moderatorKeys,"manageChannels","manageRoles","manageGuild","manageWebhooks","manageEmojisAndStickers"];
const presets=[
 {name:"Esthétique",color:"#5964f3",description:"Pour le style. Idéal pour attribuer une étiquette ou une couleur aux membres.",examples:["Apparaît sur leur profil","Met leur nom en couleur"],keys:[]},
 {name:"Membre",color:"#22a15c",description:"Permissions de base données à un membre standard pour discuter.",examples:["Discuter dans des salons","Inviter des amis","Changer de pseudo"],keys:memberKeys},
 {name:"Modérateur",color:"#f2b834",description:"Personne pouvant t’aider à gérer les autres membres de ce serveur.",examples:["Supprimer des messages","Rendre muets des participants","Expulser et bannir","Exclure temporairement"],keys:moderatorKeys},
 {name:"Manager",color:"#f43f4a",description:"Membre dirigeant de confiance pouvant t’aider à construire le serveur.",examples:["Créer et supprimer des salons","Gérer les rôles","Ajouter des emojis et des applications","Permissions étendues"],keys:managerKeys}
];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const req=async(path,body)=>{
 const res=await fetch(path,{credentials:"same-origin",cache:"no-store",method:body===undefined?"GET":"POST",headers:body===undefined?{}:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 const json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||"Erreur HTTP "+res.status);return json;
};
const css=[
 "#cmd-role-wizard{position:fixed;inset:0;z-index:2147483500;overflow-y:auto;background:#19191e;color:#fff;font:16px system-ui,-apple-system,sans-serif;overscroll-behavior:contain}",
 "#cmd-role-wizard *{box-sizing:border-box}",
 "#cmd-role-wizard .rw-page{width:min(720px,100%);margin:0 auto;min-height:100dvh;padding:calc(12px + env(safe-area-inset-top,0px)) 22px calc(16px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column}",
 "#cmd-role-wizard .rw-head{display:flex;align-items:center;justify-content:space-between;padding:10px 0 28px;font-weight:800;font-size:19px}",
 "#cmd-role-wizard button{font:inherit;cursor:pointer}",
 "#cmd-role-wizard .rw-close{background:none;border:0;color:white;font-size:29px}",
 "#cmd-role-wizard h1{font-size:clamp(28px,5vw,35px);line-height:1.1;text-align:center;margin:16px 0 22px}",
 "#cmd-role-wizard .rw-desc{text-align:center;line-height:1.45;font-size:17px;color:#d4d3d9;margin:0 0 26px}",
 "#cmd-role-wizard .rw-main{flex:1;display:flex;flex-direction:column}",
 "#cmd-role-wizard .rw-field{display:grid;gap:10px;font-weight:700;margin:18px 0}",
 "#cmd-role-wizard .rw-text{width:100%;background:#232328;color:#fff;border:1px solid #51505c;border-radius:13px;padding:14px;font:16px system-ui;min-height:54px}",
 "#cmd-role-wizard .rw-color{width:90px;height:55px;background:none;border:0;cursor:pointer}",
 "#cmd-role-wizard .rw-footer{margin-top:auto;position:sticky;bottom:0;background:#19191ef0;padding-top:12px}",
 "#cmd-role-wizard .rw-mainbutton,#cmd-role-wizard .rw-skip{width:100%;border:none;border-radius:13px;min-height:56px;padding:14px;color:#fff;font-weight:780;margin:5px 0;background:#5964f3}",
 "#cmd-role-wizard .rw-skip{background:#3e467e}",
 "#cmd-role-wizard button:disabled{opacity:.45;cursor:not-allowed}",
 "#cmd-role-wizard .rw-track{height:9px;background:#34343a;margin:20px 0 10px;border-radius:15px;position:relative}",
 "#cmd-role-wizard .rw-track span{height:9px;display:block;border-radius:15px;background:var(--rw-color,#5865f2);width:var(--rw-width,0%)}",
 "#cmd-role-wizard .rw-presets-name{display:flex;justify-content:space-between;gap:2px;font-size:13px;margin:0 0 25px}",
 "#cmd-role-wizard .rw-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
 "#cmd-role-wizard .rw-card{display:flex;flex-direction:column;gap:12px;min-height:240px;text-align:left;background:#25252a;color:white;border:2px solid #383840;border-radius:18px;padding:17px}",
 "#cmd-role-wizard .rw-card.selected{border-color:var(--rw-color,#5964f3);background:#30303d}",
 "#cmd-role-wizard .rw-card strong{font-size:22px}",
 "#cmd-role-wizard .rw-card small{font-size:14px;color:#dedee6;line-height:1.45}",
 "#cmd-role-wizard .rw-card em{font-size:13px;font-style:normal;color:#42bd79}",
 "#cmd-role-wizard details{background:#24242c;padding:13px 18px;margin-top:20px;border-radius:15px}",
 "#cmd-role-wizard details summary{cursor:pointer;font-weight:700}",
 "#cmd-role-wizard .rw-check{display:flex;gap:11px;align-items:center;padding:10px 0;line-height:1.3}",
 "#cmd-role-wizard input[type=checkbox]{width:23px;height:23px;accent-color:#5964f3;flex:none}",
 "#cmd-role-wizard .rw-search{margin:12px 0 10px}",
 "#cmd-role-wizard .rw-list{background:#24242a;border-radius:16px;max-height:51dvh;min-height:170px;overflow-y:auto}",
 "#cmd-role-wizard .rw-person{display:flex;gap:14px;align-items:center;padding:12px 16px;min-height:73px;border-bottom:1px solid #ffffff12;cursor:pointer}",
 "#cmd-role-wizard .rw-person img{width:44px;height:44px;object-fit:cover;border-radius:50%}",
 "#cmd-role-wizard .rw-person .rw-avatar{width:44px;height:44px;border-radius:50%;background:#45445b;display:grid;place-items:center}",
 "#cmd-role-wizard .rw-person .rw-person-name{flex:1;min-width:0}",
 "#cmd-role-wizard .rw-person strong,#cmd-role-wizard .rw-person small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
 "#cmd-role-wizard .rw-person small{color:#b2b1bb;margin-top:4px}",
 "#cmd-role-wizard .rw-error{color:#ffc2c7;min-height:20px;font-size:14px;margin:8px 0}",
 "#cmd-role-wizard .rw-count{color:#c6c3d0;font-size:14px;margin-bottom:10px}",
 "@media(max-width:470px){#cmd-role-wizard .rw-page{padding-left:16px;padding-right:16px}#cmd-role-wizard .rw-presets{gap:8px}#cmd-role-wizard .rw-card{min-height:205px;padding:11px}#cmd-role-wizard .rw-card strong{font-size:18px}#cmd-role-wizard .rw-card small{font-size:13px}#cmd-role-wizard .rw-list{max-height:45dvh}}"
].join("\n");
window.cmdOpenRoleWizard=async function({guildId,onDone}={}){
 if(!/^[0-9a-f-]{36}$/i.test(String(guildId||"")))throw Error("Serveur CMD Sphere invalide.");
 if(document.getElementById("cmd-role-wizard"))return;
 const [guildData,memberData]=await Promise.all([req("/api/native/guild/"+encodeURIComponent(guildId)),req("/api/native/members?guildId="+encodeURIComponent(guildId))]);
 if(guildData.member?.membership_role!=="owner")throw Error("Seul le propriétaire peut créer et attribuer des rôles.");
 const members=(memberData.members||[]).filter(m=>m.membership_role!=="owner");
 const st={step:1,name:"",color:"#5964f3",preset:0,permissions:{},hosting:false,hoist:false,selected:new Set(),query:"",roleId:"",busy:false};
 if(!document.getElementById("cmd-role-wizard-style")){const style=document.createElement("style");style.id="cmd-role-wizard-style";style.textContent=css;document.head.append(style)}
 const root=document.createElement("div");root.id="cmd-role-wizard";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");document.body.append(root);
 const oldOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
 const close=()=>{root.remove();document.body.style.overflow=oldOverflow;document.removeEventListener("keydown",escapeHandler)};
 const escapeHandler=e=>{if(e.key==="Escape"&&!st.busy)close()};document.addEventListener("keydown",escapeHandler);
 const footer=(text,skip,disabled)=>'<footer class="rw-footer"><button class="rw-mainbutton" id="rwNext" '+(disabled?"disabled":"")+'>'+text+'</button>'+(skip?'<button class="rw-skip" id="rwSkip">Passer cette étape</button>':"")+'<p class="rw-error" id="rwError" role="status"></p></footer>';
 function setPreset(n){st.preset=n;st.color=presets[n].color;st.permissions=Object.fromEntries(presets[n].keys.map(k=>[k,true]))}
 function render(){
  if(!root.isConnected)return;
  const heading='<div class="rw-head"><button class="rw-close" id="rwClose" aria-label="Fermer">✕</button><span>Étape '+st.step+' sur 3</span><span style="width:29px"></span></div>';
  let content="";
  if(st.step===1){
   content='<h1>Créer un rôle</h1><p class="rw-desc">Donne un nom, une couleur et une apparence à ton nouveau rôle.</p><label class="rw-field">Nom du rôle<input id="rwName" class="rw-text" maxlength="100" placeholder="Ex. VIP, Modérateur, Équipe" value="'+esc(st.name)+'"></label><label class="rw-field">Couleur du rôle<input id="rwColor" class="rw-color" type="color" value="'+esc(st.color)+'"></label><label class="rw-check"><input type="checkbox" id="rwHoist" '+(st.hoist?"checked":"")+'> Afficher les membres séparément</label>'+footer("Suivant",false,!st.name.trim());
  }else if(st.step===2){
   content='<h1>Définir les permissions</h1><p class="rw-desc">De quels pouvoirs ce rôle devrait-il disposer ? Tu peux toujours modifier les permissions plus tard.</p><div class="rw-track" style="--rw-color:'+presets[st.preset].color+';--rw-width:'+((st.preset/3)*100)+'%"><span></span></div><div class="rw-presets-name">'+presets.map(p=>'<span>'+esc(p.name)+'</span>').join("")+'</div><div class="rw-presets">'+presets.map((p,i)=>'<button class="rw-card '+(i===st.preset?"selected":"")+'" data-preset="'+i+'" style="--rw-color:'+p.color+'"><strong>'+esc(p.name)+'</strong><small>'+esc(p.description)+'</small><small>'+p.examples.map(x=>'<div><em>✓</em> '+esc(x)+'</div>').join("")+'</small></button>').join("")+'</div><details><summary>Personnaliser les permissions</summary>'+groups.map(([title,perms])=>'<h4>'+esc(title)+'</h4>'+perms.map(([key,label])=>'<label class="rw-check"><input type="checkbox" data-role-permission="'+esc(key)+'" '+(st.permissions[key]?"checked":"")+'>'+esc(label)+'</label>').join("")).join("")+'<h4>CMD Hosting</h4><label class="rw-check"><input id="rwHosting" type="checkbox" '+(st.hosting?"checked":"")+'> Gérer le serveur CMD Hosting lié (démarrer, arrêter, redémarrer)</label></details>'+footer("Sélectionner",true,false);
  }else{
   content='<h1>Ajouter des membres</h1><p class="rw-desc">Assigne ce rôle à tes membres. Les membres peuvent avoir plusieurs rôles. Tu peux en ajouter jusqu’à 30 simultanément.</p><input id="rwSearch" class="rw-text rw-search" placeholder="⌕ Rechercher des membres" value="'+esc(st.query)+'"><div class="rw-count" id="rwCount">'+st.selected.size+' / 30 sélectionnés</div><div class="rw-list" id="rwMembers"></div>'+footer("Terminer",true,st.selected.size===0);
  }
  root.innerHTML='<div class="rw-page">'+heading+'<div class="rw-main">'+content+'</div></div>';
  root.querySelector("#rwClose").onclick=()=>{if(!st.busy)close()};
  if(st.step===1){
   const n=root.querySelector("#rwName");n.oninput=()=>{st.name=n.value;root.querySelector("#rwNext").disabled=!st.name.trim()};
   root.querySelector("#rwColor").oninput=e=>{st.color=e.target.value};
   root.querySelector("#rwHoist").onchange=e=>{st.hoist=e.target.checked};
   root.querySelector("#rwNext").onclick=()=>{st.name=n.value.trim();if(!st.name)return;st.step=2;render()};
  }else if(st.step===2){
   root.querySelectorAll("[data-preset]").forEach(b=>b.onclick=()=>{setPreset(Number(b.dataset.preset));render()});
   root.querySelectorAll("[data-role-permission]").forEach(b=>b.onchange=()=>{st.permissions[b.dataset.rolePermission]=b.checked});
   root.querySelector("#rwHosting").onchange=e=>{st.hosting=e.target.checked};
   root.querySelector("#rwNext").onclick=()=>{st.step=3;render()};
   root.querySelector("#rwSkip").onclick=()=>{st.permissions={};st.hosting=false;st.step=3;render()};
  }else{
   const search=root.querySelector("#rwSearch");
   function list(){
    const host=root.querySelector("#rwMembers");host.replaceChildren();
    let list=members.filter(m=>(String(m.display_name||"")+" "+String(m.user_id||"")).toLowerCase().includes(st.query.toLowerCase()));
    if(!list.length){const msg=document.createElement("p");msg.style.padding="18px";msg.textContent="Aucun membre trouvé.";host.append(msg);return}
    for(const m of list){
     const label=document.createElement("label");label.className="rw-person";
     const avatar=String(m.avatar||"");if(/^https:\/\//i.test(avatar)||/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(avatar)){const img=document.createElement("img");img.src=avatar;img.alt="";label.append(img)}
     else{const ico=document.createElement("span");ico.className="rw-avatar";ico.textContent="👤";label.append(ico)}
     const title=document.createElement("div");title.className="rw-person-name";const strong=document.createElement("strong");strong.textContent=m.display_name||"Membre";const small=document.createElement("small");small.textContent=m.user_id;title.append(strong,small);
     const box=document.createElement("input");box.type="checkbox";box.checked=st.selected.has(m.user_id);
     box.onchange=()=>{if(box.checked){if(st.selected.size>=30){box.checked=false;root.querySelector("#rwError").textContent="Maximum 30 membres simultanément.";return}st.selected.add(m.user_id)}else st.selected.delete(m.user_id);root.querySelector("#rwCount").textContent=st.selected.size+" / 30 sélectionnés";root.querySelector("#rwNext").disabled=st.selected.size===0};
     label.append(title,box);host.append(label)
    }
   }
   search.oninput=()=>{st.query=search.value;list()};
   root.querySelector("#rwNext").onclick=()=>void finish([...st.selected]);
   root.querySelector("#rwSkip").onclick=()=>void finish([]);
   list();
  }
 }
 async function finish(userIds){
  if(st.busy)return;
  st.busy=true;const button=root.querySelector("#rwNext"),skip=root.querySelector("#rwSkip");button.disabled=true;button.textContent="Enregistrement…";if(skip)skip.disabled=true;
  try{
   if(!st.roleId){
    const created=await req("/api/native/action",{nativeGuildId:guildId,action:"create_role",name:st.name,color:st.color,permissions:st.permissions,hoist:st.hoist,mentionable:false});
    if(!created.roleId)throw Error("Identifiant du rôle manquant.");st.roleId=created.roleId;
   }
   if(st.hosting)await req("/api/cmd-hosting/roles?guildId="+encodeURIComponent(guildId),{kind:"permission",roleId:st.roleId,enabled:true});
   if(userIds.length)await req("/api/native/roles/assign-batch",{guildId,roleId:st.roleId,userIds});
   close();if(typeof onDone==="function")await onDone();
  }catch(e){const error=root.querySelector("#rwError");if(error)error.textContent="Enregistrement incomplet : "+e.message+" Réessaie sans recréer le rôle.";button.textContent="Réessayer";button.disabled=false;if(skip)skip.disabled=false}
  finally{st.busy=false}
 }
 render();
};
})();
