/* CMDPad++ — menu Affichage organisé sur le modèle Notepad++.
   Chaque action est réellement liée à une vue; aucune modification destructive du document. */
(function(){
'use strict';
const d=document,area=d.getElementById('area'),bar=d.querySelector('.menubar');
if(!area||!bar||window.CMDPAD_VIEW_MENU_READY)return;
const m=[...bar.querySelectorAll(':scope>.menu')].find(x=>x.querySelector(':scope>button')?.textContent.trim()==='Affichage');
const drop=m?.querySelector(':scope>.dropdown');
if(!drop)return;
const status=s=>{const e=d.getElementById('status');if(e)e.textContent=s};
const shell=d.querySelector('.editor-shell'),work=d.querySelector('.workspace'),main=d.querySelector('.main');
const by=id=>d.getElementById(id);
const src={};for(const b of [...drop.querySelectorAll(':scope>button[data-action]')])src[b.dataset.action]=b;
drop.replaceChildren();
function group(name){
 const details=d.createElement('details');details.className='cmd-view-group';
 const sum=d.createElement('summary');sum.textContent=name+'  ›';details.append(sum);
 const fly=d.createElement('div');fly.className='cmd-view-flyout';details.append(fly);drop.append(details);
 let openTimer=null;
 const open=()=>{for(const other of drop.querySelectorAll('details.cmd-view-group'))if(other!==details){other.open=false;other.classList.remove('cmd-view-open')}
   details.open=true;details.classList.add('cmd-view-open');const r=sum.getBoundingClientRect(),parent=drop.getBoundingClientRect();const w=255;
   fly.style.left=Math.round(parent.right+w+4>innerWidth?Math.max(3,parent.left-w+3):parent.right-2)+'px';
   fly.style.top=Math.round(Math.min(r.top,innerHeight-100))+'px';
   fly.style.maxHeight=Math.round(Math.max(140,innerHeight-Math.min(r.top,innerHeight-100)-12))+'px';
 };
 sum.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')open()});
 sum.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();details.open&&!details.classList.contains('cmd-view-open')?open():details.classList.contains('cmd-view-open')?(details.open=false,details.classList.remove('cmd-view-open')):open()});
 details.addEventListener('pointerleave',()=>{clearTimeout(openTimer);openTimer=setTimeout(()=>{details.open=false;details.classList.remove('cmd-view-open')},230)});
 fly.addEventListener('pointerenter',()=>clearTimeout(openTimer));
 return fly;
}
function item(parent,label,fn){
 const b=d.createElement('button');b.type='button';b.textContent=label;
 b.onclick=()=>{fn();m.classList.remove('open');for(const v of drop.querySelectorAll('details'))v.open=false};
 parent.append(b);return b;
}
function original(parent,key,label){const button=src[key];if(!button)return;button.textContent=label;parent.append(button)}
function toggle(id,name){const e=by(id);if(!e)return status(name+' indisponible');const visible=getComputedStyle(e).display!=='none'&&!e.hidden;
 e.hidden=false;e.style.display=visible?'none':'';status(name+(visible?' masqué':' affiché'))}
const panels=group('Panneaux');
original(panels,'toggleSide','Explorateur de fichiers');
item(panels,'Liste des fonctions',()=>{if(!by('cmdpadFnPanel')||!work)return status('Liste des fonctions indisponible');const shown=work.classList.contains('fn-show')&&!work.classList.contains('fn-hidden');work.classList.toggle('fn-show',!shown);work.classList.toggle('fn-hidden',shown);status('Liste des fonctions '+(shown?'masquée':'affichée'))});
item(panels,'Carte du document (minimap)',()=>toggle('minimap','Carte du document'));
item(panels,'Barre de recherche',()=>{const e=d.querySelector('.findgrid');if(!e)return;const hidden=e.style.display==='none';e.style.display=hidden?'':'none';status('Recherche '+(hidden?'affichée':'masquée'))});
item(panels,'Barre d’état',()=>{const e=d.querySelector('.status');if(!e)return;const hidden=e.style.display==='none';e.style.display=hidden?'':'none';status('Barre d’état '+(hidden?'affichée':'masquée'))});
item(panels,'Barre d’outils',()=>{const e=d.querySelector('.toolbar');if(!e)return;const hidden=e.style.display==='none';e.style.setProperty('display',hidden?'flex':'none','important');status('Barre d’outils '+(hidden?'affichée':'masquée'))});
const zoom=group('Zoom');
original(zoom,'zoomIn','Agrandir   Ctrl + +');
original(zoom,'zoomOut','Réduire   Ctrl + −');
original(zoom,'zoomReset','Taille normale   Ctrl + 0');
const layout=group('Disposition du texte');
original(layout,'wrap','Retour à la ligne automatique');
item(layout,'Afficher / masquer les numéros de ligne',()=>toggle('lines','Numéros de ligne'));
item(layout,'Faire défiler le texte jusqu’à la sélection',()=>{area.focus();const txt=area.value.slice(0,area.selectionStart),line=txt.split('\n').length-1;const height=parseFloat(getComputedStyle(area).lineHeight)||19;area.scrollTop=Math.max(0,line*height-area.clientHeight/2);status('Ligne '+(line+1)+' visible')});
const symbols=group('Afficher les symboles');
let preview=null,previewMode=null;
function showSymbols(mode){
 if(!preview){preview=d.createElement('section');preview.id='cmdpadSymbolPreview';
 const top=d.createElement('div');top.className='cmd-symbol-heading';const h=d.createElement('strong');h.textContent='Aperçu des caractères invisibles (sans modifier le fichier)';top.append(h);
 const close=d.createElement('button');close.textContent='×';close.type='button';close.onclick=()=>showSymbols(null);top.append(close);
 const pre=d.createElement('pre');pre.id='cmdpadSymbolText';preview.append(top,pre);
 shell?.insertAdjacentElement('afterend',preview);
 }
 previewMode=mode;preview.hidden=!mode;
 if(!mode){status('Aperçu des symboles masqué');return}
 renderSymbols();status('Aperçu des symboles : '+mode);
}
function renderSymbols(){
 if(!preview||!previewMode)return;
 const text=area.value;let transformed=text;
 if(previewMode==='espaces'||previewMode==='tous'||previewMode==='indentation'){
  transformed=transformed.replace(/\t/g,'→   ');
  if(previewMode==='indentation')transformed=transformed.split('\n').map(line=>line.replace(/^( +)/,(_,s)=>'│'.repeat(s.length))+line.slice((line.match(/^ +/)||[''])[0].length)).join('\n');
  else transformed=transformed.replace(/ /g,'·');
 }
 if(previewMode==='fins'||previewMode==='tous')transformed=transformed.replace(/\n/g,'↵\n')+' ⏹';
 by('cmdpadSymbolText').textContent=transformed.slice(0,250000)+(transformed.length>250000?'\n… aperçu limité à 250 000 caractères':'');
}
item(symbols,'Afficher les espaces et tabulations',()=>showSymbols('espaces'));
item(symbols,'Afficher les fins de ligne',()=>showSymbols('fins'));
item(symbols,'Afficher tous les symboles',()=>showSymbols('tous'));
item(symbols,'Afficher les guides d’indentation',()=>showSymbols('indentation'));
item(symbols,'Masquer l’aperçu des symboles',()=>showSymbols(null));
area.addEventListener('input',renderSymbols);
const display=group('Mode d’affichage');
original(display,'fullscreen','Plein écran   F11');
item(display,'Mode concentration (sans panneaux)',()=>{
 const on=work?.classList.toggle('cmd-view-focus');const files=by('sidePane'),fn=by('cmdpadFnPanel'),find=d.querySelector('.findgrid');
 if(files)files.style.display=on?'none':'';
 if(fn)fn.style.display=on?'none':'';
 if(find)find.style.display=on?'none':'';
 if(work)work.style.gridTemplateColumns=on?'minmax(0,1fr)':'';
 status('Mode concentration '+(on?'activé':'désactivé'))});
const info=group('Informations');
item(info,'Statistiques du document',()=>{
 const text=area.value,chars=text.length,lines=text.split('\n').length,words=(text.match(/\S+/g)||[]).length,bytes=new TextEncoder().encode(text).length;
 const details='Fichier : '+(by('fileName')?.value||'sans titre')+'\nLignes : '+lines+'\nMots : '+words+'\nCaractères : '+chars+'\nTaille UTF-8 estimée : '+bytes+' octets';
 const dialog=d.createElement('dialog');dialog.className='cmd-view-dialog';const pre=d.createElement('pre');pre.textContent=details;dialog.append(pre);item(dialog,'Fermer',()=>{dialog.close();dialog.remove()});d.body.append(dialog);dialog.showModal();
});
item(drop,'Afficher les préférences de présentation…',()=>{const menu=[...bar.querySelectorAll(':scope>.menu')].find(x=>x.querySelector(':scope>button')?.textContent.trim()==='Paramètres');const prefs=[...menu?.querySelectorAll('button')||[]].find(x=>x.textContent.includes('Préférences de l’éditeur'));prefs?.click()});
const settings=[...bar.querySelectorAll(':scope>.menu')].find(x=>x.querySelector(':scope>button')?.textContent.trim()==='Paramètres');
const sd=settings?.querySelector(':scope>.dropdown');
if(sd&&src.theme){src.theme.textContent='Thème clair / sombre';sd.append(src.theme)}
window.CMDPAD_VIEW_MENU_READY=true;
})();