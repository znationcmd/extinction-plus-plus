const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const menu=fs.readFileSync(path.join(__dirname,"../cmd-social-message-actions.js"),"utf8");
const ui=fs.readFileSync(path.join(__dirname,"../cmd-message-forward-ui.js"),"utf8");
const start=server.indexOf("async function forwardNativeTextMessage(auth,input){");
const end=server.indexOf("async function sendNativeChannelMessage(auth,input){",start);
assert.ok(start>=0&&end>start,"Actual message forward function present");
const fn=server.slice(start,end);
const id=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000000";
const sample={sourceGuildId:id(1),sourceChannelId:id(2),destinationGuildId:id(3),destinationChannelId:id(4),messageId:id(5)};
function engine({denySource=false,denyDest=false,overwrites=false,missing=false}={}){
 const writes=[],queries=[],lookups=[];
 const deps={
  validCmdUuid(value){if(!/^[0-9a-f-]{36}$/i.test(value))throw Error("Identifiant invalide");return value},
  async nativeTextChannel(auth,guildId,channelId){lookups.push([guildId,channelId]);return {id:channelId,name:guildId===sample.sourceGuildId?"confidentiel":"general",permission_overwrites:overwrites?[{type:"role"}]:[]}},
  async effectiveNativePermissions(user,guildId){return {viewChannels:guildId===sample.sourceGuildId?!denySource:true,readHistory:true,sendMessages:guildId===sample.destinationGuildId?!denyDest:true}},
  pool:{async query(sql,params){queries.push({sql,params});return {rows:missing?[]:[{body:"Bonjour @everyone et @here!"}]}}},
  async sendNativeChannelMessage(auth,body){writes.push(body);return {id:id(7),body}}
 };
 const keys=Object.keys(deps),callable=new Function(...keys,"return ("+fn+")")(...Object.values(deps));
 return {callable,writes,queries,lookups};
}
test("Forwarding checks both source and destination and copies text only",async()=>{
 const t=engine(),auth={user:{id:id(8)}};
 const result=await t.callable(auth,sample);
 assert.equal(result.ok,true);assert.equal(t.lookups.length,2);assert.equal(t.queries.length,1);assert.equal(t.writes.length,1);
 assert.equal(t.writes[0].guildId,sample.destinationGuildId);
 assert.equal(t.writes[0].channelId,sample.destinationChannelId);
 assert.ok(!("attachments" in t.writes[0]));
 assert.ok(!t.writes[0].content.includes("@everyone"));
 assert.ok(!t.writes[0].content.includes("@here"));
});
test("No forward from unreadable or overridden rooms, no send to restricted destination",async()=>{
 for(const options of [{denySource:true},{denyDest:true},{overwrites:true},{missing:true}]){
  const e=engine(options);await assert.rejects(e.callable({user:{id:id(8)}},sample));
  assert.equal(e.writes.length,0);
 }
});
test("Reject malformed destination and preserve existing source message",async()=>{
 const e=engine();await assert.rejects(e.callable({user:{id:id(8)}},{...sample,destinationChannelId:"wrong"}));
 assert.equal(e.lookups.length,0);
 assert.match(fn,/SELECT body FROM cmd_native_channel_messages WHERE id=\$1 AND guild_id=\$2 AND channel_id=\$3/);
 assert.doesNotMatch(fn,/DELETE FROM|UPDATE cmd_native_channel_messages/i);
});
test("Forwarding UI is wired to + action and authenticated endpoint",()=>{
 assert.ok(menu.includes("window.cmdSphereForwardMessage.open(article)"));
 assert.ok(ui.includes('"/api/native/guilds"'));
 assert.ok(ui.includes('"/api/messages/forward"'));
 assert.ok(server.includes('url.pathname==="/api/messages/forward"'));
 assert.ok(server.includes("await forwardNativeTextMessage(auth,await readFormBodyJson(req))"));
 assert.ok(server.includes('url.pathname==="/cmd-message-forward-ui.js"'));
 assert.ok(server.includes('<script defer src="/cmd-message-forward-ui.js'));
 assert.doesNotThrow(()=>new Function(ui));
});
