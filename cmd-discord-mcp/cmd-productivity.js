/* CMD Sphere lot 4 — local drafts and saved messages. No server mutations. */
(()=>{'use strict';
if(window.cmdSphereProductivity)return;
const host=document.querySelector('#channelMessages,#msgs,#messages');
if(!host)return;
const input=document.querySelector(host.id==='channelMessages'?'#channelInput':host.id==='msgs'?'#msg':'#input');
if(!input)return;
const PREFIX='cmd:sphere:productivity:v1:';
function me(){
 try{
  if(host.id==='channelMessages'&&window.CMD_CHAT_USER_ID)return String(window.CMD_CHAT_USER_ID);
  if(typeof ME!=='undefined'&&ME)return String(ME);
  if(window.CMD_CHAT_USER_ID)return String(window.CMD_CHAT_USER_ID);
 }catch{}
 return null;
}
function locationKey(){
 try{
  if(host.id==='channelMessages'){
   if(typeof CHAT==='undefined'||!CHAT.guildId||!CHAT.channelId)return null;
   return 'server:'+String(CHAT.guildId)+':'+String(CHAT.channelId);
  }
  if(typeof active!=='undefined'&&active)return (host.id==='msgs'?'private:':'community:')+String(active);
  const opened=new URL(location.href).searchParams.get('open');
  return opened?'private:'+opened:null;
 }catch{return null}
}
function storageKey(kind,suffix=''){
 const user=me();
 return user?PREFIX+encodeURIComponent(user)+':'+kind+':'+encodeURIComponent(suffix):null;
}
function safeGet(k){try{return k?localStorage.getItem(k):null}catch{return null}}
function safeSet(k,v){try{if(!k)return false;if(v)localStorage.setItem(k,v);else localStorage.removeItem(k);return true}catch{return false}}
function bookmarks(){
 try{const list=JSON.parse(safeGet(storageKey('favorites'))||'[]');return Array.isArray(list)?list.filter(x=>x&&typeof x.text==='string'&&typeof x.scope==='string').slice(0,50):[]}catch{return []}
}
function note(message){
 const n=document.createElement('div');n.className='cmd-prod-toast';n.textContent=message;document.body.append(n);
 setTimeout(()=>n.remove(),2000);
}
function extract(node){
 const clone=node.cloneNode(true);
 clone.querySelectorAll('button,time,small,.msg-avatar,.msg-meta,.cmd-message-nameplate,.cmd-dm-active-plate').forEach(e=>e.remove());
 return String((clone.querySelector('.msg-text,.msg-body,.msg-main')||clone).textContent||'').trim().slice(0,1500);
}
function saveMessage(node){
 const sk=storageKey('favorites'),sc=locationKey();
 if(!sk||!sc){note('Conversation ou utilisateur indisponible');return false}
 const text=extract(node);if(!text)return false;
 const messageId=String(node.dataset.messageId||node.dataset.id||'').slice(0,100);
 const unique=sc+':'+(messageId||text);
 const all=bookmarks();
 const stored=safeSet(sk,JSON.stringify([{unique,scope:sc,messageId,text,at:new Date().toISOString()},...all.filter(x=>x.unique!==unique)].slice(0,50)));
 note(stored?'Message enregistré dans les favoris':'Stockage local indisponible');
 return stored;
}
const css=document.createElement('style');
css.textContent='.cmd-prod-tools{position:relative;z-index:9;flex:none;margin:4px 0;max-width:100%}.cmd-prod-tools summary{min-height:36px;padding:8px 12px;color:#e7d9fc;background:#281a39;border:1px solid #8465a4;border-radius:9px;font:600 12px system-ui;cursor:pointer;list-style:none}.cmd-prod-tools[open] .cmd-prod-menu{padding:7px 0}.cmd-prod-tools button{background:#302046;color:#fff;border:1px solid #775493;border-radius:9px;padding:8px;margin-right:5px;cursor:pointer}.cmd-prod-modal{border-radius:14px;width:min(460px,92vw);max-height:75vh;overflow:auto;color:#fff;background:#20142b;border:1px solid #9b78b4;padding:16px}.cmd-prod-modal::backdrop{background:#000b}.cmd-prod-modal button{background:#4c3462;border:0;color:#fff;border-radius:8px;padding:8px 10px;cursor:pointer}.cmd-prod-entry{border-bottom:1px solid #87689966;padding:10px 0;overflow-wrap:anywhere;font:13px system-ui}.cmd-prod-entry small{display:block;color:#bba6c8;margin:4px 0}.cmd-prod-toast{position:fixed;z-index:2147483000;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 14px;border-radius:9px;background:#38214b;color:white;box-shadow:0 6px 20px #0009}';
document.head.append(css);
const tools=document.createElement('details');tools.className='cmd-prod-tools';
const summary=document.createElement('summary');summary.textContent='✏️ Brouillons · ⭐ Favoris';
const menu=document.createElement('div');menu.className='cmd-prod-menu';
const showFav=document.createElement('button');showFav.type='button';showFav.textContent='Voir mes favoris';
const clearDraft=document.createElement('button');clearDraft.type='button';clearDraft.textContent='Effacer le brouillon';
menu.append(showFav,clearDraft);tools.append(summary,menu);
const panel=document.createElement('dialog');panel.className='cmd-prod-modal';
const heading=document.createElement('h3');heading.textContent='Messages favoris';
const entries=document.createElement('div');const close=document.createElement('button');
close.type='button';close.textContent='Fermer';close.addEventListener('click',()=>panel.close());
panel.append(heading,entries,close);document.body.append(panel);
showFav.addEventListener('click',()=>{
 entries.replaceChildren();
 const list=bookmarks();
 if(!list.length){entries.textContent='Aucun message favori sur cet appareil.'}
 for(const item of list){
  const row=document.createElement('div');row.className='cmd-prod-entry';
  const where=document.createElement('small');where.textContent=item.scope;
  const p=document.createElement('p');p.textContent=item.text;
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copier';
  copy.addEventListener('click',()=>{navigator.clipboard?.writeText(item.text).then(()=>note('Texte copié')).catch(()=>note('Copie impossible'))});
  const remove=document.createElement('button');remove.type='button';remove.textContent='Supprimer';
  remove.addEventListener('click',()=>{const remaining=bookmarks().filter(x=>x.unique!==item.unique);safeSet(storageKey('favorites'),JSON.stringify(remaining));row.remove()});
  row.append(where,p,copy,remove);entries.append(row);
 }
 try{panel.showModal()}catch{panel.setAttribute('open','')}
 tools.open=false;
});
const bar=input.closest('form')||input.parentElement;
bar?.parentElement?.insertBefore(tools,bar);
let lastScope=null,lastContent='';
function synchronize(){
 const sc=locationKey(),k=sc?storageKey('draft',sc):null;
 if(k!==lastScope){
  lastScope=k;lastContent=safeGet(k)||'';
  if(k&&input.value!==lastContent){input.value=lastContent;input.dispatchEvent(new Event('input',{bubbles:false}))}
  return;
 }
 if(!k)return;
 const current=String(input.value||'').slice(0,8000);
 if(current!==lastContent){safeSet(k,current);lastContent=current}
}
input.addEventListener('input',()=>{
 const k=locationKey()?storageKey('draft',locationKey()):null;
 if(k&&k===lastScope){const content=String(input.value||'').slice(0,8000);safeSet(k,content);lastContent=content}
});
clearDraft.addEventListener('click',()=>{
 if(lastScope){safeSet(lastScope,'');lastContent=''}input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));tools.open=false;note('Brouillon effacé');
});
synchronize();setInterval(synchronize,900);
window.addEventListener('popstate',()=>setTimeout(synchronize,80));
window.cmdSphereProductivity={saveMessage,showFavorites:()=>showFav.click(),version:'2026-10-16-lot4',deviceOnly:true};
/* Private messages: bookmark using native context menu or long press. Server menu is extended separately. */
if(host.id==='msgs'){
 let timer=null,start=null;
 host.addEventListener('contextmenu',e=>{
  const bubble=e.target.closest('.bubble');if(!bubble)return;
  e.preventDefault();
  if(confirm('Enregistrer ce message dans les favoris sur cet appareil ?'))saveMessage(bubble);
 });
 host.addEventListener('touchstart',e=>{
  const bubble=e.target.closest('.bubble');if(!bubble||e.touches.length!==1)return;
  const t=e.touches[0];start={x:t.clientX,y:t.clientY};
  timer=setTimeout(()=>{timer=null;if(confirm('Enregistrer ce message dans les favoris ?'))saveMessage(bubble)},650);
 },{passive:true});
 host.addEventListener('touchmove',e=>{
  if(!timer||!start)return;const t=e.touches[0];
  if(!t||Math.abs(t.clientX-start.x)>12||Math.abs(t.clientY-start.y)>12){clearTimeout(timer);timer=null}
 },{passive:true});
 for(const event of ['touchend','touchcancel','scroll'])host.addEventListener(event,()=>{clearTimeout(timer);timer=null},{passive:true,capture:true});
}
})();