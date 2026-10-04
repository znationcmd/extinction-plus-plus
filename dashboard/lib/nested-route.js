import crypto from 'crypto';
import {readDb,writeDb} from './db';
import {guarded,activeGuild} from './dashboard-auth';
import {clean} from './collection-route';
export function nested(key,collections,fields){
  function name(req,body){const value=body?.collection||new URL(req.url).searchParams.get('collection')||collections[0];if(!collections.includes(value))throw new Error('Catégorie invalide.');return value;}
  const GET=guarded(async req=>{const db=await readDb();return Response.json(db[key]?.[name(req)]||[]);});
  async function mutate(req){const body=await req.json(),db=await readDb(),guildId=await activeGuild(),field=name(req,body);db[key]||={};const rows=db[key][field]||=[];const idx=rows.findIndex(x=>x.id===body.id);if(req.method!=='POST'&&idx<0)throw Object.assign(new Error('Élément introuvable.'),{status:404});if(req.method==='DELETE')rows.splice(idx,1);else{const data=clean(body,fields);if(req.method==='POST')rows.push({id:crypto.randomUUID(),...data,guildId,createdAt:new Date().toISOString()});else rows[idx]={...rows[idx],...data,guildId};}await writeDb(db);return Response.json({ok:true});}
  return {GET,POST:guarded(mutate),PATCH:guarded(mutate),DELETE:guarded(mutate)};
}
