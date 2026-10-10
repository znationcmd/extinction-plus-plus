"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const a=source.indexOf("async function effectiveNativePermissions(userId,guildId){");
const b=source.indexOf("\nasync function requireNativePermission",a);
assert.ok(a>0&&b>a);
const sample=source.slice(a,b);
function fixture(member,records){
 const pool={query:async(sql,params)=>{
  assert.ok(sql.includes("name='@everyone'"),"everyone must be included automatically");
  assert.deepEqual([...params],["guild","member"]);
  return {rows:records.map(permissions=>({permissions}))};
 }};
 return vm.runInNewContext("(function(pool,nativeMembership){"+sample+";return effectiveNativePermissions})")(pool,async()=>member);
}
test("all joined ordinary members inherit everyone permissions",async()=>{
 const run=fixture({membership_role:"member"},[{viewChannels:true,sendMessages:true}]);
 const p=await run("member","guild");assert.equal(p.viewChannels,true);assert.equal(p.sendMessages,true);
});
test("custom roles add permissions without revoking everyone",async()=>{
 const run=fixture({membership_role:"member"},[{viewChannels:true},{manageChannels:true}]);
 const p=await run("member","guild");assert.equal(p.viewChannels,true);assert.equal(p.manageChannels,true);
});
test("owner has all administrative permissions without requiring a role",async()=>{
 const run=fixture({membership_role:"owner"},[]);
 const p=await run("member","guild");assert.equal(p.administrator,true);
});
test("non members have no effective permissions",async()=>{
 const run=fixture(null,[]);
 assert.equal(await run("member","guild"),null);
});
