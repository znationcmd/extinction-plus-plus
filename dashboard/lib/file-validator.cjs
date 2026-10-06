const { SaxesParser } = require('saxes');
const MAX_BYTES = 5 * 1024 * 1024;

function cleanBase(input){
 const original=String(input??'');
 let text=original,fixes=[];
 if(text.charCodeAt(0)===0xFEFF){text=text.slice(1);fixes.push('BOM UTF-8 retiré.');}
 const normalized=text.replace(/\r\n?/g,'\n').replace(/\u0000/g,'');
 if(normalized!==text){text=normalized;fixes.push('Fins de ligne / caractères NUL normalisés.');}
 return {text,fixes,changed:text!==original};
}
function jsonRepair(source){
 const base=cleanBase(source);let s=base.text,fixes=[...base.fixes];
 let out='',str=false,esc=false,line=false,block=false,removedComments=false;
 for(let i=0;i<s.length;i++){
  const c=s[i],n=s[i+1];
  if(line){if(c==='\n'){line=false;out+=c}else removedComments=true;continue}
  if(block){if(c==='*'&&n==='/'){block=false;i++;removedComments=true}continue}
  if(str){out+=c;if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue}
  if(c==='"'){str=true;out+=c;continue}
  if(c==='/'&&n==='/'){line=true;i++;removedComments=true;continue}
  if(c==='/'&&n==='*'){block=true;i++;removedComments=true;continue}
  out+=c;
 }
 if(removedComments)fixes.push('Commentaires JSON non standard retirés.');
 s=out;out='';str=false;esc=false;let removedComma=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(str){out+=c;if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue}
  if(c==='"'){str=true;out+=c;continue}
  if(c===','){
   let j=i+1;while(j<s.length&&/\s/.test(s[j]))j++;
   if(s[j]==='}'||s[j]===']'){removedComma=true;continue}
  }
  out+=c;
 }
 if(removedComma)fixes.push('Virgules finales JSON retirées.');
 try{
  const parsed=JSON.parse(out);
  const pretty=JSON.stringify(parsed,null,2)+'\n';
  if(pretty!==out){out=pretty;fixes.push('JSON reformaté.');}
  return {ok:true,text:out,fixes,changed:out!==source};
 }catch(e){return {ok:false,text:out,fixes,changed:out!==source,error:e}}
}
function xmlSyntax(source){
 const parser=new SaxesParser({xmlns:false});let error=null;
 parser.on('error',e=>{if(!error)error={error:e.message.replace(/^\d+:\d+: /,''),line:parser.line,column:parser.column};});
 parser.on('doctype',()=>{if(!error)error={error:'Les déclarations DOCTYPE et les entités personnalisées ne sont pas acceptées.',line:parser.line,column:parser.column};});
 try{parser.write(source).close();}catch(e){if(!error)error={error:e.message,line:parser.line,column:parser.column};}
 return error;
}
function xmlRepair(source){
 const base=cleanBase(source);let text=base.text,fixes=[...base.fixes];
 const escaped=text.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g,'&amp;');
 if(escaped!==text){text=escaped;fixes.push('Esperluettes XML non échappées converties en &amp;.');}
 const error=xmlSyntax(text);
 return {ok:!error,text,fixes,changed:text!==source,error};
}
function iniRepair(source){
 const base=cleanBase(source),fixes=[...base.fixes],warnings=[],seen=new Map();let section='',bad=null,changed=base.changed;
 const lines=base.text.split('\n').map((raw,index)=>{
  const line=raw.trimEnd(),trim=line.trim();
  if(!trim||trim.startsWith(';')||trim.startsWith('#'))return line;
  if(/^\[[^\]]+\]$/.test(trim)){section=trim.slice(1,-1).trim();const clean='['+section+']';if(clean!==line){changed=true;fixes.push('Espaces de section INI normalisés.');}return clean}
  const eq=line.indexOf('=');
  if(eq<1){bad={error:'Ligne INI invalide : clé=valeur attendue.',line:index+1,column:1};return line}
  const key=line.slice(0,eq).trim(),value=line.slice(eq+1).trim();
  if(!key){bad={error:'Clé INI vide.',line:index+1,column:1};return line}
  const id=section+'\u0000'+key.toLowerCase();if(seen.has(id))warnings.push(`Ligne ${index+1} : clé en double « ${key} » dans [${section||'global'}].`);seen.set(id,index+1);
  const clean=key+'='+value;if(clean!==line){changed=true;}return clean;
 });
 if(changed&&!fixes.includes('Espaces autour des clés INI normalisés.'))fixes.push('Espaces autour des clés INI normalisés.');
 return {ok:!bad,text:lines.join('\n'),fixes:[...new Set(fixes)],warnings,changed,error:bad};
}
function jsonLocation(source,e){
 const position=e?.message?.match(/position (\d+)/)?.[1],explicit=e?.message?.match(/line (\d+) column (\d+)/);
 const before=source.slice(0,position===undefined?source.length:Number(position));
 return {line:explicit?Number(explicit[1]):before.split('\n').length,column:explicit?Number(explicit[2]):before.length-before.lastIndexOf('\n')};
}
function semanticXml(source){
 const parser=new SaxesParser({xmlns:false});let root='',depth=0,record=null,field=null,fieldText='',count=0;const warnings=[],names=new Set();
 const warn=m=>{if(warnings.length<100)warnings.push(m)};
 parser.on('opentag',tag=>{depth++;if(depth===1)root=tag.name;if(depth===2&&((root==='types'&&tag.name==='type')||(root==='events'&&tag.name==='event'))){count++;record={name:tag.attributes.name||'',line:parser.line,values:{}};if(!record.name)warn(`Ligne ${record.line} : attribut name absent sur ${tag.name}.`);else if(names.has(record.name))warn(`Ligne ${record.line} : nom en double « ${record.name} ».`);names.add(record.name)}if(record&&depth===3){field=tag.name;fieldText='';if(root==='types'&&tag.name==='flags')for(const [name,value] of Object.entries(tag.attributes)){if(['count_in_cargo','count_in_hoarder','count_in_map','count_in_player','crafted','deloot'].includes(name)&&!['0','1'].includes(value))warn(`Ligne ${parser.line} : ${record.name}, flags.${name} doit valoir 0 ou 1.`)}}});
 const add=t=>{if(record&&field&&depth===3)fieldText+=t};parser.on('text',add);parser.on('cdata',add);
 parser.on('closetag',()=>{if(record&&depth===3&&field){record.values[field]=fieldText.trim();field=null}if(record&&depth===2){for(const key of ['nominal','min','max','lifetime','restock'])if(record.values[key]!==undefined&&!/^\d+$/.test(record.values[key]))warn(`Ligne ${record.line} : ${record.name}, ${key} doit être un entier positif ou nul.`);if(root==='types'&&/^\d+$/.test(record.values.min)&&/^\d+$/.test(record.values.nominal)&&Number(record.values.min)>Number(record.values.nominal))warn(`Ligne ${record.line} : ${record.name}, min dépasse nominal.`);record=null}depth--});
 try{parser.write(source).close()}catch{}
 return {root,warnings,entries:['types','events'].includes(root)?count:null};
}
function validateFile(filename,content){
 if(typeof content!=='string'||Buffer.byteLength(content,'utf8')>MAX_BYTES)throw new Error('Le fichier doit faire au maximum 5 Mo.');
 const extension=String(filename).split('.').pop().toLowerCase();
 if(!['json','xml','ini'].includes(extension))throw new Error('Choisis un fichier .json, .xml ou .ini.');
 if(extension==='json'){
  const base=cleanBase(content).text;try{JSON.parse(base);const repair=jsonRepair(content);return {valid:true,format:'JSON',warnings:[],message:'Syntaxe JSON valide.',correctable:repair.changed,correctedContent:repair.changed?repair.text:null,fixes:repair.fixes};}
  catch(e){const repair=jsonRepair(content);if(repair.ok)return {valid:false,format:'JSON',warnings:[],error:e.message,...jsonLocation(base,e),correctable:true,correctedContent:repair.text,fixes:repair.fixes};const loc=jsonLocation(base,e);return {valid:false,format:'JSON',warnings:[],error:e.message,...loc,correctable:false,correctedContent:null,fixes:repair.fixes};}
 }
 if(extension==='xml'){
  const base=cleanBase(content).text,error=xmlSyntax(base),repair=xmlRepair(content);
  if(error&&!repair.ok)return {valid:false,format:'XML',warnings:[],...error,correctable:false,correctedContent:null,fixes:repair.fixes};
  const used=error&&repair.ok?repair.text:base,sem=semanticXml(used);
  return {valid:!error,format:'XML',root:sem.root,warnings:sem.warnings,entries:sem.entries,message:error?'Une correction sûre est disponible.':`Syntaxe XML valide${sem.entries!==null?` — ${sem.entries} entrée(s) contrôlée(s)`:''}.`,...(error||{}),correctable:repair.changed&&repair.ok,correctedContent:repair.changed&&repair.ok?repair.text:null,fixes:repair.fixes};
 }
 const repair=iniRepair(content);
 return {valid:repair.ok,format:'INI',warnings:repair.warnings,message:repair.ok?'Structure INI valide.':'Structure INI invalide.',...(repair.error||{}),correctable:repair.changed&&repair.ok,correctedContent:repair.changed&&repair.ok?repair.text:null,fixes:repair.fixes};
}
module.exports={validateFile,MAX_BYTES};
