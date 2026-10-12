/* CMDPad++ — local hashes and file checksums. No upload. */
(function(){
'use strict';
const d=document;
const hex=a=>Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
function md5(bytes){
 const size=(((bytes.length+8)/64|0)+1)*64,b=new Uint8Array(size);b.set(bytes);b[bytes.length]=128;
 const view=new DataView(b.buffer);view.setUint32(size-8,(bytes.length*8)>>>0,true);view.setUint32(size-4,Math.floor(bytes.length/0x20000000)>>>0,true);
 const K=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0);
 const S=[[7,12,17,22],[5,9,14,20],[4,11,16,23],[6,10,15,21]];
 let A=0x67452301,B=0xefcdab89,C=0x98badcfe,D=0x10325476;
 for(let off=0;off<size;off+=64){let a=A,b=B,c=C,d=D;
 for(let i=0;i<64;i++){let f,g,j=i>>>4;if(j===0){f=(b&c)|(~b&d);g=i}else if(j===1){f=(d&b)|(~d&c);g=(5*i+1)%16}else if(j===2){f=b^c^d;g=(3*i+5)%16}else{f=c^(b|~d);g=(7*i)%16}
 let x=(a+f+K[i]+view.getUint32(off+g*4,true))>>>0,shift=S[j][i%4];let rotate=(x<<shift)|(x>>>(32-shift));a=d;d=c;c=b;b=(b+rotate)>>>0;
 }
 A=(A+a)>>>0;B=(B+b)>>>0;C=(C+c)>>>0;D=(D+d)>>>0;
 }
 let out=new Uint8Array(16),res=new DataView(out.buffer);[A,B,C,D].forEach((x,i)=>res.setUint32(4*i,x,true));return out;
}
function crc32(bytes){let c=-1;for(const x of bytes){c^=x;for(let j=0;j<8;j++)c=c>>>1^((c&1)?0xedb88320:0)}const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,(c^-1)>>>0,false);return a}
function adler32(bytes){let a=1,b=0;for(const x of bytes){a=(a+x)%65521;b=(b+a)%65521}const v=new Uint8Array(4);new DataView(v.buffer).setUint32(0,((b<<16)|a)>>>0,false);return v}
function fnv32(bytes){let v=2166136261;for(const x of bytes)v=Math.imul(v^x,16777619)>>>0;const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,v,false);return a}
const algorithms=['MD5','SHA-1','SHA-256','SHA-384','SHA-512','CRC32','Adler-32','FNV-1a32'];
async function digest(bytes,name){if(name==='MD5')return md5(bytes);if(name==='CRC32')return crc32(bytes);if(name==='Adler-32')return adler32(bytes);if(name==='FNV-1a32')return fnv32(bytes);return new Uint8Array(await crypto.subtle.digest(name,bytes))}
window.CMDPAD_HASH_ALGORITHMS=algorithms;window.CMDPAD_digest=digest;
const bar=d.querySelector('.toolbar');if(!bar)return;
const btn=d.createElement('button');btn.type='button';btn.className='toolbtn';btn.textContent='🔐 MD5 / SHA';btn.title='Empreintes cryptographiques et sommes de contrôle locales';bar.insertBefore(btn,bar.querySelector('.actions'));
const dialog=d.createElement('dialog');dialog.style.cssText='width:min(880px,96vw);max-height:85vh;overflow:auto;background:white;color:#1b2940;border:1px solid #adb9ce;border-radius:8px;padding:15px';d.body.append(dialog);
const create=(root,label,callback)=>{const b=d.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:7px 11px;border:1px solid #b5c3d7;border-radius:5px;background:#f2f6ff;cursor:pointer;margin:3px';b.onclick=callback;root.append(b)};
let report=null;
async function calculate(bytes,name){
const line=d.getElementById('cmdHashStatus'),results=d.getElementById('cmdHashResults');results.replaceChildren();
if(bytes.length>128*1024*1024){line.textContent='Limite de calcul en mémoire : 128 Mo. Pour les gros fichiers, utilisez un outil local spécialisé.';return}
line.textContent='Calcul local de '+name+' en cours...';const hashes=[];
for(const algo of algorithms){try{let value=hex(await digest(bytes,algo));hashes.push({algorithm:algo,hash:value});const row=d.createElement('div');row.style.cssText='padding:6px;border-bottom:1px solid #ddd;word-break:break-all';const txt=d.createElement('strong');txt.textContent=algo+' : ';const result=d.createElement('code');result.textContent=value;row.append(txt,result);create(row,'Copier',()=>navigator.clipboard.writeText(value).catch(()=>{line.textContent='Copie refusée : vérifie les permissions du navigateur'}));results.append(row)}
catch(e){hashes.push({algorithm:algo,error:String(e.message||e)})}}
report={file:name,bytes:bytes.length,timestamp:new Date().toISOString(),hashes};line.textContent='Terminé. Les données restent dans ce navigateur.';
}
btn.onclick=()=>{
dialog.replaceChildren();const title=d.createElement('h3');title.textContent='MD5, SHA-1, SHA-256, SHA-384, SHA-512 et sommes de contrôle';dialog.append(title);
const note=d.createElement('p');note.textContent='MD5 et SHA-1 servent uniquement à la compatibilité. Ils ne protègent pas les mots de passe. CRC32, Adler-32 et FNV-1a ne sont pas cryptographiques.';dialog.append(note);
const row=d.createElement('div');dialog.append(row);
create(row,'Analyser le texte de l’éditeur',()=>{const area=d.getElementById('area');calculate(new TextEncoder().encode(area?.value||''),d.getElementById('fileName')?.value||'texte')});
create(row,'Analyser un fichier du PC',()=>{const input=d.createElement('input');input.type='file';input.onchange=async()=>{const f=input.files?.[0];if(f){if(f.size>128*1024*1024){d.getElementById('cmdHashStatus').textContent='Fichier supérieur à 128 Mo';return}calculate(new Uint8Array(await f.arrayBuffer()),f.name)}};input.click()});
create(row,'Rapport JSON',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=d.createElement('a');a.href=url;a.download=report.file+'.hashes.json';d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)});
create(row,'Fermer',()=>dialog.close());
const status=d.createElement('p');status.id='cmdHashStatus';status.textContent='Choisis un texte ou un fichier';dialog.append(status);
const results=d.createElement('div');results.id='cmdHashResults';dialog.append(results);
dialog.showModal();
};
})();