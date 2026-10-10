"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const roles=fs.readFileSync(path.join(root,"cmd-role-wizard.js"),"utf8");
const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
const gid="11111111-1111-4111-8111-111111111111";

test("Server owner is eligible for custom role at creation",()=>{
 assert.ok(roles.includes("const members=(memberData.members||[]).filter(m=>String(m.user_id||'').trim());") ||
  roles.includes('const members=(memberData.members||[]).filter(m=>String(m.user_id||"").trim());'));
 assert.ok(!roles.includes('filter(m=>m.membership_role!=="owner")'));
 assert.ok(roles.includes("👑 Propriétaire"));
 assert.match(roles,/roleId:st\.roleId,userIds/);
 assert.doesNotThrow(()=>new vm.Script(roles));
});

function ownerLifecycle(){
 const start=server.indexOf("async function nativeGuildLifecycle(auth,input){");
 const end=server.indexOf("\nasync function nativeMemberList",start);
 assert.ok(start>0&&end>start);
 let sql=[],state={owner:"alice",members:{alice:"owner",bob:"member"},name:"Test"};
 const client={
  query:async(query,args=[])=>{
   sql.push(query);
   if(query.startsWith("SELECT id,name,owner_user_id FROM cmd_native_guilds"))
    return{rows:[{id:gid,name:state.name,owner_user_id:state.owner}]};
   if(query.startsWith("SELECT membership_role FROM cmd_native_members")){
    const membership=state.members[args[1]];
    return{rows:membership?[{membership_role:membership}]:[]};
   }
   if(query.startsWith("UPDATE cmd_native_guilds SET owner_user_id"))state.owner=args[1];
   if(query.startsWith("UPDATE cmd_native_members SET membership_role='member'"))state.members[args[1]]="member";
   if(query.startsWith("UPDATE cmd_native_members SET membership_role='owner'"))state.members[args[1]]="owner";
   if(query.startsWith("DELETE FROM cmd_native_members"))delete state.members[args[1]];
   return{rows:[]};
  },
  release:()=>{}
 };
 const pool={connect:async()=>client};
 const method=vm.runInNewContext("(function(pool){"+server.slice(start,end)+";return nativeGuildLifecycle})")(pool);
 return {run:(who,kind,input={})=>method({user:{id:who}},{guildId:gid,kind,...input}),sql,state};
}

test("A joined member can leave without deleting shared server messages",async()=>{
 const t=ownerLifecycle();
 const result=await t.run("bob","leave");
 assert.equal(result.ok,true);
 assert.equal(t.state.members.bob,undefined);
 assert.ok(t.sql.some(q=>q.startsWith("DELETE FROM cmd_native_members")));
 assert.ok(!t.sql.some(q=>q.startsWith("DELETE FROM cmd_native_guilds")));
 assert.equal(t.state.owner,"alice");
});

test("An owner cannot leave without transfer or deletion",async()=>{
 const t=ownerLifecycle();
 await assert.rejects(()=>t.run("alice","leave"),/transférer/);
 assert.ok(!t.sql.some(q=>q.startsWith("DELETE FROM cmd_native_members")));
});

test("A regular member cannot delete or transfer the server",async()=>{
 const t=ownerLifecycle();
 await assert.rejects(()=>t.run("bob","delete",{confirmName:"Test"}),/propriétaire/);
 await assert.rejects(()=>t.run("bob","transfer",{targetUserId:"alice",confirmName:"Test"}),/propriétaire/);
 assert.ok(!t.sql.some(q=>q.startsWith("DELETE FROM cmd_native_guilds")));
});

test("Only the owner can delete after exact server-name confirmation",async()=>{
 const t=ownerLifecycle();
 await assert.rejects(()=>t.run("alice","delete",{confirmName:"wrong"}),/exactement/);
 assert.ok(!t.sql.some(q=>q.startsWith("DELETE FROM cmd_native_guilds")));
 const success=await t.run("alice","delete",{confirmName:"Test"});
 assert.equal(success.ok,true);
 assert.ok(t.sql.some(q=>q.startsWith("DELETE FROM cmd_native_guilds")));
});

test("The owner can transfer to another joined member",async()=>{
 const t=ownerLifecycle();
 await assert.rejects(()=>t.run("alice","transfer",{targetUserId:"ghost",confirmName:"Test"}),/membre/);
 const success=await t.run("alice","transfer",{targetUserId:"bob",confirmName:"Test"});
 assert.equal(success.ok,true);
 assert.equal(t.state.owner,"bob");
 assert.equal(t.state.members.bob,"owner");
 assert.equal(t.state.members.alice,"member");
});
