/* CMDPad++ Documents menu — Notepad++-style document switcher and sorting. */
(function(){
'use strict';
const d=document,bar=d.querySelector('.menubar'),area=d.getElementById('area'),filename=d.getElementById('fileName'),tabs=d.getElementById('tabs');
if(!bar||!area||!filename||!tabs||window.CMDPAD_DOCUMENTS_MENU_READY)return;
const menu=[...bar.querySelectorAll(':scope>.menu')].find(x=>x.querySelector(':scope>button')?.textContent.trim()==='Documents');
if(!menu)return;
const dropdown=menu.querySelector(':scope>.dropdown');if(!dropdown)return;
const core=typeof docs!=='undefined'&&Array.isArray(docs)?docs:null;
const status=text=>{const el=d.getElementById('status');if(el)el.textContent=text};
const working=()=>{if(!core){status('Documents : gestion des onglets indisponible');return false}return true};
const currentIndex=()=>typeof activeDoc==='number'?activeDoc:Math.max(0,[...tabs.querySelectorAll('.tab')].findIndex(x=>x.classList.contains('active')));
function persist(){try{if(typeof saveWorkspace==='function')saveWorkspace()}catch{}}
function capture(){
 if(!working())return;let doc=core[currentIndex()];if(doc){const changed=doc.text!==area.value;doc.text=area.value;doc.name=filename.value||doc.name;doc.type=d.getElementById('type')?.value||doc.type;if(changed)doc.dirty=true}persist()
}
function open(index){if(!working()||!core[index])return;capture();if(typeof switchTab==='function')switchTab(index);else tabs.querySelectorAll('.tab')[index]?.click();status('Document : '+core[index].name);menu.classList.remove('open')}
function close(index){if(!working()||!core[index])return;capture();if(core[index]?.dirty&&!confirm('Fermer le fichier modifié « '+core[index].name+' » sans sauvegarder ?'))return;
 const id=core[index].id;const el=[...tabs.querySelectorAll('.tab')].find(x=>Number(x.dataset.index)===index);if(el?.querySelector('.tab-close'))el.querySelector('.tab-close').click();else if(typeof closeTab==='function')closeTab(index);locks.delete(id);persist();schedule();
}
const locks=new Set();
function menuButton(parent,title,action){const b=d.createElement('button');b.type='button';b.textContent=title;b.onclick=e=>{e.preventDefault();e.stopPropagation();try{action()}catch(err){status('Documents : '+String(err.message||err))}};parent.append(b);return b}
function submenu(name){const root=d.createElement('div');root.className='cmd-docs-group';
 const trigger=d.createElement('button');trigger.type='button';trigger.className='cmd-docs-trigger';trigger.textContent=name+'  ›';
 const popup=d.createElement('div');popup.className='cmd-docs-fly';root.append(trigger,popup);dropdown.append(root);
 const shut=()=>root.classList.remove('expanded');
 function expand(){for(const o of dropdown.querySelectorAll('.cmd-docs-group'))if(o!==root)o.classList.remove('expanded');
 root.classList.add('expanded');const t=trigger.getBoundingClientRect(),parent=dropdown.getBoundingClientRect(),w=260;
 popup.style.left=Math.round(parent.right+w+6>innerWidth?Math.max(5,parent.left-w-2):parent.right-2)+'px';
 popup.style.top=Math.round(Math.min(t.top,innerHeight-145))+'px';
 popup.style.maxHeight=Math.max(155,innerHeight-Math.min(t.top,innerHeight-145)-12)+'px'}
 trigger.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')expand()});
 trigger.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();root.classList.contains('expanded')?shut():expand()});
 let wait;root.addEventListener('pointerleave',()=>{clearTimeout(wait);wait=setTimeout(shut,250)});popup.addEventListener('pointerenter',()=>clearTimeout(wait));
 return popup;
}
const oldButtons=[...dropdown.querySelectorAll(':scope>button')];dropdown.replaceChildren();
const sortBox=submenu('Trier par');
function sortDocs(mode){
 if(!working())return;capture();const selected=core[currentIndex()]?.id,copy=core.map((doc,i)=>({doc,i}));
 const extension=x=>(x.name||'').split('.').pop().toLowerCase();
 const compare=(a,b)=>new Intl.Collator('fr',{numeric:true,sensitivity:'base'}).compare(a,b);
 copy.sort((a,b)=>mode==='name'?compare(a.doc.name||'',b.doc.name||''):
 mode==='nameDesc'?-compare(a.doc.name||'',b.doc.name||''):
 mode==='type'?compare(extension(a.doc),extension(b.doc))||compare(a.doc.name,b.doc.name):
 mode==='length'?(a.doc.text||'').length-(b.doc.text||'').length:
 mode==='modified'?Number(!!b.doc.dirty)-Number(!!a.doc.dirty)||a.i-b.i:
 a.i-b.i);
 core.splice(0,core.length,...copy.map(x=>x.doc));
 const idx=Math.max(0,core.findIndex(x=>x.id===selected));if(typeof loadDoc==='function')loadDoc(idx);else tabs.querySelectorAll('.tab')[idx]?.click();
 status('Documents triés : '+({name:'Nom A → Z',nameDesc:'Nom Z → A',type:'Extension',length:'Longueur',modified:'Modifiés d’abord'}[mode]||mode));persist();schedule();menu.classList.remove('open')
}
for(const [title,mode] of [['Nom A → Z','name'],['Nom Z → A','nameDesc'],['Extension / type','type'],['Longueur du texte','length'],['Fichiers modifiés d’abord','modified']])menuButton(sortBox,title,()=>sortDocs(mode));
function openManager(){
 if(!working())return;capture();
 const dialog=d.createElement('dialog');dialog.className='cmd-docs-dialog';d.body.append(dialog);
 const heading=d.createElement('h3');heading.textContent='Documents ouverts ('+core.length+')';dialog.append(heading);
 const input=d.createElement('input');input.type='search';input.placeholder='Rechercher un document…';input.style.cssText='width:100%;padding:9px;box-sizing:border-box;margin-bottom:8px';dialog.append(input);
 const results=d.createElement('div');results.className='cmd-docs-results';dialog.append(results);
 const closeButton=menuButton(dialog,'Fermer la liste',()=>{dialog.close();dialog.remove()});
 function render(){results.replaceChildren();const q=input.value.toLocaleLowerCase('fr');
 core.forEach((doc,i)=>{if(!String(doc.name||'').toLocaleLowerCase('fr').includes(q))return;
 const row=d.createElement('div');row.className='cmd-docs-row';const label=d.createElement('span');label.textContent=(i===currentIndex()?'● ':'')+(i+1)+'. '+(doc.name||'sans-titre')+(doc.dirty?' *':'');row.append(label);
 menuButton(row,'Ouvrir',()=>{open(i);dialog.close();dialog.remove()});
 menuButton(row,'Fermer',()=>{close(i);render()});results.append(row)})}
 input.oninput=render;render();dialog.showModal()
}
menuButton(dropdown,'Documents…',openManager);
const control=submenu('Gestion des documents');
const native=new Map(oldButtons.map(b=>[b.dataset.cmd,b]));
for(const [key,label] of [['new','Nouvel onglet'],['close','Fermer l’onglet actif'],['readonly','Lecture seule'],['panel','Liste des fonctions'],['saveas','Enregistrer sous…']]){
 const b=native.get(key);if(b){b.textContent=label;control.append(b)}
}
menuButton(control,'Dupliquer le document actif',()=>{if(!working())return;capture();const doc=core[currentIndex()];if(!doc)return;const clone={...doc,id:Date.now()+Math.random(),name:doc.name.replace(/(\.[^.]+)?$/,'-copie$1'),dirty:true};core.splice(currentIndex()+1,0,clone);if(typeof loadDoc==='function')loadDoc(currentIndex()+1);persist();schedule();menu.classList.remove('open')});
menuButton(control,'Renommer le document actif',()=>{if(!working())return;const doc=core[currentIndex()];if(!doc)return;const name=prompt('Nouveau nom du document :',doc.name);if(!name?.trim())return;filename.value=name.trim();filename.dispatchEvent(new Event('input',{bubbles:true}));persist();schedule();menu.classList.remove('open')});
menuButton(control,'Fermer tous les autres',()=>{if(!working()||core.length<2)return;capture();const idx=currentIndex(),keep=core[idx],removed=core.filter((x,i)=>i!==idx),dirty=removed.filter(x=>x.dirty);
 if(dirty.length&&!confirm('Fermer '+dirty.length+' document(s) modifié(s) sans sauvegarder ?'))return;
 core.splice(0,core.length,keep);if(typeof loadDoc==='function')loadDoc(0);persist();schedule();menu.classList.remove('open')});
menuButton(control,'Fermer tous les documents',()=>{if(!working())return;capture();const dirty=core.filter(x=>x.dirty).length;if(dirty&&!confirm('Fermer '+dirty+' fichier(s) modifié(s) sans sauvegarder ?'))return;
 core.splice(0,core.length,{id:Date.now(),name:'nouveau.txt',type:'AUTO',text:'',dirty:false});if(typeof loadDoc==='function')loadDoc(0);persist();schedule();menu.classList.remove('open')});
menuButton(control,'Basculer au document suivant   Ctrl+Tab',()=>{if(!working())return;open((currentIndex()+1)%core.length)});
menuButton(control,'Basculer au document précédent   Ctrl+Maj+Tab',()=>{if(!working())return;open((currentIndex()+core.length-1)%core.length)});
const recent=d.createElement('div');recent.className='cmd-docs-recent';dropdown.append(recent);
function renderMenu(){
 if(!core)return;recent.replaceChildren();
 const h=d.createElement('div');h.className='cmd-docs-sep';h.textContent='Documents ouverts ('+core.length+')';recent.append(h);
 const max=45;for(let i=0;i<Math.min(core.length,max);i++){const doc=core[i],isActive=i===currentIndex();
 const b=menuButton(recent,(isActive?'✓  ':'')+(i+1)+': '+(doc.name||'sans-titre')+(doc.dirty?' *':''),()=>open(i));b.title=doc.name||'sans-titre';if(isActive)b.classList.add('active')}
 if(core.length>max)menuButton(recent,'Voir les '+(core.length-max)+' autres documents…',openManager)
}
let timer=null;function schedule(){clearTimeout(timer);timer=setTimeout(renderMenu,45)}
menu.addEventListener('pointerenter',renderMenu);menu.querySelector(':scope>button')?.addEventListener('click',renderMenu);
const observer=new MutationObserver(schedule);observer.observe(tabs,{subtree:true,childList:true,characterData:true});
renderMenu();
window.CMDPAD_DOCUMENTS_MENU_READY=true;
})();
