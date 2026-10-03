# Bot et dashboard sur Railway

Le bot et le dashboard utilisent actuellement un fichier JSON commun. Les pages du dashboard relisent les données à chaque visite.

## Un service pour les deux processus

- Root Directory : racine du dépôt.
- Build Command : `npm run build`.
- Start Command : `npm start`.
- `DISCORD_TOKEN` (ou `TOKEN`) : token du bot Discord.
- `CLIENT_ID` : identifiant de l’application Discord, nécessaire à `npm run deploy` pour enregistrer les commandes.
- `DASHBOARD_URL` : URL publique du dashboard, si elle diffère du domaine Railway détecté automatiquement.

Le lanceur démarre Next.js sur `PORT` et le bot quand son token est configuré. Si un processus s’arrête, il arrête l’autre et termine avec une erreur afin que Railway puisse redémarrer le service. SIGTERM arrête les processus proprement.

## Persistance des données

Monter un volume Railway, par exemple sur `/data`, et définir `DATABASE_PATH=/data/database.json`. Copier la base existante sur le volume avant de basculer si des données doivent être conservées. Le lanceur transmet le même chemin absolu au bot et au dashboard. `BOT_DATABASE_PATH`, si défini, prend priorité.

Sans volume, les données locales peuvent disparaître lors d’un redéploiement. Deux services distincts avec des fichiers locaux ne partagent pas leurs données. Une migration commune vers PostgreSQL serait nécessaire pour supprimer cette dépendance au stockage partagé. Les modules PostgreSQL existants ne synchronisent pas automatiquement la base JSON.

## Validation du correctif

`npm ci` et `npm run build` ont réussi. Les tests avec Discord simulé vérifient la création d’un serveur, le dépôt d’une demande whitelist et la sérialisation des 23 commandes. Les tests HTTP vérifient l’accueil, les serveurs, la whitelist, le détail Discord, l’API whitelist et la visibilité des modifications sans nouveau build. L’arrêt par SIGTERM a été vérifié.

La connexion Discord réelle et les appels Nitrado/RCON restent à vérifier avec les identifiants du déploiement.
