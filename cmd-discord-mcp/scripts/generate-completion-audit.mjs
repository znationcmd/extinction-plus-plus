import {writeFileSync,readFileSync} from 'node:fs';
import {CMD_PARITY_59} from '../cmd-parity-59.js';
const root=new URL('../',import.meta.url);
const results=JSON.parse(readFileSync(new URL('audit/2026-10-18-tests.json',root)));
const count={validated:0,preinstalled:0,partial:0};
const escape=x=>String(x??'—').replaceAll('|',' / ').replaceAll('\n',' ');
const rows=CMD_PARITY_59.map(f=>{
 const validated=f.implemented&&f.enabled&&f.verified;
 const state=validated?'✅':f.implemented?'🟡':'🟠';
 count[validated?'validated':f.implemented?'partial':'preinstalled']++;
 return [f.id,f.category,f.title,'Contrat préparatoire','Inventaire du contrat ; aucune clôture déclarée','cmd-parity-59.js',f.apiContract,f.acceptance+' : non exécuté','Non vérifié',state,'Commit source dd343a9286e202dd038f432279451f35c0c5c033'];
});
const fixes=[
 ['SEC-ORIGIN','Sécurité','Contrôle d’origine des mutations API','Partiel','Contrôle avant les gestionnaires API','cmd-request-safety.js; server.js','API /api/* ; aucune migration','request-safety.test.cjs : réussi'],
 ['SEC-BODY','Sécurité','Limite de lecture JSON des messages','Défectueux','Lecture bornée, y compris flux sans Content-Length ; erreurs 400/413','cmd-request-safety.js; server.js','Messages salons, MP, groupes ; aucune migration','request-safety.test.cjs : réussi'],
 ['AUTH-COOKIE','Comptes','Tolérance aux cookies malformés','Défectueux','Ignore une valeur malformée sans casser les autres cookies','server.js','Authentification existante ; aucune migration','request-safety.test.cjs : réussi'],
 ['INV-EXPIRY','Invitations','Compatibilité des durées 3/30 jours','Partiel','Accepte les anciens et nouveaux formats','cmd-native-invites.js','API invitations existante ; aucune migration','native-invites.test.cjs : 8 réussis'],
 ['XP-CHESTS','Récompenses','Coffres disponibles après les 100 premiers','Défectueux','Sélection des 100 prochains coffres non réclamés, jusqu’au niveau 10000','cmd-levels.js','Tables existantes ; aucune nouvelle migration','level-chests.test.cjs : 2 réussis']
].map(r=>[...r,'Non déployé','🟡','Correctif local 65922cd ; tests avec doubles de base, pas validation multi-utilisateur réelle']);
const header='| ID | Domaine | Fonction | État initial | Travail effectué | Fichiers | API / SQL | Test | Production | État final | Preuve |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
const table=r=>r.map(row=>'| '+row.map(escape).join(' | ')+' |').join('\n');
const text=`# CMD Sphere — suivi de finition, 18 octobre 2026

Mission ouverte. Ce registre initial ne constitue ni un audit exhaustif achevé ni une validation à 100 %.
Le périmètre demandé dépasse les 59 contrats ; les contrôles de chaque écran, fonction sociale et catalogue restent à inventorier individuellement. Aucun pourcentage global n’est calculé.

## Production constatée

- Projet radiant-nature, environnement production : d4e965d4-5077-4f36-b05e-5810fab77759.
- Service cmd-discord-mcp : 020e5b4a-7ad2-4525-b195-36e56f37e851.
- Déploiement 4c496a1c-bff1-4f04-ac4f-95c0fe3b5b65 : SUCCESS, une réplique en ligne.
- Commit déployé : dd343a9286e202dd038f432279451f35c0c5c033, branche cmd-sphere/boutique-4k-refonte-20261016.
- GET /health : HTTP 200 ; HEAD /health retourne 404. Le GET ne prouve pas le fonctionnement des comptes ou des appels.
- PostgreSQL : en ligne, volume persistant de 5000 MB. Aucune sauvegarde ou restauration vérifiée dans cette intervention.
- Écart main confirmé : 708 commits d’avance, 22 de retard. Les changements main touchant Sphere portent sur invitations/Studio ; la normalisation des invitations est déjà dans la branche active. Aucune fusion automatique réalisée.
- Branche de travail créée à partir du commit exact de production : cmd-sphere/finition-20261018.

## Blocage de livraison

L’accès OAuth Railway expose les noms des variables mais masque leurs valeurs. Aucune commande distante, connexion PostgreSQL ou opération de sauvegarde n’est disponible avec les outils connectés actuels. Aucun proxy public n’a été ajouté. Une session Railway CLI authentifiée permettant SSH/pg_dump, ou une sauvegarde contrôlée par l’administrateur et restaurée dans une base isolée, est nécessaire pour respecter la phase 0.

La production n’a pas été modifiée. Pas de migration, pas de nouveau service, pas de paiement, pas de compte de test créé en production. La restauration et les tests multi-appareils réels restent à faire. Les correctifs ci-dessous sont prêts pour revue, pas déclarés fonctionnels en production.

## Résultats de tests

| Version | Tests | Réussis | Échecs |
|---|---:|---:|---:|
${Object.entries(results).map(([k,v])=>'| '+k+' | '+v.tests+' | '+v.pass+' | '+v.fail+' |').join('\n')}

Source : npm ci --ignore-scripts puis npm test. Runtime : copie isolée, npm run postinstall, node patch-runtime.cjs, npm test. Les tests existants génèrent certains assets : ces différences automatiques ont été exclues du correctif. Les 7 nouveaux tests et les 8 tests d’invitations passent.

Les échecs ne sont pas tous des bugs produit confirmés : deux tests attendent encore une écriture vers Discord alors que l’application gère les serveurs localement ; plusieurs doubles DOM n’exposent pas les méthodes attendues. Ils restent signalés, sans suppression des tests ni déclaration de conformité.

Échecs runtime restants :
${results.runtime_after.failures.map(s=>'- '+s).join('\n')}

## Lot de correctifs préparé

${header}${table(fixes)}

## 59 contrats — compteurs calculés

✅ ${count.validated} ; 🟡 ${count.partial} ; 🟠 ${count.preinstalled}. Aucun contrat clôturé durant ce lot. Le nombre global de fonctions ❌ est indéterminé tant que l’inventaire exhaustif n’est pas terminé. Les 5 corrections partielles ci-dessus ne sont pas ajoutées au décompte des contrats.

${header}${table(rows)}

## Suite prioritaire

1. Débloquer sauvegarde et restauration isolée ; conserver le commit de retour arrière ci-dessus.
2. Vérifier les sessions/révocations et la persistance après installation PWA ; ne pas prendre la présence du contrat pour une implémentation.
3. Réconcilier les tests obsolètes avec l’indépendance de CMD Sphere et corriger les vrais défauts de profils/Studio.
4. Exécuter les scénarios propriétaire/admin/modérateur/membre/extérieur sur PostgreSQL isolé, puis en production avec comptes dédiés.
5. Déployer uniquement le lot vérifié après la phase 0, contrôler GET /health, comptes, messages, invitations, soldes ; vérifier les API et les écrans réellement utilisés.
6. Continuer le périmètre complet : comptes, serveurs, permissions, invitations, messagerie, appels, profils, fonds, catalogue, boutique, monnaie, XP, saisons, Studio, intégrations, emojis, développeurs, notifications, sécurité, stockage, interface, PWA, langues.

## Maintenance du registre

Exécuter node scripts/generate-completion-audit.mjs depuis cmd-discord-mcp après mise à jour des preuves. Les compteurs des contrats proviennent de CMD_PARITY_59 ; aucune case verified ne doit être modifiée sans preuve de production. Les résultats de ce lot sont figés dans audit/2026-10-18-tests.json.
`;
writeFileSync(new URL('CMD_SPHERE_AUDIT_100_PERCENT.md',root),text);
console.log(JSON.stringify(count));
