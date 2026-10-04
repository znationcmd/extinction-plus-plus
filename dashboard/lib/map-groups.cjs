const crypto=require('node:crypto');
const model=require('./map-model.cjs');
const denied=()=>Object.assign(new Error('Accès refusé à ce groupe.'),{status:403});
function member(group,user){if(!group.members.some(m=>m.id===user.userId))throw denied();}
function owner(group,user){member(group,user);if(group.ownerId!==user.userId)throw Object.assign(new Error('Réservé au créateur du groupe.'),{status:403});}
function label(value){if(typeof value!=='string'||!value.trim()||value.trim().length>80)throw new Error('Nom requis, 80 caractères maximum.');return value.trim();}
function create(user,name){return {id:crypto.randomUUID(),name:label(name),ownerId:user.userId,members:[{id:user.userId,name:user.name}],pins:[],mapIds:[],createdAt:new Date().toISOString()};}
function hash(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Object.assign(new Error('Invitation invalide.'),{status:404});return crypto.createHash('sha256').update(token).digest('hex');}
function invite(group,user){owner(group,user);const token=crypto.randomBytes(32).toString('hex');group.inviteHash=hash(token);group.inviteExpires=Date.now()+7*24*3600000;return token;}
function join(group,user,token){if(!group.inviteHash||group.inviteHash!==hash(token)||group.inviteExpires<=Date.now())throw Object.assign(new Error('Invitation invalide ou expirée.'),{status:404});if(!group.members.some(m=>m.id===user.userId)){if(group.members.length>=100)throw new Error('Limite de 100 membres atteinte.');group.members.push({id:user.userId,name:user.name});}}
function change(group,user,body){
  member(group,user);
  if(body.action==='leave'){if(group.ownerId===user.userId)throw new Error('Transfère le groupe à un membre avant de le quitter.');group.members=group.members.filter(m=>m.id!==user.userId);return;}
  owner(group,user);
  if(body.action==='rename')group.name=label(body.name);
  else if(body.action==='remove'){if(body.memberId===group.ownerId)throw new Error('Le créateur ne peut pas être exclu.');group.members=group.members.filter(m=>m.id!==body.memberId);}
  else if(body.action==='transfer'){if(!group.members.some(m=>m.id===body.memberId))throw new Error('Choisis un membre du groupe.');group.ownerId=body.memberId;delete group.inviteHash;delete group.inviteExpires;}
  else if(body.action==='revoke'){delete group.inviteHash;delete group.inviteExpires;}
  else throw new Error('Action inconnue.');
}
function pin(group,user,map,body,method){member(group,user);const idx=group.pins.findIndex(p=>p.id===body.id&&p.mapId===map.id);if(method!=='POST'&&idx<0)throw Object.assign(new Error('Marqueur introuvable.'),{status:404});if(idx>=0&&group.pins[idx].actorId!==user.userId&&group.ownerId!==user.userId)throw Object.assign(new Error('Seul l’auteur ou le créateur du groupe peut modifier ce marqueur.'),{status:403});if(method==='DELETE')group.pins.splice(idx,1);else{if(idx<0&&group.pins.length>=1000)throw new Error('Limite de 1000 marqueurs atteinte.');const value={...model.validPin(map,body),id:idx>=0?group.pins[idx].id:crypto.randomUUID(),mapId:map.id,actorId:idx>=0?group.pins[idx].actorId:user.userId,updatedAt:new Date().toISOString()};if(idx>=0)group.pins[idx]=value;else group.pins.push(value);}}
function safe(group){const {inviteHash,inviteExpires,...value}=group;return value;}
module.exports={member,owner,create,hash,invite,join,change,pin,safe};
