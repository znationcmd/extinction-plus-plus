# Application Extinction++ installable

Le Dashboard est installable sur iPhone/iPad, Android et les navigateurs de bureau
compatibles. Il reste hébergé à la même adresse HTTPS. L’installation n’ajoute pas
de frais de publication ni de nouveau service d’hébergement.

La page `/install` propose un bouton quand le navigateur fournit une invite et
les instructions manuelles pour Safari et Chrome. Elle est accessible dans la
navigation et dans les modules de l’accueil.

## iPhone et iPad

Ouvrir `https://TON-DASHBOARD/install` dans Safari. Utiliser le menu Partager,
puis « Sur l’écran d’accueil » / « Ajouter à l’écran d’accueil », activer
« Ouvrir comme app web » si proposé et confirmer « Ajouter ».

## Android

Ouvrir la même adresse dans Chrome. Utiliser « Installer Extinction++ » quand
le bouton apparaît, sinon le menu ⋮ puis « Installer l’application » ou
« Ajouter à l’écran d’accueil ». L’invite dépend du navigateur et de son contexte ;
un navigateur intégré à une autre application peut nécessiter l’ouverture dans
Safari ou Chrome.

## Fonctionnement

L’icône reprend le logo existant. Le manifeste fournit des PNG en 192/512 px,
une variante maskable et une icône Apple 180 px. L’application démarre sur l’accueil,
en mode standalone ; les raccourcis pointent vers les mods, le validateur et les
serveurs. La navigation tient compte des zones réservées aux encoches et gestes.

Le service worker conserve seulement une page de secours et les icônes publiques.
Il ne conserve pas les pages du Dashboard, les réponses API, les jetons ou les
fichiers analysés. Aucune action n’est mise en attente hors connexion. Il faut
Internet pour consulter les données et gérer les serveurs. Une navigation
directe sans réseau affiche « Connexion perdue ». Les mises à jour du Dashboard
restent disponibles en ligne sans nouvelle publication sur un store.

Les accès Discord et les permissions des fondateurs restent ceux du Dashboard.
Sur iPhone, la session de l’app installée peut être séparée de celle de Safari :
se reconnecter dans l’app si nécessaire.

Cette version ne publie pas sur l’App Store/Google Play et n’ajoute pas de
notifications push. Les coûts actuels de Railway restent applicables.

## Déploiement et vérification

Déployer la branche `main` du Dashboard avec `npm run build` et `npm run start`
dans le dossier `dashboard`, comme auparavant. Les fichiers `/sw.js`,
`/manifest.webmanifest`, `/offline.html` et `/app-icons/*` doivent être servis sur
le même domaine HTTPS. Aucun secret ni nouvelle dépendance n’est requis.

Le build de production vérifie le manifeste et la page d’installation.
Les tests de `tests/pwa-worker.test.js` vérifient que les données privées ne sont
pas conservées, que les actions et API ne sont pas interceptées et que le secours
hors connexion reste une page publique. Une installation réelle sur iPhone et
Android doit ensuite être vérifiée depuis l’URL de production.
