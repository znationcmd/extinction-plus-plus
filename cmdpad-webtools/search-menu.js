/* CMDPad++ — Recherche avancée, fichiers ouverts, signets locaux */
(function(){
'use strict';
const d=document,bar=d.querySelector('.menubar'),area=d.getElementById('area'),find=d.getElementById('find');
const root=[...bar?.querySelectorAll(':scope>.menu')||[]].find(m=>m.querySelector(':scope>button')?.textContent.trim()==='Recherche');
const drop=root?.querySelector(':scope>.dropdown');if(!drop||!area||!find)return;
if(window.CMDPAD_SEARCH_MENU_READY)return;
const original=[...drop.querySelectorAll(':scope>button')],marks=new Map(),flags={regex:false,case:false,word:false};
const status=msg=>{const s=d.getElementById('status');if(s)s.textContent=msg};
const button=(host,label,action)=>{const b=d.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{try{Promise.resolve(action()).catch(e=>status('Recherche : '+e.message))}catch(e){status('Recherche : '+e.message)}};host.append(b);return b};
const docs0=()=>typeof docs!=='undefined'&&Array.isArray(docs)?docs:[{id:'active',name:'fichier actif',text:area.value}];
const idx=()=>typeof activeDoc==='number'?activeDoc:0;
function expression(q,global=true){
 const safe=flags.regex?q:Array.from(q,c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('');
 return new RegExp(flags.word?'\\b(?:'+safe+')\\b':safe,(global?'g':'')+(flags.case?'':'i')+'u')
}
function occurrences(text,q,max=2500){
 if(!q)return [];const re=expression(q),hits=[];let found;
 while((found=re.exec(text))!==null&&hits.length<max){
  if(!found[0].length){if(re.lastIndex>=text.length)break;re.lastIndex++;continue}
  hits.push({start:found.index,end:found.index+found[0].length,line:text.slice(0,found.index).split('\n').length})
 }return hits
}
function next(dir){
 const q=find.value||area.value.slice(area.selectionStart,area.selectionEnd);
 if(!q)return status('Indique une recherche');
 const h=occurrences(area.value,q);if(!h.length)return status('Aucun résultat');
 const at=dir>0?h.find(x=>x.start>=area.selectionEnd)||h[0]:h.slice().reverse().find(x=>x.end<=area.selectionStart)||h[h.length-1];
 area.focus();area.setSelectionRange(at.start,at.end);status('Résultat '+(h.indexOf(at)+1)+' / '+h.length+' (ligne '+at.line+')')
}
function dialog(){
 const modal=d.createElement('dialog');modal.style.cssText='width:min(850px,95vw);max-height:84vh;overflow:auto;padding:15px;background:#fff;color:#17263d;border:1px solid #a8b9ce;border-radius:7px';
 const h=d.createElement('h3');h.textContent='Recherche avancée';modal.append(h);
 const q=d.createElement('input');q.value=find.value;q.placeholder='Rechercher';q.style.cssText='display:block;width:100%;padding:8px;box-sizing:border-box';modal.append(q);
 const replacement=d.createElement('input');replacement.placeholder='Remplacer par';replacement.style.cssText='display:block;width:100%;padding:8px;box-sizing:border-box';replacement.value=d.getElementById('replace')?.value||'';modal.append(replacement);
 const opts=d.createElement('div');opts.style.cssText='display:flex;gap:12px;flex-wrap:wrap;margin:10px 0';modal.append(opts);
 for(const [key,name] of [['regex','Expression régulière'],['case','Respecter la casse'],['word','Mot entier']]){
  const l=d.createElement('label'),c=d.createElement('input');c.type='checkbox';c.checked=flags[key];c.onchange=()=>flags[key]=c.checked;l.append(c,d.createTextNode(name));opts.append(l)
 }
 const result=d.createElement('div');result.style.cssText='max-height:35vh;overflow:auto;margin:10px 0';modal.append(result);
 function sync(){find.value=q.value;const r=d.getElementById('replace');if(r)r.value=replacement.value}
 button(modal,'Résultat suivant',()=>{sync();next(1)});
 button(modal,'Résultat précédent',()=>{sync();next(-1)});
 button(modal,'Chercher dans tous les onglets',()=>{sync();allTabs(result)});
 button(modal,'Remplacer tout (fichier actif)',()=>{
  sync();if(area.readOnly)return status('Lecture seule');
  const count=occurrences(area.value,q.value).length;
  if(!count)return status('Aucune occurrence');
  if(!confirm('Remplacer '+count+' occurrence(s) dans le document actif ?'))return;
  area.setRangeText(area.value.replace(expression(q.value),replacement.value),0,area.value.length,'end');
  area.dispatchEvent(new Event('input',{bubbles:true}));status(count+' occurrence(s) remplacée(s)')
 });
 button(modal,'Fermer',()=>{modal.close();modal.remove()});
 d.body.append(modal);modal.showModal();q.focus()
}
function allTabs(host){
 const docsList=docs0(),active=docsList[idx()];if(active)active.text=area.value;
 const q=find.value;if(!q)return status('Indique le texte à rechercher');
 host.replaceChildren();let n=0;
 docsList.forEach((doc,i)=>{const content=doc.text||'';for(const hit of occurrences(content,q,400)){
  n++;if(n>400)continue;
  button(host,(doc.name||'Sans titre')+' : '+hit.line+' — '+(content.split('\n')[hit.line-1]||'').slice(0,95),()=>{
   if(typeof switchTab==='function')switchTab(i);else d.querySelectorAll('#tabs .tab')[i]?.click();
   area.focus();area.setSelectionRange(hit.start,hit.end)
  })
 }});
 status(n+' occurrence(s) dans '+docsList.length+' document(s)')
}
function line(){return area.value.slice(0,area.selectionStart).split('\n').length}
function mark(){
 const id=docs0()[idx()]?.id||'active',n=line(),set=marks.get(id)||new Set();
 set.has(n)?set.delete(n):set.add(n);marks.set(id,set);status(set.size+' signet(s) dans ce fichier')
}
function jump(direction){
 const id=docs0()[idx()]?.id||'active',set=[...(marks.get(id)||[])].sort((a,b)=>a-b);if(!set.length)return status('Aucun signet');
 const current=line(),goal=direction>0?set.find(x=>x>current)||set[0]:set.slice().reverse().find(x=>x<current)||set[set.length-1];
 let pos=0;for(const text of area.value.split('\n').slice(0,goal-1))pos+=text.length+1;
 area.focus();area.setSelectionRange(pos,pos);status('Signet ligne '+goal)
}
for(const existing of original)drop.append(existing);
button(drop,'Rechercher précédent · Maj+F3',()=>next(-1));
button(drop,'Rechercher avec options (regex, casse, mot entier)…',dialog);
button(drop,'Rechercher dans tous les fichiers ouverts…',()=>{
 const dlg=d.createElement('dialog');dlg.style.cssText='width:min(850px,95vw);max-height:83vh;overflow:auto;background:#fff;color:#1a2940;padding:15px';
 const list=d.createElement('div');list.style.cssText='overflow:auto;max-height:65vh';dlg.append(list);allTabs(list);
 button(dlg,'Fermer',()=>{dlg.close();dlg.remove()});d.body.append(dlg);dlg.showModal()
});
button(drop,'Marquer / enlever un signet · Ctrl+M',mark);
button(drop,'Signet suivant · F2',()=>jump(1));
button(drop,'Signet précédent · Maj+F2',()=>jump(-1));
button(drop,'Effacer les signets',()=>{marks.delete(docs0()[idx()]?.id||'active');status('Signets effacés')});
d.addEventListener('keydown',e=>{
 if(e.key==='F3'){e.preventDefault();e.stopImmediatePropagation();next(e.shiftKey?-1:1)}
 if(e.key==='F2'){e.preventDefault();jump(e.shiftKey?-1:1)}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='m'){e.preventDefault();mark()}
},true);
window.CMDPAD_SEARCH_MENU_READY=true;
})();