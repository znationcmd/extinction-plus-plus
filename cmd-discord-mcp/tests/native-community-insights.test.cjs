"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const lib=import(pathToFileURL(path.join(__dirname,"..","cmd-community-insights.js")).href);
const GUILD="11111111-1111-4111-8111-111111111111",auth={user:{id:"alice"}};
function url(extra={}){
 return new URL("https://cmd.test/api/native/community-insights?"+new URLSearchParams({guildId:GUILD,...extra}));
}
function pool(active=3){
 const calls=[];
 return {calls,async query(sql,args){
  calls.push({sql,args});
  if(sql.includes("FROM cmd_native_members")&&sql.includes("joined_at"))return {rows:[{count:2}]};
  if(sql.includes("FROM cmd_native_members"))return {rows:[{count:12}]};
  if(sql.includes("FROM cmd_native_channels"))return {rows:[{count:8}]};
  if(sql.includes("FROM cmd_native_channel_messages"))return {rows:[{count:29,active}]};
  throw Error("Unexpected aggregate query");
 }};
}
test("input only accepts valid server IDs and bounded period values",async()=>{
 const {parseCommunityInsights:p}=await lib;
 assert.deepEqual(p(url()),{guildId:GUILD,period:"7d",days:7});
 assert.equal(p(url({period:"30d"})).days,30);
 for(const p1 of [{guildId:"x"},{period:"1d"},{period:"365d"},{period:"7d UNION SELECT"}]){
  assert.throws(()=>p(url(p1)),e=>e.status===400);
 }
});
test("outsider or member without admin authorization cannot query a single count",async()=>{
 const {loadCommunityInsights:load}=await lib,db=pool();
 await assert.rejects(load(db,auth,{guildId:GUILD,period:"7d",days:7},{requireNativeAdmin:async()=>{throw Error("not admin")}}),e=>e.status===403);
 assert.equal(db.calls.length,0);
 await assert.rejects(load(db,auth,{guildId:GUILD,period:"7d",days:7},{}),e=>e.status===503);
 assert.equal(db.calls.length,0);
 await assert.rejects(load(db,null,{guildId:GUILD,period:"7d",days:7},{requireNativeAdmin:async()=>{}}),e=>e.status===401);
});
test("insights provide aggregate native data only and hide small cohorts",async()=>{
 const {loadCommunityInsights:load,COMMUNITY_PRIVACY_THRESHOLD}=await lib,db=pool(4);
 const result=await load(db,auth,{guildId:GUILD,period:"30d",days:30},{requireNativeAdmin:async()=>({membership_role:"owner"})});
 assert.equal(COMMUNITY_PRIVACY_THRESHOLD,5);
 assert.deepEqual([result.members,result.channels,result.messages,result.newMembers],[12,8,29,2]);
 assert.equal(result.activeMembers,null);
 assert.equal(result.privacy.activeMembersSuppressed,true);
 assert.equal(result.aggregation,"stored_native_server_data_only");
 assert.equal(db.calls.length,4);
 for(const call of db.calls){
  assert.equal(call.args[0],GUILD);
  assert.match(call.sql,/COUNT\(/);
  assert.doesNotMatch(call.sql,/(SELECT \*|GROUP BY sender_user_id|RETURNING|DELETE|UPDATE|INSERT)/i);
  if(call.args.length===2)assert.equal(call.args[1],30);
 }
 assert.ok(!JSON.stringify(result).includes("alice"));
});
test("larger active cohorts are shown only as numeric count",async()=>{
 const {loadCommunityInsights:load}=await lib,db=pool(13);
 const result=await load(db,auth,{guildId:GUILD,period:"7d",days:7},{requireNativeAdmin:async()=>({membership_role:"admin"})});
 assert.equal(result.activeMembers,13);
 assert.equal(result.privacy.activeMembersSuppressed,false);
});
test("route requires login, GET, authorized native admin, and no-store",async()=>{
 const {handleCommunityInsights:route}=await lib;
 const records=[],headers=[],sendJson=(_res,status,obj)=>records.push({status,obj});
 const deps={pool:pool(5),auth,sendJson,requireNativeAdmin:async()=>({membership_role:"owner"})};
 assert.equal(await route({method:"GET"},{},new URL("https://cmd.test/api/other"),deps),false);
 await route({method:"POST"},{},url(),deps);assert.equal(records.at(-1).status,405);
 await route({method:"GET"},{},url(),{...deps,auth:null});assert.equal(records.at(-1).status,401);
 await route({method:"GET"},{setHeader:(k,v)=>headers.push([k,v])},url(),deps);
 assert.equal(records.at(-1).status,200);
 assert.ok(headers.some(([key,value])=>key==="Cache-Control"&&value==="private, no-store"));
 await route({method:"GET"},{},url(),{...deps,requireNativeAdmin:async()=>{throw Error("no access")}});
 assert.equal(records.at(-1).status,403);
});
test("native server analytics menu renders genuine private data, not an empty placeholder",()=>{
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
 assert.match(server,/handleCommunityInsights\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson,requireNativeAdmin\}\)/);
 assert.match(manager,/id="csm-native-insights"/);
 assert.match(manager,/loadNativeInsights\(period='7d'\)/);
 assert.match(manager,/api\/native\/community-insights\?guildId=/);
 assert.match(manager,/aria-pressed/);
 assert.doesNotMatch(manager,/Les statistiques ne sont pas encore disponibles dans cette rubrique/);
});
