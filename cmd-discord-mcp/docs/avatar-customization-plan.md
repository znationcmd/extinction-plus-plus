# CMD Sphere — Boutique avatars personnalisables (prototype de données)

Statut : **préparation**, pas encore intégré dans l'interface ni déployé.

## Principes
- Conserver les 68 avatars existants et leurs identifiants ; aucune migration destructive.
- Tous les personnages, coiffures, barbes, vêtements et accessoires sont gratuits (prix 0, pas de monnaie virtuelle).
- Créer des personnages **originaux**, sans noms, logos, costumes ou silhouettes copiés de franchises.
- Silhouette humaine entière, debout, pose neutre de face ; couches indépendantes alignées sur un même canevas.
- Fournir pour chaque personnage des vues face/profil/dos si nécessaire ; chaque image source maîtresse peut être 3840 × 2160, mais les couches de rendu sont optimisées pour le web.
- Sauvegarder les sélections par utilisateur côté serveur, pas seulement dans le navigateur.

## Contrat de données envisagé
```json
{
  "version": 1,
  "baseAvatarId": "cmd-human-001",
  "hairId": "hair-short-001",
  "beardId": "beard-none",
  "topId": "top-jacket-001",
  "bottomId": "bottom-jeans-001",
  "shoesId": "shoes-boots-001",
  "accessoryIds": [],
  "palette": { "hair": "brown", "fabric": "violet" }
}
```

## Collections originales à produire
- Humains réalistes, western, urbains, survivants, fantastiques, futuristes.
- Créatures originales, ninjas, pirates, sauveteurs animaliers, héros en armure, personnages de plateforme.
- Chaque collection a ses propres morphologies et options de personnalisation compatibles.

## Critères de validation avant déploiement
1. Aucun ancien avatar ni profil perdu.
2. Prévisualisation instantanée de chaque couche sur iPhone, tablette et PC.
3. Enregistrement et rechargement des tenues sur le compte connecté.
4. Aucun paiement ni prix affiché.
5. Pas de personnage reprenant un design protégé.
6. Contrôles de performance et de netteté ; vérification visuelle réelle.

Ce document ne prétend pas que les illustrations 4K ni la boutique sont déjà produites.
