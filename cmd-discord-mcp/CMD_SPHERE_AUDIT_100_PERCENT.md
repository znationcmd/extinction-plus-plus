# CMD Sphere — suivi de finition, 18 octobre 2026

Mission ouverte. Ce registre initial ne constitue ni un audit exhaustif achevé ni une validation à 100 %.
Le périmètre demandé dépasse les 59 contrats ; les contrôles de chaque écran, fonction sociale et catalogue restent à inventorier individuellement. Aucun pourcentage global n’est calculé.

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

## 59 contrats — compteurs calculés

✅ 0 ; 🟡 0 ; 🟠 59. Aucun contrat clôturé durant ce lot. Le nombre global de fonctions ❌ est indéterminé tant que l’inventaire exhaustif n’est pas terminé. Les 5 corrections partielles ci-dessus ne sont pas ajoutées au décompte des contrats.

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
| channel_slowmode | servers | Mode lent par salon avec permissions | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/native/slowmode | server_enforced_user_cooldown_bypass_role_and_race_test : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| server_verification_levels | servers | Niveaux de vérification du serveur | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/native/security/verification | verified_email_account_age_join_delay_no_lockout : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| age_restricted_spaces | servers | Salons et serveurs avec accès restreint par âge | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | PATCH /api/native/safety/age-restrictions | legal_age_assurance_safe_ios_access_consent_no_inferred_age : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
| server_template_cloning | servers | Modèles de serveur avec salons et rôles | Contrat préparatoire | Inventaire du contrat ; aucune clôture déclarée | cmd-parity-59.js | POST /api/native/templates | clone_with_id_remapping_permissions_sanitized_secrets_and_invites : non exécuté | Non vérifié | 🟠 | Commit source dd343a9286e202dd038f432279451f35c0c5c033 |
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
