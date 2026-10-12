/* CMDPad++ language selector. Recognition and documentation, not a compiler. */
(function(){
'use strict';
const groups=window.CMDPAD_LANGUAGES||[],d=document,bar=d.querySelector('.menubar'),area=d.getElementById('area'),file=d.getElementById('fileName');
if(!bar||!area||!file)return;
const langs=groups.flatMap(([category,rows])=>rows.split(';').map(row=>{const [name,exts]=row.split('|');return {category,name,extensions:(exts||'').split(',')}}).filter(x=>x.name));
const byExt=new Map();for(const l of langs)for(const extension of l.extensions){if(!byExt.has(extension))byExt.set(extension,l)}
const selected=new Map();let manual=null;
function detect(filename){const name=String(filename||'').split(/[\\/]/).pop().toLowerCase();return selected.get(name)||byExt.get(name)||byExt.get(name.includes('.')?name.split('.').pop():'')||null}
function current(){return manual||detect(file.value)}
function status(message){const e=d.getElementById('status');if(e)e.textContent=message}
const menu=d.createElement('div');menu.className='menu';
menu.innerHTML='<button type="button">Langages +</button><div class="dropdown"><button id="cmdpadLangChoose">Choisir parmi les langages...</button><button id="cmdpadLangAuto">Détection automatique par extension</button></div>';
bar.append(menu);
menu.firstElementChild.onclick=e=>{e.stopPropagation();menu.classList.toggle('open');const r=e.target.getBoundingClientRect(),dropdown=menu.querySelector('.dropdown');dropdown.style.left=Math.max(5,Math.min(innerWidth-230,r.left))+'px';dropdown.style.top=r.bottom+'px'};
const dialog=d.createElement('dialog');dialog.style.cssText='width:min(750px,95vw);max-height:85vh;overflow:auto;border:1px solid #9aaac2;background:white;color:#18243c;border-radius:7px;padding:16px';d.body.append(dialog);
const title=d.createElement('h3');title.textContent='CMDPad++ — Langages, grammaires et extensions';dialog.append(title);
const note=d.createElement('p');note.textContent='La sélection identifie le langage du fichier. Elle ne garantit pas une compilation, coloration ou validation propre à ce langage.';dialog.append(note);
const search=d.createElement('input');search.placeholder='Rechercher un langage ou une extension';search.style.cssText='width:100%;padding:10px;margin-bottom:10px;border:1px solid #aaa';dialog.append(search);
const rows=d.createElement('div');rows.style.cssText='max-height:55vh;overflow:auto';dialog.append(rows);
const close=d.createElement('button');close.textContent='Fermer';close.onclick=()=>dialog.close();dialog.append(close);
function render(){rows.replaceChildren();const q=search.value.toLowerCase().trim();const matches=langs.filter(l=>!q||[l.name,l.category,...l.extensions].join(' ').toLowerCase().includes(q));for(const x of matches){const b=d.createElement('button');b.type='button';b.style.cssText='display:block;width:100%;padding:7px;border:0;border-bottom:1px solid #ddd;background:white;color:#17253b;text-align:left;cursor:pointer';b.textContent=x.name+' ('+x.extensions.map(e=>'.'+e).join(', ')+') — '+x.category;b.onclick=()=>{manual=x;selected.set(file.value.toLowerCase(),x);status('Langage sélectionné : '+x.name+' (grammaire reconnue; outils spécialisés selon disponibilité)');dialog.close()};rows.append(b)}}
search.oninput=render;
menu.querySelector('#cmdpadLangChoose').onclick=()=>{menu.classList.remove('open');search.value='';render();dialog.showModal()};
menu.querySelector('#cmdpadLangAuto').onclick=()=>{menu.classList.remove('open');manual=null;const l=detect(file.value);status(l?'Langage détecté : '+l.name:'Aucun langage reconnu; mode texte brut')};
file.addEventListener('change',()=>{manual=null});
const badge=d.createElement('button');badge.type='button';badge.className='toolbtn';badge.textContent='🌐 Langages';badge.title=langs.length+' langages, choix manuel et auto';badge.onclick=()=>{search.value='';render();dialog.showModal()};const toolbar=d.querySelector('.toolbar');toolbar?.insertBefore(badge,toolbar.querySelector('.actions'));
window.CMDPAD_detectLanguage=detect;
})();
