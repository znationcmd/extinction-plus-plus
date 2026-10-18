"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {JSDOM}=require("jsdom");
const src=fs.readFileSync(path.join(__dirname,"../cmd-chat-history-ui.js"),"utf8");
const GUILD="11111111-1111-4111-8111-111111111111",CHANNEL="22222222-2222-4222-8222-222222222222";
const flush=()=>new Promise(resolve=>setTimeout(resolve,20));
test("native history attachment options are usable and sent to authorized server endpoint",async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body><dialog class="cmd-search-dialog"></dialog><div id="channelMessages"></div></body></html>',{url:"https://cmd.test/dashboard",runScripts:"outside-only"});
 const w=dom.window,urls=[];
 try{
  w.CHAT={mode:"native",guildId:GUILD,channelId:CHANNEL};
  w.fetch=async url=>{urls.push(String(url));return {ok:true,json:async()=>({results:[{id:"m1",content:"photo",authorId:"user1"}],morePossible:false})}};
  w.eval(src);
  w.document.getElementById("cmd-history-open").click();
  const dialog=w.document.getElementById("cmd-history-dialog");
  assert.equal(dialog.hasAttribute("open"),true);
  const field=dialog.querySelector('select[aria-label="Filtrer les pièces jointes"]');
  assert.ok(field,"file filter selector present");
  assert.equal(field.closest("label").hidden,false);
  field.value="true";
  dialog.querySelector('input[type="search"]').value="photo";
  [...dialog.querySelectorAll("button")].find(b=>b.textContent.includes("Rechercher dans l’historique")).click();
  await flush();
  assert.equal(urls.length,1);
  const endpoint=new URL(urls[0],"https://cmd.test");
  assert.equal(endpoint.searchParams.get("scope"),"server");
  assert.equal(endpoint.searchParams.get("guildId"),GUILD);
  assert.equal(endpoint.searchParams.get("hasFile"),"true");
  assert.equal(dialog.querySelectorAll(".cmd-history-result").length,1);
  [...dialog.querySelectorAll("button")].find(b=>b.textContent.includes("Effacer les filtres")).click();
  assert.equal(field.value,"");
 }finally{dom.window.close()}
});
test("media salon messages can be searched only after membership and channel rights checks",async()=>{
 const {searchCmdHistory,cmdHistoryParameters}=await import("../cmd-message-history-search.js");
 const url=new URL("https://cmd.test/api/cmd/messages/history-search?"+new URLSearchParams({scope:"server",guildId:GUILD,channelId:CHANNEL,q:"image",hasFile:"true"}));
 const calls=[];
 const pool={query:async(sql,args)=>{calls.push({sql,args});
  if(sql.includes("SELECT membership_role"))return {rows:[{membership_role:"member"}]};
  if(sql.includes("SELECT c.id::text"))return {rows:[{id:CHANNEL,type:"media",name:"Galerie",permission_overwrites:[],parent_overwrites:[]}]};
  return {rows:[]};
 }};
 const output=await searchCmdHistory(pool,{user:{id:"user1"}},cmdHistoryParameters(url),{checkGuildPermissions:async()=>({viewChannels:true,readHistory:true})});
 assert.equal(output.scope,"server");assert.equal(output.hasFile,true);
 assert.equal(calls.length,3);assert.match(calls[2].sql,/m\.guild_id=\$8::uuid/);
});
