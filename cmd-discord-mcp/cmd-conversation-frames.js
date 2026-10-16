/* CMD Sphere chat borders — presentation settings for server messages and private messages. */
(()=>{'use strict';
const area=()=>document.querySelector('#channelMessages')?'server':document.querySelector('#msgs,#messages')?'private':null;
const mode=area();if(!mode)return;
const safe=v=>/^[a-z0-9-]{1,60}$/.test(v||'')?v:'none';
const defaults=['none','amethystspire','amethyst','glacialcrown','midnightrose','rubysurge','sapphirearcane','emeraldgeode','celestialgold','moonstone','starforged'];
const stateKey='cmd:chat-border:'+mode;
// Reuse the actual selected profile frame rather than a separate stale message-only choice.
function activeProfileFrame(){try{const keys=['cmd:profile:frame','cmd:profile-frame','cmd:premium:frame','cmd:profile-decoration-frame'];for(const k of keys){const v=localStorage.getItem(k);if(v&&defaults.includes(v)&&v!=='none')return v}}catch{}return null}

let selection='none';
try{selection=safe(localStorage.getItem(stateKey))}catch{}
const css=document.createElement('style');
css.textContent='.cmd-chat-frame-switch{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;padding:8px 10px;border:1px solid #8c6aae50;border-radius:10px;background:#1d1228;color:#eadaff;font:600 12px system-ui}.cmd-chat-frame-switch label{min-width:max-content}.cmd-chat-frame-switch select{max-width:210px;min-height:40px;background:#201631;color:white;border:1px solid #795398;border-radius:8px;padding:8px}.cmd-chat-framed{position:relative!important;border:10px solid transparent!important;border-image-source:var(--cmd-chat-border-image)!important;border-image-slice:28% 20% 28% 20%!important;border-image-width:10px!important;border-image-repeat:stretch!important;overflow:visible!important;background-clip:padding-box!important}.cmd-chat-framed>.msg-main,.cmd-chat-framed>.msg-avatar{position:relative;z-index:2}.cmd-chat-framed.bubble{border-width:9px!important;border-image-width:9px!important}.cmd-chat-frame-switch :focus-visible{outline:2px solid #48e4ff}@media(max-width:480px){.cmd-chat-framed{border-width:7px!important;border-image-width:7px!important}}';
css.textContent+=' .cmd-chat-frame-switch{position:relative!important;z-index:4;display:block!important;flex:none!important;margin:4px 0!important;padding:5px 9px!important;max-width:100%;height:auto!important;overflow:visible!important}.cmd-chat-frame-switch:not([open]){width:max-content;max-width:100%}.cmd-chat-frame-switch summary{cursor:pointer;list-style:none;min-height:34px;display:flex;align-items:center;white-space:nowrap}.cmd-chat-frame-switch:not([open]) label,.cmd-chat-frame-switch:not([open]) select{display:none!important}.cmd-chat-frame-switch[open] label,.cmd-chat-frame-switch[open] select{display:block;margin:5px 0}.cmd-chat-framed.msg-main{border-width:3px!important;border-image-width:3px!important;max-width:100%!important;box-sizing:border-box!important;overflow-wrap:anywhere!important}.discord-message.cmd-message-cosmetic{border:0!important;border-image:none!important}.discord-message.cmd-message-cosmetic>.cmd-message-frame-art{display:none!important}@media(max-width:550px){.cmd-chat-framed.msg-main{border-width:2px!important;border-image-width:2px!important}}';
css.textContent+=' #msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{border-width:2px!important;border-image-width:2px!important;box-sizing:border-box}';
css.textContent+=' /* 2026-10-16: same ornament, readable bubble, no cropped side-only crystals. */ #channelMessages .msg-main.cmd-chat-framed,#msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{border-style:solid!important;border-width:clamp(24px,7vw,44px)!important;border-image-source:var(--cmd-chat-border-image)!important;border-image-slice:26% 19% 26% 19%!important;border-image-width:1!important;border-image-outset:0!important;border-image-repeat:stretch!important;background-clip:padding-box!important;box-sizing:border-box!important;min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important}';
css.textContent+=' /* Full-size cathedral frame on chat bubbles: same source and nine-slice as profile, with thick corners and complete top/bottom rails. */ #channelMessages .msg-main.cmd-chat-framed,#msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{position:relative!important;border-style:solid!important;border-width:clamp(38px,10vw,72px)!important;border-image-slice:105 105 105 105!important;border-image-width:1!important;border-image-repeat:stretch!important;border-image-outset:0!important;overflow:visible!important;box-sizing:border-box!important;min-width:0!important;max-width:100%!important} #channelMessages .msg-main.cmd-chat-framed>* ,#msgs .bubble.cmd-chat-framed>* ,#messages .bubble.cmd-chat-framed>*{position:relative;z-index:1}';
css.textContent+=' /* Foreground ornamental border: keep the full frame above the purple bubble without blocking taps. */ #channelMessages .msg-main.cmd-chat-framed,#msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{position:relative!important;isolation:isolate!important;border-image-outset:0!important} #channelMessages .msg-main.cmd-chat-framed::after,#msgs .bubble.cmd-chat-framed::after,#messages .bubble.cmd-chat-framed::after{content:"";position:absolute;inset:calc(-1 * clamp(38px,10vw,72px));background-image:var(--cmd-chat-border-image);background-size:100% 100%;background-repeat:no-repeat;pointer-events:none;z-index:30!important} #channelMessages .msg-main.cmd-chat-framed>*,#msgs .bubble.cmd-chat-framed>*,#messages .bubble.cmd-chat-framed>*{position:relative;z-index:2}';
/* Render the selected frame as a foreground overlay around the actual bubble. The old border-image sat behind its background and only the left/right crystals remained visible. */
css.textContent+=' #channelMessages .msg-main.cmd-chat-framed,#msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{border:0!important;border-image:none!important;overflow:visible!important;isolation:isolate!important;position:relative!important;padding:clamp(18px,4vw,30px)!important} #channelMessages .msg-main.cmd-chat-framed::after,#msgs .bubble.cmd-chat-framed::after,#messages .bubble.cmd-chat-framed::after{content:""!important;position:absolute!important;inset:-12px!important;background:transparent!important;border:clamp(24px,7vw,45px) solid transparent!important;border-image-source:var(--cmd-chat-border-image)!important;border-image-slice:105 105 105 105 fill!important;border-image-width:1!important;border-image-outset:0!important;border-image-repeat:stretch!important;pointer-events:none!important;z-index:50!important;box-sizing:border-box!important} #channelMessages .msg-main.cmd-chat-framed>*,#msgs .bubble.cmd-chat-framed>*,#messages .bubble.cmd-chat-framed>*{position:relative!important;z-index:1!important}';
/* Full four-sided frame: paint the SAME chosen asset as a single transparent foreground image,
   rather than nine-slice border-image which was hiding its horizontal rails. */
css.textContent+=' #channelMessages .msg-main.cmd-chat-framed::after,#msgs .bubble.cmd-chat-framed::after,#messages .bubble.cmd-chat-framed::after{content:""!important;position:absolute!important;inset:-14px!important;width:auto!important;height:auto!important;border:0!important;border-image:none!important;background-image:var(--cmd-chat-border-image)!important;background-position:center!important;background-size:100% 100%!important;background-repeat:no-repeat!important;pointer-events:none!important;z-index:50!important;opacity:1!important} #channelMessages .msg-main.cmd-chat-framed,#msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{padding:clamp(26px,6vw,44px)!important;overflow:visible!important;isolation:isolate!important}';
css.textContent += ' #channelMessages .msg-main.cmd-chat-framed,#msgs .bubble.cmd-chat-framed,#messages .bubble.cmd-chat-framed{position:relative!important;isolation:isolate!important;overflow:visible!important;border:0!important;border-image:none!important;padding:36px!important} #channelMessages .msg-main.cmd-chat-framed::after,#msgs .bubble.cmd-chat-framed::after,#messages .bubble.cmd-chat-framed::after{content:""!important;position:absolute!important;inset:-12px!important;display:block!important;background-image:var(--cmd-chat-border-image)!important;background-position:center!important;background-size:100% 100%!important;background-repeat:no-repeat!important;border:0!important;pointer-events:none!important;z-index:9999!important;opacity:1!important}';
document.head.append(css);
const image=v=>'url("/cmd-art/frame/'+encodeURIComponent(v)+'.svg?v=20261016conversation")';
function paint(){
 const chosen=safe(selection!=='none'?selection:(activeProfileFrame()||'none'));
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
if(!defaults.includes(selection))selection='none';select.value=selection!=='none'?selection:(activeProfileFrame()||'none');
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
/* Hide duplicate wallpaper controls in the conversation body; their actions remain in +. */
function hideDuplicateWallpaperControls(){
 const root=document.querySelector('#channelMessages')?.parentElement||document.querySelector('#msgs,#messages')?.parentElement;
 if(!root)return;
 const labels=['importer mon image','supprimer le fond'];
 root.querySelectorAll('button,[role="button"]').forEach(el=>{
  if(el.closest('#channelToolSheet,#cmdDmToolSheet,dialog,[id*="ToolSheet"]'))return;
  const label=(el.textContent||'').replace(/\\s+/g,' ').trim().toLocaleLowerCase('fr');
  if(labels.some(t=>label.includes(t))&&label.length<90){el.style.setProperty('display','none','important');el.setAttribute('aria-hidden','true')}
 });
}
/* Personal wallpapers: global or server-wide, never channel-specific. */
function wallpaperServerKey(){
 const node=document.querySelector('[data-server-id].active,[data-guild-id].active,[data-server-id][aria-current="page"],[data-guild-id][aria-current="page"]');
 const id=node?.getAttribute('data-server-id')||node?.getAttribute('data-guild-id');
 const path=location.pathname.match(/(?:servers?|guilds?)\\/([^/?#]+)/i);
 return id||path?.[1]||null;
}
const wallpaperKey='cmd:personal-wallpaper:v1';
function wallpaperState(){try{return JSON.parse(localStorage.getItem(wallpaperKey)||'{"global":null,"servers":{}}')}catch{return {global:null,servers:{}}}}
function wallpaperSave(v){try{localStorage.setItem(wallpaperKey,JSON.stringify(v));return true}catch{return false}}
const wallpaperStyle=document.createElement('style');wallpaperStyle.textContent='.cmd-personal-wallpaper{background-image:var(--cmd-personal-wallpaper)!important;background-position:center!important;background-size:cover!important;background-attachment:local!important}.cmd-wallpaper-picker{border:1px solid #9562c2;border-radius:16px;padding:20px;background:#1c1128;color:#fff;max-width:min(92vw,430px)}.cmd-wallpaper-picker::backdrop{background:#000b}.cmd-wallpaper-picker button,.cmd-wallpaper-picker select{padding:10px;margin:6px;border-radius:9px;background:#39244c;color:white;border:1px solid #9065b4}';document.head.append(wallpaperStyle);
function wallpaperApply(){const v=wallpaperState(),sid=wallpaperServerKey();const selected=sid&&Object.prototype.hasOwnProperty.call(v.servers||{},sid)?v.servers[sid]:v.global;const target=document.querySelector('#channelMessages')?.parentElement||document.querySelector('#msgs,#messages')?.parentElement;if(!target)return;target.classList.toggle('cmd-personal-wallpaper',!!selected);if(selected)target.style.setProperty('--cmd-personal-wallpaper','url('+JSON.stringify(selected)+')');else target.style.removeProperty('--cmd-personal-wallpaper')}
const wallpaperDialog=document.createElement('dialog');wallpaperDialog.className='cmd-wallpaper-picker';wallpaperDialog.innerHTML='<h2>Mon fond d’écran</h2><p>Visible uniquement pour moi sur cet appareil.</p><label>Portée <select id="cmdWallpaperScope"><option value="global">Général — partout</option><option value="server">Ce serveur — tous ses salons</option></select></label><p><input id="cmdWallpaperFile" type="file" accept="image/*"></p><button type="button" id="cmdWallpaperClear">Supprimer ce fond</button><button type="button" id="cmdWallpaperClose">Fermer</button>';document.body.append(wallpaperDialog);
const wallpaperScope=wallpaperDialog.querySelector('#cmdWallpaperScope');wallpaperDialog.querySelector('#cmdWallpaperClose').onclick=()=>wallpaperDialog.close();
wallpaperDialog.querySelector('#cmdWallpaperClear').onclick=()=>{const v=wallpaperState(),sid=wallpaperServerKey();if(wallpaperScope.value==='server'&&sid){delete v.servers[sid]}else v.global=null;wallpaperSave(v);wallpaperApply()};
wallpaperDialog.querySelector('#cmdWallpaperFile').onchange=async e=>{const f=e.target.files?.[0];if(!f||!f.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{const v=wallpaperState(),sid=wallpaperServerKey();if(wallpaperScope.value==='server'&&sid)v.servers[sid]=reader.result;else v.global=reader.result;if(!wallpaperSave(v))alert('Image trop volumineuse pour le stockage local. Essaie une image plus petite.');wallpaperApply()};reader.readAsDataURL(f)};
function wallpaperMount(){const grid=document.querySelector('#channelToolSheet .compose-sheet-grid,#cmdDmToolSheet .compose-sheet-grid');if(!grid||grid.querySelector('[data-cmd-wallpaper-tool]'))return;const b=document.createElement('button');b.type='button';b.className='compose-tool';b.dataset.cmdWallpaperTool='1';b.innerHTML='<b aria-hidden="true">🌌</b><span>Mon fond d’écran</span>';b.onclick=()=>{wallpaperScope.querySelector('[value="server"]').disabled=!wallpaperServerKey();wallpaperScope.value='global';wallpaperDialog.showModal()};grid.append(b)}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount();paint();hideDuplicateWallpaperControls()})}).observe(document.body,{childList:true,subtree:true});mount();paint();hideDuplicateWallpaperControls();
})();
