EXTINCTION++ RSS - MODULES AJOUTÉS

État réel :
- INTERPOL : fonctionnel en mode dashboard/API avec stockage JSON local.
- Battle Pass : fonctionnel en mode dashboard/API avec stockage JSON local.
- RP : fonctionnel en mode dashboard/API avec métiers/licences/amendes/mandats via JSON.
- Alarmes : fonctionnel en mode dashboard/API avec stockage JSON local.
- IA : fonctionne en mode local sans clé OpenAI, et bascule en mode ChatGPT/OpenAI si OPENAI_API_KEY est ajouté dans Railway.

Variables Railway à ajouter pour l’IA :
OPENAI_API_KEY=ta_cle_openai
OPENAI_MODEL=gpt-4o-mini

Important : pour un vrai bot commercial multi-clients, il faudra remplacer shared/database.json par PostgreSQL Railway, sinon les données peuvent être perdues lors de certains redéploiements.

Git :
Ce ZIP contient un dossier .git initialisé avec le remote :
https://github.com/znationcmd/extinction-plus-plus.git
Si tu veux garder l’historique exact de ton GitHub, le mieux reste de copier ces fichiers dans ton dépôt local déjà cloné.
