# Extinction++ — corrections multi-jeux et cartes

Cette version ajoute des routes de gestion utilisables, un stockage PostgreSQL
partagé entre le bot et le Dashboard, des accès par Discord, et les cartes
personnalisées. Elle ne constitue pas une validation de tous les hébergeurs ni
un catalogue complet de tous les mods.

## Jeux

| Jeu | Communauté, banque, shop, quêtes et cartes | Actions Nitrado | RCON |
| --- | --- | --- | --- |
| DayZ PC | Oui | Avec compte et service liés | BattlEye UDP |
| DayZ PlayStation / Xbox | Oui | Avec compte et service liés | Non |
| ARK | Oui | Avec compte et service liés | Source TCP |
| Arma Reforger | Oui | Avec compte et service liés | BattlEye explicitement configuré ; le protocole natif Reforger n'est pas implémenté |
| Conan Exiles | Oui | Avec compte et service liés | Source TCP |
| Palworld | Oui | Avec compte et service liés | Source TCP |
| 7 Days to Die | Oui | Si le service Nitrado est disponible et lié | Telnet / API du jeu non implémentés |
| Aniimo | Communauté et carte manuelle | Non | Non |

Les actions Nitrado nécessitent une offre et un service réel pour le jeu concerné.
Les cartes, la banque, les quêtes et le shop sont des fonctions communautaires.
Elles ne modifient pas automatiquement l'inventaire, l'XP ou la monnaie du jeu.

Le shop débite maintenant la banque communautaire. Les livraisons sont manuelles
par le staff sauf les commandes ARK explicitement configurées. Une commande ARK
acquittée est distinguée d'une livraison vérifiée en jeu. Après une erreur réseau,
le statut demande une vérification manuelle et évite de relancer automatiquement
une livraison potentiellement déjà effectuée. Les validations whitelist attribuent
le rôle Discord ; la whitelist de connexion en jeu n'est pas modifiée.

## Accès et données

- Se connecter avec Discord puis sélectionner la communauté dans Paramètres /
  « Changer de Discord ». Le propriétaire peut déléguer des rôles Fondateur depuis
  Mods DayZ PC. Ces rôles autorisent aussi la gestion de la communauté.
- Les pages et routes privées vérifient la session et les droits. Les mutations
  vérifient l'origine et la taille du JSON. Les tokens Nitrado et mots de passe
  RCON sont chiffrés et ne sont pas retournés par les routes de configuration.
- La boutique publique reste accessible via `/shop?guildId=ID_DISCORD`. Elle
  retourne uniquement les articles visibles et leurs données de catalogue.
- PostgreSQL conserve l'état partagé dans `extinction_app_state`. Les écritures
  simultanées dans des champs indépendants sont fusionnées. Les conflits sur les
  soldes et les mêmes enregistrements sont rejetés pour éviter les doubles dépenses.
- Les anciennes données sans `guildId` ne sont pas attribuées automatiquement à
  un client. Une migration explicite doit déterminer leur propriétaire.

## Cartes

La page `/maps` fournit zoom, déplacement, catégories, marqueurs modifiables,
coordonnées et sauvegarde partagée par Discord. Les jeux demandés et les cartes
modées utilisent le même moteur configurable. Des suggestions de noms sont
proposées ; ce ne sont pas des cartes déjà téléchargées ni un catalogue exhaustif.

Associer une carte à un serveur, indiquer un fond HTTPS utilisable et régler ses
bornes X / Z. Pour ARK, longitude / latitude 0–100 est possible. Les valeurs par
défaut 0–100 sont une grille de préparation et ne sont pas une calibration réelle
pour tous les jeux. L'orientation verticale est configurable.

Cette version ne contient pas les fonds propriétaires d'iZurvive ni toutes les
images des cartes modées. Leurs auteurs / le serveur doivent fournir le fond et
les coordonnées. Aucun lieu officiel, joueur en temps réel ou position en jeu
n'est inventé. Le suivi automatique et l'import des journaux nécessitent des
connecteurs propres à chaque jeu et restent à développer.

## Mise en service : préserver la configuration active

**Avant de redéployer le bot existant**, récupérer sa véritable base
`shared/database.json` depuis le conteneur actif. Le service Railway actuel n'a
pas de volume ; le fichier présent dans ce dépôt est un exemple initial et ne
doit pas remplacer la configuration réelle. Le redéploiement peut effacer les
changements restés seulement dans l'ancien conteneur.

1. Sauvegarder les fichiers actifs et les anciennes clés de chiffrement.
2. Utiliser le même `DATABASE_URL` pour les deux services. Si la table partagée
   est vide, le bot peut l'initialiser à partir de son fichier local ; fournir
   alors la vraie base sauvegardée, pas l'exemple du dépôt.
3. Configurer un secret aléatoire commun d'au moins 32 caractères via `SECRET_KEY`,
   `SESSION_SECRET`, `ENCRYPTION_SECRET` ou `ENCRYPTION_KEY`. Conserver les anciennes
   variables pour permettre le déchiffrement des tokens précédents. Ne jamais
   publier ces valeurs dans GitHub ou les logs. Les clés de démonstration sont refusées.
4. Configurer `CLIENT_ID`, `CLIENT_SECRET`, `DASHBOARD_URL` et le redirect OAuth
   exact `https://TON-DASHBOARD/api/mod-auth/callback` dans Discord.
5. Bot : racine du dépôt, installer les dépendances, démarrer `node server.js`.
   Sans build Next embarqué, ce service n'essaie plus de lancer le Dashboard et
   expose `/health` avec l'état de connexion Discord reçu du bot.
6. Dashboard : racine `/dashboard`, build `npm install && npm run build`, démarrage
   `npm start`. Le démarrage / les routes avec stockage ne sont pas validés contre
   la base de production dans cet audit.
7. Enregistrer les nouvelles commandes avec `npm run deploy`, après vérification
   des identifiants Discord. Puis vérifier chaque action sur un serveur de test.
8. Pour les mods DayZ PC, fournir SteamCMD, le compte Steam autorisé et un volume
   persistant comme décrit dans `README_DAYZ_MODS.md`. Les variables et le binaire
   nécessaires ne sont pas installés par cette archive.

## Routes ajoutées / complétées

Serveurs, shop, quêtes, preuves de quêtes, niveaux Battle Pass, les sept catégories
RP, banque, tickets, interpol, coupons, notifications, configurations d'alarmes et
de plugins, cartes et marqueurs : interfaces de gestion et routes correspondantes.
Les résultats Nitrado, RCON et validations Discord sont suivis séparément.
Les alarmes et plugins sont des configurations ; cette version n'installe pas un
mod sur le serveur ni un détecteur de présence. Les sauvegardes concernent les
données communautaires, pas les fichiers de sauvegarde du serveur de jeu.

## Vérifications

- `npm test` : 23 tests réussis (dont stockage concurrent, séparation des clients,
  récompenses uniques, protocole BattlEye avec serveur UDP local et coordonnées).
- `npm run build:dashboard` : compilation de production réussie.
- Contrôles HTTP locaux : 16 vérifications des routes privées et pages publiques.
- Tests HTTP avec Discord / PostgreSQL simulés : création des neuf variantes de jeux, CRUD cartes / marqueurs, modules, banque, sauvegardes et refus d’accès à une autre communauté.
- Vérifications syntaxiques du bot, du lanceur et des commandes : réussies.

Les tests Steam / FTP / Nitrado et protocole réseau utilisent des doubles ou des
serveurs locaux. L'installation et la livraison sur de vrais serveurs, le login
Discord avec les identifiants de production et la migration de PostgreSQL restent
à vérifier. Les modifications n'ont pas été publiées ni déployées.
