"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");

test("plus routes to native create wizard and preserves join/import",()=>{
 assert.ok(server.includes('redirect(res,baseUrl+"/dashboard?createServer=1")'));
 assert.ok(server.includes("get('createServer')==='1'"));
 assert.ok(server.includes("setTimeout(()=>openAdd('create'),100)"));
 assert.ok(server.includes("if(view==='create'){cmdWizardStart();return}"));
 assert.ok(server.includes('url.pathname==="/servers/join"'));
 assert.ok(server.includes('url.pathname==="/servers/import"'));
 const pos=server.indexOf('url.pathname==="/servers/add"');
 assert.ok(pos>=0);
 assert.ok(server.slice(pos,pos+450).includes('redirect(res,baseUrl+"/dashboard?createServer=1")'));
});

test("dashboard inline JavaScript parses",()=>{
 const mark='  const script=String.raw' + String.fromCharCode(96);
 const begin=server.indexOf(mark);
 const end=server.indexOf('  '+String.fromCharCode(96)+';\n  return ',begin);
 assert.ok(begin>0&&end>begin);
 assert.doesNotThrow(()=>new vm.Script(server.slice(begin+mark.length,end)));
});

test("native server templates add channels without deletion (mock database)",async()=>{
 const begin=server.indexOf('async function createNativeGuild(auth,input){');
 const end=server.indexOf('\nasync function syncNativeFromDiscord',begin);
 assert.ok(begin>0&&end>begin);
 let n=0;const calls=[];
 const pool={query:async(sql,args)=>{
  calls.push({sql,args});
  if(sql.includes('INSERT INTO cmd_native_guilds'))return {rows:[{id:args[0],name:args[2]}]};
  return {rows:[]};
 }};
 const crypto={randomUUID:()=>String(++n),randomBytes:()=>({toString:()=> 'invite'})};
 const factory=vm.runInNewContext('(function(pool,crypto,safeText,isCmdOwner){'+server.slice(begin,end)+';return createNativeGuild})');
 const create=factory(pool,crypto,(x,max)=>String(x||'').slice(0,max),()=>false);
 const guild=await create({user:{id:'owner',name:'Fonda'}},{name:'Test Gaming',template:'gaming',isPublic:false});
 assert.equal(guild.name,'Test Gaming');
 assert.equal(calls.filter(c=>c.sql.includes('INSERT INTO cmd_native_channels')).length,7);
 assert.ok(calls.some(c=>c.args.includes('Gaming')));
 assert.ok(calls.some(c=>c.args.includes('Vocal gaming')));
 assert.ok(calls.every(c=>!/^\s*(DROP|TRUNCATE|DELETE)\b/i.test(c.sql)));
});
