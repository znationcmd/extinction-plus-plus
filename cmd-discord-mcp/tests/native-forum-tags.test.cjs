"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const m=import("../cmd-forum-tags.js");
const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const manager=fs.readFileSync(path.join(__dirname,"../cmd-server-manager.js"),"utf8");
const G="11111111-1111-4111-8111-111111111111",C="22222222-2222-4222-8222-222222222222";
const credentials={user:{id:"33333333-3333-4333-8333-333333333333"}};
const make=()=>{const state=new Map(),queries=[];
 const pool={async query(sql,args=[]){
  queries.push({sql,args});
  if(sql.startsWith("SELECT tags,gallery"))return {rows:state.has(args[1])?[state.get(args[1])]:[]};
  if(sql.startsWith("INSERT INTO cmd_native_forum_settings")){
   const saved={tags:JSON.parse(args[2]),gallery:args[3]};state.set(args[0],saved);return {rows:[saved]};
  }
  return {rows:[]};
 }};
 const lookup=async(guildId,channelId)=>guildId===G&&channelId===C?{id:C,type:"forum"}:null;
 const permission=async(auth,guildId,key)=>{if(auth!==credentials||guildId!==G||key!=="manageChannels")throw Object.assign(Error("Accès refusé"),{status:403});};
 const membership=async(auth,guildId)=>{if(auth!==credentials||guildId!==G)throw Object.assign(Error("Accès refusé"),{status:403});};
 return {pool,state,queries,lookup,permission,membership};
};
test("Forum setup uses additive SQL and does not touch historical messages",async()=>{
 const x=make();await (await m).initCmdForumTags(x.pool);
 assert.ok(x.queries.some(x=>x.sql.includes("CREATE TABLE IF NOT EXISTS cmd_native_forum_settings")));
 assert.ok(x.queries.every(x=>!/\b(?:DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM|ALTER\s+TABLE[^;]*\bDROP\s+COLUMN)\b/i.test(x.sql)),"ON DELETE CASCADE is referential integrity, not a deletion command");
});
test("Forum tags reject duplicates, oversized names, dangerous input, bad colors",async()=>{
 const {normalizeForumTags}=await m;
 assert.deepEqual(normalizeForumTags([{name:"Aide",color:"#AACCFF"}]),[{name:"Aide",color:"#aaccff"}]);
 for(const bad of [[{name:"<script>"}],[{name:"A",color:"red"}],[{name:"T"},{name:"t"}],Array.from({length:21},(_,i)=>({name:"tag"+i}))])
  assert.throws(()=>normalizeForumTags(bad));
});
test("Forum editor persists exact guild/channel-scoped settings; read requires membership",async()=>{
 const {getCmdForumSettings,setCmdForumSettings}=await m,x=make();
 const payload={guildId:G,channelId:C,tags:[{name:"Questions",color:"#8833aa"},{name:"Résolu",color:"#ffffff"}],gallery:true};
 const out=await setCmdForumSettings(x.pool,credentials,payload,x.lookup,x.permission);
 assert.equal(out.gallery,true);assert.equal(out.tags.length,2);
 const persisted=await getCmdForumSettings(x.pool,credentials,G,C,x.lookup,x.membership);
 assert.equal(persisted.channelId,C);assert.deepEqual(persisted.tags,out.tags);
 await assert.rejects(getCmdForumSettings(x.pool,{user:{id:"other"}},G,C,x.lookup,x.membership),e=>e.status===403);
});
test("Forum mutation requires manageChannels permission, exact forum and boolean gallery",async()=>{
 const {setCmdForumSettings}=await m,x=make();
 const payload={guildId:G,channelId:C,tags:[],gallery:false};
 await assert.rejects(setCmdForumSettings(x.pool,{user:{id:"other"}},payload,x.lookup,x.permission),e=>e.status===403);
 await assert.rejects(setCmdForumSettings(x.pool,credentials,{...payload,channelId:G},x.lookup,x.permission),e=>e.status===404);
 await assert.rejects(setCmdForumSettings(x.pool,credentials,{...payload,gallery:"false"},x.lookup,x.permission),/galerie/);
 assert.equal(x.state.size,0);
});
test("API and live forum editor are wired to real permissions and no Discord writes",()=>{
 assert.ok(server.includes('url.pathname==="/api/forums/tags"'));
 assert.match(server,/getCmdForumSettings\(pool,auth,gid,cid,lookup,requireNativeMember\)/);
 assert.match(server,/setCmdForumSettings\(pool,auth,await readFormBodyJson\(req\),lookup,requireNativePermission\)/);
 assert.match(server,/initCmdForumTags\(pool\)/);
 assert.match(manager,/id="csm-forum-tags-save"/);
 assert.match(manager,/method:'PATCH',credentials:'same-origin'/);
 assert.match(manager,/isNative\(\)&&ch.type==='forum'/);
 assert.doesNotMatch(manager.slice(manager.indexOf("function editChannel(chId)"),manager.indexOf("function editRole(roleId)")),/discord\.com\/api/);
});
