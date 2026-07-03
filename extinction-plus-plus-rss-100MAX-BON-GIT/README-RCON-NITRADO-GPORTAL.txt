EXTINCTION++ RSS - PATCH NITRADO + RCON + GPORTAL

Ce ZIP contient ton projet d'origine avec ajout réel :
- API Nitrado fonctionnelle avec le token NITRADO_TOKEN
- commandes /nitrado test, services, info, fileserver, restart, raw
- RCON réel avec rcon-client
- commandes /rcon test et /rcon cmd
- support GPortal via RCON générique
- dashboard remplacé avec tes deux images Extinction++ RSS

À remplir dans Railway Variables ou config.js :
DISCORD_TOKEN
CLIENT_ID
NITRADO_TOKEN

Pour ajouter un serveur Nitrado :
/serveur ajouter jeu:DayZ PC nom:MonServeur map:Namalsk provider:Nitrado nitrado_id:ID_SERVICE rcon_host:IP rcon_port:PORT rcon_password:MDP

Pour ajouter un serveur GPortal :
/serveur ajouter jeu:ARK Crossplay nom:MonARK map:Astraeos provider:GPortal rcon_host:IP rcon_port:PORT rcon_password:MDP

Tester :
/nitrado test
/nitrado services
/rcon test serveur:NomOuID
/rcon cmd serveur:NomOuID commande:players

Important GPortal : active RCON dans le panel GPortal et copie exactement l'IP/host, port RCON et mot de passe.
