# CMD Sphere — inventaire non destructif des planches (10 octobre 2026)

## Périmètre
Application `cmd-sphere.up.railway.app` uniquement.
Dépôt `znationcmd/extinction-plus-plus`, branche `cmd-sphere/avatars-individuels-20261009`, dossier `cmd-discord-mcp/`.
**Ne pas modifier Extinction++, les bots indépendants ni les données de profil.**
Éviter de remplacer des assets sous les mêmes identifiants sans validation.

## Retrouvé dans la bibliothèque des conversations
Archives (leurs noms doivent être recherchés dans la bibliothèque ChatGPT; elles ne sont PAS présentes dans le dépôt GitHub) :
- `CMD_Sphere_8_planches_scenes.zip` : 8 images de planches thématiques (Nature & Paysages; Villes & Lieux; Féerie & Fantastique; Saisons & Fêtes; Espace & Univers; Animé & Dessin; Lifestyle & Intérieurs; Animaux & Ambiance).
- `scenes_cmd_sphere_6_planches.zip` : 6 anciennes planches de scènes.
- `CMD_Sphere_54_fonds_individuels_sans_doublons.zip` : 54 découpes WebP, principalement verticales.
- `CMD_Sphere_62_Fonds_Horizontaux_Nets.zip` : 62 fonds WebP de 1920×1080, 62 miniatures et un manifeste.
- `cmd-sphere-68-avatars-individuels.zip` : 68 PNG d'environ 90×256, RGB.
Autres références visuelles retrouvées : `Grille de 48 maisons isolées.png`, `Planche de stickers avatars en grille.png`, `Galerie d’avatars urbains stylisés 3D.png`, `Animaux et véhicules sur fond transparent(1).png`, et différents catalogues Snapchat+-style des conversations du 9 octobre.

## Constat qualité — ne pas déployer les archives non nettoyées
- Les 62 WebP ont bien une **dimension de sortie** 1920×1080, mais plusieurs portent un effet de miroir central, des répétitions visibles et des détails reconstruits depuis de petites découpes. Le libellé « haute définition native » serait trompeur.
- Les 68 anciens avatars archivés sont en RGB, pas de réels détours transparents ; 90×256 environ ne suffit pas pour un rendu net agrandi.
- Les 8 planches contiennent encore éléments d'interface, prix et couronnes; il faut récupérer/reconstruire **les scènes seules**, sans éléments parasites.
- Des références anciennes `catalog-scene-*` dans `cmd-profile-scene.js` pointent encore vers des scènes de quelques centaines de pixels (ex. Décor 15 : 320×145).
- Les 35 SVG `cmd-hd-*` existent dans GitHub en 1920×1080 mais leur qualité artistique et leur fidélité aux références ne sont pas équivalentes à une reconstruction haute résolution des planches ; certaines formes sont symétrisées.
- Aucun de ces lots n'est une preuve de qualité iPhone ou de transparence parfaite.

## Correctifs déjà envoyés au code et vérifiés dans GitHub
- `33f40a0eff08c15473847d6afd99e13fabfdd35d` : ne plus remettre automatiquement l'avatar et les anciennes options sauvegardées à leurs valeurs par défaut lors du chargement.
- `4454eea1bebd3f384a4ab9cef00a0dc0dd1a13d5` : masquer la barre globale de langue pendant l'ouverture de l'éditeur de profil pour éviter son chevauchement.
- `0d07314cf246f8335c1ee8ac9cfe9a58e958d1a2` : actualiser les identifiants des fichiers JS et CSS du profil sur iPhone.
- Déploiement correspondant : `c972fbd5-e792-45a4-9815-f678147ee668`, Railway `SUCCESS` (démarrage confirmé ; boutons non testés sur iPhone).

## Travail restant OBLIGATOIRE
1. Retrouver et contrôler chaque planche originale et chaque image demandée. Dédupliquer **sans** effacer les identifiants de choix sauvegardés.
2. Régénérer les fonds flous à partir de véritables images de qualité, **pas** par simple mise à l'échelle ni miroir ; préserver entièrement scènes et perspective.
3. Produire chaque animal, véhicule, maison et avatar individuellement, cadré, net, sur alpha transparent ; préserver apparence d'origine (cheveux, vêtements, accessoires et chaussures des avatars).
4. Ajouter les nouveaux fichiers **dans GitHub** et les déclarer dans le vrai catalogue CMD Sphere Avatar & décor. Conserver l'ancienne bannière du profil comme système séparé.
5. Valider les URL et formats, l'aperçu instantané, la sauvegarde sur le compte, le rechargement iPhone, la fermeture du panneau, ainsi que l'absence de réinitialisation des anciens choix.
6. Ne jamais annoncer des images installées quand elles n'ont été produites que dans un ZIP de livraison.

> Ce fichier est un journal de reprise. Il ne transforme pas les archives retrouvées en assets installés.