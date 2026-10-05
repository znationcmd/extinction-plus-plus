# Boutique à position au redémarrage

## DayZ PC, Xbox et PlayStation

Le nouveau mode `dayz_restart` utilise Object Spawner, sans mod PC. Il est désactivé par défaut. Il nécessite un accès FTP/FTPS, un panel Nitrado ou Pterodactyl compatible pour arrêter/démarrer, et un essai effectué par le staff sur ce serveur.

Installation :

1. Dans Cartes, créer une carte liée au serveur, renseigner les bornes X / Z réelles et vérifier la calibration. Cocher « Coordonnées monde ». Les fonds intégrés en pourcentages ne conviennent pas directement. Publier la carte si les acheteurs doivent choisir visuellement leur point.
2. Créer `extinction-shop-orders.json` contenant `{"Objects":[]}` dans la racine FTP de la mission. Le modèle vide se télécharge dans Livraisons. Ajouter exactement ce nom dans `WorldsData.objectSpawnersArr` du fichier `cfggameplay.json`, sans retirer les autres entrées. Activer le chargement de cfggameplay dans le panel. Le bot ne modifie pas ce fichier de configuration.
3. Tester les classes, la persistance CE et le délai réel de chargement sur un serveur de test. Vérifier leurs définitions et durées de vie dans l’économie du serveur. Les objets/mods PC non installés ne peuvent pas apparaître sur console.
4. Dans Serveurs → Modifier → Réglages avancés, renseigner le chemin absolu FTP de la mission sans slash final, l’ID de carte, les classes testées et un délai de nettoyage de 120 à 3600 secondes suffisamment long pour charger le monde. Confirmer le test puis activer le mode. Ne pas partager un même fichier de mission entre deux services du bot.
5. Créer un article avec ce serveur, le mode DayZ au redémarrage et une recette de classes/quantités. La monnaie est virtuelle. Les commandes réservent le prix avant le traitement.

Le joueur choisit X / Z sur la carte du Shop et saisit l’altitude Y exacte, puis copie la commande `/shop buy ... x:... z:... y:...` dans le Discord du serveur. L’achat se fait dans Discord, pas par un paiement web. Une carte 2D ne fournit pas l’altitude : il faut une hauteur connue/vérifiée. Les objets apparaissent au sol et ne sont pas réservés physiquement à l’acheteur. Les kits sont des objets séparés, sans accessoires ou inventaire de conteneur implicites.

## Cycle contrôlé

Les achats restent `restart_queued`. Le staff ou une tâche programmée lance **Redémarrer par le bot**. Le worker réserve au maximum 20 commandes / 500 objets dans un lot, vérifie la configuration et le fichier vide, demande l’arrêt puis attend sa confirmation. Il prépare et relit un fichier temporaire, le renomme, relit le fichier final puis demande le démarrage. Après observation d’un statut démarré et expiration du délai configuré, il vide le fichier dédié pour limiter les doubles apparitions aux prochains redémarrages.

Un redémarrage direct du panel, un redémarrage externe planifié ou un crash ne prépare pas les commandes en attente. Désactiver les redémarrages externes concurrents pendant les cycles. Le bot bloque ses propres actions panel sur un serveur avec lot actif ; il ne peut pas bloquer le propriétaire dans son panel. Un statut « démarré » du panel n’est pas un signal certain de chargement du monde. Un délai trop court peut empêcher le spawn : la confirmation en jeu reste nécessaire.

Les commandes finissent `restart_spawn_unverified`, **pas** « livrées ». Le staff confirme dans Livraisons après contrôle physique. La présence d’un fichier correctement transféré ne prouve ni la validité d’une classe ni l’apparition/persistance des objets. Le bot ne peut pas obtenir d’ACK natif sur console avec ces seuls fichiers. Un objet non persistant peut disparaître après un autre redémarrage ; un objet persistant dépend des règles CE de ce serveur.

En cas d’interruption ou de résultat ambigu, le lot devient `uncertain` et ses commandes ne sont ni rejouées ni remboursées automatiquement. Vérifier les objets et l’état du panel, puis utiliser **Vider le fichier du lot et débloquer la reprise** avec un compte rendu. Le bot vérifie un état stable, vide et relit son fichier avant de débloquer les commandes pour revue. Confirmer ou annuler chaque commande séparément ; l’annulation rembourse une seule fois. Une panne après écriture FTP mais avant journalisation reste ambiguë et exige ce contrôle.

## ARK

Le mode `bridge_restart` transporte un point X/Y/Z, une recette et `mode: restart_ground` vers un adaptateur ARK externe signé. Le plugin doit annoncer `delivery`, `restartGround` et éventuellement `kits`, être connecté, et être explicitement déclaré testé. Une carte de serveur calibrée en coordonnées monde est obligatoire : latitude/longitude en pourcentages ne suffisent pas.

Le backend ne fournit pas de plugin ARK natif à installer. Ce mode n’est donc pas opérationnel sans un plugin qui persiste la commande avant remise, attend le redémarrage approprié et confirme la livraison après apparition réelle. Une ancienne intégration ne doit pas traiter ce mode comme une livraison d’inventaire. La livraison RCON ARK au joueur reste disponible ; elle ne crée pas une commande au sol à une coordonnée choisie.

Référence du schéma Object Spawner : https://github.com/BohemiaInteractive/DayZ-Script-Diff/blob/main/scripts/3_game/objectspawner.c et https://community.bistudio.com/wiki/DayZ:Object_Spawner . Les tests simulent FTP, panel et redémarrages ; aucun essai sur un serveur réel n’a été effectué avec ces nouveaux modules.
