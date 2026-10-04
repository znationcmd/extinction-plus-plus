# Administration connectée et images de serveurs

## Images personnalisées

Dans Serveurs, le propriétaire ou administrateur autorisé choisit un serveur de son Discord et importe un PNG, JPEG ou WebP. L’aperçu est redimensionné à 1200 pixels et converti en JPEG dans le navigateur. Le serveur vérifie le format, la taille (600 Ko maximum), les dimensions (2048 pixels maximum) et la communauté avant de stocker l’image dans PostgreSQL.

Les images importées sont privées : consultation après connexion au dashboard de ce Discord, sans exposer l’image à une autre communauté. Pour une image publique utilisable dans des messages Discord, fournir un lien HTTPS dans le champ Image du serveur ou avec `/serveur ajouter image:...`. Le bot ne transfère pas automatiquement les images privées vers Discord. Les pages de serveurs réutilisent cette image. Les images externes restent hébergées chez leur fournisseur.

L’image peut être remplacée ou retirée. Supprimer un serveur déclenche aussi la suppression de l’image enregistrée. En cas d’échec du nettoyage, l’image résiduelle n’est plus consultable sans serveur correspondant et un message générique est journalisé.

## CFTools pour DayZ PC

- Renseigner l’ID API du serveur, l’ID d’application et son secret dans Serveurs.
- Autoriser l’application sur les ressources de ce serveur dans le portail CFTools ; renseigner l’ID de banlist pour consulter/créer les bans.
- Ouvrir Administration connectée pour tester et lire les sessions, profils, statistiques et bans.
- Whitelist, priorité et ban sont envoyés au bot sous forme de tâches. Les droits Discord sont revérifiés avant exécution. Un résultat non confirmé n’est pas relancé automatiquement.
- Les ajouts utilisent CFTools ; ils ne créent pas le rôle Discord de whitelist et ne modifient pas le fichier FTP de whitelist. Choisir consciemment la méthode utilisée sur le serveur.
- Pour la boutique native : installer GameLabs, activer la livraison CFTools dans Serveurs, créer un article DayZ PC et sélectionner CFTools comme méthode. Le joueur doit avoir une liaison vérifiée et être connecté/chargé. Un kit est un tableau JSON de `className` et `quantity`, limité à 20 classes et 100 objets au total.
- Une réponse acceptée par CFTools n’est pas une preuve de persistance des objets dans l’inventaire après un redémarrage. En cas de réponse perdue ou de kit partiellement traité, vérifier en jeu avant toute reprise.

Le SDK `cftools-sdk` est utilisé avec un transport sans redirections ni relances de requêtes, un timeout de 15 secondes, des logs de corps désactivés et des clients séparés par serveur, communauté et identifiants. Le jeton global CFTOOLS_API_TOKEN du SDK est effacé au démarrage de chaque client pour éviter de réutiliser un compte partagé entre Discords.

## BattleMetrics

Renseigner l’ID du serveur et, si nécessaire, un jeton autorisé pour celui-ci. Le connecteur lit l’état, le nombre de joueurs, les joueurs éventuellement inclus et les 25 dernières sessions accessibles. Les liens de pagination ne sont pas suivis automatiquement. Le connecteur n’implémente pas les commandes RCON, les créations de bans ou les autres écritures BattleMetrics. Ces actions restent dans la plateforme.

Les erreurs de droits ou de connexion n’inventent pas un statut de panne du jeu. Une réponse CFTools `api_reachable` prouve uniquement l’accès API. La surveillance externe se choisit dans Serveurs et s’effectue une fois par minute lorsque la surveillance est activée. Les identifiants API sont chiffrés et les réponses du dashboard excluent les secrets.

## Module natif et jeux

Le téléchargement `/api/native-dayz` fournit les sources DayZ PC, un guide, l’agent Node.js et les petits modules nécessaires à son transport signé. Il est réservé aux utilisateurs autorisés du dashboard. Le code Enforce n’a pas été compilé ni validé sur un serveur réel dans cet environnement. Les autres jeux conservent la boutique avec traitement par le staff, ARK RCON lorsque disponible et le protocole d’adaptateur externe. Il n’existe pas de livraison automatique universelle simplement en sélectionnant un jeu dans un menu.

Références : https://developer.cftools.cloud/documentation/data-api ; https://floriansw.github.io/cftools-sdk/ ; https://www.battlemetrics.com/developers/documentation ; https://github.com/BohemiaInteractive/DayZ-Script-Diff .

## Vérification des commandes

Le staff confirme les livraisons avec un compte rendu. Une annulation rembourse la banque de l’acheteur original une seule fois et conserve l’historique. Les livraisons `processing` ou `bridge_claimed` ne sont pas annulables tant que l’opération est en cours. Les confirmations CFTools/RCON et résultats non confirmés demandent une vérification en jeu, en particulier pour les kits partiellement livrés.
