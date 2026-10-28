# Index de documentation — CMD / Extinction++

Cette page centralise les guides **sans déplacer les chemins historiques** dont des scripts ou liens externes pourraient encore dépendre.

## Démarrage et exploitation

- [Vue générale](../README.md)
- [Connexions administrateur](../README_ADMIN_CONNECTIONS.md)
- [Exploitation et opérations](../README_OPERATIONS.md)
- [Configuration des modules](../README_MODULES_FONCTIONNEMENT.txt)
- [Guide SaaS DayZ++](../README_SAAS_DAYZPP_COMPLET.txt)
- [Commandes Git historiques](../GITHUB_PUSH_COMMANDES.txt)

## Fonctionnalités

- [Arcade](../README_ARCADE.md)
- [Compagnons](../README_COMPANIONS.md)
- [Explorateur](../README_EXPLORER.md)
- [Ponts avec les jeux](../README_GAME_BRIDGE.md)
- [Serveurs multijeux](../README_MULTIGAME.md)
- [DayZ en direct](../README_LIVE_DAYZ.md)
- [Mods DayZ](../README_DAYZ_MODS.md)
- [PWA et installations](../README_PWA.md)
- [Redémarrages et boutique](../README_RESTART_SHOP.md)

## Historique et suivi

- [Complétion](../README_COMPLETION_MAX.md)
- [Corrections](../README_CORRECTIONS_FR.md)
- [Roadmap](ROADMAP_100_PERCENT.md)
- [Maintenance des dépôts et copies historiques](CMD-REPOSITORY-MAINTENANCE.md)
- [Déploiement Railway bot/tableau de bord](RAILWAY_BOT_DASHBOARD.md)

## Doublons : contrôles, pas suppressions

Exécuter à la racine du dépôt :

```bash
node --test tests/cmd-duplicate-audit.test.mjs
node scripts/cmd-duplicate-audit.mjs
node scripts/cmd-duplicate-audit.mjs --json
```

L'outil lit **uniquement les empreintes des fichiers suivis dans Git** et leurs tailles. Il ne lit pas les sauvegardes, ne supprime aucun fichier et ne modifie aucune branche. Une répétition peut être intentionnelle : plusieurs URL publiques distinctes peuvent pointer vers des octets identiques. L'espace logique signalé ne correspond pas à un espace récupérable sur GitHub.
