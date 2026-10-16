/* CMD Sphere chat borders — presentation settings for server messages and private messages. */
(()=>{'use strict';
const area=()=>document.querySelector('#channelMessages')?'server':document.querySelector('#messages')?'private':null;
const mode=area();if(!mode)return;
const safe=v=>/^[a-z0-9-]{1,60}$/.test(v||'')?v:'none';
const defaults=['none','amethyst','amethystspire','glacialcrown','midnightrose','rubysurge','sapphirearcane','emeraldgeode','celestialgold','moonstone','starforged'];
const stateKey='cmd:chat-border:'+mode;
let selection='none';
try{selection=safe(localStorage.getItem(stateKey))}catch{}
const css=document.createElement('style');
css.textContent='.cmd-chat-frame-switch{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;padding:8px 10px;border:1px solid #8c6aae50;border-radius:10px;background:#1d1228;color:#eadaff;font:600 12px system-ui}.cmd-chat-frame-switch label{min-width:max-content}.cmd-chat-frame-switch select{max-width:210px;min-height:40px;background:#201631;color:white;border:1px solid #795398;border-radius:8px;padding:8px}.cmd-chat-framed{position:relative!important;border:10px solid transparent!important;border-image-source:var(--cmd-chat-border-image)!important;border-image-slice:28% 20% 28% 20%!important;border-image-width:10px!important;border-image-repeat:stretch!important;overflow:visible!important;background-clip:padding-box!important}.cmd-chat-framed>.msg-main,.cmd-chat-framed>.msg-avatar{position:relative;z-index:2}.cmd-chat-framed.bubble{border-width:9px!important;border-image-width:9px!important}.cmd-chat-frame-switch :focus-visible{outline:2px solid #48e4ff}@media(max-width:480px){.cmd-chat-framed{border-width:7px!important;border-image-width:7px!important}}';
document.head.append(css);
const image=v=>'url("/cmd-art/frame/'+encodeURIComponent(v)+'.svg?v=20261016conversation")';
function paint(){
 const chosen=safe(selection);
 const target=mode==='server'?'#channelMessages article.discord-message[data-cmd-source="cmd"]':'#messages .bubble';
 document.querySelectorAll(target).forEach(node=>{
  const enabled=chosen!=='none'&&(mode==='private'||node.classList.contains('cmd-own-message'));
  node.classList.toggle('cmd-chat-framed',enabled);
  if(enabled)node.style.setProperty('--cmd-chat-border-image',image(chosen));
  else node.style.removeProperty('--cmd-chat-border-image');
 });
}
const host=document.querySelector(mode==='server'?'#channelMessages':'#messages');
const picker=document.createElement('div');picker.className='cmd-chat-frame-switch';picker.innerHTML='<label for="cmdChatFramePicker">Cadre '+(mode==='server'?'des messages serveur':'des messages privés')+'</label><select id="cmdChatFramePicker" aria-label="Choisir le cadre des conversations"></select>';
const select=picker.querySelector('select');for(const id of defaults){const option=document.createElement('option');option.value=id;option.textContent=id==='none'?'Aucun cadre':({amethyst:"Améthyste",amethystspire:"Cathédrale d’améthyste",glacialcrown:"Givre",midnightrose:"Roses",rubysurge:"Rubis",sapphirearcane:"Saphir",emeraldgeode:"Émeraude",celestialgold:"Or",moonstone:"Pierre de lune",starforged:"Étoiles"})[id]||id;select.append(option)}
if(!defaults.includes(selection))selection='none';select.value=selection;
select.addEventListener('change',()=>{selection=safe(select.value);try{localStorage.setItem(stateKey,selection)}catch{}paint()});
host.before(picker);let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;paint()})}).observe(host,{childList:true,subtree:true});paint();
})();