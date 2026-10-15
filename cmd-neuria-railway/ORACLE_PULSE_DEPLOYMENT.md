# CMD NEURIA — Oracle et Pulse : raccordement réel

État : **moteurs NON installés**. Le pont applicatif est présent, mais aucune génération IA distante n'a été validée.

## Moteurs envisagés

- **Oracle (3D)** : Tencent Hunyuan3D-2.1, https://huggingface.co/spaces/tencent/Hunyuan3D-2.1 . Attention : les capacités texte-vers-3D et l'export GLB dépendent du déploiement et des paramètres réellement exposés.
- **Pulse (chant)** : ACE-Step 1.5, https://huggingface.co/ACE-Step/Ace-Step1.5 ; documentation https://huggingface.co/docs/diffusers/api/pipelines/ace_step . La génération chantée demande un prompt et des paroles ; l'interface actuelle n'envoie qu'un prompt.

## Contrat déjà implémenté côté Railway

POST /api/neuria/generation/oracle et /api/neuria/generation/pulse, avec contrôle d'accès NEURIA_WORK_AUTH. Le serveur appelle un worker HTTP(S) autorisé avec :
```json
{"prompt":"description","format":"glb"}
```
ou `{"prompt":"description","format":"wav"}`. Le worker doit répondre **directement avec les octets binaires** d'un GLB ou d'un WAV ; les réponses JSON Gradio ne sont **pas** compatibles directement.

Variables nécessaires sur Railway :
- NEURIA_ORACLE_WORKER_URL : URL HTTPS d'un worker Oracle contrôlé.
- NEURIA_PULSE_WORKER_URL : URL HTTPS d'un worker Pulse contrôlé.
- NEURIA_GENERATION_WORKER_TOKEN : jeton partagé privé, ne jamais mettre dans le navigateur.

## Contraintes et tests

1. Un Space public ZeroGPU peut avoir des quotas, être indisponible et modifier son API. Ne pas le traiter comme un service de production garanti ou illimité.
2. Ne pas créer de machine payante, de GPU ou de service à facturation automatique sans validation explicite.
3. Prévoir un adaptateur Gradio séparé : soumettre à l'API queue, attendre le résultat, récupérer le fichier, vérifier le format, puis renvoyer ses octets au pont Railway.
4. Le pont actuel exige l'authentification administrateur ; les utilisateurs publics ne peuvent pas encore lancer la génération.
5. Tests de recette indispensables : (a) génération 3D réelle, (b) fichier GLB ouvrable, (c) chanson avec voix réellement audible, (d) WAV valide, (e) temps d'attente et quota, (f) accès utilisateur et limitation de débit.
6. Marquer Oracle et Pulse « opérationnels » uniquement après ces tests.

**Important :** HF_TOKEN seul n'installe ni Hunyuan3D ni ACE-Step, et n'assure pas de capacité GPU gratuite.
