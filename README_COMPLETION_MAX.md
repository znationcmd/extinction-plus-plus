# Extinction++ RSS - Version complétée au maximum

Cette version ajoute les blocs manquants les plus importants sans casser la structure existante :

## Ajouté / renforcé

- API Dashboard `/api/health` : diagnostic Railway, DB, tokens, modules.
- API Dashboard `/api/nitrado` : connexion token par Discord, test services, lien serveur, start/stop/restart/info.
- API Dashboard `/api/whitelist` : demandes, validation, refus, stockage local.
- API Dashboard `/api/github` : lecture dépôt GitHub et derniers commits avec `GITHUB_TOKEN` optionnel.
- Battle Pass amélioré : niveaux, XP joueur, claim récompense.
- Interpol amélioré : dossiers, rapports, sanctions, fermeture dossier.
- RP amélioré : métiers, licences, amendes, mandats, entreprises, propriétés, salaires.
- Alarmes améliorées : création, activation/désactivation, déclenchements.
- IA : utilise `OPENAI_API_KEY` si présent, sinon fallback local.
- Chiffrement token Nitrado côté dashboard avec `SECRET_KEY` / `SESSION_SECRET` / `ENCRYPTION_SECRET`.

## Variables Railway conseillées

```env
DISCORD_TOKEN=token_bot_discord
CLIENT_ID=id_application_discord
PUBLIC_URL=https://ton-dashboard.up.railway.app
SECRET_KEY=un_secret_long_aleatoire
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
GITHUB_TOKEN=ghp_...
GITHUB_REPO=znationcmd/extinction-plus-plus
```

## Important

- La connexion Nitrado est réelle via l'API officielle Nitrado.
- L'écriture automatique dans certains fichiers serveur Nitrado dépend des chemins exacts et permissions de l'API Nitrado. La validation whitelist est fonctionnelle en local, puis peut être branchée sur un chemin whitelist précis par serveur.
- RCON doit être configuré par serveur pour les commandes en jeu.
- Pour un usage public SaaS complet, PostgreSQL est recommandé à la place du JSON local, mais ce ZIP garde le JSON pour rester compatible avec ton projet actuel.

## Test rapide après déploiement

1. Va sur `/api/health`.
2. Lance `/nitrado connect token:<token>` sur Discord ou utilise `/api/nitrado` depuis le dashboard.
3. Vérifie `/api/nitrado?action=services&guildId=ID_DISCORD`.
4. Lie un serveur avec `/nitrado link-server`.
5. Teste l'IA avec la page IA ou `/ia question`.
