/* CMDPad++ supplemental offline validators. They never execute or upload edited files. */
(function(){
'use strict';
function issue(message,line=null,column=null,severity='erreur'){return {severity,message,line,column}}
function result(notes=[],issues=[],level='partiel'){return {issues,notes,level}}
function pos(message,source){const m=String(message).match(/position\s+(\d+)/i);if(!m)return {line:null,column:null};const p=source.slice(0,Number(m[1])).split(/\r?\n/);return {line:p.length,column:p[p.length-1].length+1}}
function stripJSONComments(source){
 let out='',inString=false,escaped=false,line=false,block=false;
 for(let i=0;i<source.length;i++){const c=source[i],n=source[i+1];
  if(line){if(c==='\n'||c==='\r'){line=false;out+=c}else out+=' ';continue}
  if(block){if(c==='*'&&n==='/'){out+='  ';i++;block=false}else out+=(c==='\n'||c==='\r'?c:' ');continue}
  if(inString){out+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue}
  if(c==='"'){inString=true;out+=c;continue}
  if(c==='/'&&n==='/'){out+='  ';i++;line=true;continue}
  if(c==='/'&&n==='*'){out+='  ';i++;block=true;continue}
  out+=c;
 }
 if(block)throw Error('Commentaire de bloc non terminé');
 let fixed='',quoted=false,escape=false;
 for(let i=0;i<out.length;i++){const c=out[i];if(quoted){fixed+=c;if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue}
  if(c==='"'){quoted=true;fixed+=c;continue}
  if(c===','){let k=i+1;while(k<out.length&&/\s/.test(out[k]))k++;if(out[k]===']'||out[k]==='}'){fixed+=' ';continue}}
  fixed+=c;
 }return fixed;
}
function parseJSON(source,transform=false){const text=transform?stripJSONComments(source):source;try{return {value:JSON.parse(text),issues:[]}}catch(err){const p=pos(err.message,text);return {value:null,issues:[issue(err.message,p.line,p.column)]}}}
function checkPairs(source,open,close,notes,issues){
 let stack=[],quoted='',escaped=false,lineComment=false,blockComment=false;
 for(let i=0,line=1,col=1;i<source.length;i++,col++){
  const c=source[i],n=source[i+1];
  if(c==='\n'){line++;col=0;lineComment=false;if(quoted==="'"){}}
  if(lineComment)continue;
  if(blockComment){if(c==='*'&&n==='/'){blockComment=false;i++;col++}continue}
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quoted)quoted='';continue}
  if(c==='/'&&n==='*'){blockComment=true;i++;col++;continue}
  if(c==='/'&&n==='/'&&open!=='{'){lineComment=true;i++;col++;continue}
  if(c==='"'||c==="'"){quoted=c;continue}
  if(c===open)stack.push({line,col});
  if(c===close){if(stack.length)stack.pop();else issues.push(issue('Délimiteur '+close+' inattendu',line,col))}
 }
 if(blockComment)issues.push(issue('Commentaire de bloc non terminé'));
 for(const p of stack.slice(0,10))issues.push(issue('Délimiteur '+open+' sans fermeture '+close,p.line,p.col));
 if(quoted)notes.push('Chaîne ou littéral non terminé, vérifier la syntaxe complète.');
}
function run(source,ext){
 const e=String(ext||'').toLowerCase(),notes=[],issues=[];let level='partiel';
 if(['jsonc','json5'].includes(e)){
  if(e==='json5')return result(['JSON5 : syntaxe étendue non entièrement prise en charge ; vérification indicative uniquement.']);
  try{const x=parseJSON(source,true);issues.push(...x.issues);if(!issues.length){level='vérifié';notes.push('Syntaxe JSON avec commentaires et virgules finales vérifiée.')}}catch(err){issues.push(issue(err.message))}
 }
 else if(['jsonl','ndjson'].includes(e)){
  let checked=0;source.split(/\r?\n/).forEach((row,i)=>{if(!row.trim())return;checked++;try{JSON.parse(row)}catch(err){issues.push(issue('JSON ligne '+(i+1)+' : '+err.message,i+1,1))}});if(!issues.length){level='vérifié';notes.push(checked+' ligne(s) JSON vérifiées.')}
 }
 else if(['geojson','webmanifest','ipynb'].includes(e)){
  const x=parseJSON(source);issues.push(...x.issues);if(!issues.length){
   if(e==='geojson'&&(!x.value||typeof x.value!=='object'||Array.isArray(x.value)||typeof x.value.type!=='string'))issues.push(issue('Objet GeoJSON : propriété type manquante'));
   if(e==='ipynb'&&(!x.value||!Array.isArray(x.value.cells)))issues.push(issue('Notebook : tableau cells absent'));
   level='partiel';notes.push('JSON vérifié. Schéma '+e.toUpperCase()+' non entièrement validé.');
  }
 }
 else if(['yaml','yml'].includes(e)){
  source.split(/\r?\n/).forEach((row,i)=>{if(/^\t+/.test(row))issues.push(issue('Indentation YAML avec tabulation',i+1,1));if(/^\s*[^#\s][^\n]*:\s*$/.test(row))return});
  notes.push('Contrôle d’indentation YAML uniquement : un parseur YAML complet est nécessaire pour certifier la syntaxe.');
 }
 else if(e==='toml'){
  let section='',seen=new Set();
  source.split(/\r?\n/).forEach((row,i)=>{const s=row.trim();if(!s||s.startsWith('#'))return;
   if(/^\[\[?[^\[\]]+\]\]?$/.test(s)){section=s;seen=new Set();return}
   const m=s.match(/^([A-Za-z0-9_.-]+)\s*=/);if(!m){issues.push(issue('Entrée TOML non reconnue (contrôle partiel)',i+1,1,'avertissement'));return}
   if(seen.has(m[1]))issues.push(issue('Clé TOML répétée dans '+(section||'racine')+' : '+m[1],i+1,1));
   seen.add(m[1]);
  });notes.push('Contrôle partiel TOML : clés, sections et doublons. Pas de certification TOML 1.0.');
 }
 else if(['css','scss','sass','less'].includes(e)){
  checkPairs(source,'{','}',notes,issues);
  notes.push('Vérification des accolades/commentaires seulement, pas des propriétés CSS ni du préprocesseur.');
 }
 else if(['sql','graphql','gql','hcl','tf','tfvars'].includes(e)){
  checkPairs(source,'(',')',notes,issues);
  notes.push('Contrôle des parenthèses/commentaires uniquement. Schéma et dialecte non validés.');
 }
 else if(['md','markdown','mdx'].includes(e)){
  const fences=source.split(/\r?\n/).filter(s=>/^\s*(?:\x60{3,}|~{3,})/.test(s));if(fences.length%2)issues.push(issue('Bloc de code Markdown non refermé'));
  notes.push('Contrôle partiel des blocs Markdown ; liens et extensions non vérifiés.');
 }
 else return null;
 return result(notes,issues,level);
}
window.CMDPAD_validateExtra=run;
window.CMDPAD_VALIDATORS_EXTRA_READY=true;
})();