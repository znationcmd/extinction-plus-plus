# Guides Extinction++ RSS

Navigation publique pour ARK, Palworld, Aniimo, Conan et DayZ : accueil, menu latéral, barre mobile, recherche, filtres et fiches au clic. Les rubriques n’ont pas encore la totalité des données/fonctions des applications de référence.

| Jeu | Intégré | Manquant |
|---|---|---|
| ARK | 4 903 fiches de groupes de zones sur 11 variantes, 2 797 repères de ressources The Island ASA, statistiques et reproduction du catalogue ARK Smart Breeding | Cartes restantes, ressources des autres cartes, apprivoisement complet, recettes/engrammes exhaustifs |
| Palworld | 271 Pals avec images liées à la source, éléments, aptitudes, stats de base et butin ; 913 recettes ; 36 901 paires de reproduction ; collection et équipe locale | Spawns et ressources sur carte calibrée, statistiques calculées par niveau/IV, données des versions postérieures au catalogue |
| Aniimo | 86 entrées de l’index officiel français, images officielles liées, éléments et rôles, collection et équipe de quatre | Positions, statistiques/compétences détaillées, calculateur de capture et catalogue d’objets complet |
| Conan | Cartes, navigation et favoris, calculateur de matériaux à coûts saisis et sources externes | Base intégrée de connaissances/recettes/objets/serviteurs et emplacements vanilla ; API wiki refusant l’accès automatique |
| DayZ | 25 100 bâtiments vanilla, classes de loot à nominal positif, catalogue des modèles/bâtiments et fiches de classes | Images des modèles/objets, statistiques détaillées et certains points environnementaux |

Les zones ARK viennent du wiki officiel communautaire sous CC BY-NC-SA 4.0. Les boîtes sont affichées comme zones possibles, sans radar ni probabilité inventée. Les coordonnées sont longitude X, latitude Y, projetées sur les fonds en pourcentage. Les marqueurs représentent un groupe, pas tous ses rectangles ; rechercher une créature ou cliquer affiche les zones du groupe. Sources et transformations : `/ark-spawn-license.txt`. Téléchargements interrompus lorsque le wiki a imposé une limitation ; aucun contournement.

Palworld : adaptation des faits et coûts du projet stolenvw/pyPalworldAPI, licence MIT, version v1.0.1.100619 (export 18 juillet 2026). Descriptions non reproduites ; images référencées vers la révision source. Pocketpair reste propriétaire de ses contenus. `/pal-data-license.txt`.

Aniimo : noms/numéros/éléments/rôles extraits de l’index officiel `https://wiki.aniimo.com/fr`, consulté le 5 octobre 2026 ; images conservées à leurs URL officielles, pas copiées dans le dépôt. Aniimo appartient à ses ayants droit. Les noms des cartes et catalogues ne prouvent pas qu’une base de spawns soit intégrée.

Collection/équipe : stockage local du navigateur, non synchronisé avec Discord ou d’autres appareils. Plans de recettes Palworld : calcul de coûts directs avec arrondi au nombre entier de fabrications, pas de décomposition récursive des ingrédients.

# Connexion Discord

Le choix du Discord utilise également un cookie persistant d’un an et est supprimé à la déconnexion. Nouvelles connexions : cookie persistant d’un an contenant uniquement un identifiant aléatoire de session. Jetons d’accès et de renouvellement chiffrés dans PostgreSQL ; renouvellement automatique avant expiration, sous verrou de ligne pour empêcher les rotations concurrentes. La déconnexion invalide la session de ce navigateur. Les permissions Discord sont toujours vérifiées lors des opérations.

Les anciens cookies d’une heure restent valables jusqu’à leur expiration ; une connexion après la mise à jour crée le nouveau format persistant. Une révocation Discord, la suppression des cookies ou le changement de clé de chiffrement nécessitent une reconnexion. Une panne transitoire Discord ne supprime pas la session.

Validation : tests d’expiration/rotation, requêtes concurrentes, panne transitoire, déconnexion, données par édition et absence de coordonnées inventées. Le maintien d’une véritable session OAuth utilisateur sur plusieurs jours n’est pas validé en conditions réelles.
