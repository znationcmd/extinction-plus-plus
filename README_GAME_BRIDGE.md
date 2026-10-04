# Adaptateurs externes : protocole de connexion au jeu

Ce protocole permet à un plugin développé pour le jeu d’envoyer ses événements et de récupérer une commande de livraison. Ce dépôt fournit le backend et un client JavaScript de référence (`shared/bridge-client.cjs`), pas un mod universel déjà installable dans DayZ/ARK/Arma. Chaque jeu exige une adaptation à son API ou SDK et un essai en jeu. Le connecteur ne permet pas de contourner les restrictions des serveurs console.

Dans Serveurs : activer l’adaptateur, renseigner une clé partagée aléatoire de 32 caractères minimum, l’ID Discord, l’ID serveur exact et le salon de feed. Garder la clé côté serveur seulement. Le backend vérifie une signature HMAC SHA256 sur `timestamp + "\n" + corps JSON brut`, reçue dans `x-extinction-signature`. `x-extinction-time` contient le timestamp Unix en millisecondes, tolérance de 5 minutes. Le endpoint accepte uniquement POST `/api/game-bridge`, 64 Ko maximum. La signature utilise la clé de ce serveur ; aucun cookie Discord n’est utilisé.

## Événements

Le client `client({url,guildId,serverId,secret})` expose `events(events, capabilities)`. Un événement possède un `id` stable et unique fourni par le jeu, `type` parmi kill/death/suicide/connect/disconnect/position/chat et `actors` avec uid,name et éventuellement x,z horizontaux. Pour kill : victime d’abord, tueur ensuite, plus weapon,distance facultatifs. Pour chat : message. 100 événements maximum par requête. Conserver les événements localement et renvoyer les mêmes IDs si le HTTP échoue. Les événements alimentent les mêmes alarmes, primes et récompenses que le lecteur ADM. Éviter d’activer les deux sources pour les mêmes événements : elles n’ont pas les mêmes IDs et les kills seraient comptés deux fois.

## Livraison

Le plugin annonce `capabilities: {delivery:true}` dans ses messages réguliers (moins de 2 minutes entre deux contacts). En boutique, choisir Adaptateur, classe et quantité. Le compte du joueur doit être vérifié. L’achat réserve la monnaie et crée une livraison `bridge_queued`.

Le plugin appelle `claim()`, qui réclame atomiquement une livraison pour ce serveur et renvoie id,playerUid,className,quantity,x,z. Il doit persister cet ID avant toute remise d’objet et utiliser sa propre API native pour effectuer la livraison. Puis `ack(id,'delivered',message)` confirme le résultat, ou `ack(id,'delivery_uncertain',message)` indique un résultat incertain. Après crash, ne jamais redonner automatiquement un objet sans vérifier le journal local. Une commande réclamée ne repasse pas automatiquement en file : le staff vérifie son état avant une intervention. Une réponse HTTP 409 demande de renvoyer la même requête. Les secrets ne doivent apparaître ni en logs ni dans un plugin exécuté par les clients joueurs.

L’activation de l’adaptateur ne garantit pas une livraison en jeu : elle nécessite un plugin réellement installé, sa méthode native testée et une confirmation de réception.

## Module DayZ PC fourni

Les sources Enforce Script et l’agent Node.js sont dans `native/dayz`. Le téléchargement est disponible dans Administration connectée (`/integrations`). Le PBO reste à compiler avec DayZ Tools et le chargement doit être testé sur un serveur DayZ PC ; il n’est pas automatiquement installé chez les hébergeurs ni publié au Workshop. Les kits sont annoncés séparément via `capabilities.kits`.
