const {SlashCommandBuilder,PermissionFlagsBits}=require('discord.js');
const crypto=require('node:crypto');
const uid=()=>crypto.randomUUID();
function ensure(db,gid){
  db.radioSettings=db.radioSettings||{};
  db.radioMessages=db.radioMessages||[];
  db.recurringMessages=db.recurringMessages||[];
  db.radioSettings[gid]=db.radioSettings[gid]||{frequency:'87.8 MHz',stationName:'EXTINCTION RADIO',channelId:''};
  return db.radioSettings[gid];
}
function commands(){return[
 new SlashCommandBuilder().setName('radio').setDescription('Radio communautaire Extinction++ RSS')
  .addSubcommand(s=>s.setName('config').setDescription('Configurer la station radio')
    .addChannelOption(o=>o.setName('salon').setDescription('Salon de diffusion').setRequired(true))
    .addStringOption(o=>o.setName('frequence').setDescription('Ex: 87.8 MHz').setRequired(false).setMaxLength(20))
    .addStringOption(o=>o.setName('station').setDescription('Nom de la station').setRequired(false).setMaxLength(80)))
  .addSubcommand(s=>s.setName('envoyer').setDescription('Diffuser un message radio')
    .addStringOption(o=>o.setName('message').setDescription('Message radio').setRequired(true).setMaxLength(1800))
    .addStringOption(o=>o.setName('type').setDescription('Type de diffusion').setRequired(false).addChoices({name:'HQ',value:'hq'},{name:'Ambiance',value:'ambiance'},{name:'Alerte',value:'alerte'})))
  .addSubcommand(s=>s.setName('historique').setDescription('Voir les dernières transmissions')),
 new SlashCommandBuilder().setName('rappel').setDescription('Messages récurrents')
  .addSubcommand(s=>s.setName('ajouter').setDescription('Programmer un message récurrent')
    .addChannelOption(o=>o.setName('salon').setDescription('Salon').setRequired(true))
    .addIntegerOption(o=>o.setName('minutes').setDescription('Intervalle en minutes').setRequired(true).setMinValue(5).setMaxValue(10080))
    .addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true).setMaxLength(1800)))
  .addSubcommand(s=>s.setName('liste').setDescription('Lister les rappels'))
  .addSubcommand(s=>s.setName('supprimer').setDescription('Supprimer un rappel')
    .addStringOption(o=>o.setName('id').setDescription('ID du rappel').setRequired(true)))
];}
function formatted(row,cfg){
 const prefix=row.kind==='ambiance'?'📻':row.kind==='alerte'?'🚨':'📡';
 const label=row.kind==='ambiance'?'Transmission':row.kind==='alerte'?'Alerte':'HQ';
 return `${prefix} **${cfg.stationName||'EXTINCTION RADIO'} · ${row.frequency||cfg.frequency}**\n${label} : ${row.message}`;
}
async function handle(interaction,{db,saveDb,isAdmin,client}){
 if(!['radio','rappel'].includes(interaction.commandName))return false;
 const gid=interaction.guildId,user=interaction.user.id,sub=interaction.options.getSubcommand(),cfg=ensure(db,gid);
 if(interaction.commandName==='radio'){
  if(sub==='config'){
   if(!isAdmin(interaction))throw new Error('Admin uniquement.');
   const ch=interaction.options.getChannel('salon',true);
   if(!ch.isTextBased())throw new Error('Salon texte requis.');
   cfg.channelId=ch.id;cfg.frequency=(interaction.options.getString('frequence')||cfg.frequency||'87.8 MHz').trim().slice(0,20);
   cfg.stationName=(interaction.options.getString('station')||cfg.stationName||'EXTINCTION RADIO').trim().slice(0,80);
   await saveDb(db);await interaction.editReply(`📻 Radio configurée : **${cfg.stationName} · ${cfg.frequency}** dans <#${cfg.channelId}>.`);return true;
  }
  if(sub==='envoyer'){
   if(!isAdmin(interaction))throw new Error('Admin uniquement.');
   if(!cfg.channelId)throw new Error('Configure d’abord le salon radio avec /radio config.');
   const row={id:uid(),guildId:gid,authorId:user,kind:interaction.options.getString('type')||'hq',message:interaction.options.getString('message',true).trim(),frequency:cfg.frequency,createdAt:new Date().toISOString()};
   db.radioMessages.push(row);db.radioMessages=db.radioMessages.slice(-2000);await saveDb(db);
   const ch=await client.channels.fetch(cfg.channelId);if(!ch?.isTextBased())throw new Error('Salon radio introuvable.');
   await ch.send({content:formatted(row,cfg),allowedMentions:{parse:[]}});await interaction.editReply('✅ Message radio diffusé.');return true;
  }
  const rows=db.radioMessages.filter(x=>x.guildId===gid).slice(-10).reverse();
  await interaction.editReply(rows.length?rows.map(x=>`• **${x.frequency}** · ${x.kind} · ${new Date(x.createdAt).toLocaleString('fr-FR')}\n${x.message}`).join('\n\n'):'Aucune transmission radio.');return true;
 }
 if(sub==='ajouter'){
  if(!isAdmin(interaction))throw new Error('Admin uniquement.');
  const ch=interaction.options.getChannel('salon',true);if(!ch.isTextBased())throw new Error('Salon texte requis.');
  const minutes=interaction.options.getInteger('minutes',true),row={id:uid(),guildId:gid,channelId:ch.id,message:interaction.options.getString('message',true).trim(),intervalMinutes:minutes,enabled:true,nextRunAt:Date.now()+minutes*60000,createdBy:user,createdAt:new Date().toISOString()};
  db.recurringMessages.push(row);await saveDb(db);await interaction.editReply(`⏰ Rappel créé : toutes les **${minutes} min** dans <#${ch.id}>.\nID : \`${row.id}\``);return true;
 }
 if(sub==='supprimer'){
  if(!isAdmin(interaction))throw new Error('Admin uniquement.');
  const id=interaction.options.getString('id',true),before=db.recurringMessages.length;db.recurringMessages=db.recurringMessages.filter(x=>!(x.guildId===gid&&x.id===id));if(before===db.recurringMessages.length)throw new Error('Rappel introuvable.');await saveDb(db);await interaction.editReply('✅ Rappel supprimé.');return true;
 }
 const rows=db.recurringMessages.filter(x=>x.guildId===gid&&x.enabled!==false);
 await interaction.editReply(rows.length?rows.slice(-20).map(x=>`• \`${x.id}\` · toutes les ${x.intervalMinutes} min · <#${x.channelId}>\n${x.message}`).join('\n\n'):'Aucun rappel récurrent.');return true;
}
function start({client,loadDb,saveDb}){let busy=false;async function tick(){if(busy)return;busy=true;try{const db=await loadDb();ensure(db,'__seed__');db.recurringMessages=db.recurringMessages||[];let changed=false;const now=Date.now();for(const row of db.recurringMessages.filter(x=>x.enabled!==false&&Number(x.nextRunAt)<=now).slice(0,50)){try{const ch=await client.channels.fetch(row.channelId);if(!ch?.isTextBased())throw new Error('Salon inaccessible');await ch.send({content:`⏰ **Rappel récurrent**\n${row.message}`,allowedMentions:{parse:[]}});row.nextRunAt=now+Math.max(5,Number(row.intervalMinutes)||60)*60000;row.lastRunAt=new Date().toISOString();changed=true;}catch(e){row.lastError=String(e.code||e.message).slice(0,200);row.nextRunAt=now+300000;changed=true;}}if(changed)await saveDb(db);}finally{busy=false}}tick();const timer=setInterval(tick,60000);timer.unref();return timer;}
module.exports={commands,handle,start,ensure,formatted};