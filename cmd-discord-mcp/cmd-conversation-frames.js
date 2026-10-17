/* CMD Sphere chat borders — presentation settings for server messages and private messages. */
(()=>{'use strict';
const area=()=>document.querySelector('#channelMessages')?'server':document.querySelector('#msgs,#messages')?'private':null;
const mode=area();if(!mode)return;
const safe=v=>/^[a-z0-9-]{1,60}$/.test(v||'')?v:'none';
const defaults=['none','amethystspire','amethyst','glacialcrown','midnightrose','rubysurge','sapphirearcane','emeraldgeode','celestialgold','moonstone','starforged'];
const stateKey='cmd:chat-border:'+mode;
// Reuse the actual selected profile frame rather than a separate stale message-only choice.
function activeProfileFrame(){try{const keys=['cmd:profile:frame','cmd:profile-frame','cmd:premium:frame','cmd:profile-decoration-frame'];for(const k of keys){const v=localStorage.getItem(k);if(v&&defaults.includes(v)&&v!=='none')return v}}catch{}return null}

let selection=null,accountFrame="";
try{const saved=localStorage.getItem(stateKey);selection=saved===null?null:safe(saved)}catch{}
async function refreshAccountFrame(){
 try{
  const response=await fetch("/api/profile",{credentials:"same-origin",cache:"no-store"});
  if(!response.ok)return;
  const data=await response.json(),value=String(data.profile?.profileFrame||"");
  accountFrame=/^[a-z0-9-]{1,60}$/.test(value)&&value!=="none"?value:"";
  if(selection===null&&accountFrame&&![...select.options].some(o=>o.value===accountFrame)){
   const option=document.createElement("option");option.value=accountFrame;
   option.textContent="Cadre du profil · "+accountFrame;select.append(option);
  }
  if(selection===null){select.value=accountFrame||activeProfileFrame()||"none";paint()}
 }catch{}
}
const css=document.createElement('style');
css.textContent="\n/* CMD Sphere responsive message frame: single violet bubble inside amethyst edging.\n   SVG ornament via border-image nine-slice: corners never stretch with text. */\n.cmd-chat-frame-switch{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;padding:8px 10px;border:1px solid #8c6aae50;border-radius:10px;background:#1d1228;color:#eadaff;font:600 12px system-ui}\n.cmd-chat-frame-switch label{min-width:max-content}\n.cmd-chat-frame-switch select{max-width:210px;min-height:40px;background:#201631;color:white;border:1px solid #795398;border-radius:8px;padding:8px}\n.cmd-chat-frame-switch :focus-visible{outline:2px solid #48e4ff}\n#channelMessages .discord-message .msg-main.cmd-chat-framed,\n#channelOverlay .discord-message.cmd-own-message .msg-main.cmd-chat-framed,\n#channelMessages .discord-message .msg-main.cmd-chat-framed.cmd-equipped-profile-frame,\n#msgs .bubble.cmd-chat-framed,\n#messages .bubble.cmd-chat-framed{\n --cmd-frame-edge-x:clamp(36px,8vw,54px);\n --cmd-frame-edge-y:clamp(33px,7.5vw,49px);\n position:relative!important;isolation:isolate!important;\n display:flow-root!important;flex:0 1 auto!important;\n box-sizing:border-box!important;width:fit-content!important;\n max-width:min(96%,640px)!important;min-width:0!important;\n min-height:0!important;height:auto!important;max-height:none!important;\n margin-block:10px!important;\n padding:var(--cmd-frame-edge-y) var(--cmd-frame-edge-x)!important;\n border:0!important;border-image:none!important;border-radius:19px!important;\n background:transparent!important;background-image:none!important;\n box-shadow:none!important;filter:none!important;\n overflow:visible!important;overflow-wrap:anywhere!important;\n}\n/* Only the interior is violet. The edges remain transparent for the crystal art.\n   No second opaque rectangular box on top of the original bubble. */\n#channelMessages .discord-message .msg-main.cmd-chat-framed::before,\n#msgs .bubble.cmd-chat-framed::before,\n#messages .bubble.cmd-chat-framed::before{\n content:\"\"!important;position:absolute!important;\n inset:calc(var(--cmd-frame-edge-y) * .62) calc(var(--cmd-frame-edge-x) * .59)!important;\n display:block!important;pointer-events:none!important;z-index:0!important;\n border-radius:15px!important;border:1px solid #a66de369!important;\n background:linear-gradient(145deg,#773caf,#57258d)!important;\n box-shadow:inset 0 1px 2px #e5c5ff35,0 0 14px #56249d55!important;\n}\n/* Sliced transparent SVG border, *not* a full image resized to the bubble.\n   Slices match its native 640x440 viewBox. Border rails extend as text grows. */\n#channelMessages .discord-message .msg-main.cmd-chat-framed::after,\n#channelMessages .discord-message .msg-main.cmd-chat-framed.cmd-equipped-profile-frame::after,\n#msgs .bubble.cmd-chat-framed::after,\n#messages .bubble.cmd-chat-framed::after{\n content:\"\"!important;display:block!important;\n position:absolute!important;inset:0!important;\n box-sizing:border-box!important;width:100%!important;height:100%!important;\n border-style:solid!important;border-color:transparent!important;\n border-width:var(--cmd-frame-edge-y) var(--cmd-frame-edge-x)!important;\n border-image-source:var(--cmd-chat-border-image)!important;\n border-image-slice:115 115 115 115!important;\n border-image-width:1!important;border-image-outset:0!important;\n border-image-repeat:stretch!important;\n background:transparent!important;background-image:none!important;\n box-shadow:none!important;filter:drop-shadow(0 0 3px #ac7beb88)!important;\n pointer-events:none!important;z-index:3!important;opacity:1!important;\n}\n#channelMessages .discord-message .msg-main.cmd-chat-framed > *,\n#msgs .bubble.cmd-chat-framed > *,\n#messages .bubble.cmd-chat-framed > *{\n position:relative!important;z-index:2!important;\n box-sizing:border-box!important;\n max-width:100%!important;min-width:0!important;\n background:transparent!important;background-image:none!important;\n overflow-wrap:anywhere!important;\n}\n#channelMessages .discord-message .msg-main.cmd-chat-framed .msg-text,\n#msgs .bubble.cmd-chat-framed .msg-text,\n#messages .bubble.cmd-chat-framed .msg-text{\n color:#f9f2ff!important;white-space:pre-wrap!important;\n line-height:1.45!important;word-break:normal!important;\n overflow-wrap:anywhere!important;\n}\n@media(max-width:440px){\n #channelMessages .discord-message .msg-main.cmd-chat-framed,\n #channelMessages .discord-message .msg-main.cmd-chat-framed.cmd-equipped-profile-frame,\n #msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{\n  --cmd-frame-edge-x:38px;--cmd-frame-edge-y:35px;\n  max-width:calc(100% - 6px)!important;\n }\n}\n@media(prefers-reduced-motion:reduce){#channelMessages .msg-main.cmd-chat-framed{transition:none!important}}\n";
document.head.append(css);
const image=v=>'url("/cmd-art/frame/'+encodeURIComponent(v)+'.svg?v=20261016conversation")';
function paint(){
 const chosen=safe(selection!==null?selection:(accountFrame||activeProfileFrame()||"none"));
 const target=mode==='server'?'#channelMessages article.discord-message[data-cmd-source="cmd"]':'#msgs .bubble,#messages .bubble';
 document.querySelectorAll(target).forEach(node=>{
  const enabled=chosen!=='none'&&(mode==='private'||node.classList.contains('cmd-own-message'));
  const bubble=mode==='server'?(node.querySelector('.msg-main')||node):node;
  node.classList.remove('cmd-chat-framed');
  bubble.classList.toggle('cmd-chat-framed',enabled);
  if(enabled){bubble.style.setProperty('--cmd-chat-border-image',image(chosen));bubble.dataset.cmdFrameSelected=chosen;node.querySelectorAll('.cmd-message-frame-art').forEach(el=>{el.style.display='none'});}
  else {bubble.style.removeProperty('--cmd-chat-border-image');delete bubble.dataset.cmdFrameSelected;}
 });
}
const host=document.querySelector(mode==='server'?'#channelMessages':'#msgs,#messages');
const picker=document.createElement('dialog');picker.className='cmd-frame-dialog';picker.innerHTML='<header><h2>Cadre des messages</h2><button type="button" aria-label="Fermer les cadres">×</button></header><label for="cmdChatFramePicker">Cadre '+(mode==='server'?'des messages serveur':'des messages privés')+'</label><select id="cmdChatFramePicker" aria-label="Choisir le cadre des conversations"></select>';
const select=picker.querySelector('select');for(const id of defaults){const option=document.createElement('option');option.value=id;option.textContent=id==='none'?'Aucun cadre':({amethyst:"Améthyste",amethystspire:"Cathédrale d’améthyste",glacialcrown:"Givre",midnightrose:"Roses",rubysurge:"Rubis",sapphirearcane:"Saphir",emeraldgeode:"Émeraude",celestialgold:"Or",moonstone:"Pierre de lune",starforged:"Étoiles"})[id]||id;select.append(option)}
if(selection!==null&&!defaults.includes(selection))selection='none';
select.value=selection!==null?selection:(activeProfileFrame()||"none");
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
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount();paint()})}).observe(document.body,{childList:true,subtree:true});
mount();paint();void refreshAccountFrame();
})();
