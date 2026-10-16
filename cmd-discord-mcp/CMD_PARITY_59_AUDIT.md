# CMD Sphere — audit étendu Discord et préinstallation (16 octobre 2026)

## Historique cumulatif (aucun oubli)
- Lot A : **24** fonctionnalités ❌ préinstallées comme contrats — `cmd-parity-24.js`
- Lot B : **13** fonctionnalités ❌ préinstallées comme contrats — `cmd-parity-extra-13.js`
- Lot C : **22** nouveaux écarts repérés dans le nouvel audit et préinstallés comme contrats — `cmd-parity-expansion-*.js`
- **Total suivi : 59 (24 + 13 + 22).**

## Décompte selon la légende CMD Sphere
- ❌ Sans contrat/module : **0 parmi ces 59 éléments audités et préparés**
- 🟠 Contrats préinstallés, fonctionnalité non développée ou non validée : **59**
- ✅ Ces contrats entièrement opérationnels et validés : **0**
- **Cela n'affirme PAS qu'il n'existe plus aucun écart avec Discord.** D'autres fonctions et contraintes (y compris clients natifs, services tiers et fonctionnalités futures de Discord) peuvent ne pas figurer dans l'audit.

## Les 22 nouveaux contrats ajoutés
### Confidentialité (4)
- Bloquer/débloquer un membre
- Boîte séparée des demandes de messages et spam (préférences MP partielles déjà présentes)
- Confidentialité des MP par serveur
- Restrictions sur les demandes d'amis

### Serveurs (6)
- Mode lent
- Niveaux de vérification
- Espaces d'âge restreint
- Modèles de serveur
- Salons médias
- Cycle de vie des fils (archivage automatique et verrouillage)

### Vocal (5)
- Salon AFK et délai d'inactivité
- Voix prioritaire
- Volume individuel
- Débit audio et limite de membres
- Région vocale

### Comptes (3)
- Export des données du compte
- Suppression de compte et récupération
- Sessions d'appareils et révocation

### Développeurs (2)
- Applications installables au niveau utilisateur
- Autocomplétion des commandes de bots

### Accessibilité (1)
- Lecture vocale TTS des messages

### Monétisation (1)
- Abonnements de serveur (non activés et sans moyen de paiement)

## Contrôles techniques
- Registre cumulatif : `cmd-parity-59.js`
- Test : `tests/cmd-parity-59.test.cjs`
- Endpoint de suivi authentifié : `GET /api/cmd/parity/status`
- Anciens tests `tests/cmd-parity-37.test.cjs` maintenus
- Chaque contrat est uniquement défini et garde `implemented:false`, `enabled:false`, `verified:false`.
- Le registre est déclaratif : pas de nouvelles tables, pas d'utilisation d'API de tiers, pas de paiement ou de collecte d'identifiants.

## Étapes nécessaires pour rendre les fonctions utilisables
Implémenter une API et base de données si nécessaire, les règles de permissions et de confidentialité, la vraie interface sur mobile/PC, puis tester avec comptes distincts et déployer. Protéger les données déjà enregistrées. Aucun statut ✅ avant validation réelle.
