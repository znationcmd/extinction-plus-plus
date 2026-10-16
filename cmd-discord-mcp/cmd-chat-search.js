/* CMD Sphere — loaded-message search. Client-side only; does not query global history. */
(()=>{'use strict';
 if(window.cmdSphereChatSearch)return;
 const host=document.querySelector('#channelMessages,#msgs,#messages');
 if(!host)return;
 const header=host.id==='channelMessages'
  ?document.querySelector('#channelOverlay .channel-actions')
  :host.id==='msgs'
   ?document.querySelector('#chatHead .callActions')
   :document.querySelector('#chat .chatHead');
 if(!header)return;
 const style=document.createElement('style');
 style.textContent='.cmd-search-launch{border:1px solid #8966b0!important;background:#332244!important;color:#fff!important;border-radius:9px!important;min-width:38px!important;min-height:38px!important;padding:6px 9px!important;font-size:17px!important;cursor:pointer!important}.cmd-search-dialog{width:min(540px,calc(100vw - 24px));max-height:min(76dvh,680px);border:1px solid #9b74c4;border-radius:15px;padding:16px;background:#21182e;color:#f8f2ff;box-shadow:0 16px 60px #000b;position:fixed;inset:0;margin:auto;z-index:100000}.cmd-search-dialog::backdrop{background:#06030bbd}.cmd-search-header{display:flex;align-items:center;justify-content:space-between;gap:10px}.cmd-search-header strong{font-size:16px}.cmd-search-close{padding:6px 12px;border:1px solid #765a98;border-radius:7px;background:#3a2b4d;color:#fff;cursor:pointer}.cmd-search-input{margin:12px 0 8px;display:block;box-sizing:border-box;width:100%;min-height:43px;padding:10px 12px;border:1px solid #aa7ace;border-radius:9px;background:#14101c;color:#fff;font:15px system-ui}.cmd-search-status{font:12px system-ui;color:#c9bdd6;margin:4px 0 12px}.cmd-search-results{max-height:44dvh;overflow-y:auto;display:grid;gap:7px}.cmd-search-result{display:block;text-align:left;width:100%;background:#322541;border:1px solid #6b4e84;color:#fff;border-radius:9px;padding:10px;cursor:pointer;font:13px system-ui;overflow-wrap:anywhere}.cmd-search-result:focus-visible,.cmd-search-launch:focus-visible{outline:2px solid #5aeaff;outline-offset:2px}.cmd-search-flash{outline:2px solid #60eaff!important;outline-offset:3px!important;scroll-margin-block:100px}@media(max-width:600px){.cmd-search-dialog{max-height:82dvh;padding:12px}.cmd-search-result{min-height:46px}}';
 document.head.append(style);
 const launch=document.createElement('button');launch.type='button';launch.className='cmd-search-launch';launch.textContent='⌕';launch.title='Rechercher dans les messages affichés';launch.setAttribute('aria-label','Rechercher dans les messages affichés');
 header.append(launch);
 const dialog=document.createElement('dialog');dialog.className='cmd-search-dialog';dialog.setAttribute('aria-label','Recherche des messages');
 const top=document.createElement('div');top.className='cmd-search-header';
 const title=document.createElement('strong');title.textContent='Rechercher dans cette conversation';
 const close=document.createElement('button');close.type='button';close.className='cmd-search-close';close.textContent='Fermer';top.append(title,close);
 const input=document.createElement('input');input.type='search';input.className='cmd-search-input';input.placeholder='Mot ou expression…';input.setAttribute('aria-label','Mots à rechercher');
 const status=document.createElement('p');status.className='cmd-search-status';status.setAttribute('aria-live','polite');status.textContent='Recherche limitée aux messages déjà chargés à l’écran.';
 const results=document.createElement('div');results.className='cmd-search-results';
 dialog.append(top,input,status,results);document.body.append(dialog);
 let searchSeq=0,lastFlash=null,updatePending=false;
 const items=()=>host.id==='channelMessages'
  ?host.querySelectorAll('article.discord-message')
  :host.id==='msgs'
   ?host.querySelectorAll('.bubble')
   :host.querySelectorAll('article.msg');
 function messageContent(node){
  const content=host.id==='channelMessages'
   ?node.querySelector('.msg-text')
   :host.id==='msgs'
    ?node
    :node.querySelector('.text');
  if(!content)return '';
  if(host.id!=='msgs')return (content.textContent||'').trim();
  const copy=content.cloneNode(true);
  copy.querySelectorAll('small,.sender,.cmd-dm-active-plate,button').forEach(n=>n.remove());
  return (copy.textContent||'').trim();
 }
 function isOpen(){return dialog.open||dialog.hasAttribute('open')}
 function closePanel(){if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');}
 function displayResults(){
  if(!isOpen())return;
  const seq=++searchSeq,query=input.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
  const candidates=Array.from(items()).slice(-1500);results.replaceChildren();
  if(!query){status.textContent='Recherche limitée aux '+candidates.length+' messages actuellement chargés.';return}
  let count=0;
  for(const node of candidates){
   const content=messageContent(node);
   if(!content||!content.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').includes(query))continue;
   count++;
   if(count>100)continue;
   const b=document.createElement('button');b.className='cmd-search-result';b.type='button';b.textContent=content.slice(0,180)+(content.length>180?'…':'');
   b.addEventListener('click',()=>{
    closePanel();
    if(!node.isConnected){status.textContent='Le salon a été actualisé. Relance la recherche.';return}
    node.scrollIntoView({behavior:'smooth',block:'center'});
    if(lastFlash)lastFlash.classList.remove('cmd-search-flash');
    node.classList.add('cmd-search-flash');lastFlash=node;
    setTimeout(()=>{node.classList.remove('cmd-search-flash');if(lastFlash===node)lastFlash=null},2200);
   });
   results.append(b);
  }
  if(seq!==searchSeq)return;
  status.textContent=count+' résultat'+(count>1?'s':'')+' parmi '+candidates.length+' messages chargés'+(count>100?' (100 premiers affichés)':'')+'.';
  if(count===0){const empty=document.createElement('p');empty.textContent='Aucun message correspondant dans les messages chargés.';results.append(empty)}
 }
 function openPanel(){
  if(isOpen()){input.focus();return}
  if(typeof dialog.showModal==='function'){try{dialog.showModal()}catch{dialog.setAttribute('open','')}}else dialog.setAttribute('open','');
  input.focus();input.select();displayResults();
 }
 launch.addEventListener('click',openPanel);close.addEventListener('click',closePanel);
 input.addEventListener('input',displayResults);
 document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLocaleLowerCase()==='f'){
   e.preventDefault();openPanel();
  }
  if(e.key==='Escape'&&isOpen())closePanel();
 });
 new MutationObserver(()=>{
  if(!isOpen()||updatePending)return;
  updatePending=true;setTimeout(()=>{updatePending=false;displayResults()},160);
 }).observe(host,{childList:true,subtree:true,characterData:true});
 window.cmdSphereChatSearch={open:openPanel,version:'2026-10-16-lot5',scope:'loaded-messages-only'};
})();