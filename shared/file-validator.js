const { SaxesParser } = require('saxes');
const MAX_BYTES = 5 * 1024 * 1024;
function validateFile(filename, content) {
  if (typeof content !== 'string' || Buffer.byteLength(content,'utf8')>MAX_BYTES) throw new Error('Le fichier doit faire au maximum 5 Mo.');
  const extension=String(filename).split('.').pop().toLowerCase();
  if (!['json','xml'].includes(extension)) throw new Error('Choisis un fichier .json ou .xml.');
  const source=content.replace(/^\uFEFF/,'');
  if(extension==='json') {
    try {JSON.parse(source);return {valid:true,format:'JSON',warnings:[],message:'Syntaxe JSON valide.'};}
    catch(e) {
      const position=e.message.match(/position (\d+)/)?.[1];
      const explicit=e.message.match(/line (\d+) column (\d+)/);
      const before=source.slice(0,position===undefined ? source.length : Number(position));
      return {valid:false,format:'JSON',warnings:[],error:e.message,line:explicit ? Number(explicit[1]) : before.split('\n').length,column:explicit ? Number(explicit[2]) : before.length-before.lastIndexOf('\n')};
    }
  }
  const parser=new SaxesParser({xmlns:false});
  let error=null, root='', depth=0, record=null, field=null, fieldText='', count=0;
  const warnings=[], names=new Set();
  const warn=message=>{if(warnings.length<100)warnings.push(message);};
  parser.on('error',e=>{if(!error)error={error:e.message.replace(/^\d+:\d+: /,''),line:parser.line,column:parser.column};});
  parser.on('doctype',()=>{if(!error)error={error:'Les déclarations DOCTYPE et les entités personnalisées ne sont pas acceptées.',line:parser.line,column:parser.column};});
  parser.on('opentag',tag=>{
    depth++;
    if(depth===1)root=tag.name;
    if(depth===2 && ((root==='types' && tag.name==='type') || (root==='events' && tag.name==='event'))) {
      count++;record={name:tag.attributes.name || '',line:parser.line,values:{}};
      if(!record.name)warn(`Ligne ${record.line} : attribut name absent sur ${tag.name}.`);
      else if(names.has(record.name))warn(`Ligne ${record.line} : nom en double « ${record.name} ».`);
      names.add(record.name);
    }
    if(record && depth===3) {
      field=tag.name;fieldText='';
      if(root==='types' && tag.name==='flags') for(const [name,value] of Object.entries(tag.attributes)) {
        if(['count_in_cargo','count_in_hoarder','count_in_map','count_in_player','crafted','deloot'].includes(name) && !['0','1'].includes(value)) warn(`Ligne ${parser.line} : ${record.name}, flags.${name} doit valoir 0 ou 1.`);
      }
    }
  });
  const addText=text=>{if(record && field && depth===3)fieldText+=text;};
  parser.on('text',addText);parser.on('cdata',addText);
  parser.on('closetag',()=>{
    if(record && depth===3 && field) {record.values[field]=fieldText.trim();field=null;}
    if(record && depth===2) {
      for(const key of ['nominal','min','max','lifetime','restock']) {
        if(record.values[key]!==undefined && !/^\d+$/.test(record.values[key])) warn(`Ligne ${record.line} : ${record.name}, ${key} doit être un entier positif ou nul.`);
      }
      if(root==='types' && /^\d+$/.test(record.values.min) && /^\d+$/.test(record.values.nominal) && Number(record.values.min)>Number(record.values.nominal)) warn(`Ligne ${record.line} : ${record.name}, min dépasse nominal. Vérifie cette valeur.`);
      record=null;
    }
    depth--;
  });
  try {parser.write(source).close();} catch(e) {if(!error)error={error:e.message,line:parser.line,column:parser.column};}
  if(error)return {valid:false,format:'XML',warnings:[],...error};
  return {valid:true,format:'XML',root,warnings,entries:['types','events'].includes(root) ? count : null,message:`Syntaxe XML valide${['types','events'].includes(root) ? ` — ${count} ${root==='types' ? 'type(s)' : 'événement(s)'} contrôlé(s)` : ''}.`};
}
module.exports={validateFile,MAX_BYTES};
