"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const lib=import(pathToFileURL(path.join(__dirname,"..","cmd-native-raid-protection.js")).href);
const GUILD="11111111-1111-4111-8111-111111111111",OWNER={user:{id:"owner-1"}};
function pool({enabled=true,joins=8,maxJoins=8,windowMinutes=10,member=false}={}){
 const calls=[];
 return {calls,async query(sql,args=[]){
  calls.push({sql,args});
  if(sql.startsWith("SELECT enabled,max_joins"))return {rows:[{enabled,max_joins:maxJoins,window_minutes:windowMinutes}]};
  if(sql.startsWith("SELECT pg_advisory_xact_lock"))return {rows:[{}]};
  if(sql.startsWith("SELECT 1 FROM cmd_native_members"))return {rows:member?[{one:1}]:[]};
  if(sql.includes("COUNT(*)::integer AS count"))return {rows:[{count:joins}]};
  if(sql.includes("INSERT INTO cmd_native_raid_settings"))return {rows:[{enabled,max_joins:maxJoins,window_minutes:windowMinutes}]};
  return {rows:[]};
 }};
}
test("raid protection schema is additive, indexed, and opt-in by default",async()=>{
 const {initCmdNativeRaidProtection:boot}=await lib,sql=[];
 await boot({query:async q=>{sql.push(q);return {rows:[]}}});
 assert.equal(sql.length,2);
 assert.match(sql[0],/CREATE TABLE IF NOT EXISTS cmd_native_raid_settings/);
 assert.match(sql[0],/enabled BOOLEAN NOT NULL DEFAULT FALSE/);
 assert.match(sql[0],/FOREIGN KEY|REFERENCES cmd_native_guilds/);
 assert.match(sql[1],/CREATE INDEX IF NOT EXISTS cmd_native_members_guild_joined_idx/);
 assert.ok(!sql.join(" ").includes("DELETE FROM"));
});
test("only verified native guild owner can inspect or change anti-raid policy",async()=>{
 const {getNativeRaidSettings:get,updateNativeRaidSettings:set}=await lib,db=pool();
 await assert.rejects(get(db,OWNER,{guildId:GUILD},{requireNativeOwner:async()=>{throw Error("no")}}),e=>e.status===403);
 assert.equal(db.calls.length,0);
 const guard=async()=>({});
 const state=await get(db,OWNER,{guildId:GUILD},{requireNativeOwner:guard});
 assert.equal(state.enabled,true);assert.equal(state.maxJoins,8);
 for(const bad of [{enabled:true,maxJoins:2,windowMinutes:10},{enabled:true,maxJoins:8,windowMinutes:61},{enabled:"true",maxJoins:8,windowMinutes:10},{enabled:false,maxJoins:8.5,windowMinutes:10}]){
  await assert.rejects(set(db,OWNER,{guildId:GUILD,...bad},{requireNativeOwner:guard}),e=>e.status===400);
 }
 assert.equal(db.calls.length,1);
 const output=await set(db,OWNER,{guildId:GUILD,enabled:true,maxJoins:8,windowMinutes:10},{requireNativeOwner:guard});
 assert.equal(output.enabled,true);
 assert.equal(db.calls[1].args[0],GUILD);
 assert.match(db.calls[1].sql,/ON CONFLICT\(guild_id\) DO UPDATE/);
 assert.doesNotMatch(db.calls[1].sql,/DROP|DELETE|TRUNCATE/);
});
test("disabled protection never restricts existing invitation logic",async()=>{
 const {guardNativeRaidAdmission:guard}=await lib,db=pool({enabled:false});
 const result=await guard(db,{guildId:GUILD,userId:"alice"});
 assert.equal(result.checked,false);
 assert.equal(db.calls.length,1);
 assert.ok(!db.calls.some(x=>x.sql.includes("COUNT(*)")));
});
test("guard serializes joins; returning members are exempt and do not count again",async()=>{
 const {guardNativeRaidAdmission:guard}=await lib,db=pool({member:true,joins:999});
 const result=await guard(db,{guildId:GUILD,userId:"alice"});
 assert.equal(result.existing,true);
 assert.equal(db.calls.length,3);
 assert.match(db.calls[1].sql,/pg_advisory_xact_lock/);
 assert.ok(!db.calls.some(x=>x.sql.includes("COUNT(*)")));
});
test("active threshold temporarily rejects a fresh join without kicking or banning anyone",async()=>{
 const {guardNativeRaidAdmission:guard}=await lib,db=pool({enabled:true,joins:8,maxJoins:8,windowMinutes:10});
 await assert.rejects(guard(db,{guildId:GUILD,userId:"fresh"}),e=>e.status===429&&e.retryAfter===600);
 assert.deepEqual(db.calls.map(x=>x.sql.includes("pg_advisory_xact_lock")?"LOCK":x.sql.includes("COUNT(*)")?"COUNT":x.sql.includes("SELECT 1")?"CHECK":"POLICY"),["POLICY","LOCK","CHECK","COUNT"]);
 const count=db.calls.at(-1);
 assert.deepEqual(count.args,[GUILD,10]);
 for(const call of db.calls)assert.doesNotMatch(call.sql,/\b(BAN|KICK|DELETE|INSERT INTO cmd_native_members)\b/i);
});
test("below threshold accepts newcomer; invalid values denied before any query",async()=>{
 const {guardNativeRaidAdmission:guard}=await lib,db=pool({enabled:true,joins:7,maxJoins:8});
 const status=await guard(db,{guildId:GUILD,userId:"fresh"});
 assert.equal(status.allowed,true);assert.equal(status.existing,false);
 const before=db.calls.length;
 await assert.rejects(guard(db,{guildId:"bad",userId:"fresh"}),e=>e.status===400);
 assert.equal(db.calls.length,before);
});
test("security API validates authentication, request method and owner access",async()=>{
 const {handleNativeRaidProtection:route}=await lib,db=pool(),responses=[];
 const sendJson=(_res,status,data)=>responses.push({status,data});
 const context={pool:db,auth:OWNER,sendJson,readBody:async()=>({guildId:GUILD,enabled:true,maxJoins:8,windowMinutes:10}),requireNativeOwner:async()=>({})};
 assert.equal(await route({method:"GET"},{},new URL("https://cmd.test/api/other"),context),false);
 await route({method:"POST"},{},new URL("https://cmd.test/api/native/security/raid"),{...context,auth:null});
 assert.equal(responses.at(-1).status,401);
 await route({method:"DELETE"},{},new URL("https://cmd.test/api/native/security/raid"),context);
 assert.equal(responses.at(-1).status,405);
 await route({method:"GET"},{},new URL("https://cmd.test/api/native/security/raid?guildId=bad"),context);
 assert.equal(responses.at(-1).status,400);
 await route({method:"GET"},{setHeader(){}},new URL("https://cmd.test/api/native/security/raid?guildId="+GUILD),context);
 assert.equal(responses.at(-1).status,200);
});
test("production native invite path uses guard inside same transaction; server owner sees working settings",()=>{
 const root=path.join(__dirname,"..");
 const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
 const invites=fs.readFileSync(path.join(root,"cmd-native-invites.js"),"utf8");
 const settings=fs.readFileSync(path.join(root,"cmd-server-manager.js"),"utf8");
 assert.match(server,/await initCmdNativeRaidProtection\(pool\)/);
 assert.match(server,/joinNativeInvite\(pool,auth,code,\{beforeJoin:guardNativeRaidAdmission\}\)/);
 assert.match(invites,/await assertCmdInviteVerification\(client,g.id,user\)/);
 assert.match(invites,/if\(typeof beforeJoin==='function'\)await beforeJoin\(client,\{guildId:String\(g.id\),userId:user\}\)/);
 assert.ok(invites.indexOf("await beforeJoin(client")>invites.indexOf("await assertCmdInviteVerification(client"));
 assert.ok(invites.indexOf("await beforeJoin(client")<invites.indexOf("INSERT INTO cmd_native_members(guild_id,user_id"));
 assert.match(settings,/id="csm-native-raid"/);
 assert.match(settings,/api\/native\/security\/raid/);
 assert.match(settings,/data-csm-tab/);
});
