"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const lib=import(pathToFileURL(path.join(__dirname,"..","cmd-native-audit-log.js")).href);
const GUILD="11111111-1111-4111-8111-111111111111";
const auth={user:{id:"owner-1"}};
const url=(params={})=>new URL("https://cmd.test/api/native/audit-log?"+new URLSearchParams({guildId:GUILD,...params}));
function fakeWriter(initialHash=""){
 const calls=[],records=[],client={
  async query(sql,args=[]){
   calls.push({sql,args});
   if(sql.startsWith("SELECT entry_hash"))return {rows:initialHash?[{entry_hash:initialHash}]:[]};
   if(sql.startsWith("INSERT INTO cmd_native_audit_log")){records.push(args);return {rows:[{seq:records.length}]}};
   return {rows:[]};
  },release(){calls.push({sql:"RELEASE",args:[]})}
 };
 return {calls,records,connect:async()=>client,query:async sql=>{calls.push({sql,args:[]});return {rows:[]}}};
}
test("audit schema is additive and scoped to existing server",async()=>{
 const {initCmdNativeAudit}=await lib;
 const queries=[];
 await initCmdNativeAudit({query:async sql=>{queries.push(sql);return {rows:[]}}});
 assert.equal(queries.length,2);
 assert.match(queries[0],/CREATE TABLE IF NOT EXISTS cmd_native_audit_log/);
 assert.match(queries[0],/REFERENCES cmd_native_guilds\(id\) ON DELETE CASCADE/);
 assert.match(queries[1],/CREATE INDEX IF NOT EXISTS/);
 assert.doesNotMatch(queries.join(" "),/DROP TABLE|TRUNCATE/);
});
test("write stores authenticated actor and chained SHA256, not message content",async()=>{
 const {appendCmdNativeAudit:write,nativeAuditTarget:target}=await lib;
 const db=fakeWriter("previous-valid-hash");
 const entry=await write(db,auth,{guildId:GUILD,action:"update_role",targetId:target("update_role",{roleId:"role-1"})},{now:new Date("2026-10-18T10:00:00.000Z")});
 assert.equal(entry.recorded,true);
 assert.deepEqual(db.calls.filter(c=>c.sql==="BEGIN"||c.sql==="COMMIT").map(c=>c.sql),["BEGIN","COMMIT"]);
 assert.match(db.calls[1].sql,/pg_advisory_xact_lock/);
 assert.equal(db.records[0][0],GUILD);
 assert.equal(db.records[0][1],"owner-1");
 assert.equal(db.records[0][2],"update_role");
 assert.equal(db.records[0][3],"role-1");
 assert.equal(db.records[0][5],"previous-valid-hash");
 assert.match(db.records[0][6],/^[0-9a-f]{64}$/);
 assert.ok(!JSON.stringify(db.records).includes("password"));
});
test("bad actions and arbitrary targets fail before writing",async()=>{
 const {appendCmdNativeAudit:write,nativeAuditTarget:target}=await lib;
 const db=fakeWriter();
 assert.equal(target("delete_role",{roleId:"../../secrets"}),null);
 assert.equal(target("made_up",{channelId:"123"}),null);
 await assert.rejects(write(db,auth,{guildId:GUILD,action:"made_up"}),e=>e.status===400);
 await assert.rejects(write(db,auth,{guildId:GUILD,action:"update_channel",targetId:"<script>"}),e=>e.status===400);
 await assert.rejects(write(db,null,{guildId:GUILD,action:"create_role"}),e=>e.status===401);
 assert.equal(db.records.length,0);
});
test("read requires server admin and no unauthorized SQL reads",async()=>{
 const {readCmdNativeAudit:read}=await lib;
 const calls=[];
 const pool={async query(sql,args){calls.push({sql,args});return {rows:[{seq:9,actorId:"owner-1",action:"create_channel",targetId:null,occurredAt:"2026-10-18T10:00:00Z"}]}}};
 await assert.rejects(read(pool,auth,{guildId:GUILD,limit:10},{requireNativeAdmin:async()=>{throw Error("member")}}),e=>e.status===403);
 assert.equal(calls.length,0);
 const result=await read(pool,auth,{guildId:GUILD,limit:10},{requireNativeAdmin:async()=>({membership_role:"admin"})});
 assert.equal(result.entries.length,1);
 assert.equal(result.entries[0].action,"create_channel");
 assert.equal(calls.length,1);
 assert.match(calls[0].sql,/WHERE guild_id=\$1::uuid/);
 assert.deepEqual(calls[0].args,[GUILD,null,10]);
 assert.doesNotMatch(calls[0].sql,/SELECT \*|DELETE|UPDATE|INSERT/);
});
test("HTTP input rejects wrong method, missing login, invalid cursor and limit",async()=>{
 const {handleCmdNativeAudit:route,nativeAuditQuery:parse}=await lib;
 for(const q of [{guildId:"bad"},{before:"0"},{before:"1 OR 1=1"},{limit:"51"},{limit:"0"},{limit:"oops"}])
  assert.throws(()=>parse(url(q)),e=>e.status===400);
 const sent=[],headers=[];
 const sendJson=(_res,status,payload)=>sent.push([status,payload]);
 const deps={pool:{query:async()=>({rows:[]})},auth,sendJson,requireNativeAdmin:async()=>({membership_role:"owner"})};
 assert.equal(await route({method:"GET"},{},new URL("https://cmd.test/other"),deps),false);
 await route({method:"POST"},{},url(),deps);assert.equal(sent.at(-1)[0],405);
 await route({method:"GET"},{},url(),{...deps,auth:null});assert.equal(sent.at(-1)[0],401);
 await route({method:"GET"},{setHeader:(name,value)=>headers.push([name,value])},url(),deps);
 assert.equal(sent.at(-1)[0],200);
 assert.ok(headers.some(([key,value])=>key==="Cache-Control"&&value==="private, no-store"));
});
test("server successful native action and UI are connected without affecting Discord",()=>{
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
 assert.match(server,/await initCmdNativeAudit\(pool\)/);
 assert.match(server,/await appendCmdNativeAudit\(pool,auth/);
 assert.match(server,/handleCmdNativeAudit\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson,requireNativeAdmin\}\)/);
 assert.match(manager,/id="csm-native-audit"/);
 assert.match(manager,/loadNativeAudit\(before=null,append=false\)/);
 assert.match(manager,/api\/native\/audit-log/);
});
