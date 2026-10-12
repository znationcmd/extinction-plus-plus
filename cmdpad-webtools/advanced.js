/* CMDPad++ Advanced Tools: encoding, languages, hashes and conversions. All file operations occur in the browser. */
(function(){
'use strict';
if(window.CMDPAD_ADVANCED_READY)return;
const d=document,editor=d.getElementById('area'),bar=d.querySelector('.toolbar'),menubar=d.querySelector('.menubar');
if(!editor||!bar||!menubar)return;
const utf8=new TextEncoder(),status=s=>{const e=d.getElementById('status');if(e)e.textContent=s};
const hex=a=>Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
const algorithms=['MD5','SHA-1','SHA-256','SHA-384','SHA-512','CRC32','Adler-32','HMAC-SHA-1','HMAC-SHA-256','HMAC-SHA-384','HMAC-SHA-512'];
const unsupported=['SHA-3','BLAKE2','BLAKE3','RIPEMD-160','SHA-224','SHA-512/256','Whirlpool'];
const encodings=['utf-8','utf-16le','utf-16be','windows-1250','windows-1251','windows-1252','windows-1253','windows-1254','windows-1255','windows-1256','windows-1257','windows-1258','iso-8859-1','iso-8859-2','iso-8859-3','iso-8859-4','iso-8859-5','iso-8859-6','iso-8859-7','iso-8859-8','iso-8859-8-i','iso-8859-10','iso-8859-13','iso-8859-14','iso-8859-15','iso-8859-16','koi8-r','koi8-u','ibm866','macintosh','x-mac-cyrillic','shift_jis','euc-jp','iso-2022-jp','euc-kr','gbk','gb18030','big5','windows-874','tis-620'];
const langs=[
['Web','HTML,CSS,SCSS,LESS,JavaScript,TypeScript,JSX,TSX,JSON,JSONC,XML,YAML,TOML,Markdown,MDX,GraphQL,WebAssembly,WebIDL'],
['Systèmes','C,C++,Rust,Go,Zig,D,Assembly x86,Assembly ARM,Fortran,COBOL,Ada,Pascal,Delphi,Swift,Objective-C,Carbon,Verilog,VHDL,SystemVerilog'],
['Applications','Python,Java,Kotlin,C#,F#,Visual Basic,PHP,Ruby,Perl,Scala,Groovy,Dart,Elixir,Erlang,Haskell,OCaml,Clojure,ClojureScript,Racket,Lisp,Scheme,Julia,R,Matlab,Octave,Luau,Lua'],
['Mobile & jeux','GDScript,Unreal C++,Blueprint (visuel),HLSL,GLSL,WGSL,Metal Shading Language,Godot Shader,React Native,Flutter,Dart,SwiftUI,Jetpack Compose,Smali'],
['Shell & outils','Bash,POSIX sh,Zsh,Fish,PowerShell,Batch,CMD,Makefile,CMake,Ninja,Tcl,Awk,Sed,Expect,Nix,Ansible,Terraform,HCL,Puppet,Chef,HCL,Dockerfile'],
['Données','SQL,PostgreSQL SQL,T-SQL,PL/SQL,SQLite SQL,MySQL SQL,MongoDB Query,SPARQL,Cypher,PromQL,InfluxQL,JSONPath,XPath,XQuery,DAX,M,Stata,SAS'],
['Science','LaTeX,TeX,Prolog,Lean,Coq,Agda,Idris,Elm,PureScript,Solidity,Vyper,Move,Cairo,ABAP,Apex,APL,J,Q,KDB+/q'],
['Configuration','INI,CFG,CONF,ENV,Properties,CSV,TSV,GitConfig,Nginx,Apache .htaccess,systemd,Apple plist,REG,Protocol Buffers,Thrift,OpenAPI,JSON Schema,XSD,DTD']
];
function encodeUTF16(text,bigendian){const out=new Uint8Array(text.length*2);for(let i=0;i<text.length;i++){const val=text.charCodeAt(i);out[i*2+(bigendian?1:0)]=val&255;out[i*2+(bigendian?0:1)]=val>>>8}return out}
function detectEncoding(bytes){if(bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF)return 'utf-8';if(bytes[0]===0xFF&&bytes[1]===0xFE)return 'utf-16le';if(bytes[0]===0xFE&&bytes[1]===0xFF)return 'utf-16be';try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);return 'utf-8'}catch{return 'windows-1252 (hypothèse)'}}
if(!window.CMDPAD_decodeFile) window.CMDPAD_decodeFile=async file=>{const bytes=new Uint8Array(await file.arrayBuffer());const detected=detectEncoding(bytes).replace(' (hypothèse)','');const text=new TextDecoder(detected,{fatal:false}).decode(bytes);return{text,encoding:detected}};
let hashFile=null,hashLabel='Texte de l’éditeur';
const dialog=d.createElement('dialog');dialog.style.cssText='width:min(870px,96vw);max-height:90vh;padding:16px;border:1px solid #8a9bb4;border-radius:9px;background:white;color:#19273b;overflow:auto';
dialog.innerHTML='<div style="display:flex;align-items:center;gap:8px"><strong id="advancedTitle" style="flex:1">CMDPad++ — Outils avancés</strong><button type="button" id="advancedClose">✕</button></div><div id="advancedContent"></div>';
d.body.append(dialog);d.getElementById('advancedClose').onclick=()=>dialog.close();
const body=d.getElementById('advancedContent'),heading=d.getElementById('advancedTitle');
function show(name){heading.textContent=name;body.replaceChildren();if(!dialog.open)dialog.showModal()}
function tag(t,where=body){const e=d.createElement('p');e.textContent=t;where.append(e);return e}
function btn(text,run,where=body){const b=d.createElement('button');b.type='button';b.textContent=text;b.style.cssText='padding:8px 12px;margin:4px;border:1px solid #9eabc3;border-radius:4px;background:#f0f4fc;color:#18273f;cursor:pointer';b.onclick=run;where.append(b);return b}
function input(placeholder='',where=body){const e=d.createElement('input');e.placeholder=placeholder;e.style.cssText='display:block;max-width:100%;width:100%;margin:8px 0;padding:9px;border:1px solid #a3afc0';where.append(e);return e}
function select(opts,where=body){const e=d.createElement('select');e.style.cssText='margin:6px;padding:8px;border:1px solid #9aa';for(const v of opts){const o=d.createElement('option');o.value=v;o.textContent=v;e.append(o)}where.append(e);return e}
function textarea(value='',where=body){const e=d.createElement('textarea');e.value=value;e.style.cssText='display:block;width:100%;height:190px;resize:vertical;font:13px/1.5 monospace;padding:10px;border:1px solid #aab';where.append(e);return e}
function download(name,data,type='application/octet-stream'){const b=new Blob([data],{type}),url=URL.createObjectURL(b),a=d.createElement('a');a.href=url;a.download=name;d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function md5(bytes){
 const original=bytes.length,bitLo=(original*8)>>>0,bitHi=Math.floor(original/0x20000000)>>>0;
 const padded=((original+9+63)>>>6)<<6,buf=new Uint8Array(padded);buf.set(bytes);buf[original]=128;const view=new DataView(buf.buffer);view.setUint32(padded-8,bitLo,true);view.setUint32(padded-4,bitHi,true);
 const S=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21],K=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0);
 let a=0x67452301,b=0xefcdab89,c=0x98badcfe,d=0x10325476;
 for(let off=0;off<padded;off+=64){
  const blockA=a,blockB=b,blockC=c,blockD=d;
  for(let i=0;i<64;i++){let f=0,g=0;if(i<16){f=(b&c)|(~b&d);g=i}else if(i<32){f=(d&b)|(~d&c);g=(5*i+1)%16}else if(i<48){f=b^c^d;g=(3*i+5)%16}else{f=c^(b|~d);g=(7*i)%16}
   const x=(a+f+K[i]+view.getUint32(off+g*4,true))>>>0,shift=S[i];a=d;d=c;c=b;b=(b+((x<<shift)|(x>>>(32-shift))))>>>0
  }a=(a+blockA)>>>0;b=(b+blockB)>>>0;c=(c+blockC)>>>0;d=(d+blockD)>>>0;
 }
 const result=new Uint8Array(16),r=new DataView(result.buffer);[a,b,c,d].forEach((x,i)=>r.setUint32(i*4,x,true));return result
}
function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++){c^=bytes[i];for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function adler32(bytes){let a=1,b=0;for(const x of bytes){a=(a+x)%65521;b=(b+a)%65521}return((b<<16)|a)>>>0}
async function calculateHash(alg,bytes,key){
 if(alg==='MD5')return hex(md5(bytes));if(alg==='CRC32')return crc32(bytes).toString(16).padStart(8,'0');if(alg==='Adler-32')return adler32(bytes).toString(16).padStart(8,'0');
 if(alg.startsWith('HMAC-')){if(!key)throw Error('Clé HMAC obligatoire');const imported=await crypto.subtle.importKey('raw',utf8.encode(key),{name:'HMAC',hash:alg.slice(5)},false,['sign']);return hex(new Uint8Array(await crypto.subtle.sign('HMAC',imported,bytes)))}
 return hex(new Uint8Array(await crypto.subtle.digest(alg,bytes)));
}
function hashes(){show('Empreintes / Hash / CRC / HMAC');tag('Calcul local sur le texte actif ou un fichier. MD5 et SHA-1 sont déconseillés pour la sécurité et les mots de passe.');
const kind=select(algorithms),key=input('Clé HMAC (facultative sauf HMAC)');const file=d.createElement('input');file.type='file';body.append(file);const note=tag('Source : texte de l’éditeur');file.onchange=()=>{hashFile=file.files?.[0]||null;note.textContent='Source : '+(hashFile?.name||'texte de l’éditeur')};
const output=textarea('');output.readOnly=true;
btn('Calculer l’empreinte',async()=>{try{const bytes=hashFile?new Uint8Array(await hashFile.arrayBuffer()):utf8.encode(editor.value);if(bytes.length>64*1024*1024)throw Error('Limite de calcul local : 64 Mio');output.value=await calculateHash(kind.value,bytes,key.value);status('Empreinte '+kind.value+' calculée')}catch(e){output.value='Erreur : '+e.message}});
btn('Comparer avec une empreinte',()=>{const original=prompt('Empreinte attendue :');if(original!=null)tag(output.value.toLowerCase()===original.trim().toLowerCase()?'IDENTIQUE':'DIFFÉRENTE')});
btn('Copier le résultat',async()=>{try{await navigator.clipboard.writeText(output.value)}catch{output.select();document.execCommand('copy')}});
tag('Autres familles : '+unsupported.join(', ')+'. Non implémentées : aucun résultat ne sera inventé.');
}
function convert(){show('Encodages et conversions');tag('Décodage : encodages pris en charge par TextDecoder. Réencodage sûr : UTF-8 et UTF-16 LE/BE. Les autres encodages demandent une bibliothèque d’écriture spécialisée.');
const charset=select(encodings.filter(x=>{try{new TextDecoder(x);return true}catch{return false}}));const source=select(['Texte actuel','Fichier local']);const file=d.createElement('input');file.type='file';body.append(file);const actions=d.createElement('div');body.append(actions);const output=textarea();output.readOnly=false;
btn('Décoder le fichier',async()=>{try{const f=file.files?.[0];if(!f)throw Error('Choisis un fichier');const data=new Uint8Array(await f.arrayBuffer());if(data.length>16*1024*1024)throw Error('Maximum 16 Mio');output.value=new TextDecoder(charset.value).decode(data);tag('Détection BOM / UTF-8 probable : '+detectEncoding(data))}catch(e){output.value='Erreur : '+e.message}},actions);
btn('Encoder et télécharger',()=>{try{const value=source.value==='Texte actuel'?editor.value:output.value;const bytes=charset.value==='utf-8'?utf8.encode(value):charset.value==='utf-16le'?encodeUTF16(value,false):charset.value==='utf-16be'?encodeUTF16(value,true):null;if(!bytes)throw Error('Encodage de sortie non disponible pour '+charset.value);download('conversion-'+charset.value+'.txt',bytes,'application/octet-stream')}catch(e){tag('Erreur : '+e.message)}},actions);
btn('Mettre le résultat dans l’éditeur',()=>{if(confirm('Remplacer le texte actif par le résultat décodé ?')){editor.value=output.value;editor.dispatchEvent(new Event('input',{bubbles:true}))}},actions);
const operations=['Base64 encoder','Base64 décoder','Hexadécimal encoder','Hexadécimal décoder','URL encoder','URL décoder','HTML échapper','HTML déséchapper','Unicode NFC','Unicode NFD','Unicode NFKC','Unicode NFKD','Enlever espaces fin de ligne','CRLF vers LF','LF vers CRLF','JSON formater','JSON compacter','MAJUSCULES','minuscules'];const job=select(operations);
btn('Convertir texte',()=>{let v=editor.value;try{switch(job.value){
 case 'Base64 encoder':v=btoa(Array.from(utf8.encode(v),x=>String.fromCharCode(x)).join(''));break;
 case 'Base64 décoder':{const data=atob(v.replace(/\s/g,'')),bytes=Uint8Array.from(data,x=>x.charCodeAt(0));v=new TextDecoder().decode(bytes);break}
 case 'Hexadécimal encoder':v=hex(utf8.encode(v));break;
 case 'Hexadécimal décoder':{const str=v.replace(/\s/g,'');if(str.length%2||!/^[0-9a-f]*$/i.test(str))throw Error('Hexadécimal invalide');v=new TextDecoder().decode(Uint8Array.from(str.match(/../g)||[],x=>parseInt(x,16)));break}
 case 'URL encoder':v=encodeURIComponent(v);break;case 'URL décoder':v=decodeURIComponent(v);break;
 case 'HTML échapper':v=v.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));break;
 case 'HTML déséchapper':{const tmp=d.createElement('textarea');tmp.innerHTML=v;v=tmp.value;break}
 case 'Unicode NFC':case 'Unicode NFD':case 'Unicode NFKC':case 'Unicode NFKD':v=v.normalize(job.value.split(' ')[1]);break;
 case 'Enlever espaces fin de ligne':v=v.replace(/[ \t]+$/gm,'');break;
 case 'CRLF vers LF':v=v.replace(/\r\n/g,'\n');break;
 case 'LF vers CRLF':v=v.replace(/\r?\n/g,'\r\n');break;
 case 'JSON formater':v=JSON.stringify(JSON.parse(v),null,2);break;case 'JSON compacter':v=JSON.stringify(JSON.parse(v));break;
 case 'MAJUSCULES':v=v.toUpperCase();break;case 'minuscules':v=v.toLowerCase();break;
 }output.value=v;status('Conversion prête, sans modification de l’original')}catch(e){output.value='Erreur : '+e.message}});
}
function languages(){show('Catalogue des langages');tag('Identification et référence. La présence dans la liste ne signifie pas qu’un compilateur ou moteur d’exécution est installé.');
const search=input('Chercher un langage, une famille ou une technologie');const result=d.createElement('div');result.style.cssText='overflow:auto;max-height:54vh';body.append(result);
function refresh(){result.replaceChildren();for(const [family,values] of langs){const items=values.split(',').map(x=>x.trim()).filter(x=>!search.value||x.toLowerCase().includes(search.value.toLowerCase())||family.toLowerCase().includes(search.value.toLowerCase()));if(!items.length)continue;const head=d.createElement('h4');head.textContent=family;result.append(head);const p=d.createElement('p');p.textContent=items.join(' · ');result.append(p)}if(!result.children.length)result.textContent='Aucun résultat'}
search.oninput=refresh;refresh();
tag('Exécution actuelle : dépend du moteur disponible et du navigateur. Aucun langage n’est exécuté automatiquement à l’ouverture.');
}
const menu=d.createElement('div');menu.className='menu';menu.innerHTML='<button type="button">Outils avancés</button><div class="dropdown"><button data-adv="hash">Empreintes MD5 / SHA / HMAC / CRC</button><button data-adv="encoding">Encodages internationaux / conversions</button><button data-adv="languages">Catalogue des langages</button></div>';menubar.append(menu);
menu.firstElementChild.onclick=e=>{e.stopPropagation();menu.classList.toggle('open');const box=e.target.getBoundingClientRect(),drop=menu.querySelector('.dropdown');drop.style.left=Math.max(4,Math.min(innerWidth-230,box.left))+'px';drop.style.top=box.bottom+'px'};
menu.querySelector('[data-adv="hash"]').onclick=hashes;menu.querySelector('[data-adv="encoding"]').onclick=convert;menu.querySelector('[data-adv="languages"]').onclick=languages;
const actions=d.createElement('span');actions.style.cssText='display:inline-flex;gap:3px;flex-shrink:0';bar.insertBefore(actions,bar.querySelector('.actions'));
for(const [label,tip,action] of [['# HASH','Calcul des empreintes cryptographiques',hashes],['⇄ Encodage','Décoder et convertir des textes',convert],['⌘ Langages','Catalogue des langages',languages]]){const b=d.createElement('button');b.type='button';b.className='toolbtn';b.textContent=label;b.title=tip;b.onclick=action;actions.append(b)}
window.CMDPAD_ADVANCED_READY=true;
})();
