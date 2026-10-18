"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const mod=import("../cmd-social-privacy.js");
const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const ui=fs.readFileSync(path.join(__dirname,"../cmd-social-privacy-ui.js"),"utf8");
const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const C="33333333-3333-4333-8333-333333333333";
function mockDb(){
 const blocks=new Set(),prefs=new Map(),shared=new Set(),queries=[];
 const db={async query(sql,args=[]){
  queries.push({sql,args});
  if(sql.startsWith("CREATE ")||sql.startsWith("ALTER "))return {rows:[]};
  if(sql.includes("FROM cmd_user_blocks WHERE\n  (blocker_user_id="))
   return {rows:blocks.has(args[0]+":"+args[1])||blocks.has(args[1]+":"+args[0])?[{ok:1}]:[]};
  if(sql.includes("FROM cmd_user_blocks b"))return {rows:[...blocks].filter(x=>x.startsWith(args[0]+":")).map(x=>({user_id:x.split(":")[1],created_at:"2026-10-18",username:"user",display_name:"User"}))};
  if(sql.includes("INSERT INTO cmd_user_blocks(")){blocks.add(args[0]+":"+args[1]);return {rows:[]}};
  if(sql.includes("DELETE FROM cmd_user_blocks")){blocks.delete(args[0]+":"+args[1]);return {rows:[]}};
  if(sql.includes("SELECT id FROM cmd_accounts WHERE id::text="))return {rows:[{id:args[0]}]};
  if(sql.includes("FROM cmd_friend_request_privacy WHERE"))return {rows:prefs.has(args[0])?[prefs.get(args[0])]:[]};
  if(sql.includes("INSERT INTO cmd_friend_request_privacy(")){
   const row={allow_everyone:args[1],allow_shared_servers:args[2]};prefs.set(args[0],row);return {rows:[row]};
  }
  if(sql.includes("JOIN cmd_native_members t ON t.guild_id="))return {rows:shared.has(args[0]+":"+args[1])?[{ok:1}]:[]};
  throw Error("Unexpected DB query: "+sql.slice(0,120));
 }};
 return {db,blocks,prefs,shared,queries};
}
test("Only additive, idempotent schema DDL is used",async()=>{
 const x=mockDb(),{initCmdSocialPrivacy}=await mod;
 await initCmdSocialPrivacy(x.db);
 assert.equal(x.queries.length,3);
 assert.ok(x.queries.every(q=>!(/DROP|TRUNCATE/i).test(q.sql)));
 assert.ok(x.queries.every(q=>q.sql.includes("IF NOT EXISTS")));
});
test("Account ID validation prevents unsafe, bogus and self-targeted requests",async()=>{
 const {requireAccountId,setAccountBlock}=await mod;
 assert.equal(requireAccountId(A),A);
 for(const bad of ["","../../etc","invalid","123 OR true",null])assert.throws(()=>requireAccountId(bad),/invalide/);
 await assert.rejects(setAccountBlock(mockDb().db,A,A,"block"),/toi-même/);
 await assert.rejects(setAccountBlock(mockDb().db,A,B,"erase"),/invalide/);
});
test("Blocks are account-scoped, symmetrical for interaction and can be lifted without touching messages",async()=>{
 const {setAccountBlock,isBlockedPair,listAccountBlocks}=await mod;
 const x=mockDb();
 assert.equal((await setAccountBlock(x.db,A,B,"block")).blocked,true);
 assert.equal(await isBlockedPair(x.db,A,B),true);
 assert.equal(await isBlockedPair(x.db,B,A),true);
 assert.equal(await isBlockedPair(x.db,A,C),false);
 assert.equal((await listAccountBlocks(x.db,A)).length,1);
 assert.equal((await listAccountBlocks(x.db,B)).length,0);
 await setAccountBlock(x.db,A,B,"unblock");
 assert.equal(await isBlockedPair(x.db,A,B),false);
 assert.ok(x.queries.every(q=>!/DELETE FROM cmd_(friendships|dm_messages|dm_threads|accounts)/.test(q.sql)));
});
test("An existing block stops requests even if other privacy preferences allow everyone",async()=>{
 const {setAccountBlock,assertFriendRequestPermitted,assertNotBlocked}=await mod;
 const x=mockDb();
 await setAccountBlock(x.db,B,A,"block");
 await assert.rejects(assertFriendRequestPermitted(x.db,A,B),e=>e.status===403);
 await assert.rejects(assertNotBlocked(x.db,A,B),e=>e.status===403);
 await assertNotBlocked(x.db,A,C);
});
test("Friends privacy applies independently to the target user and allows shared servers when opted in",async()=>{
 const {updateFriendRequestPrivacy,assertFriendRequestPermitted}=await mod;
 const x=mockDb();
 await updateFriendRequestPrivacy(x.db,B,{allowEveryone:false,allowSharedServers:true});
 await assert.rejects(assertFriendRequestPermitted(x.db,A,B),e=>e.status===403);
 x.shared.add(A+":"+B);
 assert.equal(await assertFriendRequestPermitted(x.db,A,B),true);
 await updateFriendRequestPrivacy(x.db,B,{allowEveryone:false,allowSharedServers:false});
 await assert.rejects(assertFriendRequestPermitted(x.db,A,B),e=>e.status===403);
 assert.equal(await assertFriendRequestPermitted(x.db,A,C),true);
});
test("Privacy update refuses coercion, missing inputs and persists exact booleans",async()=>{
 const {updateFriendRequestPrivacy,getFriendRequestPrivacy}=await mod;
 const x=mockDb();
 for(const body of [{allowEveryone:"false",allowSharedServers:true},{allowEveryone:false},null,{}])
  await assert.rejects(updateFriendRequestPrivacy(x.db,A,body),/invalides/);
 const written=await updateFriendRequestPrivacy(x.db,A,{allowEveryone:false,allowSharedServers:false});
 assert.deepEqual(written,{allowEveryone:false,allowSharedServers:false});
 assert.deepEqual(await getFriendRequestPrivacy(x.db,A),written);
});
test("Server enforces blocking before friend requests and DM starts and sends",()=>{
 assert.match(server,/await assertFriendRequestPermitted\(pool,me,other\)/);
 assert.match(server,/await assertNotBlocked\(pool,me,String\(req.requester_user_id\)\)/);
 assert.match(server,/async function startDmThread\([\s\S]*?await assertNotBlocked\(pool,me,other\)/);
 assert.match(server,/async function sendDmMessage\([\s\S]*?await assertNotBlocked\(pool,me,other\)/);
 for(const part of ["/api/account/blocked","/api/account/privacy/friend-requests"])
  assert.ok(server.includes('url.pathname==="'+part+'"'));
 assert.match(server,/initCmdSocialPrivacy\(pool\)/);
 assert.match(server,/cmd-social-privacy-ui\.js/);
});
test("Visible privacy controls are wired to real APIs and do not disclose secret values",()=>{
 assert.match(ui,/id="cmdPrivacyPanel"/);
 assert.match(ui,/api\("\/api\/account\/blocked"/);
 assert.match(ui,/api\("\/api\/account\/privacy\/friend-requests"/);
 assert.match(ui,/json\("PATCH",\{allowEveryone:allInput.checked,allowSharedServers:sharedInput.checked\}\)/);
 assert.match(ui,/credentials:"same-origin"/);
 assert.doesNotMatch(ui,/localStorage|access_token|bearer/i);
 assert.doesNotThrow(()=>new Function(ui));
});
