# CMD Sphere vs Discord — 24 fonctionnalités à préinstaller
**État :** 16 octobre 2026 · Préinstallation de contrats techniques uniquement · Corrections et raccordements ultérieurs.

Les 24 entrées ci-dessous proviennent des points ❌ du dernier audit. Elles correspondent à **des écarts**, pas à 24 fonctions qui seraient déjà opérationnelles. Leurs modules existent dans GitHub mais ne sont pas branchés sur les routes de production et restent explicitement désactivés. Aucun paiement, collecte de données, serveur TURN ou nouvelle dépendance payante n'est activé.

## Audio, jeux et présence (5)
- [ ] voice_turn_relay — serveur TURN sécurisé pour appels réels
- [ ] stage_channels — scènes vocales et gestion des intervenants
- [ ] soundboard — sons personnalisés en salon vocal
- [ ] game_overlay — overlay natif (nécessite une application PC)
- [ ] rich_presence — statut d'activité et jeux avec consentement

## Messagerie (2)
- [ ] history_search_filters — recherche indexée et filtres côté serveur ; code de recherche stockée préparé séparément dans cmd-message-history-search.js, non raccordé à l'API de production
- [ ] large_file_upload — chargements volumineux par parties, antivirus et quotas

## Serveurs et sécurité (8)
- [ ] membership_onboarding — questions d'accueil et choix des rôles/salons
- [ ] rules_screening — règlement à accepter avant d'écrire
- [ ] automod_engine — AutoMod côté serveur et exemptions
- [ ] raid_protection — limites d'inscriptions, alertes et modération
- [ ] moderation_audit — journal des actions administratives
- [ ] followed_announcements — annonces relayées vers d'autres serveurs
- [ ] community_discovery — annuaire opt-in de serveurs publics
- [ ] community_insights — statistiques agrégées respectueuses de la vie privée

## Bots et applications (6)
- [ ] slash_commands — commandes / avec permissions et arguments
- [ ] context_menus — commandes contextuelles
- [ ] app_directory — annuaire modéré des applications
- [ ] embedded_activities — activités embarquées isolées
- [ ] bot_components — boutons, listes, formulaires des bots
- [ ] app_monetization — monétisation des applications (ne rien facturer automatiquement)

## Comptes et boutique (3)
- [ ] family_center — fonctions de sécurité familiale et consentement
- [ ] cosmetic_gifts — cadeaux de décorations, inventaire et transactions atomiques
- [ ] cloud_backgrounds — synchronisation privée des fonds personnalisés entre appareils

## Contrats et portes de sécurité
Fichiers :
- `cmd-parity-voice.js`
- `cmd-parity-messaging.js`
- `cmd-parity-community.js`
- `cmd-parity-developer.js`
- `cmd-parity-accounts.js`
- `cmd-parity-24.js`
- `tests/cmd-parity-24.test.cjs`

Chaque contrat spécifie un identifiant, les permissions attendues, une route envisagée, des paramètres et une exigence de validation. Les 24 flags sont **implemented=false, enabled=false, verified=false**. La préinstallation ne crée aucune route, table SQL, interface utilisable ou capacité prête en production.

## Suite à réaliser
1. Ajouter les véritables implémentations API et données **une fonctionnalité à la fois** en respectant les permissions existantes et en évitant toute perte de données.
2. Tester isolément avec plusieurs comptes, notamment les utilisateurs non administrateurs et les salons privés.
3. Ajouter les interfaces mobile/PC et les traductions des 11 langues demandées, puis les tests d'accessibilité.
4. N'activer chaque fonction qu'après tests automatiques, revue sécurité et validation Railway.
5. Ne pas ajouter de service payant sans accord explicite. Ne pas écraser les changements de la boutique ni les décorations.

Commande de contrôle lors des prochains travaux : `npm test` depuis `cmd-discord-mcp/`, puis vérification réelle avec deux comptes et sur iPhone.
