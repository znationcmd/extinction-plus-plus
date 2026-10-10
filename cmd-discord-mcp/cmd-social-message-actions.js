/* CMD Sphere local member profiles, friendship and message moderation. No Discord writes. */
(()=>{'use strict';
const style=document.createElement('style');
style.textContent='.cmd-person-target{cursor:pointer;touch-action:manipulation}.cmd-person-target:focus-visible,.cmd-message-delete:focus-visible{outline:2px solid #ad93ff;outline-offset:3px}.cmd-message-delete{margin-left:auto;background:transparent;color:#ffc5cd;border:1px solid #e47c9666;border-radius:9px;padding:4px 8px;font:700 11px system-ui;cursor:pointer;min-height:30px}.cmd-message-delete:hover{background:#8d183344}.cmd-person-overlay{position:fixed;inset:0;z-index:11000;background:#000c;display:flex;align-items:center;justify-content:center;padding:18px}.cmd-person-card{position:relative;width:min(440px,100%);max-height:88dvh;overflow:auto;color:#f5f2ff;background:#22212b;border-radius:22px;border:1px solid #ffffff25;box-shadow:0 22px 90px #000c}.cmd-person-banner{height:108px;background:linear-gradient(110deg,#7c3aed,#37245d);background-size:cover;background-position:center}.cmd-person-close{position:absolute;right:12px;top:12px;border:0;background:#14121cbb;color:#fff;width:38px;height:38px;border-radius:12px;font-size:24px;cursor:pointer}.cmd-person-body{padding:0 20px 24px}.cmd-person-avatar{position:relative;margin-top:-45px;width:88px;height:88px;border:5px solid #22212b;border-radius:50%;background:#383344;object-fit:cover;display:grid;place-items:center;font-size:32px;font-weight:900}.cmd-person-body h2{font-size:22px;margin:8px 0 2px;overflow-wrap:anywhere}.cmd-person-handle{color:#c2b9d3;font-size:13px}.cmd-person-bio{white-space:pre-wrap;overflow-wrap:anywhere;margin:15px 0;color:#e1d9eb}.cmd-person-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}.cmd-person-actions button{background:#6b47ca;border:0;border-radius:11px;color:white;padding:11px 16px;font:800 14px system-ui;cursor:pointer}.cmd-person-actions button:disabled{opacity:.6;cursor:default}.cmd-person-note{color:#c4bdd4;font-size:13px}@media(max-width:550px){.cmd-person-overlay{align-items:flex-end;padding:0}.cmd-person-card{width:100%;max-height:86dvh;border-radius:24px 24px 0 0;padding-bottom:env(safe-area-inset-bottom)}}';
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
 const ctx=context(),name=article.dataset.cmdAuthorName||'Utilisateur',id=article.dataset.cmdAuthorId||'';
 const card=overlay('Profil de '+name),banner=elem('div','cmd-person-banner'),body=elem('div','cmd-person-body');
 card.prepend(banner);card.append(body);body.append(elem('h2','',name),elem('p','cmd-person-note','Chargement du profil…'));
 const native=ctx&&(ctx.mode==='native'||ctx.mode==='combined')&&article.dataset.cmdSource==='cmd';
 if(!native||!id){body.lastElementChild.textContent='Profil du service externe : les demandes d’amis CMD Sphere ne sont disponibles que pour les comptes CMD Sphere.';return}
 try{
   const {profile:p}=await request('/api/native/member-profile?guildId='+encodeURIComponent(ctx.guildId)+'&userId='+encodeURIComponent(id));
   if(!card.isConnected)return;
   body.replaceChildren();
   if(validAvatar(p.banner)){banner.style.backgroundImage='url('+JSON.stringify(p.banner)+')'}else if(/^#[0-9a-f]{3,8}$/i.test(p.accentColor||'')){banner.style.background='linear-gradient(130deg,'+p.accentColor+',#191524)'}
   if(validAvatar(p.avatar)){const img=elem('img','cmd-person-avatar');img.src=p.avatar;img.alt='Photo de profil';body.append(img)}else body.append(elem('div','cmd-person-avatar',(p.displayName||name).slice(0,1).toUpperCase()));
   body.append(elem('h2','',p.displayName||name));
   if(p.username)body.append(elem('div','cmd-person-handle','@'+p.username));
   if(p.membershipRole==='owner')body.append(elem('div','cmd-person-note','👑 Propriétaire du serveur'));
   if(p.status)body.append(elem('div','cmd-person-note',p.status));
   if(p.bio)body.append(elem('p','cmd-person-bio',p.bio));
   const actions=elem('div','cmd-person-actions');body.append(actions);
   if(p.external){body.append(elem('p','cmd-person-note','Profil importé : compte CMD Sphere non identifié.'));return}
   let label={self:'C’est ton profil',friends:'✓ Déjà amis',sent:'Demande envoyée ✓',received:'Accepter la demande d’ami',none:'＋ Ajouter en ami'}[p.friendStatus]||'Ajouter en ami';
   const btn=elem('button','',label);btn.type='button';btn.disabled=['self','friends','sent'].includes(p.friendStatus);
   btn.addEventListener('click',async()=>{
     btn.disabled=true;
     try{const r=await request('/api/friends/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:p.id})});btn.textContent=r.accepted||r.alreadyFriends?'✓ Ami':'Demande envoyée ✓'}
     catch(err){btn.disabled=false;btn.textContent='Réessayer : '+err.message}
   });actions.append(btn);
 }catch(err){if(card.isConnected)body.replaceChildren(elem('h2','',name),elem('p','cmd-person-note',err.message))}
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
 if(!authorId||article.dataset.cmdSource!=='cmd'||!['native','combined'].includes(ctx.mode))return;
 const id=article.dataset.messageId||'';
 if(!/^[0-9a-f-]{36}$/i.test(id))return;
 access(ctx.guildId).then(perms=>{
   if(!article.isConnected||context()?.guildId!==ctx.guildId||context()?.channelId!==ctx.channelId)return;
   if(!(String(perms.userId)===authorId||perms.isOwner))return;
   const meta=article.querySelector('.msg-meta,.meta');if(!meta||meta.querySelector('.cmd-message-delete'))return;
   const button=elem('button','cmd-message-delete','🗑 Supprimer');button.type='button';button.title='Supprimer ce message';
   button.addEventListener('click',()=>removeMessage(article,button));meta.append(button);
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
