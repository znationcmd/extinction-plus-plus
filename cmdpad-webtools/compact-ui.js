/* CMDPad++ clean interface: remove duplicate controls, preserve unique actions in their menus. */
(function(){
'use strict';
const d=document,toolbar=d.querySelector('.toolbar'),bar=d.querySelector('.menubar');
if(!toolbar||!bar)return;
const menus=[...bar.querySelectorAll(':scope>.menu')];
const menu=label=>menus.find(m=>m.querySelector(':scope>button')?.textContent.trim().toLowerCase()===label.toLowerCase());
const dropdown=label=>menu(label)?.querySelector(':scope>.dropdown');
const titleOf=b=>(b?.title||b?.textContent||'').trim();
let cleaned=0,moved=0;
function remove(b){if(b?.isConnected){b.remove();cleaned++}}
function moveButton(b,target,title){const list=dropdown(target);if(!b||!list)return false;if(title)b.textContent=title;b.classList.remove('toolbtn');b.style.cssText='';list.append(b);moved++;return true}
function byTitle(part){return [...toolbar.querySelectorAll('button')].find(b=>(b.title||'').toLowerCase().includes(part.toLowerCase()))}
function distinct(title,target){
 const b=byTitle(title);if(b)moveButton(b,target);
}
function knownDuplicate(title,otherSelector){
 const b=byTitle(title);if(b&&d.querySelector(otherSelector))remove(b);
}
// Keep labelled "Importer fichier" and remove its redundant icon.
if(d.querySelector('label.file-import[for="openInput"]'))remove(d.getElementById('openBtn'));
// The core "Valider" button already invokes the universal validator; other actions have menu equivalents.
knownDuplicate('Valider le document sans le modifier','#validateBtn');
knownDuplicate('Proposer des réparations','[data-cmdpad="correct"]');
knownDuplicate('Fiches techniques des extensions','[data-cmdpad="formats"]');
knownDuplicate('Enregistrer tous les documents','[data-cmdpad="saveall"]');
knownDuplicate('Empreintes cryptographiques et sommes de contrôle locales','[data-adv="hash"]');
knownDuplicate('Éditeur CSV et TSV local','#cmdTableOpen');
knownDuplicate('Catalogue des langages','#cmdpadLangChoose');
knownDuplicate('Décoder et convertir des textes','[data-adv="encoding"]');
knownDuplicate('Calcul des empreintes cryptographiques','[data-adv="hash"]');
knownDuplicate('Langages, choix manuel et auto','#cmdpadLangChoose');
// Keep the native encoding selector, but put it inside Encodage.
const encoding=d.getElementById('cmdpadEncodingChoice');
const encDrop=dropdown('Encodage');
if(encoding&&encDrop){const row=d.createElement('div');row.className='cmd-encoding-menu-row';const label=d.createElement('label');label.textContent='Lecture des fichiers : ';label.htmlFor=encoding.id;row.append(label,encoding);encDrop.append(row);moved++}
// Unique actions: relocate, never delete.
distinct('Images JPEG, PNG','Outils');
distinct('Exporter une copie explicitement','Encodage');
distinct('Enregistrer sous','Fichier');
distinct('Onglet précédent','Documents');
distinct('Onglet suivant','Documents');
distinct('Importer des fichiers d’un dossier','Fichier');
// Redundant actions in the extra row created by the older multi-file module.
const extra=d.getElementById('cmdExtra');
if(extra){const buttons=[...extra.querySelectorAll('button')];for(const b of buttons){
 const value=b.textContent.trim();
 if(value.includes('Dupliquer'))moveButton(b,'Fichier','Dupliquer le fichier');
 else if(value.includes('Autres'))moveButton(b,'Fichier','Fermer les autres fichiers');
 else if(value.includes('Tous fichiers'))moveButton(b,'Recherche','Rechercher dans tous les fichiers');
 else if(value.includes('Enregistrer tout')){
   if(!dropdown('Fichier')?.querySelector('[data-cmdpad="saveall"]'))moveButton(b,'Fichier','Enregistrer tout (dossier)');
   else remove(b)
 }
 else if(value.includes('Ouvrir dossier')){
   if(!dropdown('Fichier')?.querySelector('button[title*="dossier"]'))moveButton(b,'Fichier','Ouvrir un dossier');
   else remove(b)
 }
 else if(value.includes('Fichier'))remove(b);
 else moveButton(b,'Documents');
}
if(!extra.children.length)extra.remove();
}
// Collect the duplicated standalone toolbar controls into their existing menus.
const hash=byTitle('Empreintes cryptographiques et sommes de contrôle locales');if(hash)moveButton(hash,'Outils','MD5 / SHA / sommes de contrôle');
const image=byTitle('Retouche photo')||byTitle('Images JPEG');if(image)moveButton(image,'Outils','Retouche d’images');
const csv=byTitle('Éditeur CSV et TSV local');if(csv)moveButton(csv,'Outils','Éditeur CSV/TSV');
const langs=[...toolbar.querySelectorAll('button')].find(b=>b.textContent.trim()==='🌐 Langages');if(langs&&dropdown('Langage')?.querySelector('#cmdpadLangChoose'))remove(langs);
const more=toolbar.querySelector('#cmdpadToolbarExpand');if(more)remove(more);
for(const span of toolbar.querySelectorAll('span'))if(!span.children.length&&!span.textContent.trim())span.remove();
const actions=toolbar.querySelector('.actions');if(actions&&!actions.children.length)actions.remove();
// Extra lists were independently built by two modules. Retain the original #cmdpadOpenList.
const duplicate=d.getElementById('cmdpadWebFiles');if(duplicate){duplicate.remove();cleaned++}
// The other module may re-create #cmdpadWebFiles after switching tabs; the companion CSS keeps it hidden.
const toolbarControl=toolbar.querySelector('[title*="Formatage"]');
const existingFileMenu=dropdown('Fichier');if(existingFileMenu&&!existingFileMenu.querySelector('[data-cmdpad-show-formats]')){
 const b=d.createElement('button');b.type='button';b.dataset.cmdpadShowFormats='1';b.textContent='Tous les formats reconnus…';
 b.onclick=()=>{const formatAction=dropdown('Outils')?.querySelector('[data-cmdpad="formats"]')||bar.querySelector('#catalogAll');if(formatAction)formatAction.click();else{const b=[...toolbar.querySelectorAll('button')].find(x=>x.title?.includes('Fiches techniques'));if(b)b.click()}};
 existingFileMenu.append(b)
}
// Exact duplicate menu labels: keep the first functional control only; preserve unique callbacks.
for(const m of menus){const list=m.querySelector(':scope>.dropdown');if(!list)continue;const used=new Set();
for(const b of [...list.querySelectorAll(':scope>button')]){const k=b.textContent.trim().replace(/\s+/g,' ').toLocaleLowerCase('fr');if(!k)continue;if(used.has(k))remove(b);else used.add(k)}
}
function installLanguageHover(){
 const main=menu('Langage'),root=main?.querySelector('.cmd-language-tree');if(!root)return;
 const letters=[...root.querySelectorAll('details.cmd-lang-letter')].filter(x=>x.querySelector('[data-cmd-lang]'));
 let opened=null,wait=null;
 function close(){if(opened){opened.classList.remove('cmd-flyout-open');opened.open=false;opened=null}}
 function open(detail){clearTimeout(wait);if(opened!==detail)close();opened=detail;detail.open=true;detail.classList.add('cmd-flyout-open');
 const fly=detail.querySelector('.cmd-lang-flyout');if(!fly)return;
 const dr=detail.getBoundingClientRect(),parent=detail.closest('.dropdown')?.getBoundingClientRect()||dr,width=245;
 const left=parent.right+width+6>innerWidth?Math.max(6,parent.left-width-3):parent.right-2;
 fly.style.left=Math.round(left)+'px';fly.style.top=Math.round(Math.min(dr.top,innerHeight-70))+'px';
 fly.style.maxHeight=Math.max(130,innerHeight-20-Math.min(dr.top,innerHeight-70))+'px';
 }
 for(const detail of letters){if(detail.querySelector('.cmd-lang-flyout'))continue;const fly=d.createElement('div');fly.className='cmd-lang-flyout';
 for(const button of [...detail.querySelectorAll(':scope>button[data-cmd-lang]')])fly.append(button);
 detail.append(fly);
 const summary=detail.querySelector('summary');
 summary?.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')open(detail)});
 summary?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();opened===detail?close():open(detail)});
 detail.addEventListener('pointerleave',()=>{clearTimeout(wait);wait=setTimeout(()=>{if(!detail.matches(':hover')&&!fly.matches(':hover'))close()},170)});
 fly.addEventListener('pointerenter',()=>clearTimeout(wait));fly.addEventListener('pointerleave',()=>{clearTimeout(wait);wait=setTimeout(close,150)});
 }
 main?.querySelector(':scope>button')?.addEventListener('click',()=>{close()});
}
installLanguageHover();
window.CMDPAD_COMPACT_READY=true;
const status=d.getElementById('status');if(status)status.textContent='CMDPad++ : boutons en double retirés, tous les formats accessibles depuis Fichier';
})();