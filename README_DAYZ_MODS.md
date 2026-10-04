# Mods DayZ PC et validateur de fichiers

Le Dashboard propose `/dayz-mods` et `/file-validator`. Le premier permet aux
fondateurs de configurer leurs mods Workshop, vérifier leurs versions, demander
une installation et suivre les opérations. Le second vérifie la syntaxe de
fichiers UTF-8 `.json` et `.xml` (5 Mo maximum), avec ligne et colonne des erreurs.
Les XML dont la racine est `types` ou `events` reçoivent aussi des avertissements
sur les noms en double, valeurs numériques et certains flags. Ce n’est pas une
validation complète des schémas de chaque mod. Les fichiers analysés ne sont pas
enregistrés ni transférés vers Nitrado.

## Accès fondateurs

Configurer sur le service Dashboard :

- `CLIENT_ID` et `CLIENT_SECRET` de l’application Discord du bot.
- `DASHBOARD_URL`, l’URL publique exacte du Dashboard.
- `SESSION_SECRET`, un secret aléatoire d’au moins 32 caractères.
- `DATABASE_URL`, la même base PostgreSQL que le bot.

Dans Discord Developer Portal > OAuth2 > Redirects, ajouter exactement :
`https://TON-DASHBOARD/api/mod-auth/callback`.

Le propriétaire Discord se connecte dans « Mods DayZ PC » et choisit son Discord.
Il peut renseigner les IDs des rôles Fondateur autorisés. Les actions vérifient
les droits Discord à chaque demande. Un administrateur sans rôle délégué n’a
pas automatiquement accès. Les sessions durent au maximum une heure et les
jetons OAuth restent dans un cookie chiffré HttpOnly, jamais dans le navigateur JS.
Les autres anciennes pages du Dashboard conservent leurs contrôles existants ;
cette connexion protège les nouveaux outils, elle ne sécurise pas rétroactivement
toute l’application.

## Installation du moteur sur Railway

Le bot et le Dashboard peuvent rester sur deux services différents. La file de
travaux, la configuration des mods et l’historique passent par PostgreSQL.

1. Sur le service bot, définir `DATABASE_URL` et un vrai `SECRET_KEY` d’au moins
   32 caractères (celui déjà utilisé pour chiffrer les tokens Nitrado). Ne pas
   changer ce secret sans migrer les tokens existants.
2. Installer SteamCMD avec ses bibliothèques Linux 32 bits. L’image optionnelle
   `Dockerfile.dayz-mods` les fournit. Pour cette image, définir
   `RAILWAY_DOCKERFILE_PATH=Dockerfile.dayz-mods` et conserver le service bot à la
   racine du dépôt. Son démarrage est `bash scripts/start-dayz-mod-bot.sh`.
3. Monter un volume persistant sur `/data` pour conserver la base locale du bot,
   SteamCMD et ses sessions. Avant de migrer un bot existant, copier sa vraie
   base `database.json` vers `/data/database.json` : le fichier livré dans le dépôt
   est seulement un fichier initial, il ne contient pas la configuration active.
4. Définir `STEAM_USERNAME` avec un compte Steam autorisé à télécharger le
   Workshop DayZ. `STEAM_PASSWORD` est optionnel si une session SteamCMD valide
   existe déjà. Le compte doit disposer des droits nécessaires sur DayZ.
5. Si Steam Guard intervient, authentifier SteamCMD manuellement dans ce même
   environnement persistant : le bot ne contourne pas Steam Guard. Ne pas
   afficher les variables secrètes dans les logs ni publier les codes de garde.

Hors de cette image, `STEAMCMD_PATH` désigne le programme SteamCMD installé.
`NITRADO_FTP_TLS=true` active FTPS si le service le prend en charge ; par défaut,
le module utilise les paramètres FTP fournis par Nitrado.

Le binaire est détecté avant de permettre une installation. Cela ne garantit pas
que Steam acceptera le compte : un refus de connexion ou de Workshop sera signalé
dans l’historique. Aucun serveur n’est arrêté avant le téléchargement et l’envoi
complet des fichiers de préparation.

## Configuration d’un serveur

Dans le Discord concerné, utiliser `/nitrado connect` puis `/nitrado link-server`
avec le jeu `dayz_pc`. Seuls les serveurs liés par le bot avec un compte Nitrado
chiffré sont importés dans les nouveaux outils. Aucun token Nitrado global n’est
utilisé comme solution de secours pour un autre client.

Dans « Mods DayZ PC » :

1. Indiquer le chemin FTP exact de la racine DayZ et le salon d’avertissements
   de ce même Discord.
2. Indiquer un mod par ligne : `ID_WORKSHOP @DossierDuMod`.
3. Garder les mêmes dossiers dans les « Additional Mods » de Nitrado. Le module
   met à jour les fichiers ; il ne modifie pas les paramètres de lancement et
   n’ajoute pas automatiquement les dépendances Workshop.
4. Enregistrer puis vérifier. Une première installation est lancée manuellement
   pour établir les versions réellement installées. Avant cette installation,
   l’état est « Installation à vérifier ».
5. Activer ensuite les mises à jour automatiques si souhaité. La surveillance
   interroge Steam toutes les cinq minutes. Une erreur suspend les nouvelles
   tentatives automatiques pendant au moins une heure.

Les avertissements sont envoyés dans Discord. Cette version ne bloque pas les
connexions et ne diffuse pas de messages RCON en jeu ; le RCON existant du projet
vise ARK/Source, pas le protocole BattlEye de DayZ. Le délai d’avertissement est
fixe, sans détection du nombre de joueurs. Il ne faut pas laisser un redémarrage
planifié Nitrado entrer en concurrence avec l’opération.

## Déroulement et reprise

Le moteur télécharge et valide les mods avec SteamCMD, prépare les nouveaux
dossiers sur FTP, compare les tailles des fichiers, puis avertit Discord et
arrête le serveur. Il attend la confirmation de l’arrêt, remplace les dossiers et
copie les clés `.bikey`, puis redémarre via l’API Nitrado et attend la confirmation.
Un serveur arrêté avant l’opération reste arrêté.

Les anciens dossiers et les clés écrasées sont conservés temporairement dans
`.extinction-mods-ID/backup`. Un échec de remplacement tente une restauration
avant de redémarrer. Les anciennes clés dont le nom diffère sont conservées :
leur suppression nécessite de vérifier qu’aucun autre mod ne les utilise.

Après interruption du bot, démarrage non confirmé ou restauration incomplète,
les nouvelles installations sont bloquées. Le propriétaire doit vérifier le
serveur et les sauvegardes dans le FTP Nitrado, puis confirmer cette vérification
dans le Dashboard. Le bot ne reprend pas automatiquement une installation
partielle. Une file et un verrou PostgreSQL évitent des mises à jour simultanées
du même service et plusieurs téléchargements SteamCMD sur le même compte.

## Validation du code

`npm test` couvre les permissions, les configurations invalides, l’ordre des
transferts/arrêts, les échecs de téléchargement et de taille, la restauration,
les serveurs déjà arrêtés, les échecs de démarrage et le validateur JSON/XML.
`npm run build` et `npm run build:dashboard` vérifient le bot et le Dashboard.
Les tests utilisent des doubles Steam/Nitrado/FTP : une première installation
réelle reste à vérifier avec un serveur de test et des accès opérationnels.

## Application mobile

Le Dashboard peut servir de base à une application iOS/Android. Aucun projet
mobile ni publication App Store/Google Play n’est inclus dans cette modification.
Une application avec notifications, connexion mobile et gestion des serveurs
nécessitera un projet dédié ainsi que les comptes développeurs des stores.
