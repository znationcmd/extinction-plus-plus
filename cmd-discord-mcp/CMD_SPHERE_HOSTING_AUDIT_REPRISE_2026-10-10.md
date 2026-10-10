# CMD Sphere + CMD Hosting — Audit de reprise vérifiable

## Reprise supplémentaire — test des sources graphiques, 10/10/2026 (16 h 55, Corse)
- Archive originale `cmd-sphere-68-avatars-individuels.zip` inspectée : **68 fichiers PNG RGB sans transparence**, largeur **90 ou 91 px**, hauteur **256 px**. Certaines découpes visibles contiennent des membres d'autres personnages ou coupent des bras/personnages. **Ces sources ne peuvent pas donner une vraie image Ultra HD simplement par agrandissement.** NE PAS écraser les originaux ni les associer à tort à des silhouettes propres. Recréer les sujets complets, détourés et détaillés un à un, puis conserver les identifiants.
- Archive `CMD_Sphere_62_Fonds_Horizontaux_Nets.zip` inspectée : **62 images 1920×1080 et 62 miniatures 640×360**, toutes en WebP RGB ; le code de déploiement en conserve les originaux. Les dimensions seules ne prouvent pas la netteté des détails.
- Archive `CMD_Sphere_54_fonds_individuels_sans_doublons.zip` inspectée : **53 images**, pas 54, aux dimensions **984×1362 ou 984×1365** (format vertical), donc ne doivent pas être traitées comme des fonds 16:9 sans composition adaptée.
- Le bouton + de la colonne des serveurs utilisait encore une page autonome `/servers/add`. Nouveau correctif préparé sur `cmd-sphere/route-creation-mobile-20261010` : acheminer ce chemin vers `/dashboard?createServer=1` pour ouvrir l'assistant en trois étapes intégré à la plateforme, sans supprimer les fonctionnalités rejoindre/importer.
- Pour un serveur ayant seulement le propriétaire, un bouton d'invitation a été ajouté dans les pages membres et attribution de rôles. La gestion reste liée à des comptes ayant effectivement rejoint le serveur.
- Ces correctifs sont distincts de la validation de la qualité HD et des installations réelles de mods DayZ/ARK. Aucune simulation ne remplace les tests.

Date : 10 octobre 2026. Document de continuité pour reprendre **les projets existants** sans réinitialisation ni perte.

## Règles absolues
- Ne jamais modifier Extinction++ ou les bots indépendants.
- Ne pas supprimer comptes, serveurs, salons, messages, profils, personnalisations, anciens fichiers graphiques ou identifiants de catalogue.
- Ne pas toucher aux serveurs Discord externes sans autorisation.
- Ne pas publier de codes factices, succès simulés, paiements fictifs ou installation de mods non confirmée.
- Ne pas exposer clés, mots de passe ou tokens ; vérifier les permissions **côté serveur**.
- Aucun déploiement concurrent : contrôler d’abord les déploiements et travaux en attente.
- Ne pas confondre « code présent », « Railway SUCCESS » et « fonctionnalité testée sur iPhone ».

## Adresses et limites de portée
**CMD Sphere** : https://cmd-sphere.up.railway.app ; repo `znationcmd/extinction-plus-plus`, source `cmd-discord-mcp/`, branche de production `cmd-sphere/avatars-individuels-20261009`. Railway projet `448c9383-00a0-4597-9a2b-5b0f9d93172e`, service `020e5b4a-7ad2-4525-b195-36e56f37e851`.
**CMD Hosting** : https://cmd-hosting-web-production.up.railway.app/d/cmd ; Railway projet `56e867d4-85c3-4bcd-91b1-54f310ef71bf`, service Bun Function `4fe9c596-ed98-416d-a652-7e9aab6c0629` ; PostgreSQL séparé dans le même projet.
**Branche de reprise isolée** : `cmd-sphere/reprise-roles-creation-20261010`. Reporter les changements vers la branche de production uniquement après réussite du déploiement en cours.

## Dernier contrôle direct des services
- CMD Sphere : service accessible/online selon Railway. Déploiement SUCCESS `5917ac71d72cb87d922ee439abc8f2b13d73c4f4`. Déploiement suivant `276906f8d033f91fb1b4befd028d8af7657df201` encore BUILDING au dernier contrôle ; recontrôler avant toute publication.
- CMD Hosting : déploiement `3655ca48-7629-49df-b58c-e293ac1396db` SUCCESS. Journal de démarrage : 173 jeux chargés ; commandes machines désactivées.
- CMD Hosting : Railway Function Bun, code renvoyé comme caractères de remplacement illisibles par la lecture de source. **Ne pas réécrire le code complet de la Function** avant récupération vérifiable du texte original.
- CMD Hosting : de nombreux modules existent sous des variables `CMD_MOD_*_UI_JS`, `CMD_AGENT_*`, `CMD_STEAM_APP_MAP_JSON`, mais **pas** de variables `STEAM_WEB_API_KEY` ou `CURSEFORGE_API_KEY` dans la liste. Un agent Windows n’apparaît pas comme service distinct dans Railway : vérifier sa présence, son installation et ses réponses sur la vraie machine.
- Aucun paiement public tant que provisionnement réel et capacités non vérifiés.

## Interventions GitHub réalisées dans cette reprise
1. `cmd-server-manager.js` : ajout d’une liste réelle des membres natifs, recherche, visualisation des rôles, ajout/retrait d’un membre via `/api/native/roles/assign`, retour d’erreur sans succès fictif, droits réservés au propriétaire. Commit initial `c77ea69d5b4c0d6a6776451859c3ee08a873509b` (la branche de production a pu recevoir d’autres travaux en parallèle : vérifier son état courant). Syntaxe JavaScript contrôlée.
2. `server.js` : nouveau parcours de création de serveur **3 étapes plein écran** adapté iPhone : modèle, communauté/amis, image+nom, puis ouverture du nouveau serveur via `/dashboard?openNative=<id>`. Utilise `/api/native/guilds` et `/api/native/server-identity`. En cas d’échec d’image après création, le serveur reste récupérable. Les modèles de canaux sont gérés par la source serveur existante. Commit `3f788c4b105360b6d5fbfe0e59dcbe614884e926`. Script de dashboard contrôlé au parseur JavaScript. **Non testé de bout en bout sur iPhone connecté.**
3. Boutique CMD Sphere : mise à jour de `cmd-premium-art.js` pour raffiner cristaux SVG, cadre et prévisualisation proportionnelle, commit `3a36abb381cced8717db58417165c6ad95d69d56`, déploiement passé SUCCESS dans la séquence de production antérieure. Cela **ne constitue pas** la reconstruction native HD de tous les catalogues.

## CMD Sphere — liste complète des travaux à valider et terminer
### Priorité 0 : stabilité
- Lire branche HEAD, arbre Git, déploiements Railway et journaux, vérifier build et démarrage, inventaire des données persistées, sauvegarde/rollback.
- Contrôler JS runtime, erreurs API, absence de suppression, isolation des serveurs.
### Priorité 1 : créations / membres / rôles / invitations
- Tester assistant de création sur iPhone Safari, Android et ordinateur : modèles, type, image, nom, contrôle d’erreur, redirection vers nouveau serveur, salon général.
- Tester attribution et retrait de plusieurs rôles à un **membre ayant rejoint le serveur**. S’il n’y a qu’un propriétaire, l’interface doit signaler qu’un autre compte doit rejoindre. Contrôler droits propriétaire, permissions Hosting, rémanence après actualisation/reconnexion.
- Invitations distinctes par serveur : 3/30 jours ou jamais, QR codes, révocation, lien propre au serveur, privé inaccessible sans invitation. Ne pas importer de membres Discord automatiquement.
### Priorité 2 : iPhone / interface
- Corriger débordements des sélecteurs de langues, modales et titres de boutique, superpositions, texte tronqué, carte « Mes serveurs CMD Hosting », mini-profil, affichage des bulles et messages.
- Corriger les boutons d’édition, la fermeture, l’aperçu en direct, l’enregistrement et le maintien de page au rafraîchissement.
- Design noir/violet cohérent, retina, menus non entassés, adaptatif mobile/tablette/ordinateur, accès aux fonctions existantes.
### Priorité 3 : ressources graphiques
- Inventorier et récupérer **toutes** les archives et planches : `CMD_Sphere_8_planches_scenes.zip`, `scenes_cmd_sphere_6_planches.zip`, `CMD_Sphere_54_fonds_individuels_sans_doublons.zip`, `CMD_Sphere_62_Fonds_Horizontaux_Nets.zip`, `cmd-sphere-68-avatars-individuels.zip`, `cmd-sphere-catalogue-images.zip`.
- 35 SVG de fonds et 62 fonds supplémentaires mentionnés aux journaux : vérifier HTTP/affichage 16:9, tous les originaux et 62 nouveaux accessibles, paysage non flou, aucune déformation, aucune bannière de profil remplacée.
- 68 avatars ; environ 265 animaux, 131 véhicules, 50 maisons selon ancien inventaire : **chiffres indicatifs non revérifiés dans cette phase**. Recréer chaque fichier individuel en vraie HD et sur fond transparent, sans découpe, conserver vêtements et identifiants, versions originales comme secours.
- Mettre en place correspondance `id→original→HD`, miniatures adaptées au mobile, chargement différé et mémoire contrôlée ; supprimer logos/prix/couronnes parasites des planches.
- Reconstruire visuels boutique, cadres, plaques et effets trop simples ; ne pas se contenter d’un agrandissement Sharp/Lanczos ou d’un filtre flou.
### Priorité 4 : toutes autres fonctions demandées
- Avatar/Mon univers/fonds/décors, profil/état/badges, emojis complets ~7 526, upload emojis et animations, messages non coupés, médias, traductions (11 langues + Corse).
- Importation Discord autorisée sans effacer les originaux, webhooks et bots compatibles, indépendance de connexion Discord.
- Studio vidéo, prévisualisation effets/musiques sous licences, likes/commentaires persistants, stockage effectif, vidéos et navigation.
- Portail développeur : OAuth2 et webhooks **réels**, créations de bots/apps, permissions/jetons protégés.
- CMD Sphere ↔ CMD Hosting : associations propriétaires, état machine réel, délégation par rôles, accès refusé aux non-autorisés.

## CMD Hosting — liste complète des travaux à valider et terminer
- Refonte menus et boutique propres inspirés Nitrado/GPORTAL sans copier de marques/assets protégés ; jeu et plateforme corrects, images nettes, avis des ressources machines.
- L’agent Windows et le chemin CMD Hosting→agent→machine→jeu doivent être testés pour vraie création, démarrage, arrêt, redémarrage, console, fichiers, sauvegardes, journal, commandes réelles et auto-lancement.
- DayZ « EXTINCTION FR » : Steam Workshop App 221100, recherche par ID sans clé si méthode publique possible, QueryFiles et recherche nom avec clé autorisée si requise. Infos mod / dépendances / ordre / mise à jour / état d’installation, SteamCMD sur machine autorisée, clés serveur si nécessaires.
- ARK ASA « ARK VALHALLA EXTINCTION FR » : API CurseForge `x-api-key`, clé valide requise côté serveur, recherche et fiche, compatibilité officielle avec ASA, mécanisme de téléchargement/installation et redémarrage prouvé. Pas de réussite fictive.
- Variables de configuration manquantes constatées : `STEAM_WEB_API_KEY`, `CURSEFORGE_API_KEY`. Les demander uniquement via procédure officielle et stocker dans Railway, jamais dans JS client. L’installation est BLOQUÉE sans machine et API/autorisation.
- Locations 3j/1m/90j/1a, paiements réels PayPal, portefeuille/dons par bénéficiaire, codes récompenses, gratuité à vie du fondateur, boosts, abonnement premium, suspensions/reprises sans effacer sauvegardes ; aucun paiement public sans tests en sandbox et raccordement machine.
- Menus et traductions 11 langues + Corse, PWA et session persistante, logs, erreurs, permissions côté serveur.

## Table de statut à respecter
| Élément | État |
|---|---|
| Railway CMD Sphere dernier SUCCESS connu | TERMINÉ ET TESTÉ pour démarrage seulement |
| Nouveau parcours création de serveur | CODE PRÉSENT, NON VALIDÉ en production |
| Attribution native des membres aux rôles | CODE PRÉSENT, NON VALIDÉ avec deux comptes |
| 62 fonds et 68 avatars existants | CODE PRÉSENT, NON VALIDÉ en HD réelle |
| HD native de toutes les ressources | À FAIRE |
| Menus/profils/iPhone, langues, Studio | EN COURS / CODE PRÉSENT NON VALIDÉ |
| Gestionnaire Steam Workshop | BLOQUÉ clé avancée/machine + source Hosting illisible |
| Gestionnaire CurseForge | BLOQUÉ clé/machine + source Hosting illisible |
| Création réelle automatisée de serveurs Hosting | BLOQUÉ tant que l’agent et les ressources ne répondent pas |
| Paiement public | BLOQUÉ délibérément par sécurité |

## Protocole de suite
1. Inspecter le dernier déploiement de CMD Sphere : attendre SUCCESS et zéro pendingWork.
2. Comparer branche de production et branche `cmd-sphere/reprise-roles-creation-20261010` ; intégrer sans écraser de commits concurrents.
3. Suivre Railway jusqu’à SUCCESS et démarrage propre.
4. Tester avec 2 utilisateurs réels : invitation, rôle, révocation et création serveur, droits.
5. Poursuivre images/HD et interface mobile, puis API mods/agent Hosting. Aucun autre service Railway ni bot indépendant.
6. À chaque étape renseigner commit, déploiement, fichiers, nombre de fichiers HD réellement installés, tests exacts et blocages. « Railway SUCCESS » n’est jamais « tout marche ».

**Ce fichier est le point de reprise à consulter avant chaque nouvelle session ou handoff Work.**
