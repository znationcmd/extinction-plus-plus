const {SlashCommandBuilder,REST,Routes,PermissionFlagsBits,ChannelType}=require('discord.js');
const crypto=require('node:crypto');
const ops=require('../dashboard/lib/game-operations.cjs');
const servers=require('./rcon-tools');
const uid=()=>crypto.randomUUID();
function serverOption(sc){return sc.addStringOption(o=>o.setName('serveur').setDescription('ID ou nom du serveur').setRequired(true));}
function commands(){return [
 new SlashCommandBuilder().setName('battlepass').setDescription('Voir ton pass de combat, tes XP et tes récompenses'),
 new SlashCommandBuilder().setName('quete').setDescription('Quêtes pour tous les jeux')
 .addSubcommand(sc=>sc.setName('liste').setDescription('Voir les quêtes et leur progression').addStringOption(o=>o.setName('jeu').setDescription('Code du jeu, ex. ark ou dayz_pc')).addStringOption(o=>o.setName('serveur').setDescription('ID ou nom du serveur')))
 .addSubcommand(sc=>sc.setName('preuve').setDescription('Soumettre une preuve au staff').addStringOption(o=>o.setName('id').setDescription('ID de la quête').setRequired(true)).addAttachmentOption(o=>o.setName('photo').setDescription('Preuve de réalisation').setRequired(true))),
 new SlashCommandBuilder().setName('prime').setDescription('Primes sur les joueurs et récompenses en monnaie virtuelle')
 .addSubcommand(sc=>serverOption(sc.setName('poser').setDescription('Réserver une prime sur une cible')).addStringOption(o=>o.setName('cible_uid').setDescription('UID du jeu de la cible').setRequired(true)).addIntegerOption(o=>o.setName('montant').setDescription('Montant prélevé dans ta banque').setRequired(true).setMinValue(1).setMaxValue(100000000)))
 .addSubcommand(sc=>serverOption(sc.setName('liste').setDescription('Voir les primes actives')))
 .addSubcommand(sc=>sc.setName('annuler').setDescription('Annuler ta prime et récupérer son montant').addStringOption(o=>o.setName('id').setDescription('ID de la prime').setRequired(true))),
 new SlashCommandBuilder().setName('faction').setDescription('Factions, invitations et trésorerie')
 .addSubcommand(sc=>serverOption(sc.setName('creer').setDescription('Créer ta faction')).addStringOption(o=>o.setName('nom').setDescription('Nom de la faction').setRequired(true).setMaxLength(100)))
 .addSubcommand(sc=>serverOption(sc.setName('inviter').setDescription('Le chef invite un joueur')).addUserOption(o=>o.setName('joueur').setDescription('Joueur invité').setRequired(true)))
 .addSubcommand(sc=>serverOption(sc.setName('rejoindre').setDescription('Accepter une invitation')).addStringOption(o=>o.setName('id').setDescription('ID de la faction').setRequired(true)))
 .addSubcommand(sc=>serverOption(sc.setName('quitter').setDescription('Quitter ta faction')))
 .addSubcommand(sc=>serverOption(sc.setName('info').setDescription('Voir ta faction et sa trésorerie')))
 .addSubcommand(sc=>serverOption(sc.setName('deposer').setDescription('Déposer dans la trésorerie')).addIntegerOption(o=>o.setName('montant').setDescription('Montant en banque').setRequired(true).setMinValue(1)))
 .addSubcommand(sc=>serverOption(sc.setName('retirer').setDescription('Le chef retire de la trésorerie')).addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true).setMinValue(1))),
 new SlashCommandBuilder().setName('profil').setDescription('Lier ton identité du jeu à Discord')
 .addSubcommand(sc=>serverOption(sc.setName('lier').setDescription('Vérifier ton UID depuis le chat du jeu')).addStringOption(o=>o.setName('uid').setDescription('UID exact dans les logs').setRequired(true).setMaxLength(100)))
 .addSubcommand(sc=>serverOption(sc.setName('info').setDescription('Voir ta liaison de joueur'))),
 new SlashCommandBuilder().setName('ticket').setDescription('Support privé avec le staff')
 .addSubcommand(sc=>sc.setName('ouvrir').setDescription('Créer un ticket privé').addStringOption(o=>o.setName('sujet').setDescription('Sujet du ticket').setRequired(true).setMaxLength(160)))
 .addSubcommand(sc=>sc.setName('repondre').setDescription('Répondre à ton ticket ou à un ticket du staff').addStringOption(o=>o.setName('id').setDescription('ID du ticket').setRequired(true)).addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true).setMaxLength(1500)))
 .addSubcommand(sc=>sc.setName('fermer').setDescription('Fermer le ticket et conserver son historique').addStringOption(o=>o.setName('id').setDescription('ID du ticket').setRequired(true)))
 ];}
async function register(client){await Promise.all(commands().map(c=>client.application.commands.create(c.toJSON())));}
async function handle(interaction,{db,saveDb,isAdmin,client}){
 if(!['prime','faction','profil','ticket'].includes(interaction.commandName))return false;
 if(!interaction.guildId)throw new Error('Utilise cette commande dans ton Discord.');
 const gid=interaction.guildId,user=interaction.user.id,sub=interaction.options.getSubcommand();let response;
 if(interaction.commandName==='ticket'){
 db.tickets||=[];
 if(sub==='ouvrir'){if(db.tickets.filter(t=>t.guildId===gid&&t.userId===user&&t.status==='open').length>=3)throw new Error('Ferme un ticket avant d’en ouvrir un autre (3 maximum).');const id=uid();const cfg=db.guilds?.[gid];const staff=cfg?.roles?.staff;
 const permissions=[{id:gid,deny:[PermissionFlagsBits.ViewChannel]},{id:user,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},{id:client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageChannels]}];if(staff)permissions.push({id:staff,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]});
 const ch=await interaction.guild.channels.create({name:`ticket-${id.slice(0,8)}`,type:ChannelType.GuildText,permissionOverwrites:permissions});const row={id,guildId:gid,userId:user,subject:interaction.options.getString('sujet'),channelId:ch.id,status:'open',createdAt:new Date().toISOString(),messages:[]};db.tickets.push(row);await saveDb(db);await ch.send({content:`🎫 ${row.subject}\nID : ${row.id}\nRéponds avec /ticket repondre.`,allowedMentions:{parse:[]}});response=`Ticket privé créé : <#${ch.id}>\nID : ${id}`;
 }else{const t=db.tickets.find(t=>t.id===interaction.options.getString('id')&&t.guildId===gid);if(!t)throw new Error('Ticket introuvable.');if(t.userId!==user&&!isAdmin(interaction))throw new Error('Ticket réservé à son auteur et au staff administrateur.');if(t.status!=='open')throw new Error('Ticket fermé.');const ch=await interaction.guild.channels.fetch(t.channelId);if(sub==='repondre'){const content=interaction.options.getString('message');await ch.send({content:`${interaction.user.username} : ${content}`,allowedMentions:{parse:[]}});t.messages||=[];t.messages.push({id:uid(),userId:user,message:content,createdAt:new Date().toISOString()});response='Réponse envoyée.';}else{await ch.permissionOverwrites.edit(t.userId,{SendMessages:false});await ch.send({content:'Ticket fermé. Historique conservé dans ce salon et dans le dashboard.',allowedMentions:{parse:[]}});t.status='closed';t.closedBy=user;t.closedAt=new Date().toISOString();response='Ticket fermé.';}await saveDb(db);}
 }else{
 let s;if(!(interaction.commandName==='prime'&&sub==='annuler')){s=servers.findServer(db,gid,interaction.options.getString('serveur'));if(!s||s.enabled===false)throw new Error('Serveur introuvable ou désactivé.');}
 if(interaction.commandName==='prime'){
 if(sub==='poser'){const b=ops.createBounty(db,gid,{serverId:s.id,creatorId:user,targetUid:interaction.options.getString('cible_uid'),amount:interaction.options.getInteger('montant')});await saveDb(db);response=`🎯 Prime de ${b.amount} réservée. ID : ${b.id}\nPaiement automatique sur événement vérifié ou validation par le staff avec preuve. Le bénéficiaire doit être lié à Discord.`;}
 else if(sub==='annuler'){const b=db.bounties?.find(b=>b.guildId===gid&&b.id===interaction.options.getString('id'));if(!b||b.creatorId!==user)throw new Error('Tu peux seulement annuler tes propres primes.');ops.cancelBounty(db,b);await saveDb(db);response='Prime annulée et remboursée.';}
 else response=(db.bounties||[]).filter(b=>b.guildId===gid&&b.serverId===s.id&&b.status==='active'&&Date.parse(b.expiresAt)>Date.now()).map(b=>`${b.targetName} — ${b.amount} — ${b.id}`).join('\n')||'Aucune prime active.';
 }else if(interaction.commandName==='profil'){
 db.playerLinks||=[];const own=db.playerLinks.find(l=>l.guildId===gid&&l.serverId===s.id&&l.userId===user);
 if(sub==='info')response=own?`${own.uid} — ${own.verified?'identité vérifiée':'validation en attente'}`:'Aucune liaison. Utilise /profil lier.';
 else{const value=interaction.options.getString('uid');if(!value||/[\r\n\0]/.test(value))throw new Error('UID invalide.');if(db.playerLinks.some(l=>l.guildId===gid&&l.serverId===s.id&&l.uid===value&&l.userId!==user))throw new Error('Cet UID possède déjà une liaison. Contacte le staff.');if(own?.verified)throw new Error('Ta liaison est déjà vérifiée. Le staff peut la modifier depuis le dashboard.');const row={id:own?.id||uid(),guildId:gid,serverId:s.id,userId:user,uid:value,verified:false,challenge:`EXT-${crypto.randomBytes(12).toString('hex')}`,challengeExpiresAt:new Date(Date.now()+900000).toISOString()};if(own)Object.assign(own,row);else db.playerLinks.push(row);await saveDb(db);response=`Envoie exactement ce code dans le chat du jeu :\n${row.challenge}\nValable 15 minutes. Les logs automatiques doivent être actifs. Si le chat n’est pas journalisé, le staff peut vérifier ton identité depuis le dashboard.`;}
 }else{
 db.factions||=[];let f=ops.faction(db,gid,s.id,user);
 if(sub==='creer'){if(f)throw new Error('Tu appartiens déjà à une faction sur ce serveur.');f={id:uid(),guildId:gid,serverId:s.id,name:interaction.options.getString('nom'),leaderId:user,members:[user],invites:[],treasury:0};db.factions.push(f);response=`Faction créée : ${f.name}\nID : ${f.id}`;}
 else if(sub==='rejoindre'){if(f)throw new Error('Quitte ta faction avant d’en rejoindre une autre.');f=db.factions.find(f=>f.guildId===gid&&f.serverId===s.id&&f.id===interaction.options.getString('id'));if(!f?.invites?.includes(user))throw new Error('Invitation du chef requise.');if(f.members.length>=100)throw new Error('Faction complète.');f.members.push(user);f.invites=f.invites.filter(v=>v!==user);response=`Tu as rejoint ${f.name}.`;}
 else{if(!f)throw new Error('Tu n’appartiens à aucune faction sur ce serveur.');if(sub==='inviter'){if(f.leaderId!==user)throw new Error('Seul le chef peut inviter.');f.invites||=[];const invited=interaction.options.getUser('joueur').id;if(f.invites.length>=100)throw new Error('100 invitations maximum.');if(!f.invites.includes(invited))f.invites.push(invited);response=`Invitation enregistrée pour le joueur. Il peut utiliser /faction rejoindre serveur:${s.name} id:${f.id}`;}
 else if(sub==='quitter'){if(f.leaderId===user)throw new Error('Le staff doit transférer la direction ou supprimer la faction avant ton départ.');f.members=f.members.filter(v=>v!==user);response='Faction quittée.';}
 else if(sub==='info')response=`${f.name} — ${f.members.length} membres — trésorerie ${f.treasury||0}\nID : ${f.id}`;
 else{ops.treasury(db,f,user,interaction.options.getInteger('montant'),sub==='deposer'?'deposit':'withdraw');response=`Trésorerie : ${f.treasury}`;}}
 await saveDb(db);
 }
 }
 await interaction.editReply({content:response.slice(0,1900),allowedMentions:{parse:[]}});return true;
}
module.exports={commands,register,handle};
