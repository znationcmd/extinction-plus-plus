"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const lib=import(pathToFileURL(path.join(__dirname,"..","cmd-native-rules-screening.js")).href);
const gid="11111111-1111-4111-8111-111111111111",auth={user:{id:"member-1"}};
const member=async()=>({membership_role:"member"}),owner=async()=>({membership_role:"owner"});
function fakePool({enabled=true,version=3,accepted=2}={}){
 const calls=[];
 return {calls,async query(sql,args=[]){
  calls.push({sql,args});
  if(sql.startsWith("SELECT enabled,rules_text"))return {rows:[{enabled,rules_text:"Merci de respecter tous les membres.",version}]};
  if(sql.startsWith("SELECT version,accepted_at"))return {rows:accepted===null?[]:[{version:accepted,accepted_at:"2026-10-18T09:00:00Z"}]};
  if(sql.startsWith("INSERT INTO cmd_native_rules_screening"))return {rows:[{enabled:true,rules_text:"Nouveau règlement",version:version+1}]};
  if(sql.startsWith("INSERT INTO cmd_native_rules_acceptances"))return {rows:enabled&&Number(args[2])===version?[{version,accepted_at:"2026-10-18T10:00:00Z"}]:[]};
  if(sql.startsWith("SELECT p.enabled,p.version"))return {rows:[{enabled,version,accepted_version:accepted}]};
  throw Error("Unexpected query: "+sql);
 }};
}
test("versioned rules use additive tables and membership-scoped acceptances",async()=>{
 const {initCmdNativeRules}=await lib,sql=[];
 await initCmdNativeRules({query:async statement=>{sql.push(statement);return {rows:[]}}});
 assert.equal(sql.length,2);
 assert.match(sql[0],/CREATE TABLE IF NOT EXISTS cmd_native_rules_screening/);
 assert.match(sql[1],/FOREIGN KEY\(guild_id,user_id\) REFERENCES cmd_native_members/);
 assert.doesNotMatch(sql.join(" "),/DROP TABLE|TRUNCATE/);
});
test("only a guild member sees rules and own acknowledgement",async()=>{
 const {getCmdNativeRules}=await lib,db=fakePool();
 await assert.rejects(getCmdNativeRules(db,auth,{guildId:gid},{requireNativeMember:async()=>{throw Error("no")}}),e=>e.status===403);
 assert.equal(db.calls.length,0);
 const result=await getCmdNativeRules(db,auth,{guildId:gid},{requireNativeMember:member});
 assert.equal(result.version,3);assert.equal(result.enabled,true);
 assert.equal(result.accepted,false);
 assert.deepEqual(db.calls[1].args,[gid,"member-1"]);
});
test("owner controls rules, disabled by default, version advances only on policy updates",async()=>{
 const {setCmdNativeRules}=await lib,db=fakePool();
 await assert.rejects(setCmdNativeRules(db,auth,{guildId:gid,enabled:true,rulesText:"No bad language here"},{requireNativeOwner:async()=>{throw Error("not owner")}}),e=>e.status===403);
 assert.equal(db.calls.length,0);
 await assert.rejects(setCmdNativeRules(db,auth,{guildId:gid,enabled:true,rulesText:"tiny"},{requireNativeOwner:owner}),e=>e.status===400);
 const result=await setCmdNativeRules(db,auth,{guildId:gid,enabled:true,rulesText:"Nouveau règlement"},{requireNativeOwner:owner});
 assert.equal(result.enabled,true);assert.equal(result.version,4);
 const sql=db.calls.at(-1).sql;
 assert.match(sql,/ON CONFLICT\(guild_id\) DO UPDATE/);
 assert.match(sql,/IS DISTINCT FROM EXCLUDED.rules_text/);
 assert.match(sql,/IS DISTINCT FROM EXCLUDED.enabled/);
 assert.doesNotMatch(sql,/DELETE|TRUNCATE/);
});
test("member explicitly accepts exact active version; stale version cannot pass",async()=>{
 const {acceptCmdNativeRules}=await lib,db=fakePool({version:3});
 const accepted=await acceptCmdNativeRules(db,auth,{guildId:gid,version:3},{requireNativeMember:member});
 assert.equal(accepted.accepted,true);assert.equal(accepted.version,3);
 assert.deepEqual(db.calls[0].args,[gid,"member-1",3]);
 assert.match(db.calls[0].sql,/enabled=TRUE AND version=\$3::integer/);
 await assert.rejects(acceptCmdNativeRules(db,auth,{guildId:gid,version:2},{requireNativeMember:member}),e=>e.status===409);
 await assert.rejects(acceptCmdNativeRules(db,auth,{guildId:gid,version:0},{requireNativeMember:member}),e=>e.status===400);
});
test("native message send rejects non-accepted user, exempts admins and allows disabled rules",async()=>{
 const {assertNativeRulesAccepted:guard}=await lib,db=fakePool({version:3,accepted:2});
 await assert.rejects(guard(db,auth,gid,{nativeMembership:async()=>({membership_role:"member"})}),e=>e.status===403&&/Accepte le règlement/.test(e.message));
 assert.deepEqual(db.calls[0].args,[gid,"member-1"]);
 assert.ok(!db.calls[0].sql.includes("INSERT"));
 const adminDb=fakePool();
 const admin=await guard(adminDb,auth,gid,{nativeMembership:async()=>({membership_role:"admin"})});
 assert.equal(admin.staff,true);assert.equal(adminDb.calls.length,0);
 const disabled=await guard(fakePool({enabled:false}),auth,gid,{nativeMembership:async()=>({membership_role:"member"})});
 assert.equal(disabled.required,false);
 await assert.rejects(guard(db,auth,gid,{nativeMembership:async()=>null}),e=>e.status===403);
 const yes=await guard(fakePool({version:3,accepted:3}),auth,gid,{nativeMembership:async()=>({membership_role:"member"})});
 assert.equal(yes.accepted,true);
});
test("private route rejects methods, unauthenticated clients and foreign guild IDs",async()=>{
 const {handleCmdNativeRules:route}=await lib,db=fakePool(),sent=[];
 const sendJson=(_res,status,payload)=>sent.push({status,payload});
 const deps={pool:db,auth,sendJson,readBody:async()=>({guildId:gid,version:3}),requireNativeMember:member,requireNativeOwner:owner};
 assert.equal(await route({method:"GET"},{},new URL("https://cmd.test/other"),deps),false);
 await route({method:"POST"},{},new URL("https://cmd.test/api/native/rules"),deps);assert.equal(sent.at(-1).status,405);
 await route({method:"GET"},{},new URL("https://cmd.test/api/native/rules"),{...deps,auth:null});assert.equal(sent.at(-1).status,401);
 await route({method:"GET"},{},new URL("https://cmd.test/api/native/rules?guildId=bad"),deps);assert.equal(sent.at(-1).status,400);
 await route({method:"GET"},{setHeader(){}},new URL("https://cmd.test/api/native/rules?guildId="+gid),deps);
 assert.equal(sent.at(-1).status,200);
});
test("real message sends, independent owner rules editor and native accept UI wired",()=>{
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
 assert.match(server,/await initCmdNativeRules\(pool\)/);
 assert.match(server,/await assertNativeRulesAccepted\(pool,auth,guildId,\{nativeMembership\}\)/);
 assert.match(server,/handleCmdNativeRules\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson,readBody:readFormBodyJson,requireNativeMember,requireNativeOwner\}\)/);
 assert.match(manager,/id="csm-native-rules"/);
 assert.match(manager,/api\/native\/rules\/config/);
 assert.match(manager,/api\/native\/rules\/accept/);
 assert.match(manager,/J’ai lu et j’accepte le règlement/);
});
