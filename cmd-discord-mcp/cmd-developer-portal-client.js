(function(){
"use strict";
const $=q=>document.querySelector(q);
const h=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const root="/api/developer/portal/apps/";
const tabs=new Set(["home","overview","installation","oauth2","bot","commands","webhooks","activities","presence","discovery","team","testing","analytics","monetization","documentation"]);
const appId=/^[a-f0-9-]{36}$/i;
let current=null,all=[],tab="home",sleep=false,lastUsed=Date.now(),idleHandle=null,loadedAt=0,commands=null,installs=null,busy=false;
const byId=id=>String(id||"");
async function api(url,body){
 const req={credentials:"same-origin",cache:"no-store"};
 if(body!==undefined){req.method="POST";req.headers={"content-type":"application/json"};req.body=JSON.stringify(body)}
 const response=await fetch(url,req);
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error)throw Error(data.error||"Erreur HTTP "+response.status);
 return data;
}
function notify(message,error=false){
 const target=$("#dev-feedback");
 if(target){target.textContent=message;target.hidden=false;target.className="dev-alert"+(error?" warn":" good");target.scrollIntoView({block:"nearest"})}
}
function active(){
 sleep=false;lastUsed=Date.now();
 $("#dev-dot")?.classList.remove("sleeping");if($("#dev-activity"))$("#dev-activity").textContent="Actif";
 clearTimeout(idleHandle);idleHandle=setTimeout(()=>standby(),5*60*1000);
}
function standby(){
 if(busy)return;
 sleep=true;$("#dev-dot")?.classList.add("sleeping");
 if($("#dev-activity"))$("#dev-activity").textContent="En veille";
 clearTimeout(idleHandle);
}
function updateURL(){
 const params=new URLSearchParams();
 if(current)params.set("app",current.id);
 if(current&&tab!=="home")params.set("tab",tab);
 history.replaceState(null,"","/developers"+(params.toString()?"?"+params.toString():""));
}
function navigation(){
 $("#dev-app-switch").innerHTML='<option value="">Mes applications</option>'+all.map(a=>'<option value="'+h(a.id)+'"'+(current?.id===a.id?" selected":"")+'>'+h(a.name)+'</option>').join("");
 document.querySelectorAll("[data-dev-tab]").forEach(b=>{
  const selected=b.dataset.devTab===tab;
  b.setAttribute("aria-current",selected?"page":"false");
  b.disabled=b.dataset.devTab!=="home"&&!current;
 });
}
function wrapper(title,desc,contents){
 return '<h1>'+h(title)+'</h1><p>'+h(desc||"")+'</p><div id="dev-feedback" class="dev-alert" hidden></div>'+contents;
}
function card(title,body){return '<section class="dev-card"><h2>'+h(title)+'</h2>'+body+'</section>'}
function link(text,url,cls){return '<a class="dev-btn '+(cls||"")+'" href="'+h(url)+'">'+h(text)+'</a>'}
function fld(label,name,value,props){
 return '<label class="dev-field">'+h(label)+'<input name="'+h(name)+'" value="'+h(value||"")+'" '+(props||"")+'></label>';
}
function area(label,name,value,props){return '<label class="dev-field">'+h(label)+'<textarea name="'+h(name)+'" '+(props||"")+'>'+h(value||"")+'</textarea></label>'}
function appIcon(app){
 const icon=app?.config?.iconUrl||"";
 return /^https:\/\//.test(icon)?'<img src="'+h(icon)+'" alt="">':h((app?.name||"C").slice(0,1).toUpperCase());
}
function home(){
 return wrapper("Mes applications","Crée des bots et des applications indépendants de Discord. Choisis ensuite une application pour accéder à tous ses réglages.",
  '<section class="dev-card"><h2>Mes applications CMD Sphere</h2><div class="dev-list">'+
  (all.map(a=>'<div class="dev-app"><div class="dev-app-icon">'+appIcon(a)+'</div><div class="dev-app-meta"><b>'+h(a.name)+'</b><small>'+h(a.description||"Application CMD Sphere")+'</small></div><button class="dev-btn" type="button" data-open-app="'+h(a.id)+'">Ouvrir</button></div>').join("")||'<p>Aucune application. Crée ton premier bot CMD Sphere ci-dessous.</p>')+
  '</div></section>'+
  card("Créer une nouvelle application",'<form id="dev-create">'+fld("Nom de l’application","name","","required minlength=\"2\" maxlength=\"80\" placeholder=\"CMD Bot ARK\"")+
  area("Description","description","","maxlength=\"500\"")+fld("ID Discord facultatif pour les invitations sur les deux plateformes","discordClientId","","inputmode=\"numeric\" pattern=\"[0-9]{15,22}\"")+
  '<button class="dev-btn primary" type="submit">Créer l’application</button></form><div id="dev-created-secret" class="dev-alert" hidden></div>')+
  card("Ce qui fonctionne déjà",'<div class="dev-grid"><div class="dev-tile"><b>Applications</b><p>Créer, modifier et inviter sur CMD Sphere.</p></div>'+
  '<div class="dev-tile"><b>Permissions</b><p>Lecture des salons, lecture et envoi de messages : accès contrôlé par serveur.</p></div>'+
  '<div class="dev-tile"><b>API indépendante</b><p>Bot connecté avec clé CMD, sans compte Discord obligatoire.</p></div></div>'));
}
function overview(){
 const c=current.config||{};
 return wrapper("Informations générales","Personnalise les informations publiques et l’identité de ton application.",
  card("Application",'<form id="dev-save-overview">'+fld("Nom","name",current.name,'required minlength="2" maxlength="80"')+
  area("Description","description",current.description,'maxlength="500"')+
  fld("Adresse de l’icône (HTTPS)","iconUrl",c.iconUrl,'inputmode="url" placeholder="https://…"')+
  fld("ID de l’application Discord (facultatif)","discordClientId",current.discord_client_id,'inputmode="numeric" pattern="[0-9]{15,22}"')+
  fld("Site d’assistance (HTTPS)","supportUrl",c.supportUrl,'inputmode="url"')+
  fld("Politique de confidentialité (HTTPS)","privacyUrl",c.privacyUrl,'inputmode="url"')+
  fld("Conditions d’utilisation (HTTPS)","termsUrl",c.termsUrl,'inputmode="url"')+
  '<button class="dev-btn primary" type="submit">Enregistrer</button></form>')+
  card("Identifiants",'<p>ID d’application CMD Sphere</p><code class="dev-code">'+h(current.id)+'</code>'+
  '<p>Création : '+h(new Date(current.created_at).toLocaleDateString("fr-FR"))+'</p>'));
}
function installation(){
 const url=location.origin+"/apps/choose?client_id="+encodeURIComponent(current.id);
 return wrapper("Installation","Configure les invitations CMD Sphere et consulte les serveurs qui ont autorisé le bot.",
  card("Lien d’invitation",'<p>Un même lien permet de choisir CMD Sphere et Discord lorsque ton application dispose également d’un identifiant Discord.</p>'+
  '<code class="dev-code">'+h(url)+'</code><div class="dev-row" style="margin-top:12px">'+
  '<button type="button" class="dev-btn primary" data-copy="'+h(url)+'">Copier le lien</button>'+link("Tester l’invitation","/apps/choose?client_id="+encodeURIComponent(current.id))+'</div>')+
  card("Permissions CMD Sphere",'<p>Le propriétaire du serveur doit approuver explicitement les permissions demandées.</p>'+
  ['view_channels|Voir les salons','read_messages|Lire les messages CMD Sphere','send_messages|Envoyer des messages'].map(v=>'<div class="dev-check">✓ '+h(v.split("|")[1])+' <small>'+h(v.split("|")[0])+'</small></div>').join(""))+
  card("Serveurs autorisés",'<div id="dev-installations">Chargement…</div>'));
}
function oauth2(){
 const redirects=Array.isArray(current.config?.redirectUris)?current.config.redirectUris.join("\n"):"";
 return wrapper("OAuth2","Autorisation CMD Sphere indépendante, avec validation des URL de retour et preuve cryptographique PKCE S256.",
  card("Autorisations opérationnelles",'<p><b>OAuth2 — Authorization Code + PKCE S256</b> : chaque membre approuve explicitement la connexion.</p>'+
    '<p>Permission disponible : <code>identify</code> (ID et pseudo CMD Sphere). L’accès aux salons ou aux messages exige une installation séparée et ses permissions.</p>'+
    '<p>Durée du code : 5 minutes. Durée du jeton : 1 heure. Les jetons de renouvellement ne sont pas encore proposés.</p>')+
  card("URL de redirection",'<form id="dev-oauth-form">'+area("Une URL exacte par ligne (HTTPS ou localhost)","redirects",redirects,'placeholder="https://exemple.fr/callback"')+
  '<button type="submit" class="dev-btn primary">Enregistrer les URL</button></form>')+
  card("Identifiants et routes",'<p>Client ID CMD Sphere</p><code class="dev-code">'+h(current.id)+'</code>'+
   '<p>URL d’autorisation</p><code class="dev-code">'+h(location.origin+'/api/cmd-oauth/authorize')+'</code>'+
   '<p>Échange de jeton</p><code class="dev-code">'+h(location.origin+'/api/cmd-oauth/token')+'</code>'+
   '<p>Profil de l’utilisateur connecté</p><code class="dev-code">'+h(location.origin+'/api/cmd-oauth/user')+'</code>'+
   '<p>Paramètres : response_type=code, scope=identify, client_id, redirect_uri, state, code_challenge, code_challenge_method=S256.</p>'));
}
function bot(){
 return wrapper("Bot","Clé API, permissions et accès de ton bot aux serveurs CMD Sphere.",
  card("Clé API du bot",'<p>La clé est secrète. Elle a été affichée lors de la création. Tu peux la régénérer, mais cela déconnecte immédiatement les instances qui utilisent l’ancienne.</p>'+
  '<button type="button" class="dev-btn danger" id="dev-rotate">Régénérer la clé</button><div id="dev-secret" hidden><p>Nouvelle clé — à copier maintenant :</p><code class="dev-code" id="dev-secret-text"></code></div>')+
  card("Droits natifs actuellement disponibles",'<div class="dev-grid">'+
   '<div class="dev-tile"><b>Voir les salons</b><p>Liste les salons autorisés.</p></div>'+
   '<div class="dev-tile"><b>Lire les messages</b><p>Messages CMD Sphere des salons autorisés.</p></div>'+
   '<div class="dev-tile"><b>Envoyer des messages</b><p>Messages natifs envoyés avec l’identité du bot.</p></div></div>'+
   '<p>Les bots Discord existants doivent adapter leur code à cette API. Les événements temps réel, les intents et toutes les permissions Discord ne sont pas encore disponibles.</p>')+
  card("API du bot",'<code class="dev-code">Authorization: Bearer &lt;CLE_SECRETE&gt;\nGET /api/cmd-bot/guilds\nGET /api/cmd-bot/channels?guildId=…\nGET /api/cmd-bot/messages?guildId=…&amp;channelId=…\nPOST /api/cmd-bot/messages</code>'));
}
function commandsView(){
 return wrapper("Commandes","Déclare les noms et descriptions des commandes de ton application.",
  '<div class="dev-alert warn">La déclaration enregistre les commandes dans CMD Sphere. Elles ne répondent pas automatiquement : leur comportement doit être codé dans ton bot.</div>'+
  card("Créer une commande",'<form id="dev-command-create">'+fld("Nom","name","","required maxlength=\"32\" pattern=\"[a-z0-9_-]+\" placeholder=\"bonjour\"")+
    fld("Description","description","","required maxlength=\"100\" placeholder=\"Envoie un message de bienvenue\"")+
    '<button class="dev-btn primary" type="submit">Enregistrer la commande</button></form>')+
  card("Commandes déclarées",'<div id="dev-command-list">Chargement…</div>'));
}
function analytics(){
 return wrapper("Statistiques","Informations vérifiables actuellement disponibles pour ton application.",
  '<div class="dev-grid"><div class="dev-tile"><b class="dev-stat">'+Number(current.installed_count||0)+'</b><p>Serveurs CMD autorisés</p></div>'+
  '<div class="dev-tile"><b class="dev-stat">'+Number(current.command_count||0)+'</b><p>Commandes déclarées</p></div></div>'+
  card("Statistiques détaillées",'<p>Les métriques de commandes exécutées, d’utilisation et de latence nécessitent une collecte d’événements qui n’est pas encore mise en place.</p>'));
}
function docs(){
 return wrapper("Documentation développeur","Utilise ton jeton privé pour appeler l’API CMD Sphere depuis ton serveur ou ton programme.",
  card("Premiers appels",'<code class="dev-code">GET '+h(location.origin)+'/api/cmd-bot/guilds\nAuthorization: Bearer TA_CLE_PRIVEE\n\nPOST '+h(location.origin)+'/api/cmd-bot/messages\nContent-Type: application/json\nAuthorization: Bearer TA_CLE_PRIVEE\n{"guildId":"…","channelId":"…","content":"Bonjour !"}</code>'+
  '<p>Le bot doit être invité sur le serveur CMD Sphere avec la permission correspondante.</p>')+
  card("Ressources",'<p>Portail CMD Sphere indépendant de Discord. L’installation est contrôlée par chaque administrateur et les données restent dans les serveurs CMD Sphere.</p>'));
}
function memberPanel(kind){
 const team=kind==="team",owner=current.developer_role==="owner";
 return wrapper(team?"Équipe":"Testeurs",team?"Gère les collaborateurs et leurs droits sur cette application.":"Les testeurs peuvent installer l’application même lorsqu’elle n’est pas publiée.",
  card(team?"Collaborateurs":"Comptes testeurs",'<div id="dev-people-list">Chargement…</div>')+
  (owner?card("Ajouter "+(team?"un collaborateur":"un testeur"),
    '<form id="dev-people-form" data-kind="'+kind+'">'+fld("Pseudo CMD Sphere","username","","required maxlength=\"80\" placeholder=\"Pseudo CMD Sphere\"")+
    (team?'<label class="dev-field">Rôle<select name="role"><option value="viewer">Lecture seule</option><option value="editor">Éditeur : paramètres et commandes</option></select></label>':'')+
    '<button class="dev-btn primary" type="submit">Ajouter</button></form>'):
    '<p>Seul le propriétaire gère ces accès.</p>'));
}
function discoveryView(){
 return wrapper("Annuaire","Publication réelle de ton application dans le catalogue de CMD Sphere.",
  card("Visibilité",'<p>'+(current.published?"Application actuellement publique.":"Application privée : réservée au propriétaire, à l’équipe et aux testeurs.")+'</p>'+
    (current.developer_role==="owner"?'<form id="dev-visibility"><label class="dev-check"><input type="checkbox" name="published" '+(current.published?"checked":"")+'> Afficher dans le catalogue CMD Sphere</label><button class="dev-btn primary" type="submit">Enregistrer</button></form>':'<p>Seul le propriétaire peut publier.</p>')+
    '<p>Publier l’application ne remplace pas le code du bot. Il doit être connecté à l’API CMD Sphere.</p>')+
  card("Liens",link("Catalogue","/apps/directory")+" "+link("Tester l’invitation","/apps/choose?client_id="+encodeURIComponent(current.id))));
}
function webhooksView(){
 return wrapper("Webhooks","Crée et gère des webhooks dans les salons CMD Sphere des serveurs où tu es administrateur.",
  card("Sélection du serveur",'<div id="dev-webhook-guilds">Chargement des serveurs installés…</div>')+
  card("Créer un webhook",'<form id="dev-webhook-create">'+
    '<label class="dev-field">Serveur CMD Sphere<select name="guildId" id="dev-hook-guild" required><option value="">Choisir un serveur</option></select></label>'+
    '<label class="dev-field">Salon texte<select name="channelId" id="dev-hook-channel" required><option value="">Choisir un salon</option></select></label>'+
    fld("Nom du webhook","name","","required maxlength=\"80\" placeholder=\"Notifications CMD\"")+
    '<button type="submit" class="dev-btn primary">Créer le webhook</button></form>'+
    '<div class="dev-alert good" id="dev-hook-secret" hidden></div>'+
    '<p>L’URL secrète n’est affichée qu’à sa création. Conserve-la dans un endroit sûr.</p>')+
  card("Webhooks du serveur",'<div id="dev-hook-list">Sélectionne un serveur pour voir ses webhooks.</div>'));
}
async function loadWebhookList(gid){
 const box=$("#dev-hook-list");if(!box||!gid)return;
 box.textContent="Chargement…";
 try{
  const r=await api("/api/native/webhooks?guildId="+encodeURIComponent(gid));
  if(!$("#dev-hook-list")||tab!=="webhooks")return;
  box.innerHTML=(r.webhooks||[]).length?r.webhooks.map(hook=>
    '<div class="dev-item"><div class="dev-row"><div style="flex:1"><b>'+h(hook.name)+'</b><small>'+h(hook.channelName||"Salon")+'</small></div>'+
    '<button class="dev-btn danger" type="button" data-delete-hook="'+h(hook.id)+'">Révoquer</button></div></div>').join(""):'<p>Aucun webhook pour ce serveur.</p>';
  box.querySelectorAll("[data-delete-hook]").forEach(button=>button.addEventListener("click",async()=>{
    if(!confirm("Révoquer définitivement ce webhook CMD Sphere ? Son ancienne URL ne fonctionnera plus."))return;
    try{await api("/api/native/webhooks/delete",{guildId:gid,id:button.dataset.deleteHook});await loadWebhookList(gid);notify("Webhook révoqué.")}catch(e){notify(e.message,true)}
  }));
 }catch(e){box.textContent="Lecture des webhooks impossible : "+e.message}
}
async function loadWebhookChannels(gid){
 const target=$("#dev-hook-channel");if(!target||!gid)return;
 target.innerHTML='<option value="">Chargement…</option>';
 try{
  const r=await api("/api/native/guild/"+encodeURIComponent(gid));
  if(!$("#dev-hook-channel")||tab!=="webhooks")return;
  const ch=(r.channels||[]).filter(c=>["text","announcement","forum"].includes(c.type));
  target.innerHTML='<option value="">Choisir un salon</option>'+ch.map(c=>'<option value="'+h(c.id)+'">'+h(c.name)+'</option>').join("");
  await loadWebhookList(gid);
 }catch(e){target.innerHTML='<option value="">Salons indisponibles</option>';notify(e.message,true)}
}
async function loadWebhookGuilds(){
 const box=$("#dev-webhook-guilds");if(!box||!current)return;
 try{
  const [owned,installs]=await Promise.all([api("/api/native/guilds"),api(root+current.id+"/installations")]);
  if(!$("#dev-webhook-guilds")||tab!=="webhooks")return;
  const authorized=new Set((installs.installations||[]).map(x=>String(x.guild_id)));
  const guilds=(owned.guilds||[]).filter(x=>authorized.has(String(x.id))&&["owner","admin"].includes(String(x.membership_role)));
  const select=$("#dev-hook-guild");
  select.innerHTML='<option value="">Choisir un serveur autorisé</option>'+guilds.map(g=>'<option value="'+h(g.id)+'">'+h(g.name)+'</option>').join("");
  box.innerHTML=guilds.length?'<p>'+guilds.length+' serveur(s) CMD Sphere disponibles pour gérer les webhooks.</p>':
   '<p>Installe d’abord l’application sur un serveur CMD Sphere que tu administres, depuis la rubrique Installation.</p>';
 }catch(e){box.textContent="Liste des serveurs indisponible : "+e.message}
}
async function loadPeople(kind){
 const container=$("#dev-people-list");if(!container||!current)return;
 try{
  const r=await api(root+current.id+"/people");
  if(!$("#dev-people-list")||tab!==(kind==="tester"?"testing":"team"))return;
  const people=(r.people||[]).filter(x=>x.kind===kind);
  container.innerHTML=people.length?people.map(x=>'<div class="dev-item"><div class="dev-row"><div style="flex:1"><b>'+h(x.display_name||x.username||"Utilisateur")+'</b><p>'+h(x.role==="editor"?"Éditeur":x.role==="viewer"?"Lecture seule":"Testeur")+'</p></div>'+
    (r.canManage?'<button type="button" class="dev-btn danger" data-remove-person="'+h(x.user_id)+'">Retirer</button>':'')+'</div></div>').join(""):'<p>Aucun compte ajouté.</p>';
  container.querySelectorAll("[data-remove-person]").forEach(button=>button.addEventListener("click",async()=>{
    if(!confirm("Retirer cet accès à CMD Sphere Développeur ?"))return;
    try{await api(root+current.id+"/people",{kind,operation:"remove",userId:button.dataset.removePerson});await loadPeople(kind);notify("Accès retiré.")}catch(e){notify(e.message,true)}
  }));
 }catch(e){if($("#dev-people-list"))$("#dev-people-list").textContent=e.message}
}
function upcoming(which){
 const data={
 webhooks:["Webhooks","La création de webhooks de salons CMD Sphere existe dans les paramètres de serveur. Le pilotage des webhooks propres à chaque application depuis ce portail reste à développer."],
 activities:["Activités","Lancement d’activités intégrées, SDK et sessions multijoueurs : pas encore disponibles."],
 presence:["Rich Presence","Statuts enrichis par application et SDK Rich Presence : pas encore disponibles."],
 discovery:["Annuaire","Les applications enregistrées sont visibles dans le catalogue CMD Sphere. La validation publique et les paramètres de publication avancés restent à développer."],
 team:["Équipe","Le transfert d’application, les collaborateurs et les rôles développeur supplémentaires restent à développer. Seul le propriétaire peut modifier l’application."],
 testing:["Testeurs","La liste de testeurs et les environnements de déploiement séparés ne sont pas encore disponibles."],
 monetization:["Monétisation","Abonnements, paiements et produits intégrés ne sont pas encore disponibles. Aucun paiement n’est encaissé ici."]
 };
 const [name,desc]=data[which]||["Fonctionnalité", "En préparation"];
 return wrapper(name,desc,'<div class="dev-alert warn">Rubrique présente pour retrouver l’organisation d’un portail Développeur, mais ce service n’est pas encore opérationnel.</div>'+card("État de la fonctionnalité",'<p>'+h(desc)+'</p>'));
}
function render(){
 navigation();
 const b=$("#dev-content");
 if(!current||tab==="home"){b.innerHTML=home();wire();return}
 const byTab={overview,installation,oauth2,bot,commands:commandsView,analytics,documentation:docs,team:()=>memberPanel("team"),testing:()=>memberPanel("tester"),discovery:discoveryView,webhooks:webhooksView};
 b.innerHTML=(byTab[tab]||(()=>upcoming(tab)))();
 wire();
 if(!sleep&&tab==="installation")loadInstallations();
 if(!sleep&&tab==="commands")loadCommands();
 if(!sleep&&(tab==="team"||tab==="testing"))loadPeople(tab==="team"?"team":"tester");
 if(!sleep&&tab==="webhooks")loadWebhookGuilds();
}
function chooseTab(t){
 tab=tabs.has(t)?t:"home";
 if(!current)tab="home";
 updateURL();render();
}
async function reloadApp(id){
 if(!appId.test(id)){current=null;chooseTab("home");return}
 busy=true;
 try{
  const r=await api(root+encodeURIComponent(id));
  current=r.app;loadedAt=Date.now();commands=null;installs=null;
  updateURL();render();
 }catch(error){current=null;chooseTab("home");notify(error.message,true)}
 finally{busy=false}
}
function saveSettings(patch){
 const data={name:patch.name??current.name,description:patch.description??current.description,
   discordClientId:patch.discordClientId??current.discord_client_id??"",config:{...(current.config||{}),...(patch.config||{})}};
 return api(root+current.id+"/settings",data).then(r=>{current=r.app;notify("Modifications enregistrées.");navigation()});
}
async function loadApps(){
 busy=true;
 try{
  const response=await api("/api/developer/apps");
  all=response.apps||[];
  const query=new URLSearchParams(location.search);
  const id=byId(current?.id||query.get("app"));
  if(appId.test(id)&&all.some(a=>a.id===id)){
    tab=tabs.has(query.get("tab"))?query.get("tab"):tab==="home"?"overview":tab;
    await reloadApp(id);
  }else{current=null;tab="home";render()}
 }catch(e){current=null;tab="home";render();notify(e.message,true)}
 finally{busy=false}
}
async function loadInstallations(){
 const container=$("#dev-installations");if(!container||sleep||!current)return;
 try{
  const data=await api(root+current.id+"/installations");
  if(!$("#dev-installations")||tab!=="installation")return;
  installs=data.installations||[];
  $("#dev-installations").innerHTML=installs.length?installs.map(x=>
   '<div class="dev-item"><b>'+h(x.guild_name)+'</b><p>'+h((x.permissions||[]).join(", "))+'</p>'+
   '<small>Installé : '+h(new Date(x.installed_at).toLocaleDateString("fr-FR"))+'</small></div>').join(""):'<p>Le bot n’a encore été autorisé sur aucun serveur CMD Sphere.</p>';
 }catch(e){if($("#dev-installations"))$("#dev-installations").textContent=e.message}
}
async function loadCommands(){
 const container=$("#dev-command-list");if(!container||sleep||!current)return;
 try{
  const data=await api(root+current.id+"/commands");
  if(!$("#dev-command-list")||tab!=="commands")return;
  commands=data.commands||[];
  $("#dev-command-list").innerHTML=commands.length?commands.map(x=>
   '<div class="dev-item"><div class="dev-row"><div style="flex:1"><b>/'+h(x.name)+'</b><p>'+h(x.description)+'</p></div>'+
   '<button class="dev-btn danger" type="button" data-remove-command="'+h(x.id)+'">Supprimer</button></div></div>').join(""):'<p>Aucune commande déclarée.</p>';
  $("#dev-command-list").querySelectorAll("[data-remove-command]").forEach(button=>button.addEventListener("click",async()=>{
    if(!confirm("Supprimer cette déclaration de commande ?"))return;
    try{await api(root+current.id+"/commands/"+button.dataset.removeCommand+"/delete",{});await reloadApp(current.id);notify("Commande supprimée.")}catch(e){notify(e.message,true)}
  }));
 }catch(e){container.textContent=e.message}
}
function wire(){
 document.querySelectorAll("[data-open-app]").forEach(button=>button.addEventListener("click",async()=>{
  tab="overview";await reloadApp(button.dataset.openApp);
 }));
 document.querySelectorAll("[data-copy]").forEach(button=>button.addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(button.dataset.copy);notify("Lien copié.")}catch(e){notify("Copie impossible : "+e.message,true)}
 }));
 const create=$("#dev-create");if(create)create.addEventListener("submit",async event=>{
   event.preventDefault();const data=new FormData(create);
   try{
    const created=await api("/api/developer/apps",{name:data.get("name"),description:data.get("description"),discordClientId:data.get("discordClientId")});
    create.reset();
    const secret=$("#dev-created-secret");
    if(secret){
      secret.hidden=false;
      secret.innerHTML="<b>Application créée. Copie la clé API maintenant, elle ne sera plus affichée :</b>";
      const code=document.createElement("code");code.className="dev-code";code.textContent=created.token;secret.appendChild(code);
      const link=document.createElement("button");link.className="dev-btn";link.type="button";link.textContent="Ouvrir l’application";
      link.addEventListener("click",()=>{all.push({id:created.id,name:data.get("name")});tab="overview";reloadApp(created.id)});
      secret.appendChild(link);
    }
   }catch(e){notify(e.message,true)}
 });
 const hookGuild=$("#dev-hook-guild");
 if(hookGuild)hookGuild.addEventListener("change",()=>loadWebhookChannels(hookGuild.value));
 const hookForm=$("#dev-webhook-create");if(hookForm)hookForm.addEventListener("submit",async ev=>{
   ev.preventDefault();const values=new FormData(hookForm);
   try{
     const gid=String(values.get("guildId")||"");
     const out=await api("/api/native/webhooks",{guildId:gid,channelId:values.get("channelId"),name:values.get("name")});
     const area=$("#dev-hook-secret");
     area.hidden=false;area.textContent="Nouvelle URL secrète (copie maintenant) : ";
     const code=document.createElement("code");code.className="dev-code";code.textContent=out.webhook.url;area.appendChild(code);
     await loadWebhookList(gid);notify("Webhook créé dans le serveur CMD Sphere.");
   }catch(e){notify(e.message,true)}
 });
 const peopleForm=$("#dev-people-form");if(peopleForm)peopleForm.addEventListener("submit",async event=>{
   event.preventDefault();const values=new FormData(peopleForm),kind=peopleForm.dataset.kind;
   try{await api(root+current.id+"/people",{kind,operation:"add",username:values.get("username"),role:values.get("role")});
      peopleForm.reset();await loadPeople(kind);notify("Accès enregistré.");
   }catch(e){notify(e.message,true)}
 });
 const visibilityForm=$("#dev-visibility");if(visibilityForm)visibilityForm.addEventListener("submit",async event=>{
   event.preventDefault();try{
     const result=await api(root+current.id+"/visibility",{published:new FormData(visibilityForm).has("published")});
     current.published=result.published;render();notify("Publication mise à jour.");
   }catch(e){notify(e.message,true)}
 });
 const overviewForm=$("#dev-save-overview");if(overviewForm)overviewForm.addEventListener("submit",async event=>{
  event.preventDefault();const values=new FormData(overviewForm);
  try{await saveSettings({name:values.get("name"),description:values.get("description"),discordClientId:values.get("discordClientId"),
   config:{iconUrl:values.get("iconUrl"),supportUrl:values.get("supportUrl"),privacyUrl:values.get("privacyUrl"),termsUrl:values.get("termsUrl")}})}
  catch(e){notify(e.message,true)}
 });
 const oauth=$("#dev-oauth-form");if(oauth)oauth.addEventListener("submit",async event=>{
  event.preventDefault();const val=new FormData(oauth).get("redirects");
  const redirectUris=String(val||"").split("\n").map(x=>x.trim()).filter(Boolean);
  try{await saveSettings({config:{redirectUris}})}catch(e){notify(e.message,true)}
 });
 const rotate=$("#dev-rotate");
 if(rotate&&current.developer_role!=="owner"){rotate.disabled=true;rotate.title="Réservé au propriétaire";}
 if(current.developer_role==="viewer"){
   ["#dev-save-overview","#dev-oauth-form","#dev-command-create"].forEach(id=>{
     const form=$(id);form?.querySelectorAll("input,textarea,select,button").forEach(input=>input.disabled=true)
   });
 }
 if(rotate)rotate.addEventListener("click",async()=>{
   if(!confirm("Générer une nouvelle clé ? Toutes les instances utilisant l’ancienne seront déconnectées."))return;
   try{
    const result=await api(root+current.id+"/rotate",{});
    $("#dev-secret").hidden=false;
    $("#dev-secret-text").textContent=result.token;
    notify("Nouvelle clé générée. Copie-la avant de quitter cette page.");
   }catch(e){notify(e.message,true)}
 });
 const cmd=$("#dev-command-create");if(cmd)cmd.addEventListener("submit",async event=>{
  event.preventDefault();const val=new FormData(cmd);
  try{await api(root+current.id+"/commands",{name:val.get("name"),description:val.get("description")});await reloadApp(current.id);notify("Commande déclarée. Programme sa réponse dans ton bot.")}catch(e){notify(e.message,true)}
 });
}
$("#dev-app-switch").addEventListener("change",async event=>{
 if(event.target.value){tab="overview";await reloadApp(event.target.value)}
 else{current=null;chooseTab("home")}
});
document.querySelectorAll("[data-dev-tab]").forEach(el=>el.addEventListener("click",()=>chooseTab(el.dataset.devTab)));
document.addEventListener("visibilitychange",()=>{
 if(document.hidden)standby();
 else{active();if(current&&Date.now()-loadedAt>2*60*1000&&document.activeElement?.tagName!=="INPUT")reloadApp(current.id)}
});
for(const ev of ["pointerdown","keydown","touchstart"]){document.addEventListener(ev,()=>{if(sleep||Date.now()-lastUsed>45000)active()}, {passive:true})}
active();loadApps();
})();