"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
const start=server.indexOf("async function requireNativeAdmin(auth,guildId){");
const end=server.indexOf("\n// Compute effective local CMD Sphere permissions",start);
assert.ok(start>=0&&end>start,"native admin function must exist");
function adminCheck(member,permissions){
 let memberCalls=0,permissionCalls=0;
 const nativeMember=async()=>{memberCalls++;if(!member)throw Error("Not a member");return {membership_role:member}};
 const effective=async()=>{permissionCalls++;return permissions};
 const fn=vm.runInNewContext("(function(requireNativeMember,effectiveNativePermissions){"+server.slice(start,end)+";return requireNativeAdmin})")(nativeMember,effective);
 return {fn,counts:()=>({memberCalls,permissionCalls})};
}
const auth={user:{id:"member"}},guildId="11111111-1111-4111-8111-111111111111";
test("owner has inherent all-powerful server access even without roles",async()=>{
 const ctx=adminCheck("owner",null);
 await assert.doesNotReject(()=>ctx.fn(auth,guildId));
 assert.equal(ctx.counts().permissionCalls,0);
});
test("explicit Administrator role allows administrator operations",async()=>{
 const ctx=adminCheck("member",{administrator:true});
 await assert.doesNotReject(()=>ctx.fn(auth,guildId));
 assert.equal(ctx.counts().permissionCalls,1);
});
test("Manage Channels or Manage Guild alone does not imply all Administrator permissions",async()=>{
 const ctx=adminCheck("member",{administrator:false,manageChannels:true,manageGuild:true});
 await assert.rejects(()=>ctx.fn(auth,guildId),/Permission administrateur requise/);
});
test("ordinary member without Administrator is denied",async()=>{
 const ctx=adminCheck("member",{viewChannels:true});
 await assert.rejects(()=>ctx.fn(auth,guildId),/Permission administrateur requise/);
});
test("outsider cannot use role permissions to become administrator",async()=>{
 const ctx=adminCheck(null,{administrator:true});
 await assert.rejects(()=>ctx.fn(auth,guildId),/Not a member/);
 assert.equal(ctx.counts().permissionCalls,0);
});
test("transfer and deletion remain restricted to actual guild owner",()=>{
 const start=server.indexOf("async function nativeGuildLifecycle(auth,input){");
 const end=server.indexOf("\nasync function nativeMemberList(",start);
 assert.ok(start>=0&&end>start);
 const block=server.slice(start,end);
 assert.match(block,/String\(guild\.owner_user_id\)===uid/);
 assert.match(block,/if\(!owner\)throw new Error\("Seul le propriétaire peut supprimer son serveur\."/);
 assert.match(block,/if\(!owner\)throw new Error\("Seul le propriétaire peut transférer son serveur\."/);
});
test("native server manager exposes administrator settings but not owner actions",()=>{
 assert.match(manager,/data\.permissions\?\.administrator===true/);
 assert.match(manager,/owner:String\(data\.member\?\.membership_role\)==='owner'/);
 assert.match(manager,/function canEditRoles\(\)\{return isNative\(\)\?\!\!ctx\?\.owner/);
});
