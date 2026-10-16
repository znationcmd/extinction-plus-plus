/* CMD Sphere chat borders — presentation settings for server messages and private messages. */
(()=>{'use strict';
const area=()=>document.querySelector('#channelMessages')?'server':document.querySelector('#msgs,#messages')?'private':null;
const mode=area();if(!mode)return;
const safe=v=>/^[a-z0-9-]{1,60}$/.test(v||'')?v:'none';
const defaults=['none','amethyst','amethystspire','glacialcrown','midnightrose','rubysurge','sapphirearcane','emeraldgeode','celestialgold','moonstone','starforged'];
const stateKey='cmd:chat-border:'+mode;
let selection='none';
try{selection=safe(localStorage.getItem(stateKey))}catch{}
const css=document.createElement('style');
css.textContent='.cmd-chat-frame-switch{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;padding:8px 10px;border:1px solid #8c6aae50;border-radius:10px;background:#1d1228;color:#eadaff;font:600 12px system-ui}.cmd-chat-frame-switch label{min-width:max-content}.cmd-chat-frame-switch select{max-width:210px;min-height:40px;background:#201631;color:white;border:1px solid #795398;border-radius:8px;padding:8px}.cmd-chat-framed{position:relative!important;border:10px solid transparent!important;border-image-source:var(--cmd-chat-border-image)!important;border-image-slice:28% 20% 28% 20%!important;border-image-width:10px!important;border-image-repeat:stretch!important;overflow:visible!important;background-clip:padding-box!important}.cmd-chat-framed>.msg-main,.cmd-chat-framed>.msg-avatar{position:relative;z-index:2}.cmd-chat-framed.bubble{border-width:9px!important;border-image-width:9px!important}.cmd-chat-frame-switch :focus-visible{outline:2px solid #48e4ff}@media(max-width:480px){.cmd-chat-framed{border-width:7px!important;border-image-width:7px!important}}';
css.textContent+=' .cmd-chat-frame-switch{position:relative!important;z-index:4;display:block!important;flex:none!important;margin:4px 0!important;padding:5px 9px!important;max-width:100%;height:auto!important;overflow:visible!important}.cmd-chat-frame-switch:not([open]){width:max-content;max-width:100%}.cmd-chat-frame-switch summary{cursor:pointer;list-style:none;min-height:34px;display:flex;align-items:center;white-space:nowrap}.cmd-chat-frame-switch:not([open]) label,.cmd-chat-frame-switch:not([open]) select{display:none!important}.cmd-chat-frame-switch[open] label,.cmd-chat-frame-switch[open] select{display:block;margin:5px 0}.cmd-chat-framed.msg-main{border-width:3px!important;border-image-width:3px!important;max-width:100%!important;box-sizing:border-box!important;overflow-wrap:anywhere!important}.discord-message.cmd-message-cosmetic{border:0!important;border-image:none!important}.discord-message.cmd-message-cosmetic>.cmd-message-frame-art{display:none!important}@media(max-width:550px){.cmd-chat-framed.msg-main{border-width:2px!important;border-image-width:2px!important}}';
css.textContent+=' #msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{border-width:2px!important;border-image-width:2px!important;box-sizing:border-box}';
css.textContent+=' /* Mobile crystal frame: substantial visible artwork, kept outside the readable message area. */ #channelMessages article.discord-message[data-cmd-source="cmd"] .msg-main.cmd-chat-framed,#msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{border:clamp(16px,4.5vw,30px) solid transparent!important;border-image-source:var(--cmd-chat-border-image)!important;border-image-slice:28% 20% 28% 20%!important;border-image-width:1!important;border-image-outset:clamp(5px,1.6vw,12px)!important;border-image-repeat:stretch!important;box-sizing:border-box!important;min-width:0!important;max-width:100%!important;overflow:visible!important;overflow-wrap:anywhere!important;background-clip:padding-box!important} #channelMessages article.discord-message[data-cmd-source="cmd"] .msg-main.cmd-chat-framed{border-radius:16px!important}';
document.head.append(css);
const image=v=>'url("/cmd-art/frame/'+encodeURIComponent(v)+'.svg?v=20261016conversation")';
function paint(){
 const chosen=safe(selection);
 const target=mode==='server'?'#channelMessages article.discord-message[data-cmd-source="cmd"]':'#msgs .bubble,#messages .bubble';
 document.querySelectorAll(target).forEach(node=>{
  const enabled=chosen!=='none'&&(mode==='private'||node.classList.contains('cmd-own-message'));
  const bubble=mode==='server'?(node.querySelector('.msg-main')||node):node;
  node.classList.remove('cmd-chat-framed');
  bubble.classList.toggle('cmd-chat-framed',enabled);
  if(enabled)bubble.style.setProperty('--cmd-chat-border-image',image(chosen));
  else bubble.style.removeProperty('--cmd-chat-border-image');
 });
}
const host=document.querySelector(mode==='server'?'#channelMessages':'#msgs,#messages');
const picker=document.createElement('dialog');picker.className='cmd-frame-dialog';picker.innerHTML='<header><h2>Cadre des messages</h2><button type="button" aria-label="Fermer les cadres">×</button></header><label for="cmdChatFramePicker">Cadre '+(mode==='server'?'des messages serveur':'des messages privés')+'</label><select id="cmdChatFramePicker" aria-label="Choisir le cadre des conversations"></select>';
const select=picker.querySelector('select');for(const id of defaults){const option=document.createElement('option');option.value=id;option.textContent=id==='none'?'Aucun cadre':({amethyst:"Améthyste",amethystspire:"Cathédrale d’améthyste",glacialcrown:"Givre",midnightrose:"Roses",rubysurge:"Rubis",sapphirearcane:"Saphir",emeraldgeode:"Émeraude",celestialgold:"Or",moonstone:"Pierre de lune",starforged:"Étoiles"})[id]||id;select.append(option)}
if(!defaults.includes(selection))selection='none';select.value=selection;
select.addEventListener('change',()=>{selection=safe(select.value);try{localStorage.setItem(stateKey,selection)}catch{}paint()});
document.body.append(picker);
const close=()=>picker.close();picker.querySelector('button').onclick=close;
picker.addEventListener('click',e=>{if(e.target===picker){const r=picker.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
const note=document.createElement('p');note.textContent='Le choix est conservé sur cet appareil. Il modifie le contour sans masquer ton message.';picker.append(note);
function mount(){
 let grid=document.querySelector('#channelToolSheet .compose-sheet-grid');
 if(mode==='private'){
  const form=document.querySelector('#form');if(!form)return;
  let sheet=document.querySelector('#cmdDmToolSheet');
  if(!sheet){
   form.style.position='relative';sheet=document.createElement('div');sheet.id='cmdDmToolSheet';sheet.hidden=true;sheet.className='compose-sheet';sheet.innerHTML='<div class="compose-sheet-grid"></div>';
   const plus=document.createElement('button');plus.type='button';plus.id='cmdDmPlus';plus.textContent='+';plus.setAttribute('aria-label','Outils du message');plus.setAttribute('aria-controls',sheet.id);plus.setAttribute('aria-expanded','false');
   const hide=()=>{sheet.hidden=true;plus.setAttribute('aria-expanded','false')};
   plus.onclick=()=>{sheet.hidden=!sheet.hidden;plus.setAttribute('aria-expanded',String(!sheet.hidden))};
   document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
   document.addEventListener('pointerdown',e=>{if(!sheet.contains(e.target)&&e.target!==plus)hide()});
   form.prepend(plus,sheet);
  }
  grid=sheet.querySelector('.compose-sheet-grid');
 }
 if(!grid||grid.querySelector('[data-cmd-frame-tool]'))return;
 const button=document.createElement('button');button.type='button';button.className='compose-tool';button.id=mode==='server'?'cmdToolFrame':'cmdDmToolFrame';button.dataset.cmdFrameTool='1';button.innerHTML='<b aria-hidden="true">▣</b><span>Cadres des messages</span>';
 button.onclick=()=>{document.querySelector('#channelToolSheet')?.classList.remove('on');const sheet=document.querySelector('#cmdDmToolSheet');if(sheet)sheet.hidden=true;document.querySelector('#cmdDmPlus')?.setAttribute('aria-expanded','false');if(!picker.open)picker.showModal();select.focus()};grid.append(button);
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount();paint()})}).observe(document.body,{childList:true,subtree:true});mount();paint();
})();
