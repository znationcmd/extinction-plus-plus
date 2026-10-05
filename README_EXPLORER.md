# Explorateurs par jeu

Routes publiques distinctes : `/explorer/ark`, `/explorer/palworld`, `/explorer/aniimo`, `/explorer/dayz`. Interface Extinction++ RSS : recherche, cartes avec zoom/déplacement, catégories, fiches de créatures, ressources, loot et favoris conservés sur cet appareil. Les favoris ne sont pas synchronisés entre comptes. Les positions des joueurs et les marqueurs privés ne sont jamais inclus dans cette API.

Ces pages reprennent le parcours recherche → fiche → emplacement. Elles ne reproduisent pas le code, les illustrations ou les bases complètes de Dododex, Paltopia, Aniimo Companion et iZurvive. Les références externes sont liées comme services indépendants. Les calculateurs d’apprivoisement, capture, reproduction, statistiques et talents ne sont pas implémentés dans cette version.

DayZ inclut par défaut 25 100 bâtiments vanilla sur Chernarus, Livonia et Sakhal, avec leurs catégories officielles ; aucun import admin requis. Les autres jeux utilisent les emplacements publiés par les communautés et affichent leur absence si nécessaire. Les fonds intégrés restent consultables. Une localisation publiée est un repère/documentation, pas une créature actuellement présente ni un loot garanti.

Dans **Gérer les emplacements**, ajouter un point ou importer un JSON : tableau d’objets avec `name`, `kind` (`creature`, `resource`, `loot`), `category`, `x`, `z`, `conditions`, `notes`, `sourceUrl`; facultativement `element`, `rarity`, `diet`, `drops`. Les coordonnées suivent exactement les bornes de la carte choisie. Source HTTPS seulement, sans identifiants. Les cartes personnelles doivent appartenir au Discord actif ; les cartes intégrées sont sélectionnables dans l’éditeur manuel.

Les imports sont des brouillons et sont dédupliqués par Discord, carte, type, nom, coordonnées et catégorie. La publication de tous les points d’une carte est une action séparée et explicite ; une carte privée ne permet pas de publier ses points. Les erreurs d’un lot ne suppriment pas les lots précédents. L’éditeur permet de corriger/masquer/supprimer les points, y compris un point importé devenu obsolète.

## Loot DayZ depuis les fichiers du serveur

L’import accepte `mapgrouppos.xml` et `mapgroupproto.xml`, au maximum 8 Mo chacun, uniquement sur une carte DayZ du serveur cochée en coordonnées monde. Les XML invalides, DTD et entités sont rejetés. Il associe les bâtiments à leurs catégories d’usage et positionne leurs centres X/Z. Il ne reconstruit pas les points intérieurs, les distributions exactes d’objets, les tiers, ni le stock présent en jeu. Les ressources naturelles non présentes dans ces groupes nécessitent des points additionnels.

Aucune copie des jeux de données commerciaux des applications n’est incluse. Le dépôt officiel DayZ Central Economy sert de référence du format ; une extraction de ses centres de bâtiments et catégories est incluse sous ADPL-SA, attribution et licence dans dashboard/public/dayz-data-license.txt. Usage entièrement gratuit et non commercial, exclusivement DayZ. Utiliser les données du serveur concerné et vérifier leur version, leur calibration et leurs sources avant publication. Les cartes de serveurs modifiés peuvent différer fortement des emplacements vanilla.

Conan Exiles : rubrique publique /explorer/conan, cartes intégrées, catégories, recherche et favoris ; accès externe au bestiaire et recettes, aucune base exhaustive de recettes importée.
