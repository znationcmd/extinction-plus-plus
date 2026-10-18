/* CMD Sphere media privacy, opt-in for all photo/video attachments.
 * No automatic sensitivity classification; no effect on avatars/stickers.
 * Images remain on their original URLs and are never deleted or uploaded.
 */
(()=>{"use strict";
 if(window.cmdSphereSensitiveMedia)return;
 const state={blurAttachments:false};
 const css=document.createElement("style");
 css.textContent=`
 #channelMessages .cmd-media-private:not(.cmd-media-revealed) img.msg-image,
 #channelMessages .cmd-media-private:not(.cmd-media-revealed) video,
 #channelMessages .cmd-media-private:not(.cmd-media-revealed) img.cmd-chat-gif {filter:blur(19px)!important;pointer-events:none!important}
 #channelMessages .cmd-media-private{position:relative;isolation:isolate}
 #channelMessages .cmd-media-reveal{position:absolute;inset:0;z-index:6;width:100%;height:100%;min-height:44px;border:1px solid #ae89de;background:#150f19b3;color:white;border-radius:10px;font:700 13px system-ui;cursor:pointer;display:grid;place-items:center}
 #channelMessages .cmd-media-reveal:focus-visible{outline:3px solid #baddff;outline-offset:2px}
 `;
 document.head.append(css);
 const selector='a.msg-image-link, .msg-embed img.msg-image, .msg-file:has(video)';
 const changed=new Set();
 function refresh(){
  const root=document.querySelector('#channelMessages');if(!root)return;
  for(const node of root.querySelectorAll(selector)){
   if(!state.blurAttachments){node.classList.remove('cmd-media-private','cmd-media-revealed');node.querySelector(':scope > .cmd-media-reveal')?.remove();continue}
   if(node.dataset.cmdSensitiveMediaWired!=='1'){
    node.dataset.cmdSensitiveMediaWired='1';
    if(node.matches('a'))node.addEventListener('click',e=>{
     if(state.blurAttachments&&!node.classList.contains('cmd-media-revealed'))e.preventDefault();
    });
   }
   node.classList.add('cmd-media-private');
   const alreadyRevealed=changed.has(node);
   node.classList.toggle('cmd-media-revealed',alreadyRevealed);
   if(!alreadyRevealed&&!node.querySelector(':scope > .cmd-media-reveal')){
    const button=document.createElement('button');
    button.type='button';button.className='cmd-media-reveal';
    button.textContent='🛡️ Afficher le média';button.setAttribute('aria-label','Afficher ce média masqué');
    button.onclick=e=>{e.preventDefault();e.stopPropagation();changed.add(node);node.classList.add('cmd-media-revealed');button.remove()};
    node.append(button);
   }
  }
 }
 async function request(method,value){
  const response=await fetch('/api/account/sensitive-media',{
   method,credentials:'same-origin',cache:'no-store',
   headers:method==='PATCH'?{'content-type':'application/json'}:{},
   ...(method==='PATCH'?{body:JSON.stringify({blurAttachments:value})}:{})
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||'Impossible de modifier la confidentialité des médias.');
  state.blurAttachments=body.blurAttachments===true;
  if(!state.blurAttachments)changed.clear();
  refresh();
  return state.blurAttachments;
 }
 const api={
  get:()=>state.blurAttachments,
  toggle:()=>request('PATCH',!state.blurAttachments),
  set:v=>request('PATCH',Boolean(v)),
  revealArticle(article){if(!article||!state.blurAttachments)return;for(const node of article.querySelectorAll(selector)){changed.add(node)}refresh()}
 };
 window.cmdSphereSensitiveMedia=api;
 function mount(){
  if(!document.querySelector('#channelMessages'))return;
  const observer=new MutationObserver(()=>refresh());
  observer.observe(document.querySelector('#channelMessages'),{childList:true,subtree:true});
  request('GET').catch(()=>{});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();
