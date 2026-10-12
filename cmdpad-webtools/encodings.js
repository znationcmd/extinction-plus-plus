/* CMDPad++ encoding assistant. The browser decoder repertoire is WHATWG Encoding.
   Writing is lossless only where an encoder exists; unsupported exports are refused. */
(function(){
'use strict';
const NAMES=['auto','utf-8','utf-16le','utf-16be','windows-1252','windows-1250','windows-1251','windows-1253','windows-1254','windows-1255','windows-1256','windows-1257','windows-1258','windows-874','iso-8859-2','iso-8859-3','iso-8859-4','iso-8859-5','iso-8859-6','iso-8859-7','iso-8859-8','iso-8859-8-i','iso-8859-10','iso-8859-13','iso-8859-14','iso-8859-15','iso-8859-16','koi8-r','koi8-u','ibm866','macintosh','x-mac-cyrillic','shift_jis','euc-jp','iso-2022-jp','gbk','gb18030','big5','euc-kr','replacement'];
const supported=NAMES.filter(x=>x==='auto'||(()=>{try{new TextDecoder(x);return true}catch{return false}})());
const meta=new WeakMap();let selected='auto';
function bom(bytes){
if(bytes.length>=3&&bytes[0]===239&&bytes[1]===187&&bytes[2]===191)return 'utf-8';
if(bytes.length>=2&&bytes[0]===255&&bytes[1]===254)return 'utf-16le';
if(bytes.length>=2&&bytes[0]===254&&bytes[1]===255)return 'utf-16be';
return null}
function detect(bytes){
const known=bom(bytes);if(known)return {encoding:known,confidence:'BOM'};
try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);return {encoding:'utf-8',confidence:'UTF-8 strict valide'}}catch{}
return {encoding:'windows-1252',confidence:'UTF-8 invalide — relecture occidentale provisoire; choisir un autre encodage si accents incorrects'}
}
async function decodeFile(file,forced){
const bytes=new Uint8Array(await file.arrayBuffer());const detected=detect(bytes),encoding=forced||selected==='auto'&&detected.encoding||selected;
if(encoding==='replacement')throw Error('Encodage de remplacement : impossible de conserver les caractères');
let text;try{text=new TextDecoder(encoding,{fatal:true}).decode(bytes)}catch(e){throw Error('Décodage '+encoding+' impossible : '+e.message+'. Sélectionne le bon encodage.')}
meta.set(file,{encoding,detected});return {text,encoding,detected}
}
function cp1252(text){const map=new Map();const dec=new TextDecoder('windows-1252');for(let i=0;i<256;i++){const char=dec.decode(new Uint8Array([i]));if(!map.has(char))map.set(char,i)}const out=[];for(const char of text){if(!map.has(char))throw Error('Caractère impossible à enregistrer en Windows-1252 : '+char);out.push(map.get(char))}return new Uint8Array(out)}
function encodeText(text,encoding='utf-8',withBom=false){
encoding=(encoding||'utf-8').toLowerCase();
if(encoding==='utf-8'){const data=new TextEncoder().encode(text);if(!withBom)return data;const out=new Uint8Array(data.length+3);out.set([239,187,191]);out.set(data,3);return out}
if(encoding==='utf-16le'||encoding==='utf-16be'){const bomlen=withBom?2:0,out=new Uint8Array(text.length*2+bomlen);if(withBom){out[0]=encoding==='utf-16le'?255:254;out[1]=encoding==='utf-16le'?254:255}for(let i=0;i<text.length;i++){let v=text.charCodeAt(i),p=bomlen+i*2;if(encoding==='utf-16le'){out[p]=v&255;out[p+1]=v>>8}else{out[p]=v>>8;out[p+1]=v&255}}return out}
if(encoding==='windows-1252')return cp1252(text);
throw Error('CMDPad++ sait lire '+encoding+' mais ne sait pas le réencoder fidèlement. Choisis explicitement UTF-8 ou UTF-16, ou conserve le fichier original.')
}
window.CMDPAD_decodeFile=decodeFile;
window.CMDPAD_encodeText=encodeText;
window.CMDPAD_encodings=supported;
window.CMDPAD_encodingOf=file=>meta.get(file)||null;
window.CMDPAD_encodingChoice=()=>selected;
const d=document,bar=d.querySelector('.toolbar');if(!bar)return;
const select=d.createElement('select');select.id='cmdpadEncodingChoice';select.title='Décodage des prochains fichiers importés';select.style.cssText='height:30px;max-width:170px;min-width:110px;padding:3px;border:1px solid #aaa;background:#fff;color:#222';
for(const n of supported){const opt=d.createElement('option');opt.value=n;opt.textContent=n==='auto'?'🔤 Auto encodage':n;select.append(opt)}
select.onchange=()=>{selected=select.value;const state=d.getElementById('status');if(state)state.textContent='Encodage choisi pour les prochains fichiers : '+selected};
bar.append(select);
})();
