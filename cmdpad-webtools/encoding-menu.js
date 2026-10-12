/* CMDPad++ Encoding menu: single grouped entry, strict conversion of actual bytes. */
(function(){
'use strict';
const d=document,bar=d.querySelector('.menubar'),area=d.getElementById('area');
if(!bar||!area||typeof window.CMDPAD_encodeText!=='function')return;
const menu=[...bar.querySelectorAll(':scope>.menu')].find(x=>x.querySelector(':scope>button')?.textContent.trim()==='Encodage'),root=menu?.querySelector(':scope>.dropdown');
if(!root)return;
for(const b of [...root.querySelectorAll(':scope>button[data-action="encodingUtf8"],:scope>button[data-action="encodingBom"],:scope>button[data-adv="encoding"]')])b.remove();
const prev=root.querySelector('.cmd-encoding-menu-row');if(prev)prev.remove();
root.classList.add('cmd-encoding-root');
const state=t=>{const s=d.getElementById('status');if(s)s.textContent=t};
const families=[
 ['Unicode',['UTF-8|utf-8','UTF-8 avec BOM|utf-8-bom','UTF-16 LE|utf-16le','UTF-16 BE|utf-16be','UTF-32 LE|utf-32le','UTF-32 BE|utf-32be','UCS-2|ucs-2le','US-ASCII|us-ascii']],
 ['ISO-8859',['ISO-8859-1|iso-8859-1',...[2,3,4,5,6,7,8,9,10,11,13,14,15,16].map(i=>'ISO-8859-'+i+'|iso-8859-'+i)]],
 ['Windows / DOS / Macintosh',['Windows-1250|windows-1250','Windows-1251|windows-1251','Windows-1252|windows-1252','Windows-1256|windows-1256','Windows-1253|windows-1253','Windows-1254|windows-1254','Windows-1255|windows-1255','Windows-1257|windows-1257','Windows-1258|windows-1258','CP437|cp437','CP850|cp850','IBM866|ibm866','MacRoman|macintosh','MacCyrillic|x-mac-cyrillic','KOI8-R|koi8-r','KOI8-U|koi8-u']],
 ['Japonais / Chinois / Coréen',['Shift-JIS|shift_jis','EUC-JP|euc-jp','ISO-2022-JP|iso-2022-jp','GB2312|gb2312','GBK|gbk','GB18030|gb18030','Big5|big5','EUC-KR|euc-kr']]
 ];
const all=families.flatMap(([family,x])=>x.map(entry=>{const [label,value]=entry.split('|');return {family,label,value}}));
function sub(label){const box=d.createElement('div');box.className='cmd-view-submenu';const trigger=d.createElement('button');trigger.type='button';trigger.className='cmd-view-subtitle';trigger.textContent=label+'  ▸';const fly=d.createElement('div');fly.className='cmd-view-flyout';box.append(trigger,fly);root.append(box);
const show=()=>{for(const o of root.querySelectorAll('.cmd-view-submenu'))if(o!==box)o.classList.remove('active');box.classList.add('active');const r=trigger.getBoundingClientRect(),width=260;fly.style.left=(r.right+width>innerWidth?Math.max(4,r.left-width):r.right-1)+'px';fly.style.top=Math.max(4,Math.min(r.top,innerHeight-160))+'px';fly.style.maxHeight=Math.max(140,innerHeight-10-Math.max(4,Math.min(r.top,innerHeight-160)))+'px'};
trigger.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show()});
trigger.onclick=e=>{e.preventDefault();e.stopPropagation();box.classList.contains('active')?box.classList.remove('active'):show()};return fly}
function btn(text,fn,target=root){const b=d.createElement('button');b.type='button';b.textContent=text;b.onclick=e=>{e.preventDefault();e.stopPropagation();fn();menu.classList.remove('open')};target.append(b);return b}
btn('✓ Détection automatique à l’ouverture',()=>{window.CMDPAD_setEncodingChoice('auto');state('Encodage : détection automatique activée. Les encodages 8 bits restent parfois ambigus.')});
for(const [family,values] of families){const fly=sub('Codage de caractères · '+family);for(const value of values){const [label,enc]=value.split('|');btn(label,()=>{window.CMDPAD_setEncodingChoice(enc==='utf-8-bom'?'utf-8':enc);state('Lecture des prochains fichiers : '+label)},fly)}}
btn('Détecter l’encodage d’un fichier…',()=>openConverter(true));
btn('Convertir en…',()=>openConverter(false));
const transforms=sub('Base64 / URL / Quoted-Printable');
function transformed(mode,decode=false){const original=area.value;let out;
try{
 if(mode==='base64'){if(decode){const bin=atob(original.replace(/\s/g,''));out=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bin,x=>x.charCodeAt(0)))}else{const b=new TextEncoder().encode(original);let str='';for(let i=0;i<b.length;i+=8192)str+=String.fromCharCode(...b.slice(i,i+8192));out=btoa(str)}}
 if(mode==='url')out=decode?decodeURIComponent(original):encodeURIComponent(original);
 if(mode==='qp'){if(!decode){const b=new TextEncoder().encode(original);out=[...b].map(x=>x===10?'\r\n':x>=33&&x<=60||x>=62&&x<=126?String.fromCharCode(x):'='+x.toString(16).toUpperCase().padStart(2,'0')).join('')}
 else{const src=original.replace(/=\r?\n/g,'');const b=[];for(let i=0;i<src.length;i++){if(src[i]==='='){if(!/^[0-9a-f]{2}$/i.test(src.slice(i+1,i+3)))throw Error('Quoted-Printable : séquence =XX invalide');b.push(parseInt(src.slice(i+1,i+3),16));i+=2}else{const c=src.charCodeAt(i);if(c>127)throw Error('Quoted-Printable : octet hors ASCII non échappé');b.push(c)}}out=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(b))}}
 if(out==null)return;const dialog=d.createElement('dialog');dialog.className='cmd-encoding-dialog';const heading=d.createElement('h3');heading.textContent=(decode?'Décoder ':'Encoder ')+mode;dialog.append(heading);
 const textarea=d.createElement('textarea');textarea.value=out;textarea.readOnly=true;textarea.style.cssText='width:100%;height:230px;box-sizing:border-box';dialog.append(textarea);
 const copy=d.createElement('button');copy.textContent='Copier';copy.onclick=()=>navigator.clipboard.writeText(out).catch(()=>{textarea.select();d.execCommand('copy')});dialog.append(copy);
 const apply=d.createElement('button');apply.textContent='Appliquer au texte actif';apply.onclick=()=>{if(confirm('Remplacer le texte actif par le résultat ?')){area.value=out;area.dispatchEvent(new Event('input',{bubbles:true}));dialog.close()}};dialog.append(apply);
 const close=d.createElement('button');close.textContent='Fermer';close.onclick=()=>{dialog.close();dialog.remove()};dialog.append(close);d.body.append(dialog);dialog.showModal();
}catch(e){state(mode+' : '+e.message)}}
for(const [mode,label] of [['base64','Base64'],['url','URL-Encoding'],['qp','Quoted-Printable']]){btn(label+' → encoder',()=>transformed(mode,false),transforms);btn(label+' → décoder',()=>transformed(mode,true),transforms)}
let dialog=null,select=null,result=null,source=null,preview=null,picked=null,read=null;
function download(data,name){const u=URL.createObjectURL(new Blob([data],{type:'application/octet-stream'})),a=d.createElement('a');a.href=u;a.download=name;d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}
function openConverter(detectOnly){if(!dialog){
dialog=d.createElement('dialog');dialog.className='cmd-encoding-dialog';dialog.style.cssText='width:min(830px,96vw);max-height:87vh;overflow:auto;background:#fff;color:#18233b;padding:16px;border:1px solid #9daec4;border-radius:8px';
const heading=d.createElement('h3');heading.textContent='CMDPad++ — Encodage et conversion';dialog.append(heading);
const p=d.createElement('p');p.textContent='Les conversions produisent de vrais octets. En cas de caractère non représentable, aucun fichier n’est exporté. Le texte original reste intact.';dialog.append(p);
const row=d.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:8px';dialog.append(row);
const label=d.createElement('label');label.textContent='Encodage cible : ';row.append(label);
select=d.createElement('select');select.style.cssText='padding:8px;max-width:250px';for(const a of all){if([...select.options].some(x=>x.value===a.value))continue;const op=d.createElement('option');op.textContent=a.label;op.value=a.value;select.append(op)}label.append(select);select.value='utf-8';
const bom=d.createElement('label');bom.textContent='Ajouter BOM';const check=d.createElement('input');check.type='checkbox';check.id='cmdEncodingBOM';bom.prepend(check);row.append(bom);
const input=d.createElement('input');input.type='file';input.style.cssText='margin:10px 0;width:100%';dialog.append(input);source=input;result=d.createElement('p');result.id='cmdEncodingReport';dialog.append(result);
preview=d.createElement('textarea');preview.rows=8;preview.placeholder='Texte du fichier ou document actif';preview.style.cssText='display:block;box-sizing:border-box;width:100%;font:12px/1.5 monospace';dialog.append(preview);
const actions=d.createElement('div');dialog.append(actions);
const act=(title,fn)=>{const b=d.createElement('button');b.type='button';b.textContent=title;b.style.cssText='padding:8px 12px;border:1px solid #aaa;border-radius:5px;margin:5px;cursor:pointer';b.onclick=fn;actions.append(b)};
input.onchange=async()=>{picked=input.files?.[0]||null;if(!picked)return;if(picked.size>12*1024*1024){result.textContent='Limite 12 Mo pour la conversion interactive';picked=null;return}const bytes=new Uint8Array(await picked.arrayBuffer()),found=window.CMDPAD_detectEncoding(bytes);result.textContent='Détection : '+found.encoding+' — '+found.confidence+' (parfois ambigu sans BOM)';read=found.encoding;try{preview.value=window.CMDPAD_decodeBytes(bytes,read)}catch(e){preview.value='';result.textContent+=' · '+e.message}};
act('Utiliser le texte actif',()=>{picked=null;preview.value=area.value;result.textContent='Source : texte de l’éditeur, traité comme Unicode';});
act('Relire le fichier dans l’encodage cible',async()=>{if(!picked)return result.textContent='Choisis un fichier';try{preview.value=window.CMDPAD_decodeBytes(new Uint8Array(await picked.arrayBuffer()),select.value==='utf-8-bom'?'utf-8':select.value);result.textContent='Décodage '+select.value+' terminé'}catch(e){result.textContent=e.message}});
act('Convertir et télécharger une copie',()=>{try{const target=select.value,bytes=window.CMDPAD_encodeText(preview.value,target==='utf-8-bom'?'utf-8':target,check.checked||target==='utf-8-bom');download(bytes,(picked?.name||d.getElementById('fileName')?.value||'document.txt').replace(/(\.[^.]+)?$/,m=>'_converti-'+target.replace(/\W/g,'-')+(m||'.txt')));result.textContent='Conversion '+target+' terminée : fichier téléchargé, original conservé'}catch(e){result.textContent='Conversion refusée : '+e.message}});
act('Fermer',()=>dialog.close());
d.body.append(dialog)
}
select.value='utf-8';result.textContent=detectOnly?'Sélectionne un fichier à identifier.':'Choisis un fichier ou utilise le texte actif.';preview.value=area.value;dialog.showModal();
}
window.CMDPAD_ENCODING_MENU_READY=true;
})();
