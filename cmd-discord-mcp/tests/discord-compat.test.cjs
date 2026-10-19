const test=require("node:test"),assert=require("node:assert/strict");
const {randomUUID}=require("node:crypto");
const G="11111111-1111-4111-8111-111111111111",OTHER="22222222-2222-4222-8222-222222222222";
const CHANNEL="33333333-3333-4333-8333-333333333333",VOICE="44444444-4444-4444-8444-444444444444";
const APP="55555555-5555-4555-8555-555555555555",R="66666666-6666-4666-8666-666666666666";
const ROOT="https://cmd-sphere.up.railway.app";
async function run(method,route,{rights=["view_channels","read_messages","send_messages"],channel=CHANNEL,body,installedGuild=G,owner=APP}={}){
 const {discordCompatRoute}=await import("../cmd-discord-compat.js");
 const queries=[];
 const pool={query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.includes("FROM cmd_native_app_installs i JOIN cmd_native_guilds"))return {rows:[{id:G,name:"Serveur CMD",permissions:rights}]};
  if(sql.includes("FROM cmd_native_app_installs WHERE"))return {rows:args[0]===installedGuild&&args[1]===owner?[{permissions:rights}]:[]};
  if(sql.includes("FROM cmd_native_roles"))return {rows:[{id:R,name:"Membres",color:"#aabbcc",permissions:{},position:2,hoist:false,mentionable:true}]};
  if(sql.includes("FROM cmd_native_channels WHERE guild_id="))return {rows:[{id:CHANNEL,guild_id:G,name:"général",type:"text",topic:"",position:1}]};
  if(sql.includes("FROM cmd_native_channels WHERE id="))return {rows:args[0]===CHANNEL?[{id:CHANNEL,guild_id:G,name:"général",type:"text",position:1}]:args[0]===VOICE?[{id:VOICE,guild_id:G,name:"vocal",type:"voice",position:2}]:[]};
  if(sql.includes("FROM cmd_native_channel_messages"))return {rows:[{id:randomUUID(),guild_id:G,channel_id:CHANNEL,body:"Bienvenue",sender_user_id:"member",created_at:"2026-10-19T12:00:00Z",metadata:{}}]};
  if(sql.includes("INSERT INTO cmd_native_channel_messages"))return {rows:[]};
  throw Error("Unexpected SQL: "+sql.slice(0,100));
 }};
 const res={status:null,data:null};
 const url=new URL(ROOT+"/api/cmd-discord-bridge/v10"+route);
 await discordCompatRoute({method,headers:{}},res,url,{pool,app:{id:APP,name:"Bot Test"},sendJson:(r,status,data)=>{r.status=status;r.data=data},readBody:async()=>body});
 return {res,queries};
}
test("read-only capabilities document limitations and owner",async()=>{
 const a=await run("GET","/capabilities");assert.equal(a.res.status,200);assert.equal(a.res.data.gatewaySupported,false);
 const b=await run("GET","/users/@me");assert.equal(b.res.data.id,APP);assert.equal(b.res.data.bot,true);
});
test("guild list shows only installed scopes",async()=>{
 const r=await run("GET","/users/@me/guilds",{rights:["view_channels"]});assert.equal(r.res.status,200);
 assert.equal(r.res.data[0].id,G);assert.deepEqual(r.res.data[0].permissions,["view_channels"]);
});
test("native channels and roles translated to Discord-like objects",async()=>{
 const channels=await run("GET","/guilds/"+G+"/channels");assert.equal(channels.res.status,200);assert.equal(channels.res.data[0].type,0);
 const roles=await run("GET","/guilds/"+G+"/roles");assert.equal(roles.res.status,200);assert.equal(roles.res.data[0].color,0xaabbcc);
});
test("without guild installation, no guild roles or channels can leak",async()=>{
 const a=await run("GET","/guilds/"+G+"/roles",{installedGuild:OTHER});assert.equal(a.res.status,403);
 assert.ok(!a.queries.some(x=>x.sql.includes("FROM cmd_native_roles")));
 const b=await run("GET","/channels/"+CHANNEL+"/messages",{installedGuild:OTHER});assert.equal(b.res.status,403);
 assert.ok(!b.queries.some(x=>x.sql.includes("FROM cmd_native_channel_messages")));
});
test("no view permission prevents channel enumeration",async()=>{
 const r=await run("GET","/guilds/"+G+"/channels",{rights:["send_messages"]});assert.equal(r.res.status,403);
 assert.ok(!r.queries.some(x=>x.sql.includes("FROM cmd_native_channels WHERE guild_id=")));
});
test("message reads and sends require distinct permission grants",async()=>{
 let r=await run("GET","/channels/"+CHANNEL+"/messages",{rights:["send_messages"]});assert.equal(r.res.status,403);
 r=await run("POST","/channels/"+CHANNEL+"/messages",{rights:["read_messages"],body:{content:"bonjour"}});assert.equal(r.res.status,403);
 assert.ok(!r.queries.some(x=>x.sql.includes("INSERT INTO")));
});
test("writes stay scoped to channel guild and record bot identity with disabled mentions",async()=>{
 const r=await run("POST","/channels/"+CHANNEL+"/messages",{body:{content:"Bonjour CMD Sphere!",allowed_mentions:{parse:["everyone"]}}});
 assert.equal(r.res.status,201);assert.equal(r.res.data.author.bot,true);assert.equal(r.res.data.content,"Bonjour CMD Sphere!");
 const write=r.queries.find(q=>q.sql.includes("INSERT INTO cmd_native_channel_messages"));
 assert.deepEqual(write.args.slice(1,4),[G,CHANNEL,"cmd-bot:"+APP]);
 assert.equal(JSON.parse(write.args[5]).compat.mentionsDisabled,true);
});
test("messages are rejected in voice and for invalid payloads",async()=>{
 let r=await run("POST","/channels/"+VOICE+"/messages",{body:{content:"hi"}});assert.equal(r.res.status,400);
 r=await run("POST","/channels/"+CHANNEL+"/messages",{body:{content:"x".repeat(2001)}});assert.equal(r.res.status,400);
 assert.ok(!r.queries.some(x=>x.sql.includes("INSERT INTO")));
 r=await run("GET","/channels/"+OTHER+"/messages");assert.equal(r.res.status,404);
});
test("Discord Gateway, nonimplemented actions and unsafe IDs are not silently emulated",async()=>{
 let r=await run("GET","/gateway");assert.equal(r.res.status,404);
 r=await run("DELETE","/channels/"+CHANNEL+"/messages");assert.equal(r.res.status,404);
 r=await run("GET","/guilds/not-a-uuid/roles");assert.equal(r.res.status,400);
});
test("CMD bot REST adapter rejects non-HTTPS origins and malformed credentials",async()=>{
 const {CMDDiscordRestClient}=await import("../adapters/cmd-discord-rest-client.mjs");
 assert.throws(()=>new CMDDiscordRestClient({baseUrl:"http://insecure.example",token:"a".repeat(40)}),/HTTPS/);
 assert.throws(()=>new CMDDiscordRestClient({token:"discord-token"}),/CMD Sphere/);
 const client=new CMDDiscordRestClient({token:"a".repeat(40)});
 assert.equal(typeof client.sendMessage,"function");
});
