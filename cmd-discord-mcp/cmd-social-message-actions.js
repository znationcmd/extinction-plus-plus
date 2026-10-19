/* CMD Sphere local member profiles, friendship and message moderation. No Discord writes. */
(()=>{'use strict';
if(window.cmdSocialMessageActionsReady)return;
window.cmdSocialMessageActionsReady=true;
const style=document.createElement('style');
style.textContent='.cmd-person-target{cursor:pointer;touch-action:manipulation}.cmd-person-target:focus-visible,.cmd-message-delete:focus-visible{outline:2px solid #ad93ff;outline-offset:3px}.cmd-message-delete{margin-left:auto;background:transparent;color:#ffc5cd;border:1px solid #e47c9666;border-radius:9px;padding:4px 8px;font:700 11px system-ui;cursor:pointer;min-height:30px}.cmd-message-delete:hover{background:#8d183344}.cmd-message-edit{margin-left:5px;background:#27203d;color:#d8f9ff;border:1px solid #67d9ef66;border-radius:9px;padding:4px 8px;font:700 11px system-ui;cursor:pointer;min-height:30px}.cmd-message-edit:focus-visible{outline:2px solid #66e5ff;outline-offset:2px}.cmd-person-avatar-wrap{width:103px;height:103px;position:relative;margin-top:-52px}.cmd-person-avatar-wrap .cmd-person-avatar{margin-top:0}.cmd-person-avatar-deco{position:absolute;inset:-9px;width:121px;height:121px;object-fit:contain;pointer-events:none}.cmd-person-full-frame{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:2}.cmd-person-card{isolation:isolate}.cmd-person-card>.cmd-person-banner,.cmd-person-card>.cmd-person-body{position:relative;z-index:3}.cmd-person-full-frame{z-index:4}.cmd-person-overlay{position:fixed;inset:0;z-index:11000;background:#000c;display:flex;align-items:center;justify-content:center;padding:18px}.cmd-person-card{position:relative;width:min(440px,100%);max-height:88dvh;overflow:auto;color:#f5f2ff;background:#22212b;border-radius:22px;border:1px solid #ffffff25;box-shadow:0 22px 90px #000c}.cmd-person-banner{height:108px;background:linear-gradient(110deg,#7c3aed,#37245d);background-size:cover;background-position:center}.cmd-person-close{position:absolute;right:12px;top:12px;border:0;background:#14121cbb;color:#fff;width:38px;height:38px;border-radius:12px;font-size:24px;cursor:pointer}.cmd-person-body{padding:0 20px 24px}.cmd-person-avatar{position:relative;margin-top:-45px;width:88px;height:88px;border:5px solid #22212b;border-radius:50%;background:#383344;object-fit:cover;display:grid;place-items:center;font-size:32px;font-weight:900}.cmd-person-body h2{font-size:22px;margin:8px 0 2px;overflow-wrap:anywhere}.cmd-person-handle{color:#c2b9d3;font-size:13px}.cmd-person-bio{white-space:pre-wrap;overflow-wrap:anywhere;margin:15px 0;color:#e1d9eb}.cmd-person-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}.cmd-person-actions button{background:#6b47ca;border:0;border-radius:11px;color:white;padding:11px 16px;font:800 14px system-ui;cursor:pointer}.cmd-person-actions button:disabled{opacity:.6;cursor:default}.cmd-person-note{color:#c4bdd4;font-size:13px}@media(max-width:550px){.cmd-person-overlay{align-items:flex-end;padding:0}.cmd-person-card{width:100%;max-height:86dvh;border-radius:24px 24px 0 0;padding-bottom:env(safe-area-inset-bottom)}}';
style.textContent+=' .cmd-person-banner{height:155px}.cmd-person-avatar{width:103px;height:103px;margin-top:-52px}.cmd-person-body h2{font-size:26px}.cmd-person-section{border-top:1px solid #ffffff1e;padding-top:12px;margin-top:17px}.cmd-person-section h3{font-size:14px;margin:0 0 9px}.cmd-person-tags{display:flex;gap:7px;flex-wrap:wrap}.cmd-person-tag{font:600 12px system-ui;padding:7px 10px;background:#ffffff13;border:1px solid #ffffff16;border-left:4px solid #8796b8;border-radius:9px}.cmd-person-actions button{flex:1;min-width:135px}@media(max-width:550px){.cmd-person-card{max-height:93dvh}}';
style.textContent+=' .discord-message.cmd-message-cosmetic{position:relative;isolation:isolate;padding:12px 13px}.discord-message.cmd-message-cosmetic>.msg-avatar{position:relative;overflow:visible;z-index:3}.discord-message.cmd-message-cosmetic>.msg-avatar>img:first-child{width:100%;height:100%;border-radius:50%;object-fit:cover}.cmd-message-avatar-ornament{position:absolute;inset:-16%;width:132%;height:132%;object-fit:contain;pointer-events:none;z-index:4}.cmd-message-frame-art{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:1;opacity:.8}.discord-message.cmd-message-cosmetic>.msg-main{position:relative;z-index:2;min-width:0}.cmd-person-full-frame{pointer-events:none}@media(prefers-reduced-motion:reduce){.cmd-message-frame-art,.cmd-message-avatar-ornament{animation:none!important}}';
style.textContent+=' .cmd-person-avatar-wrap{flex:none}.cmd-person-avatar-wrap .cmd-person-avatar{width:103px;height:103px;object-fit:cover;border-radius:50%;overflow:hidden}.cmd-person-avatar-deco{inset:-14%;width:128%;height:128%;max-width:none;max-height:none}.cmd-person-nameplate{margin:12px 0 8px;min-height:52px;border-radius:10px;display:flex;align-items:center;padding:12px 15px;background-position:center;background-size:cover;background-color:#22132e;border:1px solid #9355c570;overflow:hidden;isolation:isolate}.cmd-person-nameplate b{font-size:17px;overflow-wrap:anywhere;text-shadow:0 2px 7px #10091c}.cmd-message-nameplate{width:fit-content;max-width:100%;min-height:34px;background-position:center;background-size:cover;background-color:#241532;border:1px solid #8a64ad80;border-radius:8px;padding:5px 12px;overflow:hidden}.cmd-message-nameplate b{display:block;color:#f8eaff;text-shadow:0 2px 4px #150b1a;overflow-wrap:anywhere}.cmd-person-card .cmd-person-full-frame{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;object-fit:fill;z-index:4}.cmd-person-card .cmd-person-body{padding-bottom:32px}';
style.textContent+=' .cmd-person-close{z-index:6}.cmd-person-avatar-wrap,.cmd-person-avatar-wrap .cmd-person-avatar{box-sizing:border-box;width:103px;height:103px}.cmd-person-avatar-wrap .cmd-person-avatar{margin:0}.cmd-person-avatar-deco{z-index:1}';
style.textContent+="\n/* Other members' profile: render selected art as a real perimeter, not a full-sheet image.\n   The middle of the ornament stays transparent so content and actions remain readable. */\n.cmd-person-card>.cmd-person-full-frame{\n  display:block!important;position:absolute!important;inset:0!important;\n  box-sizing:border-box!important;width:100%!important;height:100%!important;\n  max-width:100%!important;max-height:100%!important;\n  border:clamp(14px,3.8vw,22px) solid transparent!important;\n  border-image-source:var(--cmd-person-frame-url)!important;\n  border-image-slice:29% 24% 29% 24%!important;\n  border-image-width:1!important;\n  border-image-outset:0!important;\n  border-image-repeat:stretch!important;\n  background:none!important;box-shadow:none!important;\n  pointer-events:none!important;z-index:4!important;\n}\n.cmd-person-card:has(>.cmd-person-full-frame)>.cmd-person-body{\n  padding-inline:clamp(25px,6vw,34px);\n  padding-bottom:clamp(30px,7vw,42px);\n}\n.cmd-person-card:has(>.cmd-person-full-frame)>.cmd-person-close{\n  z-index:7;right:16px;top:16px;\n}\n@media(max-width:550px){\n  .cmd-person-card>.cmd-person-full-frame{border-width:clamp(12px,3.5vw,17px)!important}\n  .cmd-person-card:has(>.cmd-person-full-frame)>.cmd-person-body{padding-inline:clamp(22px,6vw,28px)}\n  .cmd-person-card:has(>.cmd-person-full-frame)>.cmd-person-close{right:14px;top:14px}\n}\n";
style.textContent+="\n/* Keep the selected frame visible but BEHIND other members' details and avatar. */\n.cmd-person-card{overflow-x:hidden;overscroll-behavior:contain;}\n.cmd-person-card>.cmd-person-full-frame{z-index:1!important;opacity:.9!important;}\n.cmd-person-card>.cmd-person-banner{position:relative;z-index:2!important;}\n.cmd-person-card>.cmd-person-body{position:relative;z-index:3!important;}\n.cmd-person-card .cmd-person-avatar-wrap{position:relative;z-index:5!important;isolation:isolate;}\n.cmd-person-card .cmd-person-avatar-wrap .cmd-person-avatar{display:block;position:relative;z-index:1!important;object-fit:cover;}\n.cmd-person-card .cmd-person-avatar-wrap .cmd-person-avatar-deco{z-index:2!important;}\n.cmd-person-card>.cmd-person-close{z-index:7!important;}\n.cmd-person-mutual-list{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(min(145px,100%),1fr));}\n.cmd-person-mutual{display:flex;align-items:center;text-align:left;min-width:0;gap:8px;padding:7px 9px;color:#f5f2ff;background:#ffffff10;border:1px solid #ffffff25;border-radius:11px;cursor:pointer;}\n.cmd-person-mutual:focus-visible{outline:2px solid #bca1ff;outline-offset:2px;}\n.cmd-person-mutual-avatar{display:grid;place-items:center;flex:none;width:30px;height:30px;object-fit:cover;border-radius:50%;background:#6b47ca;color:white;font-weight:800;}\n.cmd-person-mutual-name{font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\n@media(max-width:550px){.cmd-person-card{max-height:calc(100dvh - env(safe-area-inset-top,0px) - 12px)!important}.cmd-person-avatar-wrap{margin-top:-45px!important}.cmd-person-card>.cmd-person-body{padding-top:6px!important;}}\n";
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
const validAvatar=v=>/^https:\/\//i.test(v||'')||/^\/(?!\/)[^\s]*$/.test(v||'')||/^data:image\/(png|jpeg|webp|gif);base64,/i.test(v||'');
let closeProfile=null;
function overlay(title){
  closeProfile?.();
  const previousFocus=document.activeElement;
  const sheet=elem('div','cmd-person-overlay');sheet.setAttribute('role','presentation');
  const card=elem('section','cmd-person-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label',title);
  const exit=elem('button','cmd-person-close','×');exit.type='button';exit.setAttribute('aria-label','Fermer le profil');
  const close=()=>{sheet.remove();document.removeEventListener('keydown',escape);closeProfile=null;if(previousFocus?.isConnected)previousFocus.focus()};
  closeProfile=close;
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
   const avatarFallback=()=>elem('div','cmd-person-avatar',(p.displayName||name).slice(0,1).toUpperCase());
      const messageAvatar=article.querySelector?.('.msg-avatar img,.avatar img')?.getAttribute('src')||'';
      const avatarSource=validAvatar(p.avatar)?p.avatar:(validAvatar(messageAvatar)?messageAvatar:'');
      if(avatarSource){
        const img=elem('img','cmd-person-avatar');img.src=avatarSource;img.alt='Photo de profil de '+(p.displayName||name);img.loading='eager';
        img.onerror=()=>{if(img.isConnected)img.replaceWith(avatarFallback())};avatarWrap.append(img);
      }else avatarWrap.append(avatarFallback());
   if(p.avatarDecoration&&/^[a-z0-9-]{1,60}$/.test(p.avatarDecoration)){const ring=elem('img','cmd-person-avatar-deco');ring.src='/cmd-art/avatar/'+p.avatarDecoration+'.svg?v=20261016person';ring.alt='';avatarWrap.append(ring)}
   body.append(avatarWrap);
   if(p.profileFrame&&p.profileFrame!=='none'&&/^[a-z0-9-]{1,60}$/.test(p.profileFrame)){const frame=elem('span','cmd-person-full-frame');frame.setAttribute('aria-hidden','true');frame.style.setProperty('--cmd-person-frame-url','url("/cmd-art/frame/'+encodeURIComponent(p.profileFrame)+'.svg?v=20261019-person-border")');card.append(frame)}
   body.append(elem('h2','',p.displayName||name));
   if(p.nameplateStyle&&/^[a-z0-9-]{1,60}$/.test(p.nameplateStyle)&&p.nameplateStyle!=='none'){
     const plate=elem('div','cmd-person-nameplate'),title=elem('b','',p.displayName||name);
     plate.style.backgroundImage='linear-gradient(90deg,#170925bb,#17092555),url("/cmd-art/nameplate/'+p.nameplateStyle+'.svg")';
     plate.append(title);body.append(plate);
   }
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
   if(p.friendStatus!=='self'){
     const mutual=Array.isArray(p.mutualFriends)?p.mutualFriends:[];
     const count=Math.max(mutual.length,Number(p.mutualFriendCount)||0);
     const section=elem('section','cmd-person-section');
     section.append(elem('h3','','Amis en commun ('+count+')'));
     if(!mutual.length)section.append(elem('p','cmd-person-note','Aucun ami en commun pour le moment.'));
     else {
       const list=elem('div','cmd-person-mutual-list');
       for(const friend of mutual){
         const chip=elem('button','cmd-person-mutual');chip.type='button';
         chip.setAttribute('aria-label','Voir le profil de '+(friend.displayName||friend.username||'cet ami'));
         const avatar=validAvatar(friend.avatar)?elem('img','cmd-person-mutual-avatar'):elem('span','cmd-person-mutual-avatar',(friend.displayName||friend.username||'?').slice(0,1).toUpperCase());
         if(avatar.tagName==='IMG'){avatar.src=friend.avatar;avatar.alt='';avatar.onerror=()=>{if(avatar.isConnected)avatar.replaceWith(elem('span','cmd-person-mutual-avatar',(friend.displayName||'?').slice(0,1).toUpperCase()))}}
         chip.append(avatar,elem('span','cmd-person-mutual-name',friend.displayName||friend.username||'Membre'));
         chip.onclick=()=>showProfile({dataset:{cmdAuthorName:friend.displayName||friend.username||'Membre',cmdAuthorUser:friend.username||'',cmdAuthorId:String(friend.id||'')}});
         list.append(chip);
       }
       section.append(list);
     }
     body.append(section);
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
   if(good(p.nameplateStyle)&&p.nameplateStyle!=='none'&&!main.querySelector('.cmd-message-nameplate')){
     const plate=elem('div','cmd-message-nameplate'),title=elem('b','',p.displayName||article.dataset.cmdAuthorName||'Membre');
     plate.style.backgroundImage='linear-gradient(90deg,#170925bb,#17092555),url("/cmd-art/nameplate/'+p.nameplateStyle+'.svg")';
     plate.append(title);main.prepend(plate);article.classList.add('cmd-message-cosmetic');
   }
   if(good(p.profileFrame)&&!article.querySelector('.cmd-message-frame-art')){
     const image=elem('img','cmd-message-frame-art');image.src='/cmd-art/frame/'+p.profileFrame+'.svg?v=20261016member';image.alt='';article.prepend(image);main.style.setProperty('--cmd-message-frame-source','url("/cmd-art/frame/'+p.profileFrame+'.svg?v=20261016bubble")');main.classList.add('cmd-default-message-frame');article.classList.add('cmd-message-cosmetic');
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
   target.addEventListener('click',e=>{e.stopPropagation();showProfile(article)});
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
/* CMD_COMPACT_MESSAGE_MENU_V1: one context menu instead of visible action buttons. */
const compactCss=document.createElement('style');
compactCss.textContent=`
#channelMessages article.discord-message{position:relative;width:fit-content;max-width:min(100%,680px);min-width:0;display:flex;align-self:flex-start;margin:8px 0;padding:10px 12px;box-sizing:border-box;overflow-wrap:anywhere}
#channelMessages article.discord-message.cmd-own-message{margin-left:auto;align-self:flex-end}
#channelMessages article.discord-message .msg-main{flex:0 1 auto;min-width:0;max-width:100%;overflow-wrap:anywhere}
#channelMessages article.discord-message .msg-text{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
#channelMessages article.discord-message .msg-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
#channelMessages article.discord-message .reply-mini,
#channelMessages article.discord-message .cmd-message-delete,
#channelMessages article.discord-message .cmd-message-edit,
#channelMessages article.discord-message .cmd-translation-tools{display:none!important}
#channelMessages article.discord-message.cmd-message-cosmetic{width:fit-content!important;max-width:min(100%,680px)!important;padding:11px 13px!important;overflow:hidden!important;border-radius:15px}
#channelMessages article.discord-message .cmd-message-frame-art{display:none!important}
#channelMessages article.discord-message.cmd-message-cosmetic{border:6px solid transparent!important;border-image-source:var(--cmd-message-frame-source)!important;border-image-slice:28% 20% 28% 20%!important;border-image-width:6px!important;border-image-repeat:stretch!important}
#channelMessages article.discord-message .cmd-message-nameplate{max-width:min(190px,100%);min-height:29px;padding:4px 9px;font-size:12px}
#channelMessages article.discord-message .cmd-message-avatar-ornament{inset:-8%;width:116%;height:116%}
.cmd-compact-action-menu{position:fixed;z-index:12000;width:min(350px,calc(100vw - 28px));padding:10px;background:#201b2a;color:#fff;border:1px solid #806299;border-radius:18px;box-shadow:0 20px 70px #000b;max-height:75dvh;overflow-y:auto}
.cmd-compact-action-menu button{display:block;width:100%;min-height:44px;text-align:left;margin:2px 0;padding:11px 14px;border:0;border-radius:10px;background:transparent;color:#f1e8fb;font:600 15px system-ui;cursor:pointer}
.cmd-compact-action-menu button:focus-visible,.cmd-compact-action-menu button:hover{background:#493557;outline:2px solid #87dfff}
.cmd-compact-action-menu .cmd-danger{color:#ffb3c4}
#messages .bubble{display:block;width:fit-content;max-width:min(88%,600px);min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
#messages .bubble.me{margin-left:auto}
#messages .bubble.cmd-chat-framed{width:fit-content!important;max-width:min(88%,600px)!important;border-width:5px!important;border-image-width:5px!important}
@media(max-width:550px){#channelMessages article.discord-message{max-width:94%}#channelMessages article.discord-message.cmd-message-cosmetic{max-width:94%!important}#channelMessages article.discord-message .cmd-message-nameplate{max-width:150px}#messages .bubble{max-width:90%}}
`;
compactCss.textContent+=`
/* Fine scalable contour; no wide decorative photo occupying the bubble */
#channelMessages article.discord-message.cmd-message-cosmetic{border-width:3px!important;border-image-width:3px!important;border-image-slice:28% 20% 28% 20%!important;width:fit-content!important;max-width:94%!important}
#channelMessages article.discord-message.cmd-message-cosmetic>.cmd-message-frame-art{display:none!important}
#channelMessages article.discord-message .cmd-message-nameplate{display:none!important}
#messages .bubble.cmd-chat-framed{border-width:3px!important;border-image-width:3px!important;width:fit-content!important}
@media(max-width:550px){#channelMessages article.discord-message.cmd-message-cosmetic{border-width:2px!important;border-image-width:2px!important}#messages .bubble.cmd-chat-framed{border-width:2px!important;border-image-width:2px!important}}
`;
compactCss.textContent+="#channelMessages article.discord-message.cmd-message-cosmetic{border:0!important;border-image:none!important;overflow:visible!important}#channelMessages article.discord-message .msg-main.cmd-default-message-frame:not(.cmd-chat-framed){border:2px solid transparent!important;border-image-source:var(--cmd-message-frame-source)!important;border-image-slice:28% 20% 28% 20%!important;border-image-width:2px!important;border-image-repeat:stretch!important;padding:7px 9px;width:fit-content;max-width:100%;box-sizing:border-box}";document.head.append(compactCss);
let compactMenu=null,compactTimer=null,compactOrigin=null,suppressMessageClickUntil=0;
/* Opt-in, device-local TTS. Never send a private message to an external speech API.
   Speech must be initiated by a direct user gesture; there is no autoplay. */
const cmdTts={volume:1,language:'',lastStart:0};
const speechEngine=()=>window.speechSynthesis&&typeof window.SpeechSynthesisUtterance==='function'
  ?window.speechSynthesis:null;
try{
 const prefs=JSON.parse(window.localStorage?.getItem('cmd-sphere:tts:prefs')||'{}');
 if([0,.25,.5,.75,1].includes(prefs.volume))cmdTts.volume=prefs.volume;
 if(typeof prefs.language==='string'&&/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(prefs.language))cmdTts.language=prefs.language;
}catch{}
const saveTtsPrefs=()=>{try{window.localStorage?.setItem('cmd-sphere:tts:prefs',JSON.stringify({volume:cmdTts.volume,language:cmdTts.language}))}catch{}};
function stopCmdSpeech(){try{speechEngine()?.cancel()}catch{}}
function speakCmdMessage(text){
 const engine=speechEngine();
 if(!engine||cmdTts.volume===0)return false;
 // A visible local message is the authority for reading it aloud.
 const content=String(text||'').trim().slice(0,2000);
 if(!content||Date.now()-cmdTts.lastStart<750)return false;
 cmdTts.lastStart=Date.now();
 const utterance=new window.SpeechSynthesisUtterance(content);
 utterance.lang=cmdTts.language||document.documentElement.lang||navigator.language||'fr-FR';
 utterance.volume=cmdTts.volume;utterance.rate=1;
 try{engine.cancel();engine.speak(utterance);return true}catch{return false}
}
window.addEventListener('pagehide',stopCmdSpeech);
window.cmdSphereTts={speak:speakCmdMessage,stop:stopCmdSpeech,
 setVolume(value){const v=Number(value);if(![0,.25,.5,.75,1].includes(v))return false;cmdTts.volume=v;saveTtsPrefs();if(!v)stopCmdSpeech();return true},
 setLanguage(value){const lang=String(value||'');if(lang&&!/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(lang))return false;cmdTts.language=lang;saveTtsPrefs();return true},
 getSettings(){return {...cmdTts,supported:!!speechEngine()}}
};
const TTS_LANGUAGES=Object.freeze([
 ['', 'Auto'],['fr-FR','Français'],['en-US','English'],['de-DE','Deutsch'],
 ['es-ES','Español'],['it-IT','Italiano'],['ru-RU','Русский'],
 ['ja-JP','日本語'],['ko-KR','한국어'],['zh-CN','中文']
]);
const ttsLanguageLabel=()=>TTS_LANGUAGES.find(([key])=>key===cmdTts.language)?.[1]||'Auto';
const messageSelector='#channelMessages article.discord-message';
const interactiveSelector='button,a,input,textarea,select,video,audio,[role=button],.cmd-person-target';
function dismissCompactMenu(){if(compactMenu){compactMenu.remove();compactMenu=null}document.removeEventListener('keydown',onCompactEscape)}
function onCompactEscape(e){if(e.key==='Escape')dismissCompactMenu()}
async function openForumThreadEditor(article){
 const ctx=window.cmdSphereMessageActions?.context?.(),messageId=String(article?.dataset?.messageId||'');
 if(!ctx||ctx.channelType!=='forum'||!messageId)return;
 const params=new URLSearchParams({guildId:ctx.guildId,channelId:ctx.channelId,messageId});
 try{
  const response=await fetch('/api/native/forum-thread?'+params.toString(),{credentials:'same-origin',cache:'no-store'});
  const state=await response.json();if(!response.ok)throw Error(state.error||'Fil inaccessible');
  const shade=elem('div','cmd-forum-thread-shade');
  shade.style.cssText='position:fixed;inset:0;z-index:15000;display:grid;place-items:center;background:#000c;padding:14px';
  shade.setAttribute('role','presentation');
  const box=elem('section','cmd-forum-thread-settings');box.setAttribute('role','dialog');box.setAttribute('aria-label','Gestion du fil de discussion');
  box.style.cssText='color:#fff;background:#22172e;border:1px solid #a87bdc;border-radius:17px;padding:20px;max-width:430px;width:100%;box-shadow:0 12px 60px #000c';
  box.append(elem('h3','', 'Gestion du fil'));
  const mkCheck=(label,checked)=>{const row=elem('label');row.style.cssText='display:flex;gap:10px;align-items:center;margin:12px 0';const input=elem('input');input.type='checkbox';input.checked=Boolean(checked);row.append(input,document.createTextNode(label));box.append(row);return input};
  const archive=mkCheck('Fil archivé',state.archived||state.autoArchived),lock=mkCheck('Verrouiller les réponses',state.locked);
  const field=elem('label','', 'Archivage automatique');field.style.cssText='display:grid;gap:7px;margin:13px 0';
  const select=elem('select');select.style.cssText='min-height:44px;background:#1c1028;border:1px solid #a87bdc;border-radius:9px;color:#fff';
  for(const [value,text] of [[0,'Désactivé'],[1,'1 heure'],[24,'1 jour'],[72,'3 jours'],[168,'7 jours'],[720,'30 jours']]){
    const option=elem('option','',text);option.value=String(value);option.selected=Number(state.autoArchiveHours)===value;select.append(option);
  }
  field.append(select);box.append(field);
  const info=elem('p','', 'Les messages déjà publiés restent conservés.');info.style.fontSize='12px';box.append(info);
  const row=elem('div');row.style.cssText='display:flex;gap:9px;justify-content:flex-end;margin-top:15px';
  const close=elem('button','', 'Fermer'),save=elem('button','', 'Enregistrer');
  for(const b of [close,save])b.style.cssText='min-height:44px;padding:9px 13px;background:#4d2968;color:#fff;border:1px solid #ab8ddd;border-radius:10px;cursor:pointer';
  close.onclick=()=>shade.remove();
  save.onclick=async()=>{
    save.disabled=true;
    try{
      const result=await fetch('/api/native/forum-thread',{method:'PATCH',credentials:'same-origin',
       headers:{'content-type':'application/json'},body:JSON.stringify({...Object.fromEntries(params),archived:archive.checked,locked:lock.checked,autoArchiveHours:Number(select.value)})});
      const body=await result.json();if(!result.ok)throw Error(body.error||'Modification refusée');
      shade.remove();
    }catch(error){window.alert?.(error.message)}finally{save.disabled=false}
  };
  row.append(close,save);box.append(row);shade.append(box);
  shade.addEventListener('click',e=>{if(e.target===shade)shade.remove()});
  document.body.append(shade);close.focus();
 }catch(error){window.alert?.(error.message)}
}
function openCompactMenu(article,x,y){
 dismissCompactMenu();
 const menu=elem('div','cmd-compact-action-menu');menu.setAttribute('role','menu');menu.setAttribute('aria-label','Actions du message');
 function action(title,handler,danger=false){const b=elem('button',danger?'cmd-danger':'',title);b.type='button';b.setAttribute('role','menuitem');b.onclick=()=>{dismissCompactMenu();handler()};menu.append(b)}
 const reply=article.querySelector('.reply-mini');if(reply)action('↩ Répondre',()=>reply.click());
 const translate=article.querySelector('.cmd-translate-action'),original=article.querySelector('.cmd-original-action');
 if(translate)action('🌐 Traduire',()=>translate.click());
 if(original&&!original.hidden)action('Voir l’original',()=>original.click());
 const content=article.querySelector('.msg-text')?.innerText||article.querySelector('.msg-text')?.textContent||'';
 if(content&&speechEngine()){
   action('🔊 Lire à voix haute',()=>{if(!speakCmdMessage(content)){try{window.alert?.('Lecture vocale indisponible ou désactivée.') }catch{}}});
   action('■ Arrêter la lecture',stopCmdSpeech);
   action('🔈 Volume vocal : '+Math.round(cmdTts.volume*100)+' %',()=>{const choices=[1,.75,.5,.25,0];const current=choices.indexOf(cmdTts.volume);window.cmdSphereTts.setVolume(choices[(current+1)%choices.length])});
   action('🌐 Langue vocale : '+ttsLanguageLabel(),()=>{
     const index=TTS_LANGUAGES.findIndex(([key])=>key===cmdTts.language);
     const next=TTS_LANGUAGES[(index+1)%TTS_LANGUAGES.length]?.[0]||'';
     window.cmdSphereTts.setLanguage(next);
   });
 }
 if(window.cmdSphereSensitiveMedia?.toggle){
   action(window.cmdSphereSensitiveMedia.get()?'🖼 Afficher les médias':'🛡️ Flouter les photos et vidéos',
    ()=>window.cmdSphereSensitiveMedia.toggle().catch(e=>window.alert?.(e.message)));
   if(window.cmdSphereSensitiveMedia.get()&&article.querySelector('.msg-image,video'))
     action('Afficher les médias de ce message',()=>window.cmdSphereSensitiveMedia.revealArticle(article));
 }
 if(content)action('Copier le texte',()=>navigator.clipboard?.writeText(content).catch(()=>{}));
 if(article.dataset.messageId&&window.cmdSphereReminders&&window.cmdSphereMessageActions?.context?.()){
  action('⏰ Me rappeler ce message',()=>window.cmdSphereReminders.open(article));
  action('📅 Gérer mes rappels',()=>window.cmdSphereReminders.list());
 }
 if(window.cmdSphereProductivity?.saveMessage)action('⭐ Ajouter aux favoris',()=>window.cmdSphereProductivity.saveMessage(article));
 const cmdNativeContext=window.cmdSphereMessageActions?.context?.();
 if(article.dataset.messageId&&cmdNativeContext&&String(article.dataset.cmdSource||'')!=='discord_archive'&&window.cmdSphereForwardMessage?.open)
   action('↪ Transférer dans un salon',()=>window.cmdSphereForwardMessage.open(article));
 const edit=article.querySelector('.cmd-message-edit');if(edit)action('✎ Modifier',()=>edit.click());
 const del=article.querySelector('.cmd-message-delete');if(del)action('🗑 Supprimer',()=>del.click(),true);
 if(article.dataset.cmdAuthorId||article.dataset.cmdAuthorUser)action('Ouvrir le profil',()=>showProfile(article));
 if(content&&navigator.share)action('Partager',()=>navigator.share({text:content}).catch(()=>{}));
 if(window.cmdSphereMessageActions?.context?.()?.channelType==='forum'&&article.dataset.messageId)action('🗂️ Gestion du fil',()=>{void openForumThreadEditor(article)});
 if(article.dataset.messageId)action('Copier le lien du message',()=>navigator.clipboard?.writeText(location.href.split('#')[0]+'#message-'+encodeURIComponent(article.dataset.messageId)).catch(()=>{}));
 if(!menu.children.length)return;
 document.body.append(menu);compactMenu=menu;const w=menu.offsetWidth,h=menu.offsetHeight;
 menu.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-h-8))+'px';
 menu.querySelector('button')?.focus();document.addEventListener('keydown',onCompactEscape);
}
document.addEventListener('contextmenu',e=>{
 const article=e.target.closest?.(messageSelector);
 if(!article||e.target.closest(interactiveSelector))return;e.preventDefault();clearTimeout(compactTimer);compactTimer=null;suppressMessageClickUntil=Date.now()+900;openCompactMenu(article,e.clientX,e.clientY)
});
document.addEventListener('touchstart',e=>{
 const article=e.target.closest?.(messageSelector);if(!article||e.touches.length!==1||e.target.closest(interactiveSelector))return;
 const touch=e.touches[0],x=touch.clientX,y=touch.clientY;clearTimeout(compactTimer);
 compactOrigin={x,y};compactTimer=setTimeout(()=>{compactTimer=null;suppressMessageClickUntil=Date.now()+900;openCompactMenu(article,x,y);try{navigator.vibrate?.(15)}catch{}},550);
},{passive:true});
document.addEventListener('touchmove',e=>{if(!compactTimer||!compactOrigin)return;const t=e.touches[0];if(!t||Math.abs(t.clientX-compactOrigin.x)>12||Math.abs(t.clientY-compactOrigin.y)>12){clearTimeout(compactTimer);compactTimer=null}},{passive:true});
for(const name of ['touchend','touchcancel','scroll'])document.addEventListener(name,()=>{clearTimeout(compactTimer);compactTimer=null},{passive:true,capture:true});
document.addEventListener('click',e=>{
 const article=e.target.closest?.(messageSelector);if(!article)return;
 if(e.target.closest(interactiveSelector))return;
 if(Date.now()<suppressMessageClickUntil){e.preventDefault();e.stopImmediatePropagation();return}
 if(window.getSelection()?.toString())return;
 openCompactMenu(article,e.clientX,e.clientY);
},true);
document.addEventListener('pointerdown',e=>{if(compactMenu&&!e.target.closest('.cmd-compact-action-menu'))dismissCompactMenu()},true);

})();
