/* CMDPad++ automatic phone/tablet/desktop adaptation at boot and resize. */
(function(){
'use strict';
const d=document,root=d.documentElement,bar=d.querySelector('.menubar'),toolbar=d.querySelector('.toolbar'),workspace=d.querySelector('.workspace'),app=d.querySelector('.app');
if(!bar||!toolbar||!workspace||!app||window.CMDPAD_DEVICE_ADAPTER)return;
const menuButtons=[...bar.querySelectorAll(':scope>.menu>button')];
const menuRoot=button=>button.closest('.menubar>.menu');
let mode='';
function classify(){
 const w=Math.min(window.innerWidth||9999,d.documentElement.clientWidth||9999);
 const coarse=window.matchMedia?.('(pointer:coarse)').matches||false;
 return w<=700?'mobile':w<=1120||coarse&&w<=1360?'tablet':'desktop';
}
function update(){
 const next=classify();for(const tag of ['cmd-mobile','cmd-tablet','cmd-desktop'])root.classList.remove(tag);
 root.classList.add('cmd-'+next);root.dataset.cmdDevice=next;root.dataset.cmdOrientation=(innerWidth>=innerHeight?'landscape':'portrait');
 if(next!==mode){mode=next;if(next==='desktop'){workspace.classList.remove('cmd-mobile-side');for(const m of bar.querySelectorAll(':scope>.menu'))m.classList.remove('open')}}
}
function menuPosition(m){
 const button=m.querySelector(':scope>button'),dropdown=m.querySelector(':scope>.dropdown');
 if(!button||!dropdown)return;
 const rect=button.getBoundingClientRect(),width=Math.min(dropdown.scrollWidth||270,innerWidth-8),height=Math.min(dropdown.scrollHeight||300,innerHeight-20);
 const left=Math.max(4,Math.min(innerWidth-width-4,rect.left)),top=rect.bottom+height>innerHeight?Math.max(4,rect.top-height):rect.bottom;
 dropdown.style.left=Math.round(left)+'px';dropdown.style.top=Math.round(top)+'px';
 dropdown.style.maxWidth='calc(100vw - 8px)';
}
bar.addEventListener('click',event=>{
 if(mode==='desktop')return;
 const button=event.target.closest?.('.menubar>.menu>button');if(!button)return;
 const m=menuRoot(button);if(!m)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 const was=m.classList.contains('open');for(const menu of bar.querySelectorAll(':scope>.menu'))menu.classList.remove('open');
 if(!was){m.classList.add('open');menuPosition(m)}
},true);
document.addEventListener('pointerdown',e=>{
 if(mode==='desktop'||e.target.closest?.('.menubar>.menu')||e.target.closest?.('#cmdpadMobileBar'))return;
 for(const m of bar.querySelectorAll(':scope>.menu'))m.classList.remove('open')
},true);
const mobileBar=d.createElement('nav');mobileBar.id='cmdpadMobileBar';mobileBar.setAttribute('aria-label','Commandes rapides CMDPad++');
function quick(text,action){const b=d.createElement('button');b.type='button';b.textContent=text;b.onclick=e=>{e.preventDefault();try{action(e,b)}catch(err){const st=d.getElementById('status');if(st)st.textContent=String(err.message||err)}};mobileBar.append(b);return b}
const byAction=action=>[...d.querySelectorAll('.menubar .dropdown>button[data-action]')].find(b=>b.dataset.action===action);
quick('📂 Ouvrir',()=>{const input=d.getElementById('openInput');if(input)input.click();else byAction('open')?.click()});
quick('💾 Enregistrer',()=>byAction('save')?.click()||d.getElementById('saveBtn')?.click());
quick('🔎 Chercher',()=>{const f=d.getElementById('find');if(f){f.focus();f.scrollIntoView({block:'nearest',behavior:'instant'})}else byAction('findfocus')?.click()});
quick('☰ Fichiers',(_,b)=>{const on=workspace.classList.toggle('cmd-mobile-side');b.classList.toggle('cmdpad-active',on);const side=d.getElementById('sidePane');if(side)side.style.display=on?'flex':''});
quick('↶ Annuler',()=>byAction('undo')?.click()||d.getElementById('undoBtn')?.click());
quick('↷ Rétablir',()=>byAction('redo')?.click()||d.getElementById('redoBtn')?.click());
quick('☷ Outils',(_,b)=>{const off=toolbar.style.display==='none';toolbar.style.setProperty('display',off?'flex':'none','important');b.classList.toggle('cmdpad-active',!off)});
app.insertBefore(mobileBar,workspace);
let scheduled=0;const schedule=()=>{cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(update)};
window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});window.visualViewport?.addEventListener('resize',schedule,{passive:true});
update();window.CMDPAD_DEVICE_ADAPTER={update,classify};
})();