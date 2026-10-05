# Guides Extinction++ RSS

Navigation publique pour ARK, Palworld, Aniimo, Conan et DayZ : accueil, menu latéral, barre mobile, recherche, filtres et fiches au clic. Les rubriques n’ont pas encore la totalité des données/fonctions des applications de référence.

| Jeu | Intégré | Limites restantes |
|---|---|---|
| ARK | 4 903 fiches de zones sur 11 variantes, 2 797 ressources The Island ASA, stats/reproduction ASB et estimation KO avec nourriture confirmée, niveau et multiplicateurs | Cartes restantes, ressources des autres cartes, mécaniques passives/spéciales, recettes et engrammes complets ; ASA limité aux entrées explicitement nommées |
| Palworld | 271 Pals avec images, aptitudes, stats imbriquées, butin, compétences, habitats jour/nuit ; 1 443 objets, 913 recettes, 491 constructions, 586 technologies ; 36 901 paires de reproduction ; 777 repères sur deux fonds de la source | Repères d’effigies, donjons, tours, voyages, notes et trésors uniquement ; pas de coordonnées ponctuelles des Pals sauvages ou des veines de ressources ; données datées de juillet 2026 |
| Aniimo | 86 fiches françaises détaillées officielles : stats, capacités, familles d’évolution ; 68 fiches avec régions d’habitat ; filtres, collection et équipe de quatre | Les régions ne fournissent pas de coordonnées précises ni toutes les conditions de spawn ; pas de catalogue d’objets complet, calcul de capture ou formes alternatives exhaustives |
| Conan | 2 479 objets, 2 875 recettes actives, 268 connaissances visibles, catégories, niveaux/coûts, prérequis/récompenses liés, calcul de matériaux ; cartes et favoris | Base GPL-3.0 archivée au 4 avril 2019, explicitement datée dans l’interface : contenus récents, Siptah, bestiaire/serviteurs et emplacements vanilla non intégrés |
| DayZ | 25 100 bâtiments vanilla pour les zones possibles de loot ; 2 007 classes de tous les types.xml, dont les matériaux sans loot automatique ; 1 006 correspondances d’images exactes ; modèles/bâtiments et filtres | Pas de fichier image pour toutes les classes ou les bâtiments, ni stats détaillées ; pas de présence de loot en temps réel |

Les zones ARK viennent du wiki officiel communautaire sous CC BY-NC-SA 4.0. Les boîtes sont affichées comme zones possibles, sans radar ni probabilité inventée. Les coordonnées sont longitude X, latitude Y, projetées sur les fonds en pourcentage. Les marqueurs représentent un groupe, pas tous ses rectangles ; rechercher une créature ou cliquer affiche les zones du groupe. Sources et transformations : `/ark-spawn-license.txt`. Téléchargements interrompus lorsque le wiki a imposé une limitation ; aucun contournement.

Palworld : adaptation des faits et coûts du projet stolenvw/pyPalworldAPI, licence MIT, version v1.0.1.100619 (export 18 juillet 2026). Descriptions non reproduites ; images de fiches référencées vers la révision source. Les fonds 8192 × 8192 sont réduits en WebP 2048 × 2048 sans changer les limites ; les pixels MapX/MapY deviennent des coordonnées en pourcentage, pas des coordonnées GPS en jeu. Pocketpair reste propriétaire de ses contenus. `/pal-data-license.txt`.

Aniimo : noms/numéros/éléments/rôles extraits de l’index officiel `https://wiki.aniimo.com/fr`, consulté le 5 octobre 2026 ; images conservées à leurs URL officielles, pas copiées dans le dépôt. Les fiches détaillées fournissent des faits numériques et noms d’habitats/capacités/évolutions ; descriptions narratives non copiées. Import limité à deux requêtes simultanées, arrêté sur refus ou limitation, pages mises en cache. Aniimo appartient à ses ayants droit. Les noms des cartes et catalogues ne prouvent pas qu’une base de spawns soit intégrée.

Collection/équipe et plans de matériaux : stockage local du navigateur, non synchronisé avec Discord ou d’autres appareils. Recettes Palworld/Conan : coûts directs, arrondi au nombre entier de fabrications ; ni décomposition récursive, ni bonus de station/serviteur/serveur. Les filtres sont remis à zéro lors d’un changement de rubrique. Les images indisponibles affichent une icône de remplacement.

# Connexion Discord

Le choix du Discord utilise également un cookie persistant d’un an et est supprimé à la déconnexion. Nouvelles connexions : cookie persistant d’un an contenant uniquement un identifiant aléatoire de session. Jetons d’accès et de renouvellement chiffrés dans PostgreSQL ; renouvellement automatique avant expiration, sous verrou de ligne pour empêcher les rotations concurrentes. La déconnexion invalide la session de ce navigateur. Les permissions Discord sont toujours vérifiées lors des opérations.

Les anciens cookies d’une heure restent valables jusqu’à leur expiration ; une connexion après la mise à jour crée le nouveau format persistant. Une révocation Discord, la suppression des cookies ou le changement de clé de chiffrement nécessitent une reconnexion. Une panne transitoire Discord ne supprime pas la session.

Validation : tests d’expiration/rotation, requêtes concurrentes, panne transitoire, déconnexion, données par édition et absence de coordonnées inventées. Le maintien d’une véritable session OAuth utilisateur sur plusieurs jours n’est pas validé en conditions réelles.

# Sources et reproductibilité complémentaires

- Conan : `m-xubair/conanexilesdb`, révision `26690500956a4dff9a5774dcc6f2cb10d44f96d8`. Données distinctes GPL-3.0, source complète et transformation référencées dans `/conan-data-license.txt`. Import : `scripts/import-conan-catalog.py`. Aucune garantie de correspondance avec Conan actuel.
- DayZ : tous les types.xml vanilla Bohemia Interactive, source ADPL-SA existante. Les classes à nominal nul ou sans catégorie de loot sont consultables dans le catalogue mais ne sont pas ajoutées aux tables de bâtiments. Images : fichiers effectivement listés par l’API publique dayz.wiki.gg, noms normalisés exacts, URLs/pages de fichiers conservées et attribution dans `/dayz-image-license.txt`. Aucune URL d’image inventée.
- ARK KO : adaptation MIT des formules `FoodAmountNeeded`/`TamingTimes` d’ASB. Paramètres explicitement présents dans chaque fichier d’édition ; pas d’héritage implicite ASE vers ASA. Affinité de nourriture × `TamingSpeedMultiplier` × 4, temps basé sur consommation, efficacité sans dégâts, niveaux bonus arrondis à l’entier inférieur. Nourriture non confirmée, quantité multiple ou mécanique passive : résultat refusé.

Validation complémentaire : 113 tests, compilation Next.js, isolation des points communautaires, calibration pixels Palworld/fond de la même source, ingrédients et rendements, références connaissances/recettes, faits officiels Aniimo, classes DayZ sans loot automatique et estimation KO Rex recoupée avec la formule source. Les sessions sur plusieurs jours et les livraisons dans de vrais serveurs de chaque jeu restent des validations en conditions réelles, pas des résultats simulés annoncés comme confirmés.
