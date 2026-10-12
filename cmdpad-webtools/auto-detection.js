/* CMDPad++ : détection automatique réelle, sans remplacer le sélecteur natif.
 * Recherche par signature si le fichier original est disponible, par extension et par contenu.
 * La reconnaissance des 800+ langages n'implique pas un moteur d'exécution/validation pour chacun.
 */
(function(){
'use strict';
const d=document,select=d.getElementById('type'),nameEl=d.getElementById('fileName'),area=d.getElementById('area');
if(!select||!nameEl||!area||window.CMDPAD_AUTO_DETECT_READY)return;
const all=window.CMDPAD_LANGUAGES||[];
const extMap=new Map(),nameMap=new Map();
for(const [source,raw] of all){
 for(const part of raw.split(';')){
  const [language,extensions='']=part.split('|');if(!language?.trim())continue;
  const key=language.trim(),code=key.toLocaleLowerCase('fr');
  if(!nameMap.has(code))nameMap.set(code,key);
  for(const original of extensions.split(',')){
   const ext=original.trim().replace(/^\./,'').toLowerCase();
   if(ext&&!extMap.has(ext))extMap.set(ext,{label:key,source});
  }
 }
}
const engineFromName=new Map(Object.entries({
 'python':'PYTHON','javascript':'JAVASCRIPT','typescript':'TYPESCRIPT','html':'HTML','css':'CSS','sql':'SQL',
 'yaml':'YAML','markdown':'MARKDOWN','shell':'SHELL','bash':'SHELL','powershell':'POWERSHELL',
 'java':'JAVA','c':'C','c++':'CPP','c#':'CSHARP','php':'PHP','go':'GO','rust':'RUST','lua':'LUA',
 'json':'JSON','xml':'XML','ini':'INI','txt':'TXT'
}));
const engineExt=Object.entries({
 PYTHON:'py pyw',JAVASCRIPT:'js cjs mjs jsx',TYPESCRIPT:'ts tsx mts cts',HTML:'html htm xhtml',CSS:'css scss sass less',
 SQL:'sql',YAML:'yaml yml',MARKDOWN:'md markdown mdx',SHELL:'sh bash zsh',POWERSHELL:'ps1 psm1',
 JAVA:'java',C:'c',CPP:'cpp cc cxx hpp hh',CSHARP:'cs',PHP:'php phtml',GO:'go',RUST:'rs',
 LUA:'lua',JSON:'json jsonc jsonl ndjson geojson',XML:'xml xsd xsl xslt svg',INI:'ini cfg',TXT:'txt log'
}).flatMap(([engine,extensions])=>extensions.split(' ').map(extension=>[extension,engine]));
const engineByExt=new Map(engineExt);
const signatureByFile=new Map();
const suffix=filename=>{const text=String(filename||'').toLowerCase().replace(/\\/g,'/').split('/').pop();return text?.includes('.')?text.slice(text.lastIndexOf('.')+1):''};
const preview=()=>area.value.slice(0,95000);
const activeId=()=>{try{return typeof currentDoc==='function'?currentDoc()?.id:null}catch{return null}};
const currentName=()=>nameEl.value||'';
function magic(bytes){
 if(!bytes?.length)return null;
 const start=(...bytes0)=>bytes0.every((x,i)=>bytes[i]===x);
 const ascii=(n,m)=>String.fromCharCode(...bytes.slice(n,n+m));
 if(start(37,80,68,70))return {label:'PDF',binary:true,ext:'pdf'};
 if(start(137,80,78,71,13,10,26,10))return {label:'PNG',binary:true,ext:'png'};
 if(start(255,216,255))return {label:'JPEG',binary:true,ext:'jpg'};
 if(ascii(0,3)==='GIF')return {label:'GIF',binary:true,ext:'gif'};
 if(ascii(0,4)==='RIFF'){const format=ascii(8,4);if(format==='WAVE')return {label:'WAV',binary:true,ext:'wav'};
  if(format==='WEBP')return {label:'WebP',binary:true,ext:'webp'};
  if(format==='AVI ')return {label:'AVI',binary:true,ext:'avi'}}
 if(ascii(0,4)==='OggS')return {label:'Ogg',binary:true,ext:'ogg'};
 if(ascii(0,4)==='fLaC')return {label:'FLAC',binary:true,ext:'flac'};
 if(start(31,139))return {label:'GZIP',binary:true,ext:'gz'};
 if(start(80,75,3,4)||start(80,75,5,6)||start(80,75,7,8))return {label:'ZIP / conteneur',binary:true,ext:'zip'};
 if(start(55,122,188,175,39,28))return {label:'7-Zip',binary:true,ext:'7z'};
 if(ascii(0,4)==='Rar!')return {label:'RAR',binary:true,ext:'rar'};
 if(ascii(0,16)==='SQLite format 3\x00')return {label:'SQLite',binary:true,ext:'sqlite'};
 if(start(127,69,76,70))return {label:'ELF',binary:true,ext:'elf'};
 if(start(77,90))return {label:'Exécutable Windows / PE',binary:true,ext:'exe'};
 if(start(0,97,115,109))return {label:'WebAssembly',binary:true,ext:'wasm'};
 if(start(10,13,13,10))return {label:'PCAPNG',binary:true,ext:'pcapng'};
 if(start(0xef,0xbb,0xbf))return {label:'Texte UTF-8 BOM',binary:false,bom:'UTF-8 BOM'};
 if(start(0xff,0xfe,0,0))return {label:'Texte UTF-32 LE',binary:false,bom:'UTF-32 LE'};
 if(start(0,0,0xfe,0xff))return {label:'Texte UTF-32 BE',binary:false,bom:'UTF-32 BE'};
 if(start(0xff,0xfe))return {label:'Texte UTF-16 LE',binary:false,bom:'UTF-16 LE'};
 if(start(0xfe,0xff))return {label:'Texte UTF-16 BE',binary:false,bom:'UTF-16 BE'};
 return null;
}
function contentType(text){
 if(!text||!text.trim())return null;
 const t=text.trimStart().slice(0,60000),lines=t.split(/\r?\n/);
 const shebang=t.match(/^#!\s*(?:\/usr\/bin\/env\s+)?(?:\/[\w/]+\/)?([\w.+-]+)/);
 if(shebang){
  const name=shebang[1].toLowerCase(),known={python:'PYTHON',python3:'PYTHON',node:'JAVASCRIPT',nodejs:'JAVASCRIPT',bash:'SHELL',sh:'SHELL',zsh:'SHELL',pwsh:'POWERSHELL',php:'PHP',lua:'LUA'};
  if(known[name])return {name:known[name]==='SHELL'?'Shell/Bash':name,engine:known[name],via:'interpréteur (shebang)',confidence:'élevée'};
 }
 if((t[0]==='{'||t[0]==='[')&&t.length<=60000){try{JSON.parse(t);return {name:'JSON',engine:'JSON',via:'syntaxe JSON vérifiée',confidence:'élevée'}}catch{}}
 if(/^<\?xml\b/i.test(t)){try{const xml=new DOMParser().parseFromString(t,'application/xml');if(!xml.querySelector('parsererror'))return {name:'XML',engine:'XML',via:'déclaration et structure XML',confidence:'élevée'}}catch{}}
 if(/^<!doctype\s+html\b|^<html(?:\s|>)/i.test(t))return {name:'HTML',engine:'HTML',via:'balise HTML',confidence:'élevée'};
 if(/^<svg(?:\s|>)/i.test(t))return {name:'SVG',engine:'XML',via:'balise SVG',confidence:'élevée'};
 if(/^#!.*(?:ruby|perl)\b/.test(t))return {name:'Script',engine:'TXT',via:'shebang',confidence:'probable'};
 if(lines.filter(line=>/^[\w.-]+\s*=\s*.+/.test(line)).length>=2&&/^\s*\[[^\]]+\]\s*$/m.test(t))return {name:'INI',engine:'INI',via:'sections et clés INI',confidence:'probable'};
 if(/^---\s*(?:\r?\n|$)/.test(t)&&lines.filter(line=>/^[\w.-]+\s*:\s+\S/.test(line)).length>=2)return {name:'YAML',engine:'YAML',via:'structure YAML probable',confidence:'probable'};
 if(/^(?:\s*(?:--[^\n]*\n)?)*(?:SELECT|INSERT\s+INTO|CREATE\s+TABLE|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i.test(t))return {name:'SQL',engine:'SQL',via:'instruction SQL',confidence:'probable'};
 if(/^\s*def\s+\w+\s*\([^)]*\)\s*:|^\s*class\s+\w+(?:\([^)]*\))?\s*:/m.test(t))return {name:'Python',engine:'PYTHON',via:'syntaxe Python probable',confidence:'probable'};
 if(/\b(?:export\s+default|import\s+.+\s+from\s+['"]|const\s+\w+\s*=|function\s+\w+\s*\()\b/.test(t))return {name:'JavaScript',engine:'JAVASCRIPT',via:'syntaxe JavaScript probable',confidence:'probable'};
 if(/^\s*#{1,6}\s+\S/m.test(t)&&t.split('\n').length>=2)return {name:'Markdown',engine:'MARKDOWN',via:'titres Markdown',confidence:'probable'};
 return null;
}
function identify({filename=currentName(),text=preview(),sig=null}={}){
 const extension=suffix(filename);
 const fromExtension=extMap.get(extension)||null,formatByExt=engineByExt.get(extension)||null;
 const signature=sig||null;
 if(signature?.binary){
  const conflict=!!extension&&signature.ext!==extension&&!(['jpg','jpeg'].includes(signature.ext)&&['jpg','jpeg'].includes(extension));
  return {label:signature.label,engine:null,via:'signature binaire',confidence:'élevée',conflict,extension,signature};
 }
 const c=contentType(text),extensionLabel=fromExtension?.label||null;
 if(c&&(!formatByExt||['txt','log','ini','cfg'].includes(extension))){return {label:c.name,engine:c.engine,via:c.via,confidence:c.confidence,extension,signature}}
 if(fromExtension){return {label:extensionLabel,engine:formatByExt||engineFromName.get(extensionLabel.toLowerCase())||null,via:'extension .'+extension,confidence:'probable',extension,signature}}
 if(c){return {label:c.name,engine:c.engine,via:c.via,confidence:c.confidence,extension,signature}}
 return {label:extension?extension.toUpperCase():'Texte brut',engine:formatByExt||'TXT',via:extension?'extension non identifiée':'contenu sans langage identifiable',confidence:'indéterminée',extension,signature}
}
let cached=null;
const initialAuto=select.querySelector('option[value="AUTO"]');if(!initialAuto)return;
function render(){
 const name=currentName(),sigEntry=signatureByFile.get(activeId())||null;
 const sig=sigEntry?.filename===name?sigEntry.signature:null;
 const result=identify({filename:name,sig});
 cached=result;
 const autoText='Détection auto'+(result.label&&result.label!=='Texte brut'?' · '+result.label:'');
 initialAuto.textContent=autoText;
 const desc='Détection automatique : '+result.label+' — '+result.via+' ('+result.confidence+')'+(result.conflict?' · ⚠ extension différente de la signature':'');
 initialAuto.title=desc;
 select.title=select.value==='AUTO'?desc:'Langage manuel : '+select.selectedOptions[0]?.textContent;
 if(select.value==='AUTO'){
  const badge=d.getElementById('fileTypeStatus');if(badge){badge.textContent=result.label;badge.title=desc}
 }
 window.CMDPAD_AUTO_RESULT=result;
 return result;
}
let timer=null;function schedule(){clearTimeout(timer);timer=setTimeout(render,110)}
nameEl.addEventListener('input',schedule);
area.addEventListener('input',schedule);
select.addEventListener('change',()=>{if(select.value==='AUTO'){try{d.getElementById('cmdpadLangAuto')?.click()}catch{}}schedule()});
const tabs=d.getElementById('tabs');if(tabs)new MutationObserver(schedule).observe(tabs,{childList:true,subtree:true});
const previous=window.CMDPAD_onFileInspected;
window.CMDPAD_onFileInspected=async function(payload){
 try{await previous?.(payload)}catch(e){console.warn('Format inspector:',e)}
 if(!payload?.file)return;
 try{
  const head=new Uint8Array(await payload.file.slice(0,32).arrayBuffer());
  const result=magic(head),docId=payload.doc?.id;
  if(docId!=null)signatureByFile.set(docId,{filename:payload.file.name,signature:result});
  if(currentName()===payload.file.name)schedule()
 }catch(e){console.warn('Auto-detection:',e)}
};
window.CMDPAD_autoDetectFile=async file=>magic(new Uint8Array(await file.slice(0,32).arrayBuffer()));
window.CMDPAD_detectAuto=identify;
window.CMDPAD_AUTO_DETECT_READY=true;
schedule();
})();