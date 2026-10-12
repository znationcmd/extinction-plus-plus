/* CMDPad++ auto-fit viewport on mobile, tablet and desktop. Touch-safe actions. */
(function(){
'use strict';
const d=document,body=d.body,bar=d.querySelector('.menubar'),toolbar=d.querySelector('.toolbar'),app=d.querySelector('.app');
if(!bar||!toolbar||!app||window.CMDPAD_DEVICE_ADAPT_READY)return;
const menuItems=[...bar.querySelectorAll(':scope>.menu')];let mode='',lastWidth=0;
const get=id=>d.getElementById(id);
const stat=message=>{const e=get('status');if(e)e.textContent=message};
function device(){
 const width=Math.min(window.innerWidth||1024,window.visualViewport?.width||window.innerWidth||1024);
 const coarse=window.matchMedia?.('(pointer:coarse)')?.matches||false;
 return width<=680||(coarse&&width<=760)?'phone':width<=1100||coarse&&width<=1200?'tablet':'desktop';
}
const dock=d.createElement('nav');dock.id='cmdpadDeviceBar';dock.setAttribute('aria-label','Raccourcis CMDPad++ pour mobile');
const drawer=d.createElement('aside');drawer.id='cmdpadDeviceDrawer';drawer.setAttribute('aria-label','Actions CMDPad++');
body.append(drawer);app.append(dock);
function add(host,name,action){const button=d.createElement('button');button.type='button';button.className='cmd-device-button';button.textContent=name;button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{action()}catch(e){stat('Action impossible : '+e.message);console.error(e)}});host.append(button);return button}
function menu(name){
 const item=menuItems.find(m=>m.querySelector(':scope>button')?.textContent.trim()===name)||null;
 if(!item){stat('Menu '+name+' indisponible');return}
 drawer.classList.remove('cmd-show');
 const b=item.querySelector(':scope>button');if(!b)return;
 bar.scrollLeft=Math.max(0,item.offsetLeft-30);
 b.click();alignMenus();
}
function nativeClick(id){
 const button=get(id);if(button?.click)button.click();else stat('Action '+id+' indisponible')
}
const fileInput=get('openInput');
add(dock,'📂 Ouvrir',()=>{drawer.classList.remove('cmd-show');if(fileInput){fileInput.click();return}nativeClick('openBtn')});
add(dock,'💾 Sauver',()=>{drawer.classList.remove('cmd-show');nativeClick('saveBtn')});
add(dock,'✎ Modifier',()=>{drawer.classList.remove('cmd-show');get('area')?.focus()});
add(dock,'🔎 Chercher',()=>{drawer.classList.remove('cmd-show');body.classList.toggle('cmd-search-visible');if(body.classList.contains('cmd-search-visible'))get('find')?.focus()});
add(dock,'☰ Menus',()=>{drawer.classList.toggle('cmd-show');renderDrawer()});
add(dock,'＋ Fichier',()=>{drawer.classList.remove('cmd-show');nativeClick('newBtn')});
add(dock,'▤ Onglets',()=>menu('Documents'));
add(dock,'⚙ Outils',()=>menu('Outils'));
add(dock,'⌘ Extensions',()=>menu('Modules d’extension'));
function renderDrawer(){
 drawer.replaceChildren();for(const name of ['Fichier','Édition','Recherche','Affichage','Encodage','Langage','Paramètres','Outils','Macro','Exécution','Modules d’extension','Documents','Formats']){
  const m=menuItems.find(x=>x.querySelector(':scope>button')?.textContent.trim()===name);
  if(m)add(drawer,name,()=>menu(name))
 }
 add(drawer,'Fermer',()=>drawer.classList.remove('cmd-show'));
}
function alignMenus(){
 for(const m of menuItems){
  if(!m.classList.contains('open'))continue;
  const fly=m.querySelector(':scope>.dropdown');if(!fly)continue;
  if(mode==='phone'){fly.style.left='7px';fly.style.top='calc(72px + env(safe-area-inset-top))';fly.style.maxWidth='calc(100vw - 14px)'}
  else{const rect=m.getBoundingClientRect();fly.style.left=Math.max(4,Math.min(rect.left,window.innerWidth-260))+'px';fly.style.top=Math.min(rect.bottom+2,window.innerHeight-60)+'px';fly.style.maxWidth=Math.min(410,window.innerWidth-12)+'px'}
 }
}
function update(){
 const next=device();lastWidth=window.innerWidth;const changed=mode!==next;mode=next;
 body.dataset.cmdDevice=mode;body.classList.toggle('cmd-touch',mode!=='desktop');
 if(mode==='phone'){
  toolbar.classList.remove('cmd-device-expanded');
  if(changed)stat('CMDPad++ · affichage téléphone prêt');
 }else{
  drawer.classList.remove('cmd-show');body.classList.remove('cmd-search-visible');toolbar.classList.remove('cmd-device-expanded');
  if(changed)stat('CMDPad++ · affichage '+(mode==='tablet'?'tablette':'ordinateur')+' prêt');
 }
 alignMenus();
}
function safeMenu(){
 for(const item of menuItems){const b=item.querySelector(':scope>button');if(!b)continue;
  b.addEventListener('click',()=>requestAnimationFrame(alignMenus));
  b.addEventListener('pointerup',e=>{if(e.pointerType==='touch')requestAnimationFrame(alignMenus)});
 }
}
safeMenu();window.addEventListener('resize',()=>{if(Math.abs(window.innerWidth-lastWidth)>1)update();else alignMenus()});
window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(alignMenus));
window.addEventListener('orientationchange',()=>setTimeout(update,100));
d.addEventListener('pointerdown',e=>{if(drawer.classList.contains('cmd-show')&&!e.target.closest('#cmdpadDeviceDrawer,#cmdpadDeviceBar'))drawer.classList.remove('cmd-show')});
window.addEventListener('error',e=>{const s=get('status');if(s&&mode==='phone'){s.textContent='Erreur interface : '+String(e.message||'JavaScript');s.title=String(e.error?.stack||'')}}); 
update();window.CMDPAD_DEVICE_ADAPT_READY=true;
})();