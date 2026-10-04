# Extinction RSS — module serveur DayZ PC

Ces sources contiennent un module serveur Enforce Script et un agent Node.js. Ils ne constituent pas un PBO déjà compilé et testé : DayZ Tools et un serveur de test sont nécessaires à la validation avant utilisation en production. Consoles et autres jeux ne sont pas couverts par ce module.

## Fonctions

- Événements de connexion/déconnexion, mort, suicide et kills attribuables à un joueur par le callback moteur.
- Positions relevées toutes les cinq secondes, coordonnées horizontales X/Z.
- Livraison dans l’inventaire du joueur connecté, identité DayZ correspondant à la liaison vérifiée.
- File locale persistante et identifiants d’événements conservés jusqu’à leur acceptation par le dashboard.
- Marqueur de livraison enregistré avant toute création d’objet ; après interruption ou livraison partielle, vérification par le staff obligatoire, sans relance automatique.

Le transport n’utilise pas de secret dans le PBO : l’agent Node signe les requêtes. Le dossier de profil et l’agent doivent être sur le même hôte ou un volume partagé sécurisé. Un accès FTP seul chez un hébergeur ne permet pas de lancer cet agent.

## Installation

1. Installer DayZ Tools sur une machine Windows et compiler les sources avec Addon Builder : `./Build-Mod.ps1 -AddonBuilder 'chemin/AddonBuilder.exe'`. Vérifier le préfixe PBO `ExtinctionRSS`, le chargement des deux modules et le journal de compilation/script du serveur. La compilation Enforce se valide au chargement du serveur ; Addon Builder seul ne prouve pas la validité des scripts.
2. Copier `build/@ExtinctionRSS` dans le serveur et ajouter `-serverMod=@ExtinctionRSS`. Les joueurs ne doivent pas installer un mod client pour ces fonctions serveur.
3. Dans Serveurs, activer l’adaptateur externe et configurer une clé aléatoire d’au moins 32 caractères. Désactiver le lecteur FTP ADM sur ce serveur pour éviter de compter les mêmes événements deux fois.
4. Définir les variables de l’agent :
   - `EXTINCTION_DAYZ_PROFILE` : chemin local absolu vers `<profiles>/ExtinctionRSS`.
   - `EXTINCTION_DASHBOARD_URL` : URL HTTPS du dashboard.
   - `EXTINCTION_GUILD_ID` et `EXTINCTION_SERVER_ID` : IDs exacts.
   - `EXTINCTION_BRIDGE_SECRET` : la clé configurée dans le dashboard. La fournir via l’environnement du service, sans la commettre ni l’afficher dans des logs.
5. Installer Node.js 22 ou supérieur, copier le dépôt et lancer `node native/dayz/agent.cjs` avec un gestionnaire de service. L’agent doit pouvoir lire/écrire dans le dossier de profil. Le mod génère ses sous-dossiers et le fichier `alive.json`.
6. Vérifier un kill et une position sur le dashboard, puis vérifier l’identité du joueur et tester une livraison d’un seul objet. Un inventaire plein produit une livraison non confirmée ; aucune création au sol silencieuse.

## Limites et reprise

- Le chat jeu → Discord reste pris en charge par les logs ADM ; ce module ne fournit pas encore un relais bidirectionnel natif. Ne pas importer simultanément ADM et mod pour les mêmes kills.
- Les bans/whitelist natifs sont gérés via CFTools, la synchronisation de fichiers ou les outils de l’hébergeur, pas par ce module.
- L’agent annonce la livraison uniquement si le mod écrit un heartbeat récent. Sans mod chargé, cocher l’option sur le dashboard ne permet pas la livraison automatique.
- La file d’événements est plafonnée à 1000 fichiers et 1000 événements en mémoire. Après une indisponibilité prolongée, des événements peuvent être perdus : ce n’est pas une garantie d’exhaustivité.
- Lors d’un arrêt brutal, le fichier `.agent.lock` peut rester. Vérifier qu’aucun agent n’est actif avant de le supprimer et de relancer. Ne jamais supprimer les marqueurs `delivery_started` pour forcer une nouvelle livraison.
- Les marqueurs de livraison ne sont pas purgés automatiquement ; les archiver seulement après rapprochement des commandes et sauvegarde.
- Une livraison réclamée côté dashboard dont la réponse HTTP s’est perdue reste non confirmée : vérifier avec le staff. Ne pas remettre une commande en file automatiquement.
- Un même identifiant relancé plus de 10 000 événements après sa première importation peut dépasser l’historique de déduplication du dashboard ; conserver une seule instance d’agent et son état local.

Sources d’interfaces consultées : https://github.com/BohemiaInteractive/DayZ-Script-Diff et la documentation DayZ Tools. Ce module original n’est pas publié au Steam Workshop par ce déploiement.
