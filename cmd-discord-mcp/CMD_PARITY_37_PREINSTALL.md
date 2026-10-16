# CMD Sphere vs Discord — décompte des préinstallations
Date : 16 octobre 2026
Branche : `cmd-sphere/boutique-4k-refonte-20261016`

## Légende imposée
- ❌ Non installé : aucun module/contrat identifié pour le point audité
- 🟠 Préinstallé : code préparatoire présent, développement/raccordement/test à effectuer
- 🟡 Développé mais à corriger ou à vérifier
- ✅ Fonctionnel : réellement installé, raccordé et testé

## Décompte du périmètre audité
- 24 anciens écarts : 🟠 24/24 préinstallés dans les modules `cmd-parity-*.js`
- 13 nouveaux écarts : 🟠 13/13 préinstallés dans les modules `cmd-parity-extra-*.js`
- Total du périmètre des 37 écarts : **❌ 0 non préinstallé, 🟠 37 contrats préparatoires, ✅ 0 validé parmi ces contrats.**
- Ce chiffre ne prouve PAS que Discord et CMD Sphere sont équivalents ou qu'il n'y a aucun autre manque : seuls les 37 écarts déjà identifiés ont été examinés ici.

## Liste des 13 nouveaux contrats préinstallés
### Sécurité (5)
- [ ] `account_passkeys` : Passkeys et authentification WebAuthn
- [ ] `account_mfa_recovery` : deuxième facteur, codes de secours et récupération du compte
- [ ] `sensitive_media_blur` : détection et floutage des images sensibles
- [ ] `abuse_reports` : signalement intégré des messages et comptes
- [ ] `e2ee_key_verification` : vérification cryptographique des clés d'appel

### Audio, vidéo et salons vocaux (4)
- [ ] `stream_clips` : clips enregistrés à partir des diffusions
- [ ] `call_audio_video_effects` : réduction du bruit et arrière-plans vidéo
- [ ] `voice_channel_text` : discussion textuelle dans les salons vocaux
- [ ] `voice_messages` : messages vocaux dans les MP et groupes

### Messages et forums (3)
- [ ] `message_forwarding` : transfert autorisé des messages vers une autre conversation
- [ ] `message_reminders` : rappels programmés sur les messages
- [ ] `forum_advanced_tags_gallery` : tags requis, filtres et vue galerie

### Confidentialité (1)
- [ ] `streamer_mode` : masquage des informations lors des diffusions

## Localisation dans le dépôt
- `cmd-parity-extra-security.js`
- `cmd-parity-extra-media.js`
- `cmd-parity-extra-productivity.js`
- `cmd-parity-extra-privacy.js`
- `cmd-parity-extra-13.js`
- `cmd-parity-37.js`
- `tests/cmd-parity-37.test.cjs`
- Ancien registre : `cmd-parity-24.js` et `CMD_PARITY_24_PREINSTALL.md`

L'endpoint protégé `GET /api/cmd/parity/status` fournit le décompte statique et les identifiants de toutes les entrées. Il n'active aucune fonction et ne donne aucun privilège supplémentaire.

## Ce qui reste réellement à développer
Les 37 fonctionnalités du registre sont des **contrats de préinstallation** et non des implémentations opérationnelles. Une fonction ne pourra passer de 🟠 à 🟡 puis ✅ qu'après :
1. véritable logique métier et API avec permissions côté serveur ;
2. validation de sécurité, confidentialité et éventuellement consentement ;
3. raccordement aux interfaces iPhone, Android et PC ;
4. tests automatisés, tests avec plusieurs comptes et validation Railway.

Aucun fournisseur payant, abonnement, authentification alternative ou système de surveillance n'a été activé par ce lot. Ne pas supprimer les données, les serveurs, les profils et les anciens cosmétiques. Les capacités nécessitant un service externe (p. ex. relais TURN, modération automatique, authentification WebAuthn, effets média) demandent une vraie implémentation et des essais avant mise en service.
