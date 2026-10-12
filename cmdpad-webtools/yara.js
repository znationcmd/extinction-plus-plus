/* CMDPad++ YARA-X : compilation de règles et analyse locale de fichiers, sans exécuter le fichier. */
(function(){
'use strict';
const d=document,menubar=d.querySelector('.menubar');if(!menubar)return;
const group=[...menubar.querySelectorAll(':scope>.menu')].find(m=>m.querySelector(':scope>button')?.textContent.trim()==='Outils');
if(!group)return;
const drop=group.querySelector(':scope>.dropdown');if(!drop)return;
const launch=d.createElement('button');launch.type='button';launch.id='cmdpadYaraOpen';launch.textContent='YARA — analyser des fichiers avec des règles…';drop.append(launch);
const dialog=d.createElement('dialog');dialog.className='cmd-yara-dialog';dialog.style.cssText='width:min(960px,96vw);max-height:88vh;overflow:auto;padding:16px;border:1px solid #a6b4c8;border-radius:9px;background:#fff;color:#17243a';d.body.append(dialog);
const heading=d.createElement('h3');heading.textContent='YARA-X · Analyse de fichiers';dialog.append(heading);
const intro=d.createElement('p');intro.textContent='Compile une règle YARA et cherche ses correspondances dans un fichier. Le moteur est chargé à la demande. Le fichier reste sur cet appareil. Un résultat YARA ne prouve pas, à lui seul, la présence de logiciel malveillant.';dialog.append(intro);
const label=d.createElement('label');label.textContent='Règles YARA (.yar ou .yara)';label.style.cssText='display:block;font-weight:bold';dialog.append(label);
const ruleText=d.createElement('textarea');ruleText.id='cmdpadYaraRule';ruleText.rows=11;ruleText.spellcheck=false;ruleText.style.cssText='display:block;box-sizing:border-box;width:100%;margin:6px 0;padding:9px;font:12px/1.5 Consolas,monospace;background:white;color:#17243a;border:1px solid #aebaca';
ruleText.value='rule PDF_Header {\\n  strings:\\n    $pdf = { 25 50 44 46 }\\n  condition:\\n    $pdf at 0\\n}';
ruleText.value=ruleText.value.replace(/\\n/g,'\n');dialog.append(ruleText);
const controls=d.createElement('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin:8px 0';dialog.append(controls);
const add=(text,fn)=>{const b=d.createElement('button');b.type='button';b.textContent=text;b.style.cssText='border:1px solid #b1bfd3;background:#eff5ff;color:#17243a;border-radius:4px;padding:7px 10px;cursor:pointer';b.onclick=fn;controls.append(b);return b};
const fileInput=d.createElement('input');fileInput.type='file';fileInput.style.cssText='max-width:100%;padding:7px;border:1px solid #ccc';dialog.append(fileInput);
const status=d.createElement('p');status.id='cmdYaraStatus';status.textContent='Sélectionne un fichier et clique sur Analyser.';dialog.append(status);
const results=d.createElement('pre');results.style.cssText='max-height:34vh;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#f2f6fc;border:1px solid #d8e3ee;padding:10px;font:12px/1.5 Consolas,monospace';dialog.append(results);
let enginePromise=null,report=null;
async function loadEngine(){if(!enginePromise){enginePromise=(async()=>{
 const api=await import('https://esm.sh/@virustotal/yara-x@1.20.0?bundle');
 const init=api.default||api.init;
 if(typeof init!=='function'||typeof api.Compiler!=='function')throw Error('API du module YARA-X indisponible');
 await init();window.CMDPAD_YARA_ENGINE_READY=true;return api;
 })().catch(e=>{enginePromise=null;throw e})}return enginePromise}
add('Importer règles .yar',()=>{const f=d.createElement('input');f.type='file';f.accept='.yar,.yara,.txt';f.onchange=async()=>{const item=f.files?.[0];if(!item)return;if(item.size>1024*1024){status.textContent='Règles trop volumineuses (1 Mo maximum)';return}ruleText.value=await item.text();status.textContent='Règles chargées : '+item.name};f.click()});
add('Vérifier les règles',async()=>{await run(true)});
add('Analyser le fichier',async()=>{await run(false)});
add('Exporter le rapport JSON',()=>{if(!report){status.textContent='Aucun rapport à exporter';return}const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=d.createElement('a');a.href=u;a.download=(report.file||'rules')+'.yara.json';d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)});
add('Fermer',()=>dialog.close());
async function run(onlyCheck){
 const file=fileInput.files?.[0];results.textContent='';
 if(ruleText.value.length>1024*1024){status.textContent='Règles trop volumineuses';return}
 if(!onlyCheck&&!file){status.textContent='Choisis un fichier à analyser';return}
 if(!onlyCheck&&file.size>20*1024*1024){status.textContent='Fichier supérieur à la limite d’analyse en mémoire de 20 Mo';return}
 let compiler=null,rules=null;
 try{
 status.textContent='Chargement du moteur officiel YARA-X (WebAssembly)…';const api=await loadEngine();
 compiler=new api.Compiler();compiler.addSource(ruleText.value);
 const errors=compiler.errors||[],warnings=compiler.warnings||[];
 if(errors.length){status.textContent='Erreurs de compilation dans les règles';results.textContent=errors.join('\n');return}
 rules=compiler.build();
 if(onlyCheck){status.textContent='Règles compilées. Analyse non lancée.';results.textContent=(warnings.length?warnings.join('\n'):'Aucun avertissement retourné par le compilateur.');return}
 status.textContent='Analyse locale de '+file.name+' en cours…';
 const bytes=new Uint8Array(await file.arrayBuffer());
 let outcome;if(typeof rules.scanner==='function'){
   const scanner=rules.scanner();try{if(scanner.setTimeoutMs)scanner.setTimeoutMs(4000);if(scanner.setMaxMatchesPerPattern)scanner.setMaxMatchesPerPattern(50);outcome=scanner.scan(bytes)}finally{scanner.free?.()}
 }else outcome=rules.scan(bytes);
 const hits=(outcome.matches||[]).map(m=>({rule:m.identifier||m.name,namespace:m.namespace,tags:m.tags||[],patterns:(m.patterns||[]).map(p=>({identifier:p.identifier,matches:(p.matches||[]).slice(0,100).map(v=>({offset:v.offset,length:v.length}))}))}));
 report={tool:'YARA-X',file:file.name,bytes:file.size,checkedAt:new Date().toISOString(),valid:!!outcome.valid,matched: hits.length,rules:hits,warnings:[...warnings,...(outcome.warnings||[])],note:'Une correspondance ne prouve pas un logiciel malveillant.'};
 status.textContent='Analyse terminée : '+hits.length+' règle(s) correspondante(s)';
 results.textContent=JSON.stringify(report,null,2);
 }catch(err){report=null;status.textContent='YARA-X indisponible ou règle invalide : '+(err.message||err);results.textContent='Le moteur WASM nécessite un chargement réseau autorisé par le navigateur. Aucun résultat d’analyse n’est revendiqué.'}
 finally{try{rules?.free()}catch{}try{compiler?.free()}catch{}}
}
launch.onclick=e=>{e.stopPropagation();group.classList.remove('open');dialog.showModal()};
window.CMDPAD_YARA_READY=true;window.CMDPAD_YARA_OPEN=()=>dialog.showModal();
})();