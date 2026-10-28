# CMD — Extinction++ RSS, Dashboard et CMD Sphere

Ce dépôt contient **plusieurs applications CMD distinctes**. Ne pas les fusionner ni déplacer leurs dossiers actifs sans mettre à jour les chemins Railway, Docker, scripts et tests.

## Où se trouvent les projets

| Dossier | Utilisation |
|---|---|
| `dashboard/` | Interface web Extinction++ RSS |
| `cmd-discord-mcp/` | CMD Sphere, serveur et interface |
| `shared/` | Données d'exemple et ressources communes |
| `config/` | Configuration versionnée, sans secrets |
| `scripts/` | Outils d'exploitation et de contrôle |
| `tests/` | Tests automatisés du dépôt |
| `native/` | Intégrations natives |
| `docs/` | Guides et notes de maintenance |
| `extinction-plus-plus-rss-100MAX-BON-GIT/` | Copie historique conservée pour vérification, **non destinée à devenir une seconde source de production** |

## Sécurité des mises à jour

- **CMD Sphere** utilise sa branche dédiée `cmd-sphere/dossiers-pays-20261018` et `cmd-discord-mcp/` comme racine Railway.
- Le code et les paramètres d'Extinction++ RSS doivent rester dans leurs emplacements de production.
- Un fichier dupliqué ou une copie ancienne ne doit pas être supprimé sans prouver qu'aucun workflow, import, volume ou serveur n'en dépend.
- Les fichiers cachés de configuration locale et les secrets ne doivent jamais être ajoutés à Git.
- Le nettoyage du dépôt **ANOMALIA** relève uniquement de ChatGPT Work.

Consulter [l'index des guides et l'audit des doublons](docs/INDEX.md) ou [la carte de maintenance](docs/CMD-REPOSITORY-MAINTENANCE.md).
