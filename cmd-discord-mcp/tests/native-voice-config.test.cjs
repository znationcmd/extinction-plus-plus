"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const lib=import(pathToFileURL(path.join(__dirname,"..","cmd-native-voice-config.js")).href);
const G="11111111-1111-4111-8111-111111111111",C="22222222-2222-4222-8222-222222222222",auth={user:{id:"owner"}};
const url=()=>new URL("https://cmd.test/api/native/voice-config?guildId="+G+"&channelId="+C);
test("voice metadata migration is additive, default 64 kbps, no participant limit",async()=>{
 const {initCmdNativeVoiceConfig}=await lib,sql=[];
 await initCmdNativeVoiceConfig({query:async s=>{sql.push(s)}});
 assert.equal(sql.length,2);
 assert.match(sql[0],/ADD COLUMN IF NOT EXISTS voice_bitrate_kbps INTEGER NOT NULL DEFAULT 64/);
 assert.match(sql[1],/ADD COLUMN IF NOT EXISTS voice_user_limit INTEGER NOT NULL DEFAULT 0/);
 assert.ok(!sql.join(" ").includes("DELETE FROM"));
});
test("only bounded bitrate and capacity can be stored as bound arguments",async()=>{
 const {validateVoiceConfig,saveNativeVoiceConfig}=await lib;
 assert.deepEqual(validateVoiceConfig({bitrateKbps:96,userLimit:20}),{bitrateKbps:96,userLimit:20});
 for(const invalid of [{bitrateKbps:16,userLimit:10},{bitrateKbps:64,userLimit:100},{bitrateKbps:"x",userLimit:0},{bitrateKbps:64,userLimit:1.5},{bitrateKbps:64,userLimit:null}]){
  assert.throws(()=>validateVoiceConfig(invalid),e=>e.status===400);
 }
 let captured;
 const pool={async query(sql,args){captured={sql,args};return {rows:[{id:C}]}}};
 const result=await saveNativeVoiceConfig(pool,G,C,{bitrateKbps:128,userLimit:12});
 assert.equal(result.mediaEnforcementVerified,false);
 assert.deepEqual(captured.args,[G,C,128,12]);
 assert.match(captured.sql,/guild_id=\$1::uuid AND id=\$2::uuid AND type='voice'/);
});
test("native voice preferences require manageChannels, never grant it",async()=>{
 const {handleCmdNativeVoiceConfig:route}=await lib,send=[];
 const sendJson=(_r,status,value)=>send.push([status,value]);
 let reads=0;
 const pool={async query(sql){reads++;return {rows:[{id:C,voice_bitrate_kbps:64,voice_user_limit:0}]}}};
 const deps={pool,auth,sendJson,readBody:async()=>({guildId:G,channelId:C,bitrateKbps:64,userLimit:0}),
  requireNativePermission:async()=>{throw Error("No right")}};
 await route({method:"GET"},{},url(),deps);
 assert.equal(send.at(-1)[0],403);
 assert.equal(reads,0);
 await route({method:"GET"},{},url(),{...deps,auth:null});assert.equal(send.at(-1)[0],401);
 await route({method:"DELETE"},{},url(),deps);assert.equal(send.at(-1)[0],405);
 await route({method:"GET"},{},url(),{...deps,requireNativePermission:async()=>({manageChannels:true})});
 assert.equal(send.at(-1)[0],200);
 assert.equal(send.at(-1)[1].mediaEnforcementVerified,false);
});
test("existing native settings contains active voice configuration, not a UI mock",()=>{
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 const client=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
 assert.match(server,/handleCmdNativeVoiceConfig\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson,readBody:readFormBodyJson,requireNativePermission\}\)/);
 assert.match(server,/await initCmdNativeVoiceConfig\(pool\)/);
 assert.match(client,/voicecfg\|🎙\|Paramètres vocaux/);
 assert.match(client,/id="csm-native-voicecfg"/);
 assert.match(client,/loadNativeVoiceConfig\(/);
 assert.match(client,/application WebRTC à finaliser/);
});
