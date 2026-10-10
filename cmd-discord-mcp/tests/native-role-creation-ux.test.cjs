"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ui=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
test("new role opens its saved membership selector without assigning roles automatically",()=>{
 const key="const outcome=await mutate(role?'update_role':'create_role'";
 assert.ok(ui.includes(key));
 assert.ok(ui.includes("if(!role&&outcome?.roleId&&isNative()&&ctx?.owner)"));
 assert.ok(ui.includes("showRole(created)"));
 assert.ok(ui.includes("Rôle créé. Tu peux maintenant te l’attribuer"));
 assert.ok(!ui.slice(ui.indexOf(key),ui.indexOf("box.querySelectorAll('[data-csm-action]')",ui.indexOf(key))).includes("enabled:true"),"creation must not auto grant a custom role");
});
test("owner sees links to roles/members/ownership/delete, member sees leave",()=>{
 assert.ok(ui.includes("role==='owner'?row('roles'"));
 assert.ok(ui.includes("row('members','👥','Attribuer mes rôles et gérer les membres')"));
 assert.ok(ui.includes("row('ownership','👑','Gérer la propriété')"));
 assert.ok(ui.includes("row('delete-guild','🗑️','Supprimer mon serveur')"));
 assert.ok(ui.includes("row('leave-guild','↪','Quitter ce serveur')"));
});
test("both desktop and mobile controls are syntactically valid and scoped to CMD Sphere",()=>{
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert.ok(server.includes('url.pathname==="/api/native/guild-lifecycle"'));
 assert.ok(server.includes('Seul le propriétaire peut supprimer son serveur.'));
 assert.ok(server.includes('DELETE FROM cmd_native_guilds WHERE id=$1 AND owner_user_id=$2'));
 assert.ok(server.includes('if(owner)throw new Error("Le propriétaire doit transférer son serveur'));
});
