/* CMD Sphere — navigation to new messages. Works on loaded server channels and private chats.
 * Does not change account settings or modify message content. */
(()=>{'use strict';
 if(window.cmdSphereChatNavigation)return;
 const host=document.querySelector('#channelMessages,#msgs,#messages');
 if(!host)return;
 const messageSelector=host.id==='channelMessages'?'article.discord-message':host.id==='msgs'?'.bubble':'article.msg';
 const style=document.createElement('style');
 style.textContent='.cmd-jump-new{position:fixed;z-index:85;right:max(12px,env(safe-area-inset-right));bottom:calc(96px + env(safe-area-inset-bottom));display:none;align-items:center;justify-content:center;gap:6px;padding:10px 15px;min-height:42px;border-radius:24px;border:1px solid #a878e2;color:#fff;background:#3c2462;box-shadow:0 6px 24px #000a;font:650 13px system-ui;cursor:pointer;max-width:calc(100vw - 24px)}.cmd-jump-new[data-visible="true"]{display:flex}.cmd-jump-new:focus-visible{outline:2px solid #6ee7ff;outline-offset:3px}@media(max-width:600px){.cmd-jump-new{bottom:calc(88px + env(safe-area-inset-bottom));right:12px;padding:9px 13px}}';
 document.head.append(style);
 const jump=document.createElement('button');
 jump.type='button';jump.className='cmd-jump-new';jump.textContent='↓ Aller aux messages récents';
 jump.setAttribute('aria-label','Aller aux messages les plus récents');
 document.body.append(jump);
 const remaining=()=>Math.max(0,host.scrollHeight-host.clientHeight-host.scrollTop);
 const nearBottom=()=>remaining()<110;
 let lastCount=host.querySelectorAll(messageSelector).length,unread=0;
 let scope='',initialized=false,pending=false;
 function currentScope(){
  try{
   if(host.id==='channelMessages'){
    const g=typeof CHAT!=='undefined'?(CHAT.guildId||''):'';
    const c=typeof CHAT!=='undefined'?(CHAT.channelId||''):'';
    return 'server:'+g+':'+c;
   }
   if(typeof active!=='undefined'&&active)return (host.id==='msgs'?'private:':'community:')+active;
   return location.search;
  }catch{return location.search}
 }
 function reset(){
  scope=currentScope();lastCount=host.querySelectorAll(messageSelector).length;unread=0;
  initialized=true;update();
 }
 function update(){
  const show=remaining()>130;
  jump.dataset.visible=show?'true':'false';
  jump.textContent=unread>0?'↓ '+(unread>99?'99+':unread)+' nouveau'+(unread>1?'x':'')+' message'+(unread>1?'s':''):'↓ Messages récents';
  jump.setAttribute('aria-label',jump.textContent);
  if(!show)unread=0;
 }
 jump.addEventListener('click',()=>{
  host.scrollTo({top:host.scrollHeight,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  unread=0;setTimeout(update,280);
 });
 host.addEventListener('scroll',update,{passive:true});
 const observer=new MutationObserver(()=>{
  if(pending)return;pending=true;
  requestAnimationFrame(()=>{
   pending=false;
   const nextScope=currentScope(),count=host.querySelectorAll(messageSelector).length;
   if(!initialized||scope!==nextScope){reset();return}
   if(count>lastCount&&remaining()>150)unread=Math.min(999,unread+count-lastCount);
   lastCount=count;update();
  });
 });
 observer.observe(host,{childList:true,subtree:true});
 window.addEventListener('popstate',reset);
 setInterval(()=>{if(currentScope()!==scope)reset()},1200);
 reset();
 window.cmdSphereChatNavigation={version:'2026-10-16-lot6',goToLatest:()=>jump.click(),loadedOnly:true};
})();