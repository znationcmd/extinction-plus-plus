/* Independent Discord / CMD Sphere app-directory UI.
 * Discord bots must have a registered CMD app and a running adapter to function on CMD.
 * Public Discord directories are navigational links, never scraped or misrepresented.
 */
(function(){
"use strict";
const mountId="cmd-dual-bot-catalogue",catalogue="/api/cmd-apps/catalog";
const groups=[
 ["all","Toutes"],["moderation","Modération"],["music","Musique"],["games","Jeux"],
 ["level","Niveaux"],["community","Communauté"],["utility","Utilitaires"],["other","Autres"]
];
const categories={
 moderation:/modérat|moderati|sécur|secur|anti.?spam|admin|automod|ban|kick/i,
 music:/musique|music|radio|playlist|audio|karaoke/i,
 games:/gaming|game|jeu|jouer|ark|dayz|steam|minecraft|quiz/i,
 level:/niveau|level|xp|rang|rank|récompens|rewards/i,
 community:/communaut|community|bienvenue|welcome|tickets?|réaction|reaction/i,
 utility:/utilit|statist|notif|alerte|rappel|remind|hosting|rss|logs?/i
};
const validDiscord=id=>/^\d{15,22}$/.test(String(id||""));
const validCmd=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||""));
const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const state={tab:"cmd",q:"",category:"all",page:1,apps:[],loaded:false,error:"",discordId:"",idResult:null,looking:false,remoteBots:[],remoteCount:0,remotePage:0,remoteLoading:false,remoteError:"",remoteQuery:""};
let remoteTimer=null,remoteController=null,remoteSerial=0;
let active=false;
function classification(app){
 const description=String(app.name||"")+" "+String(app.description||"");
 for(const [id,test] of Object.entries(categories))if(test.test(description))return id;
 return "other";
}
function appView(app,discordTab=false){
 const name=String(app.name||"Application CMD").slice(0,90),id=String(app.id||""),discord=String(app.discord_client_id||"");
 const url=validCmd(id)?"/apps/invite?client_id="+encodeURIComponent(id):"#";
 const discordUrl=validDiscord(discord)?"https://discord.com/oauth2/authorize?"+new URLSearchParams({client_id:discord,scope:"bot applications.commands",permissions:"0"}).toString():"";
 const cls=classification(app);
 return '<article class="cat-card">'+
 '<div class="cat-head"><span class="cat-avatar" aria-hidden="true">'+esc(name[0]?.toUpperCase()||"C")+'</span>'+
 '<div><div class="cat-name">'+esc(name)+'</div><small class="cat-meta">'+esc(groups.find(g=>g[0]===cls)?.[1]||"Autres")+'</small></div></div>'+
 '<span class="cat-tag '+(discordTab?"discord":"cmd")+'">'+(discordTab?"Discord lié · Version CMD enregistrée":"Application CMD Sphere")+'</span>'+
 '<p class="cat-description">'+esc(String(app.description||"Bot disponible dans le catalogue CMD Sphere.").slice(0,320))+'</p>'+
 '<div class="cat-actions">'+(validCmd(id)?'<a class="cat-btn" href="'+url+'">Inviter sur CMD Sphere</a>':"")+
 (discordUrl?'<a class="cat-btn secondary" href="'+esc(discordUrl)+'" target="_blank" rel="noopener noreferrer">Inviter sur Discord ↗</a>':"")+'</div>'+
 (discordTab?'<small class="cat-meta">La version CMD doit être adaptée et connectée par son développeur.</small>':"")+
 '</article>';
}
function filterApps(){
 const term=state.q.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr");
 const matches=state.apps.filter(a=>(state.tab==="cmd"||validDiscord(a.discord_client_id))&&
 (state.category==="all"||classification(a)===state.category)&&
 (!term||(String(a.name||"")+" "+String(a.description||"")+" "+String(a.discord_client_id||"")).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr").includes(term)));
 return matches;
}
function externalLinks(){
 const q=state.q.trim().slice(0,100);
 return '<section class="cat-panel"><h2>Découvrir les bots sur Discord</h2>'+
 '<p class="cat-sub">Pour explorer les bots Discord non enregistrés sur CMD Sphere, ouvre les catalogues publics. Ils restent sur Discord tant que leurs développeurs ne proposent pas un adaptateur CMD.</p>'+
 '<div class="cat-source-list">'+
 '<a class="cat-btn secondary" target="_blank" rel="noopener noreferrer" href="https://discord.com/application-directory">Annuaire officiel Discord ↗</a>'+
 '<a class="cat-btn secondary" target="_blank" rel="noopener noreferrer" href="https://top.gg/search'+(q?'?q='+encodeURIComponent(q):'')+'">Top.gg ↗</a>'+
 '<a class="cat-btn secondary" target="_blank" rel="noopener noreferrer" href="https://discord.bots.gg/search'+(q?'?q='+encodeURIComponent(q):'')+'">Discord Bots ↗</a></div></section>';
}
function layout(){
 const el=document.getElementById("dev-content");if(!el)return;
 active=true;state.page=1;
 el.innerHTML='<div id="'+mountId+'">'+
 '<div class="cat-heading"><div><div class="cat-meta">CMD SPHERE · DEVELOPPEUR</div><h1>Catalogue des bots</h1>'+
 '<p class="cat-sub">Deux catalogues : bots CMD Sphere et bots Discord. Les invitations CMD nécessitent une version réellement adaptée par le développeur.</p></div>'+
 '<a class="cat-btn secondary" href="/developers">Mes applications</a></div>'+
 '<div role="tablist" aria-label="Plateformes" class="cat-tabs">'+
 '<button type="button" class="cat-tab" id="cat-tab-cmd" role="tab" aria-controls="cat-list" aria-selected="true" data-cat-platform="cmd">CMD Sphere</button>'+
 '<button type="button" class="cat-tab" id="cat-tab-discord" role="tab" aria-controls="cat-list" aria-selected="false" data-cat-platform="discord">Discord</button></div>'+
 '<section class="cat-panel" aria-label="Filtres du catalogue"><div class="cat-filters">'+
 '<label>Rechercher un bot<input id="cat-search" type="search" maxlength="100" autocomplete="off" placeholder="Nom, fonction ou identifiant Discord"></label>'+
 '<label>Catégories<select id="cat-category">'+groups.map(([id,name])=>'<option value="'+id+'">'+esc(name)+'</option>').join("")+'</select></label>'+
 '<button type="button" class="cat-btn" id="cat-refresh">Actualiser</button></div>'+
 '<p class="cat-info" id="cat-summary" role="status"></p></section>'+
 '<section id="cat-discord-providers" hidden></section>'+ 
 '<section id="cat-external-results" class="cat-panel" hidden><h2>Bots Discord publics</h2><p id="cat-external-summary" class="cat-info" role="status">Chargement du catalogue Discord…</p><div id="cat-external-grid" class="cat-grid"></div><div class="cat-actions"><button type="button" class="cat-btn secondary" id="cat-external-prev" hidden>← Précédent</button><button type="button" class="cat-btn secondary" id="cat-external-next" hidden>Suivant →</button></div><small class="cat-info">Source : discord.bots.gg, annuaire tiers. Les invitations Discord et CMD sont indépendantes.</small></section>'+
 '<section id="cat-discord-lookup" class="cat-panel" hidden><h2>Rechercher un bot Discord par Client ID</h2>'+
 '<form id="cat-id-form" class="cat-filters"><label>Client ID Discord (15 à 22 chiffres)<input id="cat-discord-id" inputmode="numeric" pattern="[0-9]{15,22}" maxlength="22" required placeholder="Identifiant fourni par le développeur"></label>'+
 '<button class="cat-btn" type="submit">Rechercher la version CMD</button></form>'+
 '<div id="cat-id-result" class="cat-message" aria-live="polite" hidden></div></section>'+
 '<section aria-live="polite" id="cat-list"><div class="cat-message">Chargement du catalogue…</div></section>'+
 '<div class="cat-actions"><button class="cat-btn secondary" id="cat-prev" type="button" hidden>← Précédent</button>'+
 '<button class="cat-btn secondary" id="cat-next" type="button" hidden>Suivant →</button></div>'+
 '</div>';
 const root=document.getElementById(mountId);
 root.querySelectorAll("[data-cat-platform]").forEach(button=>button.addEventListener("click",()=>{
  state.tab=button.dataset.catPlatform;state.page=1;state.q="";state.category="all";
  root.querySelector("#cat-search").value="";root.querySelector("#cat-category").value="all";
  repaint();if(state.tab==="discord")loadDiscordBots(0);
 }));
 root.querySelector("#cat-search").addEventListener("input",e=>{state.q=e.target.value;state.page=1;repaint();clearTimeout(remoteTimer);if(state.tab==="discord")remoteTimer=setTimeout(()=>loadDiscordBots(0),550)});
 root.querySelector("#cat-category").addEventListener("change",e=>{state.category=e.target.value;state.page=1;repaint()});
 root.querySelector("#cat-refresh").addEventListener("click",()=>{refresh(true);if(state.tab==="discord")loadDiscordBots(state.remotePage)});
 root.querySelector("#cat-external-prev").addEventListener("click",()=>loadDiscordBots(Math.max(0,state.remotePage-1)));
 root.querySelector("#cat-external-next").addEventListener("click",()=>loadDiscordBots(state.remotePage+1));
 root.querySelector("#cat-prev").addEventListener("click",()=>{state.page--;repaint()});
 root.querySelector("#cat-next").addEventListener("click",()=>{state.page++;repaint()});
 root.querySelector("#cat-id-form").addEventListener("submit",lookup);
 repaint();refresh(false);
}
function repaint(){
 const root=document.getElementById(mountId);if(!root){active=false;return}
 const discord=state.tab==="discord";
 root.querySelectorAll("[data-cat-platform]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.catPlatform===state.tab)));
 root.querySelector("#cat-discord-lookup").hidden=!discord;
 root.querySelector("#cat-discord-providers").hidden=!discord;
 root.querySelector("#cat-external-results").hidden=!discord;
 if(discord)renderDiscordBots();
 if(discord)root.querySelector("#cat-discord-providers").innerHTML=externalLinks();
 const list=root.querySelector("#cat-list"),summary=root.querySelector("#cat-summary"),items=filterApps();
 const pageSize=12,totalPages=Math.max(1,Math.ceil(items.length/pageSize));
 state.page=Math.min(Math.max(1,state.page),totalPages);
 summary.textContent=state.error?state.error:state.loaded?
 (discord?items.length+" application(s) Discord ayant une version CMD Sphere enregistrée. Les autres bots Discord sont consultables via les annuaires externes.":items.length+" application(s) CMD Sphere accessibles dans le catalogue.")+
 " · Page "+state.page+"/"+totalPages+" · La recherche porte sur les applications accessibles.":"Chargement…";
 if(!state.loaded)list.innerHTML='<p class="cat-message">Chargement…</p>';
 else list.innerHTML=items.length?'<div class="cat-grid">'+items.slice((state.page-1)*pageSize,state.page*pageSize).map(a=>appView(a,discord)).join("")+'</div>':
 '<p class="cat-message">'+(discord?"Aucune version CMD liée à cette recherche Discord. Consulte l'annuaire Discord ou saisis un Client ID.":"Aucun bot CMD dans cette recherche.")+'</p>';
 root.querySelector("#cat-prev").hidden=state.page<=1;
 root.querySelector("#cat-next").hidden=state.page>=totalPages;
}
async function refresh(force){
 const root=document.getElementById(mountId);if(!root)return;
 const button=root.querySelector("#cat-refresh");button.disabled=true;
 try{
  const response=await fetch(catalogue,{credentials:"same-origin",cache:"no-store"});
  const payload=await response.json();
  if(!response.ok||!Array.isArray(payload.apps))throw Error(payload.error||"Catalogue CMD indisponible.");
  state.apps=payload.apps.filter(a=>validCmd(a.id));state.loaded=true;state.error="";
 }catch(error){state.error=error.message||"Erreur de catalogue";if(!state.loaded)state.apps=[];state.loaded=true}
 finally{if(document.getElementById(mountId)){button.disabled=false;repaint()}}
}
async function lookup(event){
 event.preventDefault();
 const root=document.getElementById(mountId),box=root?.querySelector("#cat-id-result");if(!box)return;
 const id=String(root.querySelector("#cat-discord-id").value||"").trim();
 box.hidden=false;box.replaceChildren();if(!validDiscord(id)){box.textContent="Client ID Discord invalide.";return}
 box.textContent="Recherche de l'application liée…";
 try{
  const response=await fetch(catalogue+"?discordClientId="+encodeURIComponent(id),{credentials:"same-origin",cache:"no-store"});
  const payload=await response.json();
  if(!response.ok)throw Error(payload.error||"Recherche impossible.");
  const matches=(payload.apps||[]).filter(a=>a.discord_client_id===id&&validCmd(a.id));
  if(!matches.length){
   box.textContent="Aucune version CMD Sphere enregistrée pour cet identifiant. Ce bot reste disponible uniquement sur Discord tant que son développeur ne l'a pas adapté.";
   return;
  }
  box.replaceChildren();
  const message=document.createElement("p");message.textContent=matches.length+" version(s) CMD enregistrée(s). Vérifie le développeur et les permissions avant d'inviter.";
  box.append(message);
  for(const app of matches){
   const link=document.createElement("a");link.className="cat-btn";link.href="/apps/invite?client_id="+encodeURIComponent(app.id);
   link.textContent="Inviter "+app.name+" sur CMD Sphere";box.append(link);
  }
 }catch(error){box.textContent=error.message||"Service temporairement indisponible."}
}
function addNavigation(){
 if(document.getElementById("cmd-dual-bot-catalogue-nav"))return;
 const sidebar=document.querySelector(".dev-sidebar"),home=sidebar?.querySelector('[data-dev-tab="home"]');
 if(!sidebar||!home)return;
 const btn=document.createElement("button");btn.type="button";btn.id="cmd-dual-bot-catalogue-nav";btn.className="dev-nav";
 btn.textContent="Catalogue de bots · CMD / Discord";btn.title="Catalogue CMD Sphere et recherche de bots Discord";
 home.insertAdjacentElement("afterend",btn);
 btn.addEventListener("click",layout);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addNavigation,{once:true});else addNavigation();
})();
