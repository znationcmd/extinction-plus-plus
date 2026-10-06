const crypto=require('node:crypto');
const battlepass=require('./battlepass.cjs');

const PAYPAL_URL='https://www.paypal.me/ZnationCmdofficiel';
const PLANS={
 multiserver:{name:'Premium Multi-serveur',maxServers:20,monthly:{amountCents:299,days:30},yearly:{amountCents:2500,days:365}},
 battlepass:{name:'Pass de combat Premium',maxServers:0,monthly:{amountCents:299,days:30},yearly:{amountCents:2500,days:365}}
};
const hash=s=>crypto.createHash('sha256').update(String(s).trim().toUpperCase()).digest('hex');
function bad(message,status=400){throw Object.assign(new Error(message),{status})}
function plan(product,billing){const p=PLANS[product],b=p?.[billing];if(!p||!b)bad('Offre Premium invalide.');return {...p,...b,product,billing};}
function code(product){return `VAL-${product==='multiserver'?'MULTI':'PASS'}-${crypto.randomBytes(9).toString('base64url').toUpperCase()}`;}
function activeRows(db,guildId,product){const now=Date.now();return (db.premiumSubscriptions||[]).filter(x=>String(x.guildId)===String(guildId)&&x.product===product&&Date.parse(x.expiresAt)>now);}
function lifetime(guildId,userId,product){return {id:`owner-lifetime-${product}`,guildId:String(guildId),userId:String(userId),product,startsAt:'2026-01-01T00:00:00.000Z',expiresAt:'9999-12-31T23:59:59.999Z',complimentary:true};}
function multiActive(db,guildId,complimentary=false,userId='owner'){if(complimentary)return lifetime(guildId,userId,'multiserver');return activeRows(db,guildId,'multiserver').sort((a,b)=>Date.parse(b.expiresAt)-Date.parse(a.expiresAt))[0]||null;}
function battleActive(db,guildId,userId,complimentary=false){if(complimentary)return lifetime(guildId,userId,'battlepass');return activeRows(db,guildId,'battlepass').filter(x=>String(x.userId)===String(userId)).sort((a,b)=>Date.parse(b.expiresAt)-Date.parse(a.expiresAt))[0]||null;}
function serverLimit(db,guildId,complimentary=false,userId='owner'){return multiActive(db,guildId,complimentary,userId)?20:1;}
function status(db,guildId,userId,complimentary=false){return {paypalUrl:PAYPAL_URL,plans:PLANS,multiserver:multiActive(db,guildId,complimentary,userId),battlepass:battleActive(db,guildId,userId,complimentary),maxServers:serverLimit(db,guildId,complimentary,userId),complimentary:Boolean(complimentary)};}
function requestPayment(db,guildId,userId,product,billing){
 const p=plan(product,billing),id=crypto.randomUUID(),reference=`VAL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
 db.premiumPaymentRequests||=[];const row={id,guildId,userId,product,billing,amountCents:p.amountCents,reference,status:'pending',createdAt:new Date().toISOString()};db.premiumPaymentRequests.push(row);return {...row,paypalUrl:PAYPAL_URL,amount:(p.amountCents/100).toFixed(2)+' €'};
}
function generateCode(db,actor,product,billing){
 const p=plan(product,billing),plain=code(product),row={id:crypto.randomUUID(),codeHash:hash(plain),product,billing,durationDays:p.days,maxServers:p.maxServers,createdBy:String(actor),createdAt:new Date().toISOString(),usedBy:null,usedGuild:null,usedAt:null};
 db.premiumCodes||=[];db.premiumCodes.push(row);return {...row,code:plain,codeHash:undefined};
}
function approvePayment(db,actor,id){
 const req=(db.premiumPaymentRequests||[]).find(x=>x.id===id);if(!req)bad('Demande introuvable.',404);if(req.status!=='pending')bad('Demande déjà traitée.');
 const generated=generateCode(db,actor,req.product,req.billing);req.status='approved';req.validatedAt=new Date().toISOString();return {...generated,reference:req.reference,userId:req.userId,guildId:req.guildId};
}
function redeem(db,guildId,userId,plain){
 const row=(db.premiumCodes||[]).find(x=>x.codeHash===hash(plain));if(!row)bad('Code d’activation invalide.');if(row.usedAt)bad('Ce code a déjà été utilisé.');
 const now=Date.now(),current=row.product==='multiserver'?multiActive(db,guildId):battleActive(db,guildId,userId);
 const base=current&&Date.parse(current.expiresAt)>now?Date.parse(current.expiresAt):now,expiresAt=new Date(base+Number(row.durationDays)*86400000).toISOString();
 db.premiumSubscriptions||=[];const sub={id:crypto.randomUUID(),guildId,userId,product:row.product,startsAt:new Date().toISOString(),expiresAt,sourceCodeId:row.id,createdAt:new Date().toISOString()};db.premiumSubscriptions.push(sub);
 row.usedBy=userId;row.usedGuild=guildId;row.usedAt=new Date().toISOString();
 if(row.product==='battlepass'){
   db.battlepass||={levels:[]};const season=battlepass.active(db.battlepass);if(season){season.premiumUsers||=[];if(!season.premiumUsers.includes(userId))season.premiumUsers.push(userId);}
 }
 return {...sub,maxServers:row.product==='multiserver'?20:0};
}
function admin(db){return {requests:(db.premiumPaymentRequests||[]).slice().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)),codes:(db.premiumCodes||[]).map(({codeHash,...x})=>x),subscriptions:(db.premiumSubscriptions||[]).slice().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))};}
function operator(userId,projectOwner=false){if(projectOwner)return true;const ids=String(process.env.PREMIUM_ADMIN_DISCORD_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);if(!ids.includes(String(userId)))bad('Administration Premium non autorisée. Configure PREMIUM_ADMIN_DISCORD_IDS.',403);return true;}
module.exports={PAYPAL_URL,PLANS,status,requestPayment,generateCode,approvePayment,redeem,admin,serverLimit,multiActive,battleActive,operator};