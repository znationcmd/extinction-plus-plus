"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const mod=import(pathToFileURL(path.join(__dirname,"..","cmd-native-afk-config.js")).href);
const G="11111111-1111-4111-8111-111111111111",C="22222222-2222-4222-8222-222222222222",auth={user:{id:"owner-1"}};
const url=()=>new URL("https://cmd.test/api/native/voice-afk?guildId="+G);
test("AFK schema is additive and does not move audio peers",async()=>{
 const {initCmdNativeAfk}=await mod,queries=[];
 await initCmdNativeAfk({query:async sql=>{queries.push(sql)}});
 assert.match(queries[0],/CREATE TABLE IF NOT EXISTS cmd_native_afk_settings/);
 assert.match(queries[0],/channel_id UUID REFERENCES cmd_native_channels\(id\) ON DELETE SET NULL/);
 assert.doesNotMatch(queries.join(" "),/TRUNCATE|DROP TABLE/);
});
test("safe AFK bounds, no cross-guild channel, no disconnections",async()=>{
 const {parseNativeAfkInput:set,getCmdNativeAfk:read,setCmdNativeAfk:save}=await mod;
 assert.deepEqual(set({channelId:null,timeoutSeconds:300}),{channelId:null,timeoutSeconds:300});
 for(const item of [{channelId:"abc",timeoutSeconds:300},{channelId:C,timeoutSeconds:5},{channelId:C,timeoutSeconds:"oops"}]){
  assert.throws(()=>set(item),e=>e.status===400);
 }
 const calls=[];
 const pool={async query(sql,args){calls.push({sql,args});
  if(sql.includes("FROM cmd_native_channels"))return {rows:[{id:C}]};
  if(sql.includes("INSERT INTO cmd_native_afk_settings"))return {rows:[{channelId:C,timeoutSeconds:600}]};
  return {rows:[]};
 }};
 const configured=await save(pool,G,{channelId:C,timeoutSeconds:600});
 assert.equal(configured.moveEnforced,false);
 assert.equal(configured.channelId,C);
 assert.match(calls[0].sql,/guild_id=\$1::uuid AND id=\$2::uuid AND type='voice'/);
 assert.deepEqual(calls[0].args,[G,C]);
 const initial=await read(pool,G);
 assert.equal(initial.channelId,null);
 assert.equal(initial.moveEnforced,false);
});
test("GET and PATCH only, require owner and never query outside authorized guild",async()=>{
 const {handleNativeAfk:route}=await mod,records=[];
 let calls=0;
 const pool={async query(sql,args){calls++;return {rows:[]}}};
 const sendJson=(_r,status,value)=>records.push([status,value]);
 const deps={pool,auth,sendJson,readBody:async()=>({guildId:G,channelId:null,timeoutSeconds:300}),requireNativeOwner:async()=>{throw Error("denied")}};
 await route({method:"GET"},{},url(),{...deps,auth:null});assert.equal(records.at(-1)[0],401);
 await route({method:"POST"},{},url(),deps);assert.equal(records.at(-1)[0],405);
 await route({method:"GET"},{},url(),deps);assert.equal(records.at(-1)[0],403);
 assert.equal(calls,0);
 await route({method:"GET"},{},url(),{...deps,requireNativeOwner:async()=>({membership_role:"owner"})});
 assert.equal(records.at(-1)[0],200);
});
test("native UI labels AFK as preference and does not claim active WebRTC moves",()=>{
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 const settings=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
 assert.match(server,/await initCmdNativeAfk\(pool\)/);
 assert.match(server,/handleNativeAfk\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson,readBody:readFormBodyJson,requireNativeOwner\}\)/);
 assert.match(settings,/id="csm-native-afk"/);
 assert.match(settings,/loadNativeAfk\(/);
 assert.match(settings,/déplacement automatique à finaliser/);
});
