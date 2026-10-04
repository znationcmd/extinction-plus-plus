# Version événements, primes et opérations

## Fonctions ajoutées

- Logs DayZ ADM par FTP/FTPS, reprise persistante, killfeed, connexion/apparition, déconnexion, morts et suicides.
- Chat du jeu vers Discord optionnel ; liaison Discord/UID par code envoyé dans le chat ou validation explicite par le staff.
- Positions récentes sur les cartes administrateur calibrées et compteurs kills/morts depuis activation.
- Alarmes de zones : liste autorisée, alerte à l’entrée observée, écriture optionnelle dans ban.txt.
- Whitelist du jeu : ajout et vérification du fichier existant, distinct du rôle Discord.
- Primes avec réservation de monnaie, remboursement à expiration/annulation et versement automatique au kill admissible.
- Récompenses des kills pour les comptes vérifiés, délai configurable et exclusion des suicides/comptes identiques/factions alliées.
- Factions : création, invitation, adhésion, départ, trésorerie, dépôt membre et retrait chef.
- Tâches datées répétables : commandes Nitrado / Pterodactyl start/stop/restart et messages RCON ; interruption ou résultat incertain suspend la tâche.
- Tickets Discord privés : ouverture, réponses par commande et fermeture, historique conservé. La page Tickets permet de suivre l’historique et d’envoyer une réponse via le bot.
- Réseaux Interpol entre Discords par invitation : publication de dossiers, retrait et application explicite sur un serveur compatible. Aucun bannissement mondial automatique.
- Backend d’adaptateurs externes signé HMAC pour événements et remise de commandes de livraison à un plugin réellement installé.

## Commandes joueurs

`/prime poser`, `/prime liste`, `/prime annuler`

`/faction creer`, `/faction inviter`, `/faction rejoindre`, `/faction quitter`, `/faction info`, `/faction deposer`, `/faction retirer`

`/profil lier`, `/profil info`

`/ticket ouvrir`, `/ticket repondre`, `/ticket fermer`

Les nouvelles commandes sont enregistrées au démarrage du bot. Les anciennes restent inchangées. `npm run deploy` publie aussi l’ensemble complet.

## Configuration

1. Choisir le Discord puis le serveur dans Serveurs.
2. Renseigner le fichier/dossier ADM et les accès FTP si Nitrado ne les fournit pas. Choisir les salons et activer la lecture.
3. Renseigner les fichiers existants whitelist.txt / ban.txt si utilisés. Vérifier leur activation et leur rechargement dans le jeu.
4. Ouvrir Primes & automatisations pour gérer identités, récompenses, factions, primes et calendrier.
5. Pour voir les joueurs sur une carte, créer/calibrer une carte liée à l’ID exact du serveur. Les positions des joueurs ne sont pas publiées dans le catalogue public ni dans les groupes privés.
6. Interpol : créer/rejoindre un réseau, examiner les preuves puis choisir les dossiers à appliquer localement.
7. Pour l’adaptateur externe, consulter README_GAME_BRIDGE.md. Ne pas l’activer en même temps que l’import ADM pour les mêmes événements.

## Limites encore présentes

- Aucune affirmation de classement numéro 1 ni de fiabilité mesurée en production sur tous les hébergeurs.
- La liste des hébergeurs ne représente pas autant d’APIs de démarrage/arrêt. Nitrado et les panels Pterodactyl avec clé Client sont intégrés ; RCON et FTP dépendent des accès de chaque hébergeur.
- CFTools DayZ PC et les lectures BattleMetrics sont maintenant intégrés avec des clés séparées : voir README_ADMIN_CONNECTIONS.md. Les écritures administratives BattleMetrics ne sont pas implémentées.
- Le protocole d’adaptateur n’est pas un mod universel. Le dépôt ne contient pas encore de mod DayZ/ARK/Arma installable pour générer/remettre les objets. La livraison ARK RCON existante reste disponible ; les autres achats restent manuels sauf avec un adaptateur installé et testé.
- La protection de zone observe les logs et peut manquer les passages entre deux positions. L’écriture d’un ban ne confirme pas son application immédiate ni l’expulsion d’un joueur connecté.
- Les bases RP sont des outils communautaires ; elles ne créent pas directement les métiers, véhicules, bâtiments ou paies dans tous les jeux.
- Les tickets utilisent des commandes Discord pour les réponses : pas de collecte automatique de tous les messages spontanés du salon. Les messages envoyés via le dashboard ou les commandes restent dans l’historique du bot.
- L’absence d’accès aux fichiers réels et d’adaptateurs de jeu empêche la validation de bout en bout. Il faut un essai sur un serveur connecté après configuration.

## Connecteur Pterodactyl et surveillance

Le choix de l’hébergeur et celui du connecteur API sont distincts : renseigner l’URL HTTPS du panel, l’identifiant serveur court et une clé API Client disposant des permissions nécessaires. Les actions start/stop/restart sont envoyées par le bot via POST /api/client/servers/{id}/power. La surveillance lit GET /resources pour l’état, CPU et mémoire. La source de référence est le dépôt officiel pterodactyl/panel, routes/api-client.php. Les clés Application ne remplacent pas les clés Client. Les panels modifiés peuvent être incompatibles et nécessitent un essai réel.

La surveillance optionnelle contrôle l’API Nitrado/Pterodactyl ou un RCON compatible environ toutes les 60 secondes. Trois erreurs déclenchent une alerte, puis une reprise confirmée en déclenche une autre. Une erreur FTP ou RCON ne prouve pas que le jeu lui-même est arrêté.
