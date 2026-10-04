const crypto=require('node:crypto');
const id=()=>crypto.randomUUID();
function integer(value,min=0,max=100000000){if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`Montant entier requis (${min} à ${max}).`);return value;}
function account(db,guildId,userId){if(!/^\d{15,22}$/.test(userId||''))throw new Error('ID Discord du joueur requis.');db.bank||={accounts:[]};db.bank.accounts||=[];let a=db.bank.accounts.find(a=>a.guildId===guildId&&a.userId===userId);if(!a){a={guildId,userId,cash:0,bank:0};db.bank.accounts.push(a);}if(!Number.isSafeInteger(a.bank)||a.bank<0)throw new Error('Solde bancaire invalide.');return a;}
function transaction(db,tx){db.economy||={transactions:[]};db.economy.transactions||=[];db.economy.transactions.push({id:id(),createdAt:new Date().toISOString(),...tx});}
function change(db,guildId,userId,amount,reason,eventId){const a=account(db,guildId,userId);if(!Number.isSafeInteger(a.bank+amount)||a.bank+amount<0)throw new Error('Solde insuffisant ou montant trop élevé.');a.bank+=amount;transaction(db,{guildId,userId,amount,reason,eventId});}
function createBounty(db,guildId,body){const amount=integer(body.amount,1),creatorId=String(body.creatorId||'');if(!body.serverId||!body.targetUid||/[\r\n\0]/.test(body.targetUid)||body.targetUid.length>100)throw new Error('Serveur et UID de la cible requis.');const now=Date.now(),hours=integer(Number(body.hours||168),1,720);const self=(db.playerLinks||[]).find(l=>l.guildId===guildId&&l.serverId===body.serverId&&l.userId===creatorId&&l.uid===body.targetUid&&l.verified);if(self)throw new Error('Impossible de mettre une prime sur soi-même.');change(db,guildId,creatorId,-amount,'Dépôt de prime');const row={id:id(),guildId,serverId:body.serverId,targetUid:body.targetUid,targetName:body.targetName||body.targetUid,creatorId,amount,status:'active',createdAt:new Date(now).toISOString(),expiresAt:new Date(now+hours*3600000).toISOString()};(db.bounties||=[]).push(row);return row;}
function cancelBounty(db,row){if(row.status!=='active')throw new Error('Cette prime est déjà réglée.');change(db,row.guildId,row.creatorId,row.amount,'Remboursement de prime');row.status='cancelled';row.updatedAt=new Date().toISOString();}
function expire(db,now=Date.now()){for(const b of db.bounties||[])if(b.status==='active'&&Date.parse(b.expiresAt)<=now){cancelBounty(db,b);b.status='expired';}}
function faction(db,gid,sid,userId){return(db.factions||[]).find(f=>f.guildId===gid&&f.serverId===sid&&(f.members||[]).includes(userId));}
function treasury(db,f,userId,amount,direction){integer(amount,1);if(!Number.isSafeInteger(f.treasury||0)||(f.treasury||0)<0)throw new Error('Trésorerie invalide.');if(!(f.members||[]).includes(userId))throw new Error('Membre de faction requis.');f.treasury||=0;if(direction==='deposit'){if(!Number.isSafeInteger(f.treasury+amount))throw new Error('Trésorerie trop élevée.');change(db,f.guildId,userId,-amount,'Dépôt de faction');f.treasury+=amount;}else{if(f.leaderId!==userId)throw new Error('Seul le chef peut retirer.');if(f.treasury<amount)throw new Error('Trésorerie insuffisante.');change(db,f.guildId,userId,amount,'Retrait de faction');f.treasury-=amount;}}
function linked(db,gid,sid,uid){return(db.playerLinks||[]).find(l=>l.guildId===gid&&l.serverId===sid&&l.uid===uid&&l.verified);}
function processEvent(db,s,e,now){if(e.type!=='kill'||!e.killerUid||e.killerUid===e.playerUid)return;
 const killer=linked(db,s.guildId,s.id,e.killerUid),victim=linked(db,s.guildId,s.id,e.playerUid);if(!killer)return;
 if(victim?.userId===killer.userId)return;
 const friendly=victim&&faction(db,s.guildId,s.id,killer.userId)?.id===faction(db,s.guildId,s.id,victim.userId)?.id&&!!faction(db,s.guildId,s.id,killer.userId);
 if(friendly)return;
 for(const rule of db.eventRules||[]){if(rule.guildId!==s.guildId||rule.serverId!==s.id||rule.enabled===false||rule.type!=='kill')continue;
 const key=`${e.id}:reward:${rule.id}`;if((db.economy?.transactions||[]).some(t=>t.eventId===key))continue;
 if(rule.requireLinkedVictim&&!victim)continue;
 const prior=(db.economy?.transactions||[]).filter(t=>t.guildId===s.guildId&&t.userId===killer.userId&&t.ruleId===rule.id).at(-1);
 if(prior&&Date.parse(now)-Date.parse(prior.createdAt)<(rule.cooldownSeconds??300)*1000)continue;
 const amount=integer(rule.amount,1);change(db,s.guildId,killer.userId,amount,'Récompense kill du jeu',key);db.economy.transactions.at(-1).ruleId=rule.id;
 }
 for(const bounty of db.bounties||[]){if(bounty.guildId!==s.guildId||bounty.serverId!==s.id||bounty.status!=='active'||bounty.targetUid!==e.playerUid||Date.parse(bounty.expiresAt)<=Date.parse(now)||bounty.creatorId===killer.userId)continue;
 change(db,s.guildId,killer.userId,bounty.amount,'Prime gagnée',`${e.id}:bounty:${bounty.id}`);bounty.status='claimed';bounty.claimedBy=killer.userId;bounty.claimedAt=now;bounty.eventId=e.id;
 (db.liveAlerts||=[]).push({id:id(),guildId:s.guildId,serverId:s.id,channelId:s.feedChannelId,content:`🎯 Prime remportée : ${e.killer} reçoit ${bounty.amount} pour ${bounty.targetName}.`,createdAt:now});
 }
}
function settleBounty(db,gid,bountyId,userId,evidence,actorId){const b=(db.bounties||[]).find(b=>b.guildId===gid&&b.id===bountyId);if(!b||b.status!=='active'||Date.parse(b.expiresAt)<=Date.now())throw new Error('Prime inactive ou expirée.');if(typeof evidence!=='string'||!evidence.trim()||evidence.length>1000)throw new Error('Preuve ou motif de validation requis.');const killer=(db.playerLinks||[]).find(l=>l.guildId===gid&&l.serverId===b.serverId&&l.userId===userId&&l.verified);if(!killer||killer.uid===b.targetUid||userId===b.creatorId)throw new Error('Bénéficiaire vérifié et distinct requis.');const victim=linked(db,gid,b.serverId,b.targetUid),f=faction(db,gid,b.serverId,userId);if(f&&victim&&f.members.includes(victim.userId))throw new Error('Prime interdite dans la même faction.');change(db,gid,userId,b.amount,'Prime validée par le staff',`manual:bounty:${b.id}`);Object.assign(b,{status:'claimed',claimedBy:userId,claimedAt:new Date().toISOString(),reviewedBy:actorId,evidence,source:'staff_review'});return b;}
function validateTask(body,previous={},now=Date.now()){
 const t={...previous,...body};if(!t.name||!t.serverId||!['restart','start','stop','message'].includes(t.action))throw new Error('Nom, serveur et action programmée requis.');
 if(t.intervalSeconds!==undefined)integer(t.intervalSeconds,0,2592000);
 if(t.intervalSeconds>0&&t.intervalSeconds<60)throw new Error('Intervalle minimum : 60 secondes.');
 if(!t.nextRunAt||!Number.isFinite(Date.parse(t.nextRunAt)))throw new Error('Date ISO valide requise (ex. 2026-10-05T02:00:00+02:00).');
 if(t.action==='message'&&(!t.message||/[\r\n\0]/.test(t.message)||t.message.length>500))throw new Error('Message de 1 à 500 caractères requis.');
 if(!previous.id&&Date.parse(t.nextRunAt)<now)throw new Error('Choisis une date future.');
 return t;
}
module.exports={account,change,transaction,createBounty,cancelBounty,expire,faction,treasury,linked,processEvent,settleBounty,validateTask,integer};
