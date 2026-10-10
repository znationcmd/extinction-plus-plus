"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const ui=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");

function lifecycleFixture({owner="alice",members=["alice","bob"],name="Test"}={}){
 let tx=[],history=[],roles=new Map(members.map(uid=>[uid,uid===owner?"owner":"member"])),ownerId=owner,guildExists=true,deleted=false;
 const conn={
  query:async(sql,args=[])=>{
   history.push({sql,args});
   if(sql==="BEGIN"){tx=[];return {rows:[]}}
   if(sql==="ROLLBACK"){return {rows:[]}}
   if(sql==="COMMIT"){return {rows:[]}}
   if(sql.includes("FROM cmd_native_guilds WHERE id=$1 FOR UPDATE"))return {rows:guildExists?[{id:args[0],name,owner_user_id:ownerId}]:[]};
   if(sql.includes("SELECT membership_role FROM cmd_native_members"))return {rows:roles.has(args[1])?[{membership_role:roles.get(args[1])}]:[]};
   if(sql.includes("DELETE FROM cmd_native_members WHERE")){roles.delete(args[1]);return {rows:[]}}
   if(sql.includes("UPDATE cmd_native_members SET membership_role=")){roles.set(args[1],sql.includes("'owner'")?"owner":"member");return {rows:[]}}
   if(sql.includes("UPDATE cmd_native_guilds SET owner_user_id=")){ownerId=args[1];return {rows:[]}}
   if(sql.includes("DELETE FROM cmd_native_guilds WHERE")){guildExists=false;deleted=true;return {rows:[{id:args[0]}]}}
   if(sql.includes("DELETE FROM cmd_native_channel_reads")||sql.includes("DELETE FROM cmd_server_folder_items"))return {rows:[]};
   throw Error("Unexpected query: "+sql);
  },
  release:()=>{}
 };
 const pool={connect:async()=>conn};
 const start=server.indexOf("async function nativeGuildLifecycle(auth,input){");
 const end=server.indexOf("\nasync function nativeMemberList(",start);
 assert.ok(start>=0&&end>start);
 const fn=vm.runInNewContext("(function(pool){"+server.slice(start,end)+";return nativeGuildLifecycle})")(pool);
 return {call:(uid,kind,extra={})=>fn({user:{id:uid}},{kind,guildId:"11111111-1111-4111-8111-111111111111",...extra}),get:()=>({ownerId,guildExists,deleted,members:[...roles],history})};
}

test("owner is included in custom role assignment list and can be selected",()=>{
 assert.ok(ui.includes("const members=data.members||[];"));
 assert.ok(ui.includes("member.membership_role==='owner'?' · Propriétaire (toi)'"));
 assert.ok(ui.includes("'/api/native/roles/assign'"));
 const start=ui.indexOf("async function renderRoleAssignments(role){");
 const end=ui.indexOf("async function renderNativeMembersTab(){",start);
 assert.ok(start>=0&&end>start);
 assert.ok(!ui.slice(start,end).includes("filter(m=>m.membership_role!==\u0027owner\u0027)"));
});

test("member can leave without deleting messages or guild",async()=>{
 const f=lifecycleFixture();
 const output=await f.call("bob","leave");
 assert.equal(output.kind,"leave");assert.equal(f.get().guildExists,true);
 assert.equal(f.get().members.some(x=>x[0]==="bob"),false);
 assert.ok(!f.get().history.some(x=>x.sql.includes("DELETE FROM cmd_native_guilds")));
});

test("owner cannot leave while retaining ownership",async()=>{
 const f=lifecycleFixture();
 await assert.rejects(f.call("alice","leave"),/propriétaire/);
 assert.equal(f.get().guildExists,true);
});

test("only the owner can delete, matching the exact server name",async()=>{
 const f=lifecycleFixture();
 await assert.rejects(f.call("bob","delete",{confirmName:"Test"}),/propriétaire/);
 await assert.rejects(f.call("alice","delete",{confirmName:"Wrong"}),/exactement/);
 assert.equal(f.get().guildExists,true);
 await f.call("alice","delete",{confirmName:"Test"});
 assert.equal(f.get().guildExists,false);
 assert.ok(f.get().history.some(x=>x.sql.includes("DELETE FROM cmd_native_guilds WHERE id=$1 AND owner_user_id=$2")));
});

test("ownership transfer requires a member and explicit confirmation",async()=>{
 const f=lifecycleFixture();
 await assert.rejects(f.call("bob","transfer",{targetUserId:"alice",confirmName:"Test"}),/propriétaire/);
 await assert.rejects(f.call("alice","transfer",{targetUserId:"charlie",confirmName:"Test"}),/membre/);
 await assert.rejects(f.call("alice","transfer",{targetUserId:"bob",confirmName:"Wrong"}),/exactement/);
 assert.equal(f.get().ownerId,"alice");
 await f.call("alice","transfer",{targetUserId:"bob",confirmName:"Test"});
 assert.equal(f.get().ownerId,"bob");
 assert.equal(f.get().members.find(x=>x[0]==="bob")[1],"owner");
 assert.equal(f.get().members.find(x=>x[0]==="alice")[1],"member");
 assert.equal(f.get().guildExists,true);
});

test("owner buttons and member leave are accessible in settings and mobile server menu",()=>{
 for(const mark of ["transfer-guild","delete-guild","leave-guild","/api/native/guild-lifecycle"]){
  assert.ok(ui.includes(mark)||server.includes(mark),"missing "+mark);
 }
});
