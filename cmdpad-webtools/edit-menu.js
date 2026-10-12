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

/* Commandes complémentaires inspirées de Notepad++ : toutes utilisent l'éditeur existant. */
const direct=(label,fn,before)=>{
 const b=d.createElement('button');b.type='button';b.textContent=label;
 b.onclick=e=>{e.preventDefault();e.stopPropagation();menu.classList.remove('open');Promise.resolve().then(fn).catch(err=>info('Édition : '+String(err.message||err)))};
 drop.insertBefore(b,before||clip);return b;
};
const firstClip=[...clip.querySelectorAll('button')];
for(const b of firstClip.filter(b=>['Couper','Copier'].includes(b.textContent.trim())))drop.insertBefore(b,clip);
direct('Coller   Ctrl+V',async()=>{
 try{const text=await navigator.clipboard.readText(),{s,e}=selection();apply(s,e,text)}
 catch{info('Collage non autorisé par le navigateur : utilise Ctrl+V dans le document')}
});
direct('Supprimer   Suppr',()=>{
 const {s,e}=selection();if(s!==e)apply(s,e,'');else if(s<a.value.length)apply(s,s+1,'')
});
const nativeSelect=drop.querySelector(':scope>button[data-action="selectAll"],:scope>button[data-action="selectall"]');
if(nativeSelect)nativeSelect.textContent='Sélectionner tout   Ctrl+A';
else direct('Sélectionner tout   Ctrl+A',()=>{a.focus();a.select()});
let selectionAnchor=null,columnAnchor=null;
direct('Début / fin de sélection   Ctrl+Maj+B',()=>{
 if(selectionAnchor===null){selectionAnchor=a.selectionStart;info('Début de sélection marqué à la position '+(selectionAnchor+1))}
 else{const end=a.selectionEnd;a.focus();a.setSelectionRange(Math.min(selectionAnchor,end),Math.max(selectionAnchor,end));selectionAnchor=null;info('Sélection entre les deux positions')}});
function offsetPoint(offset){const part=a.value.slice(0,offset).split('\n');return {line:part.length-1,col:part[part.length-1].length}}
direct('Début / fin de sélection en colonne   Alt+Maj+B',()=>{
 if(!columnAnchor){columnAnchor=offsetPoint(a.selectionStart);info('Début de sélection en colonne : ligne '+(columnAnchor.line+1)+', colonne '+(columnAnchor.col+1))}
 else{const end=offsetPoint(a.selectionEnd);openColumn({startLine:Math.min(columnAnchor.line,end.line)+1,endLine:Math.max(columnAnchor.line,end.line)+1,startCol:Math.min(columnAnchor.col,end.col)+1,endCol:Math.max(columnAnchor.col,end.col)+1});columnAnchor=null;}});
function makeModal(heading,explanation=''){
 const dialog=d.createElement('dialog');dialog.className='cmd-edit-modal';dialog.style.cssText='width:min(760px,95vw);max-height:85vh;overflow:auto;border:1px solid #9faec6;border-radius:7px;padding:16px;background:white;color:#17263d';
 const h=d.createElement('h3');h.textContent=heading;dialog.append(h);if(explanation){const p=d.createElement('p');p.textContent=explanation;dialog.append(p)}
 const content=d.createElement('div');dialog.append(content);
 const actions=d.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';dialog.append(actions);
 const button=(name,fn)=>{const b=d.createElement('button');b.type='button';b.textContent=name;b.style.cssText='padding:8px 11px;border:1px solid #a8b8ce;border-radius:5px;background:#eef4ff;color:#1d2b40;cursor:pointer';b.onclick=fn;actions.append(b);return b};
 button('Fermer',()=>{dialog.close();dialog.remove()});d.body.append(dialog);dialog.showModal();return {dialog,content,button};
}
const selectionGroup=sub('Pour la sélection');
add('Sélectionner le mot sous le curseur',()=>{
 const point=a.selectionStart,source=a.value;let start=point,end=point;const word=/[\p{L}\p{N}_]/u;
 while(start>0&&word.test(source[start-1]))start--;
 while(end<source.length&&word.test(source[end]))end++;
 a.focus();a.setSelectionRange(start,end);info('Mot sélectionné')
},selectionGroup);
add('Sélectionner la ligne entière',()=>{const {s,e}=selection(),source=a.value;const start=source.lastIndexOf('\n',Math.max(0,s-1))+1;const next=source.indexOf('\n',e);a.focus();a.setSelectionRange(start,next<0?source.length:next);info('Ligne sélectionnée')},selectionGroup);
add('Sélectionner jusqu’au début du document',()=>{const {e}=selection();a.focus();a.setSelectionRange(0,e)},selectionGroup);
add('Sélectionner jusqu’à la fin du document',()=>{const {s}=selection();a.focus();a.setSelectionRange(s,a.value.length)},selectionGroup);
add('Sélectionner le texte entre parenthèses / accolades',()=>{
 const source=a.value,point=a.selectionStart;let candidate=null;
 const pairs=[['(',')'],['[',']'],['{','}']];
 for(const [open,close] of pairs){let depth=0,left=-1,right=-1;for(let i=point-1;i>=0;i--){if(source[i]===close)depth++;if(source[i]===open){if(depth===0){left=i;break}depth--}}
 if(left<0)continue;depth=0;for(let i=left+1;i<source.length;i++){if(source[i]===open)depth++;if(source[i]===close){if(depth===0){right=i;break}depth--}}
 if(right>=point&&(candidate===null||right-left<candidate.right-candidate.left))candidate={left,right}}
 if(!candidate)return info('Aucune paire de délimiteurs englobante trouvée');a.focus();a.setSelectionRange(candidate.left+1,candidate.right);info('Contenu entre délimiteurs sélectionné')
},selectionGroup);
const copyGroup=sub('Copier dans le presse-papiers');
add('Copier le texte sélectionné',async()=>{const value=selection().value;if(!value)return info('Aucun texte sélectionné');await navigator.clipboard.writeText(value);info('Texte copié')},copyGroup);
add('Copier la ligne actuelle',async()=>{const t=a.value,p=a.selectionStart,s=t.lastIndexOf('\n',Math.max(0,p-1))+1,n=t.indexOf('\n',p);await navigator.clipboard.writeText(t.slice(s,n<0?t.length:n));info('Ligne copiée')},copyGroup);
add('Copier le nom de fichier',async()=>{await navigator.clipboard.writeText(d.getElementById('fileName')?.value||'');info('Nom de fichier copié')},copyGroup);
const pasteGroup=sub('Collage spécial');
add('Coller en supprimant les fins de ligne',async()=>{const v=(await navigator.clipboard.readText()).replace(/\r\n?|\n/g,' ');const {s,e}=selection();apply(s,e,v)},pasteGroup);
add('Coller en JSON (chaîne avec échappements)',async()=>{const v=JSON.stringify(await navigator.clipboard.readText());const {s,e}=selection();apply(s,e,v)},pasteGroup);
add('Coller sans indentation initiale',async()=>{const lines=(await navigator.clipboard.readText()).split(/\r?\n/);const lengths=lines.filter(x=>x.trim()).map(x=>x.match(/^[ \t]*/)[0].length);const min=Math.min(...lengths,0);const v=lines.map(x=>x.slice(min)).join('\n'),{s,e}=selection();apply(s,e,v)},pasteGroup);
const auto=sub('Autocomplétion');
add('Compléter le mot à partir du fichier   Ctrl+Espace',()=>{
 const source=a.value,start=a.selectionStart,match=source.slice(0,start).match(/[\p{L}_][\p{L}\p{N}_]*$/u);
 if(!match)return info('Saisis le début d’un mot pour le compléter');
 const term=match[0],words=[...new Set(source.match(/[\p{L}_][\p{L}\p{N}_]*/gu)||[])];
 const candidate=words.find(x=>x!==term&&x.toLowerCase().startsWith(term.toLowerCase()));
 if(!candidate)return info('Aucune complétion trouvée dans le document');
 apply(start-term.length,start,candidate);info('Mot complété')
},auto);
add('Afficher les propositions du document…',()=>{
 const current=selection().value||a.value.slice(0,a.selectionStart).match(/[\p{L}_][\p{L}\p{N}_]*$/u)?.[0]||'';
 const matches=[...new Set(a.value.match(/[\p{L}_][\p{L}\p{N}_]*/gu)||[])].filter(x=>x.startsWith(current)&&x!==current).slice(0,120);
 if(!matches.length)return info('Aucune proposition trouvée');
 const {content,button,dialog}=makeModal('Autocomplétion — '+current,'Propositions extraites du document ouvert.');
 const filter=d.createElement('input');filter.type='search';filter.placeholder='Filtrer';filter.value=current;filter.style.cssText='width:100%;padding:8px';content.append(filter);
 const list=d.createElement('div');list.style.cssText='max-height:300px;overflow:auto';content.append(list);
 const display=()=>{list.replaceChildren();for(const word of matches.filter(w=>w.toLowerCase().includes(filter.value.toLowerCase()))){const b=d.createElement('button');b.type='button';b.textContent=word;b.style.cssText='display:block;padding:6px 10px;width:100%;text-align:left';b.onclick=()=>{const at=a.selectionStart,term=current;apply(at-term.length,at,word);dialog.close();dialog.remove()};list.append(b)}};
 filter.oninput=display;display();button('Actualiser',display)
},auto);
let multi=[];
function findAll(term){if(!term)return [];let found=[],start=0;while(start<a.value.length){const i=a.value.indexOf(term,start);if(i<0||found.length>=5000)break;found.push({start:i,end:i+term.length});start=i+Math.max(1,term.length)}return found}
const multiGroup=sub('Multi-sélection');
add('Toutes les occurrences du texte sélectionné',()=>{
 const term=selection().value;if(!term)return info('Sélectionne un mot ou du texte');multi=findAll(term);
 info(multi.length+' occurrences repérées (sélection multiple logique, sans curseurs multiples dans textarea)')
},multiGroup);
add('Ajouter l’occurrence suivante',()=>{
 const term=selection().value||(multi.length? a.value.slice(multi[0].start,multi[0].end):'');
 if(!term)return info('Sélectionne d’abord un mot');
 const all=findAll(term),available=all.filter(r=>r.start>a.selectionEnd&&!multi.some(m=>m.start===r.start));
 const next=available[0]||all.find(r=>!multi.some(m=>m.start===r.start));
 if(!next)return info('Aucune autre occurrence à ajouter');
 multi.push(next);a.focus();a.setSelectionRange(next.start,next.end);info(multi.length+' occurrences mémorisées')
},multiGroup);
add('Annuler le dernier ajout à la multi-sélection',()=>{multi.pop();info(multi.length+' occurrence(s) mémorisée(s)')},multiGroup);
add('Sauter la sélection actuelle et aller à la suivante',()=>{
 const term=selection().value;if(!term)return info('Sélectionne du texte');
 const i=a.value.indexOf(term,a.selectionEnd);const idx=i>=0?i:a.value.indexOf(term);
 if(idx<0)return info('Aucune autre occurrence');a.focus();a.setSelectionRange(idx,idx+term.length);info('Occurrence suivante')
},multiGroup);
add('Remplacer les occurrences mémorisées…',()=>{
 if(!multi.length)return info('Aucune occurrence mémorisée');
 const replacement=prompt('Texte de remplacement pour '+multi.length+' occurrence(s) :');if(replacement===null)return;
 if(!confirm('Remplacer '+multi.length+' occurrence(s) mémorisée(s) ?'))return;
 let output=a.value;const spans=multi.slice().sort((x,y)=>y.start-x.start);
 for(const p of spans)output=output.slice(0,p.start)+replacement+output.slice(p.end);
 apply(0,a.value.length,output);info(spans.length+' occurrence(s) remplacée(s)');multi=[]
},multiGroup);
let columnConfig=null;
function openColumn(opts={}){
 const lines=a.value.split('\n'),cur=offsetPoint(a.selectionStart);
 const {content,button,dialog}=makeModal('Mode colonne — CMDPad++','Choisis des lignes et des colonnes de caractères. Opérations réelles sur plusieurs lignes, sans prétendre à un multicurseur natif.');
 const controls=d.createElement('div');controls.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px';content.append(controls);
 function field(label,value,max){const l=d.createElement('label');l.textContent=label;const x=d.createElement('input');x.type='number';x.min='1';x.max=String(max);x.value=String(value);x.style.cssText='display:block;width:100%;box-sizing:border-box;padding:8px;margin:4px 0';l.append(x);controls.append(l);return x}
 const ls=field('Première ligne',opts.startLine||cur.line+1,lines.length),le=field('Dernière ligne',opts.endLine||cur.line+1,lines.length),cs=field('Colonne de début',opts.startCol||cur.col+1,100000),ce=field('Colonne de fin (exclue)',opts.endCol||cur.col+1,100000);
 const insert=d.createElement('input');insert.type='text';insert.placeholder='Texte à insérer / remplacer';insert.style.cssText='padding:8px;width:100%;box-sizing:border-box;margin:9px 0';content.append(insert);
 const preview=d.createElement('pre');preview.style.cssText='max-height:160px;overflow:auto;background:#eef4fa;padding:10px;font:12px/1.4 monospace';content.append(preview);
 function config(){const x=[ls,le,cs,ce].map(f=>Number(f.value));if(x.some(x=>!Number.isInteger(x)||x<1)||x[0]>x[1]||x[1]>lines.length||x[2]>x[3])throw Error('Bornes de ligne ou de colonne invalides');return {ls:x[0]-1,le:x[1]-1,start:x[2]-1,end:x[3]-1}}
 function render(){try{const v=config();preview.textContent=lines.slice(v.ls,v.le+1).map((line,i)=>String(v.ls+i+1).padStart(4)+' | '+line.slice(v.start,v.end)).join('\n')||'(sélection vide)'}catch(e){preview.textContent=e.message}}
 for(const x of [ls,le,cs,ce])x.oninput=render;render();
 button('Copier la sélection en colonne',async()=>{try{const v=config();await navigator.clipboard.writeText(lines.slice(v.ls,v.le+1).map(l=>l.slice(v.start,v.end)).join('\n'));info('Colonne copiée')}catch(e){info('Impossible de copier : '+e.message)}});
 button('Remplacer / insérer dans toutes les lignes',()=>{
 try{const v=config();const count=v.le-v.ls+1;if(!confirm('Modifier '+count+' ligne(s) du fichier en colonne ?'))return;
 const out=lines.map((row,i)=>i<v.ls||i>v.le?row:row.padEnd(v.start,' ' ).slice(0,v.start)+insert.value+row.slice(Math.min(v.end,row.length)));
 apply(0,a.value.length,out.join('\n'));dialog.close();dialog.remove();info(count+' lignes mises à jour en colonne')
 }catch(e){info(e.message)}});
}
const colGroup=sub('Sélection et édition en colonne');
add('Sélection en mode colonne…',()=>openColumn(),colGroup);
add('Édition en mode colonnes…',()=>openColumn(),colGroup);
add('Insérer un numéro de ligne dans une colonne…',()=>{
 const first=Number(prompt('Numéro de première ligne :','1'));const last=Number(prompt('Numéro de dernière ligne :',String(a.value.split('\n').length)));
 const col=Number(prompt('Colonne de départ :','1'));const num=Number(prompt('Numéro initial :','1'));
 if(![first,last,col,num].every(Number.isInteger)||first<1||last<first||col<1)return info('Valeurs invalides');
 if(!confirm('Numéroter les lignes '+first+' à '+last+' à la colonne '+col+' ?'))return;
 const lines=a.value.split('\n');if(last>lines.length)return info('Dernière ligne inexistante');
 for(let i=first-1;i<last;i++)lines[i]=lines[i].padEnd(col-1,' ').slice(0,col-1)+String(num+i-first+1)+lines[i].slice(col-1);
 apply(0,a.value.length,lines.join('\n'));info('Numérotation appliquée')
},colGroup);
add('Panneau des caractères ASCII…',()=>{
 const {content,dialog}=makeModal('Caractères ASCII / Unicode','Cliquer sur un caractère pour l’insérer. Les caractères de contrôle sont affichés par leur nom, sans insertion.');
 const input=d.createElement('input');input.type='number';input.min='0';input.max='65535';input.value='32';input.style.cssText='padding:7px;width:90px';content.append(input);
 const grid=d.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:5px;max-height:290px;overflow:auto;margin-top:8px';content.append(grid);
 const control=['NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL','BS','TAB','LF','VT','FF','CR','SO','SI','DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB','CAN','EM','SUB','ESC','FS','GS','RS','US'];
 function render(){grid.replaceChildren();const n=Math.max(0,Math.min(65504,Number(input.value)||0));for(let i=n;i<Math.min(n+160,65536);i++){
 const b=d.createElement('button');b.type='button';const char=i<32?control[i]:i===127?'DEL':String.fromCharCode(i);
 b.textContent=i+' · '+(i<32||i===127?'⟨'+char+'⟩':char);b.title='U+'+i.toString(16).padStart(4,'0').toUpperCase();b.disabled=i<32||i===127;b.style.cssText='padding:6px;background:#f1f6ff;border:1px solid #b4c4d8;cursor:pointer';
 b.onclick=()=>{const {s,e}=selection();apply(s,e,String.fromCharCode(i));dialog.close();dialog.remove()};grid.append(b)
 }}input.oninput=render;render()
});
d.addEventListener('keydown',e=>{
 if(!(e.ctrlKey||e.metaKey)||e.key!==' '||e.altKey)return;
 if(d.activeElement!==a)return;e.preventDefault();const b=[...auto.querySelectorAll('button')].find(x=>x.textContent.includes('Compléter le mot'));b?.click()
},true);

window.CMDPAD_EDIT_MENU_READY=true;
})();