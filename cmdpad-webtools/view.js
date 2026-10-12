/* CMDPad++: Notepad++-style View menu, with working controls appropriate to a browser editor. */
(function(){
'use strict';
const d=document,bar=d.querySelector('.menubar'),area=d.getElementById('area'),workspace=d.querySelector('.workspace');if(!bar||!area||!workspace)return;
const menu=[...bar.querySelectorAll(':scope>.menu')].find(x=>x.querySelector(':scope>button')?.textContent.trim()==='Affichage');if(!menu)return;
const root=menu.querySelector(':scope>.dropdown');if(!root)return;
const status=s=>{const el=d.getElementById('status');if(el)el.textContent=s};
const prefKey='cmdpad-view-options-v1',defaults={tabs:true,gutter:true,minimap:true,toolbar:true,status:true,files:true,functions:true,folder:true,wrap:false,rtl:false};
let opts={...defaults};try{opts={...opts,...JSON.parse(localStorage.getItem(prefKey)||'{}')}}catch{}
const save=()=>{try{localStorage.setItem(prefKey,JSON.stringify(opts))}catch{}};
const div=d.createElement('div');div.className='cmd-view-separator';
function button(label,run,slot=root,title){const b=d.createElement('button');b.type='button';b.textContent=label;b.title=title||'';b.onclick=e=>{e.preventDefault();e.stopPropagation();run();menu.classList.remove('open')};slot.append(b);return b}
function submenu(label){const wrapper=d.createElement('div');wrapper.className='cmd-view-submenu';const trigger=d.createElement('button');trigger.type='button';trigger.className='cmd-view-subtitle';trigger.textContent=label+'  ▸';trigger.setAttribute('aria-haspopup','true');trigger.setAttribute('aria-expanded','false');const fly=d.createElement('div');fly.className='cmd-view-flyout';wrapper.append(trigger,fly);root.append(wrapper);
function show(){for(const other of root.querySelectorAll('.cmd-view-submenu'))if(other!==wrapper){other.classList.remove('active');other.querySelector('.cmd-view-subtitle')?.setAttribute('aria-expanded','false')}wrapper.classList.add('active');trigger.setAttribute('aria-expanded','true');const r=trigger.getBoundingClientRect();const w=242;fly.style.left=Math.round(r.right+w>innerWidth?r.left-w:r.right-1)+'px';fly.style.top=Math.max(4,Math.min(Math.round(r.top),innerHeight-200))+'px';fly.style.maxHeight=Math.max(165,innerHeight-12-Math.max(4,Math.min(Math.round(r.top),innerHeight-200)))+'px'}
function hide(){wrapper.classList.remove('active');trigger.setAttribute('aria-expanded','false')}
trigger.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show()});
trigger.onclick=e=>{e.preventDefault();e.stopPropagation();wrapper.classList.contains('active')?hide():show()};
fly.addEventListener('pointerenter',show);
return fly}
function toggle(name,target,property,flag=''){const el=typeof target==='string'?d.querySelector(target):target;if(!el)return;el.style[property]=opts[name]?flag:'none'}
function apply(){
 const tabs=d.getElementById('tabs'),gutter=d.getElementById('lines'),mini=d.getElementById('minimap'),toolbar=d.querySelector('.toolbar'),bottom=d.querySelector('.status'),side=d.getElementById('sidePane'),fn=d.getElementById('cmdpadFnPanel'),open=d.getElementById('cmdpadOpenList');
 if(tabs)tabs.style.display=opts.tabs?'':'none';
 if(gutter)gutter.style.display=opts.gutter?'':'none';
 if(mini)mini.style.display=opts.minimap?'':'none';
 if(toolbar)toolbar.style.display=opts.toolbar?'':'none';
 if(bottom)bottom.style.display=opts.status?'':'none';
 if(side)side.style.display=opts.folder?'':'none';
 if(open)open.style.display=opts.files?'':'none';
 if(fn){fn.style.display=opts.functions?'':'none';workspace.classList.toggle('cmd-view-hide-fn',!opts.functions)}
 workspace.classList.toggle('cmd-view-hide-folder',!opts.folder);
 area.dir=opts.rtl?'rtl':'ltr';
 area.style.whiteSpace=opts.wrap?'pre-wrap':'pre';
 area.wrap=opts.wrap?'soft':'off';
 area.style.overflowX=opts.wrap?'hidden':'auto';
 for(const button of root.querySelectorAll('[data-cmd-view-option]'))button.setAttribute('aria-checked',String(!!opts[button.dataset.cmdViewOption]));
 save();
}
function option(name,label,slot=root){const b=button(label,()=>{opts[name]=!opts[name];apply();status(label+' : '+(opts[name]?'activé':'désactivé'))},slot);b.dataset.cmdViewOption=name;b.setAttribute('role','menuitemcheckbox');return b}
function moveAction(action,to,label){const b=root.querySelector(':scope>button[data-action="'+action+'"]');if(!b)return; if(label)b.childNodes[0]&&(b.childNodes[0].textContent=label);to.append(b)}
const oldActions=[...root.querySelectorAll(':scope>button[data-action]')];
const wrap=oldActions.find(x=>x.dataset.action==='wrap');if(wrap)wrap.remove();
const side=oldActions.find(x=>x.dataset.action==='toggleSide');if(side)side.remove();
const theme=oldActions.find(x=>x.dataset.action==='theme');if(theme)theme.remove();
const full=oldActions.find(x=>x.dataset.action==='fullscreen');if(full)full.remove();
for(const s of [...root.querySelectorAll('.sep')])s.remove();
root.append(div);
if(full){full.textContent='Plein écran (F11)';root.append(full)}
button('Mode sans distraction',()=>{const active=d.body.classList.toggle('cmd-view-distraction');status(active?'Mode sans distraction activé':'Mode sans distraction désactivé')});
option('wrap','Retour automatique à la ligne');
const sym=submenu('Symboles spéciaux');
let symbolDialog=null;
button('Aperçu des espaces, tabulations et fins de ligne',()=>{if(!symbolDialog){symbolDialog=d.createElement('dialog');symbolDialog.className='cmd-view-symbol-dialog';const heading=d.createElement('h3');heading.textContent='Caractères invisibles — aperçu';const note=d.createElement('p');note.textContent='Visualisation de contrôle en lecture seule. Le texte d’origine n’est pas modifié.';const pre=d.createElement('pre');pre.className='cmd-view-symbols';const close=d.createElement('button');close.textContent='Fermer';close.onclick=()=>symbolDialog.close();symbolDialog.append(heading,note,pre,close);d.body.append(symbolDialog);symbolDialog.render=()=>{pre.textContent=area.value.replace(/\r/g,'␍').replace(/ /g,'·').replace(/\t/g,'⇥   ').replace(/\n/g,'↵\n')}}symbolDialog.render();symbolDialog.showModal()},sym);
const zoom=submenu('Zoom');
for(const [action,label] of [['zoomIn','Zoom avant  Ctrl + +'],['zoomOut','Zoom arrière  Ctrl + −'],['zoomReset','Rétablir 100 %']])moveAction(action,zoom,label);
const tabMenu=submenu('Onglet');
const allTabs=()=>[...d.querySelectorAll('#tabs .tab')];
function clickTab(i){const tabs=allTabs();if(tabs[i])tabs[i].click();else status('Aucun onglet disponible')}
const activeTab=()=>{const i=allTabs().findIndex(x=>x.classList.contains('active'));return i<0?0:i};
button('Onglet précédent',()=>clickTab((activeTab()+allTabs().length-1)%Math.max(1,allTabs().length)),tabMenu);
button('Onglet suivant',()=>clickTab((activeTab()+1)%Math.max(1,allTabs().length)),tabMenu);
button('Premier onglet',()=>clickTab(0),tabMenu);
button('Dernier onglet',()=>clickTab(allTabs().length-1),tabMenu);
option('tabs','Afficher la barre des onglets',tabMenu);
const panels=submenu('Panneaux');
option('folder','Dossier en tant qu’espace de travail',panels);
option('files','Liste des documents ouverts',panels);
option('functions','Liste des fonctions',panels);
option('minimap','Plan du document (minimap)',panels);
option('gutter','Numéros de ligne',panels);
option('toolbar','Barre d’outils',panels);
option('status','Barre d’état',panels);
const direction=submenu('Sens du texte');
button('Gauche à droite',()=>{opts.rtl=false;apply()},direction);
button('Droite à gauche',()=>{opts.rtl=true;apply()},direction);
const detail=submenu('Informations du document');
button('Résumé du fichier...',()=>{
 const name=d.getElementById('fileName')?.value||'Sans nom',content=area.value,lines=content.split(/\r\n|\r|\n/).length;
 const words=content.trim()?content.trim().split(/\s+/).length:0,bytes=new TextEncoder().encode(content).length;
 const dialog=d.createElement('dialog');dialog.className='cmd-view-summary';const h=d.createElement('h3');h.textContent='Résumé du document';dialog.append(h);
 for(const [label,value] of [['Fichier',name],['Lignes',lines],['Caractères',content.length],['Mots',words],['Taille UTF-8',bytes+' octets']]){const p=d.createElement('p');p.textContent=label+' : '+value;dialog.append(p)}
 const close=d.createElement('button');close.textContent='Fermer';close.onclick=()=>{dialog.close();dialog.remove()};dialog.append(close);d.body.append(dialog);dialog.showModal()},detail);
option('rtl','Afficher de droite à gauche',direction);
// Folding based on real language lexers cannot be guaranteed with textarea: explain rather than run a fake action.
const fold=submenu('Repliage du code');
const explain=button('À venir : repliage par syntaxe',()=>status('Le repliage nécessite un moteur de code dédié : aucune ligne masquée artificiellement.'),fold);
explain.title='La zone de texte actuelle ne prend pas en charge le repliage de blocs par langage';
if(!window.CMDPAD_VIEW_READY){const old=d.getElementById('lines');if(old&&old.style.display==='none')opts.gutter=false;const map=d.getElementById('minimap');if(map&&map.style.display==='none')opts.minimap=false}
area.addEventListener('input',()=>{if(symbolDialog?.open)symbolDialog.render()});
d.addEventListener('fullscreenchange',()=>{status(d.fullscreenElement?'Plein écran activé':'Plein écran quitté')});
apply();window.CMDPAD_VIEW_READY=true;
})();
