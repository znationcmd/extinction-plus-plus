const config = require('./config');
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const games = [
  { name: 'DayZ PC', value: 'dayz_pc' },
  { name: 'DayZ PlayStation', value: 'dayz_ps' },
  { name: 'DayZ Xbox', value: 'dayz_xbox' },
  { name: 'ARK Crossplay', value: 'ark' },
  { name: 'Palworld', value: 'palworld' },
  { name: 'Arma Reforger Crossplay', value: 'arma' },
  { name: 'Conan Exiles', value: 'conan' }
];

const commands = [
  new SlashCommandBuilder().setName('shoplink').setDescription('Ouvrir le Shop public Extinction++ RSS'),
  new SlashCommandBuilder().setName('dashboard').setDescription('Obtenir le lien du Dashboard Extinction++ RSS'),
  new SlashCommandBuilder().setName('battlepass').setDescription('Ouvrir le Battle Pass Extinction++ RSS'),
  new SlashCommandBuilder().setName('quetes').setDescription('Ouvrir les quêtes Extinction++ RSS'),
  new SlashCommandBuilder().setName('rp').setDescription('Ouvrir le système RP Extinction++ RSS'),
  new SlashCommandBuilder().setName('stats').setDescription('Ouvrir les statistiques Extinction++ RSS'),
  new SlashCommandBuilder().setName('economy').setDescription('Ouvrir économie et banque Extinction++ RSS'),
  new SlashCommandBuilder().setName('tickets').setDescription('Ouvrir les tickets Extinction++ RSS'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Ouvrir les classements Extinction++ RSS'),
  new SlashCommandBuilder()
    .setName('nitrado')
    .setDescription('Connexion réelle à Nitrado')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc => sc.setName('test').setDescription('Tester le token Nitrado'))
    .addSubcommand(sc => sc.setName('services').setDescription('Lister les services Nitrado'))
    .addSubcommand(sc => sc.setName('info').setDescription('Infos gameserver')
      .addStringOption(o => o.setName('service_id').setDescription('ID service Nitrado').setRequired(true)))
    .addSubcommand(sc => sc.setName('fileserver').setDescription('Infos file server')
      .addStringOption(o => o.setName('service_id').setDescription('ID service Nitrado').setRequired(true)))
    .addSubcommand(sc => sc.setName('restart').setDescription('Redémarrer le service')
      .addStringOption(o => o.setName('service_id').setDescription('ID service Nitrado').setRequired(true)))
    .addSubcommand(sc => sc.setName('raw').setDescription('Appel brut API Nitrado')
      .addStringOption(o => o.setName('endpoint').setDescription('Ex: /services').setRequired(true))),
  new SlashCommandBuilder().setName('ownerconfig').setDescription('Configurer Nitrado et les serveurs propriétaire'),

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure automatiquement le Discord pour Extinction++ RSS')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Afficher le panneau principal'),

  new SlashCommandBuilder()
    .setName('serveur')
    .setDescription('Gestion des serveurs / maps')
    .addSubcommand(s => s.setName('ajouter').setDescription('Ajouter un serveur')
      .addStringOption(o => o.setName('jeu').setDescription('Jeu').setRequired(true).addChoices(...games))
      .addStringOption(o => o.setName('nom').setDescription('Nom du serveur').setRequired(true))
      .addStringOption(o => o.setName('map').setDescription('Map').setRequired(true))
      .addStringOption(o => o.setName('plateforme').setDescription('PC/Xbox/PlayStation').setRequired(false))
      .addStringOption(o => o.setName('nitrado_id').setDescription('ID Nitrado').setRequired(false))
      .addStringOption(o => o.setName('ip').setDescription('IP').setRequired(false))
      .addStringOption(o => o.setName('port').setDescription('Port jeu/web').setRequired(false))
      .addStringOption(o => o.setName('provider').setDescription('Hébergeur').setRequired(false)
        .addChoices({ name:'Nitrado', value:'nitrado' }, { name:'GPortal', value:'gportal' }, { name:'Autre', value:'other' }))
      .addStringOption(o => o.setName('rcon_host').setDescription('IP/host RCON').setRequired(false))
      .addIntegerOption(o => o.setName('rcon_port').setDescription('Port RCON').setRequired(false))
      .addStringOption(o => o.setName('rcon_password').setDescription('Mot de passe RCON').setRequired(false))
      .addStringOption(o => o.setName('image').setDescription('URL image').setRequired(false)))
    .addSubcommand(s => s.setName('liste').setDescription('Liste des serveurs')),

  new SlashCommandBuilder()
    .setName('rcon')
    .setDescription('Commandes RCON réelles Nitrado/GPortal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc => sc.setName('test').setDescription('Tester RCON')
      .addStringOption(o => o.setName('serveur').setDescription('Nom ou ID serveur').setRequired(true)))
    .addSubcommand(sc => sc.setName('cmd').setDescription('Envoyer une commande RCON')
      .addStringOption(o => o.setName('serveur').setDescription('Nom ou ID serveur').setRequired(true))
      .addStringOption(o => o.setName('commande').setDescription('Commande RCON').setRequired(true))),

  new SlashCommandBuilder()
    .setName('whitelist-panel')
    .setDescription('Créer un bouton whitelist dans un salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('serveur').setDescription('Nom serveur').setRequired(true))
    .addStringOption(o => o.setName('map').setDescription('Map').setRequired(true))
    .addChannelOption(o => o.setName('salon').setDescription('Salon où envoyer le panneau').setRequired(true))
    .addStringOption(o => o.setName('label').setDescription('Texte du bouton').setRequired(false)),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Shop type DayZ++ RSS')
    .addSubcommand(s => s.setName('create').setDescription('Créer un item shop')
      .addStringOption(o => o.setName('jeu').setDescription('Jeu').setRequired(true).addChoices(...games))
      .addStringOption(o => o.setName('serveur').setDescription('Nom du serveur').setRequired(true))
      .addStringOption(o => o.setName('map').setDescription('Map').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Nom item').setRequired(true))
      .addStringOption(o => o.setName('category').setDescription('Catégorie').setRequired(true))
      .addIntegerOption(o => o.setName('price').setDescription('Prix').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('Type').setRequired(false)
        .addChoices(
          { name: 'Item', value: 'item' },
          { name: 'Argent', value: 'money' },
          { name: 'Véhicule', value: 'vehicle' },
          { name: 'Kit', value: 'kit' },
          { name: 'VIP', value: 'vip' },
          { name: 'Dino ARK', value: 'ark_dino' }
        ))
      .addStringOption(o => o.setName('blueprint').setDescription('Blueprint ARK ou classname DayZ').setRequired(false)))
    .addSubcommand(s => s.setName('list').setDescription('Voir le shop')
      .addStringOption(o => o.setName('jeu').setDescription('Jeu').setRequired(false).addChoices(...games))
      .addStringOption(o => o.setName('serveur').setDescription('Serveur').setRequired(false)))
    .addSubcommand(s => s.setName('buy').setDescription('Acheter un item')
      .addStringOption(o => o.setName('id').setDescription('ID item').setRequired(true))
      .addStringOption(o => o.setName('playerid').setDescription('SteamID/EOS ID ARK ou pseudo').setRequired(false))
      .addIntegerOption(o => o.setName('x').setDescription('Coordonnée X livraison').setRequired(false))
      .addIntegerOption(o => o.setName('z').setDescription('Coordonnée Z livraison').setRequired(false))),

  new SlashCommandBuilder()
    .setName('event')
    .setDescription('Connexion, déconnexion et killfeed')
    .addSubcommand(s => s.setName('kill').setDescription('Ajouter kill')
      .addStringOption(o => o.setName('jeu').setDescription('Jeu').setRequired(true).addChoices(...games))
      .addStringOption(o => o.setName('serveur').setDescription('Serveur').setRequired(true))
      .addStringOption(o => o.setName('killer').setDescription('Tueur').setRequired(true))
      .addStringOption(o => o.setName('victim').setDescription('Victime').setRequired(true))
      .addStringOption(o => o.setName('weapon').setDescription('Arme').setRequired(false))
      .addIntegerOption(o => o.setName('distance').setDescription('Distance').setRequired(false)))
    .addSubcommand(s => s.setName('login').setDescription('Ajouter connexion')
      .addStringOption(o => o.setName('jeu').setDescription('Jeu').setRequired(true).addChoices(...games))
      .addStringOption(o => o.setName('serveur').setDescription('Serveur').setRequired(true))
      .addStringOption(o => o.setName('player').setDescription('Joueur').setRequired(true)))
    .addSubcommand(s => s.setName('logout').setDescription('Ajouter déconnexion')
      .addStringOption(o => o.setName('jeu').setDescription('Jeu').setRequired(true).addChoices(...games))
      .addStringOption(o => o.setName('serveur').setDescription('Serveur').setRequired(true))
      .addStringOption(o => o.setName('player').setDescription('Joueur').setRequired(true))),

  new SlashCommandBuilder()
    .setName('alarme')
    .setDescription('Alarmes de base')
    .addSubcommand(s => s.setName('creer').setDescription('Créer une alarme')
      .addStringOption(o => o.setName('serveur').setDescription('Serveur').setRequired(true))
      .addStringOption(o => o.setName('nom').setDescription('Nom base').setRequired(true))
      .addNumberOption(o => o.setName('x').setDescription('X').setRequired(true))
      .addNumberOption(o => o.setName('z').setDescription('Z').setRequired(true))
      .addIntegerOption(o => o.setName('rayon').setDescription('Rayon').setRequired(true))),

  new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Banque RSS : solde, paiement, ajout admin')
    .addSubcommand(s => s.setName('solde').setDescription('Voir ton solde banque'))
    .addSubcommand(s => s.setName('pay').setDescription('Payer un joueur')
      .addUserOption(o => o.setName('joueur').setDescription('Joueur à payer').setRequired(true))
      .addIntegerOption(o => o.setName('montant').setDescription('Montant').setRequired(true))
      .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)))
    .addSubcommand(s => s.setName('add').setDescription('Ajouter argent banque admin')
      .addUserOption(o => o.setName('joueur').setDescription('Joueur').setRequired(true))
      .addIntegerOption(o => o.setName('montant').setDescription('Montant').setRequired(true))
      .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false))),

  new SlashCommandBuilder()
    .setName('ia')
    .setDescription('Assistant IA Extinction++ RSS')
    .addSubcommand(s => s.setName('question').setDescription('Poser une question à l’assistant')
      .addStringOption(o => o.setName('message').setDescription('Question').setRequired(true)))
    .addSubcommand(s => s.setName('aide').setDescription('Voir l’aide de l’assistant')),


  new SlashCommandBuilder()
    .setName('quete')
    .setDescription('Quêtes RSS')
    .addSubcommand(sc => sc.setName('liste').setDescription('Lister les quêtes'))
    .addSubcommand(sc => sc.setName('preuve').setDescription('Envoyer une preuve')
      .addStringOption(o => o.setName('id').setDescription('ID quête').setRequired(false))
      .addAttachmentOption(o => o.setName('photo').setDescription('Photo preuve').setRequired(false))),

  new SlashCommandBuilder()
    .setName('interpol')
    .setDescription('Interpol communautaire')
    .addSubcommand(s => s.setName('signaler').setDescription('Signaler un joueur')
      .addStringOption(o => o.setName('joueur').setDescription('Pseudo/ID').setRequired(true))
      .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(true)))
];

const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Déploiement des commandes Extinction++ RSS...');
    await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands.map(c => c.toJSON()) });
    console.log('✅ Commandes globales enregistrées.');
  } catch (error) {
    console.error('❌ Erreur deploy:', error);
  }
})();
