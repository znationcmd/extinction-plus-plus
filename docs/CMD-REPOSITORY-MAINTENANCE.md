# Plan de rangement sécurisé — Extinction++ / CMD Sphere

## Constat vérifié le 28 octobre 2026

L'inventaire de la branche `main` contenait **619 fichiers suivis**. La copie historique `extinction-plus-plus-rss-100MAX-BON-GIT/` rassemble notamment d'anciens fichiers du tableau de bord et des imports. Certains médias publics portent volontairement des noms différents tout en partageant exactement les mêmes octets.

Douze groupes de fichiers identiques de plus de 10 Ko représentent environ **38,63 Mo de doublons logiques** dans l'arborescence. **Attention :** Git stocke les blobs identiques par empreinte, donc cette valeur ne correspond pas à autant d'espace Git récupérable.

## Classement retenu

| Catégorie | Emplacement stable |
|---|---|
| Serveur / commandes du bot Extinction++ | Racine, `config/`, `shared/` |
| Dashboard Extinction++ | `dashboard/` |
| CMD Sphere | `cmd-discord-mcp/` |
| Tests | `tests/` et tests propres à chaque application |
| Outils | `scripts/` |
| Documentation nouvelle | `docs/` |
| Historique / anciennes copies | `extinction-plus-plus-rss-100MAX-BON-GIT/` **temporairement conservé** |

## Avant tout déplacement ou suppression

1. Vérifier les usages réels dans les importations et chemins codés en dur, services Railway et Docker.
2. Comparer les hashes et conserver une branche/tag de récupération.
3. Tester la construction et les routes de toutes les applications affectées.
4. Supprimer seulement les fichiers dont l'inutilité a été vérifiée. Ne jamais supprimer les données utilisateur, la base des bots, les paramètres ou les actifs publics utilisés par une URL.
5. Ne pas renommer les répertoires de production uniquement pour améliorer l'apparence de GitHub.

## Ce ménage ne fait pas

Il ne supprime pas automatiquement les versions historiques, les médias publics, les sauvegardes, les imports ARK/DayZ ou les données Discord. Cela nécessite une validation de dépendances supplémentaire.

## Ancien sous-module non déclaré

L'ancienne copie `extinction-plus-plus-rss-100MAX-BON-GIT/bot` contenait uniquement un pointeur de sous-module Git (mode `160000`, commit `69b36f876dd572ded826d3dbb5489d2493906243`) sans fichier `.gitmodules` permettant de le récupérer. Le nettoyage enlève **ce pointeur inutilisable**, et non des fichiers du bot actif. Le serveur Railway Extinction++ RSS démarre avec le répertoire racine `.`, et le tableau de bord avec `/dashboard`.

Le pointeur historique reste récupérable dans l'historique Git antérieur au nettoyage. Un contrôle GitHub Actions bloque désormais la réapparition d'un sous-module non déclaré.

**Ne pas supprimer les autres fichiers historiques ni les copies des ressources publiques sur la seule base de leur hash.**
