# Événements automatiques DayZ

La lecture de fichiers ADM par FTP/FTPS est activable dans Serveurs. Fonctionne sans API spécifique à l’hébergeur lorsque celui-ci fournit un accès FTP aux logs. SFTP et les panels sans accès aux fichiers ne sont pas pris en charge par ce connecteur.

Le compte Nitrado connecté au Discord peut fournir ses accès FTP ; sinon renseigner adresse, port, utilisateur et mot de passe. Les secrets sont chiffrés et ne sont pas renvoyés dans les listes de serveurs. Le salon Discord doit appartenir au même Discord que le serveur et autoriser le bot à écrire.

Configurer un chemin ADM fixe, ou le dossier des logs (le fichier ADM le plus récent est suivi). Les nouveaux événements sont lus toutes les 30 secondes, avec un délai supplémentaire possible côté hébergeur. Activer `-adminlog` et `adminLogPlayerList = 1` sur DayZ PC ; pour console utiliser les réglages équivalents disponibles chez l’hébergeur. Les positions périodiques peuvent n’apparaître que toutes les cinq minutes.

Le premier passage se place à la fin du fichier : pas d’import rétroactif ni d’alarme historique. Les lignes incomplètes sont conservées, les rotations de fichier détectées, le curseur et les alertes enregistrés avec les événements dans PostgreSQL. Une seule instance du worker travaille à la fois. Échec de Discord : reprise avec délai ; aucune mention libre provenant des noms joueurs. En cas de crash après envoi Discord mais avant sauvegarde, un doublon reste possible au-delà de la fenêtre de déduplication Discord. La lecture est bornée à 8 Mo par passage ; une accumulation supérieure nécessite une intervention (désactivation puis changement du chemin ou dossier pour reprendre une baseline). Une erreur FTP n’indique pas nécessairement une panne du jeu.

Le parser reconnaît kills, morts, suicides, connexions/apparitions, déconnexions et positions au format ADM. Les variantes de mods non reconnues sont ignorées ; adapter le parser à partir d’un échantillon réel si nécessaire. Les positions ADM utilisent X et Z horizontaux suivis de l’altitude. Les alarmes se déclenchent à l’entrée observée dans le cercle ; la sortie observée, la mort ou la déconnexion réarme la zone. Elles peuvent manquer un passage entre deux positions et ne bloquent pas un raid. Les statistiques enregistrées commencent avec l’activation du connecteur, sans prétendre reconstruire tout l’historique ou calculer le temps de jeu depuis des apparitions de personnage.

## Whitelist du jeu

Configurer un chemin FTP vers un fichier whitelist existant et activer la synchronisation. PC : UID DayZ de 44 caractères, pas SteamID64. Le pseudo est accepté seulement s’il correspond à un joueur unique déjà observé sur ce serveur. Console : gamertag selon le format accepté par le fichier de l’hébergeur. La validation attribue le rôle Discord puis ajoute l’entrée sans remplacer les autres lignes et relit le fichier pour confirmer. Si l’écriture échoue, le statut indique explicitement `game_sync_failed` et la validation peut être relancée. Une seconde approbation est idempotente. L’écriture du fichier ne prouve pas que le jeu l’a rechargé : activer sa whitelist puis recharger/redémarrer depuis le panel si requis. Refuser une demande déjà approuvée ne révoque pas des accès existants.

## Vérification

Tests automatisés du parser, UTF-8 et lignes partielles, rotations, reprise, isolation des communautés, zones et whitelist avec FTP simulé. Les tests ne remplacent pas un essai avec les logs et accès du vrai serveur. Aucune intégration API supplémentaire d’hébergeur ni réseau mondial de bannissement n’est revendiqué.
