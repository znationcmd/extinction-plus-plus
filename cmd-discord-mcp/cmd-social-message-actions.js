/* CMD Sphere local member profiles, friendship and message moderation. No Discord writes. */
(()=>{'use strict';
const style=document.createElement('style');
style.textContent='.cmd-person-target{cursor:pointer;touch-action:manipulation}.cmd-person-target:focus-visible,.cmd-message-delete:focus-visible{outline:2px solid #ad93ff;outline-offset:3px}.cmd-message-delete{margin-left:auto;background:transparent;color:#ffc5cd;border:1px solid #e47c9666;border-radius:9px;padding:4px 8px;font:700 11px system-ui;cursor:pointer;min-height:30px}.cmd-message-delete:hover{background:#8d183344}.cmd-message-edit{margin-left:5px;background:#27203d;color:#d8f9ff;border:1px solid #67d9ef66;border-radius:9px;padding:4px 8px;font:700 11px system-ui;cursor:pointer;min-height:30px}.cmd-message-edit:focus-visible{outline:2px solid #66e5ff;outline-offset:2px}.cmd-person-avatar-wrap{width:103px;height:103px;position:relative;margin-top:-52px}.cmd-person-avatar-wrap .cmd-person-avatar{margin-top:0}.cmd-person-avatar-deco{position:absolute;inset:-9px;width:121px;height:121px;object-fit:contain;pointer-events:none}.cmd-person-full-frame{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:2}.cmd-person-card{isolation:isolate}.cmd-person-card>.cmd-person-banner,.cmd-person-card>.cmd-person-body{position:relative;z-index:3}.cmd-person-full-frame{z-index:4}.cmd-person-overlay{position:fixed;inset:0;z-index:11000;background:#000c;display:flex;align-items:center;justify-content:center;padding:18px}.cmd-person-card{position:relative;width:min(440px,100%);max-height:88dvh;overflow:auto;color:#f5f2ff;background:#22212b;border-radius:22px;border:1px solid #ffffff25;box-shadow:0 22px 90px #000c}.cmd-person-banner{height:108px;background:linear-gradient(110deg,#7c3aed,#37245d);background-size:cover;background-position:center}.cmd-person-close{position:absolute;right:12px;top:12px;border:0;background:#14121cbb;color:#fff;width:38px;height:38px;border-radius:12px;font-size:24px;cursor:pointer}.cmd-person-body{padding:0 20px 24px}.cmd-person-avatar{position:relative;margin-top:-45px;width:88px;height:88px;border:5px solid #22212b;border-radius:50%;background:#383344;object-fit:cover;display:grid;place-items:center;font-size:32px;font-weight:900}.cmd-person-body h2{font-size:22px;margin:8px 0 2px;overflow-wrap:anywhere}.cmd-person-handle{color:#c2b9d3;font-size:13px}.cmd-person-bio{white-space:pre-wrap;overflow-wrap:anywhere;margin:15px 0;color:#e1d9eb}.cmd-person-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}.cmd-person-actions button{background:#6b47ca;border:0;border-radius:11px;color:white;padding:11px 16px;font:800 14px system-ui;cursor:pointer}.cmd-person-actions button:disabled{opacity:.6;cursor:default}.cmd-person-note{color:#c4bdd4;font-size:13px}@media(max-width:550px){.cmd-person-overlay{align-items:flex-end;padding:0}.cmd-person-card{width:100%;max-height:86dvh;border-radius:24px 24px 0 0;padding-bottom:env(safe-area-inset-bottom)}}';
style.textContent+=' .cmd-person-banner{height:155px}.cmd-person-avatar{width:103px;height:103px;margin-top:-52px}.cmd-person-body h2{font-size:26px}.cmd-person-section{border-top:1px solid #ffffff1e;padding-top:12px;margin-top:17px}.cmd-person-section h3{font-size:14px;margin:0 0 9px}.cmd-person-tags{display:flex;gap:7px;flex-wrap:wrap}.cmd-person-tag{font:600 12px system-ui;padding:7px 10px;background:#ffffff13;border:1px solid #ffffff16;border-left:4px solid #8796b8;border-radius:9px}.cmd-person-actions button{flex:1;min-width:135px}@media(max-width:550px){.cmd-person-card{max-height:93dvh}}';
style.textContent+=' .discord-message.cmd-message-cosmetic{position:relative;isolation:isolate;padding:12px 13px}.discord-message.cmd-message-cosmetic>.msg-avatar{position:relative;overflow:visible;z-index:3}.discord-message.cmd-message-cosmetic>.msg-avatar>img:first-child{width:100%;height:100%;border-radius:50%;object-fit:cover}.cmd-message-avatar-ornament{position:absolute;inset:-16%;width:132%;height:132%;object-fit:contain;pointer-events:none;z-index:4}.cmd-message-frame-art{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:1;opacity:.8}.discord-message.cmd-message-cosmetic>.msg-main{position:relative;z-index:2;min-width:0}.cmd-person-full-frame{pointer-events:none}@media(prefers-reduced-motion:reduce){.cmd-message-frame-art,.cmd-message-avatar-ornament{animation:none!important}}';
document.head.append(style);
function context(){
  if(typeof CHAT!=='undefined'&&CHAT?.open)return {guildId:String(CHAT.guildId||''),channelId:String(CHAT.channelId||''),mode:String(CHAT.mode||'')};
  if(typeof GID!=='undefined'&&typeof active!=='undefined'&&active)return {guildId:String(GID),channelId:String(active),mode:'native'};
  return null;
}
const request=async(url,opt={})=>{const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...opt}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur '+r.status);return d};
const cache=new Map();
async function access(guildId){
  const now=Date.now(),entry=cache.get(guildId);
  if(entry&&now-entry.time<20000)return entry.promise;
  const promise=request('/api/native/message-controls?guildId='+encodeURIComponent(guildId));
  cache.set(guildId,{time:now,promise});
  return promise;
}
const elem=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const validAvatar=v=>/^https:\/\//i.test(v||'')||/^data:image\/(png|jpeg|webp|gif);base64,/i.test(v||'');
function overlay(title){
  document.querySelector('.cmd-person-overlay')?.remove();
  const sheet=elem('div','cmd-person-overlay');sheet.setAttribute('role','presentation');
  const card=elem('section','cmd-person-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label',title);
  const exit=elem('button','cmd-person-close','×');exit.type='button';exit.setAttribute('aria-label','Fermer le profil');
  const close=()=>{sheet.remove();document.removeEventListener('keydown',escape)};
  function escape(e){if(e.key==='Escape')close()}
  exit.onclick=close;sheet.addEventListener('click',e=>{if(e.target===sheet)close()});document.addEventListener('keydown',escape);
  card.append(exit);sheet.append(card);document.body.append(sheet);exit.focus();return card;
}
async function showProfile(article){
 const ctx=context(),name=article.dataset.cmdAuthorName||'Utilisateur',id=article.dataset.cmdAuthorId||'',username=article.dataset.cmdAuthorUser||'';
 const card=overlay('Profil de '+name),banner=elem('div','cmd-person-banner'),body=elem('div','cmd-person-body');
 card.prepend(banner);card.append(body);body.append(elem('h2','',name),elem('p','cmd-person-note','Chargement du profil…'));
 const native=ctx&&(ctx.mode==='native'||ctx.mode==='combined')&&article.dataset.cmdSource==='cmd';
 if(!id&&!username){body.lastElementChild.textContent='Profil du service externe : compte CMD Sphere non identifié.';return}
 try{
   const {profile:p}=await request('/api/person/profile?'+new URLSearchParams({userId:id,username,guildId:native?ctx.guildId:''}));
   if(!card.isConnected)return;
   body.replaceChildren();
   if(validAvatar(p.banner)){banner.style.backgroundImage='url('+JSON.stringify(p.banner)+')'}else if(/^#[0-9a-f]{3,8}$/i.test(p.accentColor||'')){banner.style.background='linear-gradient(130deg,'+p.accentColor+',#191524)'}
   const avatarWrap=elem('div','cmd-person-avatar-wrap');
   if(validAvatar(p.avatar)){const img=elem('img','cmd-person-avatar');img.src=p.avatar;img.alt='Photo de profil';avatarWrap.append(img)}else avatarWrap.append(elem('div','cmd-person-avatar',(p.displayName||name).slice(0,1).toUpperCase()));
   if(p.avatarDecoration&&/^[a-z0-9-]{1,60}$/.test(p.avatarDecoration)){const ring=elem('img','cmd-person-avatar-deco');ring.src='/cmd-art/avatar/'+p.avatarDecoration+'.svg?v=20261016person';ring.alt='';avatarWrap.append(ring)}
   body.append(avatarWrap);
   if(p.profileFrame&&/^[a-z0-9-]{1,60}$/.test(p.profileFrame)){const frame=elem('img','cmd-person-full-frame');frame.src='/cmd-art/frame/'+p.profileFrame+'.svg?v=20261016person';frame.alt='';card.append(frame)}
   body.append(elem('h2','',p.displayName||name));
   if(p.username)body.append(elem('div','cmd-person-handle','@'+p.username));
   if(p.membershipRole==='owner')body.append(elem('div','cmd-person-note','👑 Propriétaire du serveur'));
   if(p.status)body.append(elem('div','cmd-person-note',p.status));
   if(p.bio)body.append(elem('p','cmd-person-bio',p.bio));
   if(Number.isInteger(p.commonServerCount))body.append(elem('p','cmd-person-note',p.commonServerCount+' serveur(s) en commun'));
   if(p.createdAt)body.append(elem('div','cmd-person-note','Membre CMD Sphere depuis le '+new Date(p.createdAt).toLocaleDateString('fr-FR')));
   if(p.friendshipSince)body.append(elem('div','cmd-person-note','Amis depuis le '+new Date(p.friendshipSince).toLocaleDateString('fr-FR')));
   if(Array.isArray(p.roles)&&p.roles.length){
     const box=elem('section','cmd-person-section'),tags=elem('div','cmd-person-tags');
     box.append(elem('h3','','Rôles'));for(const role of p.roles){const tag=elem('span','cmd-person-tag','● '+role.name);tag.style.borderLeftColor=role.color||'#8796b8';tags.append(tag)}box.append(tags);body.append(box);
   }
   if(Array.isArray(p.commonServers)&&p.commonServers.length){
     const box=elem('section','cmd-person-section'),tags=elem('div','cmd-person-tags');box.append(elem('h3','','Serveurs en commun'));
     for(const guild of p.commonServers)tags.append(elem('span','cmd-person-tag',guild.name));box.append(tags);body.append(box);
   }
   const actions=elem('div','cmd-person-actions');body.append(actions);
   if(p.external){body.append(elem('p','cmd-person-note','Profil importé : compte CMD Sphere non identifié.'));return}
   let label={self:'C’est ton profil',friends:'✓ Déjà amis',sent:'Demande envoyée ✓',received:'Accepter la demande d’ami',none:'＋ Ajouter en ami'}[p.friendStatus]||'Ajouter en ami';
   const btn=elem('button','',label);btn.type='button';btn.disabled=['self','friends','sent'].includes(p.friendStatus);
   btn.addEventListener('click',async()=>{
     btn.disabled=true;
     try{const r=await request('/api/friends/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:p.id})});btn.textContent=r.accepted||r.alreadyFriends?'✓ Ami':'Demande envoyée ✓'}
     catch(err){btn.disabled=false;btn.textContent='Réessayer : '+err.message}
   });actions.append(btn);
   if(p.friendStatus!=='self'&&p.username){
     for(const [label,video] of [['💬 Envoyer un message',false],['📞 Appeler',true]]){
       const target=elem('button','',label);target.type='button';actions.append(target);
       target.onclick=async()=>{target.disabled=true;try{
         const data=await request('/api/dm/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:p.username})});
         const id=data.thread?.id||data.id;if(!id)throw Error('Conversation indisponible');
         location.href=video?'/call?room='+encodeURIComponent('dm:'+id):'/messages?open='+encodeURIComponent(id);
       }catch(err){alert(err.message);target.disabled=false}};
     }
   }
 }catch(err){if(card.isConnected)body.replaceChildren(elem('h2','',name),elem('p','cmd-person-note',err.message))}
}
const cosmeticCache=new Map();
function decorateMessage(article,ctx){
 if(article.dataset.cmdSource!=='cmd'||!article.dataset.cmdAuthorId||!ctx?.guildId)return;
 const id=String(article.dataset.cmdAuthorId),cacheKey=ctx.guildId+':'+id;
 let load=cosmeticCache.get(cacheKey);
 if(!load){load=request('/api/person/profile?'+new URLSearchParams({userId:id,guildId:ctx.guildId})).then(x=>x.profile).catch(()=>null);cosmeticCache.set(cacheKey,load)}
 load.then(p=>{
   if(!p||!article.isConnected||article.dataset.cmdSource!=='cmd')return;
   const good=x=>typeof x==='string'&&/^[a-z0-9-]{1,60}$/.test(x);
   const target=article.querySelector('.msg-avatar'),main=article.querySelector('.msg-main');
   if(!target||!main)return;
   if(good(p.avatarDecoration)&&!target.querySelector('.cmd-message-avatar-ornament')){
     const image=elem('img','cmd-message-avatar-ornament');image.src='/cmd-art/avatar/'+p.avatarDecoration+'.svg?v=20261016member';image.alt='';target.append(image);article.classList.add('cmd-message-cosmetic');
   }
   if(good(p.profileFrame)&&!article.querySelector('.cmd-message-frame-art')){
     const image=elem('img','cmd-message-frame-art');image.src='/cmd-art/frame/'+p.profileFrame+'.svg?v=20261016member';image.alt='';article.prepend(image);article.classList.add('cmd-message-cosmetic');
   }
 }).catch(()=>{});
}
window.cmdShowUserProfile=function(username){if(username)return showProfile({dataset:{cmdAuthorName:username,cmdAuthorUser:username}})};
document.addEventListener('click',event=>{
 const item=event.target.closest?.('.thread .av,.thread .main b,.friendRow .av,.friendRow .main b,.result span b,#chatTitle');
 if(!item)return;
 const row=item.closest('[data-profile-user]'),username=row?.dataset.profileUser||item.dataset.profileUsername||item.closest('.result')?.querySelector('[data-user]')?.dataset.user;
 if(!username)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 window.cmdShowUserProfile(username);
},true);
async function editMessage(article,btn){
 const ctx=context();if(!ctx||!['native','combined'].includes(ctx.mode)||article.dataset.cmdSource!=='cmd')return;
 const id=article.dataset.messageId||'';const original=article.querySelector('.msg-text')?.textContent||'';
 if(!original.trim()){alert('Ce message ne contient pas de texte modifiable.');return}
 const text=prompt('Modifier ton message :',original);
 if(text===null||text===original)return;
 if(!text.trim()||text.length>4000){alert('Le message doit contenir entre 1 et 4000 caractères.');return}
 btn.disabled=true;
 try{
   const api=window.cmdSphereMessageActions;
   if(api?.edit&&ctx.mode==='native')await api.edit(id,text);
   else{
     await request('/api/native/messages/edit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({guildId:ctx.guildId,channelId:ctx.channelId,messageId:id,content:text})});
     const msg=article.querySelector('.msg-text');if(msg)msg.textContent=text;
   }
 }catch(err){alert('Modification impossible : '+err.message)}finally{btn.disabled=false}
}
async function removeMessage(article,btn){
 const ctx=context();if(!ctx||!['native','combined'].includes(ctx.mode)||article.dataset.cmdSource!=='cmd')return;
 if(!confirm('Supprimer définitivement ce message de CMD Sphere ?'))return;
 btn.disabled=true;
 try{
   const id=article.dataset.messageId||'';
   await request('/api/native/messages/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({guildId:ctx.guildId,channelId:ctx.channelId,messageId:id})});
   if(typeof CHAT!=='undefined'&&Array.isArray(CHAT.messages)){CHAT.messages=CHAT.messages.filter(m=>String(m.id)!==id);if(typeof renderChannelMessages==='function')renderChannelMessages(false)}
   article.remove();
 }catch(err){btn.disabled=false;alert('Suppression impossible : '+err.message)}
}
function enhance(article,ctx){
 if(article.dataset.cmdPersonReady==='1')return;article.dataset.cmdPersonReady='1';
 const authorId=article.dataset.cmdAuthorId||'';
 const name=article.querySelector('.msg-meta b,.meta b');
 if(name&&!article.dataset.cmdAuthorName)article.dataset.cmdAuthorName=name.textContent||'Utilisateur';
 for(const target of [article.querySelector('.msg-avatar,.avatar'),name]){
   if(!target)continue;
   target.classList.add('cmd-person-target');target.setAttribute('role','button');target.tabIndex=0;
   target.setAttribute('aria-label','Voir le profil de '+(article.dataset.cmdAuthorName||'Utilisateur'));
   target.addEventListener('click',()=>showProfile(article));
   target.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showProfile(article)}});
 }
 decorateMessage(article,ctx);
 if(!authorId||article.dataset.cmdSource!=='cmd'||!['native','combined'].includes(ctx.mode))return;
 const id=article.dataset.messageId||'';
 if(!/^[0-9a-f-]{36}$/i.test(id))return;
 access(ctx.guildId).then(perms=>{
   if(!article.isConnected||context()?.guildId!==ctx.guildId||context()?.channelId!==ctx.channelId)return;
   const isAuthor=String(perms.userId)===authorId;
   if(!isAuthor&&!perms.isOwner)return;
   const meta=article.querySelector('.msg-meta,.meta');if(!meta||meta.querySelector('.cmd-message-delete'))return;
   const button=elem('button','cmd-message-delete','🗑 Supprimer');button.type='button';button.title='Supprimer ce message';
   button.addEventListener('click',()=>removeMessage(article,button));meta.append(button);
   if(isAuthor){const edit=elem('button','cmd-message-edit','✎ Modifier');edit.type='button';edit.title='Modifier ton message';edit.addEventListener('click',()=>editMessage(article,edit));meta.append(edit)}
 }).catch(()=>{});
}
let scheduled=false;
function refresh(){scheduled=false;const ctx=context();if(!ctx)return;
 const host=document.querySelector('#channelMessages')||document.querySelector('#messages');if(!host)return;
 host.querySelectorAll('article.discord-message,article.msg').forEach(a=>enhance(a,ctx));
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
})();
