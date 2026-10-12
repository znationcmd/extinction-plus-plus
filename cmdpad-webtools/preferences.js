/* CMDPad++ Preferences: functional, saved locally, safe default values. */
(function(){
'use strict';
const d=document,area=d.getElementById('area'),bar=d.querySelector('.menubar');if(!area||!bar)return;
const settings=[...bar.querySelectorAll(':scope>.menu')].find(m=>m.querySelector(':scope>button')?.textContent.trim()==='Paramètres');
const drop=settings?.querySelector(':scope>.dropdown');if(!settings||!drop)return;
const KEY='cmdpad-preferences-v1',defaults={theme:'auto',font:'Consolas, monospace',size:14,wrap:false,tabs:4,lineNumbers:true,showSidebar:true};
let p={...defaults};try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&typeof s==='object')p={...p,...s}}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(p))}catch{}};
const themeQuery=window.matchMedia?.('(prefers-color-scheme: dark)');
function apply(){
if(p.theme!=='auto'){d.body.classList.toggle('dark',p.theme==='dark')}
else if(themeQuery){d.body.classList.toggle('dark',themeQuery.matches)}
area.style.fontFamily=p.font;area.style.fontSize=p.size+'px';area.style.whiteSpace=p.wrap?'pre-wrap':'pre';area.wrap=p.wrap?'soft':'off';area.style.overflowX=p.wrap?'hidden':'auto';area.style.tabSize=String(p.tabs);
const lines=d.getElementById('lines');if(lines){lines.style.display=p.lineNumbers?'':'none';lines.style.fontFamily=p.font;lines.style.fontSize=p.size+'px'}
const sidebar=d.getElementById('sidePane');if(sidebar)sidebar.style.display=p.showSidebar?'':'none';
const status=d.getElementById('status');if(status)status.textContent='Paramètres appliqués — '+(p.theme==='auto'?'Thème système':p.theme)+' · '+p.size+' px · Tab '+p.tabs;
save()
}
let dialog=null;
function open(){
if(!dialog){
dialog=d.createElement('dialog');dialog.style.cssText='width:min(660px,96vw);max-height:87vh;overflow:auto;background:white;color:#1b2b46;border:1px solid #a0aec4;border-radius:8px;padding:18px';dialog.setAttribute('aria-label','Préférences CMDPad++');
const h=d.createElement('h3');h.textContent='CMDPad++ — Paramètres de l’éditeur';dialog.append(h);
const note=d.createElement('p');note.textContent='Ces réglages s’appliquent à cet appareil et sont conservés dans son navigateur.';dialog.append(note);
const form=d.createElement('div');form.style.cssText='display:grid;grid-template-columns:minmax(125px,1fr) minmax(150px,2fr);gap:12px;align-items:center';dialog.append(form);
function select(label,key,options){const l=d.createElement('label');l.textContent=label;const s=d.createElement('select');s.style.cssText='width:100%;padding:9px;border:1px solid #a0aec4;background:white;color:#1b2b46;border-radius:4px';
options.forEach(([value,name])=>{const opt=d.createElement('option');opt.value=String(value);opt.textContent=name;s.append(opt)});s.dataset.pref=key;s.onchange=()=>{p[key]=key==='tabs'||key==='size'?Number(s.value):s.value;apply()};form.append(l,s)}
function check(label,key){const l=d.createElement('label');l.textContent=label;const cb=d.createElement('input');cb.type='checkbox';cb.dataset.pref=key;cb.onchange=()=>{p[key]=cb.checked;apply()};form.append(l,cb)}
select('Apparence','theme',[['auto','Système (automatique)'],['light','Clair'],['dark','Sombre']]);
select('Police de code','font',[['Consolas, monospace','Consolas'],['monospace','Monospace système'],['Courier New, monospace','Courier New'],['Menlo, monospace','Menlo'],['Arial, sans-serif','Arial']]);
select('Taille du texte','size',Array.from({length:15},(_,i)=>[String(i+10),(i+10)+' px']));
select('Espaces par tabulation','tabs',[[2,'2 espaces'],[4,'4 espaces'],[8,'8 espaces']]);
check('Retour à la ligne automatique','wrap');check('Afficher les numéros de ligne','lineNumbers');check('Afficher les dossiers à gauche','showSidebar');
const actions=d.createElement('div');actions.style.cssText='display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:15px';dialog.append(actions);
function button(label,handler){const b=d.createElement('button');b.type='button';b.textContent=label;b.style.cssText='border:1px solid #99a8bf;background:#eef4ff;color:#1c2d46;border-radius:5px;padding:9px 12px;cursor:pointer';b.onclick=handler;actions.append(b)}
button('Rétablir les valeurs par défaut',()=>{p={...defaults};apply();sync();});
button('Fermer',()=>dialog.close());
d.body.append(dialog);
}
sync();dialog.showModal()
}
function sync(){if(!dialog)return;for(const e of dialog.querySelectorAll('[data-pref]')){const val=p[e.dataset.pref];if(e.type==='checkbox')e.checked=!!val;else e.value=String(val)}}
const pref=d.createElement('button');pref.type='button';pref.textContent='Préférences de l’éditeur…';pref.onclick=e=>{e.stopPropagation();settings.classList.remove('open');open()};drop.prepend(pref);
const reset=d.createElement('button');reset.type='button';reset.textContent='Rétablir les paramètres par défaut';reset.onclick=e=>{e.stopPropagation();settings.classList.remove('open');if(confirm('Rétablir les préférences d’affichage et de saisie par défaut ?')){p={...defaults};apply();sync()}};drop.append(reset);
const wrapItem=drop.querySelector('button[data-action="wrap"]');if(wrapItem){wrapItem.textContent='Retour à la ligne : activer / désactiver';wrapItem.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();p.wrap=!p.wrap;apply();sync()},true)}
// Apply tab width to insertion, not only its visual representation.
area.addEventListener('keydown',e=>{if(e.key!=='Tab'||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey)return;if(area.readOnly)return;
e.preventDefault();e.stopImmediatePropagation();const start=area.selectionStart,end=area.selectionEnd;area.setRangeText(' '.repeat(p.tabs),start,end,'end');area.dispatchEvent(new Event('input',{bubbles:true}))},true);
themeQuery?.addEventListener?.('change',()=>{if(p.theme==='auto')apply()});
apply();window.CMDPAD_PREFERENCES_READY=true;
})();