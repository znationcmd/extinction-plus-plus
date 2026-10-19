# Compatibilité des bots Discord — CMD Sphere

CMD Sphere propose un premier adaptateur REST en lecture et écriture limitée pour les développeurs de bots. Il ne fait pas fonctionner automatiquement un bot Discord tiers.

## Pour un créateur de bot

1. Enregistrer son bot au portail développeur CMD Sphere.
2. Adapter son bot aux identifiants UUID de CMD Sphere et à l'API native.
3. Demander au propriétaire du serveur CMD d'autoriser les permissions nécessaires.
4. Utiliser le client de démonstration dans `adapters/cmd-discord-rest-client.mjs`.

La passerelle de test expose les routes de consultation des serveurs, salons, rôles et messages, et l'envoi de messages texte. Le serveur vérifie que le bot est installé dans le serveur CMD et qu'il possède la permission correspondante.

## Limites

Pas de Gateway Discord, pas d'invitation OAuth2 Discord sur un serveur CMD, pas d'installation automatique d'un bot tiers non adapté. Les fonctions de modération, les rôles automatiques, les commandes et les événements temps réel nécessiteront des intégrations supplémentaires.

Le catalogue CMD permet la recherche d'une application enregistrée à partir de l'identifiant Discord déclaré, mais cet identifiant n'est pas une preuve d'identité du développeur.

Une première implémentation existe sur la branche principale GitHub. Le déploiement sur la branche Railway de CMD Sphere nécessite encore l'intégration de la route API et les contrôles de production.
