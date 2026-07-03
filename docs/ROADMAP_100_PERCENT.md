# Extinction++ RSS - Passage vers production 100%

Ce projet contient maintenant la structure complète pour une bêta avancée : bot Discord, dashboard, OAuth2 Discord, Nitrado, modules RP/Interpol/Battle Pass/Alarmes/IA.

## Important
Une version réellement "100%" ne peut être validée qu'après tests réels avec :
- un vrai token Discord bot ;
- un vrai OAuth2 Discord client secret ;
- un vrai token Nitrado client ;
- un serveur DayZ PC Nitrado ;
- les chemins whitelist/logs corrects ;
- Railway avec domaine public et stockage persistant ou PostgreSQL.

## Variables Railway obligatoires
DISCORD_TOKEN=
CLIENT_ID=
CLIENT_SECRET=
SESSION_SECRET=
ENCRYPTION_SECRET=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
DASHBOARD_URL=https://ton-domaine.up.railway.app

## Variables Nitrado
Le token Nitrado global n'est pas obligatoire pour un bot public. Chaque Discord doit connecter son propre token depuis le dashboard ou les commandes.

## PostgreSQL
Le fichier `sql/postgres-schema.sql` est fourni pour Railway PostgreSQL. Le projet conserve un fallback `shared/database.json` pour les tests locaux.

## À tester avant ouverture publique
1. `/api/health`
2. Connexion `/api/auth/login`
3. `/nitrado connect`
4. `/nitrado services`
5. Liaison serveur dans le dashboard
6. Whitelist complète avec un vrai UID DayZ/Steam
7. Paiement shop + logs admin
8. IA avec OPENAI_API_KEY
