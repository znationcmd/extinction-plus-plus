const fs = require('fs');
const path = require('path');
const { Rcon } = require('rcon-client');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const config = require('./config');
const { getGuildTheme, hexToInt } = require('./theme-helper');
const nitradoApi = require('./shared/nitrado-api');
const rconTools = require('./shared/rcon-tools');

function isHttpUrl(value) {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const dbPath = path.resolve(__dirname, config.DATABASE_PATH || '../shared/database.json');

function loadDb() {
  if (!fs.existsSync(dbPath)) return { guilds:{}, users:{}, events:[], pendingWhitelist:[], shopPurchases:[], battlepass:{levels:[]}, quests:[], deliveries:[], interpol:[], alarms:[], rp:{jobs:[]}, shop:[] };
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}
function saveDb(db) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}
function getGuild(db, guildId, guildName='') {
  db.guilds = db.guilds || {};
  db.guilds[guildId] = db.guilds[guildId] || { id:guildId, name:guildName, channels:{}, roles:{}, servers:[], shop:[], theme:{} };
  if (guildName) db.guilds[guildId].name = guildName;
  db.guilds[guildId].servers = db.guilds[guildId].servers || [];
  db.guilds[guildId].shop = db.guilds[guildId].shop || [];
  return db.guilds[guildId];
}
function isAdmin(interaction) {
  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (config.ADMIN_ROLE_ID && interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) return true;
  return false;
}
function addEvent(db, guildId, event) {
  db.events = db.events || [];
  db.events.push({ id:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`, guildId, createdAt:new Date().toISOString(), ...event });
  if (db.events.length > 2000) db.events = db.events.slice(-2000);
}
async function sendLog(interaction, content) {
  const db = loadDb();
  const cfg = getGuild(db, interaction.guildId, interaction.guild?.name);
  const id = cfg.channels?.logs;
  if (!id) return;
  const ch = await interaction.guild.channels.fetch(id).catch(()=>null);
  if (ch) await ch.send(content).catch(()=>null);
}
async function setupGuild(guild) {
  const db = loadDb();
  const cfg = getGuild(db, guild.id, guild.name);

  let category = await guild.channels.create({ name:'EXTINCTION BOT', type:ChannelType.GuildCategory });
  let panel = await guild.channels.create({ name:'extinction-panel', type:ChannelType.GuildText, parent:category.id });
  let whitelist = await guild.channels.create({ name:'whitelist-demandes', type:ChannelType.GuildText, parent:category.id });
  let logs = await guild.channels.create({ name:'logs-extinction', type:ChannelType.GuildText, parent:category.id });
  let quests = await guild.channels.create({ name:'quetes-preuves', type:ChannelType.GuildText, parent:category.id });
  let role = await guild.roles.create({ name:'Whitelist Validée' }).catch(()=>null);

  cfg.channels = { panel:panel.id, whitelist:whitelist.id, logs:logs.id, quests:quests.id };
  cfg.roles = cfg.roles || {};
  if (role) cfg.roles.whitelist = role.id;
  saveDb(db);

  const theme = getGuildTheme(db, guild.id);
  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${theme.serverName}`)
    .setDescription('Extinction++ RSS : Shop, whitelist, Battle Pass, quêtes, killfeed.')
    .setColor(hexToInt(theme.embedColor));
  if (isHttpUrl(theme.logoUrl)) embed.setThumbnail(theme.logoUrl);
  if (isHttpUrl(theme.bannerUrl)) embed.setImage(theme.bannerUrl);

  await panel.send({
    embeds:[embed],
    components:[new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_shop').setLabel('🛒 Shop').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('panel_bp').setLabel('🎖️ Battle Pass').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('panel_quests').setLabel('📋 Quêtes').setStyle(ButtonStyle.Secondary)
    )]
  });
  return { panel, whitelist, logs, quests };
}
function findArkServerByShopServer(serverName) {
  const key = Object.keys(config.ARK_SERVERS || {}).find(k => {
    const s = config.ARK_SERVERS[k];
    return String(s.name).toLowerCase().includes(String(serverName).toLowerCase()) || String(k).toLowerCase() === String(serverName).toLowerCase();
  });
  return key ? config.ARK_SERVERS[key] : null;
}
async function giveArkItem(server, playerId, blueprint, qty=1) {
  if (!server) throw new Error('Serveur ARK introuvable');
  if (!blueprint) throw new Error('Blueprint manquant');
  const rcon = await Rcon.connect({ host: server.host, port: Number(server.rconPort), password: server.password });
  try {
    const cmd = blueprint.startsWith('Blueprint')
      ? `GiveItemToPlayer ${playerId} "${blueprint}" ${qty} 0 0`
      : `GiveItemNumToPlayer ${playerId} ${blueprint} ${qty} 0 0`;
    return await rcon.send(cmd);
  } finally {
    rcon.end();
  }
}


function getBankAccount(db, guildId, userId) {
  db.bank = db.bank || { accounts: [] };
  db.bank.accounts = db.bank.accounts || [];
  let account = db.bank.accounts.find(a => a.guildId === guildId && a.userId === userId);
  if (!account) {
    account = { guildId, userId, cash: 0, bank: 0, createdAt: new Date().toISOString() };
    db.bank.accounts.push(account);
  }
  return account;
}

function addBankTransaction(db, tx) {
  db.economy = db.economy || { currencies: [], transactions: [] };
  db.economy.transactions = db.economy.transactions || [];
  db.economy.transactions.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`, createdAt: new Date().toISOString(), ...tx });
}

function localAiAnswer(message) {
  const q = String(message || '').toLowerCase();
  if (!q.trim()) return 'Pose-moi une question sur Extinction++ RSS.';
  if (q.includes('nitrado')) return 'Pour Nitrado : remplis NITRADO_TOKEN dans Railway/config, puis teste avec /nitrado test et /nitrado services. Ajoute ensuite le serveur avec /serveur ajouter et son nitrado_id.';
  if (q.includes('rcon') || q.includes('gportal')) return 'Pour RCON : active RCON dans ton hébergeur (Nitrado/GPortal), puis ajoute rcon_host, rcon_port et rcon_password avec /serveur ajouter. Teste avec /rcon test.';
  if (q.includes('whitelist') || q.includes('whiltliste')) return 'Whitelist : un admin crée le panneau avec /whitelist-panel. Le joueur clique sur le bouton, écrit son pseudo, puis les admins valident dans le salon whitelist.';
  if (q.includes('shop') || q.includes('boutique')) return 'Shop : crée un item avec /shop create, affiche la liste avec /shop list, achat avec /shop buy. Les commandes sont aussi visibles dans le dashboard /shop.';
  if (q.includes('banque') || q.includes('bank') || q.includes('argent')) return 'Banque : /bank solde pour voir ton argent, /bank pay pour payer un joueur, /bank add pour ajouter de l’argent en admin. Le dashboard Économie affiche transactions et comptes.';
  if (q.includes('rp') || q.includes('metier') || q.includes('métier')) return 'RP : le dashboard RP contient métiers, licences, amendes, mandats, entreprises, propriétés et salaires. Utilise la page RP pour gérer les données.';
  if (q.includes('interpol')) return 'INTERPOL : /interpol signaler crée un dossier joueur. La page INTERPOL du dashboard centralise les dossiers et signalements.';
  if (q.includes('kill') || q.includes('connexion') || q.includes('déconnexion')) return 'Killfeed : /event kill ajoute un kill, /event login ajoute une connexion, /event logout ajoute une déconnexion. Les événements apparaissent dans le dashboard Killfeed.';
  return 'Je peux aider sur : Nitrado, RCON/GPortal, whitelist, shop, banque, RP, INTERPOL, killfeed, Battle Pass, quêtes et dashboard. Dis-moi ce que tu ne comprends pas.';
}

async function aiAnswer(message) {
  const key = process.env.OPENAI_API_KEY || config.OPENAI_API_KEY || '';
  if (!key) return localAiAnswer(message);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || config.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es l’assistant intégré Extinction++ RSS. Réponds en français, simplement, pour aider les admins et joueurs à utiliser Nitrado, RCON, whitelist, shop, banque, RP, INTERPOL, killfeed et dashboard.' },
          { role: 'user', content: String(message).slice(0, 2000) }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || localAiAnswer(message);
  } catch (e) {
    return localAiAnswer(message);
  }
}

client.once('clientReady', () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  try {
    const db = loadDb();

    if (interaction.isButton()) {
      if (interaction.customId === 'panel_shop') return interaction.reply({ ephemeral:true, content:'Utilise `/shop list` pour voir le shop.' });
      if (interaction.customId === 'panel_bp') return interaction.reply({ ephemeral:true, content:'Utilise `/battlepass`.' });
      if (interaction.customId === 'panel_quests') return interaction.reply({ ephemeral:true, content:'Utilise `/quete liste`.' });

      if (interaction.customId.startsWith('wlpanel_')) {
        const [, server, map] = interaction.customId.split('|');
        const modal = new ModalBuilder().setCustomId(`wlmodal|${server}|${map}`).setTitle(`Whitelist ${map}`);
        const pseudo = new TextInputBuilder().setCustomId('pseudo').setLabel('Pseudo / Gamertag / SteamID').setStyle(TextInputStyle.Short).setRequired(true);
        const plateforme = new TextInputBuilder().setCustomId('plateforme').setLabel('Plateforme PC/Xbox/PlayStation').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(pseudo), new ActionRowBuilder().addComponents(plateforme));
        return interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('wlmodal|')) {
        const [, server, map] = interaction.customId.split('|');
        const pseudo = interaction.fields.getTextInputValue('pseudo');
        const plateforme = interaction.fields.getTextInputValue('plateforme');
        const cfg = getGuild(db, interaction.guildId, interaction.guild.name);
        db.pendingWhitelist = db.pendingWhitelist || [];
        db.pendingWhitelist.push({ id:`${Date.now()}_${interaction.user.id}`, guildId:interaction.guildId, userId:interaction.user.id, server, map, plateforme, pseudo, createdAt:new Date().toISOString() });
        saveDb(db);
        const ch = cfg.channels?.whitelist ? await interaction.guild.channels.fetch(cfg.channels.whitelist).catch(()=>null) : null;
        if (ch) await ch.send(`🛡️ **Demande whitelist**\nJoueur: <@${interaction.user.id}>\nServeur: **${server}**\nMap: **${map}**\nPlateforme: **${plateforme}**\nPseudo: **${pseudo}**`);
        return interaction.reply({ ephemeral:true, content:'✅ Demande envoyée.' });
      }
    }

    if (!interaction.isChatInputCommand()) return;



    if (interaction.commandName === 'shoplink') {
      const db = loadDb();
      const theme = getGuildTheme(db, interaction.guildId);
      const url = config.SHOP_URL || 'http://localhost:3000/shop';

      const embed = new EmbedBuilder()
        .setTitle('🛒 Shop Extinction++ RSS')
        .setDescription('Ouvre le Shop public pour faire tes achats.')
        .setColor(hexToInt(theme.embedColor));

      if (isHttpUrl(theme.logoUrl)) embed.setThumbnail(theme.logoUrl);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🛒 Ouvrir le Shop')
          .setStyle(ButtonStyle.Link)
          .setURL(url)
      );

      return interaction.reply({
        ephemeral: true,
        embeds: [embed],
        components: [row]
      });
    }

    if (interaction.commandName === 'dashboard') {
      if (!isAdmin(interaction)) return interaction.reply({ ephemeral: true, content: "❌ Vous n'avez pas l'autorisation d'accéder au Dashboard." });
      const db = loadDb();
      const theme = getGuildTheme(db, interaction.guildId);
      const url = config.DASHBOARD_URL || 'http://localhost:3000';

      const embed = new EmbedBuilder()
        .setTitle('🌐 Dashboard Extinction++ RSS')
        .setDescription('Ouvre le Dashboard depuis PC, téléphone ou tablette.')
        .setColor(hexToInt(theme.embedColor));

      if (isHttpUrl(theme.logoUrl)) embed.setThumbnail(theme.logoUrl);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🌐 Ouvrir Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(url)
      );

      return interaction.reply({
        ephemeral: true,
        embeds: [embed],
        components: [row]
      });
    }

    if (interaction.commandName === 'setup') {
      if (!isAdmin(interaction)) return interaction.reply({ ephemeral:true, content:'❌ Admin uniquement.' });
      await interaction.deferReply({ ephemeral:true });
      const r = await setupGuild(interaction.guild);
      return interaction.editReply(`✅ Discord configuré.\nPanel: ${r.panel}\nWhitelist: ${r.whitelist}\nLogs: ${r.logs}\nQuêtes: ${r.quests}`);
    }

    if (interaction.commandName === 'panel') {
      const cfg = getGuild(db, interaction.guildId, interaction.guild.name);
      const theme = getGuildTheme(db, interaction.guildId);
      const embed = new EmbedBuilder().setTitle(`🎮 ${theme.serverName}`).setDescription('Extinction++ RSS').setColor(hexToInt(theme.embedColor));
      if (isHttpUrl(theme.logoUrl)) embed.setThumbnail(theme.logoUrl);
      if (isHttpUrl(theme.bannerUrl)) embed.setImage(theme.bannerUrl);
      return interaction.reply({ embeds:[embed] });
    }



    if (interaction.commandName === 'nitrado') {
      if (!isAdmin(interaction)) return interaction.reply({ ephemeral:true, content:'❌ Admin uniquement.' });
      await interaction.deferReply({ ephemeral:true });
      const sub = interaction.options.getSubcommand();

      if (sub === 'test') {
        const data = await nitradoApi.listServices();
        const services = nitradoApi.servicesSummary(data);
        return interaction.editReply(`✅ Connexion Nitrado OK. Services trouvés : ${services.length}`);
      }

      if (sub === 'services') {
        const data = await nitradoApi.listServices();
        const services = nitradoApi.servicesSummary(data);
        if (!services.length) return interaction.editReply('Aucun service Nitrado trouvé avec ce token.');
        return interaction.editReply(services.slice(0, 20).map(s => `• **${s.id}** — ${s.name} — ${s.address || 'adresse inconnue'} — ${s.status}`).join('\n'));
      }

      if (sub === 'info') {
        const id = interaction.options.getString('service_id');
        const data = await nitradoApi.getGameServer(id);
        return interaction.editReply('```json\n' + JSON.stringify(data, null, 2).slice(0, 1800) + '\n```');
      }

      if (sub === 'fileserver') {
        const id = interaction.options.getString('service_id');
        const data = await nitradoApi.getFileServer(id);
        return interaction.editReply('```json\n' + JSON.stringify(data, null, 2).slice(0, 1800) + '\n```');
      }

      if (sub === 'restart') {
        const id = interaction.options.getString('service_id');
        await nitradoApi.restart(id);
        return interaction.editReply(`✅ Redémarrage demandé pour le service Nitrado **${id}**.`);
      }

      if (sub === 'raw') {
        const endpoint = interaction.options.getString('endpoint');
        const data = await nitradoApi.request(endpoint);
        return interaction.editReply('```json\n' + JSON.stringify(data, null, 2).slice(0, 1800) + '\n```');
      }
    }

    if (interaction.commandName === 'rcon') {
      if (!isAdmin(interaction)) return interaction.reply({ ephemeral:true, content:'❌ Admin uniquement.' });
      await interaction.deferReply({ ephemeral:true });
      const sub = interaction.options.getSubcommand();
      const query = interaction.options.getString('serveur');
      const server = rconTools.findServer(db, interaction.guildId, query);
      if (!server) return interaction.editReply('❌ Serveur introuvable. Utilise `/serveur liste`.');
      let commande = interaction.options.getString('commande');
      if (sub === 'test') {
        const game = String(server.game || '').toLowerCase();
        commande = game === 'ark' ? 'ListPlayers' : 'players';
      }
      const response = await rconTools.send(server, commande);
      return interaction.editReply(`✅ RCON OK sur **${server.name}**\nCommande: \`${commande}\`\n\`\`\`\n${String(response || 'OK').slice(0,1800)}\n\`\`\``);
    }

    const quickLinks = {
      battlepass: ['/battlepass-admin', '🎟️ Ouvrir le Battle Pass', 'Battle Pass Extinction++ RSS'],
      quetes: ['/quests-admin', '🎯 Ouvrir les Quêtes', 'Quêtes Extinction++ RSS'],
      rp: ['/rp', '🎭 Ouvrir le RP', 'Système RP Extinction++ RSS'],
      stats: ['/stats', '📊 Ouvrir les Stats', 'Statistiques Extinction++ RSS'],
      economy: ['/economy', '💰 Ouvrir Économie', 'Économie & Banque Extinction++ RSS'],
      tickets: ['/tickets', '🎫 Ouvrir Tickets', 'Tickets Extinction++ RSS'],
      leaderboard: ['/leaderboard', '🏆 Ouvrir Classements', 'Classements Extinction++ RSS'],
      ownerconfig: ['/owner-config', '🔑 Config propriétaire', 'Configuration propriétaire Discord Extinction++ RSS']
    };
    if (quickLinks[interaction.commandName]) {
      const [pathUrl, label, text] = quickLinks[interaction.commandName];
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(`${config.DASHBOARD_URL}${pathUrl}`).setLabel(label)
      );
      return interaction.reply({ ephemeral:true, content:text, components:[row] });
    }

    if (interaction.commandName === 'bank') {
      const sub = interaction.options.getSubcommand();
      const account = getBankAccount(db, interaction.guildId, interaction.user.id);

      if (sub === 'solde') {
        saveDb(db);
        return interaction.reply({ ephemeral:true, content:`🏦 Banque RSS
Cash: **${account.cash || 0}**
Banque: **${account.bank || 0}**` });
      }

      if (sub === 'add') {
        if (!isAdmin(interaction)) return interaction.reply({ ephemeral:true, content:'❌ Admin uniquement.' });
        const target = interaction.options.getUser('joueur');
        const amount = interaction.options.getInteger('montant');
        const reason = interaction.options.getString('raison') || 'Ajout admin';
        const targetAccount = getBankAccount(db, interaction.guildId, target.id);
        targetAccount.bank = (targetAccount.bank || 0) + amount;
        addBankTransaction(db, { guildId: interaction.guildId, type:'admin_add', from: interaction.user.id, to: target.id, amount, reason });
        saveDb(db);
        return interaction.reply({ ephemeral:true, content:`✅ ${amount} ajouté à la banque de ${target}.` });
      }

      if (sub === 'pay') {
        const target = interaction.options.getUser('joueur');
        const amount = interaction.options.getInteger('montant');
        const reason = interaction.options.getString('raison') || 'Paiement joueur';
        if (target.id === interaction.user.id) return interaction.reply({ ephemeral:true, content:'❌ Tu ne peux pas te payer toi-même.' });
        if (amount <= 0) return interaction.reply({ ephemeral:true, content:'❌ Montant invalide.' });
        if ((account.bank || 0) < amount) return interaction.reply({ ephemeral:true, content:'❌ Solde banque insuffisant.' });
        const targetAccount = getBankAccount(db, interaction.guildId, target.id);
        account.bank -= amount;
        targetAccount.bank = (targetAccount.bank || 0) + amount;
        addBankTransaction(db, { guildId: interaction.guildId, type:'player_pay', from: interaction.user.id, to: target.id, amount, reason });
        saveDb(db);
        return interaction.reply({ ephemeral:true, content:`✅ Tu as payé **${amount}** à ${target}.` });
      }
    }

    if (interaction.commandName === 'ia') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'aide') {
        return interaction.reply({ ephemeral:true, content:'🤖 IA RSS : utilise `/ia question message:...` pour demander de l’aide sur Nitrado, RCON, whitelist, shop, banque, RP, INTERPOL ou dashboard.' });
      }
      const msg = interaction.options.getString('message');
      await interaction.deferReply({ ephemeral:true });
      const answer = await aiAnswer(msg);
      return interaction.editReply(`🤖 **Assistant Extinction++ RSS**
${answer}`);
    }

    if (interaction.commandName === 'interpol') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'signaler') {
        const db = loadDb();
        db.interpol = db.interpol || [];
        const report = {
          id: `${Date.now()}_${interaction.user.id}`,
          guildId: interaction.guildId,
          reporter: interaction.user.id,
          player: interaction.options.getString('joueur'),
          reason: interaction.options.getString('raison'),
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        db.interpol.push(report);
        saveDb(db);
        return interaction.reply({ ephemeral:true, content:`🚓 Signalement Interpol enregistré pour **${report.player}**.` });
      }
    }

    if (interaction.commandName === 'alarme') {
      if (!isAdmin(interaction)) return interaction.reply({ ephemeral:true, content:'❌ Admin uniquement.' });
      const db = loadDb();
      db.alarms = db.alarms || [];
      const alarm = {
        id: `${Date.now()}`,
        guildId: interaction.guildId,
        serverId: interaction.options.getString('serveur'),
        name: interaction.options.getString('nom'),
        x: interaction.options.getNumber('x'),
        z: interaction.options.getNumber('z'),
        radius: interaction.options.getInteger('rayon'),
        allowed: [],
        enabled: true,
        createdAt: new Date().toISOString()
      };
      db.alarms.push(alarm);
      saveDb(db);
      return interaction.reply({ ephemeral:true, content:`🚨 Alarme créée : **${alarm.name}**.` });
    }

    if (interaction.commandName === 'serveur') {
      const cfg = getGuild(db, interaction.guildId, interaction.guild.name);
      const sub = interaction.options.getSubcommand();
      if (sub === 'ajouter') {
        if (!isAdmin(interaction)) return interaction.reply({ ephemeral:true, content:'❌ Admin uniquement.' });
        const game = interaction.options.getString('jeu');
        const name = interaction.options.getString('nom');
        const map = interaction.options.getString('map');
        const platform = interaction.options.getString('plateforme') || '';
        const nitradoId = interaction.options.getString('nitrado_id') || '';
        const ip = interaction.options.getString('ip') || '';
        const port = interaction.options.getString('port') || '';
        const provider = interaction.options.getString('provider') || (nitradoId ? 'nitrado' : 'other');
        const rconHost = interaction.options.getString('rcon_host') || ip || '';
        const rconPort = interaction.options.getInteger('rcon_port') || 0;
        const rconPassword = interaction.options.getString('rcon_password') || '';
        const image = interaction.options.getString('image') || '';
        cfg.servers.push({ id:`${Date.now()}_${Math.random().toString(36).slice(2,6)}`, game, name, map, platform, provider, nitradoId, nitradoServiceId:nitradoId, ip, port, rconHost, rconPort, rconPassword, image, enabled:true, createdAt:new Date().toISOString() });
        saveDb(db);
        return interaction.reply({ ephemeral:true, content:`✅ Serveur ajouté : **${name}** — ${game} — ${map}
Hébergeur: **${provider}**
Nitrado ID: **${nitradoId || 'non'}**
RCON: **${rconHost && rconPort && rconPassword ? 'configuré' : 'non configuré'}**` });
      }
      return interaction.reply({ ephemeral:true, content: cfg.servers.length ? cfg.servers.map(s=>`• **${s.id}** — **${s.name}** — ${s.game} — ${s.map} — ${s.provider || 'other'} — Nitrado:${s.nitradoId || s.nitradoServiceId || 'non'} — RCON:${(s.rconHost && s.rconPort) ? 'oui' : 'non'}`).join('\n') : 'Aucun serveur.' });
    }

    if (interaction.commandName === 'whitelist-panel') {
      if (!isAdmin(interaction)) return interaction.reply({ ephemeral:true, content:'❌ Admin uniquement.' });
      const server = interaction.options.getString('serveur');
      const map = interaction.options.getString('map');
      const salon = interaction.options.getChannel('salon');
      const label = interaction.options.getString('label') || `Whitelist ${map}`;
      await salon.send({
        content:`🛡️ **${label}**\nClique sur le bouton pour faire ta demande.`,
        components:[new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`wlpanel_|${server}|${map}`).setLabel(label).setStyle(ButtonStyle.Success)
        )]
      });
      return interaction.reply({ ephemeral:true, content:`✅ Panneau envoyé dans ${salon}.` });
    }

    if (interaction.commandName === 'shop') {
      const cfg = getGuild(db, interaction.guildId, interaction.guild.name);
      const sub = interaction.options.getSubcommand();
      if (sub === 'create') {
        if (!isAdmin(interaction)) return interaction.reply({ ephemeral:true, content:'❌ Admin uniquement.' });
        const item = {
          id:`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
          game:interaction.options.getString('jeu'),
          server:interaction.options.getString('serveur'),
          map:interaction.options.getString('map'),
          name:interaction.options.getString('name'),
          category:interaction.options.getString('category'),
          price:interaction.options.getInteger('price'),
          type:interaction.options.getString('type') || 'item',
          blueprint:interaction.options.getString('blueprint') || '',
          hidden:false,
          createdAt:new Date().toISOString()
        };
        cfg.shop.push(item);
        saveDb(db);
        return interaction.reply({ ephemeral:true, content:`✅ Item créé : **${item.name}**\nID: **${item.id}**` });
      }
      if (sub === 'list') {
        const game = interaction.options.getString('jeu');
        const server = interaction.options.getString('serveur');
        let items = cfg.shop || [];
        if (game) items = items.filter(i=>i.game===game);
        if (server) items = items.filter(i=>i.server.toLowerCase()===server.toLowerCase());
        return interaction.reply({ ephemeral:true, content:items.length ? items.map(i=>`• **${i.id}** — ${i.name} — ${i.price} coins — ${i.server} / ${i.map}`).join('\n') : 'Aucun item.' });
      }
      if (sub === 'buy') {
        const id = interaction.options.getString('id');
        const playerId = interaction.options.getString('playerid');
        const x = interaction.options.getInteger('x');
        const z = interaction.options.getInteger('z');
        const item = (cfg.shop || []).find(i=>i.id===id);
        if (!item) return interaction.reply({ ephemeral:true, content:'❌ Item introuvable.' });

        db.shopPurchases = db.shopPurchases || [];
        db.shopPurchases.push({ id:`${Date.now()}_${interaction.user.id}`, guildId:interaction.guildId, userId:interaction.user.id, itemId:id, itemName:item.name, game:item.game, server:item.server, map:item.map, x, z, status:'pending_restart', createdAt:new Date().toISOString() });
        db.deliveries = db.deliveries || [];
        db.deliveries.push({ id:`${Date.now()}_${interaction.user.id}`, guildId:interaction.guildId, userId:interaction.user.id, itemId:id, itemName:item.name, serverId:item.server, map:item.map, x, z, status:'pending_restart', createdAt:new Date().toISOString() });

        if (item.game === 'ark' && item.blueprint && playerId) {
          const arkServer = findArkServerByShopServer(item.server);
          await giveArkItem(arkServer, playerId, item.blueprint, 1);
          db.shopPurchases[db.shopPurchases.length-1].status = 'delivered';
          saveDb(db);
          return interaction.reply({ ephemeral:true, content:`✅ Achat livré automatiquement ARK : **${item.name}**.` });
        }

        saveDb(db);
        await sendLog(interaction, `🛒 Achat shop\nJoueur: <@${interaction.user.id}>\nItem: **${item.name}**\nServeur: **${item.server}**\nMap: **${item.map}**\nCoordonnées: ${x || '?'} / ${z || '?'}`);
        return interaction.reply({ ephemeral:true, content:`✅ Achat enregistré : **${item.name}**.` });
      }
    }

    if (interaction.commandName === 'event') {
      const sub = interaction.options.getSubcommand();
      const game = interaction.options.getString('jeu');
      const server = interaction.options.getString('serveur');
      if (sub === 'kill') {
        const killer = interaction.options.getString('killer');
        const victim = interaction.options.getString('victim');
        const weapon = interaction.options.getString('weapon') || 'arme inconnue';
        const distance = interaction.options.getInteger('distance');
        addEvent(db, interaction.guildId, { type:'kill', game, server, killer, victim, weapon, distance });
        saveDb(db);
        await sendLog(interaction, `☠️ **Kill Feed** — ${server}\n**${killer}** → **${victim}** avec **${weapon}**${distance ? ` à ${distance}m` : ''}`);
        return interaction.reply({ ephemeral:true, content:'✅ Kill ajouté.' });
      }
      const pseudo = interaction.options.getString('player') || interaction.options.getString('pseudo');
      addEvent(db, interaction.guildId, { type:sub, game, server, player:pseudo });
      saveDb(db);
      return interaction.reply({ ephemeral:true, content:`✅ ${sub} enregistré.` });
    }

    if (interaction.commandName === 'battlepass') {
      return interaction.reply({ ephemeral:true, content:'🎖️ Battle Pass V7 : bientôt modifiable depuis le Dashboard.' });
    }

    if (interaction.commandName === 'quete') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'liste') return interaction.reply({ ephemeral:true, content:'📋 Quêtes V7 : bientôt modifiables depuis le Dashboard.' });
      return interaction.reply({ ephemeral:true, content:'✅ Preuve reçue.' });
    }

  } catch (e) {
    console.error(e);
    if (interaction.deferred || interaction.replied) return interaction.editReply('❌ Erreur bot. Regarde la console.');
    return interaction.reply({ ephemeral:true, content:'❌ Erreur bot. Regarde la console.' });
  }
});

client.login(config.DISCORD_TOKEN);
