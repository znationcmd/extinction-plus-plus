"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const lib=import(pathToFileURL(path.join(__dirname,"..","cmd-community-discovery.js")).href);
const GUILD="11111111-1111-4111-8111-111111111111",auth={user:{id:"owner-1"}};
const url=(q={})=>new URL("https://cmd.test/api/native/community-discovery?"+new URLSearchParams(q));
test("directory initially unlisted with additive safe schema and separate visibility switch",async()=>{
 const {initCmdDiscovery}=await lib,sql=[];
 await initCmdDiscovery({query:async str=>{sql.push(str);return {rows:[]}}});
 assert.equal(sql.length,2);
 assert.match(sql[0],/ADD COLUMN IF NOT EXISTS discovery_opt_in BOOLEAN NOT NULL DEFAULT FALSE/);
 assert.match(sql[1],/WHERE is_public=TRUE AND discovery_opt_in=TRUE/);
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 assert.match(server,/await initCmdDiscovery\(pool\)/);
 assert.match(server,/discovery_opt_in=CASE WHEN \$4::boolean=FALSE THEN FALSE ELSE discovery_opt_in END/);
});
test("search returns only minimal opt-in public guild metadata, no invitations or member data",async()=>{
 const {listDiscoverableGuilds,discoverySearchParams}=await lib,queries=[];
 const pool={async query(sql,args){queries.push({sql,args});return {rows:[{id:GUILD,name:"Serveur public",description:"Bienvenue",invite_code:"SECRET",owner_user_id:"private"}]}}};
 const result=await listDiscoverableGuilds(pool,auth,discoverySearchParams(url({q:" public "})));
 assert.equal(result.mode,"opt_in_only");assert.equal(result.limit,20);
 assert.deepEqual(result.guilds,[{id:GUILD,name:"Serveur public",description:"Bienvenue"}]);
 assert.deepEqual(queries[0].args,["public"]);
 assert.match(queries[0].sql,/is_public=TRUE AND discovery_opt_in=TRUE/);
 assert.match(queries[0].sql,/LIMIT 20/);
 assert.doesNotMatch(queries[0].sql,/invite_code|owner_user_id|SELECT \*/);
 assert.ok(!JSON.stringify(result).includes("SECRET"));
 for(const q of ["a".repeat(65),"hello\u0001"])assert.throws(()=>discoverySearchParams(url({q})),e=>e.status===400);
});
test("only owner can read or mutate own listing and cannot publish private server",async()=>{
 const {ownDiscoverySettings,setDiscoverySettings}=await lib;
 const queries=[];
 const pool={async query(sql,args){
  queries.push({sql,args});
  if(sql.startsWith("SELECT"))return {rows:[{is_public:false,discovery_opt_in:false}]};
  return {rows:[]};
 }};
 const denied=async()=>{throw Error("not owner")};
 await assert.rejects(ownDiscoverySettings(pool,auth,GUILD,{requireNativeOwner:denied}),e=>e.status===403);
 assert.equal(queries.length,0);
 const allow=async()=>({membership_role:"owner"});
 const own=await ownDiscoverySettings(pool,auth,GUILD,{requireNativeOwner:allow});
 assert.deepEqual(own,{guildId:GUILD,isPublic:false,listed:false});
 await assert.rejects(setDiscoverySettings(pool,auth,{guildId:GUILD,listed:true},{requireNativeOwner:allow}),e=>e.status===400);
 assert.match(queries.at(-1).sql,/owner_user_id=\$3 AND \(is_public=TRUE OR \$2=FALSE\)/);
 assert.deepEqual(queries.at(-1).args,[GUILD,true,"owner-1"]);
 await assert.rejects(setDiscoverySettings(pool,auth,{guildId:GUILD,listed:"true"},{requireNativeOwner:allow}),e=>e.status===400);
});
test("public guild owner can list and unlist without affecting guild messages or invitations",async()=>{
 const {setDiscoverySettings}=await lib,mutations=[];
 const pool={async query(sql,args){
  if(sql.startsWith("SELECT"))return {rows:[{is_public:true,discovery_opt_in:false}]};
  mutations.push({sql,args});return {rows:[{is_public:true,discovery_opt_in:args[1]}]};
 }};
 const deps={requireNativeOwner:async()=>({membership_role:"owner"})};
 const yes=await setDiscoverySettings(pool,auth,{guildId:GUILD,listed:true},deps);
 const no=await setDiscoverySettings(pool,auth,{guildId:GUILD,listed:false},deps);
 assert.equal(yes.listed,true);assert.equal(no.listed,false);
 assert.equal(mutations.length,2);
 for(const mutation of mutations){
  assert.match(mutation.sql,/UPDATE cmd_native_guilds SET discovery_opt_in=/);
  assert.doesNotMatch(mutation.sql,/DELETE|TRUNCATE|invite_code|cmd_native_members/);
 }
});
test("HTTP route requires session, allows GET and POST only, protects mine settings",async()=>{
 const {handleCmdDiscovery}=await lib,sent=[];
 const sendJson=(_res,status,payload)=>sent.push([status,payload]);
 const pool={async query(sql,args){
  if(sql.startsWith("SELECT is_public"))return {rows:[{is_public:true,discovery_opt_in:false}]};
  if(sql.includes("SELECT id::text"))return {rows:[]};
  if(sql.startsWith("UPDATE"))return {rows:[{is_public:true,discovery_opt_in:true}]};
  throw Error("Unexpected query");
 }};
 const deps={pool,auth,sendJson,readBody:async()=>({guildId:GUILD,listed:true}),requireNativeOwner:async()=>{}};
 assert.equal(await handleCmdDiscovery({method:"GET"},{},url({mode:"mine",guildId:GUILD}),deps),true);
 assert.equal(sent.at(-1)[0],200);
 await handleCmdDiscovery({method:"GET"},{},url(),{...deps,auth:null});assert.equal(sent.at(-1)[0],401);
 await handleCmdDiscovery({method:"DELETE"},{},url(),deps);assert.equal(sent.at(-1)[0],405);
 await handleCmdDiscovery({method:"POST"},{},url(),deps);assert.equal(sent.at(-1)[0],200);
 await handleCmdDiscovery({method:"GET"},{},url({mode:"bogus"}),deps);assert.equal(sent.at(-1)[0],400);
});
test("settings UI offers voluntary public-only checkbox and no private invite leak",()=>{
 const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 assert.match(manager,/id="csm-native-discovery"/);
 assert.match(manager,/settings\.isPublic/);
 assert.match(manager,/toggle\.disabled=!settings\.isPublic/);
 assert.match(manager,/api\/native\/community-discovery/);
 assert.match(server,/handleCmdDiscovery\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson,readBody:readFormBodyJson,requireNativeOwner\}\)/);
});
