/* CMD Sphere 2026-10-08: functional server settings and Discord-style menus.
   Does not modify a Discord server without a confirmation from the user. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=v=>encodeURIComponent(String(v||''));
const notify=(msg,ok=true)=>{try{if(typeof toast==='function')toast(msg,ok);else alert(msg)}catch{alert(msg)}};
let ctx=null,currentTab='overview',newIcon=null,editing=null,opening=false;
const config=[
  ['PARAMÈTRES',['overview|ⓘ|Vue d’ensemble','channels|☰|Salons et catégories','roles|🛡️|Rôles','invites|🔗|Invitations']],
  ['COMMUNAUTÉ',['members|👥|Membres','appearance|🎨|Personnalisation','integrations|🧩|Intégrations']],
  ['MODÉRATION',['security|🔒|Permissions et sécurité','automod|⚔️|AutoMod','audit|📋|Journal d’audit']]
];
async function request(path,body){
 const res=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 let json={};try{json=await res.json()}catch{}
 if(!res.ok||json.error)throw Error(json.error||'Erreur HTTP '+res.status);
 return json;
}
function state(){try{return typeof S!=='undefined'?S:null}catch{return null}}
function id(){return String(ctx?.data?.guild?.id||'')}
function isNative(){return ctx?.mode==='native'}
function canEdit(){return !!ctx?.admin}
function discordUrl(){return /^\d{15,22}$/.test(String(ctx?.source||''))?'https://discord.com/channels/'+safe(ctx.source):''}
function gicon(){const v=String(newIcon||ctx?.data?.guild?.icon||'');return /^https?:\/\//.test(v)||/^data:image\//.test(v)?'<img src="'+escapeHtml(v)+'" alt="">':'🏠'}
function intro(s,sub){return '<h2 class="csm-title">'+escapeHtml(s)+'</h2><p class="csm-lead">'+escapeHtml(sub||'')+'</p>'}
function btn(label,action,klass){return '<button type="button" data-csm-action="'+escapeHtml(action)+'" class="csm-btn '+(klass||'')+'">'+escapeHtml(label)+'</button>'}
function field(label,name,value,attrs){return '<label class="csm-field">'+escapeHtml(label)+'<input name="'+escapeHtml(name)+'" value="'+escapeHtml(value??'')+'" '+(attrs||'')+'></label>'}
function info(s){return '<div class="csm-info">'+escapeHtml(s)+'</div>'}
function toDiscord(){return discordUrl()?'<a class="csm-btn" target="_blank" rel="noopener noreferrer" href="'+discordUrl()+'">Ouvrir sur Discord ↗</a>':''}
function note(){return ctx.source&&isNative()?'Serveur importé depuis Discord. Une confirmation explicite est demandée avant toute opération qui pourrait modifier le serveur Discord. La copie CMD Sphere reste indépendante pour ses messages locaux.':'Enregistrez pour appliquer les modifications autorisées.'}
async function getContext(){
 const s=state();if(!s?.nativeGuild&&!s?.guild)throw Error('Sélectionne d’abord un serveur.');
 if(s.nativeGuild){
  const data=await request('/api/native/guild/'+safe(s.nativeGuild.id));
  ctx={mode:'native',data,admin:['owner','admin'].includes(String(data.member?.membership_role||'')),owner:String(data.member?.membership_role)==='owner',source:data.guild?.source_discord_id||'',bot:null};
 }else{
  const g=s.guild,d=s.bot?await request('/api/dashboard/structure?guildId='+safe(g.id)+'&bot='+safe(s.bot)):{channels:[],roles:[]};
  ctx={mode:'discord',data:{guild:g,channels:d.channels||[],roles:d.roles||[]},admin:!!s.bot,owner:false,source:g.id,bot:s.bot};
 }
}
function nav(){
 return '<nav class="csm-nav" aria-label="Menu paramètres du serveur">'+config.map(([group,links])=>'<div class="csm-nav-group"><h3>'+group+'</h3>'+links.map(s=>{const [tab,ico,label]=s.split('|');return '<button type="button" data-csm-tab="'+tab+'" class="'+(currentTab===tab?'chosen':'')+'"><span>'+ico+'</span>'+label+'</button>'}).join('')+'</div>').join('')+'</nav>';
}
function overview(){
 const g=ctx.data.guild;
 if(!isNative())return intro('Vue d’ensemble','Paramètres généraux du serveur Discord.')+info('Les modifications du nom et de l’icône Discord se font depuis Discord. Les salons et les rôles accessibles au bot peuvent être modifiés dans les rubriques ci-contre.')+toDiscord();
 return intro('Vue d’ensemble','Nom, image et paramètres du serveur CMD Sphere.')+
 '<form id="csm-identity" class="csm-form"><div class="csm-icon-picker"><div class="csm-icon-preview">'+gicon()+'</div><div><b>Icône du serveur</b><p>Format rond, image entière visible</p><label for="csm-icon-input" class="csm-btn">Changer l’icône</label><input id="csm-icon-input" type="file" accept="image/jpeg,image/png,image/webp" hidden '+(ctx.owner?'':'disabled')+'></div></div>'+
 field('Nom du serveur','name',g.name,'required maxlength="100" '+(ctx.owner?'':'disabled'))+
 '<label class="csm-field">Description<textarea name="description" maxlength="1000" '+(ctx.owner?'':'disabled')+'>'+escapeHtml(g.server_description||'')+'</textarea></label>'+
 '<label class="csm-field">Notifications par défaut<select name="defaultNotifications" '+(ctx.owner?'':'disabled')+'><option value="mentions" '+(g.default_notifications==='all'?'':'selected')+'>Mentions uniquement</option><option value="all" '+(g.default_notifications==='all'?'selected':'')+'>Tous les messages</option></select></label>'+
 '<label class="csm-check"><input name="isPublic" type="checkbox" '+(g.is_public?'checked':'')+' '+(ctx.owner?'':'disabled')+'>Serveur visible dans Découvrir</label>'+
 '<label class="csm-check"><input name="welcomeMessage" type="checkbox" '+(g.welcome_message===false?'':'checked')+' '+(ctx.owner?'':'disabled')+'>Activer le message de bienvenue</label>'+
 (ctx.owner?'<button type="submit" class="csm-btn primary">Enregistrer les modifications</button>':info('Seul le propriétaire peut modifier l’identité du serveur.'))+'</form>'+info(note());
}
function options(chosen,arr){return arr.map(([value,label])=>'<option value="'+escapeHtml(value)+'" '+(String(value)===String(chosen)?'selected':'')+'>'+escapeHtml(label)+'</option>').join('')}
const types=[['text','# Texte'],['voice','🔊 Vocal'],['announcement','📢 Annonces'],['forum','🗂️ Forum'],['category','📁 Catégorie']];
function chanItem(c){
 const ico=c.type==='category'?'📁':c.type==='voice'?'🔊':c.type==='forum'?'🗂️':'#';
 return '<div class="csm-line"><span>'+ico+'</span><div><strong>'+escapeHtml(c.name)+'</strong><small>'+escapeHtml(c.topic||c.type||'')+'</small></div>'+(canEdit()?'<button type="button" data-csm-edit-channel="'+escapeHtml(c.id)+'" class="csm-btn">Modifier</button>':'')+'</div>';
}
function channels(){
 const all=ctx.data.channels||[],cats=all.filter(x=>x.type==='category'),rooms=all.filter(x=>x.type!=='category');
 const create=canEdit()?'<form id="csm-create-channel" class="csm-form csm-sub"><h3>Créer un salon ou une catégorie</h3>'+field('Nom','name','','required maxlength="100"')+'<label class="csm-field">Type<select name="type">'+options('text',types)+'</select></label><label class="csm-field">Catégorie<select name="parentId">'+options('',[['','Aucune'],...cats.map(x=>[x.id,x.name])])+'</select></label><button type="submit" class="csm-btn primary">Créer</button></form>':info('Gestion indisponible : droits insuffisants ou bot non installé.');
 return intro('Catégories et salons','Créer, renommer, classer et gérer les salons.')+(ctx.source&&isNative()?'<div class="csm-actions">'+btn('↻ Synchroniser depuis Discord','sync-native','primary')+btn('Sauvegarde des messages accessibles','mirror-history')+'</div>':'')+create+'<div id="csm-channel-editor"></div><div class="csm-lines">'+cats.map(c=>'<section><div class="csm-parent">'+chanItem(c)+'</div>'+rooms.filter(x=>String(x.source_parent_id||x.parentId||'')===String(c.source_channel_id||c.id)).map(chanItem).join('')+'</section>').join('')+rooms.filter(x=>!x.source_parent_id&&!x.parentId).map(chanItem).join('')+(all.length?'':info('Aucun salon synchronisé.'))+'</div>'+info(note());
}
const perms=[['viewChannels','Voir les salons'],['sendMessages','Envoyer des messages'],['readHistory','Consulter l’historique'],['connect','Se connecter au vocal'],['speak','Parler en vocal'],['manageChannels','Gérer les salons'],['manageMessages','Gérer les messages'],['manageRoles','Gérer les rôles'],['administrator','Administrateur']];
function roleEditor(role){
 const p=role?.permissions&&typeof role.permissions==='object'?role.permissions:{};
 return '<form id="csm-role-form" class="csm-form csm-sub"><h3>'+(role?'Modifier le rôle':'Créer un rôle')+'</h3>'+field('Nom','name',role?.name||'','required maxlength="100"')+
 '<label class="csm-field">Couleur<input type="color" name="color" value="'+(/^#[0-9a-f]{6}$/i.test(String(role?.color||''))?role.color:'#5865f2')+'"></label>'+
 '<label class="csm-check"><input type="checkbox" name="hoist" '+(role?.hoist?'checked':'')+'>Afficher séparément</label>'+
 '<label class="csm-check"><input type="checkbox" name="mentionable" '+(role?.mentionable?'checked':'')+'>Autoriser les mentions</label>'+
 '<h4>Permissions du rôle</h4>'+perms.map(([key,label])=>'<label class="csm-check"><input type="checkbox" data-csm-permission="'+key+'" '+(p[key]?'checked':'')+'>'+label+'</label>').join('')+
 '<div class="csm-actions"><button type="submit" class="csm-btn primary">Enregistrer</button>'+(role&&role.name!=='@everyone'?btn('Supprimer','delete-role','danger'):'')+btn('Annuler','cancel-role')+'</div></form>';
}
function roles(){
 const all=ctx.data.roles||[];
 return intro('Rôles','Gérer les rôles, couleurs et permissions.')+(canEdit()?btn('＋ Nouveau rôle','new-role','primary'):'')+'<div id="csm-role-editor"></div><div class="csm-lines">'+all.map(role=>'<div class="csm-line"><i class="csm-role-color" style="background:'+( /^#[0-9a-f]{6}$/i.test(String(role.color||''))?role.color:'#5865f2')+'"></i><div><strong>'+escapeHtml(role.name)+'</strong><small>Position '+escapeHtml(role.position||0)+'</small></div>'+(canEdit()?'<button type="button" data-csm-edit-role="'+escapeHtml(role.id)+'" class="csm-btn">Modifier</button>':'')+'</div>').join('')+'</div>'+info(note());
}
function other(){
 if(currentTab==='invites')return intro('Invitations','Fais rejoindre les membres à ton serveur.')+(isNative()?'<div class="csm-invite">'+escapeHtml(ctx.data.inviteUrl||'')+'</div>'+btn('Copier le lien','copy-invite','primary'):info('Les invitations Discord sont générées depuis Discord.'))+toDiscord();
 if(currentTab==='integrations')return intro('Intégrations','Bots et webhooks du serveur.')+'<div class="csm-actions">'+(isNative()?'<a class="csm-btn primary" href="/apps/directory">＋ Inviter un bot CMD Sphere</a><a class="csm-btn" href="/developers">CMD Sphere Développeur</a>':'')+btn('Voir les bots','bots','primary')+btn('Tous mes webhooks Discord','all-webhooks')+(isNative()&&ctx.source&&canEdit()?btn('Récupérer bots et webhooks ici','import-integrations','primary'):'')+'</div>'+(isNative()?'<section id="csm-installed-cmd-apps" aria-live="polite">'+info('Chargement des bots CMD Sphere installés…')+'</section>':'')+'<section id="csm-native-webhooks" aria-live="polite"></section><section id="csm-webhooks" aria-live="polite">'+info('Chargement des webhooks…')+'</section>';
 if(currentTab==='appearance')return intro('Personnalisation','Icône, description et identité du serveur.')+btn('Modifier la vue d’ensemble','overview','primary')+(isNative()?'<a class="csm-btn" href="/profile?server='+safe(id())+'">Profil du serveur ↗</a>':'')+toDiscord();
 if(currentTab==='members')return intro('Membres','Vue et gestion des membres.')+info('Membres du serveur : '+String(ctx.data.guild.member_count||ctx.data.guild.memberCount||0)+'. La gestion avancée des membres et de leurs rôles Discord doit être faite depuis Discord.')+toDiscord();
 if(currentTab==='security')return intro('Permissions et sécurité','Permissions d’accès et sécurité du serveur.')+btn('Configurer les rôles','roles','primary')+info('Pour les permissions propres à un salon, ouvre la rubrique Salons et catégories. Les paramètres de sécurité Discord restent dans Discord.')+toDiscord();
 if(currentTab==='automod')return intro('AutoMod','Modération automatisée du serveur.')+info('L’édition des règles AutoMod Discord n’est pas accessible depuis ce panneau.')+toDiscord();
 return intro('Journal d’audit','Suivi de la configuration et des événements.')+info('L’historique d’audit Discord ne peut pas être modifié dans CMD Sphere.')+toDiscord();
}
function render(){
 if(!ctx)return;
 const modal=$('#serverSettingsModal'),box=$('#serverSettingsBody');if(!modal||!box)return;
 const guild=ctx.data.guild;
 box.innerHTML='<div class="csm-root"><header class="csm-header"><div class="csm-header-icon">'+gicon()+'</div><div class="csm-header-label"><strong>'+escapeHtml(guild.name||'Serveur')+'</strong><small>Gestion du serveur · CMD Sphere</small></div><button type="button" id="csm-close" title="Fermer">×</button></header><div class="csm-columns">'+nav()+'<main class="csm-main">'+(currentTab==='overview'?overview():currentTab==='channels'?channels():currentTab==='roles'?roles():other())+'</main></div></div>';
 modal.classList.add('on','csm-open');
 box.querySelector('#csm-close')?.addEventListener('click',close);
 box.querySelectorAll('[data-csm-tab]').forEach(e=>e.addEventListener('click',()=>{currentTab=e.dataset.csmTab;editing=null;render()}));
 box.querySelectorAll('[data-csm-action]').forEach(e=>e.addEventListener('click',()=>action(e.dataset.csmAction)));
 box.querySelector('#csm-identity')?.addEventListener('submit',saveIdentity);
 box.querySelector('#csm-create-channel')?.addEventListener('submit',createChannel);
 box.querySelector('#csm-icon-input')?.addEventListener('change',readIcon);
 box.querySelectorAll('[data-csm-edit-channel]').forEach(e=>e.addEventListener('click',()=>editChannel(e.dataset.csmEditChannel)));
 box.querySelectorAll('[data-csm-edit-role]').forEach(e=>e.addEventListener('click',()=>editRole(e.dataset.csmEditRole)));
 if(currentTab==='integrations'){loadInstalledCMDApps();loadNativeWebhooks();loadWebhooks()}
 const active=box.querySelector('.csm-nav button.chosen');if(active&&window.matchMedia?.('(max-width:760px)').matches)active.scrollIntoView({block:'nearest',inline:'center'});
}
async function loadInstalledCMDApps(){
 const container=$('#csm-installed-cmd-apps'),context=ctx;
 if(!container||!isNative())return;
 try{
  const data=await request('/api/cmd-apps/installed?guildId='+safe(id()));
  if(ctx!==context||!container.isConnected)return;
  const apps=Array.isArray(data.apps)?data.apps:[];
  const labels={view_channels:'Voir les salons',read_messages:'Lire les messages',send_messages:'Envoyer des messages'};
  container.innerHTML='<h3>Bots et applications CMD Sphere</h3>'+
   '<p class="csm-lead">Ces bots sont autorisés sur CMD Sphere sans modifier Discord. Un bot doit utiliser l’API CMD Sphere pour répondre.</p>'+
   (apps.length?'<div class="csm-lines">'+apps.map(app=>{
    const scopes=Array.isArray(app.permissions)?app.permissions:[];
    return '<div class="csm-line"><span>🤖</span><div><strong>'+escapeHtml(app.name||'Application CMD')+'</strong>'+
      '<small>'+escapeHtml(scopes.length?scopes.map(p=>labels[p]||p).join(' · '):'Aucune permission accordée')+'</small></div>'+
      (canEdit()?'<button class="csm-btn danger" type="button" data-csm-uninstall-app="'+escapeHtml(app.id)+'">Retirer</button>':'')+'</div>';
   }).join('')+'</div>':info('Aucun bot CMD Sphere installé sur ce serveur.'))+
   '<div class="csm-actions"><a class="csm-btn primary" href="/apps/directory">Installer un bot CMD Sphere</a>'+
    (canEdit()?'<a class="csm-btn" href="/developers">Créer mon propre bot</a>':'')+'</div>';
  container.querySelectorAll('[data-csm-uninstall-app]').forEach(button=>button.addEventListener('click',async()=>{
    const appId=button.dataset.csmUninstallApp,app=apps.find(x=>String(x.id)===String(appId));
    if(!canEdit()||!app)return;
    if(!confirm('Retirer « '+app.name+' » de ce serveur CMD Sphere ? Les permissions de cette application seront révoquées immédiatement, sans modifier Discord.'))return;
    button.disabled=true;
    try{
      await request('/api/cmd-apps/remove',{guildId:id(),clientId:appId});
      notify('Bot CMD Sphere retiré. Ses permissions sont révoquées.');
      await loadInstalledCMDApps();
    }catch(error){notify('Impossible de retirer le bot : '+error.message,false);button.disabled=false}
  }));
 }catch(error){
   if(ctx===context&&container.isConnected)container.innerHTML='<h3>Applications CMD Sphere</h3>'+info('Lecture indisponible : '+error.message);
 }
}
async function loadNativeWebhooks(){
 const box=$('#csm-native-webhooks'),context=ctx;if(!box||!isNative())return;
 try{
  const data=await request('/api/native/webhooks?guildId='+safe(id()));if(ctx!==context||!box.isConnected)return;
  const rooms=(context.data.channels||[]).filter(c=>['text','announcement','forum'].includes(String(c.type)));
  box.innerHTML='<h3>Webhooks CMD Sphere indépendants</h3>'+info('Envoie des messages directement ici, sans compte Discord. Format JSON : content et embeds. Les outils externes doivent accepter une URL de webhook personnalisée.')+'<div class="csm-lines">'+(data.webhooks||[]).map(w=>'<div class="csm-line"><span>🪝</span><div><strong>'+escapeHtml(w.name)+'</strong><small># '+escapeHtml(w.channelName)+'</small></div><button type="button" class="csm-btn danger" data-delete-native-webhook="'+escapeHtml(w.id)+'">Supprimer</button></div>').join('')+'</div>'+(canEdit()&&rooms.length?'<form id="csm-native-webhook-form" class="csm-form csm-sub"><h3>Créer ici</h3>'+field('Nom','name','CMD Webhook','required maxlength="80"')+'<label class="csm-field">Salon CMD Sphere<select name="channelId">'+rooms.map(c=>'<option value="'+escapeHtml(c.id)+'"># '+escapeHtml(c.name)+'</option>').join('')+'</select></label><button class="csm-btn primary">Créer le webhook CMD Sphere</button></form><div id="csm-native-webhook-result"></div>':info('Il faut un salon texte et les droits de gestion pour créer un webhook.'));
  box.querySelectorAll('[data-delete-native-webhook]').forEach(button=>button.onclick=async()=>{if(!confirm('Supprimer ce webhook CMD Sphere et désactiver son URL ?'))return;button.disabled=true;try{await request('/api/native/webhooks/delete',{guildId:String(context.data.guild.id),id:button.dataset.deleteNativeWebhook});if(ctx===context)await loadNativeWebhooks()}catch(err){notify(err.message,false);button.disabled=false}});
  box.querySelector('form')?.addEventListener('submit',async e=>{
   e.preventDefault();const f=e.currentTarget,values=new FormData(f),button=f.querySelector('button');button.disabled=true;
   try{
    const r=await request('/api/native/webhooks',{guildId:String(context.data.guild.id),name:values.get('name'),channelId:values.get('channelId')});
    if(ctx!==context||!box.isConnected)return;
    const result=box.querySelector('#csm-native-webhook-result');result.innerHTML=info('Webhook créé. Copie cette URL maintenant : elle autorise l’envoi dans ce salon et ne sera plus affichée après fermeture.')+'<label class="csm-field">URL du webhook<input readonly value="'+escapeHtml(r.webhook.url)+'"></label><button class="csm-btn" type="button">Copier l’URL</button>';
    result.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText(r.webhook.url);notify('URL copiée.')}catch{result.querySelector('input').select()}};
    notify('Webhook CMD Sphere créé.');
   }catch(err){notify('Webhook CMD Sphere : '+err.message,false)}finally{button.disabled=false}
  });
 }catch(err){if(ctx===context&&box.isConnected)box.innerHTML=info('Webhooks CMD Sphere : '+err.message)}
}

async function loadWebhooks(){
 const box=$('#csm-webhooks'),context=ctx;
 if(!box)return;
 if(!ctx.source){box.innerHTML=info('Ce serveur CMD Sphere n’est pas lié à Discord. Les webhooks Discord apparaissent dans leur serveur importé.');return}
 try{
  const [webhookResult,botResult]=await Promise.allSettled([request('/api/dashboard/webhooks?guildId='+safe(context.source)),request('/api/dashboard/bots?guildId='+safe(context.source))]);
  const saved=isNative()?await request('/api/native/integrations?guildId='+safe(id())).catch(()=>({snapshot:{}})):{snapshot:{}};
  const data=webhookResult.status==='fulfilled'?webhookResult.value:{webhooks:saved.snapshot?.webhooks||[],errors:[{botName:'Webhooks',error:webhookResult.reason.message}]};
  const detected=botResult.status==='fulfilled'?(botResult.value.guilds||[]).flatMap(g=>g.bots||[]):saved.snapshot?.bots||saved.snapshot?.extras?.bots||[];
  if(ctx!==context||!box.isConnected)return;
  const rooms=(context.data.channels||[]).filter(c=>['text','announcement','0','5'].includes(String(c.type))&&/^\d{15,22}$/.test(String(c.source_channel_id||c.id)));
  const bots=data.botsUsed||[],bot=bots.includes('extinction')?'extinction':data.bot;
  const rows=(data.webhooks||[]).map(w=>{
   const local=(context.data.channels||[]).find(c=>String(c.source_channel_id||c.id)===String(w.channelId));
   const channel=local?.name||w.channelName||w.channelId||'Salon non fourni';
   return '<div class="csm-line"><span>🪝</span><div><strong>'+escapeHtml(w.name)+'</strong><small># '+escapeHtml(channel)+(local?' · salon associé dans CMD Sphere':' · salon Discord à synchroniser')+'</small><small>'+escapeHtml(w.creator?.username?'Créé par '+w.creator.username:'Créateur non fourni')+(w.mine?' · ton webhook':'')+'</small></div><a class="csm-btn" target="_blank" rel="noopener noreferrer" href="https://discord.com/channels/'+safe(context.source)+'/'+safe(w.channelId||'')+'">Voir le salon ↗</a></div>';
  }).join('');
  const botHtml=detected.map(b=>'<div class="csm-line">'+(/^https:\/\//.test(String(b.avatar||''))?'<img class="csm-bot-icon" src="'+escapeHtml(b.avatar)+'" alt="">':'<span>🤖</span>')+'<div><strong>'+escapeHtml(b.username||b.name||b.id)+'</strong><small>Détecté sur Discord · connexion CMD Sphere non vérifiée</small><small>ID '+escapeHtml(b.id)+'</small></div></div>').join('');
  box.innerHTML='<h3>Bots du serveur Discord</h3><div class="csm-lines">'+(botHtml||info(botResult.status==='rejected'?'Bots inaccessibles : '+botResult.reason.message:'Aucun bot accessible.'))+'</div>'+info('Les réglages existants restent sur Discord ou chez le fournisseur du bot. Un bot tiers doit proposer une API compatible pour fonctionner dans CMD Sphere.')+'<h3>Webhooks Discord existants</h3>'+info('Les webhooks restent associés à leur serveur et à leur salon Discord d’origine. Ils sont affichés ici sans les recréer ni les déplacer.')+'<div class="csm-lines">'+(rows||info('Aucun webhook accessible sur ce serveur.'))+'</div>'+(data.errors?.length?info('Certaines sources sont inaccessibles : '+data.errors.map(e=>e.botName+': '+e.error).join(' · ')):'')+
   (canEdit()&&rooms.length&&bot?'<form id="csm-create-webhook" class="csm-form csm-sub"><h3>Créer un webhook sur Discord</h3>'+field('Nom','name','CMD Webhook','required maxlength="80"')+'<label class="csm-field">Salon<select name="channelId" required>'+rooms.map(c=>'<option value="'+escapeHtml(c.source_channel_id||c.id)+'"># '+escapeHtml(c.name)+'</option>').join('')+'</select></label><button class="csm-btn primary" type="submit">Créer le webhook</button></form>':info('La création nécessite des droits de gestion, un salon synchronisé et un bot disposant de la permission Gérer les webhooks.'));
  box.querySelector('#csm-create-webhook')?.addEventListener('submit',async e=>{
   e.preventDefault();const form=e.currentTarget,values=new FormData(form),button=form.querySelector('button');
   if(!confirm('Créer le webhook « '+values.get('name')+' » sur le serveur Discord « '+context.data.guild.name+' » dans le salon choisi ?'))return;
   button.disabled=true;
   try{await request('/api/dashboard/action',{guildId:context.source,bot,action:'create_webhook',name:values.get('name'),channelId:values.get('channelId')});notify('Webhook créé sur Discord.');if(ctx===context)await loadWebhooks()}
   catch(err){notify('Création du webhook : '+err.message,false)}finally{button.disabled=false}
  });
 }catch(err){if(box.isConnected&&ctx===context)box.innerHTML=info('Webhooks inaccessibles : '+err.message)}
}

async function open(tab='overview'){
 if(opening)return;
 opening=true;currentTab=tab;editing=null;newIcon=null;
 try{
  $('#serverSettingsModal')?.classList.add('on');
  $('#serverSettingsBody').innerHTML='<p class="csm-loading">Chargement des paramètres…</p>';
  await getContext();render();
 }catch(e){notify('Paramètres du serveur : '+e.message,false);close()}finally{opening=false}
}
function close(){$('#serverSettingsModal')?.classList.remove('on','csm-open')}
async function update(){
 await getContext();render();
 try{const st=state();if(st?.nativeGuild&&typeof selectNative==='function')await selectNative(st.nativeGuild)}catch{}
}
function requireConfirmation(message){
 if(ctx?.source&&isNative())return confirm('Serveur Discord importé : '+message+'\n\nCette action peut aussi modifier le serveur Discord si un bot autorisé est connecté. Continuer ?');
 if(ctx?.source&&!isNative())return confirm('Modifier le serveur Discord via le bot autorisé ?\n\n'+message);
 return true;
}
async function mutate(action,payload){
 if(!canEdit())throw Error('Permissions de gestion manquantes.');
 if(!requireConfirmation('Confirmer : '+action.replaceAll('_',' ')))return null;
 const r=await request(isNative()?'/api/native/action':'/api/dashboard/action',
  {...(isNative()?{nativeGuildId:id()}:{guildId:id(),bot:ctx.bot}),action,...payload});
 notify(r.warning||'Modification enregistrée.',!r.warning);
 await update();return r;
}
async function readIcon(e){
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>2000000){notify('Pour éviter les erreurs de stockage, utilise une icône de moins de 2 Mo.',false);return}
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)){notify('Format PNG, JPEG ou WebP requis.',false);return}
 newIcon=await new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>resolve(rd.result);rd.onerror=reject;rd.readAsDataURL(file)});
 const preview=$('.csm-icon-preview');if(preview)preview.innerHTML=gicon();
}
async function saveIdentity(e){
 e.preventDefault();if(!isNative()||!ctx.owner)return;
 const f=e.currentTarget,fd=new FormData(f);
 try{
  const result=await request('/api/native/server-identity',{guildId:id(),name:String(fd.get('name')||'').trim(),description:String(fd.get('description')||''),iconDataUrl:newIcon||undefined,isPublic:fd.has('isPublic'),welcomeMessage:fd.has('welcomeMessage'),defaultNotifications:fd.get('defaultNotifications')});
  notify('Identité du serveur CMD Sphere enregistrée.');newIcon=null;await update();
 }catch(e){notify(e.message,false)}
}
async function createChannel(e){
 e.preventDefault();const fd=new FormData(e.currentTarget),type=String(fd.get('type')||'text');
 try{await mutate(type==='category'?'create_category':'create_channel',{name:String(fd.get('name')||'').trim(),type,parentId:String(fd.get('parentId')||''),topic:''})}catch(e){notify(e.message,false)}
}
function editChannel(chId){
 const ch=(ctx.data.channels||[]).find(x=>String(x.id)===String(chId));if(!ch)return;
 editing={type:'channel',id:ch.id};
 const cats=(ctx.data.channels||[]).filter(x=>x.type==='category'&&String(x.id)!==String(ch.id));
 const parent=ch.source_parent_id||ch.parentId||'';
 const panel=$('#csm-channel-editor');
 panel.innerHTML='<form id="csm-channel-form" class="csm-form csm-sub"><h3>Modifier le salon : '+escapeHtml(ch.name)+'</h3>'+field('Nom','name',ch.name,'required maxlength="100"')+
 '<label class="csm-field">Type<select name="type">'+options(ch.type,types)+'</select></label>'+
 '<label class="csm-field">Catégorie<select name="parentId">'+options(parent,[['','Aucune'],...cats.map(x=>[x.source_channel_id||x.id,x.name])])+'</select></label>'+
 '<label class="csm-field">Sujet<textarea name="topic" maxlength="1024">'+escapeHtml(ch.topic||'')+'</textarea></label>'+
 '<div class="csm-actions"><button type="submit" class="csm-btn primary">Enregistrer</button>'+btn('Supprimer','delete-channel','danger')+btn('Annuler','cancel-channel')+'</div></form>';
 panel.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();const d=new FormData(e.currentTarget);
  try{await mutate('update_channel',{channelId:ch.id,name:String(d.get('name')||''),type:String(d.get('type')||'text'),parentId:String(d.get('parentId')||''),topic:String(d.get('topic')||'')})}catch(e){notify(e.message,false)}
 });
 panel.querySelectorAll('[data-csm-action]').forEach(e=>e.addEventListener('click',()=>action(e.dataset.csmAction)));
 panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function editRole(roleId){
 const role=(ctx.data.roles||[]).find(x=>String(x.id)===String(roleId));if(!role)return;
 editing={type:'role',id:role.id};showRole(role);
}
function showRole(role){
 const box=$('#csm-role-editor');box.innerHTML=roleEditor(role);
 box.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget,d=new FormData(f),permissions={};
  f.querySelectorAll('[data-csm-permission]').forEach(v=>{permissions[v.dataset.csmPermission]=v.checked});
  try{await mutate(role?'update_role':'create_role',{...Object.fromEntries(d.entries()),...(role?{roleId:role.id}:{}),permissions,hoist:d.has('hoist'),mentionable:d.has('mentionable')})}catch(e){notify(e.message,false)}
 });
 box.querySelectorAll('[data-csm-action]').forEach(e=>e.addEventListener('click',()=>action(e.dataset.csmAction)));
 box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function action(which){
 if(which==='overview'||which==='channels'||which==='roles'){currentTab=which;editing=null;render();return}
 if(which==='new-role'){editing={type:'role',id:null};showRole(null);return}
 if(which==='cancel-channel'){$('#csm-channel-editor').innerHTML='';editing=null;return}
 if(which==='cancel-role'){$('#csm-role-editor').innerHTML='';editing=null;return}
 if(which==='delete-channel'){
  if(!editing||editing.type!=='channel')return;
  if(!confirm('Supprimer ce salon et ses éventuels messages locaux ? Cette action est irréversible.'))return;
  try{await mutate('delete_channel',{channelId:editing.id})}catch(e){notify(e.message,false)}return;
 }
 if(which==='delete-role'){
  if(!editing||editing.type!=='role')return;
  if(!confirm('Supprimer ce rôle ? Cette action est irréversible.'))return;
  try{await mutate('delete_role',{roleId:editing.id})}catch(e){notify(e.message,false)}return;
 }
 if(which==='sync-native'){
  if(!isNative()||!ctx.source)return;
  try{const res=await request('/api/native/sync',{nativeGuildId:id()});notify(res.warning||(res.botless?'Nom et icône actualisés. Catégories et salons non accessibles au bot.':'Catégories, salons et rôles accessibles synchronisés.'),!res.botless&&!res.warning);await update()}
  catch(err){notify('Synchronisation impossible : '+err.message,false)}return;
 }
 if(which==='mirror-history'){close();if(typeof openMirrorManager==='function')openMirrorManager();return}
 if(which==='copy-invite'){
  const invite=String(ctx.data.inviteUrl||'');
  try{await navigator.clipboard.writeText(invite);notify('Invitation copiée.')}catch{prompt('Copier le lien d’invitation',invite)}return;
 }
 if(which==='import-integrations'){try{const r=await request('/api/native/integrations/import',{nativeGuildId:id()});notify(r.bots+' bot(s) et '+r.webhooks+' webhook(s) sauvegardés dans CMD Sphere.'+(r.unmapped?' '+r.unmapped+' salon(s) à synchroniser.':'')+(r.errors?.length?' Certaines sources restent inaccessibles.':''),!r.unmapped&&!r.errors?.length)}catch(err){notify('Récupération : '+err.message,false)}return}
 if(which==='all-webhooks'){close();if(typeof openWebhookManager==='function')openWebhookManager();return}
 if(which==='bots'){close();if(typeof openBotsManager==='function')openBotsManager();return}
}
function menu(){
 document.getElementById("csm-server-menu")?.remove();
 const guild=state()?.nativeGuild||state()?.guild||ctx?.data?.guild||{};
 const gid=String(guild.id||ctx?.data?.guild?.id||"");
 const code=encodeURIComponent(gid),name=String(guild.name||"Serveur CMD Sphere"),icon=String(guild.icon||"");
 const role=String(ctx?.data?.member?.membership_role||"");
 const count=Number(guild.member_count||guild.memberCount||ctx?.data?.guild?.member_count||0);
 const root=document.createElement("div");root.id="csm-server-menu";
 const img=(/^(https?:\/\/|data:image\/)/.test(icon))?'<img class="csm-server-menu-icon" src="'+escapeHtml(icon)+'" alt="">':'<span class="csm-server-menu-icon">🏠</span>';
 const buttons=[
  ["boost","◈","Boost"],
  ["invite","♧","Inviter"],
  ["notifications","♧","Notifications"],
  ["overview","⚙","Paramètres"]
 ].map(([key,ico,label])=>'<button type="button" data-csm-quick="'+key+'"><b>'+ico+'</b><small>'+label+'</small></button>').join("");
 root.innerHTML='<div class="csm-server-menu-shade"></div><section class="csm-server-menu-body" role="dialog" aria-modal="true" aria-label="Actions du serveur">'+
  '<div class="csm-server-menu-handle"></div>'+
  '<div class="csm-server-menu-server">'+img+'<h3>'+escapeHtml(name)+'</h3>'+
  '<p>'+((guild.source_discord_id||ctx?.source)?'Serveur Discord importé':'Serveur de communauté')+(count?' · '+count+' membres':'')+'</p></div>'+
  '<div class="csm-server-menu-quick">'+buttons+'</div>'+
  '<div class="csm-server-menu-list">'+
  '<button type="button" data-csm-quick="search">⌕ Chercher des salons <span>›</span></button>'+
  '<button type="button" data-csm-quick="channels">＋ Créer un salon <span>›</span></button>'+
  '<button type="button" data-csm-quick="categories">▤ Créer une catégorie <span>›</span></button>'+
  (gid?'<a href="/profile?server='+code+'">♙ Modifier le profil par serveur <span>›</span></a>':'')+
  '<button type="button" data-csm-quick="channels">☷ Montrer tous les salons <span>›</span></button>'+
  '</div>'+
  '<button type="button" class="csm-server-menu-cancel" data-csm-quick="close">Fermer</button>'+
  '<p id="csmMenuStatus" role="status" aria-live="polite"></p>'+
  '</section>';
 document.body.appendChild(root);
 const shut=()=>root.remove();
 root.querySelector(".csm-server-menu-shade").onclick=shut;
 root.querySelectorAll("[data-csm-quick]").forEach(button=>button.onclick=async()=>{
  const key=button.dataset.csmQuick;
  if(key==="close"){shut();return}
  if(key==="boost"){if(gid)location.href="/server-boosts/"+code;else location.href="/stars";return}
  if(key==="invite"){shut();const launch=document.querySelector(".cmd-invite-launch");if(launch){launch.click();return}await open("invites");return}
  if(key==="notifications"){
   const status=root.querySelector("#csmMenuStatus");
   if(!("Notification" in window)){status.textContent="Les notifications ne sont pas disponibles sur ce navigateur.";return}
   try{const permission=Notification.permission==="default"?await Notification.requestPermission():Notification.permission;
    status.textContent=permission==="granted"?"Notifications autorisées sur cet appareil. Régle aussi les alertes dans les paramètres de CMD Sphere.":"Autorisation de notification non accordée.";
   }catch{status.textContent="Impossible de demander l’autorisation."}
   return;
  }
  if(key==="search"){shut();const input=document.querySelector("#cmdChannelSearch");if(input){input.focus();input.scrollIntoView({block:"nearest"})}else await open("channels");return}
  shut();
  if(key==="categories"||key==="channels")await open("channels");
  else await open(key);
 });
 root.onkeydown=e=>{if(e.key==="Escape"){e.preventDefault();shut()}};
 root.querySelector('[data-csm-quick="invite"]')?.focus();
}
function install(){
 const button=$('#serverSettingsBtn');if(button)button.onclick=()=>open();
 const title=$('#gtitle');if(title&&!title.dataset.csmBound){title.dataset.csmBound='1';title.style.cursor='pointer';title.setAttribute('title','Ouvrir le menu du serveur');title.setAttribute('role','button');title.setAttribute('tabindex','0');title.addEventListener('click',menu);title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();menu()}})}
 const closeButton=$('#serverSettingsClose');if(closeButton)closeButton.onclick=close;
}
document.addEventListener('click',e=>{
 const gear=e.target.closest('[data-csm-channel-settings]');if(gear){e.preventDefault();open('channels').then(()=>editChannel(gear.dataset.csmChannelSettings));return}
 if(e.target.closest('[data-csm-open-settings]')){e.preventDefault();open();return}
 if(e.target.closest('.cmd-server-heading')&&!e.target.closest('a,button,input'))menu();
 if(e.target.closest('#serverSettingsModal .csm-open-outside'))close();
});
document.addEventListener('contextmenu',e=>{
 const target=e.target.closest('.cmd-channel-row[data-native-channel]');
 if(!target)return;
 e.preventDefault();
 open('channels').then(()=>editChannel(target.dataset.nativeChannel));
});
const observer=new MutationObserver(()=>install());
function boot(){install();observer.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.cmdSphereServerSettings={open,close};
})();