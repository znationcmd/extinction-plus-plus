"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const lib=import(pathToFileURL(path.join(__dirname,"..","cmd-native-announcement-follows.js")).href);
const SOURCE_G="11111111-1111-4111-8111-111111111111",SOURCE_C="22222222-2222-4222-8222-222222222222";
const DEST_G="33333333-3333-4333-8333-333333333333",DEST_C="44444444-4444-4444-8444-444444444444";
const input={sourceGuildId:SOURCE_G,sourceChannelId:SOURCE_C,destinationGuildId:DEST_G,destinationChannelId:DEST_C};
const auth={user:{id:"owner-1"}};
const accepted=async()=>({membership_role:"owner"});
function database({exists=0,targets=[]}={}){
 const calls=[];
 return {calls,async query(sql,args=[]){
  calls.push({sql,args});
  if(sql.includes("SELECT COUNT(*)::integer AS count"))return {rows:[{count:exists}]};
  if(sql.includes("INSERT INTO cmd_native_announcement_follows"))return {rows:[input],rowCount:1};
  if(sql.includes("DELETE FROM cmd_native_announcement_follows"))return {rows:[{source_channel_id:SOURCE_C}],rowCount:1};
  if(sql.startsWith("SELECT source_guild_id::text"))return {rows:[input]};
  if(sql.includes("FROM cmd_native_announcement_follows f"))return {rows:targets};
  if(sql.includes("INSERT INTO cmd_native_channel_messages"))return {rows:[{id:"abc"}],rowCount:1};
  return {rows:[]};
 }};
}
test("announcement follow table is additive and scoped by channel and guild identities",async()=>{
 const {initNativeAnnouncementFollows:boot}=await lib,queries=[];
 await boot({query:async sql=>{queries.push(sql);return {rows:[]}}});
 assert.equal(queries.length,2);
 assert.match(queries[0],/CREATE TABLE IF NOT EXISTS cmd_native_announcement_follows/);
 assert.match(queries[0],/PRIMARY KEY\(source_channel_id,destination_channel_id\)/);
 assert.match(queries[0],/CHECK\(source_guild_id<>destination_guild_id\)/);
 assert.doesNotMatch(queries.join(" "),/TRUNCATE|DROP TABLE/);
});
test("following requires administrator permission on BOTH distinct guilds",async()=>{
 const {followNativeAnnouncements:follow}=await lib,db=database(),permissions=[];
 await assert.rejects(follow(db,auth,{...input,sourceGuildId:DEST_G},{requireNativeAdmin:accepted}),e=>e.status===400);
 await assert.rejects(follow(db,auth,input,{requireNativeAdmin:async(_auth,gid)=>{
  permissions.push(gid);
  if(gid===DEST_G)throw Error("not administrator");
 }}),e=>e.status===403);
 assert.deepEqual(permissions,[SOURCE_G,DEST_G]);
 assert.equal(db.calls.length,0);
 const result=await follow(db,auth,input,{requireNativeAdmin:accepted});
 assert.equal(result.ok,true);
 const write=db.calls.find(x=>x.sql.includes("INSERT INTO cmd_native_announcement_follows"));
 assert.ok(write);
 assert.deepEqual(write.args,[SOURCE_G,SOURCE_C,DEST_G,DEST_C,"owner-1"]);
 assert.match(write.sql,/src.type='announcement' AND dst.type='announcement'/);
 assert.match(write.sql,/pub.is_public=TRUE/);
 assert.match(write.sql,/src.source_parent_id IS NULL/);
 assert.match(write.sql,/src.permission_overwrites='\[\]'::jsonb/);
 assert.match(write.sql,/everyone.permissions->>'viewChannels'='true'/);
});
test("source is never followed when channel is private or a duplicate",async()=>{
 const {followNativeAnnouncements:follow,MAX_FOLLOW_TARGETS:limit}=await lib;
 assert.equal(limit,20);
 const full=database({exists:20});
 await assert.rejects(follow(full,auth,input,{requireNativeAdmin:accepted}),e=>e.status===409);
 assert.ok(!full.calls.some(x=>x.sql.includes("INSERT INTO")));
 const q=database();
 q.query=async(sql,args=[])=>{q.calls.push({sql,args});return sql.includes("COUNT(*)")?{rows:[{count:0}]}:{rows:[]}};
 await assert.rejects(follow(q,auth,input,{requireNativeAdmin:accepted}),e=>e.status===400);
});
test("either source or destination administrator can revoke, but an outsider cannot",async()=>{
 const {unfollowNativeAnnouncements:unfollow}=await lib,db=database();
 await assert.rejects(unfollow(db,auth,input,{requireNativeAdmin:async()=>{throw Error("no")}}),e=>e.status===403);
 assert.equal(db.calls.length,0);
 const ownDest=async(_auth,id)=>{if(id===SOURCE_G)throw Error("not source admin")};
 const done=await unfollow(db,auth,input,{requireNativeAdmin:ownDest});
 assert.equal(done.removed,true);
 const stmt=db.calls.at(-1);
 assert.match(stmt.sql,/DELETE FROM cmd_native_announcement_follows/);
 assert.deepEqual(stmt.args,[SOURCE_G,SOURCE_C,DEST_G,DEST_C]);
});
test("list requires native admin and scopes the returned subscription pairs",async()=>{
 const {listNativeAnnouncementFollows:list}=await lib,db=database();
 await assert.rejects(list(db,auth,{guildId:SOURCE_G},{requireNativeAdmin:async()=>{throw Error("no")}}),e=>e.status===403);
 assert.equal(db.calls.length,0);
 const found=await list(db,auth,{guildId:SOURCE_G},{requireNativeAdmin:accepted});
 assert.equal(found.guildId,SOURCE_G);
 assert.equal(found.follows.length,1);
 assert.match(db.calls[0].sql,/source_guild_id=\$1::uuid OR destination_guild_id=\$1::uuid/);
});
test("relay forwards text only and no author IDs, passwords or attachment metadata",async()=>{
 const {relayNativeAnnouncement:relay}=await lib;
 const db=database({targets:[{guildId:DEST_G,channelId:DEST_C,creatorId:"owner-1",sourceName:"Serveur public"}]});
 const result=await relay(db,{guildId:SOURCE_G,channelId:SOURCE_C,body:"Bonjour @everyone et @here !"});
 assert.equal(result.relayed,1);
 const query=db.calls[0];
 assert.match(query.sql,/g.is_public=TRUE/);
 assert.match(query.sql,/src.permission_overwrites='\[\]'::jsonb/);
 assert.match(query.sql,/everyone.permissions->>'viewChannels'='true'/);
 assert.match(query.sql,/source_admin.membership_role IN \('owner','admin'\)/);
 assert.match(query.sql,/allowed.membership_role IN \('owner','admin'\)/);
 const insert=db.calls[1];
 assert.match(insert.sql,/INSERT INTO cmd_native_channel_messages/);
 assert.equal(insert.args[1],DEST_G);
 assert.equal(insert.args[2],DEST_C);
 assert.equal(insert.args[3],"owner-1");
 assert.ok(insert.args[4].startsWith("📢 Annonce publique de Serveur public"));
 assert.ok(!insert.args[4].includes("@everyone"));
 assert.ok(!insert.args[4].includes("@here"));
 const metadata=JSON.parse(insert.args[5]);
 assert.deepEqual(metadata.webhook,{name:"Relais CMD"});
 assert.equal(metadata.relay.sourceGuildId,SOURCE_G);
 assert.equal(metadata.relay.sourceChannelId,SOURCE_C);
 assert.ok(!("attachments" in metadata));
});
test("empty or invalid source message skips relay with no database query",async()=>{
 const {relayNativeAnnouncement:relay}=await lib,db=database();
 assert.deepEqual(await relay(db,{guildId:SOURCE_G,channelId:SOURCE_C,body:"  "}),{relayed:0});
 assert.deepEqual(await relay(db,{guildId:"invalid",channelId:SOURCE_C,body:"test"}),{relayed:0});
 assert.equal(db.calls.length,0);
});
test("native HTTP follows require login and approved methods",async()=>{
 const {handleNativeAnnouncementFollows:route}=await lib,db=database(),events=[];
 const sendJson=(_res,status,body)=>events.push({status,body});
 const deps={pool:db,auth,sendJson,readBody:async()=>input,requireNativeAdmin:accepted};
 assert.equal(await route({method:"GET"},{},new URL("https://cmd.test/unrelated"),deps),false);
 await route({method:"PATCH"},{},new URL("https://cmd.test/api/native/announcement-follows"),deps);
 assert.equal(events.at(-1).status,405);
 await route({method:"GET"},{},new URL("https://cmd.test/api/native/announcement-follows"),{...deps,auth:null});
 assert.equal(events.at(-1).status,401);
 await route({method:"POST"},{setHeader(){}},new URL("https://cmd.test/api/native/announcement-follows"),deps);
 assert.equal(events.at(-1).status,200);
});
test("native server only relays actual announcement messages; settings have working follow/revoke controls",()=>{
 const root=path.join(__dirname,"..");
 const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
 const settings=fs.readFileSync(path.join(root,"cmd-server-manager.js"),"utf8");
 assert.match(server,/await initNativeAnnouncementFollows\(pool\)/);
 assert.match(server,/handleNativeAnnouncementFollows\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson,readBody:readFormBodyJson,requireNativeAdmin\}\)/);
 assert.match(server,/if\(ch.type==="announcement"&&body.trim\(\)\)/);
 assert.match(server,/await relayNativeAnnouncement\(pool,\{guildId,channelId:String\(ch.id\),body\}\)/);
 assert.match(settings,/id="csm-native-follows"/);
 assert.match(settings,/loadNativeAnnouncementFollows\(\)/);
 assert.match(settings,/api\/native\/announcement-follows/);
 assert.match(settings,/sourceGuildId:guildId/);
 assert.match(settings,/},'DELETE'\)/);
});
