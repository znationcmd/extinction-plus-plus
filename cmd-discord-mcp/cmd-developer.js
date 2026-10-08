(function(){
"use strict";
const $=x=>document.querySelector(x),esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(path,body){const r=await fetch(path,{credentials:"same-origin",cache:"no-store",method:body===undefined?"GET":"POST",headers:body===undefined?{}:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Erreur HTTP "+r.status);return d}
const status=x=>{if($("#cmd-result"))$("#cmd-result").textContent=x};
async function apps(){
 if(!$("#cmd-app-list"))return;
 try{const d=await api($("#cmd-create-app")?"/api/developer/apps":"/api/cmd-apps/catalog");
 $("#cmd-app-list").innerHTML=(d.apps||[]).map(a=>'<div class="item"><b>'+esc(a.name)+'</b><p>'+esc(a.description||"")+'</p><p><small>ID '+esc(a.id)+'</small></p><a class="button" href="/apps/choose?client_id='+encodeURIComponent(a.id)+'">Inviter le bot : Discord / CMD Sphere</a></div>').join("")||'<p>Aucune application enregistrée.</p>';
 }catch(e){status(e.message)}
}
if($("#cmd-create-app"))$("#cmd-create-app").onsubmit=async e=>{
 e.preventDefault();const d=new FormData(e.currentTarget);
 try{const r=await api("/api/developer/apps",{name:d.get("name"),description:d.get("description"),discordClientId:d.get("discordClientId")});
 $("#cmd-token").textContent=r.token;$("#cmd-token-area").hidden=false;status("Bot créé. Copie la clé API privée, elle ne sera plus montrée.");e.currentTarget.reset();apps()}catch(x){status(x.message)}
};
async function choose(){
 if(!$("#cmd-choice-native"))return;
 const q=new URLSearchParams(location.search),id=q.get("client_id")||"",did=q.get("discord_client_id")||"";
 try{
  const d=await api("/api/cmd-apps/catalog"+(id?"?clientId="+encodeURIComponent(id):"?discordClientId="+encodeURIComponent(did))),app=d.apps?.[0],discordId=did||app?.discord_client_id||"";
  $("#cmd-bot-name").textContent=app?.name||("Bot Discord "+discordId);
  if(app){$("#cmd-choice-native").hidden=false;$("#cmd-choice-native").href="/apps/invite?client_id="+encodeURIComponent(app.id)}
  else $("#cmd-choice-warning").textContent="Ce bot Discord nécessite un adaptateur CMD Sphere. Son développeur doit créer une application CMD avant de l'inviter ici.";
  if(/^\d{15,22}$/.test(discordId)){
   $("#cmd-choice-discord").hidden=false;$("#cmd-choice-discord").href="https://discord.com/oauth2/authorize?client_id="+encodeURIComponent(discordId)+"&permissions=0&scope=bot%20applications.commands";
  }
 }catch(e){status(e.message)}
}
async function invite(){
 if(!$("#cmd-confirm-install"))return;
 const id=new URLSearchParams(location.search).get("client_id")||"";
 try{
  const [a,g]=await Promise.all([api("/api/cmd-apps/catalog?clientId="+encodeURIComponent(id)),api("/api/native/guilds")]);
  const app=a.apps?.[0];if(!app)throw Error("Bot CMD Sphere introuvable.");
  $("#cmd-bot-name").textContent=app.name;$("#cmd-bot-description").textContent=app.description;
  const guilds=(g.guilds||[]).filter(g=>["owner","admin"].includes(g.membership_role));
  $("#cmd-guild").innerHTML='<option value="">Choisir un serveur</option>'+guilds.map(g=>'<option value="'+esc(g.id)+'">'+esc(g.name)+'</option>').join("");
  $("#cmd-confirm-install").onclick=async()=>{
   const guildId=$("#cmd-guild").value;if(!guildId){status("Choisis un serveur.");return}
   try{const permissions=[...document.querySelectorAll("input[type=checkbox]:checked")].map(e=>e.value);
    const d=await api("/api/cmd-apps/install",{clientId:id,guildId,permissions});
    status("Bot autorisé sur CMD Sphere : "+d.permissions.join(", ")+". Il doit être connecté à l’API CMD pour fonctionner.");
   }catch(e){status(e.message)}
  }
 }catch(e){status(e.message)}
}
apps();choose();invite();
})();