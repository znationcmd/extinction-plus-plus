"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
test("the owner can be selected like any other member",()=>{
 assert.ok(manager.includes("const members=data.members||[];"));
 assert.ok(manager.includes("Propriétaire (toi)"));
 assert.ok(manager.includes("'/api/native/roles/assign'"));
});
test("@everyone is automatic and cannot be granted as a custom role",async()=>{
 const start=server.indexOf("async function ownerAssignNativeRole(auth,input){");
 const end=server.indexOf("\nasync function ownerAssignNativeRoleBatch",start);
 assert.ok(start>=0&&end>start);
 const queries=[];
 const pool={query:async(sql,args)=>{queries.push(sql);
  if(sql.includes("SELECT 1 FROM cmd_native_guilds"))return {rows:[{}]};
  if(sql.includes("SELECT 1 FROM cmd_native_members"))return {rows:[{}]};
  if(sql.includes("SELECT id,name FROM cmd_native_roles"))return {rows:[{id:"role-id",name:"@everyone"}]};
  throw Error("unexpected SQL");
 }};
 const f=vm.runInNewContext("(function(pool){"+server.slice(start,end)+";return ownerAssignNativeRole})")(pool);
 await assert.rejects(f({user:{id:"owner"}},{guildId:"guild",userId:"owner",roleId:"role"}),/@everyone/);
 assert.equal(queries.filter(q=>q.includes("INSERT INTO cmd_native_member_roles")).length,0);
});
test("@everyone cannot be deleted, renamed or duplicated through native actions",()=>{
 assert.ok(server.includes("name<>'@everyone'")||server.includes("name<>\\'@everyone\\'"));
 assert.ok(server.includes('name==="@everyone"'));
 assert.ok(server.includes("Le rôle @everyone ne peut pas être renommé ni recréé."));
});
