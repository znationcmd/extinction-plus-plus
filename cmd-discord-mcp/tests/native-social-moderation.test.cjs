const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {join}=require("node:path");
const vm=require("node:vm");
const code=readFileSync(join(__dirname,"..","server.js"),"utf8");
const begin=code.indexOf("async function nativeMessageActionAccess(");
const end=code.indexOf("async function sendNativeChannelMessage(",begin);
const routines=code.slice(begin,end);
const id="11111111-1111-4111-8111-111111111111";
const guild="22222222-2222-4222-8222-222222222222",ch="33333333-3333-4333-8333-333333333333";
function setup(role,owns){
 const statements=[];
 const pool={query:async(sql,params)=>{statements.push({sql,params});return {rows:owns?[{id}]:[]}}};
 const sandbox={pool,nativeTextChannel:async(_auth,g,c)=>{assert.equal(g,guild);assert.equal(c,ch);return {id:ch}},requireNativeMember:async()=>({membership_role:role})};
 vm.createContext(sandbox);
 vm.runInContext(routines+";globalThis.act=deleteOwnOrOwnerNativeMessage;globalThis.access=nativeMessageActionAccess;",sandbox);
 return {sandbox,statements};
}
test("member delete passes authenticated sender and owner=false to database",async()=>{
 const {sandbox,statements}=setup("member",true);
 const response=await sandbox.act({user:{id:"me"}},{guildId:guild,channelId:ch,messageId:id});
 assert.equal(response.ok,true);assert.equal(statements[0].params[3],"me");assert.equal(statements[0].params[4],false);
 assert.match(statements[0].sql,/sender_user_id=\$4 OR \$5::boolean/);
});
test("owner moderation passes owner=true to database",async()=>{
 const {sandbox,statements}=setup("owner",true);
 await sandbox.act({user:{id:"owner"}},{guildId:guild,channelId:ch,messageId:id});
 assert.equal(statements[0].params[4],true);
});
test("a different nonowner has no delete result",async()=>{
 const {sandbox}=setup("member",false);
 await assert.rejects(sandbox.act({user:{id:"outsider"}},{guildId:guild,channelId:ch,messageId:id}),/non autorisée/);
});
test("reject invalid IDs before database operation",async()=>{
 const {sandbox,statements}=setup("owner",true);
 await assert.rejects(sandbox.act({user:{id:"owner"}},{guildId:guild,channelId:ch,messageId:"discord-archive-id"}),/invalide/);
 assert.equal(statements.length,0);
});
test("member access reports owner status without checking Discord roles",async()=>{
 const {sandbox}=setup("owner",true);
 const details=await sandbox.access({user:{id:"owner"}},guild);
 assert.equal(details.isOwner,true);assert.equal(details.userId,"owner");
});
test("UI offers friend requests and owner moderation only on CMD native messages",()=>{
 const js=readFileSync(join(__dirname,"..","cmd-social-message-actions.js"),"utf8");
 assert.match(js,/\/api\/friends\/request/);assert.match(js,/\/api\/native\/messages\/delete/);
 assert.match(js,/article\.dataset\.cmdSource==='cmd'/);
});
