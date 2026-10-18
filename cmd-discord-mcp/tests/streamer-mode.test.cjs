"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const modulePromise=import("../cmd-streamer-mode.js");
const backend=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const ui=fs.readFileSync(path.join(__dirname,"../cmd-streamer-mode-ui.js"),"utf8");
function fakePool(){
 const store=new Map(),history=[];
 return {history,store,async query(sql,args=[]){
  history.push({sql,args});
  if(sql.startsWith("CREATE TABLE"))return {rows:[]};
  if(sql.startsWith("SELECT enabled")){const x=store.get(args[0]);return {rows:x?[x]:[]}};
  if(sql.startsWith("INSERT INTO cmd_streamer_preferences")){
   const value={enabled:args[1],mask_invites:args[2],hide_notifications:args[3]};
   store.set(args[0],value);return {rows:[value]};
  }
  throw Error("Unexpected statement: "+sql);
 }};
}
test("Stream mode defaults to disabled and stores preferences under authenticated account",async()=>{
 const m=await modulePromise,db=fakePool();
 await m.initCmdStreamerMode(db);
 assert.deepEqual(await m.readCmdStreamerMode(db,"alice"),{enabled:false,maskInvites:true,hideNotifications:true});
 const value=await m.writeCmdStreamerMode(db,"alice",{enabled:true,maskInvites:true,hideNotifications:false});
 assert.deepEqual(value,{enabled:true,maskInvites:true,hideNotifications:false});
 assert.deepEqual(await m.readCmdStreamerMode(db,"alice"),value);
 assert.equal((await m.readCmdStreamerMode(db,"bob")).enabled,false);
 assert.match(db.history[0].sql,/IF NOT EXISTS cmd_streamer_preferences/);
 assert.ok(db.history.every(x=>!/DROP TABLE|TRUNCATE|DELETE FROM/i.test(x.sql)),"Do not modify other users or personal content");
});
test("Only explicit boolean preferences are accepted",async()=>{
 const m=await modulePromise,db=fakePool();
 for(const payload of [null,{enabled:"true",maskInvites:true,hideNotifications:true},{enabled:true,maskInvites:null,hideNotifications:false},{}])
  await assert.rejects(m.writeCmdStreamerMode(db,"alice",payload),/invalide/);
 assert.equal(db.history.length,0);
 await assert.rejects(m.readCmdStreamerMode(db,""),/Connexion requise/);
});
test("Both settings operations scope themselves to signed-in account",()=>{
 assert.match(backend,/url.pathname==="/api/account/streamer-mode"/);
 assert.match(backend,/const auth=dashboardAuth\(req\);if\(!auth\)/);
 assert.match(backend,/readCmdStreamerMode\(pool,userId\)/);
 assert.match(backend,/writeCmdStreamerMode\(pool,userId,await readFormBodyJson\(req\)\)/);
 assert.match(backend,/await initCmdStreamerMode\(pool\)/);
});
test("Dashboard and messages include a visible, opt-in local privacy control",()=>{
 assert.equal((backend.match(/cmd-streamer-mode-ui\.js\?v=20261018streamer/g)||[]).length,3);
 assert.match(backend,/url.pathname==="/cmd-streamer-mode-ui.js"/);
 assert.match(ui,/aria-pressed/);
 assert.match(ui,/mode Streamer/i);
 assert.match(ui,/cmd-streamer-mask-invites/);
 assert.match(ui,/cmd-streamer-hide-notifications/);
 assert.match(ui,/fetch\("/api/account/streamer-mode"/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage/);
});
