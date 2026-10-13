# CMD Browser VPN — intégration WireGuard réelle

Cette intégration prépare un **vrai tunnel VPN WireGuard**. Elle ne déploie pas de serveur VPN et ne prétend pas que le VPN est actif sans tunnel connecté.

## PC (Windows, macOS, Linux)

Installer le client WireGuard officiel et importer un profil WireGuard fourni par un serveur VPN administré ou un fournisseur compatible. Le script `vpn-status.mjs` vérifie si une interface WireGuard répond via la commande `wg show`; une interface seule ne prouve pas que le trafic Internet utilise ce VPN. Vérifier également la route par défaut, l'adresse IP publique et les fuites DNS.

## iPhone / iPad

L'application native devra intégrer **Network Extension / Packet Tunnel Provider** et WireGuardKit, avec les autorisations et capacités Apple appropriées. Une PWA Safari ne peut pas créer un tunnel VPN système.

## Android

L'application native devra intégrer le tunnel WireGuard via l'API **VpnService** d'Android, avec le consentement explicite de l'utilisateur.

## Serveur

Le VPN nécessite un serveur WireGuard réellement opérationnel, une IP publique joignable, une configuration de routage/NAT, des règles de pare-feu, DNS, rotation de clés et des protections contre les fuites IPv6/DNS. Un service Web Railway ne constitue pas à lui seul un serveur VPN utilisable.

**Ne jamais committer de clés privées ou de profils contenant des secrets.** Ne jamais annoncer une connexion VPN sans avoir vérifié la négociation WireGuard et l'acheminement réel du trafic.
