# CMD Browser — base native iOS / Android

Ce dossier prépare l'application native avec Capacitor, sans remplacer la PWA Railway.

## Installation

1. Node.js 20+ : `npm install`
2. `npx cap add ios` sur un Mac équipé de Xcode, ou `npx cap add android` avec Android Studio.
3. `npm run sync`, puis `npm run ios` ou `npm run android`.

## Important

Cette première base affiche CMD Browser depuis Railway. **Elle ne constitue pas encore un navigateur complet** : les liens externes peuvent sortir de la WebView selon les règles de Capacitor, et une gestion native des onglets, de la barre d'adresse, du retour et des domaines externes doit être développée dans WKWebView (iOS) et Android WebView. Ne pas utiliser `allowNavigation: ['*']` comme raccourci sans politique de sécurité et gestion des origines.

La publication iOS requiert Xcode et la signature Apple ; Android nécessite une compilation et une signature. Aucune application installable n'est générée par ces fichiers seuls.
