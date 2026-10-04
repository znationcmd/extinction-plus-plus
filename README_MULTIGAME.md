# Pass, quêtes, primes et boutique multi-jeux

Les modules communautaires acceptent les neuf choix du catalogue : DayZ PC, PlayStation, Xbox, ARK, Arma Reforger, Palworld, Conan Exiles, 7 Days to Die et Aniimo. Aniimo reste un module communautaire sans intégration de serveur garantie.

- Pass : saisons, historique, pistes gratuites/premium, niveaux globaux ou réservés à un jeu/serveur. Le staff attribue le premium par joueur et saison. Les niveaux atteints sont crédités une seule fois ; retirer le premium ne reprend pas les récompenses déjà versées. Aucun paiement réel ou abonnement automatique.
- Quêtes : preuves via `/quete preuve`, progression via `/quete liste`, renouvellement quotidien UTC ou hebdomadaire le lundi UTC. Les récompenses se limitent à une attribution par joueur, quête et période. Les preuves tardives conservent leur période et la règle de saison du pass. Les événements automatiques sont kill, connect, death, suicide et chat, avec identité du joueur vérifiée. Les positions seules ne prouvent pas une quête.
- Primes : dépôt de banque, expiration/remboursement, paiement sur kill vérifié ou examen d’une preuve par le staff dans Opérations. Interdiction des suicides, même compte, commanditaire bénéficiaire et même faction. La validation manuelle demande une liaison vérifiée et un motif/preuve.
- Boutique : catalogue par jeu et serveur, banque virtuelle, livraison par le staff sur tous les jeux. ARK possède une livraison RCON conditionnelle ; la liaison signée accepte les livraisons uniquement avec un adaptateur de jeu effectivement installé, connecté et déclaré compatible. Choisir « Staff » conserve une livraison manuelle, y compris ARK.

Les jeux et serveurs sont contrôlés ensemble pour éviter de vendre un article ARK sur un serveur DayZ. L’XP des niveaux réservés utilise uniquement les quêtes du jeu/serveur concerné. Une quête globale sans serveur fournit de l’XP globale, sans inventer un jeu ou serveur.

## Limites des automatisations

Le lecteur de logs intégré est DayZ ADM, sur accès FTP/FTPS. Les autres jeux peuvent importer des événements via le protocole signé décrit dans README_GAME_BRIDGE.md ; ce dépôt ne contient pas de mod natif installable pour chaque jeu. Sans événements fiables, utiliser les preuves staff. Les consoles n’acceptent pas tous les mods PC. L’existence d’un jeu dans le menu ne prouve pas une livraison automatique en jeu. Les intégrations natives CFTools et BattleMetrics restent absentes.

Les messages libres des tickets Discord ne sont pas synchronisés automatiquement ; utiliser `/ticket repondre` ou le dashboard pour conserver l’historique commun.
