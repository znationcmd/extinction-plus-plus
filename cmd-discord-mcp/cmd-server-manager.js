/* CMD Sphere 2026-10-08: functional server settings and Discord-style menus.
   Does not modify a Discord server without a confirmation from the user. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=v=>encodeURIComponent(String(v||''));
const notify=(msg,ok=true)=>{try{if(typeof toast==='function')toast(msg,ok);else alert(msg)}catch{alert(msg)}};
let ctx=null,currentTab='overview',newIcon=null,editing=null,opening=false,hostingRoleData=null,nativeMemberCache=null;
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
function canEditRoles(){return isNative()?!!ctx?.owner:canEdit()}
function canEditChannels(){return isNative()?(!ctx?.source&&(canEdit()||!!ctx?.data?.permissions?.manageChannels||!!ctx?.data?.permissions?.administrator)):canEdit()}
function discordUrl(){return /^\d{15,22}$/.test(String(ctx?.source||''))?'https://discord.com/channels/'+safe(ctx.source):''}
function gicon(){const v=String(newIcon||ctx?.data?.guild?.icon||'');return /^https?:\/\//.test(v)||/^data:image\//.test(v)?'<img src="'+escapeHtml(v)+'" alt="">':'🏠'}
function intro(s,sub){return '<h2 class="csm-title">'+escapeHtml(s)+'</h2><p class="csm-lead">'+escapeHtml(sub||'')+'</p>'}
function btn(label,action,klass){return '<button type="button" data-csm-action="'+escapeHtml(action)+'" class="csm-btn '+(klass||'')+'">'+escapeHtml(label)+'</button>'}
function field(label,name,value,attrs){return '<label class="csm-field">'+escapeHtml(label)+'<input name="'+escapeHtml(name)+'" value="'+escapeHtml(value??'')+'" '+(attrs||'')+'></label>'}
function info(s){return '<div class="csm-info">'+escapeHtml(s)+'</div>'}
function toDiscord(){return discordUrl()?'<a class="csm-btn" target="_blank" rel="noopener noreferrer" href="'+discordUrl()+'">Ouvrir la plateforme connectée ↗</a>':''}
function note(){return ctx.source&&isNative()?'Serveur importé dans CMD Sphere. Une confirmation explicite est demandée avant toute opération qui pourrait modifier le serveur externe. La copie CMD Sphere reste indépendante pour ses messages locaux.':'Enregistrez pour appliquer les modifications autorisées.'}
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
 if(!isNative())return intro('Vue d’ensemble','Paramètres généraux du serveur externe.')+info('Le nom et l’icône de ce serveur externe sont gérés sur la plateforme liée. Les salons et les rôles accessibles au bot peuvent être modifiés dans les rubriques ci-contre.')+toDiscord();
 return intro('Vue d’ensemble','Nom, image et paramètres du serveur CMD Sphere.')+
 '<form id="csm-identity" class="csm-form"><div class="csm-icon-picker"><div class="csm-icon-preview">'+gicon()+'</div><div><b>Icône du serveur</b><p>Format rond, image entière visible</p><label for="csm-icon-input" class="csm-btn">Changer l’icône</label><input id="csm-icon-input" type="file" accept="image/jpeg,image/png,image/webp" hidden '+(ctx.owner?'':'disabled')+'></div></div>'+
 field('Nom du serveur','name',g.name,'required maxlength="100" '+(ctx.owner?'':'disabled'))+
 '<label class="csm-field">Description<textarea name="description" maxlength="1000" '+(ctx.owner?'':'disabled')+'>'+escapeHtml(g.server_description||'')+'</textarea></label>'+
 '<label class="csm-field">Notifications par défaut<select name="defaultNotifications" '+(ctx.owner?'':'disabled')+'><option value="mentions" '+(g.default_notifications==='all'?'':'selected')+'>Mentions uniquement</option><option value="all" '+(g.default_notifications==='all'?'selected':'')+'>Tous les messages</option></select></label>'+
 '<label class="csm-check"><input name="isPublic" type="checkbox" '+(g.is_public?'checked':'')+' '+(ctx.owner?'':'disabled')+'>Serveur visible dans Découvrir</label>'+
 '<label class="csm-check"><input name="welcomeMessage" type="checkbox" '+(g.welcome_message===false?'':'checked')+' '+(ctx.owner?'':'disabled')+'>Activer le message de bienvenue</label>'+
 (ctx.owner?'<button type="submit" class="csm-btn primary">Enregistrer les modifications</button>':info('Seul le propriétaire peut modifier l’identité du serveur.'))+'</form>'+info(note())+(isNative()?(ctx.owner?'<section class="csm-server-lifecycle"><h3>Propriété du serveur</h3><p>Tu disposes de tous les droits sur ce serveur. Tu peux attribuer des rôles à ton propre compte, transférer la propriété ou supprimer uniquement ce serveur CMD Sphere.</p><div class="csm-actions">'+btn('Transférer la propriété','transfer-guild')+btn('Supprimer ce serveur','delete-guild','danger')+'</div><div id="csm-transfer-ui" aria-live="polite"></div></section>':'<section class="csm-server-lifecycle"><h3>Quitter le serveur</h3><p>Tu peux quitter ce serveur sans supprimer les messages ni les comptes des autres membres.</p>'+btn('Quitter ce serveur','leave-guild','danger')+'</section>'):'');
}
function options(chosen,arr){return arr.map(([value,label])=>'<option value="'+escapeHtml(value)+'" '+(String(value)===String(chosen)?'selected':'')+'>'+escapeHtml(label)+'</option>').join('')}
const types=[['text','# Texte'],['voice','🔊 Vocal'],['announcement','📢 Annonces'],['forum','🗂️ Forum'],['category','📁 Catégorie']];
function chanItem(c){
 const ico=c.type==='category'?'📁':c.type==='voice'?'🔊':c.type==='forum'?'🗂️':'#';
 return '<div class="csm-line"><span>'+ico+'</span><div><strong>'+escapeHtml(c.name)+'</strong><small>'+escapeHtml(c.topic||c.type||'')+'</small></div>'+(canEditChannels()?'<button type="button" data-csm-edit-channel="'+escapeHtml(c.id)+'" class="csm-btn">Modifier</button>':'')+'</div>';
}
function channels(){
 const all=ctx.data.channels||[],cats=all.filter(x=>x.type==='category'),rooms=all.filter(x=>x.type!=='category');
 const create=canEditChannels()?'<form id="csm-create-channel" class="csm-form csm-sub"><h3>Créer un salon ou une catégorie</h3>'+field('Nom','name','','required maxlength="100"')+'<label class="csm-field">Type<select name="type">'+options('text',types)+'</select></label><label class="csm-field">Catégorie<select name="parentId">'+options('',[['','Aucune'],...cats.map(x=>[x.id,x.name])])+'</select></label><button type="submit" class="csm-btn primary">Créer</button></form>':info('Gestion indisponible : droits insuffisants ou bot non installé.');
 return intro('Catégories et salons','Créer, renommer, classer et gérer les salons.')+(ctx.source&&isNative()?'<div class="csm-actions">'+btn('↻ Synchroniser depuis la plateforme liée','sync-native','primary')+btn('Sauvegarde des messages accessibles','mirror-history')+'</div>':'')+create+'<div id="csm-channel-editor"></div><div class="csm-lines">'+cats.map(c=>'<section><div class="csm-parent">'+chanItem(c)+'</div>'+rooms.filter(x=>String(x.source_parent_id||x.parentId||'')===String(c.source_channel_id||c.id)).map(chanItem).join('')+'</section>').join('')+rooms.filter(x=>!x.source_parent_id&&!x.parentId).map(chanItem).join('')+(all.length?'':info('Aucun salon synchronisé.'))+'</div>'+info(note());
}
/* Discord-style permission categories; CMD Hosting remains a separate owner-controlled server permission. */
const permissionGroups=[
 ['Générales',[['viewChannels','Voir les salons'],['manageChannels','Gérer les salons'],['manageRoles','Gérer les rôles'],['manageGuild','Gérer le serveur'],['viewAuditLog',"Voir le journal d'audit"],['manageWebhooks','Gérer les webhooks'],['manageEmojisAndStickers','Gérer les expressions'],['manageEvents','Gérer les événements'],['createInstantInvite','Créer des invitations'],['administrator','Administrateur']]],
 ['Membres',[['kickMembers','Expulser des membres'],['banMembers','Bannir des membres'],['moderateMembers','Exclure temporairement des membres'],['changeNickname','Modifier son pseudo'],['manageNicknames','Gérer les pseudos']]],
 ['Salons textuels',[['sendMessages','Envoyer des messages'],['sendTTSMessages','Envoyer des messages de synthèse vocale'],['manageMessages','Gérer les messages'],['embedLinks','Intégrer des liens'],['attachFiles','Joindre des fichiers'],['readHistory',"Voir l'historique des messages"],['mentionEveryone','Mentionner @everyone et tous les rôles'],['useExternalEmojis','Utiliser des emojis externes'],['useExternalStickers','Utiliser des stickers externes'],['addReactions','Ajouter des réactions'],['createPublicThreads','Créer des fils publics'],['createPrivateThreads','Créer des fils privés'],['sendMessagesInThreads','Envoyer des messages dans les fils'],['manageThreads','Gérer les fils'],['sendVoiceMessages','Envoyer des messages vocaux'],['sendPolls','Créer des sondages']]],
 ['Salons vocaux',[['connect','Se connecter'],['speak','Parler'],['stream','Vidéo'],['useVAD','Utiliser la détection de voix'],['prioritySpeaker','Parole prioritaire'],['muteMembers','Rendre des membres muets'],['deafenMembers','Rendre des membres sourds'],['moveMembers','Déplacer des membres'],['useSoundboard','Utiliser la table de mixage'],['useExternalSounds','Utiliser des sons externes']]],
 ['Applications et événements',[['useApplicationCommands','Utiliser les commandes des applications'],['createEvents','Créer des événements'],['manageEvents','Gérer les événements'],['requestToSpeak','Demander à prendre la parole']]]
];
function roleEditor(role){
 const p=role?.permissions&&typeof role.permissions==='object'?role.permissions:{};
 return '<form id="csm-role-form" class="csm-form csm-sub"><h3>'+(role?'Modifier le rôle':'Créer un rôle')+'</h3>'+field('Nom','name',role?.name||'','required maxlength="100"')+
 '<label class="csm-field">Couleur<input type="color" name="color" value="'+(/^#[0-9a-f]{6}$/i.test(String(role?.color||''))?role.color:'#5865f2')+'"></label>'+
 '<label class="csm-check"><input type="checkbox" name="hoist" '+(role?.hoist?'checked':'')+'>Afficher séparément</label>'+
 '<label class="csm-check"><input type="checkbox" name="mentionable" '+(role?.mentionable?'checked':'')+'>Autoriser les mentions</label>'+
 permissionGroups.map(([group,items])=>'<h4>'+group+'</h4>'+items.map(([key,label])=>'<label class="csm-check"><input type="checkbox" data-csm-permission="'+key+'" '+(p[key]?'checked':'')+'>'+label+'</label>').join('')).join('')+
 '<h4>CMD Hosting — permission supplémentaire</h4><label class="csm-check"><input type="checkbox" data-csm-hosting-permission '+(role&&hostingRoleData?.roles?.some(r=>String(r.id)===String(role.id)&&r.enabled)?'checked':'')+' '+(!role||!ctx.owner?'disabled':'')+'>Gérer le serveur CMD Hosting associé (démarrer, arrêter, redémarrer)</label><p class="csm-info">Accès accordé uniquement aux membres auxquels le propriétaire attribue ce rôle. Aucun accès à la facturation ou aux autres serveurs.</p>'+

 '<div class="csm-actions"><button type="submit" class="csm-btn primary">Enregistrer</button>'+(role&&role.name!=='@everyone'?btn('Supprimer','delete-role','danger'):'')+btn('Annuler','cancel-role')+'</div></form>';
}
function roles(){
 const all=ctx.data.roles||[];
 return intro('Rôles','Crée des rôles personnalisés, règle leurs permissions et attribue plusieurs rôles par membre.')+(canEditRoles()?btn('＋ Nouveau rôle','new-role','primary'):'')+'<div id="csm-role-editor"></div><div class="csm-lines">'+all.map(role=>'<div class="csm-line"><i class="csm-role-color" style="background:'+( /^#[0-9a-f]{6}$/i.test(String(role.color||''))?role.color:'#5865f2')+'"></i><div><strong>'+escapeHtml(role.name)+'</strong><small>Position '+escapeHtml(role.position||0)+'</small></div>'+(canEditRoles()?'<button type="button" data-csm-edit-role="'+escapeHtml(role.id)+'" class="csm-btn">Modifier et attribuer</button>':'')+'</div>').join('')+'</div>'+(isNative()&&ctx.owner?'<section id="csm-hosting-role-permissions" aria-live="polite"><h3>🎮 Accès CMD Hosting</h3>'+info('Chargement des autorisations…')+'</section>':'')+info(note());
}
function other(){
 if(currentTab==='invites')return intro('Invitations','Fais rejoindre les membres à ton serveur.')+(isNative()?'<div class="csm-invite">'+escapeHtml(ctx.data.inviteUrl||'')+'</div>'+btn('Copier le lien','copy-invite','primary'):info('Les invitations du service connecté sont générées depuis la plateforme liée.'))+toDiscord();
 if(currentTab==='integrations')return intro('Intégrations','Bots et webhooks du serveur.')+'<div class="csm-actions">'+(isNative()?'<a class="csm-btn primary" href="/apps/directory">＋ Inviter un bot CMD Sphere</a><a class="csm-btn" href="/developers">CMD Sphere Développeur</a>':'')+btn('Voir les bots','bots','primary')+btn('Tous mes webhooks externes','all-webhooks')+(isNative()&&ctx.source&&canEdit()?btn('Récupérer bots et webhooks ici','import-integrations','primary'):'')+'</div>'+(isNative()?'<section id="csm-installed-cmd-apps" aria-live="polite">'+info('Chargement des bots CMD Sphere installés…')+'</section>':'')+'<section id="csm-native-webhooks" aria-live="polite"></section><section id="csm-webhooks" aria-live="polite">'+info('Chargement des webhooks…')+'</section>';
 if(currentTab==='appearance')return intro('Personnalisation','Icône, description et identité du serveur.')+btn('Modifier la vue d’ensemble','overview','primary')+(isNative()?'<a class="csm-btn" href="/profile?server='+safe(id())+'">Profil du serveur ↗</a>':'')+toDiscord();
 if(currentTab==='members')return intro('Membres','Membres réellement inscrits sur ce serveur et rôles CMD Sphere associés.')+
  (isNative()?'<div id="csm-native-members" aria-live="polite">'+info('Chargement des membres du serveur CMD Sphere…')+'</div>':info('Les membres du serveur externe doivent être gérés sur sa plateforme.')+toDiscord());
 if(currentTab==='security')return intro('Permissions et sécurité','Permissions d’accès et sécurité du serveur.')+btn('Configurer les rôles','roles','primary')+info('Pour les permissions propres à un salon, ouvre la rubrique Salons et catégories. Les paramètres de sécurité externes restent dans la plateforme liée.')+toDiscord();
 if(currentTab==='automod')return intro('AutoMod','Modération automatisée du serveur.')+info('L’édition des règles AutoMod externe n’est pas accessible depuis ce panneau.')+toDiscord();
 return intro('Journal d’audit','Suivi de la configuration et des événements.')+info('Le journal d’audit externe ne peut pas être modifié dans CMD Sphere.')+toDiscord();
}

async function loadHostingRoles(){
 const area=$('#csm-hosting-role-permissions');if(!area||!ctx?.owner||!isNative())return;
 const guildId=id();area.textContent="Chargement des autorisations…";
 try{
  hostingRoleData=await request('/api/cmd-hosting/roles?guildId='+safe(guildId));
  if(!area.isConnected||guildId!==id())return;
  area.replaceChildren();
  const heading=document.createElement('h3');heading.textContent='🎮 Gestion CMD Hosting';area.append(heading);
  const note=document.createElement('p');note.textContent='Comme dans les rôles CMD Sphere : ouvre un rôle, règle ses permissions et attribue-le aux membres. La permission CMD Hosting est réservée au propriétaire du serveur.';area.append(note);
  const newIds=new Set((hostingRoleData.roles||[]).map(r=>String(r.id)));
  if((ctx.data.roles||[]).some(r=>newIds.has(String(r.id)))===false&&newIds.size){
   // The default Hosting role is created on first visit, so refresh the server's role list once.
   const fresh=await request('/api/native/guild/'+safe(guildId));
   ctx.data.roles=fresh.roles||ctx.data.roles;
   if(currentTab==='roles'&&!editing){render();return}
  }
  const selected=(ctx.data.roles||[]).find(r=>r.id===editing?.id);
  if(selected){const check=$('#csm-role-editor [data-csm-hosting-permission]');if(check)check.checked=!!hostingRoleData.roles?.find(r=>String(r.id)===String(selected.id))?.enabled;renderHostingRoleMembers(selected)}
 }catch(e){area.textContent='Rôles CMD Hosting indisponibles : '+e.message}
}
function renderHostingRoleMembers(role){
 const parent=$('#csm-role-editor');if(!parent||!role||!ctx?.owner||!hostingRoleData)return;
 parent.querySelector('.csm-hosting-role-members')?.remove();
 const group=document.createElement('section');group.className='csm-hosting-role-members';group.style.cssText='padding:12px;margin:12px 0;border:1px solid #ffffff26;border-radius:12px';
 const title=document.createElement('h4');title.textContent='Membres ayant ce rôle';group.append(title);
 const text=document.createElement('p');text.textContent='Le créateur peut également porter ce rôle sans perdre ses droits de propriétaire. Il peut l’attribuer aux autres membres.';group.append(text);
 for(const member of hostingRoleData.members||[]){
  // Owner roles are cosmetic; creator rights remain independent.
  const label=document.createElement('label');label.className='csm-check';
  const checkbox=document.createElement('input');checkbox.type='checkbox';
  checkbox.checked=(hostingRoleData.grants||[]).some(g=>String(g.role_id)===String(role.id)&&String(g.user_id)===String(member.user_id));
  label.append(checkbox,document.createTextNode(member.name));
  checkbox.onchange=async()=>{const enabled=checkbox.checked;checkbox.disabled=true;
   try{await request('/api/cmd-hosting/roles?guildId='+safe(id()),{kind:'member',roleId:role.id,userId:member.user_id,enabled});
    if(enabled)hostingRoleData.grants.push({role_id:role.id,user_id:member.user_id});
    else hostingRoleData.grants=hostingRoleData.grants.filter(g=>String(g.role_id)!==String(role.id)||String(g.user_id)!==String(member.user_id));
    notify('Attribution du rôle enregistrée');
   }catch(e){checkbox.checked=!enabled;notify(e.message,false)}finally{checkbox.disabled=false}
  };group.append(label);
 }
 parent.append(group);
}


const csmRoleStyle=document.createElement('style');csmRoleStyle.textContent="\n/* Native role editor improvements (safe for iPhone and desktop). */\n.csm-role-member-assignments{margin:18px 0 26px;border:1px solid #9874c56b;border-radius:17px;padding:16px;background:#251d31}\n.csm-role-member-assignments h4{font-size:17px;margin:0 0 9px}\n.csm-member-search{width:100%;max-width:100%;padding:13px;background:#17141d;border:1px solid #ffffff4d;color:#fff;border-radius:12px;font:16px system-ui}\n.csm-role-member-list,.csm-members-list{display:grid;gap:5px;margin-top:12px}\n.csm-member-row{display:flex;align-items:center;gap:12px;padding:12px 9px;min-width:0;min-height:62px;border-radius:11px;background:#ffffff09;overflow-wrap:anywhere}\n.csm-member-row[hidden]{display:none!important}\n.csm-member-row>input[type=checkbox]{width:22px;height:22px;flex:none;margin-left:auto;accent-color:#9462db}\n.csm-member-avatar{width:42px;height:42px;flex:none;border-radius:50%;object-fit:cover}\n.csm-member-placeholder{display:grid;place-items:center;background:#44334f;font-size:23px}\n.csm-member-name,.csm-member-detail{flex:1;min-width:0;font-weight:750}\n.csm-member-detail small,.csm-member-status{display:block;font-size:12px;color:#d1b9e4;font-weight:400;overflow-wrap:anywhere}\n.csm-role-member-assignments .csm-lead{margin:0 0 12px}\n@media(max-width:460px){.csm-role-member-assignments{padding:12px}.csm-member-row{gap:7px}.csm-member-avatar{width:36px;height:36px}}\n";document.head.append(csmRoleStyle);
/* CMD Sphere native member assignments: owner-authorized, never alter a linked Discord guild. */
async function fetchNativeMemberCache(force=false){
 if(!isNative())return {members:[]};
 if(!nativeMemberCache||force)nativeMemberCache=await request('/api/native/members?guildId='+safe(id()));
 return nativeMemberCache;
}
function roleLabels(member){
 return (member.role_ids||[]).map(roleId=>(ctx.data.roles||[]).find(r=>String(r.id)===String(roleId))?.name).filter(Boolean);
}
function memberAvatarNode(member){
 const value=String(member.avatar||'');
 if(/^https:\/\//i.test(value)||/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value)){
  const img=document.createElement('img');img.src=value;img.alt='';img.loading='lazy';img.className='csm-member-avatar';return img;
 }
 const icon=document.createElement('span');icon.className='csm-member-avatar csm-member-placeholder';icon.textContent='👤';return icon;
}
async function renderRoleAssignments(role){
 const host=$('#csm-role-member-assignments');if(!host||!ctx?.owner||!isNative()||!role||role.name==='@everyone')return;
 const currentGuild=id();host.textContent='Chargement des membres du rôle…';
 try{
  const data=await fetchNativeMemberCache();
  if(!host.isConnected||currentGuild!==id())return;
  const members=data.members||[];
  host.replaceChildren();
  const title=document.createElement('h4');title.textContent='Attribuer ce rôle aux membres';host.append(title);
  const help=document.createElement('p');help.className='csm-lead';help.textContent='Sélectionne les membres à ajouter ou à retirer. La modification est enregistrée sur CMD Sphere, sans modifier Discord.';host.append(help);
  if(!members.length){
   const empty=document.createElement('p');empty.className='csm-info';empty.textContent='Aucun autre membre dans ce serveur. Une personne doit accepter ton invitation et rejoindre ce serveur CMD Sphere avant de recevoir un rôle.';host.append(empty);
   const invite=document.createElement('button');invite.type='button';invite.className='csm-btn primary';invite.textContent='🔗 Inviter quelqu’un';
   invite.onclick=()=>{const gid=id();if(typeof window.cmdOpenServerInvites==='function'){close();void window.cmdOpenServerInvites(gid)}else{currentTab='invites';editing=null;render()}};
   host.append(invite);
   return;
  }
  const search=document.createElement('input');search.type='search';search.placeholder='Rechercher un membre';search.className='csm-member-search';search.setAttribute('aria-label','Rechercher un membre');host.append(search);
  const list=document.createElement('div');list.className='csm-role-member-list';host.append(list);
  let ownerSelfButton=null;
  for(const member of members){
   const row=document.createElement('label');row.className='csm-member-row';
   row.append(memberAvatarNode(member));
   const name=document.createElement('span');name.className='csm-member-name';name.textContent=(member.display_name||'Membre')+(member.membership_role==='owner'?' · Propriétaire (toi)':'');row.append(name);
   const box=document.createElement('input');box.type='checkbox';box.checked=(member.role_ids||[]).some(x=>String(x)===String(role.id));box.setAttribute('aria-label','Attribuer '+role.name+' à '+(member.display_name||'Membre'));row.append(box);
   const msg=document.createElement('small');msg.className='csm-member-status';row.append(msg);
   box.onchange=async()=>{
    const enabled=box.checked;box.disabled=true;msg.textContent='Enregistrement…';
    try{
     const result=await request('/api/native/roles/assign',{guildId:currentGuild,userId:String(member.user_id),roleId:String(role.id),enabled});
     if(!result.saved)throw Error('Modification non confirmée');
     member.role_ids=result.user?.role_ids||[];
     msg.textContent=enabled?'Ajouté':'Retiré';
    }catch(error){box.checked=!enabled;msg.textContent='Erreur : '+error.message;notify(error.message,false)}
    finally{box.disabled=false;if(member.membership_role==='owner'&&ownerSelfButton){ownerSelfButton.disabled=false;ownerSelfButton.textContent=box.checked?'Retirer ce rôle de mon profil':'M’attribuer ce rôle'}}
   };
   list.append(row);
   if(member.membership_role==='owner'){
    ownerSelfButton=document.createElement('button');ownerSelfButton.type='button';ownerSelfButton.className='csm-btn primary';
    ownerSelfButton.textContent=box.checked?'Retirer ce rôle de mon profil':'M’attribuer ce rôle';
    ownerSelfButton.onclick=()=>{if(box.disabled)return;ownerSelfButton.disabled=true;box.click()};
    host.insertBefore(ownerSelfButton,search);
   }
  }
  search.oninput=()=>{const term=search.value.trim().toLocaleLowerCase();list.querySelectorAll('.csm-member-row').forEach(row=>{row.hidden=!row.querySelector('.csm-member-name').textContent.toLocaleLowerCase().includes(term)})};
 }catch(error){host.textContent='Impossible de charger les membres : '+error.message}
}
async function renderNativeMembersTab(){
 const host=$('#csm-native-members');if(!host||!isNative())return;
 const guild=id();host.textContent='Chargement des membres…';
 try{
  const data=await fetchNativeMemberCache(true);
  if(!host.isConnected||id()!==guild)return;
  host.replaceChildren();
  const all=Array.isArray(data.members)?data.members:[];
  const summary=document.createElement('p');summary.className='csm-lead';summary.textContent=all.length+' membre'+(all.length>1?'s':'')+' sur ce serveur.';host.append(summary);
  if(all.length<=1){const notice=document.createElement('p');notice.className='csm-info';notice.textContent='Ton serveur ne compte pas encore d’autre membre. Invite une personne et attends son arrivée avant de lui attribuer un rôle.';host.append(notice);const invite=document.createElement('button');invite.type='button';invite.className='csm-btn primary';invite.textContent='🔗 Inviter des personnes';invite.onclick=()=>{const gid=id();if(typeof window.cmdOpenServerInvites==='function'){close();void window.cmdOpenServerInvites(gid)}else{currentTab='invites';editing=null;render()}};host.append(invite)}
  if(ctx.owner){
   const link=document.createElement('button');link.type='button';link.className='csm-btn primary';link.textContent='Gérer les rôles et leurs membres';link.onclick=()=>{currentTab='roles';render()};host.append(link);
  }
  const list=document.createElement('div');list.className='csm-members-list';host.append(list);
  for(const member of all){
   const row=document.createElement('div');row.className='csm-member-row';
   row.append(memberAvatarNode(member));
   const details=document.createElement('div');details.className='csm-member-detail';
   const strong=document.createElement('strong');strong.textContent=member.display_name||'Membre';details.append(strong);
   const small=document.createElement('small');small.textContent=[member.membership_role==='owner'?'Propriétaire':member.membership_role==='admin'?'Administrateur':'Membre',...roleLabels(member)].join(' · ');details.append(small);row.append(details);
   list.append(row);
  }
 }catch(error){host.textContent='Liste des membres inaccessible : '+error.message}
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
 if(currentTab==='roles'&&isNative()&&ctx.owner)loadHostingRoles();
  if(currentTab==='members'&&isNative())void renderNativeMembersTab();
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
   '<p class="csm-lead">Ces bots sont autorisés sur CMD Sphere sans modifier la plateforme liée. Un bot doit utiliser l’API CMD Sphere pour répondre.</p>'+
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
    if(!confirm('Retirer « '+app.name+' » de ce serveur CMD Sphere ? Les permissions de cette application seront révoquées immédiatement, sans modifier la plateforme liée.'))return;
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
  box.innerHTML='<h3>Webhooks CMD Sphere indépendants</h3>'+info('Envoie des messages directement ici, sans compte la plateforme liée. Format JSON : content et embeds. Les outils externes doivent accepter une URL de webhook personnalisée.')+'<div class="csm-lines">'+(data.webhooks||[]).map(w=>'<div class="csm-line"><span>🪝</span><div><strong>'+escapeHtml(w.name)+'</strong><small># '+escapeHtml(w.channelName)+'</small></div><button type="button" class="csm-btn danger" data-delete-native-webhook="'+escapeHtml(w.id)+'">Supprimer</button></div>').join('')+'</div>'+(canEdit()&&rooms.length?'<form id="csm-native-webhook-form" class="csm-form csm-sub"><h3>Créer ici</h3>'+field('Nom','name','CMD Webhook','required maxlength="80"')+'<label class="csm-field">Salon CMD Sphere<select name="channelId">'+rooms.map(c=>'<option value="'+escapeHtml(c.id)+'"># '+escapeHtml(c.name)+'</option>').join('')+'</select></label><button class="csm-btn primary">Créer le webhook CMD Sphere</button></form><div id="csm-native-webhook-result"></div>':info('Il faut un salon texte et les droits de gestion pour créer un webhook.'));
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
 if(!ctx.source){box.innerHTML=info('Ce serveur CMD Sphere n’est pas lié à la plateforme liée. Les webhooks importés apparaissent dans leur serveur importé.');return}
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
   return '<div class="csm-line"><span>🪝</span><div><strong>'+escapeHtml(w.name)+'</strong><small># '+escapeHtml(channel)+(local?' · salon associé dans CMD Sphere':' · salon externe à synchroniser')+'</small><small>'+escapeHtml(w.creator?.username?'Créé par '+w.creator.username:'Créateur non fourni')+(w.mine?' · ton webhook':'')+'</small></div><a class="csm-btn" target="_blank" rel="noopener noreferrer" href="https://discord.com/channels/'+safe(context.source)+'/'+safe(w.channelId||'')+'">Voir le salon ↗</a></div>';
  }).join('');
  const botHtml=detected.map(b=>'<div class="csm-line">'+(/^https:\/\//.test(String(b.avatar||''))?'<img class="csm-bot-icon" src="'+escapeHtml(b.avatar)+'" alt="">':'<span>🤖</span>')+'<div><strong>'+escapeHtml(b.username||b.name||b.id)+'</strong><small>Détecté sur la plateforme liée · connexion CMD Sphere non vérifiée</small><small>ID '+escapeHtml(b.id)+'</small></div></div>').join('');
  box.innerHTML='<h3>Bots du serveur externe</h3><div class="csm-lines">'+(botHtml||info(botResult.status==='rejected'?'Bots inaccessibles : '+botResult.reason.message:'Aucun bot accessible.'))+'</div>'+info('Les réglages existants restent sur la plateforme liée ou chez le fournisseur du bot. Un bot tiers doit proposer une API compatible pour fonctionner dans CMD Sphere.')+'<h3>Webhooks externes existants</h3>'+info('Les webhooks restent associés à leur serveur et à leur salon externes d’origine. Ils sont affichés ici sans les recréer ni les déplacer.')+'<div class="csm-lines">'+(rows||info('Aucun webhook accessible sur ce serveur.'))+'</div>'+(data.errors?.length?info('Certaines sources sont inaccessibles : '+data.errors.map(e=>e.botName+': '+e.error).join(' · ')):'')+
   (canEdit()&&rooms.length&&bot?'<form id="csm-create-webhook" class="csm-form csm-sub"><h3>Créer un webhook sur la plateforme liée</h3>'+field('Nom','name','CMD Webhook','required maxlength="80"')+'<label class="csm-field">Salon<select name="channelId" required>'+rooms.map(c=>'<option value="'+escapeHtml(c.source_channel_id||c.id)+'"># '+escapeHtml(c.name)+'</option>').join('')+'</select></label><button class="csm-btn primary" type="submit">Créer le webhook</button></form>':info('La création nécessite des droits de gestion, un salon synchronisé et un bot disposant de la permission Gérer les webhooks.'));
  box.querySelector('#csm-create-webhook')?.addEventListener('submit',async e=>{
   e.preventDefault();const form=e.currentTarget,values=new FormData(form),button=form.querySelector('button');
   if(!confirm('Créer le webhook « '+values.get('name')+' » sur le serveur externe « '+context.data.guild.name+' » dans le salon choisi ?'))return;
   button.disabled=true;
   try{await request('/api/dashboard/action',{guildId:context.source,bot,action:'create_webhook',name:values.get('name'),channelId:values.get('channelId')});notify('Webhook créé sur la plateforme liée.');if(ctx===context)await loadWebhooks()}
   catch(err){notify('Création du webhook : '+err.message,false)}finally{button.disabled=false}
  });
 }catch(err){if(box.isConnected&&ctx===context)box.innerHTML=info('Webhooks inaccessibles : '+err.message)}
}

async function open(tab='overview'){
 if(opening)return;
 opening=true;currentTab=tab;editing=null;newIcon=null;nativeMemberCache=null;
 try{
  $('#serverSettingsModal')?.classList.add('on');
  $('#serverSettingsBody').innerHTML='<p class="csm-loading">Chargement des paramètres…</p>';
  await getContext();render();
 }catch(e){notify('Paramètres du serveur : '+e.message,false);close()}finally{opening=false}
}
function close(){$('#serverSettingsModal')?.classList.remove('on','csm-open')}
async function update(){
 nativeMemberCache=null;await getContext();render();
 try{const st=state();if(st?.nativeGuild&&typeof selectNative==='function')await selectNative(st.nativeGuild)}catch{}
}
function requireConfirmation(message){
 if(ctx?.source&&isNative())return confirm('Serveur externe importé : '+message+'\n\nCette action peut aussi modifier le serveur externe si un bot autorisé est connecté. Continuer ?');
 if(ctx?.source&&!isNative())return confirm('Modifier le serveur externe via le bot autorisé ?\n\n'+message);
 return true;
}
async function mutate(action,payload){
 const isChannelAction=['create_category','create_channel','update_channel','delete_channel','set_channel_permissions'].includes(action);
 if(!(isChannelAction?canEditChannels():action.includes('role')?canEditRoles():canEdit()))throw Error('Permissions de gestion manquantes.');
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
 if(role&&isNative()&&ctx.owner){const section=document.createElement('section');section.id='csm-role-member-assignments';section.className='csm-role-member-assignments';box.append(section);void renderRoleAssignments(role)}
 if(role&&ctx.owner&&isNative()){
  const hosting=box.querySelector('[data-csm-hosting-permission]');
  if(hosting){hosting.onchange=async()=>{const enabled=hosting.checked;hosting.disabled=true;
   try{await request('/api/cmd-hosting/roles?guildId='+safe(id()),{kind:'permission',roleId:role.id,enabled});
    const record=hostingRoleData?.roles?.find(r=>String(r.id)===String(role.id));if(record)record.enabled=enabled;
    notify('Permission Gérer CMD Hosting '+(enabled?'activée':'désactivée'));
   }catch(e){hosting.checked=!enabled;notify(e.message,false)}finally{hosting.disabled=false}
  }}
  if(hostingRoleData)renderHostingRoleMembers(role);
 }

 box.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget,d=new FormData(f),permissions={};
  f.querySelectorAll('[data-csm-permission]').forEach(v=>{permissions[v.dataset.csmPermission]=v.checked});
  try{await mutate(role?'update_role':'create_role',{...Object.fromEntries(d.entries()),...(role?{roleId:role.id}:{}),permissions,hoist:d.has('hoist'),mentionable:d.has('mentionable')})}catch(e){notify(e.message,false)}
 });
 box.querySelectorAll('[data-csm-action]').forEach(e=>e.addEventListener('click',()=>action(e.dataset.csmAction)));
 box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function submitGuildLifecycle(kind,targetUserId=''){
 if(!isNative()||!ctx?.data?.guild?.id)return notify('Choisis un serveur CMD Sphere.',false);
 const gid=id(),name=String(ctx.data.guild.name||''),owner=!!ctx.owner;
 if(kind==='delete'&&!owner)return notify('Seul le propriétaire peut supprimer le serveur.',false);
 if(kind==='transfer'&&!owner)return notify('Seul le propriétaire peut transférer le serveur.',false);
 if(kind==='leave'&&owner)return notify('Transfère la propriété avant de quitter ton serveur.',false);
 let confirmName='';
 if(kind==='delete'||kind==='transfer'){
  const explanation=kind==='delete'?
    'SUPPRESSION DÉFINITIVE de ce serveur CMD Sphere, ses salons, rôles et messages locaux. Aucun serveur Discord externe ne sera supprimé.':
    'Tu céderas tous les droits de propriétaire au membre choisi. Cette action ne peut pas être annulée par ton compte.';
  const typed=window.prompt(explanation+'\n\nSaisis exactement le nom du serveur pour confirmer :\n'+name);
  if(typed===null)return;
  confirmName=typed;
  if(confirmName!==name)return notify('Le nom de confirmation ne correspond pas.',false);
 }else if(!window.confirm('Quitter « '+name+' » ? Tu perdras l’accès à ce serveur tant que tu n’auras pas reçu une nouvelle invitation.'))return;
 try{
  const result=await request('/api/native/guild-lifecycle',{kind,guildId:gid,confirmName,targetUserId});
  if(!result.ok)throw Error("Action non confirmée");
  close();
  try{sessionStorage.removeItem('cmd-native-last-guild')}catch{}
  location.assign('/dashboard');
 }catch(error){notify('Action impossible : '+error.message,false)}
}
async function openTransferGuild(){
 const box=$('#csm-transfer-ui');if(!box)return;
 box.textContent='Chargement des membres pouvant recevoir la propriété…';
 try{
  const data=await fetchNativeMemberCache(true);
  if(!box.isConnected)return;
  const members=(data.members||[]).filter(m=>m.membership_role!=='owner');
  box.replaceChildren();
  if(!members.length){const p=document.createElement('p');p.className='csm-info';p.textContent='Il faut au moins un autre membre pour transférer la propriété. Invite une personne d’abord.';box.append(p);box.append(newInviteButton());return}
  const label=document.createElement('label');label.className='csm-field';label.textContent='Nouveau propriétaire';
  const select=document.createElement('select');select.setAttribute('aria-label','Sélectionner le nouveau propriétaire');
  for(const member of members){const option=document.createElement('option');option.value=String(member.user_id);option.textContent=member.display_name||'Membre';select.append(option)}
  label.append(select);box.append(label);
  const button=document.createElement('button');button.type='button';button.className='csm-btn danger';button.textContent='Confirmer le transfert';
  button.onclick=async()=>{button.disabled=true;try{await submitGuildLifecycle('transfer',select.value)}finally{button.disabled=false}};
  box.append(button);
 }catch(error){box.textContent='Impossible de charger les membres : '+error.message}
}

async function action(which){
 if(which==='delete-guild'){await submitGuildLifecycle('delete');return}
 if(which==='leave-guild'){await submitGuildLifecycle('leave');return}
 if(which==='transfer-guild'){await openTransferGuild();return}
 if(which==='overview'||which==='channels'||which==='roles'){currentTab=which;editing=null;render();return}
 if(which==='new-role'){if(!canEditRoles())return;if(isNative()){try{await window.cmdOpenRoleWizard({guildId:id(),onDone:async()=>{notify('Rôle créé et enregistré dans CMD Sphere.');await update()}})}catch(e){notify(e.message,false)}return}editing={type:'role',id:null};showRole(null);return}
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
async function menu(){
 document.querySelector("#csm-server-menu")?.remove();
 const selected=state(),native=!!selected?.nativeGuild;
 const guild=selected?.nativeGuild||selected?.guild||ctx?.data?.guild||{};
 const gid=String(guild.id||ctx?.data?.guild?.id||"");
 let verifiedMemberRole="";
 let verifiedGuild=null;
 // Always re-check native membership on the server. Do not trust a cached owner flag
 // to show destructive / owner-only actions in the mobile menu.
 if(native&&gid){
  try{
   const detail=await request('/api/native/guild/'+safe(gid));
   if(String(state()?.nativeGuild?.id||"")!==gid)return;
   verifiedMemberRole=String(detail?.member?.membership_role||"");
   verifiedGuild=detail?.guild||null;
  }catch(error){
   console.warn('[CMD Sphere] Menu : droits non vérifiés :',error?.message||error);
  }
 }
 const displayGuild=verifiedGuild||guild;
 const code=encodeURIComponent(gid),name=String(displayGuild.name||"Serveur CMD Sphere");
 const icon=String(displayGuild.icon||""),banner=String(displayGuild.server_banner||"");
 const count=Math.max(0,Number(displayGuild.member_count??displayGuild.memberCount??ctx?.data?.guild?.member_count??0)||0);
 const role=native?verifiedMemberRole:String(guild.membership_role||((ctx?.data?.guild?.id===gid)?ctx?.data?.member?.membership_role:"")||"");
 const admin=native?["owner","admin"].includes(role):["owner","admin"].includes(role)||((ctx?.data?.guild?.id===gid)&&!!ctx?.admin);
 const root=document.createElement("div");root.id="csm-server-menu";
 const img=/^(https?:\/\/|data:image\/)/i.test(icon)?'<img class="csm-server-menu-icon" src="'+escapeHtml(icon)+'" alt="">':'<span class="csm-server-menu-icon" aria-hidden="true">🏠</span>';
 const photo=/^(https?:\/\/|data:image\/)/i.test(banner)?'<div class="csm-server-cover" style="background-image:linear-gradient(#1e1d25a0,#1e1d25ee),url('+escapeHtml(banner)+')"></div>':'';
 const shortcut=[["boost","◈","Boost"],["invite","♙＋","Inviter"],["notifications","♧","Notifications"],["overview","⚙","Paramètres"]]
 .map(([key,ico,label])=>'<button type="button" data-csm-quick="'+key+'"><b>'+ico+'</b><small>'+label+'</small></button>').join("");
 const row=(key,ico,label,extra="")=>'<button type="button" data-csm-quick="'+key+'"><span class="csm-server-row-ico">'+ico+'</span><span class="csm-server-row-name">'+label+'</span>'+extra+'<span class="csm-server-chevron">›</span></button>';
 root.innerHTML='<div class="csm-server-menu-shade"></div><section class="csm-server-menu-body" role="dialog" aria-modal="true" aria-label="Menu du serveur">'+
  '<div class="csm-server-menu-handle"></div>'+photo+
  '<div class="csm-server-menu-server">'+img+'<h3>'+escapeHtml(name)+'</h3>'+
  '<p><span class="csm-server-kind">'+(displayGuild.is_public?'✦ Serveur de communauté':'🔒 Serveur privé')+'</span> · '+count+' membres</p></div>'+
  '<div class="csm-server-menu-quick">'+shortcut+'</div>'+
  '<div class="csm-server-menu-list">'+row("markread","✓","Marquer comme lu")+row("search","⌕","Chercher des salons")+row("events","◷","Événements du serveur")+'</div>'+
  (admin?'<div class="csm-server-menu-list">'+row("create-channel","＋","Créer un salon")+row("create-category","▤","Créer une catégorie")+row("create-event","▢","Créer un événement")+'</div>':'')+
  (gid?'<div class="csm-server-menu-list"><a href="/profile?server='+code+'"><span class="csm-server-row-ico">♙</span><span class="csm-server-row-name">Modifier le profil par serveur</span><span class="csm-server-chevron">›</span></a>'+row("hosting","🎮","État du serveur CMD Hosting")+row("showchannels","☷","Montrer tous les salons")+'</div>':'')+
  (gid&&native?'<div class="csm-server-menu-list">'+(role==='owner'?row('ownership','👑','Gérer la propriété')+row('delete-guild','🗑️','Supprimer mon serveur'):role?row('leave-guild','↪','Quitter ce serveur'):'<p class="csm-server-menu-permission-note" role="status">Droits du serveur indisponibles. Actualise et réessaie.</p>')+'</div>':'')+
  '<button type="button" class="csm-server-menu-cancel" data-csm-quick="close">Fermer</button>'+
  '<p id="csmMenuStatus" role="status" aria-live="polite"></p></section>';
 document.body.append(root);document.body.classList.add("csm-server-menu-open");
 const shut=()=>{root.remove();document.body.classList.remove("csm-server-menu-open")};
 root.querySelector(".csm-server-menu-shade").onclick=shut;
 const hostingBtn=root.querySelector('[data-csm-quick="hosting"]');
 if(hostingBtn){hostingBtn.hidden=true;
  fetch('/api/cmd-hosting/association?guildId='+code,{credentials:'same-origin',cache:'no-store'}).then(async resp=>{if(resp.ok){const data=await resp.json();if(data.canManage!==false&&hostingBtn.isConnected)hostingBtn.hidden=false}}).catch(()=>{});
 }
 const status=root.querySelector("#csmMenuStatus");
 root.querySelectorAll("[data-csm-quick]").forEach(button=>button.onclick=async()=>{
  const key=button.dataset.csmQuick;
  if(key==="close"){shut();return}
  if(key==="ownership"){shut();await open("overview");return}
  if(key==="delete-guild"){shut();try{await getContext();await submitGuildLifecycle("delete")}catch(e){notify(e.message,false)}return}
  if(key==="leave-guild"){shut();try{await getContext();await submitGuildLifecycle("leave")}catch(e){notify(e.message,false)}return}
  if(key==="hosting"){shut();if(typeof window.cmdOpenHostingPanel==="function")window.cmdOpenHostingPanel(gid);else notify("Gestion CMD Hosting indisponible, actualise la page",false);return;}
  if(key==="boost"){shut();location.assign(gid?"/server-boosts/"+code:"/stars");return}
  if(key==="invite"){
   shut();if(gid&&typeof window.cmdOpenServerInvites==="function")await window.cmdOpenServerInvites(gid);
   else await open("invites");return;
  }
  if(key==="notifications"){
   if(!gid){status.textContent="Choisis un serveur CMD Sphere.";return}
   root.querySelector(".csm-server-menu-body").scrollTop=0;
   const pane=document.createElement("div");pane.className="csm-server-menu-action-pane";
   pane.innerHTML='<h3>Notifications du serveur</h3><p>Personnalise les notifications de ce serveur uniquement.</p>'+
    '<label><input type="radio" name="csmNotifyMode" value="all"> Tous les messages</label>'+
    '<label><input type="radio" name="csmNotifyMode" value="mentions"> Mentions uniquement</label>'+
    '<label><input type="radio" name="csmNotifyMode" value="none"> Aucune notification</label>'+
    '<button type="button" class="csm-server-pane-save">Enregistrer</button><button type="button" class="csm-server-pane-back">Retour</button>';
   root.querySelector(".csm-server-menu-body").append(pane);
   pane.querySelector(".csm-server-pane-back").onclick=()=>pane.remove();
   try{
    const r=await fetch("/api/native/notifications?guildId="+code,{credentials:"same-origin"});
    const d=await r.json();if(!r.ok)throw Error(d.error||"Notification indisponible");
    const value=d.mode||"mentions",radio=pane.querySelector('input[value="'+value+'"]');if(radio)radio.checked=true;
   }catch(e){status.textContent=e.message}
   pane.querySelector(".csm-server-pane-save").onclick=async()=>{
    const mode=pane.querySelector('input[name="csmNotifyMode"]:checked')?.value||"mentions";
    try{
     const r=await fetch("/api/native/notifications",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({guildId:gid,mode})});
     const d=await r.json();if(!r.ok)throw Error(d.error||"Enregistrement impossible");
     status.textContent="Préférences du serveur enregistrées.";pane.remove();
     if(mode!=="none"&&"Notification" in window&&Notification.permission==="default")await Notification.requestPermission();
    }catch(e){status.textContent=e.message}
   };
   return;
  }
  if(key==="search"){shut();let input=document.querySelector("#cmdChannelSearch");if(input){input.focus();input.scrollIntoView({block:"nearest"})}else await open("channels");return}
  if(key==="showchannels"){shut();const panel=document.querySelector("#cmdServerChannels");if(panel){panel.querySelectorAll(".cmd-server-section.collapsed").forEach(s=>s.classList.remove("collapsed"));panel.querySelectorAll('[aria-expanded="false"]').forEach(b=>b.setAttribute("aria-expanded","true"));panel.scrollIntoView({block:"start",behavior:"smooth"})}else await open("channels");return}
  if(key==="markread"){
   if(!gid){status.textContent="Ouvre d'abord un serveur CMD Sphere.";return}
   button.disabled=true;
   try{
    const resp=await fetch("/api/native/mark-all-read",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({guildId:gid})});
    const data=await resp.json();if(!resp.ok)throw Error(data.error||"Impossible de marquer les salons comme lus");
    document.querySelectorAll(".cmd-channel-unread,.cmd-native-unread").forEach(x=>x.remove());
    status.textContent="Tous les salons du serveur sont marqués comme lus.";
   }catch(e){status.textContent=e.message}finally{button.disabled=false}
   return;
  }
  if(key==="events"||key==="create-event"){
   if(!gid){status.textContent="Choisis un serveur CMD Sphere.";return}
   const pane=document.createElement("div");pane.className="csm-server-menu-action-pane";
   pane.innerHTML='<h3>'+(key==="create-event"?"Créer un événement":"Événements du serveur")+'</h3>'+
    '<form id="csmEventForm"'+(key==="create-event"?"":' hidden')+'>'+
    '<label>Titre<input name="title" maxlength="100" required placeholder="Nom de l’événement"></label>'+
    '<label>Date et heure<input name="startsAt" type="datetime-local" required></label>'+
    '<label>Description<input name="description" maxlength="800" placeholder="Informations complémentaires"></label>'+
    '<button type="submit">Créer l’événement</button></form><div class="csm-server-event-list">Chargement…</div>'+
    '<button type="button" class="csm-server-pane-back">Retour</button>';
   root.querySelector(".csm-server-menu-body").append(pane);
   pane.querySelector(".csm-server-pane-back").onclick=()=>pane.remove();
   const refresh=async()=>{
    const r=await fetch("/api/native/events?guildId="+code,{credentials:"same-origin"});
    const d=await r.json();if(!r.ok)throw Error(d.error||"Événements indisponibles");
    const holder=pane.querySelector(".csm-server-event-list");holder.replaceChildren();
    if(!(d.events||[]).length){holder.textContent="Aucun événement programmé.";return}
    for(const event of d.events){
     const row=document.createElement("p");const date=new Date(event.starts_at);
     row.textContent=(event.title||"Événement")+" · "+(Number.isNaN(date.getTime())?"Date inconnue":date.toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"}));
     holder.append(row);
    }
   };
   try{await refresh()}catch(e){status.textContent=e.message}
   pane.querySelector("#csmEventForm").onsubmit=async(e)=>{
    e.preventDefault();
    const data=new FormData(e.currentTarget),date=new Date(String(data.get("startsAt")||""));
    if(!Number.isFinite(date.getTime())){status.textContent="Choisis une date correcte.";return}
    const b=e.currentTarget.querySelector('[type="submit"]');b.disabled=true;
    try{
     const resp=await fetch("/api/native/events",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({guildId:gid,title:String(data.get("title")||""),description:String(data.get("description")||""),startsAt:date.toISOString()})});
     const out=await resp.json();if(!resp.ok)throw Error(out.error||"Création impossible");
     status.textContent="Événement enregistré pour ce serveur.";e.currentTarget.reset();await refresh();
    }catch(error){status.textContent=error.message}finally{b.disabled=false}
   };
   return;
  }
  if(key==="create-channel"||key==="create-category"){
   shut();if(!admin){await open("channels");return}
   await open("channels");
   const form=document.querySelector(key==="create-channel"?"#csm-create-channel":"#csm-create-category");
   if(form){form.scrollIntoView({block:"center",behavior:"smooth"});form.querySelector("input")?.focus()}
   return;
  }
  shut();await open(key);
 });
 root.onkeydown=e=>{if(e.key==="Escape"){e.preventDefault();shut()}};
 root.querySelector('[data-csm-quick="invite"]')?.focus({preventScroll:true});
}


/* Mobile server onboarding, using existing CMD Sphere APIs. Does not create Discord servers. */
let createTemplate='custom',createAudience='friends',createName='',createImage='';
const onboardingTemplates=[
 ['✨','Créer le mien','custom'],['🎮','Gaming','gaming'],['📖','Club scolaire','school'],
 ['📝',"Groupe d’étude",'study'],['💗','Amis','friends'],['🎨','Artistes et créateurs','art'],['🌍','Communauté locale','community']
];
const onboardingStyle=[
 '#addModal.cmd-onboarding{z-index:100050!important;inset:0!important;padding:0!important;background:#17171b!important;align-items:stretch!important;justify-content:center!important}',
 '#addModal.cmd-onboarding>.add-card{box-sizing:border-box;width:min(720px,100%)!important;height:100dvh!important;max-height:100dvh!important;border:0!important;border-radius:0!important;background:#17171b!important;padding:calc(12px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))!important;overflow-y:auto!important}',
 '#addModal.cmd-onboarding>.add-card>div:first-child{display:none!important}',
 '#addModal.cmd-onboarding #addBody{min-height:calc(100dvh - 120px);display:flex;flex-direction:column;align-items:stretch}',
 '#addModal.cmd-onboarding .cmd-onboard-nav{display:flex;justify-content:space-between;align-items:center;padding:8px 0 25px}',
 '#addModal.cmd-onboarding .cmd-onboard-back{font-size:27px;min-width:44px;min-height:44px;background:transparent;border:0;color:white}',
 '#addModal.cmd-onboarding .cmd-onboard-title{text-align:center;font-size:clamp(25px,6vw,35px);line-height:1.22;margin:12px 0 16px;color:white;overflow-wrap:anywhere}',
 '#addModal.cmd-onboarding .cmd-onboard-desc{text-align:center;font-size:16px;line-height:1.5;color:#d0ced6;margin:0 0 26px}',
 '#addModal.cmd-onboarding .cmd-onboard-list{background:#26262b;border-radius:17px;overflow:hidden;margin:12px 0 25px}',
 '#addModal.cmd-onboarding .cmd-onboard-option{display:flex;gap:15px;align-items:center;text-align:left;width:100%;min-height:70px;padding:15px 18px;background:transparent;border:0;border-bottom:1px solid #ffffff16;color:white;font:600 17px/1.35 system-ui}',
 '#addModal.cmd-onboarding .cmd-onboard-option:last-child{border:0}',
 '#addModal.cmd-onboarding .cmd-onboard-option:active{background:#44404e}',
 '#addModal.cmd-onboarding .cmd-onboard-icon{font-size:26px;width:32px;flex:none;text-align:center}',
 '#addModal.cmd-onboarding .cmd-onboard-foot{margin-top:auto;padding-top:18px}',
 '#addModal.cmd-onboarding .cmd-onboard-primary{min-height:55px;width:100%;border-radius:12px;border:0;background:#5865f2;color:white;font:800 17px system-ui}',
 '#addModal.cmd-onboarding .cmd-onboard-field{display:grid;gap:8px;margin:24px 0;font:750 15px system-ui;color:#b7b5c1}',
 '#addModal.cmd-onboarding .cmd-onboard-field input{box-sizing:border-box;width:100%;font:500 17px system-ui;min-height:58px;background:#202026;border:2px solid #6973ff;border-radius:12px;color:white;padding:12px 15px}',
 '#addModal.cmd-onboarding .cmd-onboard-avatar{display:grid;place-items:center;align-content:center;gap:3px;width:124px;height:124px;margin:28px auto 24px;border:3px dashed #9996ab;border-radius:50%;overflow:hidden;background:#292933;cursor:pointer;font:750 12px system-ui;color:white}',
 '#addModal.cmd-onboarding .cmd-onboard-avatar img{width:100%;height:100%;object-fit:cover}',
 '#addModal.cmd-onboarding .cmd-onboard-public{display:flex;align-items:center;gap:12px;font:500 13px system-ui;color:#d6d3df}',
 '#addModal.cmd-onboarding .cmd-onboard-public input{width:20px;height:20px}',
 '#addModal.cmd-onboarding .cmd-onboard-primary:disabled{opacity:.55}',
 '@media(max-width:430px){#addModal.cmd-onboarding>.add-card{padding-left:15px!important;padding-right:15px!important}#addModal.cmd-onboarding .cmd-onboard-option{font-size:16px}}'
].join('\n');
function renderOnboarding(view){
 const modal=$('#addModal'),host=$('#addBody');if(!modal||!host)return;
 modal.classList.add('cmd-onboarding');
 if(!$('#cmd-onboarding-style')){const style=document.createElement('style');style.id='cmd-onboarding-style';style.textContent=onboardingStyle;document.head.append(style)}
 const heading=(back,step)=>'<div class="cmd-onboard-nav"><button type="button" id="cmdOnboardBack" class="cmd-onboard-back" aria-label="'+(back?'Retour':'Fermer')+'">'+(back?'←':'✕')+'</button><span>'+step+'</span></div>';
 if(view==='menu'||view==='create'){
  host.innerHTML=heading(false,'CMD SPHERE')+'<h2 class="cmd-onboard-title">Crée ton serveur</h2><p class="cmd-onboard-desc">Un espace indépendant pour retrouver tes amis et discuter.</p>'+
   '<div class="cmd-onboard-list">'+onboardingTemplates.map(item=>'<button type="button" class="cmd-onboard-option" data-onboard-template="'+item[2]+'"><span class="cmd-onboard-icon">'+item[0]+'</span>'+escapeHtml(item[1])+'<span style="margin-left:auto">›</span></button>').join('')+'</div>'+
   '<div class="cmd-onboard-foot"><p class="cmd-onboard-desc">Tu as déjà un lien d’invitation ?</p><button id="cmdOnboardJoin" type="button" class="cmd-onboard-primary">Rejoindre un serveur</button></div>';
  host.querySelectorAll('[data-onboard-template]').forEach(btn=>btn.onclick=()=>{createTemplate=btn.dataset.onboardTemplate;renderOnboarding('purpose')});
  host.querySelector('#cmdOnboardJoin').onclick=()=>{modal.classList.remove('cmd-onboarding');window.__cmdPreviousRenderAdd?.('join')};
  host.querySelector('#cmdOnboardBack').onclick=()=>window.closeAdd?.();
  return;
 }
 if(view==='purpose'){
  host.innerHTML=heading(true,'ÉTAPE 2 SUR 3')+'<h2 class="cmd-onboard-title">Dis-nous en plus sur ton serveur</h2><p class="cmd-onboard-desc">Cette information sert uniquement à personnaliser la création.</p>'+
   '<div class="cmd-onboard-list"><button type="button" class="cmd-onboard-option" data-onboard-audience="community"><span class="cmd-onboard-icon">🌍</span>Pour un club ou une communauté</button>'+
   '<button type="button" class="cmd-onboard-option" data-onboard-audience="friends"><span class="cmd-onboard-icon">💗</span>Pour mes amis et moi</button></div>'+
   '<div class="cmd-onboard-foot"><button type="button" id="cmdOnboardSkip" class="cmd-onboard-primary">Ignorer cette question</button></div>';
  host.querySelectorAll('[data-onboard-audience]').forEach(btn=>btn.onclick=()=>{createAudience=btn.dataset.onboardAudience;renderOnboarding('details')});
  host.querySelector('#cmdOnboardSkip').onclick=()=>renderOnboarding('details');
  host.querySelector('#cmdOnboardBack').onclick=()=>renderOnboarding('menu');
  return;
 }
 host.innerHTML=heading(true,'ÉTAPE 3 SUR 3')+'<h2 class="cmd-onboard-title">Crée ton serveur</h2><p class="cmd-onboard-desc">Choisis son nom et son image. Tu pourras les modifier après.</p>'+
  '<form id="cmdOnboardForm"><label for="cmdOnboardIcon" class="cmd-onboard-avatar" id="cmdOnboardAvatar">📷<small>AJOUTER UNE IMAGE</small></label>'+
  '<input type="file" accept="image/png,image/jpeg,image/webp" id="cmdOnboardIcon" hidden>'+
  '<label class="cmd-onboard-field">Nom du serveur<input name="name" id="cmdOnboardName" required maxlength="100" autocomplete="off" value="'+escapeHtml(createName||'Mon serveur CMD Sphere')+'"></label>'+
  '<label class="cmd-onboard-public"><input type="checkbox" name="isPublic" '+(createAudience==='community'?'checked':'')+'>Visible dans Découvrir (modifiable)</label>'+
  '<div class="cmd-onboard-foot"><p class="cmd-onboard-desc" style="font-size:13px">Chaque serveur aura ses propres invitations et salons.</p>'+
  '<button type="submit" id="cmdOnboardSubmit" class="cmd-onboard-primary">Créer mon serveur</button><p id="cmdOnboardStatus" role="status"></p></div></form>';
 if(createImage)host.querySelector('#cmdOnboardAvatar').innerHTML='<img src="'+createImage+'" alt="Icône du serveur">';
 host.querySelector('#cmdOnboardName').oninput=e=>{createName=e.target.value};
 host.querySelector('#cmdOnboardBack').onclick=()=>renderOnboarding('purpose');
 host.querySelector('#cmdOnboardIcon').onchange=e=>{
  const file=e.target.files?.[0],status=host.querySelector('#cmdOnboardStatus');if(!file)return;
  if(!/^image\/(?:png|jpeg|webp)$/.test(file.type)||file.size>1600000){status.textContent='Image PNG/JPEG/WebP de 1,6 Mo maximum.';return}
  const reader=new FileReader();
  reader.onload=()=>{createImage=String(reader.result||'');host.querySelector('#cmdOnboardAvatar').innerHTML='<img src="'+createImage+'" alt="Icône du serveur">';status.textContent=''};
  reader.onerror=()=>{status.textContent="Impossible de charger cette image"};reader.readAsDataURL(file);
 };
 host.querySelector('#cmdOnboardForm').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,values=new FormData(form),name=String(values.get('name')||'').trim(),publicFlag=values.get('isPublic')==='on';
  if(!name)return;
  const button=form.querySelector('#cmdOnboardSubmit'),status=form.querySelector('#cmdOnboardStatus');
  button.disabled=true;status.textContent='Création du serveur…';
  try{
   const created=await request('/api/native/guilds',{name,isPublic:publicFlag,template:createTemplate,purpose:createAudience});
   const guildId=String(created.guild?.id||'');if(!guildId)throw Error('Identifiant du serveur manquant');
   if(createImage){try{
    await request('/api/native/server-identity',{guildId,name,description:'',iconDataUrl:createImage,isPublic:publicFlag,defaultNotifications:'mentions',welcomeMessage:false})
   }catch(error){status.textContent='Serveur créé, mais image non enregistrée : '+error.message}}
   window.closeAdd?.();location.assign('/dashboard?openNative='+encodeURIComponent(guildId));
  }catch(error){status.textContent='Création impossible : '+error.message;button.disabled=false}
 };
}
function installOnboardingWizard(){
 if(typeof window.renderAdd!=='function'||window.renderAdd.__cmdOnboarding)return;
 const previous=window.renderAdd;window.__cmdPreviousRenderAdd=previous;
 const enhanced=function(view){if(['menu','create','purpose','details'].includes(view))return renderOnboarding(view);
  $('#addModal')?.classList.remove('cmd-onboarding');return previous(view)};
 enhanced.__cmdOnboarding=true;window.renderAdd=enhanced;
}

function install(){
  installOnboardingWizard();
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