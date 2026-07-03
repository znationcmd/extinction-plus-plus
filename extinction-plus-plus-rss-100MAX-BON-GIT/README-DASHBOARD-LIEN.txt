LIEN DASHBOARD POUR LES UTILISATEURS

Ajouté :
- commande Discord /dashboard
- bouton "Ouvrir Dashboard"
- compatible PC + téléphone
- configuration dans bot/config.js

À modifier dans bot/config.js :
DASHBOARD_URL: "http://192.168.1.25:3000"

Pour test local :
http://192.168.1.25:3000

Pour tous les utilisateurs :
mettre un lien public, exemple :
https://dashboard.extinction-plus-plus.fr
ou
https://ton-dashboard.vercel.app

Après modification :
1. start-bot.bat
2. Le bot redéploie les commandes avec node deploy-commands.js
3. Sur Discord : /dashboard
