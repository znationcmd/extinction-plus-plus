const crypto=require('node:crypto');
function config(db,guildId){return db.battlepasses?.[guildId]||db.battlepass||{levels:[]};}
function active(bp,now=Date.now()){return (bp.seasons||[]).find(s=>Date.parse(s.startsAt)<=now&&now<Date.parse(s.endsAt))||null;}
function progress(db,guildId,userId,season){const p=db.guilds?.[guildId]?.progress?.[userId];return season?p?.seasons?.[season.id]||{xp:0,claimed:[]}:p||{xp:0,claimed:[]};}
function date(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,9})?)?(Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Date ISO avec fuseau horaire requise.');return new Date(value).toISOString();}
function mutate(bp,body,method,now=Date.now()){
 bp.levels||=[];bp.seasons||=[];
 const collection=body.collection||'levels';
 if(collection==='premium'){const userId=String(body.userId||'');if(!/^\d{15,22}$/.test(userId))throw new Error('ID Discord requis.');const season=body.seasonId?bp.seasons.find(s=>s.id===body.seasonId):null;if(body.seasonId&&!season)throw new Error('Saison introuvable.');const target=season||bp;target.premiumUsers||=[];if(method==='DELETE')target.premiumUsers=target.premiumUsers.filter(v=>v!==userId);else if(!target.premiumUsers.includes(userId)){if(target.premiumUsers.length>=10000)throw new Error('Limite premium atteinte.');target.premiumUsers.push(userId);}return;}
 if(collection==='seasons'){
  const old=bp.seasons.find(s=>s.id===body.id);
  if(method!=='POST'&&!old)throw new Error('Saison introuvable.');
  if(old&&Date.parse(old.startsAt)<=now)throw new Error('Une saison commencée est conservée et ne peut plus être modifiée.');
  if(method==='DELETE'){bp.seasons=bp.seasons.filter(s=>s!==old);return;}
  const name=body.name??old?.name,startsAt=date(body.startsAt??old?.startsAt),endsAt=date(body.endsAt??old?.endsAt);
  if(typeof name!=='string'||!name.trim()||name.length>100)throw new Error('Nom de saison requis (100 caractères maximum).');
  if(Date.parse(startsAt)>=Date.parse(endsAt)||Date.parse(endsAt)<=now)throw new Error('La fin doit suivre le début et être dans le futur.');
  if(bp.seasons.some(s=>s!==old&&Date.parse(startsAt)<Date.parse(s.endsAt)&&Date.parse(endsAt)>Date.parse(s.startsAt)))throw new Error('Deux saisons ne peuvent pas se chevaucher.');
  if(old)Object.assign(old,{name:name.trim(),startsAt,endsAt});
  else {if(bp.seasons.length>=100)throw new Error('Limite de 100 saisons atteinte.');bp.seasons.push({id:crypto.randomUUID(),name:name.trim(),startsAt,endsAt,levels:structuredClone(bp.levels),createdAt:new Date(now).toISOString()});}
  return;
 }
 if(collection!=='levels')throw new Error('Catégorie invalide.');
 const season=body.seasonId?bp.seasons.find(s=>s.id===body.seasonId):null;
 if(body.seasonId&&!season)throw new Error('Saison introuvable.');
 if(season&&Date.parse(season.startsAt)<=now)throw new Error('Les niveaux d’une saison commencée sont figés.');
 const rows=season?season.levels:bp.levels,idx=rows.findIndex(l=>l.id===body.id);
 if(method!=='POST'&&idx<0)throw new Error('Niveau introuvable.');
 if(method==='DELETE'){rows.splice(idx,1);return;}
 const item={...(idx>=0?rows[idx]:{}),id:idx>=0?rows[idx].id:crypto.randomUUID()};
 for(const key of ['level','xp','reward']){const v=body[key]??item[key]??(key==='reward'?0:undefined);if(!Number.isSafeInteger(v)||v<0||(key==='level'&&v===0))throw new Error(`${key} invalide.`);item[key]=v;}
 if(body.premium!==undefined&&typeof body.premium!=='boolean')throw new Error('Premium invalide.');item.premium=body.premium??item.premium??false;
 for(const key of ['game','serverId'])if(body[key]!==undefined){if(typeof body[key]!=='string')throw new Error('Jeu ou serveur invalide.');item[key]=key==='game'&&body[key]?require('./games.cjs').normalize(body[key]):body[key];}
 if(rows.some(l=>l.id!==item.id&&l.level===item.level&&!!l.premium===item.premium&&(l.game||'')===(item.game||'')&&(l.serverId||'')===(item.serverId||'')))throw new Error('Ce niveau existe déjà sur cette piste.');
 if(method==='POST'){if(rows.length>=1000)throw new Error('Limite de 1000 niveaux atteinte.');rows.push(item);}else rows[idx]=item;
}
// Validation time controls rewards; submission time determines which season owns the XP.
function earn(db,guildId,userId,xp,proof,credit,now=Date.now()){
 const bp=config(db,guildId),p=db.guilds[guildId].progress[userId];
 if(!Number.isSafeInteger(xp)||xp<0||!Number.isSafeInteger(p.xp+xp))throw new Error('XP invalide.');
 p.xp+=xp;
 const seasonal=(bp.seasons||[]).length>0,season=active(bp,now);
 const submitted=proof.createdAt?Date.parse(proof.createdAt):now;
 if(seasonal&&(!season||!Number.isFinite(submitted)||submitted<Date.parse(season.startsAt)||submitted>=Date.parse(season.endsAt)))return;
 let target=p,levels=bp.levels||[];
 if(season){p.seasons||={};target=p.seasons[season.id]||={xp:0,claimed:[]};if(!Number.isSafeInteger(target.xp+xp))throw new Error('XP trop élevé.');target.xp+=xp;levels=season.levels;proof.seasonId=season.id;}
 const scope=[proof.game?require('./games.cjs').normalize(proof.game):'',proof.serverId||''].join(':');target.scopes||={};const scoped=target.scopes[scope]||={xp:0};scoped.xp+=xp;
 for(const l of levels){const eligibleXp=l.game||l.serverId?Object.entries(target.scopes).filter(([k])=>{const [g,s]=k.split(':');return (!l.game||l.game===g)&&(!l.serverId||l.serverId===s);}).reduce((n,[,v])=>n+v.xp,0):target.xp;
 if((!l.premium||(season||bp).premiumUsers?.includes(userId))&&eligibleXp>=l.xp&&!(target.claimed||=[]).includes(l.id)){credit(db,guildId,userId,l.reward||0,`Battle Pass ${season?.name||'historique'} — niveau ${l.level}`);target.claimed.push(l.id);}}
}
module.exports={config,active,progress,mutate,earn};
