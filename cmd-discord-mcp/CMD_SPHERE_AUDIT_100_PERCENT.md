# CMD Sphere — suivi de finition, 18 octobre 2026

Mission ouverte. Ce registre initial ne constitue ni un audit exhaustif achevé ni une validation à 100 %.
Le périmètre demandé dépasse les 59 contrats ; les contrôles de chaque écran, fonction sociale et catalogue restent à inventorier individuellement. Aucun pourcentage global n’est calculé.

## Reprise du 18 octobre 2026 — texte dans les salons vocaux CMD Sphere

- Décompte actuel sur les 59 contrats : **28 fonctionnalités au moins partiellement codées ; 31 toujours non développées ; 0 validée en production**. Ces nombres ne représentent ni une installation de tous les modules, ni des essais sur appareils réels.
- `voice_channel_text` : les salons vocaux natifs sont désormais ouvrables dans les vues de salon et peuvent recevoir ou afficher des messages par les API déjà existantes. Les contrôles de membres, droits de lecture du serveur, règles acceptées, AutoMod, mode lent et notifications bloquées sont conservés. Le chat vocal WebRTC et les serveurs Discord externes ne sont pas modifiés. Par précaution, les notifications avec aperçu du contenu des salons vocaux sont désactivées jusqu'au contrôle de permissions fines par destinataire.
- Tests de sécurité supplémentaires : `tests/native-voice-text.test.cjs`, plus mise à jour de `tests/native-media-channels.test.cjs`. [GitHub Actions 39117383895](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39117383895) : **384/384 tests réussis, 24/24 validations réussies, 0 échec**.
- Toujours aucun déploiement ni migration sur Railway, ni suppression de l'existant, ni activation de paiement ; sauvegarde Git `cmd-sphere/backup-before-voice-text-20261018`. La validation des permissions par canal, des notifications et des usages mobiles réels reste nécessaire avant production.

## Reprise du 18 octobre 2026 — catalogue de langues mondial et variantes suisses (GitHub)

- Demande de remplacer la limite de 11 langues : **8 148 entrées ISO 639-3 / ISO 639-1 et variantes BCP 47** ajoutées à `cmd-language-catalog.json`, consultables avec un champ de recherche sur iPhone, Android et PC dans `settings-ui.js`. Le sélecteur reste léger : 100 résultats visibles à la fois.
- Variantes de suisse allemand explicitement répertoriées : `gsw-CH`, `gsw-CH-x-bern` (bernois), `gsw-CH-x-zueri` (zurichois), `gsw-CH-x-basel`, `gsw-CH-x-wallis`, `gsw-CH-x-luzern`, ainsi que `de-CH`, `fr-CH`, `it-CH` et `rm-CH`. Champ libre BCP 47 pour d'autres dialectes correctement identifiés.
- Le choix est sauvegardé sans rebasculer silencieusement en français. `cmd-world-language-codes.js` valide les codes ; `cmd-translation.js` et `cmd-message-translate.js` acceptent les nouveaux paramètres. Les services de traduction gratuits ne couvrent pas 8 148 langues ; `gsw` se rabat sur l'allemand standard avec avertissement explicite ; l'original reste accessible. Le français conserve son interface d'origine et les autres langues sans fichier de traduction utilisent temporairement une interface de secours.
- Source de la liste de codes : [ISO 639-3, humenda/isolang-rs](https://github.com/humenda/isolang-rs/blob/master/iso-639-3.tab). Cette source donne des noms/codes, **pas des traductions réelles de l'interface**.
- CI [39116944042](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39116944042) : **362 tests réussis, 0 échec, 21 jobs réussis**, dont `world-languages.test.cjs`.
- Les 59 contrats Discord restent un inventaire distinct : **25 partiellement codés, 34 à développer, 0 validé en production**. Aucune migration de production, activation de paiement ni suppression de contenu dans ce lot.

Les sections plus anciennes conservent leurs chiffres historiques à leur date.

## Reprise du 18 octobre 2026 — protection anti-raid, relais public et stabilité des profils (vérification GitHub)

- **28/59 contrats avec implémentation au moins partielle**, **31/59 encore à coder**, **0/59 validé en production**. Le code préparé n'est pas une mise en service sur Railway.
- [CI GitHub Actions 39117618871](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39117618871) : **386 tests réussis sur 386, 0 échec**, incluant les modules anti-raid, relais d'annonces et stabilité des catalogues de profils. Les tests CI restent des tests de code ; pas de sauvegarde PostgreSQL restaurée ni de test en production.
- **raid_protection** : `cmd-native-raid-protection.js`, `cmd-native-invites.js`, `server.js` et le panneau Sécurité permettent un plafond opt-in de 3 à 100 nouveaux membres en 1 à 60 minutes. L'admission est contrôlée dans la transaction d'invitation, en sérialisant les entrées du même serveur, avec exception pour membres existants. Aucune interdiction permanente, aucun bannissement ni suppression. Tests `native-raid-protection.test.cjs`. Le support d'appel et le suivi des fausses alertes restent à finaliser.
- **followed_announcements** : `cmd-native-announcement-follows.js` et `cmd-server-manager.js` proposent de suivre et révoquer des canaux d'annonces natifs. Administration requise sur les deux serveurs ; source publique, hors catégorie privée, accessible à @everyone ; relayage **texte uniquement** sans auteur ni médias, arrêté quand la source n'est plus publique ou que l'admin perd ses droits. Tests `native-announcement-follows.test.cjs`. Retentatives, idempotence et validation d'appareils réels encore nécessaires.
- **Stabilité des profils** : `unpack-profile-assets.cjs` restaure désormais les fichiers d'archives et `manifest.json` par écriture temporaire puis renommage atomique. Cela corrige une course de lecture entre tests simultanés, sans retirer les archives ni images existantes. Test `profile-asset-atomic.test.cjs`.
- **voice_channel_text** : un autre lot intervenu sur la même branche ajoute la messagerie texte de salon vocal, comptée partielle et non validée sur la production.
- Sauvegardes du code : `cmd-sphere/backup-before-raid-20261018` et `cmd-sphere/backup-before-announcement-relay-20261018`. Aucune migration de production, aucun paiement ni suppression exécutés par cette intervention.

Les sections suivantes conservent les résultats des lots précédents.

## Reprise du 18 octobre 2026 — accueil membre et règlement versionné (GitHub)

- Décompte actuel des 59 contrats : **25 avec du code d'application au moins partiel**, **34 à développer**, **0 vérifié en production**. Un contrat préinstallé n'est pas une fonction installée.
- CI [39116328540](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39116328540) sur `7c0482746a3a8407ac2710a935dcc94cb73e46ac` : **357/357 tests réussis, 0 échec, 20 tâches CI réussies**. Tests de code sur GitHub et non de production Railway.
- `membership_onboarding` : `cmd-native-onboarding.js`, serveur et interface `cmd-server-manager.js`. Propriétaire seul à configurer un texte de bienvenue et jusqu'à 10 rôles sûrs ; autorisation de choix individuel unique seulement pour les membres, avec vérification des rôles en base et transaction empêchant l'escalade de privilèges. Tests `native-onboarding.test.cjs`. Restent à livrer les étapes automatiques lors de l'adhésion, prompts multiples et canaux personnalisés.
- `rules_screening` : `cmd-native-rules-screening.js`, API membre/propriétaire, interface règlement, révision à chaque changement et acceptation individuelle. La fonction est opt-in et bloque l'envoi de messages humains natifs tant que le nouveau règlement n'est pas accepté ; les administrateurs peuvent encore gérer les règles. Tests `native-rules-screening.test.cjs`. Le masquage complet des historiques, les autres surfaces de communication et les essais réels restent à faire.
- Sauvegardes Git créées : `cmd-sphere/backup-before-onboarding-20261018` et `cmd-sphere/backup-before-rules-20261018`. Aucun déploiement, suppression de données, paiement ni migration appliquée à Railway dans ce lot.

Les anciennes sections ci-dessous documentent des états antérieurs.

## Reprise du 18 octobre 2026 — audit natif et export de compte (état vérifié)

- **21/59 contrats partiellement implémentés ; 38/59 non développés ; 0/59 validé en production.**
- [GitHub Actions 39115224459](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39115224459) : **334 tests automatisés réussis, 0 échec** sur le commit `0f0a91babe7a728d96a620900368aed1be597aa6`. Les tests GitHub ne remplacent pas une sauvegarde restaurée, une vérification réelle multi-comptes, ni des essais iPhone/Android/PC.
- **moderation_audit** : `cmd-native-audit-log.js`, `server.js` et `cmd-server-manager.js` : registre des changements de salons, rôles, permissions avec utilisateur authentifié, heure et chaîne SHA-256 (preuve limitée). Panneau Logs du serveur réservé aux administrateurs, pagination. Tests `native-audit-log.test.cjs`. Les autres événements de modération et la rétention restent à terminer.
- **account_export_package** : `cmd-account-export.js`, `server.js` et `settings-ui.js` : téléchargement JSON de données propres au compte, par action volontaire, avec requêtes SQL liées à l'utilisateur, colonnes autorisées et sections plafonnées à 500 éléments. Tests `account-export.test.cjs`. Export **partiel**, sans fichiers médias, achats ou archive complète ; ne pas présenter comme une réponse RGPD complète.
- **automod_engine** : un autre lot de modifications a ajouté des règles natives activables par le propriétaire, avec tests d'API et contrôle avant enregistrement. Le contrôle de production, les exemptions et la modération avancée restent nécessaires ; la fonction demeure désactivée par défaut.
- Sauvegardes Git : `cmd-sphere/backup-before-audit-log-20261018` et `cmd-sphere/backup-before-account-export-20261018`. Branche modifiée : `cmd-sphere/finition-20261018`.
- Aucun déploiement Railway, migration sur la vraie base, suppression de données, ni paiement exécuté dans ces lots. Les statuts `enabled` et `verified` ne changent pas.

Les sections plus bas conservent les états historiques antérieurs.

## Reprise du 18 octobre 2026 — fonctionnalités communauté (vérifié sur GitHub)

- **18/59** contrats disposent d'une implémentation partielle et de tests ou d'un raccordement de code : **41/59** restent des contrats à développer. **0/59 validé en production**. Aucun module ne doit être décrit comme pleinement fini avant tests de production, permissions réelles, iPhone/Android/PC et sauvegarde restaurable.
- [GitHub Actions 39114303281](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39114303281) : **317/317 tests réussis, 0 échec**, 13 tâches de validation réussies, sur le commit `c847e1bb3764d6561befc397a80c41910b71e0c5`.
- **community_insights** : `cmd-community-insights.js` et `cmd-server-manager.js` affichent des agrégats des membres, salons, messages et inscriptions sur 7/30 jours aux admins autorisés. Suppression des comptes de membres actifs si moins de cinq ; aucune nouvelle donnée de suivi, aucune analyse des MP, aucune information nominative. Tests `native-community-insights.test.cjs`.
- **community_discovery** : `cmd-community-discovery.js` et `cmd-server-manager.js` fournissent un annuaire consultable depuis le panneau Communauté, sans code d'invitation ni identité des membres. L'inscription du serveur nécessite à la fois `is_public=true` et un accord séparé du propriétaire via `discovery_opt_in=true`; valeur par défaut FALSE. Quand le propriétaire rend le serveur privé, la publication est également désactivée. Tests `native-community-discovery.test.cjs`. L'annuaire reste **partiel** : modération des fiches, tags, langues et parcours de demande d'adhésion non livrés.
- Nouvelle modification de schéma **additive seulement** (`discovery_opt_in` et index partiel), pas de migration appliquée en production pendant cette intervention.
- Sauvegarde du code de départ sur `cmd-sphere/backup-before-community-20261018` ; tous les changements sur `cmd-sphere/finition-20261018`. Aucun contenu existant, compte, salon, décoration ou serveur supprimé. Aucun paiement activé et aucun déploiement Railway effectué.

Les compteurs historiques plus bas décrivent des états antérieurs et ne remplacent pas cet état récent.

## État confirmé — suite des installations (18 octobre 2026, 10:49 Paris)

- **16/59 contrats avec code d'application partiel**, **43/59 encore préparatoires**, **0/59 validé en production**. Ne pas confondre code installé, fonction testée et déploiement live.
- GitHub Actions [39112889245](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39112889245) : **305 tests réussis sur 305, aucun échec**, incluant recherche historique et pièces jointes, langue TTS locale, isolation compte, sécurité, profils, salons médias et forums. Cette preuve reste une CI avec doubles, pas un test de déploiement Railway.
- Recherche historique : `cmd-message-history-search.js` et `cmd-chat-history-ui.js` permettent filtres auteur, date, présence ou absence de pièces jointes dans les salons serveur autorisés (y compris médias). Les recherches MP/groupe ne proposent pas de filtre fichier inexistant dans leur schéma. `tests/history-attachment-filter.test.cjs` et `tests/history-attachment-ui.test.cjs` protègent le périmètre.
- TTS : `cmd-social-message-actions.js` ajoute un sélecteur de langue local avec volume, arrêt et consentement explicite ; `tests/message-tts.test.cjs` vérifie le fonctionnement. La commande `/tts` et les appareils réels ne sont pas encore validés.
- Fonds synchronisés : sauvegarde propre au compte, portée générale ou serveur, déjà dans `cmd-personal-backgrounds.js` et `server.js`; marquée partielle, notamment parce que le chiffrement au repos et la restauration multi-appareils n'ont pas été prouvés.
- Fils de forum : code d'archivage et verrouillage préparé sur la même branche, tests CI verts ; non validé en production.
- Branche de travail : `cmd-sphere/finition-20261018`. Sauvegarde Git du début du lot : `cmd-sphere/backup-before-history-20261018`.
- **Aucun déploiement, migration ou paiement exécuté dans ce lot** ; conserver l'exigence d'une sauvegarde PostgreSQL restaurable et de validations multi-utilisateurs avant mise en production.

La section ci-dessous conserve la photographie historique antérieure ; ne pas utiliser ses anciens compteurs comme chiffres actuels.

## Lot de préinstallations GitHub — 18 octobre 2026 (état actuel du registre)

- **23/59 fonctionnalités partiellement codées ; 36/59 encore préparatoires ; 0/59 validée sur Railway en production.**
- AutoMod natif : règles de mots interdits par serveur avec activation volontaire, API propriétaire, intégration sur le chemin d’envoi des messages natifs, interface et tests. Pas encore une modération complète des pièces jointes, edits, transferts ou raids ; désactivé par défaut.
- Export de données personnelles : export JSON partiel limité aux données du compte authentifié, sans mots de passe ou hash de connexion ; export ZIP exhaustif et tous les fichiers restent à réaliser.
- Paramètres vocaux natifs : définition du débit demandé (32–128 kbit/s) et de la capacité prévue (0–99), avec configuration propriétaire/permission Gérer les salons, sans enforcement réel WebRTC.
- Salon AFK : sélection du salon et délai d'inactivité enregistrés par propriétaire ; **aucun déplacement automatique ni activation des microphones** à ce stade.
- Journal de modération natif : modifications des rôles et salons, historique paginé, contrôle d'administration, chaîne SHA256, sans garantie de résistance à un administrateur de la base ou archivage externe.
- Fichiers : `cmd-native-automod.js`, `cmd-account-export.js`, `cmd-native-voice-config.js`, `cmd-native-afk-config.js`, `cmd-native-audit-log.js`, interfaces `cmd-server-manager.js` et `settings-ui.js` et tests associés.
- Aucune migration réalisée sur la production Railway au cours de ce lot ; aucun paiement ni fournisseur payant activé. Vérifier une sauvegarde PostgreSQL restaurable avant tout déploiement de la branche de finition.
- GitHub Actions : validation automatisée requise à chaque nouveau commit. Le pourcentage ci-dessus est celui du registre de 59 contrats, pas de la totalité de CMD Sphere.

## Mise à jour vérifiable — contrats Discord, 18 octobre 2026

Les chiffres ci-dessous sont limités au **registre de 59 contrats**, pas à toute l'application.

- **5/59 codés** dans la branche de finition avec tests, mais **non activés / non vérifiés en production**.
- **54/59 toujours déclarés contrats préparatoires** (code d'application complet non confirmé).
- **0/59 validé en production** : il reste donc 59 contrats à clôturer réellement.
- GitHub Actions `39107036489` : **249 tests automatisés réussis, 0 échec** sur le commit `ff1e74fe829b21c8b20d1177a5924c448b50d965`.
- Pas de migration exécutée ni de déploiement vers Railway pendant cette mise à jour. Le déploiement nécessite la sauvegarde restaurable et les tests sur comptes séparés.
- Les statuts `enabled` et `verified` restent `false` et ne doivent pas être modifiés sans preuves.

| Contrat | Implémentation ajoutée | Tests automatisés | Production | État |
|---|---|---|---|---|
| channel_slowmode | `cmd-native-slowmode.js`, `server.js`, `cmd-server-manager.js` : délais par salon, contrôle PostgreSQL atomique, permissions | `native-slowmode.test.cjs` | Non déployé | 🟡 |
| server_template_cloning | `server.js` : nouveaux serveurs modèles, copie de salons/rôles avec identifiants indépendants | `native-templates-contract.test.cjs` et GitHub Actions validate-templates | Non déployé | 🟡 |
| user_block_controls | `cmd-social-privacy.js`, `cmd-social-privacy-ui.js`, `server.js` : blocage/déblocage, refus d'interaction privée, groupes, recherche et notifications | `social-privacy.test.cjs`, `social-privacy-ui.test.cjs` | Non déployé | 🟡 |
| friend_request_privacy | mêmes fichiers : paramètres propres au compte, serveurs communs, limitation des demandes répétées | `social-privacy.test.cjs`, `social-privacy-ui.test.cjs` | Non déployé | 🟡 |
| per_server_dm_privacy | `cmd-dm-guild-privacy.js`, `server.js`, `cmd-social-privacy-ui.js` : préférences de MP par serveur, validation d'appartenance, application aux MP et groupes | `dm-guild-privacy.test.cjs`, `social-privacy-ui.test.cjs` | Non déployé | 🟡 |

**Garanties** : aucune suppression de comptes, messages, salons, avatars, achats ou contenus permanents ; aucun paiement lancé ; pas de modification des autres produits CMD. Les nouvelles tables sont créées via `CREATE TABLE IF NOT EXISTS` et les réglages existants restent en place. Les tests de doubles de base ne constituent pas une preuve de restauration PostgreSQL ni un test réel multi-appareils.

## Production constatée

- Projet radiant-nature, environnement production : d4e965d4-5077-4f36-b05e-5810fab77759.
- Service cmd-discord-mcp : 020e5b4a-7ad2-4525-b195-36e56f37e851.
- Déploiement 4c496a1c-bff1-4f04-ac4f-95c0fe3b5b65 : SUCCESS, une réplique en ligne.
- Commit déployé : dd343a9286e202dd038f432279451f35c0c5c033, branche cmd-sphere/boutique-4k-refonte-20261016.
- GET /health : HTTP 200 ; HEAD /health retourne 404. Le GET ne prouve pas le fonctionnement des comptes ou des appels.
- PostgreSQL : en ligne, volume persistant de 5000 MB. Aucune sauvegarde ou restauration vérifiée dans cette intervention.
- Écart main confirmé : 708 commits d’avance, 22 de retard. Les changements main touchant Sphere portent sur invitations/Studio ; la normalisation des invitations est déjà dans la branche active. Aucune fusion automatique réalisée.
- Branche de travail créée à partir du commit exact de production : cmd-sphere/finition-20261018.

## Blocage de livraison

L’accès OAuth Railway expose les noms des variables mais masque leurs valeurs. Aucune commande distante, connexion PostgreSQL ou opération de sauvegarde n’est disponible avec les outils connectés actuels. Aucun proxy public n’a été ajouté. Une session Railway CLI authentifiée permettant SSH/pg_dump, ou une sauvegarde contrôlée par l’administrateur et restaurée dans une base isolée, est nécessaire pour respecter la phase 0.

La production n’a pas été modifiée. Pas de migration, pas de nouveau service, pas de paiement, pas de compte de test créé en production. La restauration et les tests multi-appareils réels restent à faire. Les correctifs ci-dessous sont prêts pour revue, pas déclarés fonctionnels en production.

## Résultats de tests

| Version | Tests | Réussis | Échecs |
|---|---:|---:|---:|
| source_before | 194 | 179 | 15 |
| runtime_before | 194 | 180 | 14 |
| source_after | 201 | 187 | 14 |
| runtime_after | 201 | 188 | 13 |

Source : npm ci --ignore-scripts puis npm test. Runtime : copie isolée, npm run postinstall, node patch-runtime.cjs, npm test. Les tests existants génèrent certains assets : ces différences automatiques ont été exclues du correctif. Les 7 nouveaux tests et les 8 tests d’invitations passent.

Les échecs ne sont pas tous des bugs produit confirmés : deux tests attendent encore une écriture vers Discord alors que l’application gère les serveurs localement ; plusieurs doubles DOM n’exposent pas les méthodes attendues. Ils restent signalés, sans suppression des tests ni déclaration de conformité.

Échecs runtime restants :
- Failed Discord write never silently mutates the local copy
- Failed refresh after a successful Discord write never duplicates the action locally
- Recovered or edited content refreshes even when the message count stays the same
- premium avatar ornament stays centered with the smaller profile photo
- 3D scene config retains 3D mode, model choice and original profile ownership
- CMD Sphere only offers the 68 approved complete avatars
- CMD Sphere dressing, scene and pet/vehicle switches remain clickable
- CMD Sphere renders and selects each of the 68 distinct avatars, including last
- CMD Sphere catalogue offers every pet, vehicle, home and scene as an independent selectable option
- Simplified phone video editor maps real actions to settings and storytelling
- iPhone HEIC photo becomes JPEG, preserving full image aspect
- Hosting panel has an independent direct URL and explicit account-link errors
- Apple mobile only accepts compatible MP3 catalog and verifies actual playback

## Lot de correctifs préparé

| ID | Domaine | Fonction | État initial | Travail effectué | Fichiers | API / SQL | Test | Production | État final | Preuve |
|---|---|---|---|---|---|---|---|---|---|---|
| SEC-ORIGIN | Sécurité | Contrôle d’origine des mutations API | Partiel | Contrôle avant les gestionnaires API | cmd-request-safety.js; server.js | API /api/* ; aucune migration | request-safety.test.cjs : réussi | Non déployé | 🟡 | Correctif local 65922cd ; tests avec doubles de base, pas validation multi-utilisateur réelle |
| SEC-BODY | Sécurité | Limite de lecture JSON des messages | Défectueux | Lecture bornée, y compris flux sans Content-Length ; erreurs 400/413 | cmd-request-safety.js; server.js | Messages salons, MP, groupes ; aucune migration | request-safety.test.cjs : réussi | Non déployé | 🟡 | Correctif local 65922cd ; tests avec doubles de base, pas validation multi-utilisateur réelle |
| AUTH-COOKIE | Comptes | Tolérance aux cookies malformés | Défectueux | Ignore une valeur malformée sans casser les autres cookies | server.js | Authentification existante ; aucune migration | request-safety.test.cjs : réussi | Non déployé | 🟡 | Correctif local 65922cd ; tests avec doubles de base, pas validation multi-utilisateur réelle |
| INV-EXPIRY | Invitations | Compatibilité des durées 3/30 jours | Partiel | Accepte les anciens et nouveaux formats | cmd-native-invites.js | API invitations existante ; aucune migration | native-invites.test.cjs : 8 réussis | Non déployé | 🟡 | Correctif local 65922cd ; tests avec doubles de base, pas validation multi-utilisateur réelle |
| XP-CHESTS | Récompenses | Coffres disponibles après les 100 premiers | Défectueux | Sélection des 100 prochains coffres non réclamés, jusqu’au niveau 10000 | cmd-levels.js | Tables existantes ; aucune nouvelle migration | level-chests.test.cjs : 2 réussis | Non déployé | 🟡 | Correctif local 65922cd ; tests avec doubles de base, pas validation multi-utilisateur réelle |

## Dernier cycle GitHub Actions — lot des contrats

- [Exécution 39106018069](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39106018069) : suite complète **224/224 tests réussis**, y compris les contrats existants et les nouveaux tests.
- `channel_slowmode` : backend, interface, migration additive et tests sur doubles PostgreSQL ; pas de test multi-utilisateurs réel sur PostgreSQL de production.
- `server_template_cloning` : modèles, API et tests des identifiants uniques ; pas de test de création réelle de serveur en production.
- Aucun changement sur la base de données de production n'a été réalisé. Sauvegarde/restauration toujours à valider avant tout déploiement.

## 59 contrats — compteurs calculés

✅ 0 ; 🟡 2 ; 🟠 57. Deux contrats disposent d'une implémentation dans la branche de finition, mais aucune validation de production. Les fonctions ❌ hors périmètre 59 restent à inventorier.

| ID | Domaine | Fonction | État initial | Travail effectué | Fichiers | API / SQL | Test | Production | État final | Preuve |
|---|---|---|---|---|---|---|---|---|---|---|
| voice_turn_relay | voice | Serveurs relais TURN | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | turn_secure_configuration_and_mobile_nat_tests : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| stage_channels | voice | Salons de conférence Stage | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | speaker_queue_moderator_permissions_audience_roles : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| soundboard | voice | Bibliothèque de sons | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | copyright_content_limits_voice_mix_mute : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| game_overlay | voice | Overlay natif dans les jeux | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | signed_desktop_client_and_per_game_permissions : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| rich_presence | voice | Détection jeux et statut enrichi | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | opt_in_expiry_private_visibility_multi_device : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| history_search_filters | messaging | Recherche avancée intégrale | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | db_authorization_at_channel_thread_dm_group_boundaries : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| large_file_upload | messaging | Téléversement volumineux fiable | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | storage_quota_antivirus_multipart_resume_retention : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| membership_onboarding | community | Accueil automatique avec choix de rôles | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | roles_scoped_to_guild_minimum_permissions_and_abuse : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| rules_screening | community | Acceptation du règlement | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | versioned_terms_no_chat_access_until_acceptance : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| automod_engine | community | AutoMod anti-spam et mots interdits | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | server_side_enforcement_safe_appeal_moderation : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| raid_protection | community | Protection contre les raids | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | rate_limit_suspicious_joins_legitimate_user_appeals : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| moderation_audit | community | Journal des actions d'administration | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | tamper_evident_records_owner_visibility_retention : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| followed_announcements | community | Annonces relayées vers d'autres serveurs | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | follow_consent_no_private_data_leaks_revoke : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| community_discovery | community | Annuaire public des serveurs | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | opt_in_moderation_search_privacy_and_age_restrictions : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| community_insights | community | Statistiques de communauté | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | privacy_threshold_no_unconsented_tracking : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| slash_commands | developer | Commandes slash pour applications | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | verified_bot_scopes_per_server_rate_limit : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| context_menus | developer | Commandes contextuelles messages et utilisateurs | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | target_permission_checks_and_audited_actions : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| app_directory | developer | Répertoire public des applications | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | application_review_minimum_scopes_trust : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| embedded_activities | developer | Activités et jeux intégrés | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | sandboxed_origins_csp_token_scopes_and_presence : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| bot_components | developer | Boutons listes et formulaires bots | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | signed_callbacks_csrf_action_scope_and_timeouts : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| app_monetization | developer | Monétisation des applications | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | merchant_compliance_chargebacks_tax_refunds : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| family_center | accounts | Sécurité familiale et protections jeunes | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | consent_age_safety_encrypted_access_control : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| cosmetic_gifts | accounts | Cadeaux de décorations entre membres | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | inventory_atomicity_no_duplicates_no_unapproved_payments : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| cloud_backgrounds | accounts | Synchronisation des fonds personnalisés | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | private_file_encryption_quota_device_sync : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| account_passkeys | security | Connexion par Passkey | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | web_authn_origin_rp_id_attestation_challenge_and_rollback : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| account_mfa_recovery | security | Authentification multifacteur et récupération | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | totp_backup_codes_rotation_rate_limits_secure_recovery : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| sensitive_media_blur | security | Masquage des médias sensibles | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | privacy_aware_optin_content_classification_no_media_leak : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| abuse_reports | security | Signalement d'abus et de messages | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | report_review_moderator_separation_prevent_retaliation_and_spam : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| e2ee_key_verification | security | Vérification des clés des appels chiffrés | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | audited_crypto_protocol_identity_safety_number_key_rotation : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| stream_clips | media | Clips des diffusions et streams | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | explicit_consent_retention_storage_and_copyright : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| call_audio_video_effects | media | Filtres audio et fonds vidéo | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | permission_microphone_camera_local_processing_and_mobile_fallback : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| voice_channel_text | media | Conversation textuelle dans les salons vocaux | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | effective_channel_permissions_message_retention_and_access : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| voice_messages | media | Messages vocaux en MP et groupes | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | upload_quota_mime_sanitization_recipient_permissions : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| message_forwarding | productivity | Transfert de messages vers un autre salon | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | read_source_and_write_destination_permission_at_send_time : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| message_reminders | productivity | Rappels sur les messages favoris | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | ownership_scheduling_timezone_optin_and_cancel : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| forum_advanced_tags_gallery | productivity | Tags et galerie avancés des forums | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | scoped_tags_required_tags_category_and_moderation : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| streamer_mode | privacy | Mode Streamer protégeant les informations | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | — | mask_user_invites_discord_links_private_info_screen_sharing : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| user_block_controls | privacy | Bloquer et débloquer un membre | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | GET/POST /api/account/blocked | block_enforced_in_dm_mentions_friend_search_notifications : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| dm_requests_spam_inbox | privacy | Boîte de demandes de MP et spam | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | GET /api/dm/requests | unknown_sender_quarantine_opt_in_antispam_and_guardians : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| per_server_dm_privacy | privacy | Autoriser ou interdire les MP selon le serveur | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/account/privacy/dm-guilds | no_bypass_via_groups_friend_restrictions : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| friend_request_privacy | privacy | Limiter qui peut envoyer une demande d’ami | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/account/privacy/friend-requests | trusted_social_graph_ratelimit_privacy_defaults : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| channel_slowmode | servers | Mode lent par salon avec permissions | Contrat préparatoire | Moteur PostgreSQL atomique, API GET/PATCH et réglage natif dans les salons ; comptes distincts et refus HTTP 429 testés en simulation | cmd-native-slowmode.js ; server.js ; cmd-server-manager.js | cmd_native_channels.slowmode_seconds ; cmd_native_slowmode_state ; PATCH /api/native/slowmode | native-slowmode.test.cjs : 8/8 + suite générale CI 39106018069 | Non déployé | 🟡 | 6bd43dd, 637f2e0, f41b330 ; [tests GitHub Actions](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39106018069) |
| server_verification_levels | servers | Niveaux de vérification du serveur | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/native/security/verification | verified_email_account_age_join_delay_no_lockout : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| age_restricted_spaces | servers | Salons et serveurs avec accès restreint par âge | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/native/safety/age-restrictions | legal_age_assurance_safe_ios_access_consent_no_inferred_age : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| server_template_cloning | servers | Modèles de serveur avec salons et rôles | Contrat préparatoire | Six modèles avec salons et rôles à identifiants uniques ; aucun secret importé ; API GET/POST, connexion requise | server.js | GET/POST /api/native/templates ; cmd_native_guilds/channels/roles | native-templates-contract.test.cjs : 3/3 + suite générale CI 39106018069 | Non déployé | 🟡 | 90da1e0, 19893f2 ; [tests GitHub Actions](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39106018069) |
| server_media_channels | servers | Salons médias et galerie de publications | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | POST /api/native/media-channels | file_safety_private_permissions_tagging_and_storage_quota : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| threads_auto_archive_lock | servers | Archivage automatique, verrouillage et restauration des fils | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/native/threads/lifecycle | thread_permissions_retention_job_recovery_and_parent_inheritance : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| voice_afk_lobby | voice | Salon AFK et passage automatique inactif | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/voice/guilds/afk | afk_cannot_leak_open_microphone_and_user_choice : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| voice_priority_speaker | voice | Voix prioritaire accordée par rôle | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/voice/priority | audio_focus_only_when_authorized_and_device_supported : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| voice_per_member_volume | voice | Volume individuel des participants en appel | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/voice/user-volume | client_only_gain_dont_modify_senders_for_others : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| voice_bitrate_user_limits | voice | Débit et limite des utilisateurs par salon vocal | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/voice/channels/config | bitrate_quota_rate_control_and_disconnect_safety : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| voice_region_override | voice | Région des appels et latence des relais | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/voice/channels/region | secure_turn_routing_region_consent_latency_no_paid_services : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| account_export_package | accounts | Exporter toutes ses données personnelles | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | POST /api/account/export | gdpr_authenticated_async_zip_job_signed_expiry_and_privacy : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| account_deletion_recovery | accounts | Suppression du compte avec période de récupération | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | POST /api/account/deletion | verify_identity_owner_transfer_cancel_period_billing_and_legal_retention : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| device_session_management | accounts | Voir et révoquer les sessions des appareils | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | DELETE /api/account/sessions/{id} | hashed_refresh_session_list_revoke_other_devices_and_notify : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| user_installed_applications | applications | Applications installées sur compte utilisateur | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | POST /api/developer/install/user | oauth_consent_user_scopes_dm_context_and_permissions : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| app_command_autocomplete | applications | Suggestions automatiques pour les commandes de bots | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | POST /api/interactions/autocomplete | signed_interactions_rate_limits_context_scoped_respond : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| message_text_to_speech | accessibility | Lecture vocale des messages et commande /tts | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | POST /api/messages/tts | opt_in_browser_speech_permission_throttle_volume_and_mute : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| server_subscription_tiers | monetization | Abonnements et accès premium par serveur | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | POST /api/native/guilds/subscriptions | explicit_payment_authorization_refunds_cancel_and_tax_compliance : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |

## Suite prioritaire

1. Débloquer sauvegarde et restauration isolée ; conserver le commit de retour arrière ci-dessus.
2. Vérifier les sessions/révocations et la persistance après installation PWA ; ne pas prendre la présence du contrat pour une implémentation.
3. Réconcilier les tests obsolètes avec l’indépendance de CMD Sphere et corriger les vrais défauts de profils/Studio.
4. Exécuter les scénarios propriétaire/admin/modérateur/membre/extérieur sur PostgreSQL isolé, puis en production avec comptes dédiés.
5. Déployer uniquement le lot vérifié après la phase 0, contrôler GET /health, comptes, messages, invitations, soldes ; vérifier les API et les écrans réellement utilisés.
6. Continuer le périmètre complet : comptes, serveurs, permissions, invitations, messagerie, appels, profils, fonds, catalogue, boutique, monnaie, XP, saisons, Studio, intégrations, emojis, développeurs, notifications, sécurité, stockage, interface, PWA, langues.

## Maintenance du registre

Exécuter node scripts/generate-completion-audit.mjs depuis cmd-discord-mcp après mise à jour des preuves. Les compteurs des contrats proviennent de CMD_PARITY_59 ; aucune case verified ne doit être modifiée sans preuve de production. Les résultats de ce lot sont figés dans audit/2026-10-18-tests.json.

## Lot — rappels de messages natifs (18 octobre 2026)

Le rappel de messages est désormais **développé dans la branche** mais **non déployé et non vérifié en production**. Aucun compte, salon, inventaire ou message n'a été supprimé.

| ID | Fonction | API / SQL | Interface | Test | Production | État |
|---|---|---|---|---|---|---|
| `message_reminders` | Programmation volontaire et annulation d'un rappel natif | `cmd-message-reminders.js` : table additive PostgreSQL, vérification des salons et messages, calendrier, annulation propriétaire, traitement périodique | `cmd-message-reminders-ui.js` + menu existant dans `cmd-social-message-actions.js` | `tests/message-reminders-ui.test.cjs` : 4 réussis, suite générale **253/253 réussis** | Pas de restauration PostgreSQL démontrée, pas de test push utilisateur réel | 🟡 Développé, non activé / non vérifié |

**Preuve CI** : [GitHub Actions 39107460068](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39107460068) — aucune erreur dans la suite complète. Le déploiement Railway reste sur sa branche antérieure ; ne pas interpréter la réussite CI comme un fonctionnement utilisateur en production.

**Registre des 59 contrats** : 7 `implemented=true`, 52 contrats non implémentés, 0 `enabled=true`, 0 `verified=true` d'après les définitions de cette branche. Cette progression signifie uniquement que les sept implémentations ont du code (pas une homologation en production). Aucun pourcentage à 100 % n'est revendiqué.


## Lot transfert de messages — code non déployé
- Branche : `cmd-sphere/finition-20261018`.
- Contrat : `message_forwarding`. Code/API et interface ajoutés, **non activés ni vérifiés en production**. Aucune suppression de message et aucune mutation de données existantes.
- API authentifiée `POST /api/messages/forward`, validation de l'appartenance au serveur source et destination, des droits de lecture/envoi et du message source. Refus prudent des salons avec surcharges de permissions ; transfert du texte seulement, sans répliquer les pièces jointes ni propager @everyone/@here.
- Interface : `cmd-message-forward-ui.js`, raccordée au menu d'actions secondaire des messages natifs.
- Fichiers : `server.js`, `cmd-social-message-actions.js`, `cmd-message-forward-ui.js`, `tests/native-message-forward.test.cjs`, `cmd-parity-extra-productivity.js`.
- Preuve CI : [GitHub Actions #39107940968](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39107940968) : **257 tests réussis, 0 échec**, dont 4 scénarios spécifiques au transfert.
- État : 🟡 code installé sur GitHub, tests locaux/CI réussis, déploiement Railway non entrepris. Sauvegarde/rétablissement PostgreSQL de production non validés. Ne pas afficher ✅.


## Lot masquage volontaire des médias — code non déployé
- API `GET/PATCH /api/account/sensitive-media` authentifiée et indépendante par compte ; table additive `cmd_sensitive_media_preferences` sans suppression de médias, compte ou message.
- Interface `cmd-sensitive-media-ui.js` chargée sur les salons : option manuelle dans le menu secondaire des messages pour flouter les photos et vidéos, puis révélation individuelle. DÉSACTIVÉ par défaut pour préserver le rendu actuel des utilisateurs.
- **Limite explicite :** il n'existe pas de classification automatique des médias sensibles. Le réglage floute toutes les pièces jointes photo/vidéo quand il est activé. Le contrat complet `sensitive_media_blur` reste **partiel** et non déclaré fonctionnel à 100 %.
- Fichiers : `cmd-sensitive-media.js`, `cmd-sensitive-media-ui.js`, `server.js`, `cmd-social-message-actions.js`, `tests/sensitive-media.test.cjs`.
- CI : [GitHub Actions #39108417269](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39108417269) : **265 tests réussis, zéro échec**, incluant les 4 tests du masquage opt-in.
- Production Railway : non déployé, sauvegarde/restauration non encore vérifiée. Aucun paiement ou service externe créé.

## Lot de développement — tags et affichage galerie des forums

| ID | Domaine | Fonction | État initial | Travail effectué | Fichiers | API / SQL | Test | Production | État final | Preuve |
|---|---|---|---|---|---|---|---|---|---|---|
| PARITY-FORUM-TAGS | Forums | Tags et option de galerie par forum CMD natif | 🟠 Contrat préparatoire | Table additive et API GET/PATCH vérifiant le membre / permission `manageChannels`; écran d'édition des tags et choix du mode galerie dans les paramètres des salons | `cmd-forum-tags.js`, `server.js`, `cmd-server-manager.js`, `tests/native-forum-tags.test.cjs` | `cmd_native_forum_settings`, `/api/forums/tags` ; aucune table historique effacée | 5 scénarios ajoutés et suite globale GitHub Actions **270/270 réussie** | Non déployé, PostgreSQL réel et rendu de galerie des publications à vérifier | 🟡 | Commits `778033c`, `1a90283`, `6bd18e0`, `6bce030` ; [CI 39109946907](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39109946907) |

La capacité complète « tags et galerie avancés des forums » n'est **pas** déclarée vérifiée : l'attribution des tags aux publications, le rendu effectif en galerie et les scénarios multi-comptes sur PostgreSQL réel restent à développer ou à valider. Les registres restent honnêtement à `implemented: false`, `enabled: false`, `verified: false` pour ce contrat jusqu'à une preuve plus complète. Ne pas activer de déploiement avec migration sans sauvegarde/restauration vérifiée.


## Lot — vérification d'accès et salons médias (18 octobre 2026)

| ID | Domaine | Fonction | État initial | Travail effectué | Fichiers | API / SQL | Test | Production | État final | Preuve |
|---|---|---|---|---|---|---|---|---|---|---|
| PARITY-VERIFICATION-LEVELS | Sécurité serveurs | Validation des nouveaux membres sur invitation | 🟠 Contrat préinstallé | Paliers aucun, e-mail vérifié, compte vérifié de 5 minutes ou 24 heures ; refus du nouvel entrant avant création de membre, préservation des membres existants ; sélection réservée au propriétaire | `cmd-server-verification.js`, `cmd-native-invites.js`, `server.js`, `cmd-server-manager.js`, `tests/server-verification.test.cjs` | Colonne additive `cmd_native_guilds.verification_level`, API `GET/PATCH /api/native/verification`; pas de suppression des comptes | 11 nouveaux tests spécifiques réussis, suite globale 288/288 | Non déployé ; essais avec e-mail réellement vérifié et comptes multi-utilisateurs non effectués | 🟡 | Commits `30a9afd`, `b5493ff`, `be19c1f`, `793c928` ; [CI 39111050003](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39111050003) |
| PARITY-MEDIA-CHANNELS | Médias | Salons médias natifs et affichage galerie | 🟠 Contrat préinstallé | Ajout type `media` dans création/édition/navigation, contrôle d'une photo ou vidéo réelle côté API avant message, affichage en grille utilisant les pièces jointes persistantes existantes | `cmd-native-media-channels.js`, `server.js`, `cmd-server-manager.js`, `tests/native-media-channels.test.cjs` | Messages existants de `cmd_native_channel_messages` ; pas de changement aux identifiants médias ; aucune migration destructive | 7 nouveaux tests spécifiques réussis, suite globale 288/288 | Non déployé ; vérification réelle du rendu, sécurité des webhooks et quotas médias restant à faire | 🟡 | Commits `7be284c`, `caae6db`, `ac4889a`, `d9417b1` ; [CI 39111050003](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39111050003) |

**Clôture de ce lot :** GitHub Actions 39111050003 a validé neuf contrôles CI indépendants et 288 tests sur 288 dans la suite générale. Les capacités nouvelles sont **développées** mais pas activées/vérifiées en production. Les registres correspondants conservent `enabled: false`, `verified: false`, et les autres contrats non traités restent inchangés. Aucun déploiement Railway, achat, facturation, réinitialisation de base, migration destructive ou suppression de ressource existante.

**Blocage restant :** avant toute activation Railway, obtenir une sauvegarde PostgreSQL restaurée et contrôlée sur base isolée, puis tester avec plusieurs comptes CMD et sur iPhone, Android et PC. Pour les salons médias, la gestion avancée des tags, les quotas à l'échelle des utilisateurs et le stockage externe durable restent à approfondir.

## Lot Forums — publications taguées et galerie filtrable (18 octobre 2026)

- Le panneau des salons forums conserve l'édition des tags et de l'affichage galerie.
- Ajout d'une validation à chaque envoi : les tags d'une publication doivent appartenir à la liste autorisée de son forum, limitée à 5 tags, sans doublons. Une publication sans tag reste possible. Les salons hors forum refusent ces tags.
- Le compositeur CMD natif propose les tags réellement autorisés ; les messages affichent leurs badges avec échappement HTML ; le filtrage par tag est propre au salon et se remet à zéro lors du changement de canal. Les anciens messages ne sont ni altérés ni supprimés.
- Commits : `f581dc6`, `d6d5921`, `f9f4852`, `1beeec7`, `f634320`, `eb24069`, `c39ebc8`.
- Preuve de régression : [GitHub Actions 39112027209](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39112027209), **291 tests réussis, 0 échec** (9 groupes de validation verts).
- État contractuel `forum_advanced_tags_gallery` : `implemented: true`, `enabled: false`, `verified: false`. L'intégration sur GitHub est testée mais ni la base PostgreSQL réelle ni le rendu sur iPhone/Android/PC ne sont certifiés en production. Aucune suppression ni activation de paiement.


## Mise à jour — Forums et inventaire réel des 59 contrats (18 octobre 2026)

- Registre calculé depuis les 16 fichiers de capacités actuels : **59 contrats uniques**, **14 marqués `implemented:true`**, **45 encore `implemented:false`**. Les 14 correspondent à du code préparé/testé, **0 activé et certifié en production**. Ces compteurs n'impliquent pas que 14 fonctions soient pleinement disponibles sur le site public.
- **Forums (tags et galerie)** : vérification serveur des tags autorisés sur chaque publication, boutons de sélection et filtre, badges échappés, galerie par forum, aucun effacement des messages. `cmd-forum-tags.js`, `server.js`, `tests/native-forum-tags.test.cjs` ; `forum_advanced_tags_gallery` : `implemented:true`, `enabled:false`, `verified:false`.
- **Archivage/verrouillage des fils de forum** : nouvelle table additive `cmd_native_forum_thread_state`, archivage automatique désactivé par défaut, API authentifiée `GET/PATCH /api/native/forum-thread`, paramètres accessibles dans le menu des messages natifs, restriction des réponses dans un fil archivé ou verrouillé, possibilité de réouverture autorisée, aucun message historique supprimé. `cmd-forum-thread-controls.js`, `server.js`, `cmd-social-message-actions.js`, `tests/native-forum-thread-controls.test.cjs` ; `threads_auto_archive_lock` : `implemented:true`, `enabled:false`, `verified:false`.
- GitHub Actions [39112417210](https://github.com/znationcmd/extinction-plus-plus/actions/runs/39112417210) : **302/302 tests réussis**, les 10 groupes de validation ont réussi. Les contrôles couvrent la logique, avec des doubles de bases pour les nouveaux modules ; ce n'est pas une preuve de fonctionnement avec plusieurs comptes et navigateurs réels.
- Production inchangée : **aucun déploiement Railway ni migration exécutée** pour ce lot. La sauvegarde PostgreSQL vérifiée par restauration reste une condition de mise en production ; aucune activation payante ni destruction de données.

