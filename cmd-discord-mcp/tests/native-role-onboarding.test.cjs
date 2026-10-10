"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const roleUI=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
const gid="11111111-1111-4111-8111-111111111111";
const roleId="22222222-2222-4222-8222-222222222222";
function ownerRoleApi({roleName='Fonda'}={}){
 const a=server.indexOf("async function ownerAssignNativeRole(auth,input){");
 const b=server.indexOf("// Assign one CMD Sphere role",a);
 assert.ok(a>=0&&b>a,"Owner-only role API not found");
 const grants=new Map();
 let mutations=0;
 const pool={query:async(query,parameters)=>{
  if(query.includes("SELECT 1 FROM cmd_native_guilds"))return{rows:parameters[1]==="owner"?[{}]:[]};
  if(query.includes("SELECT 1 FROM cmd_native_members"))return{rows:["alice","owner"].includes(parameters[1])?[{}]:[]};
  if(query.includes("SELECT id,name FROM cmd_native_roles"))return{rows:parameters[1]===roleId?[{id:roleId,name:roleName}]:[]};
  if(query.includes("INSERT INTO cmd_native_member_roles")){grants.set(parameters[1],[parameters[2]]);mutations++;return{rows:[]}};
  if(query.includes("DELETE FROM cmd_native_member_roles")){grants.set(parameters[1],[]);mutations++;return{rows:[]}};
  if(query.includes("SELECT role_id::text"))return{rows:(grants.get(parameters[1])||[]).map(role_id=>({role_id}))};
  return{rows:[]};
 }};
 const fn=vm.runInNewContext(server.slice(a,b)+"\nownerAssignNativeRole;",{pool});
 return{fn,grants,get mutations(){return mutations}};
}
test("Role assignment refuses anyone except the native guild owner",async()=>{
 const db=ownerRoleApi();
 await assert.rejects(()=>db.fn({user:{id:"intruder"}},{guildId:gid,userId:"alice",roleId}),/Seul le propriétaire/);
 assert.equal(db.mutations,0);
});
test("A role cannot be assigned to a user who has not joined that guild",async()=>{
 const db=ownerRoleApi();
 await assert.rejects(()=>db.fn({user:{id:"owner"}},{guildId:gid,userId:"ghost",roleId}),/n'appartient pas/);
 assert.equal(db.mutations,0);
});
test("Owner can add and then remove exactly the role for a joined user",async()=>{
 const db=ownerRoleApi(),auth={user:{id:"owner"}},base={guildId:gid,userId:"alice",roleId};
 const added=await db.fn(auth,base);
 assert.equal(added.saved,true);
 assert.equal(added.user.role_ids.length,1);
 assert.equal(added.user.role_ids[0],roleId);
 const removed=await db.fn(auth,{...base,enabled:false});
 assert.equal(removed.saved,true);
 assert.equal(removed.user.role_ids.length,0);
 assert.equal(db.mutations,2);
});
test("Owner can assign and remove a cosmetic role on their own account",async()=>{
 const db=ownerRoleApi(),base={guildId:gid,userId:"owner",roleId};
 const applied=await db.fn({user:{id:"owner"}},base);
 assert.equal(applied.saved,true);
 assert.equal(applied.user.role_ids[0],roleId);
 const removed=await db.fn({user:{id:"owner"}},{...base,enabled:false});
 assert.equal(removed.saved,true);
 assert.equal(removed.user.role_ids.length,0);
});
test("@everyone remains automatic and cannot be assigned as an explicit role",async()=>{
 const db=ownerRoleApi({roleName:"@everyone"});
 await assert.rejects(()=>db.fn({user:{id:"owner"}},{guildId:gid,userId:"owner",roleId}),/@everyone/);
 assert.equal(db.mutations,0);
});
test("Joined members inherit @everyone permissions even without assigned custom roles",async()=>{
 const start=server.indexOf("async function effectiveNativePermissions(userId,guildId){");
 const end=server.indexOf("async function requireNativePermission(",start);
 assert.ok(start>=0&&end>start);
 let sql="",called=0;
 const pool={query:async(q)=>{sql=q;called++;return{rows:[{permissions:{viewChannels:true,sendMessages:true}}]}}};
 const member=async()=>({membership_role:"member"});
 const fn=vm.runInNewContext("(function(pool,nativeMembership){"+server.slice(start,end)+";return effectiveNativePermissions})")(pool,member);
 const granted=await fn("alice",gid);
 assert.equal(granted.viewChannels,true);
 assert.equal(granted.sendMessages,true);
 assert.match(sql,/@everyone/);
 assert.equal(called,1);
});
test("Owner retains administrator privileges even with no custom roles",async()=>{
 const start=server.indexOf("async function effectiveNativePermissions(userId,guildId){");
 const end=server.indexOf("async function requireNativePermission(",start);
 const pool={query:async()=>{throw Error("Owner bypass should not require role lookup")}};
 const member=async()=>({membership_role:"owner"});
 const fn=vm.runInNewContext("(function(pool,nativeMembership){"+server.slice(start,end)+";return effectiveNativePermissions})")(pool,member);
 const granted=await fn("owner",gid);
 assert.equal(granted.administrator,true);
 assert.equal(granted.manageRoles,true);
 assert.equal(granted.manageChannels,true);
});
test("Owner self-role shortcut remains visible and uses server-side role API",()=>{
 assert.ok(roleUI.includes("M’attribuer ce rôle"));
 assert.ok(roleUI.includes("Retirer ce rôle de mon profil"));
 assert.ok(roleUI.includes("ownerSelfButton.onclick"));
 assert.ok(roleUI.includes("/api/native/roles/assign"));
});
test("Dashboard creation wizard parses and opens the returned native server",()=>{
 const start="const script=String.raw`";
 const a=server.indexOf(start),b=server.indexOf("  `;\n  return '<!doctype html",a);
 assert.ok(a>=0&&b>a,"Dashboard script template absent");
 assert.doesNotThrow(()=>new vm.Script(server.slice(a+start.length,b)));
 assert.match(server,/function cmdWizardRender\(/);
 assert.match(server,/function cmdWizardSubmit\(/);
 assert.match(server,/dashboard\?openNative=/);
 assert.match(server,/const nativeTemplates=/);
});
test("Native guild manager guides owners to actual invite UI when the member list is empty",()=>{
 assert.match(roleUI,/renderRoleAssignments/);
 assert.match(roleUI,/renderNativeMembersTab/);
 assert.match(roleUI,/window\.cmdOpenServerInvites/);
 assert.match(roleUI,/\/api\/native\/roles\/assign/);
});
