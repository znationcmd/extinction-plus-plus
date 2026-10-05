const {SlashCommandBuilder,PermissionFlagsBits}=require('discord.js');
const arcade=require('../dashboard/lib/arcade.cjs');
function commands(){return [
 new SlashCommandBuilder().setName('casino').setDescription('Casino en monnaie virtuelle du serveur')
 .addSubcommand(s=>s.setName('jouer').setDescription('Pile ou face, dés ou machine à sous').addStringOption(o=>o.setName('jeu').setDescription('Jeu').setRequired(true).addChoices(...['pileface','des','slots'].map(value=>({name:value,value})))).addIntegerOption(o=>o.setName('mise').setDescription('Mise prélevée dans ta banque').setRequired(true).setMinValue(1).setMaxValue(100000)).addStringOption(o=>o.setName('choix').setDescription('pile, face ou un nombre de 1 à 6')))
 .addSubcommand(s=>s.setName('regles').setDescription('Probabilités et gains')),
 new SlashCommandBuilder().setName('loterie').setDescription('Loterie communautaire en monnaie virtuelle')
 .addSubcommand(s=>s.setName('ouvrir').setDescription('Staff : ouvrir une loterie').addIntegerOption(o=>o.setName('prix').setDescription('Prix du ticket').setRequired(true).setMinValue(1).setMaxValue(100000)).addIntegerOption(o=>o.setName('minutes').setDescription('Durée, maximum 7 jours').setRequired(true).setMinValue(1).setMaxValue(10080)))
 .addSubcommand(s=>s.setName('acheter').setDescription('Acheter des tickets').addIntegerOption(o=>o.setName('tickets').setDescription('Nombre de tickets (10 maximum par joueur)').setRequired(true).setMinValue(1).setMaxValue(10)))
 .addSubcommand(s=>s.setName('info').setDescription('Cagnotte et date de tirage'))
 .addSubcommand(s=>s.setName('tirer').setDescription('Effectuer le tirage après la date de fin')),
 new SlashCommandBuilder().setName('minijeu').setDescription('Mini-jeux gratuits, sans mise')
 .addStringOption(o=>o.setName('jeu').setDescription('Jeu').setRequired(true).addChoices(...['chifoumi','devinette','de'].map(value=>({name:value,value}))))
 .addStringOption(o=>o.setName('choix').setDescription('pierre, feuille, ciseaux ou un nombre de 1 à 10'))
 ];}
async function register(client){for(const c of commands())await client.application.commands.create(c.toJSON());}
async function handle(i,{db,saveDb}){
 if(!['casino','loterie','minijeu'].includes(i.commandName))return false;if(!i.guildId)throw new Error('Utilise cette commande dans un serveur Discord.');
 const gid=i.guildId,user=i.user.id;let text,changed=false;
 if(i.commandName==='minijeu')text=arcade.minigame(i.options.getString('jeu'),i.options.getString('choix'));
 else if(i.commandName==='casino'){
 if(i.options.getSubcommand()==='regles')text='🎰 Monnaie virtuelle uniquement. Pile/face : 1 chance sur 2, paiement total ×2. Dés : 1 chance sur 6, paiement ×5. Slots : 6 symboles équiprobables ; triple ×10 (1/36), paire ×1 (15/36), sinon 0. Les paiements incluent la mise. 10 secondes entre deux mises. Aucun retrait en argent réel.';
 else{const p=arcade.play(db,gid,user,i.id,i.options.getString('jeu'),i.options.getInteger('mise'),i.options.getString('choix'));changed=true;text=`🎰 ${p.result}\nMise : ${p.bet} · Paiement : ${p.payout} · Bilan : ${p.net>=0?'+':''}${p.net} crédits virtuels.`;}
 }else{
 const sub=i.options.getSubcommand();let l;
 if(sub==='ouvrir'){if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild))throw new Error('Permission Gérer le serveur requise.');l=arcade.open(db,gid,i.options.getInteger('prix'),i.options.getInteger('minutes'));changed=true;}
 else if(sub==='acheter'){l=arcade.buy(db,gid,user,i.id,i.options.getInteger('tickets'));changed=true;}
 else if(sub==='tirer'){l=arcade.draw(db,gid);changed=true;text=l.winnerId?`🎉 Gagnant : <@${l.winnerId}> — ${l.pot} crédits versés dans sa banque.`:'Loterie terminée sans participant.';}
 else l=arcade.current(db,gid);
 text||=l?`🎟️ Ticket : ${l.price} crédits · Cagnotte : ${l.pot}\nFin : <t:${Math.floor(l.endsAt/1000)}:F>\nTickets : ${l.tickets.reduce((n,t)=>n+t.count,0)}. Après la fin, utilise /loterie tirer ; chacun de tes tickets a la même chance de gagner.`:'Aucune loterie ouverte. Le staff peut utiliser /loterie ouvrir.';
 }
 if(changed)await saveDb(db);await i.editReply({content:text,allowedMentions:{parse:[]}});return true;
}
module.exports={commands,register,handle};
