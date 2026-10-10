(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=[
 ['Personnes',[['members','👥','Membres'],['roles','🛡','Rôles'],['invites','🔗','Invitations']]],
 ['Modération',[['moderation','⚔','Modération'],['automod','🤖','AutoMod'],['logs','📋','Logs du serveur'],['bans','🔨','Bannissements'],['security','🛡','Sécurité']]],
 ['Communauté',[['community','🏠','Paramètres de communauté'],['analytics','📈','Analyses de serveur']]],
 ['Gestion du serveur',[['channels','#','Salons'],['overview','ⓘ','Vue d’ensemble'],['integrations','🤖','Intégrations']]]
];
const css=String.raw;
let overlay,content,heading,back,done,topAction,footer;
const state={ctx:null,detail:null,page:'home',editing:null,reorder:false,busy:false};
function init(){
 if(overlay)return;
 const style=document.createElement('style');style.textContent=[
 'body.cmdsa-locked{overflow:hidden!important}',
 '.cmdsa-overlay{display:none;position:fixed;inset:0;z-index:99990;background:#111115ea;color:#f7f7f9;font-family:system-ui,-apple-system,sans-serif;align-items:center;justify-content:center}',
 '.cmdsa-overlay.open{display:flex}',
 '.cmdsa-panel{width:min(730px,96vw);height:min(900px,95dvh);display:flex;flex-direction:column;background:#1d1d21;border-radius:22px;border:1px solid #ffffff19;overflow:hidden;box-shadow:0 30px 80px #000b}',
 '.cmdsa-head{display:flex;align-items:center;gap:8px;height:73px;padding:12px 14px;flex:none;border-bottom:1px solid #ffffff12}',
 '.cmdsa-head h2{flex:1;min-width:0;text-align:center;font-size:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0}',
 '.cmdsa-head button{border:0;background:none;color:#fff;font:600 22px system-ui;min-width:43px;min-height:42px;cursor:pointer;border-radius:10px}',
 '.cmdsa-head button:hover{background:#ffffff19}',
 '.cmdsa-head #cmdsaAction{min-width:89px;max-width:100px;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
 '.cmdsa-main{overflow-y:auto;overscroll-behavior:contain;min-height:0;flex:1;padding:18px 22px 94px}',
 '.cmdsa-group{margin:11px 0 36px}.cmdsa-group h3{font-size:17px;font-weight:500;color:#aaaaae;margin:0 0 13px}',
 '.cmdsa-card{border-radius:19px;overflow:hidden;background:#2b2b32}',
 '.cmdsa-entry{display:flex;align-items:center;width:100%;gap:18px;background:none;color:#f7f7f9;border:0;text-align:left;cursor:pointer;padding:16px 20px;min-height:78px;font:550 17px system-ui}',
 '.cmdsa-entry:not(:last-child){border-bottom:1px solid #ffffff10}.cmdsa-entry:hover{background:#ffffff10}',
 '.cmdsa-entry .emoji{min-width:35px;text-align:center;font-size:23px}.cmdsa-entry .name{flex:1}.cmdsa-entry .arrow{font-size:28px;color:#aba9b2}',
 '.cmdsa-category{display:flex;align-items:center;margin:26px 0 6px;gap:8px;color:#c0bec7;font-size:14px;font-weight:800}',
 '.cmdsa-category .name{flex:1;min-width:0;overflow-wrap:anywhere}',
 '.cmdsa-category button{background:none;border:0;color:#b5b5bd;font:600 14px system-ui;cursor:pointer;padding:10px}',
 '.cmdsa-channel{display:flex;align-items:center;gap:10px;min-height:65px;border-bottom:1px solid #ffffff0c;padding:6px 3px}',
 '.cmdsa-channel .mark{font-size:26px;min-width:33px;color:#a1a1ab}',
 '.cmdsa-channel .name{flex:1;min-width:0;overflow-wrap:anywhere;font-weight:550}',
 '.cmdsa-channel button{background:transparent;border:0;color:#c2bfc9;font:600 14px system-ui;cursor:pointer;padding:10px 4px}',
 '.cmdsa-primary{background:#5865f2;color:#fff;border:0;border-radius:12px;padding:12px 17px;font:750 16px system-ui;cursor:pointer}',
 '.cmdsa-danger{background:#6e303a;color:#fff;border:0;border-radius:12px;padding:12px 17px;font:700 15px system-ui;cursor:pointer}',
 '.cmdsa-footer{position:fixed;bottom:calc(25px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);z-index:99992}',
 '.cmdsa-message{border:1px solid #71637b99;background:#323039;color:#e6dfe9;border-radius:12px;font-size:13px;line-height:1.5;padding:14px;margin:13px 0}',
 '.cmdsa-form{border-radius:16px;background:#2c2b32;padding:18px;display:grid;gap:9px}',
 '.cmdsa-form label{display:block;font-size:14px;color:#dad8e0}',
 '.cmdsa-form input,.cmdsa-form select,.cmdsa-form textarea{width:100%;box-sizing:border-box;min-height:46px;border:1px solid #605d69;background:#16151b;color:#fff;font:16px system-ui;padding:11px;border-radius:10px;margin:6px 0 12px}',
 '.cmdsa-form textarea{min-height:90px}',
 '@media(max-width:760px){.cmdsa-overlay{background:#1d1d21;align-items:stretch}.cmdsa-panel{height:100dvh;max-height:none;width:100%;border:0;border-radius:0}.cmdsa-head{padding:calc(12px + env(safe-area-inset-top,0px)) 11px 10px;height:auto;min-height:77px;box-sizing:border-box}.cmdsa-head h2{font-size:19px}.cmdsa-main{padding:18px 20px calc(110px + env(safe-area-inset-bottom,0px))}.cmdsa-footer{bottom:calc(26px + env(safe-area-inset-bottom,0px))}}'
 ].join('');document.head.append(style);
 overlay=document.createElement('div');overlay.className='cmdsa-overlay';overlay.id='cmdServerAdminV2';
 overlay.innerHTML='<section class="cmdsa-panel" role="dialog" aria-modal="true" aria-label="Paramètres du serveur"><header class="cmdsa-head"><button id="cmdsaBack" aria-label="Retour">‹</button><h2 id="cmdsaTitle">Paramètres du serveur</h2><button id="cmdsaAction" type="button"> </button><button id="cmdsaClose" aria-label="Fermer">×</button></header><main class="cmdsa-main" id="cmdsaMain"></main><footer class="cmdsa-footer" id="cmdsaFooter"><button class="cmdsa-primary" id="cmdsaCreate">＋ Créer</button></footer></section>';
 document.body.append(overlay);
 content=$('#cmdsaMain');heading=$('#cmdsaTitle');back=$('#cmdsaBack');done=$('#cmdsaClose');topAction=$('#cmdsaAction');footer=$('#cmdsaFooter');
 back.addEventListener('click',goBack);done.addEventListener('click',hide);overlay.addEventListener('click',e=>{if(e.target===overlay)hide()});
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape')goBack()});
 $('#cmdsaCreate').onclick=()=>{state.editing=null;draw('edit-channel')};
 topAction.onclick=()=>{if(state.page==='channels'){state.reorder=!state.reorder;draw('channels')}};
 content.addEventListener('click',e=>{
  const link=e.target.closest('[data-cmdsa-page]');if(link){draw(link.dataset.cmdsaPage);return}
  const ed=e.target.closest('[data-cmdsa-edit]');if(ed){state.editing=state.detail.channels.find(c=>String(c.id)===ed.dataset.cmdsaEdit);draw('edit-channel');return}
  const role=e.target.closest('[data-cmdsa-role]');if(role){state.editing=state.detail.roles.find(c=>String(c.id)===role.dataset.cmdsaRole);draw('edit-role');return}
  const order=e.target.closest('[data-cmdsa-move]');if(order){move(order.dataset.cmdsaMove,Number(order.dataset.direction));return}
  if(e.target.closest('#cmdsaAddRole')){state.editing=null;draw('edit-role')}
  if(e.target.closest('#cmdsaDelete')){removeItem()}
  if(e.target.closest('#cmdsaCopy')){navigator.clipboard.writeText(state.detail.inviteUrl||'').then(()=>message('Invitation copiée')).catch(()=>message('Copie impossible.'))}
 });
 content.addEventListener('submit',e=>{if(e.target.id==='cmdsaChannelForm'){e.preventDefault();saveChannel(e.target)}if(e.target.id==='cmdsaRoleForm'){e.preventDefault();saveRole(e.target)}});
}
const api=async(url,opts={})=>{const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur HTTP '+r.status);return d};
async function load(){
 const c=state.ctx;
 if(c.nativeGuild){state.detail=await api('/api/native/guild/'+encodeURIComponent(c.nativeGuild.id));return}
 if(c.guild){let extras={};try{extras=await api('/api/dashboard/extras?guildId='+encodeURIComponent(c.guild.id)+'&bot='+encodeURIComponent(c.bot||''))}catch(e){extras.error=e.message}
  state.detail={guild:c.guild,member:null,channels:c.structure?.channels||[],roles:c.structure?.roles||[],extras};
  return;
 }
 throw Error('Choisis un serveur.');
}
const admin=()=>Boolean(state.ctx?.nativeGuild?['owner','admin'].includes(String(state.detail?.member?.membership_role||'')):state.ctx?.guild?.owner);
function message(t){let n=$('#cmdsaInfo',content);if(!n){n=document.createElement('p');n.id='cmdsaInfo';n.className='cmdsa-message';content.prepend(n)}n.textContent=String(t)}
function show(ctx){
 init();state.ctx=ctx;state.editing=null;state.reorder=false;state.page='home';overlay.classList.add('open');document.body.classList.add('cmdsa-locked');content.innerHTML='<p class="cmdsa-message">Chargement du serveur…</p>';
 load().then(()=>draw('home')).catch(e=>message(e.message));
}
function hide(){overlay?.classList.remove('open');document.body.classList.remove('cmdsa-locked')}
function goBack(){if(state.page==='home'){hide();return}if(state.page==='edit-channel')draw('channels');else if(state.page==='edit-role')draw('roles');else draw('home')}
function draw(page){
 state.page=page;
 const labels={home:'Paramètres du serveur',channels:'Salons','edit-channel':state.editing?'Modifier':'Créer',roles:'Rôles','edit-role':state.editing?'Modifier le rôle':'Créer un rôle',members:'Membres',invites:'Invitations',moderation:'Modération',automod:'AutoMod',logs:'Logs du serveur',bans:'Bannissements',security:'Sécurité',community:'Paramètres de communauté',analytics:'Analyses de serveur',overview:'Vue d’ensemble',integrations:'Intégrations'};
 heading.textContent=labels[page]||page;back.textContent=page==='home'?'×':'‹';
 topAction.hidden=page!=='channels';topAction.textContent=state.reorder?'Terminer':'Réorganiser';footer.hidden=page!=='channels'||!admin();
 if(page==='home'){content.innerHTML=sections.map(g=>'<div class="cmdsa-group"><h3>'+E(g[0])+'</h3><div class="cmdsa-card">'+g[1].map(r=>'<button class="cmdsa-entry" data-cmdsa-page="'+r[0]+'"><span class="emoji">'+r[1]+'</span><span class="name">'+E(r[2])+'</span><span class="arrow">›</span></button>').join('')+'</div></div>').join('')}
 else if(page==='channels')channels();
 else if(page==='roles')roles();
 else if(page==='edit-channel')editChannel();
 else if(page==='edit-role')editRole();
 else details(page);
 content.scrollTop=0;
}
function channels(){
 const ch=state.detail.channels||[],cats=ch.filter(x=>x.type==='category').sort(byPosition),other=ch.filter(x=>x.type!=='category');
 let html='<p class="cmdsa-message">'+ch.length+' salons et catégories'+(!admin()?' · lecture seule':'')+'</p>';
 const row=x=>'<div class="cmdsa-channel"><span class="mark">'+(x.type==='voice'?'🔊':'#')+'</span><span class="name">'+E(x.name)+'</span>'+(admin()?state.reorder?'<button data-cmdsa-move="'+E(x.id)+'" data-direction="-1">↑</button><button data-cmdsa-move="'+E(x.id)+'" data-direction="1">↓</button>':'<button data-cmdsa-edit="'+E(x.id)+'">Modifier</button>':'')+'</div>';
 for(const c of cats){html+='<div class="cmdsa-category"><span class="name">'+E(c.name)+'</span>'+(admin()?'<button data-cmdsa-edit="'+E(c.id)+'">Modifier</button>':'')+'</div>';html+=other.filter(x=>String(x.source_parent_id||x.parentId||'')===String(c.source_channel_id||c.id)).sort(byPosition).map(row).join('')}
 html+=other.filter(x=>!x.source_parent_id&&!x.parentId).sort(byPosition).map(row).join('');
 content.innerHTML=html||'<p>Aucun salon</p>';
}
const byPosition=(a,b)=>Number(a.position||0)-Number(b.position||0);
function roles(){
 const roles=state.detail.roles||[];
 content.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b>'+roles.length+' rôles</b>'+(admin()?'<button class="cmdsa-primary" id="cmdsaAddRole">＋ Créer</button>':'')+'</div>'+roles.sort((a,b)=>Number(b.position||0)-Number(a.position||0)).map(r=>'<div class="cmdsa-channel"><span class="mark">🛡</span><span class="name">'+E(r.name)+'</span>'+(admin()?'<button data-cmdsa-role="'+E(r.id)+'">Modifier</button>':'')+'</div>').join('');
}
function editChannel(){
 const x=state.editing,cat=x?.type==='category',categories=(state.detail.channels||[]).filter(c=>c.type==='category'&&String(c.id)!==String(x?.id));
 content.innerHTML='<form id="cmdsaChannelForm" class="cmdsa-form"><label>Type<select name="type" '+(x?'disabled':'')+'><option value="text">Salon textuel</option><option value="voice">Salon vocal</option><option value="announcement">Annonces</option><option value="forum">Forum</option><option value="category">Catégorie</option></select></label><label>Nom<input name="name" value="'+E(x?.name||'')+'" maxlength="100" required></label><label>Sujet / description<textarea name="topic" maxlength="1024">'+E(x?.topic||'')+'</textarea></label><label>Catégorie<select name="parentId"><option value="">Aucune</option>'+categories.map(c=>'<option value="'+E(c.id)+'" '+(String(x?.source_parent_id||x?.parentId||'')===String(c.source_channel_id||c.id)?'selected':'')+'>'+E(c.name)+'</option>').join('')+'</select></label><button class="cmdsa-primary">Enregistrer</button></form>'+(x?'<button id="cmdsaDelete" class="cmdsa-danger" style="width:100%;margin-top:16px">Supprimer</button>':'')+'<p class="cmdsa-message">Les modifications peuvent être envoyées au serveur Discord d’origine si un bot CMD autorisé y est installé.</p>';
 $('#cmdsaChannelForm [name="type"]').value=x?.type||'text';
}
function editRole(){
 const x=state.editing;
 content.innerHTML='<form id="cmdsaRoleForm" class="cmdsa-form"><label>Nom<input name="name" maxlength="100" required value="'+E(x?.name||'')+'"></label><label>Couleur<input name="color" type="color" value="'+E(/^#[a-f\d]{6}$/i.test(x?.color||'')?x.color:'#5865f2')+'"></label><button class="cmdsa-primary">Enregistrer</button></form>'+(x?'<button class="cmdsa-danger" style="width:100%;margin-top:16px" id="cmdsaDelete">Supprimer</button>':'');
}
async function change(act,payload){
 if(state.busy)return false;state.busy=true;try{const c=state.ctx,body=c.nativeGuild?{nativeGuildId:c.nativeGuild.id,action:act,...payload}:{guildId:c.guild.id,bot:c.bot,action:act,...payload};
  const out=await api(c.nativeGuild?'/api/native/action':'/api/dashboard/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  await load();if(out.warning)message(out.warning);return true
 }catch(e){message('Modification impossible : '+e.message);return false}finally{state.busy=false}
}
async function saveChannel(form){if(!admin())return message('Permissions insuffisantes');const f=new FormData(form),x=state.editing,p={name:String(f.get('name')||'').trim(),type:x?.type||String(f.get('type')||'text'),topic:String(f.get('topic')||''),parentId:String(f.get('parentId')||'')};if(x)p.channelId=x.id;const act=x?'update_channel':p.type==='category'?'create_category':'create_channel';if(await change(act,p))draw('channels')}
async function saveRole(form){if(!admin())return message('Permissions insuffisantes');const f=new FormData(form),x=state.editing,p={name:String(f.get('name')||'').trim(),color:String(f.get('color')||'')};if(x)p.roleId=x.id;if(await change(x?'update_role':'create_role',p))draw('roles')}
async function removeItem(){const x=state.editing;if(!x||!admin())return;if(!confirm('Supprimer définitivement '+x.name+' ?'))return;const role=state.page==='edit-role';if(await change(role?'delete_role':'delete_channel',role?{roleId:x.id}:{channelId:x.id}))draw(role?'roles':'channels')}
async function move(id,dir){if(!admin())return;const all=state.detail.channels||[],x=all.find(a=>String(a.id)===String(id));if(!x)return;const k=x.type==='category'?'category':'channel',group=all.filter(a=>k==='category'?a.type==='category':a.type!=='category'&&String(a.source_parent_id||a.parentId||'')===String(x.source_parent_id||x.parentId||'')).sort(byPosition);const index=group.findIndex(a=>String(a.id)===String(id)),next=group[index+dir];if(!next)return;const xa=Number(x.position||0),xb=Number(next.position||0);if(await change('update_channel',{channelId:x.id,position:xb===xa?xb+dir*10:xb}))draw('channels')}
function details(page){
 const d=state.detail,g=d.guild||{},extras=d.extras||{},texts={members:'Membres du serveur',invites:'Invitations du serveur',moderation:'La modération nécessite les permissions de modération adaptées. Les actions non prises en charge ne sont pas simulées.',automod:'Règles de modération automatique accessibles au bot CMD.',logs:'Les journaux d’audit Discord exigent une autorisation spécifique.',bans:'Les bannissements exigent la permission Discord Bannir des membres.',security:'Les paramètres de sécurité avancés se règlent dans Discord.',community:'Configuration de communauté et informations disponibles dans CMD Sphere.',analytics:'Informations statistiques actuellement accessibles.',overview:'Résumé des salons et rôles du serveur.',integrations:'Bots et intégrations détectés.'};
 let html='<div class="cmdsa-message">'+E(texts[page]||'')+'</div>';
 if(page==='members'){html+='<p>'+E(g.member_count||g.memberCount||'—')+' membres</p>';if(state.ctx.nativeGuild)html+='<div id="cmdsaMemberList">Chargement des membres…</div>'}
 if(page==='invites')html+=d.inviteUrl?'<p class="cmdsa-message">'+E(d.inviteUrl)+'</p><button class="cmdsa-primary" id="cmdsaCopy">Copier l’invitation</button>':'<p>Invitation non disponible pour ce serveur.</p>';
 if(page==='overview'||page==='analytics')html+='<p>'+E((d.channels||[]).length)+' salons · '+E((d.roles||[]).length)+' rôles</p>';
 if(page==='automod')html+='<p>'+E((extras.autoModeration||[]).length)+' règle(s) détectée(s)</p>';
 if(page==='integrations')html+='<button class="cmdsa-primary" id="cmdsaBotLink">Gérer les bots CMD</button>';
 content.innerHTML=html;
 if(page==='members'&&state.ctx.nativeGuild)api('/api/native/members?guildId='+encodeURIComponent(state.ctx.nativeGuild.id)).then(out=>{$('#cmdsaMemberList').innerHTML=(out.members||[]).map(x=>'<div class="cmdsa-channel"><span class="mark">👤</span><span class="name">'+E(x.display_name||x.user_id)+'</span><small>'+E(x.membership_role)+'</small></div>').join('')||'Aucun membre trouvé'}).catch(e=>message(e.message));
 if(page==='integrations')$('#cmdsaBotLink').onclick=()=>{$('#botsBtn')?.click();hide()};
}
window.CMDSphereServerAdmin={open:show};
})();