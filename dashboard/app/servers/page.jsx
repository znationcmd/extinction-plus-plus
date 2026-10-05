import SetupGuide from '../../components/SetupGuide';
import ServerImageEditor from '../../components/ServerImageEditor';
import ServerActions from '../../components/ServerActions';
import ModuleEditor from '../../components/ModuleEditor';
import Shell from '../../components/Shell';
import hosting from '../../lib/hosting.cjs';
import { readPageDb as readDb } from '../../lib/db';

async function getServers() {
  const db = (await readDb());
  const servers = [
    ...(db.connectedServers || []),
    ...(db.servers || []),
    ...Object.entries(db.guilds || {}).flatMap(([guildId, g]) =>
      (g.servers || []).map(s => ({ ...s, guildId: s.guildId || guildId }))),
    ...Object.values(db.ownerConfigs || {}).flatMap(cfg => cfg.servers || [])
  ];
  return [...new Map(servers.map(s => [s.id, s])).values()];
}

export default async function Servers() {
  const servers = await getServers();

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Serveurs</h2><SetupGuide/>

      <div className="card mb-6">
        <h3 className="text-2xl font-black">Serveurs ajoutés depuis Discord</h3>
        <p className="mt-2 text-white/70">Les serveurs créés avec <b>/serveur ajouter</b> apparaissent ici avec les serveurs configurés dans le dashboard.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {servers.map((s) => (
          <div key={s.id} className="card">
            {s.image && <img src={s.image} alt={s.name} className="mb-4 h-36 w-full rounded-2xl object-cover" />}
            <h4 className="text-xl font-black">{s.name || 'Serveur sans nom'}</h4>
            <p className="text-white/70">{s.game || 'Jeu'} — {s.platform || 'Plateforme'}</p>
            <p>Hébergeur : {(s.provider==='other'&&s.providerName)||hosting.providers[s.provider]||s.providerName||(hosting.isNitrado(s)?'Nitrado':'Non renseigné')}</p>
            <p>Map : {s.map || '—'}</p><p className="break-all">ID serveur : {s.id}</p>
            <p>ID Nitrado : {s.nitradoId || s.nitradoServiceId || '—'}</p>
            <p>IP/Port : {s.ip || '—'} {s.port ? `:${s.port}` : ''}</p>
            <p>Discord : {s.guildId || '—'}</p>
            <p>Logs automatiques : {!s.liveEnabled?'Désactivés':s.liveState?.status==='connected'?'FTP connecté':s.liveState?.status==='error'?'Erreur de lecture':'En attente du bot'}</p>
            {s.liveState?.checkedAt&&<p>Dernière lecture : {s.liveState.checkedAt}</p>}
            {s.liveState?.error&&<p className="text-amber-300">{s.liveState.error}</p>}
            <p>Adaptateur externe : {s.bridgeState?.status==='connected'?`dernier contact ${s.bridgeState.checkedAt}`:'non connecté'}</p>
            <p>Surveillance : {s.monitorState?.status||'non activée'}</p>{s.monitorState?.checkedAt&&<p>Dernier contrôle : {s.monitorState.checkedAt}</p>}{s.monitorState?.error&&<p className="text-amber-300">{s.monitorState.error}</p>}
            <p>Événements lus : {s.liveState?.eventsRead||0}</p>
          </div>
        ))}
        {!servers.length && <div className="card md:col-span-2 xl:col-span-3">Aucun serveur configuré. <a href="#server-editor" className="underline">Ajouter mon premier serveur</a>.</div>}
      </div>
    <details className="card my-6"><summary className="cursor-pointer text-xl font-bold">Aide pour connecter le jeu</summary><p className="mt-2">DayZ : renseigne le fichier ADM ou le dossier des logs et le salon Discord, puis active la lecture automatique. Le premier passage démarre à la fin du log pour éviter les anciennes alertes. Active les journaux administrateur et les positions des joueurs dans le panel de ton serveur.</p><p className="mt-2">FTP / FTPS fonctionne chez les hébergeurs qui donnent accès aux fichiers. Nitrado peut fournir les identifiants via le compte déjà connecté. SFTP demande un autre connecteur. Les alarmes dépendent des positions écrites dans les logs ; elles ne constituent pas une surveillance instantanée.</p><p className="mt-2">L’adaptateur externe permet à un plugin compatible d’envoyer ses événements et de récupérer les livraisons. Il exige un plugin réellement installé dans le jeu ; activer la case seule ne suffit pas. Le protocole et le client de référence sont fournis dans le dépôt.</p><p className="mt-2">Whitelist DayZ : choisis UID pour PC (identifiant DayZ de 44 caractères) ou gamertag pour console et le chemin du fichier existant. Active également la whitelist dans le jeu. Après validation, une recharge ou un redémarrage peut être nécessaire.</p></details>
    <ServerImageEditor/><ModuleEditor title="Ajouter ou modifier un serveur" basicFields={['name','game','provider','providerName','platform','map','enabled']} endpoint="/api/servers" fields={[{"name": "name", "label": "Nom", "required": true},{name:'image',label:'Image du serveur (lien HTTPS, facultatif)'}, {"name": "game", "label": "Jeu", "required": true}, {"name": "provider", "label": "Hébergeur", "options": hosting.providers}, {"name": "providerName", "label": "Nom de l’autre hébergeur"}, {"name": "panelUrl", "label": "Lien HTTPS du panel hébergeur"}, {"name": "platform", "label": "Plateforme"}, {"name": "map", "label": "Carte"}, {"name": "nitradoId", "label": "ID Nitrado"}, {"name": "ip", "label": "Adresse"}, {"name": "port", "label": "Port du jeu"}, {"name": "rconHost", "label": "Adresse RCON"}, {"name": "rconPort", "label": "Port RCON", "type": "integer"}, {"name": "rconPassword", "label": "Mot de passe RCON", "type": "password"}, {"name": "rconProtocol", "label": "Protocole RCON", "options": {"source": "Source (ARK / Palworld / Conan)", "battleye": "BattlEye (DayZ PC / Arma)"}}, {"name":"apiType","label":"Connecteur API du panel","options":{"nitrado":"Nitrado","pterodactyl":"Pterodactyl (quel que soit l’hébergeur)"}},{"name":"panelServerId","label":"Identifiant du serveur Pterodactyl"},{"name":"panelApiKey","label":"Clé API Client Pterodactyl (vide = conserver)","type":"password"},{name:'cfServerId',label:'ID API serveur CFTools (DayZ PC)'},{name:'cfApplicationId',label:'ID application CFTools'},{name:'cfSecret',label:'Secret application CFTools (vide = conserver)',type:'password'},{name:'cfBanlistId',label:'ID banlist CFTools'},{name:'cfDeliveryEnabled',label:'GameLabs installé : autoriser les livraisons CFTools',type:'boolean'},{name:'bmServerId',label:'ID serveur BattleMetrics'},{name:'bmToken',label:'Jeton BattleMetrics (vide = conserver)',type:'password'},{name:'disconnectCftools',label:'Déconnecter CFTools et supprimer ses accès enregistrés',type:'boolean'},{name:'disconnectBattlemetrics',label:'Déconnecter BattleMetrics et supprimer son jeton enregistré',type:'boolean'},{name:'externalMonitor',label:'Source externe de surveillance',options:{cftools:'CFTools',battlemetrics:'BattleMetrics'}},{"name":"monitorEnabled","label":"Surveiller la connexion du serveur (API ou RCON)","type":"boolean"},{"name":"monitorChannelId","label":"ID du salon des alertes de surveillance"},{"name":"bridgeEnabled","label":"Activer un adaptateur de jeu externe","type":"boolean"},{"name":"bridgeSecret","label":"Clé partagée avec l’adaptateur (32 caractères minimum, vide = conserver)","type":"password"},{"name":"ftpHost","label":"Adresse FTP"},{"name":"ftpPort","label":"Port FTP (21 par défaut)","type":"integer"},{"name":"ftpUser","label":"Utilisateur FTP"},{"name":"ftpPassword","label":"Mot de passe FTP (vide = conserver)","type":"password"},{"name":"ftpTls","label":"FTPS / TLS","type":"boolean"},{"name":"logPath","label":"Chemin du fichier ADM (ex. /dayz/logs/server.ADM)"},{"name":"logDirectory","label":"Ou dossier des logs ADM (rotation automatique)"},{"name":"feedChannelId","label":"ID du salon killfeed Discord"},{"name":"alarmChannelId","label":"ID du salon alarmes (facultatif)"},{"name":"relayChat","label":"Relayer le chat du jeu vers le salon Discord","type":"boolean"},{"name":"liveEnabled","label":"Lecture automatique des logs DayZ","type":"boolean"},{"name":"banPath","label":"Chemin FTP du fichier ban.txt existant (zones avec bannissement)"},{"name":"banFormat","label":"Format du fichier bans","options":{"uid":"UID DayZ","gamertag":"Gamertag console"}},{"name":"whitelistPath","label":"Chemin FTP du fichier whitelist.txt existant"},{"name":"whitelistFormat","label":"Format de la whitelist","options":{"uid":"UID DayZ PC (44 caractères)","gamertag":"Gamertag console"}},{"name":"whitelistEnabled","label":"Synchroniser les validations dans le fichier du jeu","type":"boolean"},{"name": "enabled", "label": "Activé", "type": "boolean"}]} readKey="servers" /><ServerActions /></Shell>
  );
}
