import crypto from 'crypto';
import {readDb,writeDb} from './db';
import {activeGuild,guarded} from './dashboard-auth';
import games from './games.cjs';
const blocked=['__proto__','constructor','prototype'];
export function clean(body,fields) {
  if(!body || Array.isArray(body) || typeof body!=='object')throw new Error('Objet JSON requis.');
  const data={};
  for(const [key,type] of Object.entries(fields)) {
    if(blocked.includes(key))throw new Error('Champ interdit.');
    if(body[key]===undefined)continue;
    const value=body[key];
    if(type==='numberSigned'&&!Number.isFinite(value))throw new Error(`${key} doit être un nombre fini.`);
    if(type==='number' && (!Number.isFinite(value)||value<0))throw new Error(`${key} doit être un nombre positif ou nul.`);
    if(type==='integer' && (!Number.isSafeInteger(value)||value<0))throw new Error(`${key} doit être un entier positif ou nul.`);
    if(type==='string' && (typeof value!=='string'||value.length>4000))throw new Error(`${key} doit être un texte de 4000 caractères maximum.`);
    if(type==='boolean' && typeof value!=='boolean')throw new Error(`${key} doit être vrai ou faux.`);
    if(type==='strings' && (!Array.isArray(value)||value.length>100||value.some(x=>typeof x!=='string'||x.length>100)))throw new Error(`${key} invalide.`);
    data[key]=value;
  }
  if(data.game)data.game=games.normalize(data.game,data.platform);
  return data;
}
export const common={name:'string',title:'string',description:'string',game:'string',serverId:'string',enabled:'boolean'};
export function collection(key,fields=common,{guildShop=false,readOnly=false,validate}={}) {
  async function list(db,id){if(guildShop){db.guilds[id]||={id,servers:[],shop:[]};return db.guilds[id].shop||=[];}return db[key]||=[];}
  const GET=guarded(async()=>{const db=await readDb();return Response.json(await list(db,await activeGuild()));});
  async function mutate(req,remove=false) {
    const id=await activeGuild(),body=await req.json(),db=await readDb(),items=await list(db,id);
    const target=items.findIndex(x=>x.id===body.id);
    if(req.method!=='POST' && target<0)throw Object.assign(new Error('Élément introuvable.'),{status:404});
    if(remove)items.splice(target,1);
    else {
      const data=clean(body,fields);
      if(data.serverId && ![...(db.connectedServers||[]),...(db.guilds[id]?.servers||[])].some(s=>s.id===data.serverId||s.name===data.serverId))throw new Error('Serveur introuvable dans ce Discord.');
      if(validate)validate({...items[target],...data},db,id);
      if(req.method==='POST')items.push({id:crypto.randomUUID(),...data,guildId:id,createdAt:new Date().toISOString()});
      else items[target]={...items[target],...data,guildId:id,updatedAt:new Date().toISOString()};
    }
    await writeDb(db);return Response.json({ok:true,item:remove?undefined:items[req.method==='POST'?items.length-1:target]});
  }
  return {GET,...readOnly?{}:{POST:guarded(req=>mutate(req)),PATCH:guarded(req=>mutate(req)),DELETE:guarded(req=>mutate(req,true))}};
}
