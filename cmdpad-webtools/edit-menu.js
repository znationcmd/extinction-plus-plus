/* CMDPad++: Notepad++-inspired Edit menu grouped by action. */
(function(){
'use strict';const d=document,bar=d.querySelector('.menubar'),a=d.getElementById('area');if(!bar||!a)return;
const menu=[...bar.querySelectorAll(':scope>.menu')].find(x=>x.querySelector(':scope>button')?.textContent.trim()==='Édition');if(!menu)return;const drop=menu.querySelector(':scope>.dropdown');if(!drop)return;
const info=t=>{const x=d.getElementById('status');if(x)x.textContent=t};
function sub(label){const host=d.createElement('div');host.className='cmd-view-submenu';const trigger=d.createElement('button');trigger.className='cmd-view-subtitle';trigger.type='button';trigger.textContent=label+'  ▸';const fly=d.createElement('div');fly.className='cmd-view-flyout';host.append(trigger,fly);drop.append(host);
const show=()=>{for(const other of drop.querySelectorAll('.cmd-view-submenu'))if(other!==host)other.classList.remove('active');host.classList.add('active');const r=trigger.getBoundingClientRect(),w=245;fly.style.left=(r.right+w>innerWidth?Math.max(4,r.left-w):r.right-1)+'px';fly.style.top=Math.min(innerHeight-165,r.top)+'px';fly.style.maxHeight=Math.max(145,innerHeight-12-Math.min(innerHeight-165,r.top))+'px'};
trigger.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show()});trigger.onclick=e=>{e.preventDefault();e.stopPropagation();host.classList.contains('active')?host.classList.remove('active'):show()};return fly}
function add(label,fn,target=drop){const b=d.createElement('button');b.type='button';b.textContent=label;b.onclick=e=>{e.preventDefault();e.stopPropagation();menu.classList.remove('open');try{fn()}catch(err){info('Édition : '+err.message)}};target.append(b);return b}
function move(action,target){const b=drop.querySelector(':scope>button[data-action="'+action+'"]');if(b)target.append(b)}
function apply(start,end,text){if(a.readOnly)return info('Lecture seule activée');a.focus();a.setRangeText(text,start,end,'select');a.dispatchEvent(new Event('input',{bubbles:true}))}
function selection(){const s=a.selectionStart,e=a.selectionEnd;return {s,e,value:a.value.slice(s,e)}}
function selectedOrAll(fn){const {s,e,value}=selection();if(e<=s){info('Sélectionne d’abord le texte à modifier');return}apply(s,e,fn(value))}
function selectedLines(fn){const {s,e}=selection(),t=a.value;const start=t.lastIndexOf('\n',Math.max(0,s-1))+1;let end=t.indexOf('\n',e);if(end<0)end=t.length;const out=fn(t.slice(start,end).split('\n'));apply(start,end,out.join('\n'))}
function whole(fn){if(!confirm('Appliquer cette opération à l’ensemble du document ?'))return;apply(0,a.value.length,fn(a.value))}
const clip=sub('Presse-papiers / Collage spécial');
add('Couper',async()=>{const {s,e,value}=selection();if(!value)return info('Aucune sélection');await navigator.clipboard.writeText(value);apply(s,e,'')},clip);
add('Copier',async()=>{const {value}=selection();if(!value)return info('Aucune sélection');await navigator.clipboard.writeText(value);info('Sélection copiée')},clip);
add('Coller en texte brut',async()=>{const txt=await navigator.clipboard.readText();const {s,e}=selection();apply(s,e,txt)},clip);
const insert=sub('Insertion');
add('Date et heure actuelles',()=>{const {s,e}=selection();apply(s,e,new Date().toLocaleString('fr-FR'))},insert);
add('Nom du fichier actuel',()=>{const {s,e}=selection();apply(s,e,d.getElementById('fileName')?.value||'sans-nom.txt')},insert);
add('Saut de ligne',()=>{const {s,e}=selection();apply(s,e,'\n')},insert);
const caseMenu=sub('MAJUSCULE / minuscule');
add('Tout en MAJUSCULES',()=>selectedOrAll(s=>s.toLocaleUpperCase('fr-FR')),caseMenu);
add('Tout en minuscules',()=>selectedOrAll(s=>s.toLocaleLowerCase('fr-FR')),caseMenu);
add('Initiale de chaque mot en majuscule',()=>selectedOrAll(s=>s.replace(/\p{L}[\p{L}\p{M}]*/gu,w=>w[0].toLocaleUpperCase('fr-FR')+w.slice(1).toLocaleLowerCase('fr-FR'))),caseMenu);
add('Inverser la casse',()=>selectedOrAll(s=>[...s].map(c=>c===c.toUpperCase()?c.toLowerCase():c.toUpperCase()).join('')),caseMenu);
const line=sub('Ligne');
for(const action of ['duplicateLine','deleteLine','moveUp','moveDown'])move(action,line);
add('Trier les lignes A → Z',()=>selectedLines(rows=>rows.sort(new Intl.Collator('fr',{numeric:true}).compare)),line);
add('Trier les lignes Z → A',()=>selectedLines(rows=>rows.sort(new Intl.Collator('fr',{numeric:true}).compare).reverse()),line);
add('Inverser l’ordre des lignes',()=>selectedLines(rows=>rows.reverse()),line);
add('Supprimer les lignes identiques',()=>selectedLines(rows=>[...new Set(rows)]),line);
add('Fusionner les lignes sélectionnées',()=>selectedLines(rows=>[rows.join(' ')]),line);
const indent=sub('Indentation');
for(const action of ['indent','outdent'])move(action,indent);
add('Convertir tabulations en 4 espaces',()=>selectedOrAll(s=>s.replace(/\t/g,'    ')),indent);
const whitespace=sub('Traitement des espacements');
add('Supprimer les espaces en fin de ligne',()=>whole(s=>s.replace(/[ \t]+$/gm,'')),whitespace);
add('Supprimer les espaces en début de ligne',()=>whole(s=>s.replace(/^[ \t]+/gm,'')),whitespace);
add('Supprimer les lignes complètement vides',()=>whole(s=>s.split(/\r?\n/).filter(v=>v.trim()).join('\n')),whitespace);
add('Réduire les espaces multiples',()=>selectedOrAll(s=>s.replace(/ {2,}/g,' ')),whitespace);
const comments=sub('Commentaire');move('comment',comments);
const newline=sub('Convertir les sauts de ligne');
function exportEOL(eol,tag){const content=a.value.replace(/\r\n?/g,'\n').replace(/\n/g,eol),blob=new Blob([content],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=d.createElement('a');link.href=url;link.download=(d.getElementById('fileName')?.value||'document.txt').replace(/(\.[^.]+)?$/,m=>'_'+tag+(m||'.txt'));d.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);info('Copie exportée avec fins de ligne '+tag+' (original conservé)')}
add('Exporter copie Windows CRLF',()=>exportEOL('\r\n','CRLF'),newline);
add('Exporter copie Unix LF',()=>exportEOL('\n','LF'),newline);
add('Exporter copie Mac ancien CR',()=>exportEOL('\r','CR'),newline);
window.CMDPAD_EDIT_MENU_READY=true;
})();