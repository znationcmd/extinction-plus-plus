"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {JSDOM}=require("jsdom");
const source=fs.readFileSync(path.join(__dirname,"../cmd-social-privacy-ui.js"),"utf8");
const uid="22222222-2222-4222-8222-222222222222";
const tick=()=>new Promise(resolve=>setTimeout(resolve,25));
function fixture(){
 const dom=new JSDOM('<!doctype html><html><head></head><body><div id="friendsPanel"><div class="friendsTop"><h2>Amis</h2></div><div class="friendTabs"></div><section data-section="friends"><div class="friendRow" data-profile-user="other"><span>Other</span></div></section></div></body></html>',{runScripts:"outside-only",pretendToBeVisual:true,url:"https://cmd-sphere.example/messages"});
 const w=dom.window,calls=[],state={allowEveryone:true,allowSharedServers:true,blocked:[],guildPolicy:"inherit"};
 w.confirm=()=>true;
 w.fetch=async(url,init={})=>{
  const request={url:String(url),method:init.method||"GET",body:init.body?JSON.parse(init.body):null};
  calls.push(request);let data={};
  if(request.url==="/api/account/privacy/friend-requests"){
   if(request.method==="PATCH")Object.assign(state,request.body);
   data={allowEveryone:state.allowEveryone,allowSharedServers:state.allowSharedServers};
  }else if(request.url==="/api/account/blocked"){
   if(request.method==="POST"){
    const {targetUserId,action}=request.body;
    state.blocked=action==="block"?[{userId:targetUserId,displayName:"Other"}]:[];
    data={ok:true,blocked:action==="block"};
   }else data={users:state.blocked};
  }else if(request.url==="/api/account/privacy/dm-guilds"){
   if(request.method==="PATCH")state.guildPolicy=request.body.policy;
   data=request.method==="GET"?{servers:[{guildId:"33333333-3333-4333-8333-333333333333",name:"Serveur CMD",policy:state.guildPolicy}]}:{ok:true,policy:state.guildPolicy};
  }else if(request.url==="/api/friends")data={friends:[{username:"other",userId:uid}]};
  else if(request.url.startsWith("/api/dm/search"))data={users:[{username:"other",id:uid}]};
  else throw Error("Unexpected URL "+url);
  return {ok:true,status:200,json:async()=>data};
 };
 w.eval(source);
 return {dom,w,calls,state,document:w.document};
}
test("Privacy pane appears with genuine connected account preferences",async()=>{
 const f=fixture();
 try{
  await tick();
  const tab=f.document.querySelector("#cmdPrivacyTab");
  assert.ok(tab,"The new privacy pane must be reachable from Friends");
  tab.click();await tick();
  assert.ok(f.document.querySelector("#cmdPrivacyPanel").classList.contains("on"));
  assert.equal(f.document.querySelector("#cmdPrivacyEveryone").checked,true);
  assert.equal(f.document.querySelector("#cmdPrivacyShared").checked,true);
  assert.ok(f.calls.some(x=>x.url==="/api/account/privacy/friend-requests"));
 }finally{f.dom.window.close()}
});
test("Friends can be blocked and unblocked from real buttons without deleting threads",async()=>{
 const f=fixture();
 try{
  await tick();f.document.querySelector("#cmdPrivacyTab").click();await tick();
  const button=f.document.querySelector(".cmd-privacy-block-action");
  assert.ok(button,"Each friend has a block control");
  button.click();await tick();await tick();
  assert.equal(f.state.blocked.length,1);
  assert.ok(f.document.querySelector("#cmdPrivacyBlockedList").textContent.includes("Other"));
  const unblock=[...f.document.querySelectorAll("#cmdPrivacyBlockedList button")].find(b=>b.textContent==="Débloquer");
  unblock.click();await tick();await tick();
  assert.deepEqual(f.state.blocked,[]);
  assert.deepEqual(f.calls.filter(x=>x.url==="/api/account/blocked"&&x.method==="POST").map(x=>x.body.action),["block","unblock"]);
 }finally{f.dom.window.close()}
});
test("Changing friend request privacy sends checked booleans to a protected PATCH route",async()=>{
 const f=fixture();
 try{
  await tick();f.document.querySelector("#cmdPrivacyTab").click();await tick();
  f.document.querySelector("#cmdPrivacyEveryone").checked=false;
  f.document.querySelector("#cmdPrivacyShared").checked=false;
  const save=[...f.document.querySelectorAll("#cmdPrivacyPanel button")].find(b=>b.textContent==="Enregistrer la confidentialité");
  save.click();await tick();
  const request=f.calls.find(x=>x.url==="/api/account/privacy/friend-requests"&&x.method==="PATCH");
  assert.deepEqual(request.body,{allowEveryone:false,allowSharedServers:false});
  assert.ok(f.document.querySelector("#cmdPrivacyPanel [role=status]").textContent.includes("enregistrées"));
 }finally{f.dom.window.close()}
});

test("Personal per-server DM controls persist only the selected server policy",async()=>{
 const f=fixture();
 try{
  await tick();f.document.querySelector("#cmdPrivacyTab").click();await tick();
  const selector=f.document.querySelector("#cmdDmGuildPrivacyList select");
  assert.ok(selector,"A server-scoped DM privacy dropdown must be visible");
  assert.equal(selector.value,"inherit");
  selector.value="deny";selector.dispatchEvent(new f.w.Event("change",{bubbles:true}));
  await tick();
  const request=f.calls.find(x=>x.url==="/api/account/privacy/dm-guilds"&&x.method==="PATCH");
  assert.deepEqual(request.body,{guildId:"33333333-3333-4333-8333-333333333333",policy:"deny"});
  assert.equal(f.state.guildPolicy,"deny");
  assert.equal(f.document.querySelector("#cmdDmGuildPrivacyList select").disabled,false);
 }finally{f.dom.window.close()}
});
