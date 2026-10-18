"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const begin=server.indexOf("async function createNativeGuild(auth,input){");
const end=server.indexOf("\nasync function syncNativeFromDiscord",begin);
assert.ok(begin>0&&end>begin);
function setup(){
 let uid=0;const inserted=[];
 const pool={async query(sql,args=[]){
  if(/^\s*INSERT\s+INTO\s+cmd_native_/i.test(sql))inserted.push({sql,args});
  if(sql.includes("INSERT INTO cmd_native_guilds"))return {rows:[{id:args[0],name:args[2],is_public:args[3]}]};
  return {rows:[]};
 }};
 const crypto={randomUUID:()=>String(++uid).padStart(8,"0")+"-0000-4000-8000-000000000001",randomBytes:()=>({toString:()=> "random-invite-"+(++uid)})};
 const create=vm.runInNewContext("(function(pool,crypto,safeText,isCmdOwner){"+server.slice(begin,end)+";return createNativeGuild})")(pool,crypto,(v,max)=>String(v||"").slice(0,max),()=>false);
 return {inserted,create};
}
test("Gaming template creates fresh UUID-based channels and roles, without copying secrets",async()=>{
 const {inserted,create}=setup();
 const auth={user:{id:"owner-1",name:"My CMD account"}};
 const a=await create(auth,{name:"Gaming A",template:"gaming",isPublic:false});
 const b=await create(auth,{name:"Gaming B",template:"gaming",isPublic:false});
 assert.notEqual(a.id,b.id);
 const ch=inserted.filter(x=>x.sql.includes("INSERT INTO cmd_native_channels"));
 assert.equal(ch.length,14,"Each gaming server has seven distinct channels");
 assert.equal(new Set(ch.map(x=>x.args[0])).size,ch.length);
 const roles=inserted.filter(x=>x.sql.includes("INSERT INTO cmd_native_roles"));
 assert.equal(roles.length,6,"Each server has @everyone plus two owner-manageable roles");
 assert.equal(new Set(roles.map(x=>x.args[0])).size,roles.length);
 assert.ok(roles.some(x=>x.args.includes("Modérateur")));
 assert.ok(roles.every(x=>!x.args.some(a=>String(a).includes("administrator")||String(a).includes("api_key"))));
 assert.equal(inserted.filter(x=>x.sql.includes("INSERT INTO cmd_native_members")).length,2,"Only owners joined by default");
});
test("All six templates and custom mode have safe per-server default roles",async()=>{
 const {create,inserted}=setup();
 for(const name of ["gaming","school","study","friends","art","community","custom"])
  await create({user:{id:"owner-2",name:"CMD"}},{name:"Un "+name,template:name});
 const guilds=inserted.filter(x=>x.sql.includes("INSERT INTO cmd_native_guilds"));
 assert.equal(guilds.length,7);
 assert.equal(new Set(guilds.map(x=>x.args[0])).size,7);
 assert.ok(inserted.filter(x=>x.sql.includes("INSERT INTO cmd_native_roles")).length>=7);
});
test("Templates API requires a CMD login, whitelists presets, and only creates new servers",()=>{
 assert.ok(server.includes('url.pathname==="/api/native/templates"&&(req.method==="GET"||req.method==="POST")'));
 assert.ok(server.includes('if(!templates.some(t=>t.id===requested))'));
 assert.ok(server.includes('const guild=await createNativeGuild(auth,{name:input.name,template:requested,isPublic:input.isPublic===true})'));
 assert.ok(!server.slice(server.indexOf('url.pathname==="/api/native/templates"'),server.indexOf('url.pathname==="/api/native/discover"')).includes('DELETE FROM'));
});
