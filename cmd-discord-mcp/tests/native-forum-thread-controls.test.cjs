"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const m=import("../cmd-forum-thread-controls.js");
const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const menu=fs.readFileSync(path.join(__dirname,"../cmd-social-message-actions.js"),"utf8");
const G="11111111-1111-4111-8111-111111111111",C="22222222-2222-4222-8222-222222222222",ROOT="33333333-3333-4333-8333-333333333333",REPLY="44444444-4444-4444-8444-444444444444";
const channel={id:C,type:"forum"};
function mock(){
 let state=null;const statements=[],createdAt=new Date(Date.now()-4*24*3600*1000);
 const pool={async query(sql,args=[]){
  statements.push({sql,args});
  if(sql.startsWith("SELECT id,reply_to,created_at")){
   if(args[1]!==G||args[2]!==C)return {rows:[]};
   if(args[0]===ROOT)return {rows:[{id:ROOT,reply_to:null,created_at:createdAt}]};
   if(args[0]===REPLY)return {rows:[{id:REPLY,reply_to:ROOT,created_at:new Date()}]};
   return {rows:[]};
  }
  if(sql.startsWith("SELECT id,created_at"))return {rows:args[0]===ROOT?[{id:ROOT,created_at:createdAt}]:[]};
  if(sql.startsWith("SELECT archived,locked,auto_archive_hours"))return {rows:state?[state]:[]};
  if(sql.includes("INSERT INTO cmd_native_forum_thread_state(")){
   if(args[0]!==ROOT||args[1]!==G||args[2]!==C)return {rows:[]};
   state={archived:args[3],locked:args[4],auto_archive_hours:args[5],last_activity_at:new Date()};
   return {rows:[state]};
  }
  if(sql.startsWith("UPDATE cmd_native_forum_thread_state SET")){
   if(state)state.last_activity_at=new Date();return {rows:[]};
  }
  return {rows:[]};
 }};
 return {pool,statements,getState:()=>state,setState:s=>state=s};
}
test("Thread lifecycle uses non-destructive schema and defaults to no archival",async()=>{
 const {initCmdForumThreadControls,getForumThreadState}=await m,x=mock();
 await initCmdForumThreadControls(x.pool);
 assert.ok(x.statements.some(q=>q.sql.includes("CREATE TABLE IF NOT EXISTS cmd_native_forum_thread_state")));
 assert.ok(x.statements.some(q=>q.sql.includes("auto_archive_hours INTEGER NOT NULL DEFAULT 0")));
 assert.ok(x.statements.every(q=>!/\b(?:DROP TABLE|TRUNCATE TABLE|DELETE FROM)\b/i.test(q.sql)));
 const state=await getForumThreadState(x.pool,G,channel,ROOT);
 assert.equal(state.canReply,true);
 assert.equal(state.autoArchiveHours,0);
 assert.equal(state.rootMessageId,ROOT);
});
test("Only a forum publication in its actual guild and channel can be modified",async()=>{
 const {resolveForumThread}=await m,x=mock();
 assert.equal((await resolveForumThread(x.pool,G,channel,REPLY)).id,ROOT);
 await assert.rejects(resolveForumThread(x.pool,G,{id:C,type:"text"},ROOT),e=>e.status===404);
 await assert.rejects(resolveForumThread(x.pool,G,channel,"invalid"),e=>e.status===404);
 await assert.rejects(resolveForumThread(x.pool,"55555555-5555-4555-8555-555555555555",channel,ROOT),e=>e.status===404);
});
test("Archive or lock rejects a reply; reopening keeps original messages untouched",async()=>{
 const {setForumThreadState,assertForumThreadReplyAllowed}=await m,x=mock();
 await setForumThreadState(x.pool,G,channel,ROOT,{archived:true,locked:false,autoArchiveHours:0});
 await assert.rejects(assertForumThreadReplyAllowed(x.pool,G,channel,REPLY),e=>e.status===409);
 await setForumThreadState(x.pool,G,channel,REPLY,{archived:false,locked:true,autoArchiveHours:0});
 await assert.rejects(assertForumThreadReplyAllowed(x.pool,G,channel,REPLY),e=>e.status===409);
 await setForumThreadState(x.pool,G,channel,ROOT,{archived:false,locked:false,autoArchiveHours:0});
 assert.equal(await assertForumThreadReplyAllowed(x.pool,G,channel,REPLY),ROOT);
 assert.ok(x.statements.every(q=>!/DELETE FROM cmd_native_channel_messages/i.test(q.sql)));
});
test("Auto archive uses the last active timestamp and is disabled by default",async()=>{
 const {getForumThreadState}=await m,x=mock();
 x.setState({archived:false,locked:false,auto_archive_hours:24,last_activity_at:new Date(Date.now()-2*86400000)});
 const old=await getForumThreadState(x.pool,G,channel,REPLY);
 assert.equal(old.autoArchived,true);assert.equal(old.canReply,false);
 x.setState({...x.getState(),auto_archive_hours:0});
 assert.equal((await getForumThreadState(x.pool,G,channel,REPLY)).canReply,true);
});
test("Archive settings reject nonboolean flags or unapproved windows",async()=>{
 const {setForumThreadState}=await m,x=mock();
 for(const input of [{archived:"false",locked:false,autoArchiveHours:0},{archived:false,locked:false,autoArchiveHours:2},{archived:false,locked:false,autoArchiveHours:-1},{}]){
  await assert.rejects(setForumThreadState(x.pool,G,channel,ROOT,input),/invalide/);
 }
 assert.equal(x.statements.filter(q=>q.sql.includes("INSERT INTO cmd_native_forum_thread_state")).length,0);
});
test("Server validates permissions and limits controls to the original CMD native forum",()=>{
 assert.match(server,/initCmdForumThreadControls\(pool\)/);
 assert.ok(server.includes('url.pathname==="/api/native/forum-thread"'));
 assert.match(server,/await requireNativePermission\(auth,guildId,"manageChannels"\)/);
 assert.match(server,/assertForumThreadReplyAllowed\(pool,guildId,ch,replyTo\)/);
 assert.match(server,/touchForumThreadReply\(pool,forumRoot\)/);
 assert.match(server,/channelType:String\(CHAT.channelType\|\|"text"\)/);
});
test("Message menu exposes accessible opt-in thread controls, with no old message deletion",()=>{
 assert.match(menu,/function openForumThreadEditor\(article\)/);
 assert.match(menu,/ctx\.channelType!=='forum'/);
 assert.ok(menu.includes("🗂️ Gestion du fil"));
 assert.ok(menu.includes("autoArchiveHours:Number(select.value)"));
 assert.match(menu,/aria-label','Gestion du fil de discussion'/);
 assert.doesNotMatch(menu,/DELETE FROM cmd_native_channel_messages/);
});
