'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const data = require('./nasdara-data');

const command = new SlashCommandBuilder()
  .setName('nasdara')
  .setDescription('Nasdara DayZ : bunkers, antennes et décodeur Morse')
  .addSubcommand(s => s.setName('guide').setDescription('Comprendre les bunkers et les transmissions radio'))
  .addSubcommand(s => s.setName('bunkers').setDescription('Voir les 23 emplacements connus')
    .addIntegerOption(o => o.setName('page').setDescription('Page 1 à 3').setMinValue(1).setMaxValue(3)))
  .addSubcommand(s => s.setName('antennes').setDescription('Trouver les tours TC6 et les autres antennes'))
  .addSubcommand(s => s.setName('codes').setDescription('Voir les codes reçus par le récepteur audio Extinction++ RSS'))
  .addSubcommand(s => s.setName('decoder').setDescription('Décoder une transmission en chiffres ou en Morse')
    .addStringOption(o => o.setName('signal').setDescription('Ex. 1001210481 ou Morse séparé par espaces').setMaxLength(300).setRequired(true)))
  .addSubcommand(s => s.setName('position').setDescription('Chercher un bunker par sa position')
    .addStringOption(o => o.setName('grille').setDescription('Ex. 100121 ou 100 121').setMaxLength(7).setRequired(true)));

function commands() { return [command]; }

function links() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Décodeur DayZAide').setURL(data.SOURCE_URL),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Carte Nasdara').setURL(data.MAP_URL)
  )];
}

function embed(title, description) {
  return new EmbedBuilder().setColor(0xC9A15B).setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'Données : DayZAide · Les bunkers ouverts et codes changent en jeu.' });
}

function formatBunker(b) {
  return '**' + b.grid.slice(0, 3) + ' ' + b.grid.slice(3) + '** · ' + b.type + ' · X ' + b.x + ' / Z ' + b.z;
}

async function handle(interaction, {db}={}) {
  if (interaction.commandName !== 'nasdara') return false;
  const sub = interaction.options.getSubcommand();
  let message;

  if (sub === 'guide') {
    message = embed('📡 Nasdara · Fréquence des bunkers',
      '1. Pendant la diffusion nocturne (environ **17h45 à 06h00**, heure du jeu), monte sur une **tour TC6** avec une radio et une pile.\n' +
      '2. Écoute le Morse et relève **6 chiffres de position + 4 chiffres de cadenas**.\n' +
      '3. Utilise **/nasdara decoder** pour trouver le bunker et afficher le code entendu.\n\n' +
      '🗺️ **23 positions** répertoriées, mais seules certaines sont ouvertes à la fois. Les bunkers actifs changent au fil des cycles du jeu.\n' +
      '⚠️ Le bot **ne connaît pas les codes actifs en direct** : ils viennent exclusivement de la transmission que tu saisis.\n\n' +
      'Commandes : /nasdara bunkers · /nasdara antennes · /nasdara decoder · /nasdara position · /nasdara codes.'
    );
  } else if (sub === 'bunkers') {
    const page = interaction.options.getInteger('page') || 1;
    const pageSize = 8;
    const start = (page - 1) * pageSize;
    const rows = data.BUNKERS.slice(start, start + pageSize);
    message = embed('🔐 Nasdara · Bunkers ' + (start + 1) + ' à ' + (start + rows.length) + ' / 23',
      rows.map(formatBunker).join('\n') +
      '\n\nLes coordonnées X / Z indiquent l’emplacement sur la carte, **pas** un état ouvert/fermé. Page ' + page + '/3.'
    );
  } else if (sub === 'antennes') {
    message = embed('📻 Nasdara · Antennes radio',
      data.ANTENNAS.map(a => '📡 **' + a.type + '** · X ' + a.x + ' / Z ' + a.z).join('\n') +
      '\n\nPour écouter la transmission des bunkers, privilégie les **tours TC6**, radio allumée et pile installée.'
    );
  } else if (sub === 'codes') {
    const received=(Array.isArray(db?.nasdaraSignals)?db.nasdaraSignals:[])
      .filter(x=>Date.now()-Date.parse(x.observedAt)<2*60*60*1000)
      .sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt)).slice(0,8);
    message=embed('📻 Bunker Nasdas · Codes captés',
      received.length?received.map(r=>{
        const bunker=data.findBunker(r.position);
        return '🔐 **'+r.position.slice(0,3)+' '+r.position.slice(3)+'** · code **'+r.code+'** · '+(bunker?.type||'Bunker')+
          '\\n'+(r.count>=2?'Répété '+r.count+' fois':'Capté une fois')+' · '+new Date(r.observedAt).toLocaleString('fr-FR');
      }).join('\\n\\n')+'\\n\\nCodes signalés par le navigateur audio du Discord ; non certifiés directement par le serveur DayZ.'
        :'Aucune transmission audio complète enregistrée dans les deux dernières heures. Ouvre la rubrique **Bunker Nasdas** du Dashboard et active la capture du son du jeu.'
    );
  } else if (sub === 'position') {
    try {
      const input = interaction.options.getString('grille', true);
      const grid = data.normalizePosition(input);
      const bunker = data.findBunker(grid);
      message = embed('🔎 Nasdara · Recherche bunker',
        bunker ? '✅ Bunker trouvé :\n' + formatBunker(bunker) + '\n\n**Code :** à récupérer dans la transmission radio du serveur.'
          : 'Aucun bunker répertorié pour la grille **' + grid + '**. Vérifie les 6 chiffres captés.'
      );
    } catch (error) {
      message = embed('⚠️ Position invalide', error.message);
    }
  } else if (sub === 'decoder') {
    try {
      const result = data.decodeTransmission(interaction.options.getString('signal', true));
      message = embed('📟 Nasdara · Transmission décodée',
        '**Position :** ' + result.position.slice(0, 3) + ' ' + result.position.slice(3) +
        '\n**Cadenas entendu :** ' + (result.code ? '**' + result.code + '**' : 'non fourni (4 chiffres manquants)') +
        '\n**Bunker :** ' + (result.bunker ? formatBunker(result.bunker) : 'aucune correspondance parmi les 23 bunkers répertoriés') +
        '\n\n⚠️ Le code affiché provient **uniquement du signal fourni**, sans vérification de son activation sur le serveur.'
      );
    } catch (error) {
      message = embed('⚠️ Transmission invalide', error.message);
    }
  } else {
    return false;
  }

  await interaction.editReply({ embeds: [message], components: links(), allowedMentions: { parse: [] } });
  return true;
}

async function register(client) {
  return client.application.commands.create(command.toJSON());
}

module.exports = { commands, handle, register, formatBunker };
