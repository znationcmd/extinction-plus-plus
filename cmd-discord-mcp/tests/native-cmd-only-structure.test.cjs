"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const ui=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
test("editing an imported native server stays entirely in CMD Sphere",async()=>{
 const begin=server.indexOf("async function applyNativeStructureAction(auth,input){");
 const end=server.indexOf("\nasync function updateNativeProfile(",begin);
 assert.ok(begin>=0&&end>begin);
 const block=server.slice(begin,end);
 assert.doesNotMatch(block,/backend\(|syncNativeFromDiscord\(|resolveBot\(/);
 const seen=[];
 const factory=vm.runInNewContext("(function(applyNativeLocalAction){"+block+";return applyNativeStructureAction})");
 const local=async(auth,input)=>{seen.push(input);return{ok:true,synced:false}};
 const action=factory(local);
 const guild="11111111-1111-4111-8111-111111111111";
 const result=await action({user:{id:"owner"}},{nativeGuildId:guild,action:"delete_channel",channelId:"local-channel"});
 assert.equal(result.ok,true);
 assert.equal(seen.length,1);
 assert.equal(seen[0].nativeGuildId,guild);
});
test("native role and channel mutations still check permissions on server",()=>{
 const a=server.indexOf("async function applyNativeLocalAction(auth,input){");
 const b=server.indexOf("\nasync function applyNativeStructureAction(",a);
 assert.ok(a>=0&&b>a);
 const block=server.slice(a,b);
 assert.match(block,/requireNativeOwner\(auth,gid\)/);
 assert.match(block,/requireNativePermission\(auth,gid,"manageChannels"\)/);
});
test("imported native guild owner can edit local channels",()=>{
 const line=ui.split("\n").find(x=>x.startsWith("function canEditChannels()"));
 assert.ok(line);
 assert.match(line,/ctx\?\.owner/);
 assert.doesNotMatch(line,/!ctx\?\.source/);
 assert.doesNotThrow(()=>new vm.Script(ui));
});
test("opening a native guild does not silently restore removed channels from an archive",()=>{
 const route=server.indexOf('url.pathname.startsWith("/api/native/guild/")');
 assert.ok(route>0);
 const part=server.slice(route,route+420);
 assert.doesNotMatch(part,/ensureArchivedChannelsForNativeGuild/);
 assert.match(part,/nativeGuildDetail/);
});
