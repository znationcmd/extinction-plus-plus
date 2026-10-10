"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
const guildId="11111111-1111-4111-8111-111111111111";
const codeStart=server.indexOf("async function nativeGuildLifecycle(auth,input){");
const codeEnd=server.indexOf("\nasync function nativeMemberList(",codeStart);
assert.ok(codeStart>0&&codeEnd>codeStart,"lifecycle code found");
function createMock(ownerId="owner",currentRole="member",recipient="member2"){
 const calls=[];
 const client={
  query:async(sql,args=[])=>{
   calls.push({sql,args});
   if(sql.startsWith("SELECT id,name,owner_user_id FROM cmd_native_guilds"))return{rows:[{id:guildId,name:"Test",owner_user_id:ownerId}]};
   if(sql.startsWith("SELECT membership_role FROM cmd_native_members")){
    const userId=args[1];
    return {rows:["owner","member","member2"].includes(userId)?[{membership_role:userId===ownerId?"owner":currentRole}]:[]};
   }
   if(sql.includes("RETURNING id"))return{rows:[{id:guildId}]};
   return{rows:[]};
  },
  release:()=>{calls.push({sql:"RELEASE"})}
 };
 const pool={connect:async()=>client};
 const fn=vm.runInNewContext("(function(pool){"+server.slice(codeStart,codeEnd)+";return nativeGuildLifecycle})")(pool);
 return{fn,calls};
}
test("regular member can leave, retaining shared channels/messages",async()=>{
 const mock=createMock();
 const outcome=await mock.fn({user:{id:"member"}},{guildId,kind:"leave"});
 assert.equal(outcome.ok,true);
 assert.ok(mock.calls.some(c=>c.sql.startsWith("DELETE FROM cmd_native_members")));
 assert.ok(!mock.calls.some(c=>c.sql.startsWith("DELETE FROM cmd_native_guilds")));
 assert.ok(mock.calls.some(c=>c.sql==="COMMIT"));
});
test("owner cannot leave without first transferring ownership",async()=>{
 const mock=createMock();
 await assert.rejects(()=>mock.fn({user:{id:"owner"}},{guildId,kind:"leave"}),/propriétaire.*transférer/i);
 assert.ok(!mock.calls.some(c=>c.sql.startsWith("DELETE FROM cmd_native_guilds")));
 assert.ok(mock.calls.some(c=>c.sql==="ROLLBACK"));
});
test("member cannot delete server",async()=>{
 const mock=createMock();
 await assert.rejects(()=>mock.fn({user:{id:"member"}},{guildId,kind:"delete",confirmName:"Test"}),/Seul le propriétaire/);
 assert.ok(!mock.calls.some(c=>c.sql.startsWith("DELETE FROM cmd_native_guilds")));
});
test("owner deletion requires exact name and is scoped to own guild",async()=>{
 const mock=createMock();
 await assert.rejects(()=>mock.fn({user:{id:"owner"}},{guildId,kind:"delete",confirmName:"wrong"}),/exactement/);
 assert.ok(!mock.calls.some(c=>c.sql.startsWith("DELETE FROM cmd_native_guilds")));
 const after=createMock();
 const res=await after.fn({user:{id:"owner"}},{guildId,kind:"delete",confirmName:"Test"});
 assert.equal(res.ok,true);
 const deletion=after.calls.find(c=>c.sql.startsWith("DELETE FROM cmd_native_guilds"));
 assert.ok(deletion);
 assert.deepEqual(Array.from(deletion.args),[guildId,"owner"]);
 assert.ok(after.calls.some(c=>c.sql==="COMMIT"));
});
test("transfer requires another joined member and explicit confirmation",async()=>{
 const mock=createMock();
 await assert.rejects(()=>mock.fn({user:{id:"owner"}},{guildId,kind:"transfer",targetUserId:"ghost",confirmName:"Test"}),/membre de ce serveur/);
 const safe=createMock();
 const transferred=await safe.fn({user:{id:"owner"}},{guildId,kind:"transfer",targetUserId:"member2",confirmName:"Test"});
 assert.equal(transferred.ok,true);
 assert.ok(safe.calls.some(c=>c.sql.startsWith("UPDATE cmd_native_guilds SET owner_user_id")));
 assert.ok(!safe.calls.some(c=>c.sql.startsWith("DELETE FROM cmd_native_guilds")));
});
test("creator can assign self and custom roles directly from members tab",()=>{
 assert.match(manager,/member\.membership_role==='owner'\?'Mes rôles'/);
 assert.match(manager,/function csmOpenMemberRoles\(/);
 assert.match(manager,/request\('\/api\/native\/roles\/assign'/);
 assert.doesNotMatch(manager,/if\(member\.membership_role==='owner'\)continue;/);
 assert.match(manager,/if\(key==="delete-guild"\)/);
 assert.match(manager,/submitGuildLifecycle\("delete"\)/);
});
