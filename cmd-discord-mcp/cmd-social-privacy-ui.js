/* CMD Sphere friends privacy — users control their own settings, no auto block. */
(()=>{"use strict";
 if(window.cmdSphereSocialPrivacyReady)return;
 window.cmdSphereSocialPrivacyReady=true;
 const $=(s,root=document)=>root.querySelector(s);
 const api=async(url,init={})=>{
  const response=await fetch(url,{credentials:"same-origin",cache:"no-store",...init});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"Action indisponible.");
  return data;
 };
 const json=(method,data)=>({method,headers:{"content-type":"application/json"},body:JSON.stringify(data)});
 function add(type,cls,text,parent){
  const el=document.createElement(type);if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);if(parent)parent.append(el);return el;
 }
 async function setup(){
  const panel=$("#friendsPanel");if(!panel)return;
  if($("#cmdPrivacyTab",panel))return;
  const css=add("style","",`
  .cmd-privacy-panel{display:none;background:#16111edb;margin:10px;padding:15px;border:1px solid #a77adb70;border-radius:15px;color:#f9edff}
  .cmd-privacy-panel.on{display:block}
  .cmd-privacy-panel h3{margin:8px 0;font-size:16px}
  .cmd-privacy-panel label{display:flex;align-items:center;gap:12px;min-height:42px;margin:7px 0}
  .cmd-privacy-panel input[type=checkbox]{width:20px;height:20px;accent-color:#bc8cff}
  .cmd-privacy-panel select{background:#1c1924;border:1px solid #a886cb;color:#fff;border-radius:9px;min-height:42px;padding:8px;max-width:100%}
  .cmd-privacy-panel input[type=text]{background:#1c1924;border:1px solid #a886cb;color:#fff;border-radius:9px;min-height:42px;padding:9px;width:100%}
  .cmd-privacy-panel button,.cmd-privacy-block-action{border:1px solid #a886cb;background:#31203d;border-radius:10px;padding:8px 11px;color:#fff;min-height:38px;cursor:pointer}
  .cmd-privacy-block-action{font-size:12px;margin-left:8px}
  .cmd-privacy-blocked-user{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ffffff18}
  .cmd-privacy-panel .cmd-privacy-error{color:#ffd6e0}
  `,document.head);
  const tabs=$(".friendTabs",panel)||$(".friendsTop",panel)||panel;
  const tab=add("button","","Confidentialité",tabs);
  tab.id="cmdPrivacyTab";tab.type="button";tab.setAttribute("aria-expanded","false");
  const section=add("section","cmd-privacy-panel","",panel);section.id="cmdPrivacyPanel";
  const heading=add("h3","","Demandes d’amis",section);
  const everyone=add("label","",undefined,section);
  const allInput=add("input","",undefined,everyone);allInput.type="checkbox";allInput.id="cmdPrivacyEveryone";
  add("span","","Autoriser les demandes de tout le monde",everyone);
  const shared=add("label","",undefined,section);
  const sharedInput=add("input","",undefined,shared);sharedInput.type="checkbox";sharedInput.id="cmdPrivacyShared";
  add("span","","Autoriser les membres de mes serveurs",shared);
  const save=add("button","","Enregistrer la confidentialité",section);save.type="button";
  add("h3","","Utilisateurs bloqués",section);
  const list=add("div","",undefined,section);list.id="cmdPrivacyBlockedList";
  add("h3","","Messages privés par serveur",section);
  const guildList=add("div","",undefined,section);guildList.id="cmdDmGuildPrivacyList";
  add("p","","Chaque réglage concerne uniquement les MP provenant des membres de ce serveur.",section);
  const lookup=add("label","",undefined,section);lookup.textContent="Bloquer par identifiant CMD Sphere";
  const name=add("input","",undefined,lookup);name.type="text";name.placeholder="Identifiant du compte";name.autocomplete="off";
  const block=add("button","","Bloquer cet utilisateur",section);block.type="button";
  const notice=add("p","",undefined,section);notice.setAttribute("role","status");notice.setAttribute("aria-live","polite");
  const tell=(msg,error=false)=>{notice.textContent=msg;notice.classList.toggle("cmd-privacy-error",error)};
  async function refresh(){
   const [privacy,blocked,friends,guildPrivacy]=await Promise.all([
    api("/api/account/privacy/friend-requests"),
    api("/api/account/blocked"),api("/api/friends"),
    api("/api/account/privacy/dm-guilds")]);
   allInput.checked=privacy.allowEveryone!==false;
   sharedInput.checked=privacy.allowSharedServers!==false;
   list.replaceChildren();
   guildList.replaceChildren();
   const guilds=Array.isArray(guildPrivacy.servers)?guildPrivacy.servers:[];
   if(!guilds.length)add("p","","Aucun serveur à configurer.",guildList);
   for(const guild of guilds){
    const row=add("label","",undefined,guildList);
    add("span","",guild.name,row);
    const select=add("select","",undefined,row);
    select.setAttribute("aria-label","Confidentialité des MP : "+guild.name);
    const labels=[["inherit","Par défaut"],["allow","Autoriser"],["deny","Refuser"]];
    for(const [value,label] of labels){
     const option=add("option","",label,select);option.value=value;
    }
    select.value=labels.some(([v])=>v===guild.policy)?guild.policy:"inherit";
    select.onchange=async()=>{
     select.disabled=true;
     try{
      await api("/api/account/privacy/dm-guilds",json("PATCH",{guildId:guild.guildId,policy:select.value}));
      tell("Confidentialité des MP enregistrée pour "+guild.name+".");
     }catch(e){tell(e.message,true);await refresh()}
     finally{select.disabled=false}
    };
   }
   const users=Array.isArray(blocked.users)?blocked.users:[];
   if(!users.length)add("p","","Aucun utilisateur bloqué.",list);
   for(const person of users){
    const line=add("div","cmd-privacy-blocked-user",undefined,list);
    add("span","",person.displayName||person.username||person.userId,line);
    const b=add("button","","Débloquer",line);b.type="button";
    b.onclick=()=>change(person.userId,"unblock");
   }
   const friendByUsername=new Map((friends.friends||[]).map(u=>[String(u.username||"").toLowerCase(),u.userId]));
   for(const row of panel.querySelectorAll('.friendRow[data-profile-user]')){
    const key=String(row.dataset.profileUser||"").toLowerCase();
    const id=friendByUsername.get(key);
    if(!id||row.querySelector(".cmd-privacy-block-action"))continue;
    const b=add("button","cmd-privacy-block-action","Bloquer",row);
    b.type="button";b.setAttribute("aria-label","Bloquer "+key);
    b.onclick=()=>change(id,"block");
   }
  }
  async function change(id,action){
   if(action==="block"&&!window.confirm("Bloquer cet utilisateur ? Les messages existants seront conservés."))return;
   try{
    await api("/api/account/blocked",json("POST",{targetUserId:id,action}));
    tell(action==="block"?"Utilisateur bloqué.":"Utilisateur débloqué.");
    await refresh();
   }catch(e){tell(e.message,true)}
  }
  save.onclick=async()=>{
   save.disabled=true;
   try{
    await api("/api/account/privacy/friend-requests",json("PATCH",{allowEveryone:allInput.checked,allowSharedServers:sharedInput.checked}));
    tell("Préférences enregistrées sur ton compte.");
   }catch(e){tell(e.message,true)}
   finally{save.disabled=false}
  };
  block.onclick=async()=>{
   const key=name.value.trim().toLowerCase();
   if(!key){tell("Entre un identifiant CMD Sphere.",true);return}
   try{
    const d=await api("/api/dm/search?q="+encodeURIComponent(key));
    const user=(d.users||[]).find(item=>String(item.username||"").toLowerCase()===key);
    if(!user){tell("Identifiant introuvable.",true);return}
    await change(user.id,"block");
    name.value="";
   }catch(e){tell(e.message,true)}
  };
  tab.onclick=async()=>{
   const shown=section.classList.toggle("on");
   tab.setAttribute("aria-expanded",String(shown));
   if(!shown)return;
   tell("Chargement…");
   try{await refresh();tell("")}catch(e){tell(e.message,true)}
  };
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else void setup();
})();
