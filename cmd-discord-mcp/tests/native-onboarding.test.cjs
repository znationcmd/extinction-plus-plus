"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const load=import(pathToFileURL(path.join(__dirname,"..","cmd-native-onboarding.js")).href);
const guildId="11111111-1111-4111-8111-111111111111",roleId="22222222-2222-4222-8222-222222222222";
const user={user:{id:"member-1"}},owner={user:{id:"owner-1"}};
const memberGuard=async()=>({membership_role:"member"});
const ownerGuard=async()=>({membership_role:"owner"});
const safeRole={id:roleId,name:"Survivant",permissions:{viewChannels:true,sendMessages:true,readHistory:true}};
function mockDb({listed=true,canChoose=true,alreadyPicked=false,safe=true}={}){
 const calls=[],db={calls};
 db.query=async(sql,args=[])=>{
  calls.push({sql,args});
  if(sql.startsWith("SELECT enabled,welcome_text"))return {rows:[{enabled:true,welcome_text:"Bonjour !",role_choices:[roleId]}]};
  if(sql.startsWith("SELECT id::text AS id,name,permissions"))return {rows:[safe?{...safeRole}:{...safeRole,permissions:{administrator:true}}]};
  if(sql.startsWith("SELECT role_id::text"))return {rows:alreadyPicked?[{roleId}]:[]};
  if(sql.includes("INSERT INTO cmd_native_onboarding("))return {rows:[{enabled:true,welcome_text:"Salut",role_choices:[roleId]}]};
  throw Error("Unexpected query: "+sql);
 };
 db.connect=async()=>({release:()=>calls.push({sql:"RELEASE"}),query:async(sql,args=[])=>{
  calls.push({sql,args});
  if(sql.startsWith("SELECT user_id FROM cmd_native_members"))return {rows:[{user_id:"member-1"}]};
  if(sql.startsWith("SELECT role_id FROM cmd_native_onboarding_picks"))return {rows:alreadyPicked?[{role_id:roleId}]:[]};
  if(sql.startsWith("SELECT enabled,role_choices FROM"))return {rows:[{enabled:canChoose,role_choices:listed?[roleId]:[]}]};
  if(sql.startsWith("SELECT id::text AS id,name,permissions"))return {rows:[safe?{...safeRole}:{...safeRole,permissions:{manageGuild:true}}]};
  return {rows:[]};
 }});
 return db;
}
test("schema adds independent opt-in server and member settings, without deleting roles",async()=>{
 const {initCmdOnboarding}=await load,sql=[];
 await initCmdOnboarding({query:async str=>{sql.push(str);return {rows:[]}}});
 assert.equal(sql.length,2);assert.match(sql[0],/CREATE TABLE IF NOT EXISTS cmd_native_onboarding/);
 assert.match(sql[1],/PRIMARY KEY \(guild_id,user_id\)/);
 assert.match(sql[1],/REFERENCES cmd_native_members\(guild_id,user_id\) ON DELETE CASCADE/);
 assert.doesNotMatch(sql.join(" "),/DROP TABLE|TRUNCATE/);
});
test("role eligibility is allowlist; no privileged, undocumented, or everyone role",async()=>{
 const {safeOnboardingRole,MAX_ONBOARDING_ROLES}=await load;
 assert.equal(MAX_ONBOARDING_ROLES,10);
 assert.equal(safeOnboardingRole(safeRole),true);
 for(const permissions of [{administrator:true},{manageChannels:true},{manageGuild:true},{manageRoles:true},{banMembers:true},{kickMembers:true},{manageMessages:true},{'dangerousRole':true}]){
  assert.equal(safeOnboardingRole({...safeRole,permissions}),false,JSON.stringify(permissions));
 }
 assert.equal(safeOnboardingRole({...safeRole,name:"@everyone"}),false);
 assert.equal(safeOnboardingRole({...safeRole,id:"nope"}),false);
});
test("only existing guild members can read their own selected role",async()=>{
 const {getNativeOnboarding}=await load,db=mockDb();
 await assert.rejects(getNativeOnboarding(db,user,guildId,{requireNativeMember:async()=>{throw Error("outsider")}}),e=>e.status===403);
 assert.equal(db.calls.length,0);
 const result=await getNativeOnboarding(db,user,guildId,{requireNativeMember:memberGuard});
 assert.equal(result.enabled,true);
 assert.equal(result.welcomeText,"Bonjour !");
 assert.deepEqual(result.choices,[roleId]);
 assert.equal(result.selectedRoleId,null);
 assert.deepEqual(result.roles,[{id:roleId,name:"Survivant"}]);
 assert.ok(db.calls.every(call=>call.args[0]===guildId));
});
test("owner-only server settings reject privileged roles and duplicates",async()=>{
 const {updateNativeOnboarding:write}=await load,db=mockDb();
 await assert.rejects(write(db,user,{guildId,enabled:true,welcomeText:"Hi",choices:[roleId]},{requireNativeOwner:async()=>{throw Error("not owner")}}),e=>e.status===403);
 assert.equal(db.calls.length,0);
 await assert.rejects(write(db,owner,{guildId,enabled:true,welcomeText:"Hi",choices:[roleId,roleId]},{requireNativeOwner:ownerGuard}),e=>e.status===400);
 await assert.rejects(write(db,owner,{guildId,enabled:true,welcomeText:"Hi",choices:[]},{requireNativeOwner:ownerGuard}),e=>e.status===400);
 await assert.rejects(write(mockDb({safe:false}),owner,{guildId,enabled:true,welcomeText:"Hi",choices:[roleId]},{requireNativeOwner:ownerGuard}),e=>e.status===400);
 const result=await write(db,owner,{guildId,enabled:true,welcomeText:"Salut",choices:[roleId]},{requireNativeOwner:ownerGuard});
 assert.equal(result.enabled,true);
 assert.deepEqual(result.choices,[roleId]);
 assert.ok(db.calls.some(x=>x.sql.includes("ON CONFLICT(guild_id) DO UPDATE")));
});
test("user choice is atomic, guild scoped and cannot remove pre-existing role grants",async()=>{
 const {chooseNativeOnboardingRole:pick}=await load,db=mockDb();
 const result=await pick(db,user,{guildId,roleId},{requireNativeMember:memberGuard});
 assert.equal(result.chosen,true);
 const sql=db.calls.map(x=>x.sql);
 assert.ok(sql.includes("BEGIN"));assert.ok(sql.includes("COMMIT"));
 assert.ok(sql.includes("RELEASE"));
 assert.ok(sql.some(x=>x.includes("FOR UPDATE")));
 assert.ok(sql.some(x=>x.includes("INSERT INTO cmd_native_member_roles")&&x.includes("ON CONFLICT DO NOTHING")));
 assert.ok(!sql.some(x=>/DELETE FROM cmd_native_member_roles/.test(x)));
 for(const x of db.calls.filter(x=>x.args?.length))assert.equal(x.args[0],guildId);
});
test("disable, stale role, privilege elevation and repeated choice deny role grant",async()=>{
 const {chooseNativeOnboardingRole:pick}=await load;
 for(const config of [{canChoose:false},{listed:false},{safe:false},{alreadyPicked:true}]){
  const db=mockDb(config);
  await assert.rejects(pick(db,user,{guildId,roleId},{requireNativeMember:memberGuard}),e=>[403,409].includes(e.status));
  assert.ok(db.calls.some(x=>x.sql==="ROLLBACK"));
  assert.ok(!db.calls.some(x=>x.sql.startsWith("INSERT INTO cmd_native_member_roles")));
 }
 const db=mockDb();
 await assert.rejects(pick(db,user,{guildId,roleId:"wrong"},{requireNativeMember:memberGuard}),e=>e.status===400);
 assert.equal(db.calls.length,0);
});
test("HTTP onboarding routes guard auth, method and wrong guild IDs",async()=>{
 const {handleNativeOnboarding:route}=await load,sent=[],db=mockDb();
 const sendJson=(_res,status,body)=>sent.push({status,body});
 const deps={pool:db,auth:user,sendJson,readBody:async()=>({guildId,roleId}),requireNativeMember:memberGuard,requireNativeOwner:ownerGuard};
 assert.equal(await route({method:"GET"},{},new URL("https://cmd.test/other"),deps),false);
 await route({method:"PUT"},{},new URL("https://cmd.test/api/native/onboarding"),deps);
 assert.equal(sent.at(-1).status,405);
 await route({method:"GET"},{},new URL("https://cmd.test/api/native/onboarding"),{...deps,auth:null});
 assert.equal(sent.at(-1).status,401);
 await route({method:"GET"},{},new URL("https://cmd.test/api/native/onboarding?guildId=bad"),deps);
 assert.equal(sent.at(-1).status,400);
 await route({method:"GET"},{setHeader(){}},new URL("https://cmd.test/api/native/onboarding?guildId="+guildId),deps);
 assert.equal(sent.at(-1).status,200);
});
test("real server wiring, owner menu and role-selection interface exist",()=>{
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
 assert.match(server,/await initCmdOnboarding\(pool\)/);
 assert.match(server,/handleNativeOnboarding\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson,readBody:readFormBodyJson,requireNativeMember,requireNativeOwner\}\)/);
 assert.match(manager,/id="csm-native-onboarding"/);
 assert.match(manager,/data-csm-tab/);
 assert.match(manager,/api\/native\/onboarding\/choose/);
 assert.match(manager,/api\/native\/onboarding\/config/);
});
