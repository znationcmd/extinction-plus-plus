"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const lib=import(pathToFileURL(path.join(__dirname,"..","cmd-native-automod.js")).href);
const GUILD="11111111-1111-4111-8111-111111111111",auth={user:{id:"alice"}};
const url=(args={})=>new URL("https://cmd.test/api/native/automod?"+new URLSearchParams({guildId:GUILD,...args}));
test("native AutoMod starts off, creates only additive per-server storage",async()=>{
 const {initCmdNativeAutoMod,getCmdNativeAutoMod}=await lib,queries=[];
 const pool={async query(sql,args=[]){queries.push({sql,args});return {rows:[]}}};
 await initCmdNativeAutoMod(pool);
 assert.equal(queries.length,1);
 assert.match(queries[0].sql,/CREATE TABLE IF NOT EXISTS cmd_native_automod_rules/);
 assert.match(queries[0].sql,/enabled BOOLEAN NOT NULL DEFAULT FALSE/);
 const settings=await getCmdNativeAutoMod(pool,GUILD);
 assert.deepEqual(settings,{guildId:GUILD,enabled:false,blockedTerms:[]});
 assert.equal(queries.at(-1).args[0],GUILD);
});
test("config is strict, capped, de-duplicates terms and safely parameters SQL",async()=>{
 const {validateCmdAutoMod, setCmdNativeAutoMod}=await lib;
 const result=validateCmdAutoMod({enabled:true,blockedTerms:["Spam","spam","Mauvais mot"]});
 assert.deepEqual(result,{enabled:true,blockedTerms:["Spam","Mauvais mot"]});
 for(const bad of [{enabled:"true",blockedTerms:[]},{enabled:true,blockedTerms:["a"]},{enabled:true,blockedTerms:["<tag>"]},{enabled:true,blockedTerms:Array(41).fill("spam")}]){
  assert.throws(()=>validateCmdAutoMod(bad),e=>e.status===400);
 }
 let saved;
 const pool={async query(sql,args){saved={sql,args};return {rows:[{enabled:true,blocked_terms:JSON.parse(args[2])}]}}};
 const update=await setCmdNativeAutoMod(pool,GUILD,{enabled:true,blockedTerms:["Mot interdit"]});
 assert.equal(update.enabled,true);
 assert.deepEqual(update.blockedTerms,["Mot interdit"]);
 assert.match(saved.sql,/ON CONFLICT\(guild_id\) DO UPDATE/);
 assert.equal(saved.args[0],GUILD);
 assert.equal(saved.args[2],'["Mot interdit"]');
 assert.ok(!saved.sql.includes("Mot interdit"));
});
test("word block is opt-in, case insensitive and only tests native message bodies",async()=>{
 const {guardCmdNativeAutoMod:guard}=await lib;
 const pool=(enabled)=>({async query(){return {rows:[{enabled,blocked_terms:["spam","insulte"]}]}}});
 const member=async()=>({membership_role:"member"});
 assert.deepEqual(await guard(pool(false),GUILD,"SPAM",auth,{nativeMembership:member}),{allowed:true});
 await assert.rejects(guard(pool(true),GUILD,"Le message contient SpAm",auth,{nativeMembership:member}),e=>e.status===422);
 assert.deepEqual(await guard(pool(true),GUILD,"Bonjour !",auth,{nativeMembership:member}),{allowed:true});
 assert.equal((await guard(pool(true),GUILD,"spam",auth,{nativeMembership:async()=>({membership_role:"owner"})})).bypass,"server_administration");
});
test("AutoMod settings are owner-only on GET and PATCH and response is private",async()=>{
 const {handleCmdNativeAutoMod:route}=await lib;
 const calls=[],sent=[],headers=[],sendJson=(_r,status,value)=>sent.push([status,value]);
 const pool={async query(sql,args){calls.push([sql,args]);if(sql.startsWith("SELECT"))return {rows:[{enabled:false,blocked_terms:[]}]};return {rows:[{enabled:true,blocked_terms:["spam"]}]}}};
 const deps={pool,auth,sendJson,readBody:async()=>({guildId:GUILD,enabled:true,blockedTerms:["spam"]}),requireNativeOwner:async()=>({membership_role:"owner"})};
 assert.equal(await route({method:"GET"},{},new URL("https://cmd.test/nope"),deps),false);
 await route({method:"GET"},{},url(),{...deps,auth:null});assert.equal(sent.at(-1)[0],401);
 await route({method:"POST"},{},url(),deps);assert.equal(sent.at(-1)[0],405);
 await route({method:"GET"},{},url(),{...deps,requireNativeOwner:async()=>{throw Error("not owner")}});
 assert.equal(sent.at(-1)[0],403);assert.equal(calls.length,0);
 await route({method:"PATCH"},{setHeader:(k,v)=>headers.push([k,v])},url(),deps);
 assert.equal(sent.at(-1)[0],200);
 assert.ok(headers.some(([key,value])=>key==="Cache-Control"&&value==="private, no-store"));
});
test("native message pipeline runs AutoMod before persistence, XP, mentions or notifications",()=>{
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
 const method=server.slice(server.indexOf("async function sendNativeChannelMessage"),server.indexOf("async function updateNativeOverview"));
 assert.ok(method.indexOf("await guardCmdNativeAutoMod(")>0);
 assert.ok(method.indexOf("await guardCmdNativeAutoMod(")<method.indexOf("saveNativeMessageWithSlowmode("));
 assert.match(server,/handleCmdNativeAutoMod\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson,readBody:readFormBodyJson,requireNativeOwner\}\)/);
 assert.match(manager,/id="csm-native-automod"/);
 assert.match(manager,/loadNativeAutoMod\(/);
 assert.match(manager,/bloquage|Filtrage activé|blocage/i);
});
