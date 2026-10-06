import crypto from 'crypto';
import {readDb,writeDb} from '../../../lib/db';
import {activeGuild,guarded} from '../../../lib/dashboard-auth';

const allowed=/^[a-z0-9-]{2,60}$/;
const cleanText=(v,max=4000)=>typeof v==='string'?v.slice(0,max):'';

function keyFrom(req){
  const key=new URL(req.url).searchParams.get('key')||'';
  if(!allowed.test(key))throw Object.assign(new Error('Module invalide.'),{status:400});
  return key;
}

export const GET=guarded(async req=>{
  const guildId=await activeGuild(),key=keyFrom(req),db=await readDb();
  const rows=(db.discordModules||[]).filter(x=>x.guildId===guildId&&x.key===key);
  return Response.json(rows);
});

export const POST=guarded(async req=>{
  const guildId=await activeGuild(),key=keyFrom(req),body=await req.json(),db=await readDb();
  db.discordModules||=[];
  let item=db.discordModules.find(x=>x.guildId===guildId&&x.key===key);
  const data={
    name:cleanText(body.name||body.title||key,120),
    enabled:body.enabled!==false,
    channelId:cleanText(body.channelId,64),
    roleIds:Array.isArray(body.roleIds)?body.roleIds.map(x=>cleanText(x,64)).filter(Boolean).slice(0,100):[],
    message:cleanText(body.message),
    config:cleanText(body.config)
  };
  if(item)Object.assign(item,data,{updatedAt:new Date().toISOString()});
  else{item={id:crypto.randomUUID(),guildId,key,...data,createdAt:new Date().toISOString()};db.discordModules.push(item);}
  await writeDb(db);return Response.json({ok:true,item});
});

export const PATCH=POST;

export const DELETE=guarded(async req=>{
  const guildId=await activeGuild(),key=keyFrom(req),body=await req.json(),db=await readDb();
  db.discordModules=(db.discordModules||[]).filter(x=>!(x.guildId===guildId&&x.key===key&&(!body.id||x.id===body.id)));
  await writeDb(db);return Response.json({ok:true});
});
