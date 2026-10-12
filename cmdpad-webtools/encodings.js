/* CMDPad++ encodings: strict local byte conversions and BOM detection, no silent character replacement. */
(function(){
'use strict';
const available=['auto','utf-8','utf-16le','utf-16be','utf-32le','utf-32be','ucs-2le','us-ascii','iso-8859-1','iso-8859-2','iso-8859-3','iso-8859-4','iso-8859-5','iso-8859-6','iso-8859-7','iso-8859-8','iso-8859-9','iso-8859-10','iso-8859-11','iso-8859-13','iso-8859-14','iso-8859-15','iso-8859-16','windows-1250','windows-1251','windows-1252','windows-1253','windows-1254','windows-1255','windows-1256','windows-1257','windows-1258','windows-874','ibm866','macintosh','x-mac-cyrillic','koi8-r','koi8-u','shift_jis','euc-jp','iso-2022-jp','gb2312','gbk','gb18030','big5','euc-kr','cp437','cp850'];
const aliases={'utf-8-bom':'utf-8','utf-16':'utf-16le','utf-32':'utf-32le','ucs-2':'ucs-2le','ascii':'us-ascii'};
const decoderMap={ 'ucs-2le':'utf-16le','utf-32le':null,'utf-32be':null,'cp437':null,'cp850':null};
const bytes=(x)=>x instanceof Uint8Array?x:new Uint8Array(x);
const meta=new WeakMap();let selected='auto';
function bom(data){const b=bytes(data);if(b.length>=4){if(b[0]===255&&b[1]===254&&b[2]===0&&b[3]===0)return {encoding:'utf-32le',length:4};if(b[0]===0&&b[1]===0&&b[2]===254&&b[3]===255)return {encoding:'utf-32be',length:4}}
if(b.length>=3&&b[0]===239&&b[1]===187&&b[2]===191)return {encoding:'utf-8',length:3};
if(b.length>=2&&b[0]===255&&b[1]===254)return {encoding:'utf-16le',length:2};
if(b.length>=2&&b[0]===254&&b[1]===255)return {encoding:'utf-16be',length:2};return null}
function strict(s){for(let i=0;i<s.length;i++){const u=s.charCodeAt(i);if(u>=0xD800&&u<=0xDBFF){const next=s.charCodeAt(++i);if(!Number.isFinite(next)||next<0xDC00||next>0xDFFF)throw Error('Surrogate Unicode non apparié')}else if(u>=0xDC00&&u<=0xDFFF)throw Error('Surrogate Unicode isolé')}}
function detect(b){b=bytes(b);const mark=bom(b);if(mark)return {encoding:mark.encoding,confidence:'BOM '+mark.length+' octets',bom:mark.length};
if(b.length>=8){
 let even0=0,odd0=0;for(let i=0;i<Math.min(b.length,2048);i++)if(b[i]===0){if(i%2===0)even0++;else odd0++}
 if(odd0>even0*3&&odd0>=3){try{new TextDecoder('utf-16le',{fatal:true}).decode(b);return {encoding:'utf-16le',confidence:'Probable UTF-16LE (sans BOM)',bom:0}}catch{}}
 if(even0>odd0*3&&even0>=3){try{new TextDecoder('utf-16be',{fatal:true}).decode(b);return {encoding:'utf-16be',confidence:'Probable UTF-16BE (sans BOM)',bom:0}}catch{}}
}
try{new TextDecoder('utf-8',{fatal:true}).decode(b);return {encoding:'utf-8',confidence:'UTF-8 valide sans BOM (heuristique)',bom:0}}catch{}
return {encoding:'windows-1252',confidence:'Encodage 8 bits indéterminé (Windows-1252 provisoire)',bom:0,ambiguous:true}
}
function decode32(b,be){const mark=bom(b),offset=mark?.length||0;if((b.length-offset)%4!==0)throw Error('Taille UTF-32 non multiple de 4');let out='';for(let i=offset;i<b.length;i+=4){const cp=be?((b[i]*0x1000000)+(b[i+1]<<16)+(b[i+2]<<8)+b[i+3]):((b[i+3]*0x1000000)+(b[i+2]<<16)+(b[i+1]<<8)+b[i]);if(cp>0x10ffff||(cp>=0xd800&&cp<=0xdfff))throw Error('Code Unicode UTF-32 invalide à '+i);out+=String.fromCodePoint(cp)}return out}
function decode(b,enc='auto'){b=bytes(b);enc=(aliases[enc]||enc||'auto').toLowerCase();if(enc==='auto')enc=detect(b).encoding;const mark=bom(b);
if(enc==='utf-32le'||enc==='utf-32be')return decode32(b,enc==='utf-32be');
if(enc==='us-ascii'){for(const x of b)if(x>127)throw Error('Octet non ASCII');return String.fromCharCode(...Array.from(b.slice(0,32768)))+Array.from({length:Math.ceil(Math.max(0,b.length-32768)/8192)},(_,i)=>String.fromCharCode(...b.slice(32768+i*8192,32768+(i+1)*8192))).join('')}
if(enc==='iso-8859-1')return Array.from(b,x=>String.fromCharCode(x)).join('');
const label=Object.hasOwn(decoderMap,enc)?decoderMap[enc]:enc;if(!label)throw Error(enc+' : codec requis (lecture non installée)');
try{const txt=new TextDecoder(label,{fatal:true}).decode(b);return txt}catch(e){throw Error('Décodage '+enc+' impossible : '+e.message)}}
function utf16(s,be,mark){const out=new Uint8Array(2*s.length+(mark?2:0));let i=0;if(mark){out.set(be?[254,255]:[255,254]);i=2}for(let j=0;j<s.length;j++){const cp=s.charCodeAt(j);out[i++]=be?cp>>>8:cp&255;out[i++]=be?cp&255:cp>>>8}return out}
function utf32(s,be,mark){const cps=[...s].map(c=>c.codePointAt(0)),out=new Uint8Array(cps.length*4+(mark?4:0));let i=0;if(mark){out.set(be?[0,0,254,255]:[255,254,0,0]);i=4}for(const cp of cps){if(be){out[i++]=cp>>>24;out[i++]=cp>>>16&255;out[i++]=cp>>>8&255;out[i++]=cp&255}else{out[i++]=cp&255;out[i++]=cp>>>8&255;out[i++]=cp>>>16&255;out[i++]=cp>>>24}}return out}
const reverseCache=new Map();
function singleByteEncode(s,enc){
let map=reverseCache.get(enc);if(!map){map=new Map();const decoder=new TextDecoder(enc,{fatal:false});for(let i=0;i<256;i++){const char=decoder.decode(new Uint8Array([i]));if(char.length===1&&char!=='\ufffd'&&!map.has(char))map.set(char,i)}reverseCache.set(enc,map)}
const out=[];for(const cp of s){const byte=map.get(cp);if(byte==null)throw Error('Caractère '+JSON.stringify(cp)+' impossible en '+enc);out.push(byte)}return new Uint8Array(out)
}
function encode(s,enc='utf-8',withBom=false){enc=(aliases[enc]||enc||'utf-8').toLowerCase();strict(s);
if(enc==='utf-8'){const a=new TextEncoder().encode(s);if(!withBom)return a;let b=new Uint8Array(a.length+3);b.set([239,187,191]);b.set(a,3);return b}
if(enc==='utf-16le'||enc==='utf-16be')return utf16(s,enc==='utf-16be',withBom);
if(enc==='ucs-2le'){if([...s].some(c=>c.codePointAt(0)>65535))throw Error('UCS-2 ne supporte pas les caractères hors BMP');return utf16(s,false,withBom)}
if(enc==='utf-32le'||enc==='utf-32be')return utf32(s,enc==='utf-32be',withBom);
if(enc==='us-ascii'){const out=[];for(const c of s){const cp=c.codePointAt(0);if(cp>127)throw Error('Caractère non ASCII : '+c);out.push(cp)}return new Uint8Array(out)}
if(enc==='iso-8859-1'){const out=[];for(const c of s){const cp=c.codePointAt(0);if(cp>255)throw Error('Caractère non représentable Latin-1 : '+c);out.push(cp)}return new Uint8Array(out)}
if(['shift_jis','euc-jp','iso-2022-jp','gb2312','gbk','gb18030','big5','euc-kr','cp437','cp850'].includes(enc))throw Error('Encodeur '+enc+' non installé : aucun export trompeur autorisé');
if(['auto'].includes(enc))return encode(s,'utf-8',withBom);
try{return singleByteEncode(s,enc)}catch(e){throw Error('Conversion '+enc+' impossible : '+e.message)}
}
async function decodeFile(file,forced){const b=new Uint8Array(await file.arrayBuffer()),found=detect(b),encoding=forced||(selected==='auto'?found.encoding:selected);const text=decode(b,encoding);const x={text,encoding,detected:found,bom:!!(bom(b)&&bom(b).encoding===encoding)};meta.set(file,x);return x}
window.CMDPAD_decodeFile=decodeFile;window.CMDPAD_encodeText=encode;window.CMDPAD_encodings=available;
window.CMDPAD_encodingOf=file=>meta.get(file)||null;window.CMDPAD_encodingChoice=()=>selected;
window.CMDPAD_setEncodingChoice=v=>{if(!available.includes(v))throw Error('Encodage inconnu');selected=v;const e=document.getElementById('cmdpadEncodingChoice');if(e)e.value=v};
window.CMDPAD_detectEncoding=detect;window.CMDPAD_decodeBytes=decode;window.CMDPAD_encodingBOM=bom;
const d=document,toolbar=d.querySelector('.toolbar');if(!toolbar)return;
const choice=d.createElement('select');choice.id='cmdpadEncodingChoice';choice.title='Encodage de lecture des prochains fichiers importés';
for(const name of available){const o=d.createElement('option');o.value=name;o.textContent=name==='auto'?'Détection automatique':name;choice.append(o)}
choice.value='auto';choice.onchange=()=>{selected=choice.value;const status=d.getElementById('status');if(status)status.textContent='Lecture des prochains fichiers : '+selected};
toolbar.append(choice);
})();
