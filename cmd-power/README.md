# CMD Power — contrôleur personnel

Projet Railway distinct : **CMD Power**. L'interface et la fonction sont volontairement **en attente d'activation** tant que la sécurité n'est pas configurée.

## PC Windows (Wake-on-LAN)

1. Activer Wake-on-LAN dans le BIOS/UEFI et dans la carte réseau Windows. Utiliser de préférence une connexion Ethernet. Le réveil depuis l'arrêt complet n'est pas garanti ; privilégier la veille.
2. Prévoir **un appareil sur le réseau local qui reste allumé lorsque le PC est en veille**, par exemple mini-PC, NAS ou Raspberry Pi. L'agent exécuté sur le PC endormi ne peut pas le réveiller lui-même.
3. Sur cet appareil, exécuter `CMD_POWER_RELAY_KEY=... CMD_POWER_PC_MAC=... python3 relay.py`. Ne jamais envoyer de clé dans le chat ou GitHub.
4. Publier la boucle locale `http://127.0.0.1:8765/wake` uniquement derrière un tunnel HTTPS sécurisé avec un accès limité.
5. Dans Railway > CMD Power > Variables : configurer `CMD_POWER_ADMIN_KEY` (32+ caractères), `CMD_POWER_RELAY_KEY` (32+), `CMD_POWER_WAKE_ENDPOINT` (URL HTTPS complète du tunnel vers `/wake`). **La même clé relais doit figurer dans Railway et sur l'appareil relais.** Ne pas coller de clé dans ChatGPT.

## Consoles

- **PS5** : Paramètres > Système > Lecture à distance, puis mode repos avec connexion Internet et activation depuis le réseau. Utiliser [PS Remote Play](https://www.playstation.com/fr-fr/support/games/playstation-remote-play-on-mobile-devices/).
- **Xbox Series X** : activer les fonctionnalités à distance sur la console et utiliser [Xbox Remote Play](https://www.xbox.com/remoteplay).

L'interface ne prétend pas réveiller une console entièrement éteinte, ni une machine non associée. Ne pas couper brutalement l'alimentation d'une console avec une prise connectée.

## Protection contre les frais

CMD Power reste en attente de déploiement jusqu'à la configuration de l'accès. Le service Railway utilise le mode économie/Serverless lorsqu'il sera activé, avec un possible délai au premier accès. Les éventuels frais Railway sont distincts de ceux des fournisseurs.

## Limites

- Le bouton PC confirme seulement l'envoi du paquet magique, **pas** que le PC est effectivement allumé.
- Le relais ne stocke aucun mot de passe de console, n'exécute aucune commande système et ne gère aucun serveur de jeu.
- Pour un contrôle à distance fonctionnel, il faut tester le réveil sur le LAN d'abord, puis depuis l'extérieur du domicile.
