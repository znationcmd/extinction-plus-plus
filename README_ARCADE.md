# Casino, loterie et mini-jeux Discord

Ces jeux utilisent uniquement les crédits virtuels de la banque du serveur Discord. Ils fonctionnent indépendamment du jeu hébergé. Aucun achat de crédits ni retrait en argent réel n'est ajouté.

- `/casino regles` : probabilités, paiements et limites.
- `/casino jouer jeu:pileface mise:100 choix:pile` : pile ou face (paiement total ×2).
- `/casino jouer jeu:des mise:100 choix:6` : dé (paiement total ×5 si le résultat correspond).
- `/casino jouer jeu:slots mise:100` : trois symboles, triple ×10, paire ×1, sinon aucun paiement.
- `/loterie ouvrir prix:10 minutes:60` : ouverture par un membre avec la permission Gérer le serveur.
- `/loterie acheter tickets:2` : achat dans la banque, maximum 10 tickets par joueur et 10 000 par tirage.
- `/loterie info` : prix, cagnotte et échéance.
- `/loterie tirer` : disponible pour tous après l'échéance ; la totalité de la cagnotte est créditée au gagnant. Le tirage doit être demandé, il n'est pas programmé automatiquement.
- `/minijeu jeu:chifoumi choix:pierre`, `/minijeu jeu:devinette choix:7`, `/minijeu jeu:de` : jeux gratuits sans gains ni mises.

Les réponses sont privées. Le générateur aléatoire utilise `crypto.randomInt`. Les parties payantes attendent 10 secondes entre deux mises. Les règlements sont enregistrés avec leur identifiant d'interaction Discord ; le stockage partagé rejette les modifications concurrentes incompatibles. Les commandes sont enregistrées automatiquement à la connexion du bot, ou par `deploy-commands.js`.
