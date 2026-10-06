const {SlashCommandBuilder,AttachmentBuilder}=require('discord.js');
const premium=require('../dashboard/lib/premium.cjs');
const validator=require('../dashboard/lib/file-validator.cjs');

async function isProjectOwner(i,client){
 const ids=new Set(String(process.env.PREMIUM_ADMIN_DISCORD_IDS||process.env.BOT_OWNER_DISCORD_ID||'').split(',').map(x=>x.trim()).filter(Boolean));
 if(ids.has(i.user.id))return true;
 try{await client.application.fetch();const owner=client.application.owner;if(owner&&owner.id===i.user.id)return true;if(owner&&owner.members&&owner.members.some&&owner.members.some(m=>m.user&&m.user.id===i.user.id))return true;}catch{}
 return false;
}
const topBase=()=>String(process.env.TOP_SERVERS_API_URL||'https://bot-ark-production.up.railway.app').replace(/\/$/,'');
async function topRequest(path,opt){
 opt=opt||{};const headers={Accept:'application/json'};if(opt.method&&opt.method!=='GET')headers['Content-Type']='application/json';if(opt.write&&process.env.TOP_SERVERS_WRITE_KEY)headers.Authorization='Bearer '+process.env.TOP_SERVERS_WRITE_KEY;
 const r=await fetch(topBase()+path,{method:opt.method||'GET',headers:headers,body:opt.body?JSON.stringify(opt.body):undefined,signal:AbortSignal.timeout(12000)});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Top Serveurs indisponible.');return data;
}
function model(type){
 if(type==='types')return{name:'types.xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<types>\n  <type name="Example_Item">\n    <nominal>10</nominal>\n    <lifetime>7200</lifetime>\n    <restock>0</restock>\n    <min>5</min>\n    <quantmin>-1</quantmin>\n    <quantmax>-1</quantmax>\n    <cost>100</cost>\n    <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>\n    <category name="tools"/>\n  </type>\n</types>\n'};
 if(type==='events')return{name:'events.xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<events>\n  <event name="StaticExample">\n    <nominal>1</nominal>\n    <min>1</min>\n    <max>1</max>\n    <lifetime>3600</lifetime>\n    <restock>0</restock>\n    <saferadius>0</saferadius>\n    <distanceradius>0</distanceradius>\n    <cleanupradius>0</cleanupradius>\n    <flags deletable="0" init_random="0" remove_damaged="0"/>\n    <position>fixed</position>\n    <limit>mixed</limit>\n    <active>1</active>\n  </event>\n</events>\n'};
 if(type==='messages')return{name:'messages.xml',text:'<?xml version="1.0" encoding="UTF-8"?>\n<messages>\n  <message>\n    <deadline>600</deadline>\n    <shutdown>0</shutdown>\n    <text>Bienvenue sur le serveur.</text>\n  </message>\n</messages>\n'};
 if(type==='zone')return{name:'zone.json',text:JSON.stringify({name:'Zone exemple',type:'PVE',points:[{x:0,y:0,z:0},{x:100,y:0,z:0},{x:100,y:0,z:100}]},null,2)+'\n'};
 if(type==='loadout')return{name:'loadout-init.c.txt',text:'// Exemple DayZ PC. Utilise uniquement des classnames réellement installés.\nplayer.GetInventory().CreateInInventory("BandageDressing");\nplayer.GetInventory().CreateInInventory("WaterBottle");\n'};
 return{name:'modele.txt',text:'Modèle Extinction++ RSS\n'};
}
function commands(){return[
 new SlashCommandBuilder().setName('premium').setDescription('Premium EXTINCTION ++ RSS')
  .addSubcommand(s=>s.setName('statut').setDescription('Voir ton statut Premium'))
  .addSubcommand(s=>s.setName('activer').setDescription('Activer un code').addStringOption(o=>o.setName('code').setDescription('Code Premium').setRequired(true)))
  .addSubcommand(s=>s.setName('generer').setDescription('Propriétaire du bot : générer un code').addStringOption(o=>o.setName('produit').setDescription('Produit').setRequired(true).addChoices({name:'Multi-serveur',value:'multiserver'},{name:'Battle Pass',value:'battlepass'})).addStringOption(o=>o.setName('duree').setDescription('Durée').setRequired(true).addChoices({name:'1 mois',value:'monthly'},{name:'1 an',value:'yearly'}))),
 new SlashCommandBuilder().setName('topserveur').setDescription('Top Serveurs partagé')
  .addSubcommand(s=>s.setName('liste').setDescription('Voir le classement'))
  .addSubcommand(s=>s.setName('voter').setDescription('Voter').addStringOption(o=>o.setName('id').setDescription('ID serveur').setRequired(true)))
  .addSubcommand(s=>s.setName('ajouter').setDescription('Propriétaire du bot : ajouter').addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)).addStringOption(o=>o.setName('jeu').setDescription('Jeu').setRequired(true)).addStringOption(o=>o.setName('adresse').setDescription('Adresse').setRequired(false)).addStringOption(o=>o.setName('discord').setDescription('Discord').setRequired(false)).addStringOption(o=>o.setName('description').setDescription('Description').setRequired(false))),
 new SlashCommandBuilder().setName('fichier').setDescription('Valider et corriger JSON XML ou INI').addAttachmentOption(o=>o.setName('fichier').setDescription('Fichier').setRequired(true)),
 new SlashCommandBuilder().setName('outils-dayz').setDescription('Outils et modèles DayZ')
  .addSubcommand(s=>s.setName('liste').setDescription('Lister les outils'))
  .addSubcommand(s=>s.setName('modele').setDescription('Générer un modèle').addStringOption(o=>o.setName('type').setDescription('Type').setRequired(true).addChoices({name:'types.xml',value:'types'},{name:'events.xml',value:'events'},{name:'messages.xml',value:'messages'},{name:'Zone JSON',value:'zone'},{name:'Loadout init.c',value:'loadout'})))
];}
async function handle(i,ctx){
 if(!['premium','topserveur','fichier','outils-dayz'].includes(i.commandName))return false;
 const gid=i.guildId,u=i.user.id,sub=i.options.getSubcommand(false),owner=await isProjectOwner(i,ctx.client);
 if(i.commandName==='premium'){
  if(sub==='statut'){const st=premium.status(ctx.db,gid,u,owner);await i.editReply('⭐ Multi-serveur : '+(st.multiserver?'actif':'inactif')+' · Battle Pass : '+(st.battlepass?'actif':'inactif')+' · Serveurs : '+(st.unlimitedServers?'illimités':st.maxServers));return true;}
  if(sub==='activer'){const r=premium.redeem(ctx.db,gid,u,i.options.getString('code',true));await ctx.saveDb(ctx.db);await i.editReply('✅ Premium activé jusqu’au '+r.expiresAt);return true;}
  if(!owner)throw new Error('Réservé au propriétaire du bot.');const r=premium.generateCode(ctx.db,u,i.options.getString('produit',true),i.options.getString('duree',true));await ctx.saveDb(ctx.db);await i.editReply('✅ Code généré : '+r.code);return true;
 }
 if(i.commandName==='topserveur'){
  if(sub==='liste'){const rows=await topRequest('/api/top-servers');await i.editReply(rows.length?rows.slice(0,20).map((x,n)=>(n+1)+'. '+x.name+' · '+x.game+' · '+x.votes_24h+' votes/24h · ID '+x.id).join('\n'):'Aucun serveur.');return true;}
  if(sub==='voter'){const r=await topRequest('/api/top-servers/'+encodeURIComponent(i.options.getString('id',true))+'/vote',{method:'POST',body:{}});await i.editReply(r.accepted?'✅ Vote enregistré.':'Tu as déjà voté aujourd’hui.');return true;}
  if(!owner)throw new Error('Réservé au propriétaire du bot.');const r=await topRequest('/api/top-servers',{method:'POST',write:true,body:{name:i.options.getString('nom',true),game:i.options.getString('jeu',true),address:i.options.getString('adresse')||'',discord_url:i.options.getString('discord')||'',description:i.options.getString('description')||'',source_bot:'EXTINCTION ++ RSS'}});await i.editReply('✅ Serveur ajouté : '+r.name+' · ID '+r.id);return true;
 }
 if(i.commandName==='fichier'){
  const a=i.options.getAttachment('fichier',true);if(a.size>5*1024*1024)throw new Error('5 Mo maximum.');const res=await fetch(a.url);if(!res.ok)throw new Error('Téléchargement impossible.');const text=await res.text(),r=validator.validateFile(a.name,text);const msg=(r.valid?'✅ Fichier valide':r.correctable?'🛠 Correction disponible':'❌ Correction manuelle nécessaire')+(r.error?' · ligne '+(r.line||'?')+' · '+r.error:'')+(r.warnings&&r.warnings.length?' · '+r.warnings.length+' avertissement(s)':'');if(r.correctable&&r.correctedContent!=null){const name=a.name.replace(/(\.[^.]+)?$/,'.corrige$1');await i.editReply({content:msg,files:[new AttachmentBuilder(Buffer.from(r.correctedContent,'utf8'),{name:name})]});}else await i.editReply(msg);return true;
 }
 if(sub==='liste'){await i.editReply('🛠️ Outils DayZ : validateur/correcteur JSON XML INI, types.xml, events.xml, messages.xml, zones JSON, loadout init.c, Mods, Nitrado, RCON, logs, radio, whitelist et cartes.');return true;}
 const m=model(i.options.getString('type',true));await i.editReply({content:'✅ Modèle généré. Adapte les classnames et paramètres à ton serveur.',files:[new AttachmentBuilder(Buffer.from(m.text,'utf8'),{name:m.name})]});return true;
}
module.exports={commands,handle};
