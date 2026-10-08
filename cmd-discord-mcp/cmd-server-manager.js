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
 if(currentTab==='integrations')return intro('Intégrations','Afficher les bots et les applications connectés.')+btn('Voir les bots','bots','primary')+info('Les réglages spécifiques des bots tiers restent sur leur tableau de bord.');
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
 if(which==='bots'){close();if(typeof openBotsManager==='function')openBotsManager();return}
}
function menu(){
 document.getElementById('csm-server-menu')?.remove();
 const root=document.createElement('div');root.id='csm-server-menu';root.innerHTML='<div class="csm-server-menu-shade"></div><section class="csm-server-menu-body"><div class="csm-server-menu-handle"></div><h3>Menu du serveur</h3>'+
 [['invites','👥 Inviter des membres'],['channels','＋ Créer ou modifier un salon'],['roles','🛡️ Gérer les rôles'],['overview','⚙️ Paramètres du serveur']].map(([k,l])=>'<button type="button" data-csm-menu-tab="'+k+'">'+l+' <span>›</span></button>').join('')+
 '<button type="button" data-csm-menu-tab="close">Fermer</button></section>';
 document.body.appendChild(root);
 const shut=()=>root.remove();
 root.querySelector('.csm-server-menu-shade').addEventListener('click',shut);
 root.querySelectorAll('[data-csm-menu-tab]').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.csmMenuTab;shut();if(t!=='close')open(t)}));
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