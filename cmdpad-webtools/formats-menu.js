/* CMDPad++ — Formats: full searchable registry and conservative automatic detection.
   No file is executed or uploaded; format recognition is not format editing. */
(function(){
'use strict';
const d=document,bar=d.querySelector('.menubar'),fileName=d.getElementById('fileName'),type=d.getElementById('type'),area=d.getElementById('area');
if(!bar||!fileName||!type||!area)return;
const groups=window.CMDPAD_FORMATS||[],list=groups.flatMap(([group,raw])=>raw.split(';').map(row=>{
 const [ext,name,tech]=row.trim().split('=');return {group,ext,name,tech}
}).filter(x=>x.ext&&x.name));
const map=new Map();for(const record of list)if(!map.has(record.ext))map.set(record.ext,record);
const local=new Map(),visited=new Map();let currentInspection=null;
const ends=name=>{const s=String(name||'').toLowerCase();for(const special of ['tar.gz','tar.bz2'])if(s.endsWith('.'+special))return special;return s.includes('.')?s.split('.').pop():''};
const upper=bytes=>[...bytes].map(x=>String.fromCharCode(x)).join('');
const starts=(b,...sig)=>sig.every((s,i)=>b[i]===s);
const groupFor=x=>map.get(x)||{ext:x,name:'Format non référencé',tech:'Aucune technologie associée',group:'Autres'};
const typeFor=name=>{const f=ends(name),l=(window.CMDPAD_detectLanguage?.(name)||{});return l.name||((f||'TXT').toUpperCase())};
const compatible={
 pdf:'pdf',png:'png',jpeg:'jpg jpeg',gif:'gif',webp:'webp',sqlite:'sqlite db',ogg:'ogg opus ogv',flac:'flac',bmp:'bmp',elf:'elf so',pe:'exe dll sys drv',rar:'rar','7z':'7z',gz:'gz tgz tar.gz svgz',wav:'wav',avi:'avi',zip:'zip docx docm dotx xlsx xlsm pptx pptm ppsx odt ods odp epub apk jar war ear pages numbers key',mp4:'mp4 m4v mov 3gp m4a',heic:'heic heif avif',mp3:'mp3',xml:'xml svg xhtml',bzip:'bz2 tar.bz2',zstd:'zst zstd',xz:'xz',pcap:'pcap',pcapng:'pcapng',avro:'avro',parquet:'parquet'
};
function signature(b){
 const str=(i,len)=>upper(b.subarray(i,i+len));
 if(starts(b,37,80,68,70))return {family:'pdf',label:'PDF'};
 if(starts(b,137,80,78,71,13,10,26,10))return {family:'png',label:'PNG'};
 if(starts(b,255,216,255))return {family:'jpeg',label:'JPEG'};
 if(str(0,3)==='GIF')return {family:'gif',label:'GIF'};
 if(str(0,4)==='RIFF'){const part=str(8,4);return {family:part==='WAVE'?'wav':part==='WEBP'?'webp':part==='AVI '?'avi':'riff',label:'RIFF / '+part.trim()}}
 if(str(0,4)==='OggS')return {family:'ogg',label:'Ogg'};
 if(str(0,4)==='fLaC')return {family:'flac',label:'FLAC'};
 if(starts(b,31,139))return {family:'gz',label:'GZIP'};
 if(starts(b,66,90,104))return {family:'bzip',label:'BZIP2'};
 if(starts(b,253,55,122,88,90,0))return {family:'xz',label:'XZ'};
 if(starts(b,40,181,47,253))return {family:'zstd',label:'Zstandard'};
 if(starts(b,55,122,188,175,39,28))return {family:'7z',label:'7-Zip'};
 if(str(0,4)==='Rar!')return {family:'rar',label:'RAR'};
 if(starts(b,80,75,3,4)||starts(b,80,75,5,6)||starts(b,80,75,7,8))return {family:'zip',label:'ZIP (conteneur)'};
 if(str(0,16)==='SQLite format 3\x00')return {family:'sqlite',label:'SQLite'};
 if(starts(b,77,90))return {family:'pe',label:'Windows PE / DOS'};
 if(starts(b,127,69,76,70))return {family:'elf',label:'ELF'};
 if(str(0,4)==='PAR1')return {family:'parquet',label:'Apache Parquet'};
 if(starts(b,79,98,106,1))return {family:'avro',label:'Apache Avro'};
 if(starts(b,10,13,13,10))return {family:'pcapng',label:'PCAPNG'};
 if(starts(b,212,195,178,161)||starts(b,161,178,195,212)||starts(b,77,60,178,161)||starts(b,161,178,60,77))return {family:'pcap',label:'PCAP'};
 if(str(0,3)==='ID3'||starts(b,255,251)||starts(b,255,243)||starts(b,255,242))return {family:'mp3',label:'MP3'};
 if(str(4,4)==='ftyp'){const brand=str(8,4).toLowerCase();return /heic|heix|hevc|mif1|avif|avis/.test(brand)?{family:'heic',label:'HEIF / AVIF ISO BMFF'}:{family:'mp4',label:'ISO BMFF / '+brand}}
 if(b.length&&b[0]===0xef&&b[1]===0xbb&&b[2]===0xbf)return {family:'text',label:'Texte UTF-8 BOM'};
 if(b.length>=2&&((b[0]===0xff&&b[1]===0xfe)||(b[0]===0xfe&&b[1]===0xff)))return {family:'text',label:'Texte UTF-16 BOM'};
 return {family:'',label:'Signature non reconnue'};
}
async function analyze(file,knownText=''){
 const ext=ends(file.name),info=groupFor(ext);
 const buf=new Uint8Array(await file.slice(0,Math.min(file.size,512)).arrayBuffer());
 let result=signature(buf),detail='';
 if(result.family==='zip'){
  const tail=await file.slice(Math.max(0,file.size-131072)).arrayBuffer();
  const zipNames=new TextDecoder('latin1').decode(tail);
  const checks=[[/word\/document\.xml/,'docx','Microsoft Word OOXML'],[/xl\/workbook\.xml/,'xlsx','Microsoft Excel OOXML'],[/ppt\/presentation\.xml/,'pptx','Microsoft PowerPoint OOXML'],[/META-INF\/container\.xml/,'epub','EPUB'],[/AndroidManifest\.xml/,'apk','Application APK']];
  const found=checks.find(x=>x[0].test(zipNames));if(found){result={family:'zip',label:found[2]};detail='Contenu ZIP identifié';}
 }
 const declared=map.has(ext)?'.'+ext:'Extension inconnue';
 const accepted=(compatible[result.family]||'').split(' ').filter(Boolean);
 let confidence=result.family&&result.family!=='text'?accepted.length&&accepted.includes(ext)?'Signature compatible avec l’extension':result.family==='zip'?'Signature ZIP : extension interne non confirmée':'Signature et extension potentiellement différentes':'Identification par extension uniquement';
 if(result.family==='text')confidence='Texte Unicode identifié par BOM';
 if(!result.family){confidence='Identification par extension uniquement';const text=knownText||'';
  if(ext==='json'&&text.trim()){try{JSON.parse(text);confidence='Extension et syntaxe JSON vérifiées'}catch{confidence='Extension JSON reconnue, syntaxe à valider'}}
  if(ext==='xml'&&text.trim()&&typeof DOMParser!=='undefined'){try{const parsed=new DOMParser().parseFromString(text,'application/xml');if(!parsed.querySelector('parsererror'))confidence='Extension et structure XML vérifiées'}catch{}}
 }
 const infoText=declared+' · '+info.name+' · '+info.tech+' · '+result.label+' · '+confidence;
 return {name:file.name,ext,format:info,signature:result,confidence,detail,infoText};
}
const menuname='Formats';const existing=[...bar.querySelectorAll(':scope>.menu')].find(m=>m.querySelector(':scope>button')?.textContent.trim()===menuname);
const menu=existing||d.createElement('div');menu.className='menu cmd-formats-menu';
if(!existing){
 const button=d.createElement('button');button.type='button';button.textContent=menuname;menu.append(button);
 const dropdown=d.createElement('div');dropdown.className='dropdown cmd-format-dropdown';menu.append(dropdown);
 const anchor=[...bar.querySelectorAll(':scope>.menu')].find(m=>m.querySelector(':scope>button')?.textContent.trim()==='Langage');
 anchor?.insertAdjacentElement('afterend',menu)||bar.append(menu);
 button.addEventListener('click',e=>{e.stopPropagation();const was=menu.classList.contains('open');for(const m of bar.querySelectorAll(':scope>.menu'))m.classList.remove('open');
 if(was)return;menu.classList.add('open');const r=button.getBoundingClientRect();dropdown.style.left=Math.max(4,Math.min(r.left,innerWidth-270))+'px';dropdown.style.top=(r.bottom+1)+'px';});
}
const drop=menu.querySelector(':scope>.dropdown');
drop.addEventListener('click',e=>e.stopPropagation());
const title=d.createElement('strong');title.className='cmd-format-caption';title.textContent='Tous les formats · '+map.size+' extensions';drop.append(title);
const current=d.createElement('div');current.className='cmd-format-current';current.textContent='Détection automatique prête';drop.append(current);
const search=d.createElement('input');search.type='search';search.className='cmd-format-search';search.placeholder='Rechercher .json, PDF, image, vidéo…';drop.append(search);
const results=d.createElement('div');results.className='cmd-format-results';drop.append(results);
const hint=d.createElement('span');hint.className='cmd-format-hint';hint.textContent='Liste complète organisée par famille';drop.append(hint);
let dialog=null;
function details(record){
 if(!dialog){dialog=d.createElement('dialog');dialog.className='cmd-format-dialog';d.body.append(dialog)}
 dialog.replaceChildren();
 const h=d.createElement('h3');h.textContent='Format '+(record?.ext?'.'+record.ext:'inconnu');dialog.append(h);
 for(const [key,value] of [['Nom',record?.name],['Famille',record?.group],['Technologie',record?.tech],['Mode',modeFor(record?.ext)]]){const p=d.createElement('p');p.textContent=key+' : '+(value||'non renseigné');dialog.append(p)}
 const note=d.createElement('p');note.textContent='La présence d’un format dans le catalogue ne garantit ni son rendu, ni sa modification native.';dialog.append(note);
 const close=d.createElement('button');close.textContent='Fermer';close.onclick=()=>dialog.close();dialog.append(close);dialog.showModal();
}
function modeFor(ext){
 const e=ext||'';
 if((' txt json jsonc yaml yml xml xhtml html htm md tex sql py js ts jsx tsx c cpp h java cs go rs rb php css scss sass ini env properties csv tsv log conf sh bash bat cmd yar yara svg srt vtt ').includes(' '+e+' '))return 'Édition texte/code';
 if((' jpg jpeg png gif bmp svg webp heic bmp tiff ico avif ').includes(' '+e+' '))return 'Aperçu selon la prise en charge du navigateur';
 return 'Fiche technique et inspection ; édition native non garantie';
}
function render(){
 results.replaceChildren();const q=search.value.trim().replace(/^\./,'').toLocaleLowerCase('fr');
 if(q){const found=[...map.values()].filter(x=>[x.ext,x.name,x.tech,x.group].join(' ').toLocaleLowerCase('fr').includes(q)).sort((a,b)=>a.ext.localeCompare(b.ext,'fr',{numeric:true}));for(const item0 of found){const b=d.createElement('button');b.type='button';b.textContent='.'+item0.ext+' — '+item0.name;b.title=item0.tech;b.onclick=()=>details(item0);results.append(b)}if(!found.length)results.textContent='Aucun format correspondant';return}
 for(const [g,raw] of groups){
  const entries=raw.split(';').map(row=>{const [ext]=row.trim().split('=');return map.get(ext)}).filter(Boolean);
  const cat=d.createElement('details');cat.className='cmd-format-category';
  const label=d.createElement('summary');label.textContent=g+' ('+entries.length+')  ›';cat.append(label);
  const fly=d.createElement('div');fly.className='cmd-format-flyout';cat.append(fly);
  for(const item0 of entries){const b=d.createElement('button');b.type='button';b.textContent='.'+item0.ext+' — '+item0.name;b.title=item0.tech;b.onclick=e=>{e.stopPropagation();details(item0)};fly.append(b)}
  let timeout=0;
  const open=()=>{for(const other of results.querySelectorAll('details'))if(other!==cat){other.open=false;other.classList.remove('cmd-format-open')}
   cat.open=true;cat.classList.add('cmd-format-open');
   const rect=label.getBoundingClientRect(),parent=drop.getBoundingClientRect();fly.style.left=Math.round(parent.right+270>innerWidth?Math.max(3,parent.left-270):parent.right-1)+'px';fly.style.top=Math.round(Math.min(rect.top,innerHeight-95))+'px';fly.style.maxHeight=Math.max(180,innerHeight-Math.min(rect.top,innerHeight-95)-10)+'px';
  };
  label.addEventListener('pointerenter',ev=>{if(ev.pointerType!=='touch')open()});
  label.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();cat.classList.contains('cmd-format-open')?(cat.classList.remove('cmd-format-open'),cat.open=false):open()});
  cat.addEventListener('pointerleave',()=>{clearTimeout(timeout);timeout=setTimeout(()=>{cat.classList.remove('cmd-format-open');cat.open=false},240)});
  fly.addEventListener('pointerenter',()=>clearTimeout(timeout));
  results.append(cat);
 }
}
search.addEventListener('input',render);render();
const detect=d.createElement('button');detect.type='button';detect.textContent='🔎 Détecter le fichier actif';detect.title='Identification par extension et, si disponible, en-tête binaire';drop.insertBefore(detect,search);
const infoBadge=d.createElement('button');infoBadge.type='button';infoBadge.className='cmd-format-badge';infoBadge.title='Détails du format détecté';infoBadge.onclick=()=>details(currentInspection?.format||groupFor(ends(fileName.value)));
const docbar=d.querySelector('.docbar');if(docbar)docbar.append(infoBadge);
function currentId(){return typeof docs!=='undefined'&&typeof activeDoc!=='undefined'?docs[activeDoc]?.id:null}
function update(){
 const name=fileName.value,ext=ends(name),f=groupFor(ext);
 const found=currentId()&&local.get(currentId()),stored=found&&found.name===name?found:null;
 currentInspection=stored||{name,ext,format:f,signature:null,confidence:'Extension uniquement',infoText:'.'+(ext||'?')+' · '+f.name+' · Identification par extension'};
 const description=stored?stored.infoText:((ext?'.'+ext:'Sans extension')+' · '+f.name+' · Détection par extension');
 infoBadge.textContent='📄 '+(ext?'.'+ext.toUpperCase():'inconnu')+' ▾';
 infoBadge.title=description;
 current.textContent=description;
 if(type.value==='AUTO'){
  const status=d.getElementById('fileTypeStatus');if(status){status.textContent=ext?ext.toUpperCase():'TXT';status.title=description}
 }
}
window.CMDPAD_onFileInspected=async ({file,doc,content})=>{
 try{const report=await analyze(file,content);if(doc?.id)local.set(doc.id,report);visited.set(file.name,report);if(fileName.value===file.name){update()}}catch(e){console.warn('CMDPad++ detection:',e)}
};
detect.onclick=async()=>{
 menu.classList.remove('open');const ref=currentId(),previous=ref&&local.get(ref);
 if(previous){currentInspection=previous;update();return details(previous.format)}
 // A new file from disk can be inspected without adding/modifying any open document.
 const input=d.createElement('input');input.type='file';input.onchange=async()=>{
 const f=input.files?.[0];if(!f)return;
 try{const result=await analyze(f);currentInspection=result;if(currentId())local.set(currentId(),result);current.textContent=result.infoText;infoBadge.title=result.infoText;details(result.format)}catch(e){current.textContent='Échec de détection : '+e.message}
 };input.click();
};
fileName.addEventListener('input',update);type.addEventListener('change',update);
d.addEventListener('click',e=>{if(e.target.closest?.('#tabs,#cmdpadOpenList,#cmdpadWebFiles'))queueMicrotask(update)},true);
d.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Tab')queueMicrotask(update)},true);
new MutationObserver(()=>{if(fileName.value!==currentInspection?.name)update()}).observe(d.getElementById('tabs')||bar,{subtree:true,childList:true});
update();
window.CMDPAD_FORMATS_VISIBLE=true;window.CMDPAD_identifyFormat=analyze;
})();