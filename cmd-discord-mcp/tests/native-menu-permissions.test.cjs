"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ui=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");

test("server menu reads current authenticated membership before rendering owner controls",()=>{
 assert.match(ui,/async function menu\(\)/);
 assert.match(ui,/const detail=await request\('\/api\/native\/guild\/'\+safe\(gid\)\)/);
 assert.match(ui,/verifiedMemberRole=String\(detail\?\.member\?\.membership_role\|\|""\)/);
 assert.match(ui,/const role=native\?verifiedMemberRole:/);
 assert.match(ui,/const admin=native\?\["owner","admin"\]\.includes\(role\)/);
});
test("owner sees ownership tools, member sees leave, unverifiable rights show no destructive action",()=>{
 assert.match(ui,/role==='owner'\?row\('ownership'/);
 assert.match(ui,/role\?row\('leave-guild'/);
 assert.match(ui,/Droits du serveur indisponibles/);
 assert.match(ui,/if\(key==="ownership"\)/);
 assert.match(ui,/if\(key==="leave-guild"\)/);
});
test("lifecycle API rejects nonowners and preserves ownership on leave",()=>{
 const a=server.indexOf("async function nativeGuildLifecycle(auth,input){");
 const b=server.indexOf("\nasync function nativeMemberList(",a);
 assert.ok(a>=0&&b>a);
 const source=server.slice(a,b);
 assert.match(source,/if\(owner\)throw new Error\("Le propriétaire doit transférer/);
 assert.match(source,/if\(!owner\)throw new Error\("Seul le propriétaire peut supprimer/);
 assert.match(source,/String\(input.confirmName\|\|""\)!==String\(guild.name\)/);
 assert.match(source,/DELETE FROM cmd_native_guilds WHERE id=\$1 AND owner_user_id=\$2/);
 assert.match(source,/await client.query\("COMMIT"\)/);
});
test("menu JavaScript parses without modifying Discord services",()=>{
 assert.doesNotThrow(()=>new vm.Script(ui));
});
