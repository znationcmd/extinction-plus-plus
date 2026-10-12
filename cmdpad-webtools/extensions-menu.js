/* CMDPad++ — Modules d’extension: usable browser counterparts of MIME Tools, Converter and NppExport. */
(function(){
'use strict';
const d=document,area=d.getElementById('area'),bar=d.querySelector('.menubar');if(!bar||!area||window.CMDPAD_EXTENSION_MENU_READY)return;
const root=[...bar.querySelectorAll(':scope>.menu')].find(x=>['Plugins',"Modules d’extension"].includes(x.querySelector(':scope>button')?.textContent.trim()));
if(!root)return;const head=root.querySelector(':scope>button'),drop=root.querySelector(':scope>.dropdown');if(!head||!drop)return;
head.textContent="Modules d’extension";
const status=message=>{const el=d.getElementById('status');if(el)el.textContent=message};
const old=[...drop.querySelectorAll(':scope>button')];drop.replaceChildren();
const editor=d.getElementById('area'),filename=d.getElementById('fileName');
function b64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text)}
function fromB64(text){const clean=text.replace(/\s/g,'');const result=atob(clean),bytes=new Uint8Array(result.length);for(let i=0;i<result.length;i++)bytes[i]=result.charCodeAt(i);return bytes}
function getText(){const a=editor.selectionStart,b=editor.selectionEnd;return {start:a,end:b,text:a<b?editor.value.slice(a,b):editor.value,selected:a<b}}
function write(value,changeAll=false){const {start,end,selected}=getText();if(editor.readOnly)return status('Lecture seule : aucune modification');if(!selected&&!changeAll&&!confirm('Aucune sélection. Transformer tout le document ?'))return;
 const from=selected?start:0,to=selected?end:editor.value.length;
 editor.focus();editor.setRangeText(value,from,to,'select');editor.dispatchEvent(new Event('input',{bubbles:true}));status('Transformation appliquée (annulation possible)')}
function transform(name,fn){try{const t=getText().text;if(t.length>2*1024*1024)return status('Sélection trop grande (>2 Mo)');const output=fn(t);write(output);status(name+' : terminé')}catch(err){status(name+' : '+String(err.message||err))}}
function exportFile(name,content,mime){const bytes=content instanceof Uint8Array?content:new TextEncoder().encode(content),u=URL.createObjectURL(new Blob([bytes],{type:mime||'application/octet-stream'})),a=d.createElement('a');a.href=u;a.download=name;d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),25000);status('Copie exportée : '+name)}
function expand(label){
 const wrap=d.createElement('div');wrap.className='cmd-ext-group';const button=d.createElement('button');button.type='button';button.className='cmd-ext-trigger';button.textContent=label+'  ›';
 const popup=d.createElement('div');popup.className='cmd-ext-fly';wrap.append(button,popup);drop.append(wrap);
 const open=()=>{for(const x of drop.querySelectorAll('.cmd-ext-group'))if(x!==wrap)x.classList.remove('expanded');wrap.classList.add('expanded');const r=button.getBoundingClientRect(),parent=drop.getBoundingClientRect(),w=255;
 popup.style.left=Math.round(parent.right+w+8>innerWidth?Math.max(3,parent.left-w):parent.right-1)+'px';popup.style.top=Math.round(Math.min(r.top,innerHeight-160))+'px';popup.style.maxHeight=Math.max(170,innerHeight-Math.min(r.top,innerHeight-160)-9)+'px'};
 let timeout;button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')open()});button.onclick=e=>{e.preventDefault();e.stopPropagation();wrap.classList.contains('expanded')?wrap.classList.remove('expanded'):open()};
 wrap.addEventListener('pointerleave',()=>{clearTimeout(timeout);timeout=setTimeout(()=>wrap.classList.remove('expanded'),210)});popup.addEventListener('pointerenter',()=>clearTimeout(timeout));return popup
}
function action(host,label,fn){const b=d.createElement('button');b.type='button';b.textContent=label;b.onclick=e=>{e.preventDefault();e.stopPropagation();root.classList.remove('open');try{Promise.resolve(fn()).catch(x=>status(String(x.message||x)))}catch(x){status(String(x.message||x))}};host.append(b);return b}
const mime=expand('MIME Tools');
action(mime,'Base64 → Encoder la sélection',()=>transform('Base64',t=>b64(new TextEncoder().encode(t))));
action(mime,'Base64 → Décoder en UTF-8',()=>transform('Décodage Base64',t=>new TextDecoder('utf-8',{fatal:true}).decode(fromB64(t))));
action(mime,'URL → Encoder les caractères',()=>transform('URL Encoding',encodeURIComponent));
action(mime,'URL → Décoder les caractères',()=>transform('URL Decoding',decodeURIComponent));
const entities={
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
};
action(mime,'HTML → Encoder les entités',()=>transform('Entités HTML',s=>s.replace(/[&<>"']/g,ch=>entities[ch])));
action(mime,'HTML → Décoder les entités',()=>transform('Décodage HTML',s=>{const node=d.createElement('textarea');node.innerHTML=s;return node.value}));
action(mime,'Quoted-Printable → Encoder',()=>transform('Quoted-Printable',s=>Array.from(new TextEncoder().encode(s),b=>b>=33&&b<=60||b>=62&&b<=126?String.fromCharCode(b):'='+b.toString(16).toUpperCase().padStart(2,'0')).join('')));
action(mime,'Quoted-Printable → Décoder UTF-8',()=>transform('Quoted-Printable',s=>{const src=s.replace(/=\r?\n/g,''),bytes=[];for(let i=0;i<src.length;i++){const ch=src[i];if(ch==='='&&/^[0-9a-f]{2}$/i.test(src.slice(i+1,i+3))){bytes.push(parseInt(src.slice(i+1,i+3),16));i+=2}else bytes.push(...new TextEncoder().encode(ch))}return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes))}));
const conv=expand('Converter');
action(conv,'Texte UTF-8 → Hexadécimal',()=>transform('Texte vers hexadécimal',s=>Array.from(new TextEncoder().encode(s),x=>x.toString(16).padStart(2,'0')).join(' ')));
action(conv,'Hexadécimal → Texte UTF-8',()=>transform('Hexadécimal vers texte',s=>{const clean=s.replace(/(?:0x)|[\s,;:-]/gi,'');if(!/^(?:[0-9a-f]{2})*$/i.test(clean))throw Error('Séquence hexadécimale invalide');const out=new Uint8Array(clean.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(clean.slice(i*2,i*2+2),16);return new TextDecoder('utf-8',{fatal:true}).decode(out)}));
action(conv,'Texte → ROT13',()=>transform('ROT13',s=>s.replace(/[a-z]/gi,c=>String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<='m'?13:-13)))));
action(conv,'Nombre décimal → Hexadécimal',()=>transform('Nombre décimal',s=>s.trim().split(/\s+/).map(x=>{if(!/^[+-]?\d+$/.test(x))throw Error('Entier invalide: '+x);return '0x'+BigInt(x).toString(16)}).join(' ')));
action(conv,'Nombre hexadécimal → Décimal',()=>transform('Hexadécimal',s=>s.trim().split(/\s+/).map(x=>{if(!/^(?:0x)?[0-9a-f]+$/i.test(x))throw Error('Hexadécimal invalide: '+x);return BigInt(x.startsWith('0x')?x:'0x'+x).toString(10)}).join(' ')));
const exported=expand('NppExport');
function htmlDoc(){const text=getText().text;return '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Export CMDPad++</title><style>pre{white-space:pre-wrap;font:14px/1.5 Consolas,monospace}</style></head><body><pre>'+text.replace(/[&<>]/g,c=>entities[c])+'</pre></body></html>'}
action(exported,'Exporter en HTML…',()=>exportFile((filename?.value||'document.txt')+'.html',htmlDoc(),'text/html;charset=utf-8'));
action(exported,'Copier en HTML enrichi',async()=>{if(!navigator.clipboard?.write||!window.ClipboardItem)return status('HTML enrichi non accepté par ce navigateur');const text=getText().text,markup='<pre>'+text.replace(/[&<>]/g,c=>entities[c])+'</pre>';
 await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([markup],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);status('HTML enrichi copié')});
function rtf(t){return '{\\rtf1\\ansi\\deff0\\uc1 '+[...t].map(ch=>{const cp=ch.codePointAt(0);if(ch==='\\'||ch==='{'||ch==='}')return '\\'+ch;if(ch==='\n')return '\\par\n';if(cp<128)return ch;return cp<=65535?'\\u'+(cp>32767?cp-65536:cp)+'?':Array.from(ch).map(c=>'\\u'+(c.codePointAt(0)%65536)+'?').join('')}).join('')+'}'}
action(exported,'Exporter en RTF…',()=>exportFile((filename?.value||'document.txt')+'.rtf',rtf(getText().text),'application/rtf'));
action(exported,'Exporter copie texte UTF-8…',()=>exportFile(filename?.value||'document.txt',getText().text,'text/plain;charset=utf-8'));
function manager(){
 const dialog=d.createElement('dialog');dialog.className='cmd-ext-dialog';const title=d.createElement('h3');title.textContent='Gestionnaire des modules d’extension CMDPad++';dialog.append(title);
 const note=d.createElement('p');note.textContent='Modules web intégrés. Les plugins DLL de Notepad++ ne fonctionnent pas dans un navigateur. Cette liste reflète seulement les modules chargés.';dialog.append(note);
 const list=[['MIME Tools',true],['Converter',true],['NppExport',true],['YARA-X',!!window.CMDPAD_YARA_READY],['Formats',!!window.CMDPAD_FORMATS_VISIBLE],['Encodages',!!window.CMDPAD_encodings],['Langages',!!window.CMDPAD_detectLanguage],['Images',!!window.CMDPAD_YARA_OPEN||!!window.CMDPAD_FORMATS_VISIBLE],['Tableaux CSV/TSV',!!window.CMDPAD_TABLES_READY],['Empreintes MD5/SHA',!!window.CMDPAD_HASH_ALGORITHMS]];
 for(const [name,present] of list){const p=d.createElement('p');p.textContent=(present?'✓ ':'○ ')+name+' — '+(present?'disponible':'chargement non confirmé');dialog.append(p)}
 action(dialog,'Fermer',()=>{dialog.close();dialog.remove()});d.body.append(dialog);dialog.showModal()
}
action(drop,'Gestionnaire des modules d’extension…',manager);
action(drop,'Choisir un dossier de modules à examiner…',()=>{
 const input=d.createElement('input');input.type='file';input.setAttribute('webkitdirectory','');input.multiple=true;
 input.onchange=()=>{const names=[...input.files].map(f=>f.webkitRelativePath||f.name);const dialog=d.createElement('dialog');dialog.className='cmd-ext-dialog';const h=d.createElement('h3');h.textContent='Dossier de modules ('+names.length+' fichiers)';dialog.append(h);const pre=d.createElement('pre');pre.style.cssText='max-height:55vh;overflow:auto;white-space:pre-wrap;word-break:break-word';pre.textContent=names.slice(0,800).join('\n')||'Aucun fichier';dialog.append(pre);action(dialog,'Fermer',()=>{dialog.close();dialog.remove()});d.body.append(dialog);dialog.showModal();status('Dossier parcouru, aucun code exécuté')};
 input.click()
});
const native=old.filter(x=>x.textContent.includes('Gestionnaire des modules CMDPad++'));
for(const b of old){if(!native.includes(b)){const label=b.textContent.trim();if(![...drop.querySelectorAll('button')].some(x=>x.textContent.trim()===label))drop.append(b)}}
window.CMDPAD_EXTENSION_MENU_READY=true;
})();
