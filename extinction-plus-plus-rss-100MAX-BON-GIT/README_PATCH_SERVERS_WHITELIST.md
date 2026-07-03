# Patch Serveurs + Whitelist PostgreSQL

Ce patch relie le bot et le dashboard à la même base PostgreSQL Railway.

Après fusion GitHub :
1. Commit/push.
2. Railway va redeploy le bot et le dashboard.
3. Vérifie que `DATABASE_URL` existe dans les deux services.
4. Refaire `/serveur ajouter` et une nouvelle demande whitelist.
5. Ouvrir Dashboard > Serveurs / Whitelist.

Important : les anciens serveurs ajoutés avant ce patch étaient stockés dans le fichier local du bot. Sur Railway, le dashboard ne peut pas lire ce fichier. Il faut les ré-ajouter une fois après ce patch pour les écrire dans PostgreSQL.
