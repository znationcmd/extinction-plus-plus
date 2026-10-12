/* CMDPad++ : classe les fonctionnalités dans les mêmes menus que Notepad++, sans retirer de commandes. */
(function(){
'use strict';
const d=document,bar=d.querySelector('.menubar'),area=d.getElementById('area'),file=d.getElementById('fileName');
if(!bar)return;
const menus=()=>[...bar.querySelectorAll(':scope>.menu')];
function get(label){return menus().find(m=>m.querySelector(':scope>button')?.textContent.trim().toLowerCase()===label.toLowerCase())}
function dropdown(label){return get(label)?.querySelector(':scope>.dropdown')}
function status(message){const s=d.getElementById('status');if(s)s.textContent=message}
function move(menuLabel,entries){const parent=get(menuLabel);if(!parent)return 0;let count=0;
for(const [selector,destination] of entries){const target=dropdown(destination),button=parent.querySelector(':scope>.dropdown '+selector);
if(!target||!button)continue;target.append(button);count++}
if(!parent.querySelector(':scope>.dropdown>button')&&!parent.querySelector(':scope>.dropdown>details'))parent.remove();return count}
move('Analyse',[['[data-cmdpad="validate"]','Outils'],['[data-cmdpad="correct"]','Outils'],['[data-cmdpad="formats"]','Outils'],['[data-cmdpad="saveall"]','Fichier']]);
move('Outils avancés',[['[data-adv="hash"]','Outils'],['[data-adv="encoding"]','Encodage'],['[data-adv="languages"]','Langage']]);
move('Tableaux',[['#cmdTableOpen','Outils']]);
move('Formats',[['#catalogAll','Outils'],['#catalogCurrent','Outils']]);
move('Langages +',[['#cmdpadLangChoose','Langage'],['#cmdpadLangAuto','Langage']]);
// Language A-Z: user requested the compact alphabetical submenu, with native language buttons preserved.
const langMenu=get('Langage'),languageDrop=dropdown('Langage');const groups=window.CMDPAD_LANGUAGES||[];
const entries=groups.flatMap(([category,raw])=>raw.split(';').map(entry=>{const [name,extensions]=entry.trim().split('|');return {category,name,extensions:(extensions||'').split(',').map(x=>x.trim()).filter(Boolean)}})).filter(v=>v.name);
const collator=new Intl.Collator('fr',{sensitivity:'base',numeric:true});
const unique=new Map();for(const entry of entries){const name=entry.name.toLocaleLowerCase('fr');if(!unique.has(name))unique.set(name,entry)}
const alphabetical=[...unique.values()].sort((a,b)=>collator.compare(a.name,b.name));
const initial=letter=>{let x=letter.toLocaleUpperCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'')[0]||'#';return /^[A-Z]$/.test(x)?x:'#'};
function selectLang(entry){const label=entry.name,ext=entry.extensions.join(', ');
try{localStorage.setItem('cmdpad-language:'+String(file?.value||'').toLowerCase(),label)}catch{}
window.CMDPAD_SELECTED_LANGUAGE=label;const select=d.getElementById('type');const choices=select?[...select.options]:[];
const option=choices.find(x=>x.value.toLowerCase()===label.toLowerCase().replace(/\s|[\/+]/g,'')||x.textContent.trim().toLowerCase()===label.toLowerCase());
if(option){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}))}
if(file)file.dispatchEvent(new Event('change',{bubbles:false}));
status('Langage : '+label+(ext?' ('+ext+')':'')+(option?' · mode pris en charge':' · identification par extension'));
for(const b of d.querySelectorAll('[data-cmd-lang]'))b.setAttribute('aria-checked',String(b.dataset.cmdLang===label));
}
if(langMenu&&languageDrop){
const native=d.createElement('details');native.className='cmd-lang-letter cmd-lang-native';const nativeLabel=d.createElement('summary');nativeLabel.textContent='Langages intégrés existants';native.append(nativeLabel);
for(const node of [...languageDrop.children])if(node.matches('button[data-type]'))native.append(node);
const existing=d.createElement('div');existing.className='cmd-language-tree';existing.id='cmdpadLanguageTree';
const current=d.createElement('p');current.className='cmd-language-current';current.textContent='Langages classés par lettre';existing.append(current);
const byLetter=new Map();for(const value of alphabetical){const key=initial(value.name);if(!byLetter.has(key))byLetter.set(key,[]);byLetter.get(key).push(value)}
for(const [letter,languages] of [...byLetter.entries()].sort((a,b)=>collator.compare(a[0],b[0]))){
 const details=d.createElement('details');details.className='cmd-lang-letter';const summary=d.createElement('summary');summary.textContent=letter+'  › ('+languages.length+')';details.append(summary);
 for(const entry of languages){const b=d.createElement('button');b.type='button';b.dataset.cmdLang=entry.name;b.setAttribute('role','menuitemradio');b.setAttribute('aria-checked','false');b.title='Extensions : '+entry.extensions.map(x=>'.'+x).join(', ')+' | '+entry.category;b.textContent=entry.name;b.onclick=e=>{e.stopPropagation();selectLang(entry);langMenu.classList.remove('open')};details.append(b)}
 existing.append(details);
}
const custom=d.createElement('button');custom.type='button';custom.textContent='Définir un langage personnalisé…';custom.onclick=e=>{e.stopPropagation();editCustom()};existing.append(custom);
languageDrop.prepend(existing);languageDrop.append(native);
const search=d.createElement('input');search.type='search';search.placeholder='Rechercher un langage…';search.className='cmd-language-filter';search.setAttribute('aria-label','Recherche de langue par nom ou extension');languageDrop.prepend(search);
search.addEventListener('input',()=>{
const value=search.value.toLocaleLowerCase('fr').trim();for(const group of existing.querySelectorAll('details.cmd-lang-letter')){
let visible=0;for(const button of group.querySelectorAll('[data-cmd-lang]')){const present=!value||button.textContent.toLocaleLowerCase('fr').includes(value)||button.title.toLocaleLowerCase('fr').includes(value);button.hidden=!present;if(present)visible++}
group.hidden=!!value&&!visible;if(value&&visible)group.open=true;if(!value)group.open=false}});
}
function editCustom(){const label=prompt('Nom du langage personnalisé :');if(!label)return;const text=prompt('Extensions séparées par des virgules, sans point :','custom')||'';
const item={name:label.trim(),category:'Personnalisé',extensions:text.split(',').map(x=>x.trim().replace(/^\./,'')).filter(x=>/^[a-z0-9_-]+$/i.test(x))};
if(!item.name)return;try{const saved=JSON.parse(localStorage.getItem('cmdpad-custom-languages')||'[]');saved.push(item);localStorage.setItem('cmdpad-custom-languages',JSON.stringify(saved))}catch{}
selectLang(item);status('Langage personnalisé «'+item.name+'» enregistré sur cet appareil (association d’extensions uniquement, pas de coloration personnalisée).')}
const macro=get('Macro'),macroDrop=dropdown('Macro');
if(macro&&macroDrop){
for(const disabled of macroDrop.querySelectorAll('button[disabled]'))disabled.remove();
let recording=false,playing=false,steps=[],stored=null;
const load=()=>{try{return JSON.parse(localStorage.getItem('cmdpad-macro-v1')||'null')}catch{return null}};
stored=load();
function add(label,handler){const b=d.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{macro.classList.remove('open');handler()};macroDrop.append(b);return b}
add('● Démarrer l’enregistrement',()=>{if(!area)return;steps=[];recording=true;area.focus();status('Macro : enregistrement de la saisie et des suppressions démarré')});
add('■ Arrêter l’enregistrement',()=>{recording=false;stored=steps.slice();try{localStorage.setItem('cmdpad-macro-v1',JSON.stringify(stored))}catch{}status('Macro : '+steps.length+' opération(s) enregistrée(s) sur cet appareil')});
add('▶ Rejouer la macro',()=>{const commands=stored||load();if(!area||!commands?.length)return status('Aucune macro enregistrée');playing=true;
try{for(const item of commands){const start=area.selectionStart,end=area.selectionEnd;if(item.type==='insertText'||item.type==='insertLineBreak'||item.type==='insertFromPaste'){area.setRangeText(item.data??'',start,end,'end')}
else if(item.type==='deleteContentBackward'){area.setRangeText('',start===end?Math.max(0,start-1):start,end,'start')}
else if(item.type==='deleteContentForward'){area.setRangeText('',start,start===end?Math.min(area.value.length,end+1):end,'start')}
else continue;area.dispatchEvent(new Event('input',{bubbles:true}))}status('Macro : '+commands.length+' opération(s) rejouée(s)')}finally{playing=false}});
add('✕ Effacer la macro enregistrée',()=>{recording=false;steps=[];stored=null;try{localStorage.removeItem('cmdpad-macro-v1')}catch{}status('Macro effacée')});
area?.addEventListener('beforeinput',e=>{if(!recording||playing)return;if(['insertText','insertLineBreak','insertFromPaste','deleteContentBackward','deleteContentForward'].includes(e.inputType))steps.push({type:e.inputType,data:e.data|| (e.inputType==='insertLineBreak'?'\n':'')})});
}
const plugins=get('Plugins'),pluginsDrop=dropdown('Plugins');
if(plugins&&pluginsDrop){
const b=d.createElement('button');b.type='button';b.textContent='Gestionnaire des modules CMDPad++…';pluginsDrop.append(b);b.onclick=()=>{
plugins.classList.remove('open');const dialog=d.createElement('dialog');dialog.className='cmd-plugins-dialog';d.body.append(dialog);
const h=d.createElement('h3');h.textContent='Modules CMDPad++';dialog.append(h);
const list=[['Fichiers et validateurs',window.CMDPAD_WEBTOOLS_READY],['Tableaux CSV / TSV',window.CMDPAD_TABLES_READY],['Empreintes MD5 / SHA',window.CMDPAD_HASH_ALGORITHMS?.length],['Outils avancés',window.CMDPAD_ADVANCED_READY],['Encodages',window.CMDPAD_ENCODINGS_READY],['Langages',window.CMDPAD_detectLanguage],['Images',!!d.querySelector('[title*="Retouche"]')],['YARA-X',window.CMDPAD_YARA_READY]];
for(const [label,ready] of list){const p=d.createElement('p');p.textContent=(ready?'✓ ':'○ ')+label+' — '+(ready?'module chargé':'disponibilité à vérifier');dialog.append(p)}
const close=d.createElement('button');close.textContent='Fermer';close.onclick=()=>{dialog.close();dialog.remove()};dialog.append(close);dialog.showModal()};
}
window.CMDPAD_MENUS_ORGANIZED=true;
})();
