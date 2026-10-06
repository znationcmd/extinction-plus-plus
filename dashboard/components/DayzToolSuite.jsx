'use client';

import {useMemo,useState} from 'react';

const lines=value=>String(value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const int=value=>Math.max(0,Math.round(num(value)));
const clamp01=value=>Math.max(0,Math.min(1,num(value)));
const escXml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const safeCode=value=>String(value||'').replace(/[^A-Za-z0-9_.-]/g,'');
const coords=value=>lines(value).map(row=>{const p=row.split(',').map(x=>num(x.trim()));return{x:p[0]||0,y:p.length>2?(p[1]||0):0,z:p.length>2?(p[2]||0):(p[1]||0),a:p.length>3?(p[3]||0):0}});
const pretty=value=>JSON.stringify(value,null,2)+'\n';

function parseXml(text){
 const doc=new DOMParser().parseFromString(String(text),'application/xml');
 const err=doc.querySelector('parsererror');
 if(err)throw new Error('XML invalide : '+err.textContent.replace(/\s+/g,' ').slice(0,240));
 return doc;
}
function xmlOut(doc){return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+new XMLSerializer().serializeToString(doc.documentElement)+'\n';}
function parseJson(text){try{return JSON.parse(String(text||''))}catch(e){throw new Error('JSON invalide : '+e.message)}}
function download(name,text){
 const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

const definitions=[
 {id:'types-item',icon:'📦',name:'Types.xml · ajouter un item',desc:'Crée une entrée type complète.',fields:[['name','text','Example_Item'],['nominal','number','10'],['min','number','5'],['lifetime','number','7200'],['category','text','tools']],run:v=>({name:'type-entry.xml',text:'<type name="'+escXml(v.name)+'">\n  <nominal>'+int(v.nominal)+'</nominal>\n  <lifetime>'+int(v.lifetime)+'</lifetime>\n  <restock>0</restock>\n  <min>'+int(v.min)+'</min>\n  <quantmin>-1</quantmin>\n  <quantmax>-1</quantmax>\n  <cost>100</cost>\n  <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>\n  <category name="'+escXml(v.category)+'"/>\n</type>\n'})},
 {id:'types-bulk',icon:'📚',name:'Types.xml · génération en masse',desc:'Convertit une liste de classnames en types.xml.',fields:[['items','textarea','AKM\nM4A1\nBandageDressing'],['nominal','number','10'],['min','number','5'],['lifetime','number','7200']],run:v=>({name:'types.xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<types>\n'+lines(v.items).map(x=>'  <type name="'+escXml(x)+'">\n    <nominal>'+int(v.nominal)+'</nominal>\n    <lifetime>'+int(v.lifetime)+'</lifetime>\n    <restock>0</restock>\n    <min>'+int(v.min)+'</min>\n    <quantmin>-1</quantmin>\n    <quantmax>-1</quantmax>\n    <cost>100</cost>\n    <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>\n  </type>').join('\n')+'\n</types>\n'})},
 {id:'loot-boost',icon:'📈',name:'Boost de loot',desc:'Multiplie nominal et min dans un types.xml existant.',fields:[['source','textarea','<types></types>'],['factor','number','2']],run:v=>{const d=parseXml(v.source),f=Math.max(.1,num(v.factor,1));d.querySelectorAll('type').forEach(t=>['nominal','min'].forEach(k=>{const e=t.querySelector(k);if(e&&/^\d+$/.test(e.textContent.trim()))e.textContent=String(Math.max(0,Math.round(Number(e.textContent)*f)))}));return{name:'types-boost.xml',text:xmlOut(d)}}},
 {id:'loot-remove',icon:'🗑️',name:'Suppression de loot',desc:'Retire des classnames ciblés de types.xml.',fields:[['source','textarea','<types></types>'],['items','textarea','Example_Item']],run:v=>{const d=parseXml(v.source),set=new Set(lines(v.items).map(x=>x.toLowerCase()));d.querySelectorAll('type').forEach(t=>{if(set.has(String(t.getAttribute('name')||'').toLowerCase()))t.remove()});return{name:'types-clean.xml',text:xmlOut(d)}}},
 {id:'events',icon:'🚁',name:'Events.xml',desc:'Crée un événement statique valide.',fields:[['name','text','StaticHeliCrash'],['nominal','number','1'],['min','number','1'],['max','number','1'],['lifetime','number','3600']],run:v=>({name:'event.xml',text:'<event name="'+escXml(v.name)+'">\n  <nominal>'+int(v.nominal)+'</nominal>\n  <min>'+int(v.min)+'</min>\n  <max>'+int(v.max)+'</max>\n  <lifetime>'+int(v.lifetime)+'</lifetime>\n  <restock>0</restock>\n  <saferadius>0</saferadius>\n  <distanceradius>0</distanceradius>\n  <cleanupradius>0</cleanupradius>\n  <flags deletable="0" init_random="0" remove_damaged="0"/>\n  <position>fixed</position>\n  <limit>mixed</limit>\n  <active>1</active>\n</event>\n'})},
 {id:'eventspawns',icon:'📍',name:'CfgEventSpawns',desc:'Génère les positions d’un événement.',fields:[['event','text','StaticHeliCrash'],['coords','textarea','7500,0,7500\n7600,0,7550']],run:v=>({name:'cfgeventspawns.xml',text:'<?xml version="1.0" encoding="UTF-8"?>\n<eventposdef>\n  <event name="'+escXml(v.event)+'">\n'+coords(v.coords).map(p=>'    <pos x="'+p.x+'" z="'+p.z+'" a="'+p.a+'"/>').join('\n')+'\n  </event>\n</eventposdef>\n'})},
 {id:'eventgroups',icon:'🧱',name:'CfgEventGroups',desc:'Crée un groupe d’objets statiques.',fields:[['group','text','Custom_Group'],['objects','textarea','Land_Wall_Gate_Fireplace,0,0,0\nLand_BarrelHoles_Green_F,2,0,1']],run:v=>({name:'cfgeventgroups.xml',text:'<?xml version="1.0" encoding="UTF-8"?>\n<groups>\n  <group name="'+escXml(v.group)+'">\n'+lines(v.objects).map((x,i)=>{const p=x.split(',').map(y=>y.trim());return '    <child type="'+escXml(p[0]||('Object_'+i))+'" lootmax="0" lootmin="0" x="'+num(p[1])+'" z="'+num(p[3])+'" a="0"/>'}).join('\n')+'\n  </group>\n</groups>\n'})},
 {id:'gameplay',icon:'⚙️',name:'CfgGameplay JSON',desc:'Génère les options gameplay et objectSpawnersArr.',fields:[['personalLight','select','false|false,true'],['lighting','select','0|0,1'],['spawners','textarea','']],run:v=>({name:'cfggameplay.json',text:pretty({version:123,GeneralData:{disableBaseDamage:false,disableContainerDamage:false,disableRespawnDialog:false},PlayerData:{disablePersonalLight:v.personalLight==='true'},WorldsData:{lightingConfig:int(v.lighting),objectSpawnersArr:lines(v.spawners)}})})},
 {id:'messages',icon:'📣',name:'Messages.xml',desc:'Crée une annonce serveur planifiée.',fields:[['text','textarea','Bienvenue sur le serveur.'],['deadline','number','600'],['shutdown','select','0|0,1']],run:v=>({name:'messages.xml',text:'<?xml version="1.0" encoding="UTF-8"?>\n<messages>\n  <message>\n    <deadline>'+int(v.deadline)+'</deadline>\n    <shutdown>'+int(v.shutdown)+'</shutdown>\n    <text>'+escXml(v.text)+'</text>\n  </message>\n</messages>\n'})},
 {id:'spawns',icon:'🧍',name:'Spawns joueurs',desc:'Crée une liste de points de spawn.',fields:[['coords','textarea','6500,0,2500\n6700,0,2600']],run:v=>({name:'spawn-points.json',text:pretty({spawns:coords(v.coords)})})},
 {id:'zone',icon:'🗺️',name:'Zones PVE / PVP / toxiques',desc:'Crée un polygone exportable.',fields:[['name','text','Zone A'],['type','select','PVE|PVE,PVP,Toxic,Safe'],['coords','textarea','6000,0,6000\n6500,0,6000\n6500,0,6500\n6000,0,6500']],run:v=>({name:'zone.json',text:pretty({name:v.name,type:v.type,points:coords(v.coords)})})},
 {id:'weather',icon:'🌦️',name:'Climat',desc:'Génère un snippet météo init.c.',fields:[['overcast','number','0.4'],['rain','number','0.2'],['fog','number','0.1'],['wind','number','0.5']],run:v=>({name:'weather-init.c.txt',text:'Weather weather = g_Game.GetWeather();\nweather.GetOvercast().Set('+clamp01(v.overcast)+', 0, 0);\nweather.GetRain().Set('+clamp01(v.rain)+', 0, 0);\nweather.GetFog().Set('+clamp01(v.fog)+', 0, 0);\nweather.SetWindMaximumSpeed('+Math.max(0,num(v.wind,.5)*20)+');\n'})},
 {id:'trader',icon:'💰',name:'Trader / Market',desc:'Crée une liste prix JSON.',fields:[['items','textarea','AKM,2500,1500\nM4A1,4000,2500']],run:v=>({name:'trader-market.json',text:pretty(lines(v.items).map(x=>{const p=x.split(',');return{name:(p[0]||'').trim(),buy:int(p[1]),sell:int(p[2])}}))})},
 {id:'loadout',icon:'🎒',name:'Loadout Init.c',desc:'Crée un équipement de départ PC.',fields:[['items','textarea','BandageDressing\nWaterBottle\nCombatKnife']],run:v=>({name:'loadout-init.c.txt',text:'// Utilise uniquement des classnames réellement installés.\n'+lines(v.items).map(x=>'player.GetInventory().CreateInInventory("'+safeCode(x)+'");').join('\n')+'\n'})},
 {id:'classnames',icon:'🔎',name:'Extracteur de classnames',desc:'Extrait les noms d’objets uniques.',fields:[['source','textarea','<type name="AKM">\n<type name="M4A1">']],run:v=>{const found=new Set();String(v.source).replace(/\b(?:name|type|classname)\s*[=:]\s*["']?([A-Za-z0-9_.-]+)/gi,(_,x)=>found.add(x));String(v.source).replace(/<type\s+name=["']([^"']+)/gi,(_,x)=>found.add(x));return{name:'classnames.txt',text:[...found].sort().join('\n')+'\n'}}},
 {id:'json-format',icon:'🧪',name:'JSON · formater/minifier',desc:'Formate ou minifie un JSON.',fields:[['source','textarea','{"a":1}'],['mode','select','pretty|pretty,minify']],run:v=>({name:'result.json',text:v.mode==='minify'?JSON.stringify(parseJson(v.source)):pretty(parseJson(v.source))})},
 {id:'json-split',icon:'✂️',name:'JSON · découper tableau',desc:'Découpe un tableau JSON en lots.',fields:[['source','textarea','[1,2,3,4]'],['size','number','2']],run:v=>{const a=parseJson(v.source);if(!Array.isArray(a))throw new Error('Le JSON doit être un tableau.');const size=Math.max(1,int(v.size)),chunks=[];for(let i=0;i<a.length;i+=size)chunks.push(a.slice(i,i+size));return{name:'json-chunks.json',text:pretty(chunks)}}},
 {id:'diag',icon:'🩺',name:'Diagnostic logs',desc:'Isole erreurs et avertissements.',fields:[['source','textarea','']],run:v=>{const bad=String(v.source).split(/\r?\n/).filter(x=>/error|exception|warning|unknown|cannot|failed|missing|invalid/i.test(x));return{name:'diagnostic.txt',text:(bad.length?bad:['Aucune ligne suspecte détectée par les motifs courants.']).join('\n')+'\n'}}},
 {id:'ai-patrol',icon:'🤖',name:'Patrouille AI',desc:'Modèle de patrouille pour un mod AI compatible.',fields:[['name','text','Patrol Alpha'],['faction','text','Raiders'],['count','number','4'],['coords','textarea','6000,0,6000\n6200,0,6100']],run:v=>({name:'ai-patrol.json',text:pretty({name:v.name,faction:v.faction,count:int(v.count),waypoints:coords(v.coords),requiresCompatibleAiMod:true})})},
 {id:'teleport',icon:'🌀',name:'Téléporteurs',desc:'Modèle entrée/sortie pour un mod compatible.',fields:[['name','text','Portail Nord'],['from','text','6000,0,6000'],['to','text','12000,0,12000']],run:v=>({name:'teleporter.json',text:pretty({name:v.name,from:coords(v.from)[0],to:coords(v.to)[0],requiresCompatibleMod:true})})},
 {id:'quest',icon:'🎯',name:'Quête / mission',desc:'Crée une quête générique exportable.',fields:[['title','text','Récupération médicale'],['type','select','collection|collection,kill,travel,delivery,craft'],['target','text','BandageDressing'],['amount','number','5'],['reward','number','1000']],run:v=>({name:'quest.json',text:pretty({title:v.title,type:v.type,target:v.target,amount:int(v.amount),reward:int(v.reward),requiresCompatibleQuestMod:true})})},
 {id:'market-category',icon:'🏷️',name:'Catégorie Market',desc:'Crée une catégorie Expansion Market générique.',fields:[['name','text','Weapons'],['items','textarea','AKM\nM4A1']],run:v=>({name:'market-category.json',text:pretty({DisplayName:v.name,Items:lines(v.items)})})},
 {id:'weapon-kit',icon:'🔫',name:'Arme équipée',desc:'Crée arme + accessoires.',fields:[['weapon','text','M4A1'],['attachments','textarea','ACOGOptic\nM4_Suppressor\nMag_STANAG_30Rnd']],run:v=>({name:'weapon-kit.json',text:pretty({weapon:v.weapon,attachments:lines(v.attachments)})})},
 {id:'vehicle-kit',icon:'🚙',name:'Véhicule équipé',desc:'Crée véhicule + pièces + cargo.',fields:[['vehicle','text','OffroadHatchback'],['parts','textarea','CarBattery\nSparkPlug\nCarRadiator'],['cargo','textarea','CanisterGasoline\nTireRepairKit']],run:v=>({name:'vehicle-kit.json',text:pretty({vehicle:v.vehicle,parts:lines(v.parts),cargo:lines(v.cargo),fluids:{fuel:1,coolant:1,oil:1}})})},
 {id:'wipe',icon:'🧹',name:'Plan de Wipe',desc:'Produit une checklist sûre de wipe.',fields:[['scope','select','full|full,players,economy,bases,vehicles'],['backup','select','yes|yes,no']],run:v=>({name:'wipe-plan.txt',text:'EXTINCTION ++ RSS · PLAN DE WIPE\nScope: '+v.scope+'\nBackup avant action: '+v.backup+'\n1. Arrêter le serveur.\n2. Sauvegarder les données concernées.\n3. Supprimer uniquement le scope choisi.\n4. Vérifier mission et configs.\n5. Redémarrer et contrôler les logs.\n'})},
 {id:'transfer',icon:'🚚',name:'Transfert serveur',desc:'Produit une checklist de migration.',fields:[['provider','text','Nitrado → autre hébergeur'],['mission','text','dayzOffline.chernarusplus']],run:v=>({name:'server-transfer-plan.txt',text:'TRANSFERT DAYZ\n'+v.provider+'\nMission: '+v.mission+'\n- Sauvegarder mission, profils, storage_1, ban/whitelist et configs.\n- Exporter liste mods + clés.\n- Vérifier versions/dépendances.\n- Restaurer sur nouvel hébergeur.\n- Corriger chemins et paramètres de démarrage.\n- Tester avant ouverture.\n'})}
];

function defaultValues(tool){return Object.fromEntries(tool.fields.map(([id,,value])=>[id,String(value)]));}
function Field({field,value,onChange}){
 const [id,type,definition]=field;
 if(type==='textarea')return <label className="grid gap-2 text-sm text-white/70"><span>{id}</span><textarea className="input min-h-40 font-mono text-xs" value={value} onChange={e=>onChange(e.target.value)}/></label>;
 if(type==='select'){const [selected,list]=String(definition).split('|'),options=String(list||selected).split(',');return <label className="grid gap-2 text-sm text-white/70"><span>{id}</span><select className="input" value={value} onChange={e=>onChange(e.target.value)}>{options.map(x=><option key={x} value={x}>{x}</option>)}</select></label>;}
 return <label className="grid gap-2 text-sm text-white/70"><span>{id}</span><input className="input" type={type} value={value} onChange={e=>onChange(e.target.value)}/></label>;
}

export default function DayzToolSuite(){
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState(definitions[0].id);
 const tool=definitions.find(x=>x.id===selected)||definitions[0];
 const [values,setValues]=useState(()=>defaultValues(definitions[0]));
 const [result,setResult]=useState(null);
 const [error,setError]=useState('');
 const filtered=useMemo(()=>definitions.filter(t=>(t.name+' '+t.desc).toLowerCase().includes(query.toLowerCase())),[query]);
 function choose(id){const t=definitions.find(x=>x.id===id);setSelected(id);setValues(defaultValues(t));setResult(null);setError('');}
 function run(){try{const out=tool.run(values);setResult(out);setError('')}catch(e){setError(e.message||'Erreur');setResult(null)}}
 return <div className="space-y-6">
  <div className="card">
   <div className="flex flex-wrap items-end justify-between gap-4">
    <div><p className="text-sm font-bold uppercase tracking-[.22em] text-purple-300">Boîte à outils DayZ</p><h1 className="text-4xl font-black">Générateurs & éditeurs</h1><p className="mt-2 text-white/60">Chaque carte exécute une vraie transformation ou génère un fichier téléchargeable.</p></div>
    <input className="input max-w-md" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un outil…"/>
   </div>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   {filtered.map(t=><button key={t.id} type="button" onClick={()=>choose(t.id)} className={"card text-left transition hover:border-purple-400 "+(t.id===selected?'border-purple-400 bg-purple-950/30':'')}>
    <div className="text-3xl">{t.icon}</div><h2 className="mt-2 font-black">{t.name}</h2><p className="mt-1 text-sm text-white/55">{t.desc}</p>
   </button>)}
  </div>
  <div className="card">
   <h2 className="text-2xl font-black">{tool.icon} {tool.name}</h2><p className="mt-2 text-white/60">{tool.desc}</p>
   <div className="mt-5 grid gap-4 md:grid-cols-2">{tool.fields.map(f=><Field key={f[0]} field={f} value={values[f[0]]??''} onChange={value=>setValues(v=>({...v,[f[0]]:value}))}/>)}</div>
   <div className="mt-5 flex flex-wrap gap-3"><button className="btn btn-primary" type="button" onClick={run}>Générer / appliquer</button>{result&&<button className="btn bg-white/10" type="button" onClick={()=>download(result.name,result.text)}>Télécharger {result.name}</button>}</div>
   {error&&<div className="mt-5 rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-red-200">{error}</div>}
   {result&&<pre className="mt-5 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">{result.text}</pre>}
  </div>
  <div className="card text-sm text-white/60">Les outils « AI », téléporteur, quêtes et certains marchés génèrent des configurations génériques : leur fonctionnement en jeu nécessite un mod compatible réellement installé. Le dashboard ne prétend pas injecter un mod absent.</div>
 </div>;
}
