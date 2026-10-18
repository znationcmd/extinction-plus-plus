"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const modulePromise=import("../cmd-dm-guild-privacy.js");
const source=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const uid="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
const g1="33333333-3333-4333-8333-333333333333",g2="44444444-4444-4444-8444-444444444444";
function harness(){
 const queryLog=[],policies=new Map(),member=new Map(),shared=new Map();
 const pool={async query(sql,args=[]){
  queryLog.push({sql,args});
  if(sql.startsWith("CREATE "))return {rows:[]};
  if(sql.includes("SELECT 1 FROM cmd_native_members WHERE guild_id="))
   return {rows:member.get(args[1])?.has(args[0])?[{ok:1}]:[]};
  if(sql.includes("INSERT INTO cmd_dm_guild_privacy(")){
   policies.set(args[0]+":"+args[1],args[2]);return {rows:[]};
  }
  if(sql.includes("DELETE FROM cmd_dm_guild_privacy")){
   policies.delete(args[1]+":"+args[0]);return {rows:[]};
  }
  if(sql.includes("SELECT g.id::text AS guild_id")){
   const mine=member.get(args[0])||new Set();
   return {rows:[...mine].map(guild=>({guild_id:guild,name:"My server",policy:policies.get(args[0]+":"+guild)||"inherit"}))};
  }
  if(sql.includes("SELECT DISTINCT sm.guild_id::text AS guild_id")){
   const guilds=shared.get(args[0]+":"+args[1])||[];
   return {rows:guilds.map(guild=>({guild_id:guild,policy:policies.get(args[1]+":"+guild)||"inherit"}))};
  }
  throw Error("Unexpected SQL: "+sql.slice(0,180));
 }};
 return {pool,queryLog,member,shared,policies};
}
test("Per-server privacy schema is additive and properly scoped",async()=>{
 const h=harness(),{initCmdDmGuildPrivacy}=await modulePromise;
 await initCmdDmGuildPrivacy(h.pool);
 assert.equal(h.queryLog.length,2);
 assert.ok(h.queryLog.every(x=>x.sql.includes("IF NOT EXISTS")));
 assert.ok(h.queryLog.every(x=>!/DROP|TRUNCATE/i.test(x.sql)));
 assert.match(h.queryLog[0].sql,/PRIMARY KEY\(user_id,guild_id\)/);
});
test("Only an actual guild member may modify their own DM setting",async()=>{
 const h=harness(),{updateDmGuildPrivacy}=await modulePromise;
 await assert.rejects(updateDmGuildPrivacy(h.pool,uid,{guildId:g1,policy:"deny"}),e=>e.status===403);
 h.member.set(uid,new Set([g1]));
 assert.equal((await updateDmGuildPrivacy(h.pool,uid,{guildId:g1,policy:"deny"})).policy,"deny");
 assert.equal(h.policies.get(uid+":"+g1),"deny");
 await assert.rejects(updateDmGuildPrivacy(h.pool,uid,{guildId:g1,policy:"any"}),e=>e.status===400);
 await assert.rejects(updateDmGuildPrivacy(h.pool,uid,{guildId:"../bad",policy:"deny"}),e=>e.status===400);
});
test("Policies are account-scoped and can be reset to inherited defaults",async()=>{
 const h=harness(),{updateDmGuildPrivacy,listDmGuildPrivacy}=await modulePromise;
 h.member.set(uid,new Set([g1,g2]));h.member.set(other,new Set([g1]));
 await updateDmGuildPrivacy(h.pool,uid,{guildId:g1,policy:"deny"});
 const mine=await listDmGuildPrivacy(h.pool,uid),theirs=await listDmGuildPrivacy(h.pool,other);
 assert.equal(mine.find(x=>x.guildId===g1).policy,"deny");
 assert.equal(theirs.find(x=>x.guildId===g1).policy,"inherit");
 await updateDmGuildPrivacy(h.pool,uid,{guildId:g1,policy:"inherit"});
 assert.equal(h.policies.has(uid+":"+g1),false);
});
test("All shared servers denied blocks strangers; a permitted common server allows a DM",async()=>{
 const h=harness(),{updateDmGuildPrivacy,assertDmGuildPermitted}=await modulePromise;
 h.member.set(other,new Set([g1,g2]));h.shared.set(uid+":"+other,[g1,g2]);
 await updateDmGuildPrivacy(h.pool,other,{guildId:g1,policy:"deny"});
 await updateDmGuildPrivacy(h.pool,other,{guildId:g2,policy:"deny"});
 await assert.rejects(assertDmGuildPermitted(h.pool,uid,other),e=>e.status===403);
 await updateDmGuildPrivacy(h.pool,other,{guildId:g2,policy:"allow"});
 assert.equal(await assertDmGuildPermitted(h.pool,uid,other),true);
});
test("Accounts without a shared CMD server retain previous DM behavior",async()=>{
 const h=harness(),{assertDmGuildPermitted}=await modulePromise;
 assert.equal(await assertDmGuildPermitted(h.pool,uid,other),true);
 assert.equal(await assertDmGuildPermitted(h.pool,uid,uid),true);
});
test("Native DM and group message routes enforce settings before any insert",()=>{
 assert.match(source,/await initCmdDmGuildPrivacy\(pool\)/);
 assert.match(source,/url.pathname==="\/api\/account\/privacy\/dm-guilds"/);
 for(const name of ["startDmThread","sendDmMessage","createGroupDm","sendGroupDmMessage"]){
  const p=source.indexOf("async function "+name+"(");
  assert.ok(p>0,name+" exists");
  const body=source.slice(p,source.indexOf("\nasync function ",p+16));
  assert.match(body,/await assertDmGuildPermitted\(pool,/,"missing server permission in "+name);
 }
 assert.doesNotMatch(source,/TRUNCATE cmd_dm_guild_privacy/);
});
