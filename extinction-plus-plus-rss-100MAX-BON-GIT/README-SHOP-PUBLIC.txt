SHOP PUBLIC JOUEURS

Ajouté :
- commande /shoplink
- bouton 🛒 Ouvrir le Shop
- les joueurs n'ont pas accès au Dashboard admin
- /dashboard est réservé aux admins

À régler dans bot/config.js :
SHOP_URL: "http://192.168.1.25:3000/shop"

Plus tard, remplace par ton lien public :
SHOP_URL: "https://shop.extinction-plus-plus.fr"

Après remplacement :
1. start-bot.bat
2. node deploy-commands.js si besoin
3. Sur Discord : /shoplink
