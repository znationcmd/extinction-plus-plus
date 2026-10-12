/* CMDPad++ WebTools. Browser-only actions: never upload local file contents. */
(function(){
'use strict';
const d=document,el=id=>d.getElementById(id),area=el('area'),filename=el('fileName'),picker=el('openInput'),tabs=el('tabs'),toolbar=d.querySelector('.toolbar'),workspace=d.querySelector('.workspace');
if(!area||!filename||!picker||!tabs||!toolbar)return;
const core=typeof docs!=='undefined'&&Array.isArray(docs)?docs:null;
let index=()=>typeof activeDoc==='number'?activeDoc:0;
const panelFiles=new Map(),handles=new Map(),undoMap=new Map();let pendingReport=null,changedValue=null,changedName='',busy=false;
const $status=(s,bad=false)=>{const e=el('status');if(e){e.textContent=s;e.style.color=bad?'#b42330':'#16733c'}};
const list=(window.CMDPAD_FORMATS||[]).flatMap(([group,rows])=>rows.split(';').map(row=>{const [ext,label,tech]=row.trim().split('=');return {group,ext,label,tech}}).filter(x=>x.ext));
const formats=new Map(list.map(x=>[x.ext,x]));
const textKinds=new Set('txt rtf tex csv tsv sql srt vtt ass svg html htm css js ts jsx tsx py java c cpp h cs go rs swift bat cmd sh cue json jsonc xml yaml yml ini cfg conf log env toml php lua ps1 md markdown scss less rb dart kt kts properties'.split(' '));
const imageKinds=new Set('jpg jpeg png gif webp heic heif bmp tiff tif svgz ico cur'.split(' '));
const audioKinds=new Set('mp3 wav flac m4a wma ogg opus aac aif aiff mid midi amr ape'.split(' '));
const videoKinds=new Set('mp4 mkv mov avi wmv flv webm m2ts mts vob ogv 3gp'.split(' '));
function extension(s){s=String(s||'').toLowerCase();if(s.endsWith('.tar.gz'))return 'tar.gz';if(s.endsWith('.tar.bz2'))return 'tar.bz2';return s.includes('.')?s.split('.').pop():''}
function info(s){const x=extension(s);return formats.get(x)||{ext:x,label:'Extension inconnue',tech:'Structure non identifiée',group:'Autres'}}
function kindFor(name){const e=extension(name);return textKinds.has(e)?'text':imageKinds.has(e)?'image':audioKinds.has(e)?'audio':videoKinds.has(e)?'video':e==='pdf'?'pdf':'binary'}
function active(){return core?.[index()]||null}
function state(){const x=active();return x?.id==null?null:panelFiles.get(x.id)||null}
function persist(){try{if(typeof saveWorkspace==='function')saveWorkspace()}catch{}}
function statusFor(x){const r=state();return r?.kind||kindFor(x?.name||'')}
function ensureHistory(x){if(!x)return null;if(!undoMap.has(x.id))undoMap.set(x.id,{past:[String(x.text||'')],future:[]});return undoMap.get(x.id)}
function capture(){const x=active();if(!x||busy)return;const h=ensureHistory(x),v=area.value;if(statusFor(x)!=='text')return;x.text=v;if(h.past[h.past.length-1]!==v){h.past.push(v);if(h.past.length>180)h.past.shift();h.future.length=0;x.dirty=true}}
function renderHistory(){for(const b of d.querySelectorAll('#tabs .tab')){const i=Number(b.dataset.index);const x=core?.[i];if(!x)continue;const title=b.querySelector('.tab-name');if(title)title.textContent=(x.dirty?'● ':'')+x.name}}
function ensureTabs(){tabs.style.setProperty('display','flex','important');tabs.style.setProperty('visibility','visible','important');tabs.style.setProperty('min-height','31px','important');tabs.style.setProperty('flex-shrink','0','important');renderHistory()}
function updateSidebar(){let section=el('cmdpadWebFiles');const side=d.querySelector('.side-body')||d.querySelector('.side');if(!side)return;if(!section){section=d.createElement('section');section.id='cmdpadWebFiles';section.style.cssText='padding:9px;border-top:1px solid #aaa;overflow:auto;max-height:35vh';side.append(section)}
section.replaceChildren();const heading=d.createElement('strong');heading.textContent='📑 Fichiers ouverts ('+(core?.length||0)+')';section.append(heading);
(core||[]).forEach((x,i)=>{const b=d.createElement('button');b.type='button';b.textContent=(x.dirty?'● ':'')+x.name;b.title=x.name;b.style.cssText='display:block;width:100%;margin:2px 0;padding:6px 4px;text-align:left;border:0;background:'+(i===index()?'#daeaff':'transparent')+';cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';b.onclick=()=>{if(typeof switchTab==='function')switchTab(i);syncPanels()};section.append(b)})}
function magic(bytes){const starts=vals=>vals.every((v,i)=>bytes[i]===v),str=(a,b)=>String.fromCharCode(...bytes.slice(a,b));let detected='non reconnu',family='';
if(starts([0x25,0x50,0x44,0x46])){detected='PDF';family='pdf'}
else if(starts([137,80,78,71,13,10,26,10])){detected='PNG';family='png'}
else if(starts([0xff,0xd8,0xff])){detected='JPEG';family='jpeg'}
else if(str(0,3)==='GIF'){detected='GIF';family='gif'}
else if(str(0,4)==='RIFF'){const t=str(8,12);detected='RIFF/'+t;family=t==='WAVE'?'wav':t==='WEBP'?'webp':t==='AVI '?'avi':'riff'}
else if(str(0,4)==='OggS'){detected='OGG';family='ogg'}
else if(str(0,4)==='fLaC'){detected='FLAC';family='flac'}
else if(str(0,3)==='ID3'||starts([255,251])){detected='MP3';family='mp3'}
else if(str(4,8)==='ftyp'){const t=str(8,12);detected='ISO BMFF/'+t;family=t.includes('heic')||t.includes('heix')?'heic':'mp4'}
else if(starts([80,75,3,4])||starts([80,75,5,6])){detected='ZIP';family='zip'}
else if(starts([31,139])){detected='GZIP';family='gz'}
else if(starts([55,122,188,175,39,28])){detected='7Z';family='7z'}
else if(str(0,7)==='Rar!\x1a\x07\x00'||str(0,7)==='Rar!\x1a\x07\x01'){detected='RAR';family='rar'}
else if(str(0,16)==='SQLite format 3\x00'){detected='SQLite';family='sqlite'}
else if(str(0,2)==='MZ'){detected='Windows PE/DOS';family='exe'}
else if(str(0,2)==='BM'){detected='BMP';family='bmp'}
else if(str(0,5)==='<?xml'){detected='XML';family='xml'}
else if(str(0,4)==='\x7fELF'){detected='ELF';family='elf'}
return {detected,family,head:[...bytes.slice(0,64)].map(v=>v.toString(16).padStart(2,'0')).join(' ')}}
const expected={
jpeg:'jpg jpeg',png:'png',gif:'gif',webp:'webp',wav:'wav',avi:'avi',flac:'flac',ogg:'ogg opus ogv',mp3:'mp3',mp4:'mp4 mov m4a 3gp',heic:'heic heif',zip:'zip docx docm dotx xlsx xlsm pptx pptm ppsx odt ods odp epub apk pages numbers key',gz:'gz tar.gz tgz svgz',sqlite:'sqlite db',exe:'exe dll sys drv',pdf:'pdf ai',rar:'rar', '7z':'7z',bmp:'bmp',xml:'xml svg',elf:'elf'
};
async function inspect(file){const first=new Uint8Array(await file.slice(0,256).arrayBuffer());return {...magic(first),size:file.size,mime:file.type||'non renseigné'}}
const preview=d.createElement('div');preview.id='cmdpadBinaryPreview';preview.style.cssText='display:none;position:absolute;inset:0;z-index:35;overflow:auto;padding:16px;background:#f7f9ff;color:#1b2a3b';
const shell=d.querySelector('.editor-shell')||area.parentElement;if(shell){shell.style.position='relative';shell.append(preview)}
function previewActive(){preview.replaceChildren();const x=active(),meta=state();if(!meta||meta.kind==='text'){preview.style.display='none';return}preview.style.display='block';
const title=d.createElement('h3');title.textContent=x.name;preview.append(title);
const p=d.createElement('p');p.textContent=info(x.name).group+' | '+info(x.name).tech+' | Signature : '+meta.sign.detected;preview.append(p);
const warn=d.createElement('p');warn.textContent='Aperçu/inspection uniquement. CMDPad++ ne modifie pas ce fichier binaire dans son format natif.';preview.append(warn);
if(meta.file&&['image','audio','video','pdf'].includes(meta.kind)){const url=URL.createObjectURL(meta.file);meta.url&&URL.revokeObjectURL(meta.url);meta.url=url;let view;
if(meta.kind==='image'){view=d.createElement('img');view.alt=x.name;view.style.cssText='max-width:100%;max-height:65vh'}
else if(meta.kind==='audio'){view=d.createElement('audio');view.controls=true;view.style.width='90%'}
else if(meta.kind==='video'){view=d.createElement('video');view.controls=true;view.style.cssText='max-width:100%;max-height:65vh'}
else{view=d.createElement('iframe');view.title=x.name;view.style.cssText='width:100%;height:65vh;border:1px solid #ccc'}
view.src=url;view.addEventListener('error',()=> $status('Aperçu indisponible : codec ou format non pris en charge',true));preview.append(view)}
else{const pre=d.createElement('pre');pre.style.whiteSpace='pre-wrap';pre.textContent='En-tête : '+meta.sign.head;preview.append(pre)}
const btn=d.createElement('button');btn.textContent='Fiche complète du format';btn.onclick=()=>catalog(extension(x.name));preview.append(btn)}
function syncPanels(){ensureTabs();updateSidebar();previewActive();renderHistory()}
function pushFile(name,text,blob,kind,sign){if(!core)return;const x={id:Date.now()+Math.random(),name,type:'AUTO',text,dirty:false};core.push(x);if(kind!=='text')panelFiles.set(x.id,{kind,file:blob,sign});else panelFiles.set(x.id,{kind,sign});ensureHistory(x);return x}
async function openFiles(files){if(!core){$status('Impossible d’accéder au gestionnaire des documents',true);return}let imported=0;
for(const f of [...files].slice(0,100)){try{if(f.size>150*1024*1024)throw Error('Limite 150 Mo par fichier');const kind=kindFor(f.name),sign=await inspect(f);
let content='';if(kind==='text'){if(f.size>8*1024*1024)throw Error('Texte de plus de 8 Mo');content=await f.text();if(content.includes(String.fromCharCode(0)))throw Error('Contenu binaire, extension texte incorrecte')}
pushFile(f.name,content,f,kind,sign);imported++}catch(e){$status(f.name+' : '+e.message,true)}}
if(imported){loadDoc(core.length-1);syncPanels();$status(imported+' fichier(s) importé(s) dans '+imported+' onglet(s)')}}
function closeAll(){if(!core)return;if(core.some(x=>x.dirty)&&!confirm('Fermer les documents modifiés sans enregistrer ?'))return;for(const o of panelFiles.values())if(o.url)URL.revokeObjectURL(o.url);panelFiles.clear();core.splice(0,core.length,{id:Date.now(),name:'nouveau.txt',type:'AUTO',text:''});loadDoc(0);syncPanels()}
function saveLocal(name,value){const a=d.createElement('a'),url=URL.createObjectURL(new Blob([value],{type:'text/plain;charset=utf-8'}));a.href=url;a.download=name;d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function saveDocument(as=false,i=index()){const x=core?.[i];if(!x)return;capture();if(state()?.kind!=='text'&&panelFiles.has(x.id))return $status('Fichier binaire : utilise son logiciel natif pour le modifier',true);
try{let handle=!as?handles.get(x.id):null;
if(!handle&&window.showSaveFilePicker){handle=await window.showSaveFilePicker({suggestedName:x.name});handles.set(x.id,handle)}
if(handle){const out=await handle.createWritable();await out.write(x.text);await out.close();x.name=handle.name||x.name}
else saveLocal(x.name,x.text);x.dirty=false;renderHistory();$status('Enregistré : '+x.name)}
catch(e){$status(e.name==='AbortError'?'Enregistrement annulé':('Échec : '+e.message),true)}}
async function saveAll(){capture();if(!core)return;const textFiles=core.filter(x=>(panelFiles.get(x.id)?.kind||'text')==='text');if(!textFiles.length)return;
if(window.showDirectoryPicker){try{const dir=await window.showDirectoryPicker({mode:'readwrite'});if(!confirm('Enregistrer '+textFiles.length+' fichier(s) dans ce dossier ? Les fichiers du même nom seront remplacés.'))return;for(const file of textFiles){const safe=file.name.replace(/[\\/:*?"<>|]/g,'_');const h=await dir.getFileHandle(safe,{create:true}),w=await h.createWritable();await w.write(file.text);await w.close();file.dirty=false}$status(textFiles.length+' fichiers enregistrés');renderHistory();return}catch(e){if(e.name==='AbortError')return}}
if(!confirm('Télécharger '+textFiles.length+' fichiers séparément ? Ton navigateur peut demander une autorisation.'))return;for(const file of textFiles)saveLocal(file.name,file.text);$status('Téléchargements demandés au navigateur')}
function undo(redo=false){const x=active();if(!x||statusFor(x)!=='text')return;capture();const h=ensureHistory(x);let value;if(redo){value=h.future.pop();if(value===undefined)return $status('Rien à rétablir');h.past.push(value)}else{if(h.past.length<2)return $status('Rien à annuler');h.future.push(h.past.pop());value=h.past.at(-1)}
busy=true;area.value=value;x.text=value;busy=false;x.dirty=true;if(typeof updateLines==='function')updateLines(true);renderHistory();area.focus();$status(redo?'Modification rétablie':'Modification annulée')}
const modal=d.createElement('dialog');modal.id='cmdpadValidationDialog';modal.style.cssText='width:min(900px,96vw);max-height:88vh;overflow:auto;border:1px solid #8191aa;border-radius:9px;padding:16px;background:#fff;color:#1c2940';
modal.innerHTML='<div style="display:flex;gap:10px;align-items:center"><strong id="cmdpadModalTitle" style="flex:1">CMDPad++</strong><button type="button" id="cmdpadModalClose">✕ Fermer</button></div><p id="cmdpadModalIntro"></p><div id="cmdpadModalContent" style="max-height:62vh;overflow:auto"></div><div id="cmdpadModalActions" style="display:flex;flex-wrap:wrap;gap:8px;padding-top:12px"></div>';
d.body.append(modal);el('cmdpadModalClose').onclick=()=>modal.close();
const title=t=>{el('cmdpadModalTitle').textContent=t;el('cmdpadModalContent').replaceChildren();el('cmdpadModalActions').replaceChildren();el('cmdpadModalIntro').textContent='';if(!modal.open)modal.showModal()};
const addButton=(name,callback)=>{const b=d.createElement('button');b.textContent=name;b.style.cssText='padding:8px 12px;border:1px solid #8fa2bf;border-radius:5px;cursor:pointer;background:#f2f6ff';b.onclick=callback;el('cmdpadModalActions').append(b)};
const addText=(value,label)=>{const p=d.createElement('p');if(label){const b=d.createElement('strong');b.textContent=label+' : ';p.append(b)}p.append(d.createTextNode(String(value)));el('cmdpadModalContent').append(p)};
function catalog(filter=''){title('Fiches techniques — '+list.length+' formats');el('cmdpadModalIntro').textContent='Détection par extension et, si un fichier est ouvert, par signature. Une fiche n’implique pas une édition native.';
const input=d.createElement('input');input.value=filter;input.placeholder='Rechercher une extension, catégorie ou technologie';input.style.cssText='padding:10px;width:100%;border:1px solid #aaa';el('cmdpadModalContent').append(input);
const rows=d.createElement('div');el('cmdpadModalContent').append(rows);function render(){rows.replaceChildren();const q=input.value.toLowerCase().replace(/^\./,'');let count=0;for(const r of list){if(q&&![r.ext,r.label,r.tech,r.group].join(' ').toLowerCase().includes(q))continue;const card=d.createElement('div');card.style.cssText='padding:8px 3px;border-bottom:1px solid #d8dfea';const kind=kindFor('f.'+r.ext);card.textContent='.'+r.ext+' — '+r.label+' | '+r.tech+' | '+r.group+' | '+(kind==='text'?'Édition texte/code':kind==='binary'?'Inspection binaire':'Aperçu dépendant du navigateur');rows.append(card);if(++count>=230)break}if(!count)rows.textContent='Aucun format trouvé'}input.oninput=render;render();
addButton('Fermer',()=>modal.close())}
const issue=(severity,message,line=null,column=null)=>({severity,message,line,column});
function parseCsv(s,delimiter){let inQuotes=false,cols=1,row=1,rows=[],col=1,issues=[];for(let i=0;i<s.length;i++){let c=s[i];if(c==='"'){if(inQuotes&&s[i+1]==='"')i++;else inQuotes=!inQuotes}
else if(c===delimiter&&!inQuotes)cols++;
else if((c==='\n'||c==='\r'&&s[i+1]!=='\n')&&!inQuotes){rows.push(cols);cols=1;row++;col=1}else col++}rows.push(cols);
if(inQuotes)issues.push(issue('erreur','Guillemet CSV non refermé',row,col));const expected=rows[0];rows.forEach((n,i)=>{if(n!==expected&&!(i===rows.length-1&&s.endsWith('\n')))issues.push(issue('erreur',n+' colonnes au lieu de '+expected,i+1,1))});return issues}
function posError(s,msg){const m=String(msg).match(/position\s+(\d+)/i);if(!m)return {line:null,column:null};const before=s.slice(0,Number(m[1])),lines=before.split('\n');return {line:lines.length,column:lines.at(-1).length+1}}
function validateText(text,e){const issues=[],notes=[];let level='partiel';
try{if(e==='json'){JSON.parse(text);level='vérifié';notes.push('Syntaxe JSON valide (RFC 8259).')}
else if(e==='xml'||e==='svg'){const p=new DOMParser().parseFromString(text,'application/xml'),error=p.querySelector('parsererror');if(error)issues.push(issue('erreur',error.textContent.slice(0,360)));else{level='vérifié';notes.push('XML bien formé. Validation XSD non effectuée sans schéma fourni.')}} 
else if(e==='csv'||e==='tsv'){issues.push(...parseCsv(text,e==='tsv'?'\t':','));level='partiel';notes.push('Vérification des guillemets et du nombre de colonnes, pas de schéma de données.')}
else if(e==='ini'||e==='cfg'||e==='conf'){let section='',seen=new Set();text.split(/\r?\n/).forEach((raw,i)=>{const v=raw.trim();if(!v||v.startsWith(';')||v.startsWith('#'))return;if(/^\[[^\]]+\]$/.test(v)){section=v.slice(1,-1);seen=new Set();return}const match=v.match(/^([^=]+)=(.*)$/);if(!match){issues.push(issue('erreur','Clé sans signe = ou section invalide',i+1,1));return}const key=match[1].trim().toLowerCase();if(seen.has(key))issues.push(issue('avertissement','Clé dupliquée ['+section+'] : '+key,i+1,1));seen.add(key)});notes.push('Vérification INI heuristique.')}
else if(e==='vtt'){if(!/^\uFEFF?WEBVTT/.test(text))issues.push(issue('erreur','En-tête WEBVTT absent',1,1));notes.push('Contrôle de l’en-tête et non de tous les temps.')}
else if(e==='js'){if(/\b(?:import|export)\b/.test(text)){notes.push('Module JavaScript : contrôle de syntaxe complet non disponible dans cet éditeur.')}else{try{new Function(text);level='vérifié';notes.push('Syntaxe JavaScript classique compilable, sans exécution.')}catch(err){issues.push(issue('erreur',err.message))}}}
else if(e==='html'||e==='htm'){new DOMParser().parseFromString(text,'text/html');notes.push('Le parseur HTML tolérant a lu le texte, sans garantie de conformité W3C.')}
else notes.push('Aucun validateur de norme officiel installé pour .'+e+'. Inspection de texte uniquement.')}
catch(err){const where=posError(text,err.message);issues.push(issue('erreur',err.message,where.line,where.column))}
return {issues,notes,level}}
async function validateNow(show=true){capture();const x=active(),meta=state(),e=extension(x.name),f=info(x.name),kind=statusFor(x);const errors=[],notes=[];let level='partiel',sign=meta?.sign||{detected:'non mesuré',family:'',size:(x.text||'').length};
if(meta?.file){sign=meta.sign;const expectedTypes=expected[sign.family]?.split(' ')||[];
if(expectedTypes.length&&e&&!expectedTypes.includes(e))errors.push(issue('avertissement','Extension .'+e+' incompatible avec la signature '+sign.detected));}
if(kind==='text'){const r=validateText(area.value,e);errors.push(...r.issues);notes.push(...r.notes);level=r.level}
else{notes.push('Inspection d’en-tête uniquement : le décodage complet, les CRC, le schéma et la conformité du contenu ne sont pas vérifiés.');if(sign.detected==='non reconnu')errors.push(issue('avertissement','Signature binaire non reconnue'))}
const report={name:x.name,extension:e,format:f.label,category:f.group,technology:f.tech,mime:sign.mime||'non renseigné',size:sign.size,signature:sign.detected,result:errors.some(x=>x.severity==='erreur')?'NON VALIDE':level==='vérifié'?'VALIDE (contrôle ciblé)':'ANALYSE PARTIELLE',issues:errors,notes,timestamp:new Date().toISOString()};
pendingReport=report;
if(show){title('Validateur universel — '+x.name);el('cmdpadModalIntro').textContent=report.result+' | '+report.technology+' | '+report.signature;
if(!errors.length)addText('Aucune erreur relevée dans les contrôles effectués. Cela ne garantit pas la conformité universelle.');
for(const er of errors)addText((er.line?'Ligne '+er.line+(er.column?', colonne '+er.column:'')+' — ':'')+er.message,er.severity.toUpperCase());
for(const n of notes)addText(n,'Limite / norme');addButton('Télécharger le rapport JSON',()=>saveLocal(x.name+'.validation.json',JSON.stringify(report,null,2)));addButton('Fiche format',()=>catalog(e));addButton('Fermer',()=>modal.close())}
return report}
function fixJsonC(s){let result='',quote=false,escape=false,line=false,block=false;for(let i=0;i<s.length;i++){const c=s[i],next=s[i+1];if(line){if(c==='\n'){line=false;result+='\n'}continue}if(block){if(c==='*'&&next==='/'){i++;block=false}continue}
if(quote){result+=c;if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quote=false;continue}
if(c==='"'){quote=true;result+=c;continue}if(c==='/'&&next==='/'){line=true;i++;continue}if(c==='/'&&next==='*'){block=true;i++;continue}result+=c}
let out='',inString=false,esc=false;for(let i=0;i<result.length;i++){const c=result[i];if(inString){out+=c;if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')inString=false;continue}if(c==='"'){inString=true;out+=c;continue}if(c===','){let j=i+1;while(/\s/.test(result[j]||'')&&j<result.length)j++;if(result[j]===']'||result[j]==='}')continue}out+=c}return out}
function proposedCorrection(){capture();const x=active(),e=extension(x.name);if(statusFor(x)!=='text')return {reason:'Format binaire : aucune correction sans décodeur/encodeur natif.'};
const original=area.value;let output=original,reason='';if(e==='json'||e==='jsonc'){try{output=JSON.stringify(JSON.parse(original),null,2);reason='Formatage JSON valide.'}catch{try{output=JSON.stringify(JSON.parse(fixJsonC(original)),null,2);reason='Suppression contrôlée des commentaires et virgules finales JSON.'}catch(err){return {reason:'JSON non réparable automatiquement : '+err.message}}}}
else if(e==='xml'||e==='svg'){const parsed=new DOMParser().parseFromString(original,'application/xml');if(parsed.querySelector('parsererror'))return {reason:'XML mal formé : aucune fermeture de balise inventée sans schéma.'};output=new XMLSerializer().serializeToString(parsed);reason='Normalisation XML sans validation XSD.'}
else if(['txt','ini','cfg','conf','log','csv','tsv','srt','vtt','md','markdown'].includes(e)){output=original.replace(/\r\n?/g,'\n');reason='Uniformisation des fins de ligne (LF).'}
else return {reason:'Correcteur automatique indisponible pour .'+e+' ; ne pas réécrire un langage sans analyseur spécialisé.'};
if(output===original)return {reason:'Aucune modification nécessaire selon les règles sûres disponibles.'};
return {original,output,reason}}
async function correctNow(){const report=await validateNow(false),fix=proposedCorrection(),x=active();
title('Correcteur universel — '+x.name);el('cmdpadModalIntro').textContent='Aucune modification n’est appliquée sans confirmation. Rapport initial : '+report.result;
if(!fix.output){addText(fix.reason,'Non modifié');addButton('Voir le rapport',()=>validateNow(true));return}
changedValue=fix.output;changedName=x.name;addText(fix.reason,'Modification proposée');
const desc=d.createElement('div');desc.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px';for(const [caption,content] of [['Original',fix.original],['Proposition',fix.output]]){const box=d.createElement('div');const strong=d.createElement('strong');strong.textContent=caption;const ta=d.createElement('textarea');ta.readOnly=true;ta.value=content;ta.style.cssText='width:100%;height:210px;font:12px monospace';box.append(strong,ta);desc.append(box)}el('cmdpadModalContent').append(desc);
addButton('Créer une copie corrigée',()=>{if(!core)return;core.push({id:Date.now()+Math.random(),name:'corrige-'+changedName,type:'AUTO',text:changedValue});loadDoc(core.length-1);syncPanels();modal.close();$status('Copie corrigée créée, original conservé')});
addButton('Appliquer au document actif',()=>{if(!confirm('Modifier le document actif ? L’original reste disponible par réimportation ou copie de sauvegarde.'))return;area.value=changedValue;area.dispatchEvent(new Event('input',{bubbles:true}));modal.close();$status('Correction appliquée après confirmation')});
addButton('Annuler',()=>modal.close())}
function menuTools(){const bar=d.querySelector('.menubar');if(!bar)return;const menu=d.createElement('div');menu.className='menu';menu.innerHTML='<button type="button">Analyse</button><div class="dropdown"><button data-cmdpad="validate">Valider universel</button><button data-cmdpad="correct">Corriger universel</button><button data-cmdpad="formats">Fiches des formats</button><button data-cmdpad="saveall">Enregistrer tous les fichiers</button></div>';bar.append(menu);
menu.firstElementChild.onclick=e=>{e.stopPropagation();menu.classList.toggle('open');const r=e.target.getBoundingClientRect(),drop=menu.querySelector('.dropdown');drop.style.left=Math.max(4,Math.min(innerWidth-230,r.left))+'px';drop.style.top=r.bottom+'px'};
menu.querySelector('[data-cmdpad="validate"]').onclick=()=>validateNow(true);menu.querySelector('[data-cmdpad="correct"]').onclick=correctNow;menu.querySelector('[data-cmdpad="formats"]').onclick=()=>catalog(extension(active()?.name));menu.querySelector('[data-cmdpad="saveall"]').onclick=saveAll}
menuTools();
const addon=d.createElement('span');addon.style.cssText='display:inline-flex;gap:3px;flex-shrink:0';toolbar.insertBefore(addon,toolbar.querySelector('.actions'));
function tool(text,label,fn){const b=d.createElement('button');b.type='button';b.className='toolbtn';b.title=label;b.textContent=text;b.onclick=fn;addon.append(b)}
tool('✔ Universel','Valider le document sans le modifier',()=>validateNow(true));tool('🛠 Corriger','Proposer des réparations avec confirmation',correctNow);tool('📚 Formats','Fiches techniques des extensions',()=>catalog(extension(active()?.name)));tool('💾 Tous','Enregistrer tous les documents',saveAll);
tool('◀','Onglet précédent',()=>{if(core?.length){switchTab((index()+core.length-1)%core.length);syncPanels()}});
tool('▶','Onglet suivant',()=>{if(core?.length){switchTab((index()+1)%core.length);syncPanels()}});
tool('📂 Dossier','Importer des fichiers d’un dossier',()=>{const f=d.createElement('input');f.type='file';f.multiple=true;f.webkitdirectory=true;f.onchange=()=>openFiles(f.files);f.click()});
d.addEventListener('click',e=>{const button=e.target.closest?.('button'),action=button?.dataset?.action,id=button?.id;let fn=null;
if(id==='validateBtn'||action==='validate')fn=()=>validateNow(true);
else if(id==='saveBtn'||action==='save')fn=()=>saveDocument();
else if(action==='undo')fn=()=>undo(false);
else if(action==='redo')fn=()=>undo(true);
if(fn){e.preventDefault();e.stopImmediatePropagation();fn()}
},true);
picker.addEventListener('change',e=>{e.stopImmediatePropagation();const chosen=[...(picker.files||[])];picker.value='';openFiles(chosen)},true);
d.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;const k=e.key.toLowerCase();let fn=null;
if(k==='s')fn=e.shiftKey?saveAll:()=>saveDocument();else if(k==='z'&&d.activeElement===area)fn=()=>undo(e.shiftKey);else if(k==='y'&&d.activeElement===area)fn=()=>undo(true);
else if(k==='tab'&&core?.length>1)fn=()=>{switchTab((index()+core.length+(e.shiftKey?-1:1))%core.length);syncPanels()};
if(fn){e.preventDefault();e.stopImmediatePropagation();fn()}},true);
area.addEventListener('input',()=>{capture();renderHistory();updateSidebar()},true);
d.addEventListener('click',e=>{if(e.target.closest?.('#tabs'))setTimeout(syncPanels,0)});
d.addEventListener('drop',e=>{if(e.dataTransfer?.files?.length){e.preventDefault();e.stopImmediatePropagation();openFiles(e.dataTransfer.files)}},true);
d.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault()},true);
window.CMDPAD_WEBTOOLS_READY=true;syncPanels();$status('CMDPad++ : outils de fichiers, validateur et correcteur chargés');
})();