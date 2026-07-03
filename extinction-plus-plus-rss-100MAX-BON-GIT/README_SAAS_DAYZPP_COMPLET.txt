EXTINCTION++ RSS - VERSION SAAS MULTI-DISCORD / NITRADO
=======================================================

Ce ZIP ajoute la base pour faire fonctionner le bot public comme DayZ++ :
chaque Discord peut connecter SON compte Nitrado sans utiliser ton token global.

AJOUTE DANS RAILWAY - SERVICE BOT ET DASHBOARD
----------------------------------------------
DISCORD_TOKEN=token_du_bot_public
CLIENT_ID=id_application_discord
SECRET_KEY=une_longue_cle_secrete_identique_bot_dashboard
SESSION_SECRET=une_longue_cle_secrete_identique_bot_dashboard
DATABASE_PATH=./shared/database.json
DASHBOARD_URL=https://ton-dashboard.up.railway.app

IMPORTANT :
- Ne mets pas les tokens Nitrado des clients dans Railway.
- Chaque owner Discord doit connecter son token via Discord.
- SECRET_KEY doit rester le même, sinon les tokens chiffrés ne pourront plus être relus.

COMMANDES A LANCER APRES DEPLOIEMENT
------------------------------------
1) Redéployer les commandes Discord :
   npm run deploy

2) Démarrer :
   npm start

COMMANDES DISCORD CLIENT
------------------------
/setup
Crée les salons du bot dans le Discord.

/nitrado connect token:TON_TOKEN_NITRADO
Connecte le compte Nitrado du Discord. Le token est testé puis chiffré dans la base.

/nitrado status
Vérifie si ce Discord a bien un compte Nitrado connecté.

/nitrado services
Liste les serveurs/services Nitrado du client.

/nitrado link-server service_id:123456 nom:"Mon DayZ" jeu:"DayZ PC" map:"Chernarus" whitelist_path:"/games/ni.../whitelist.txt"
Ajoute un serveur Nitrado au Discord.

/serveur liste
Vérifie les serveurs liés.

CE QUI A ETE AJOUTE
-------------------
- shared/secure-store.js : chiffrement AES-256-GCM des tokens Nitrado.
- shared/nitrado-api.js : API Nitrado compatible token global OU token par Discord.
- /nitrado connect : enregistre le token Nitrado d'un Discord.
- /nitrado disconnect : supprime le token du Discord.
- /nitrado status : affiche l'état de connexion.
- /nitrado link-server : lie un service Nitrado à un Discord.
- Dashboard /nitrado : affiche les comptes connectés et serveurs liés.
- Base JSON enrichie : nitradoAccounts, connectedServers, saasAudit.

LIMITE ACTUELLE
---------------
Cette version prépare la vraie architecture multi-clients.
La modification automatique du fichier whitelist.txt dépend du chemin exact du fichier Nitrado et de l'accès File Server API.
Quand tu as le chemin exact whitelist.txt de ton serveur DayZ PC, on peut ajouter la fonction d'écriture automatique.

