"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const start=server.indexOf("async function nativeTextChannel(auth,guildId,channelId){");
const stop=server.indexOf("// Read the historical backup",start);
const source=server.slice(start,stop);
const guildId="11111111-1111-4111-8111-111111111111",channelId="22222222-2222-4222-8222-222222222222";
function makeChannel(type,rights={viewChannels:true}){
 const log=[],pool={async query(sql,args){log.push({sql,args});return {rows:[{id:channelId,guild_id:guildId,type,name:"Test",slowmode_seconds:0}]}}};
 const nativeTextChannel=new Function("pool","requireNativeMember","effectiveNativePermissions",
  source+"\nreturn nativeTextChannel;")(pool,async()=>({membership_role:"member"}),async()=>rights);
 return {nativeTextChannel,log};
}
test("native voice channels share the existing authorized text-message read and send path",async()=>{
 assert.ok(start>=0&&stop>start);
 const {nativeTextChannel,log}=makeChannel("voice");
 const channel=await nativeTextChannel({user:{id:"alice"}},guildId,channelId);
 assert.equal(channel.type,"voice");
 assert.equal(log.length,1);
 assert.deepEqual(log[0].args,[guildId,channelId]);
 assert.match(server,/async function nativeChannelMessages\([^)]*\)[\s\S]*?await nativeTextChannel\(/);
 assert.match(server,/async function sendNativeChannelMessage\([^)]*\)[\s\S]*?await nativeTextChannel\(/);
});
test("voice text denies members without effective view permission",async()=>{
 const {nativeTextChannel}=makeChannel("voice",{viewChannels:false,connect:true});
 await assert.rejects(nativeTextChannel({user:{id:"bob"}},guildId,channelId),e=>e.status===403);
 const allowed=makeChannel("voice",{administrator:true,viewChannels:false});
 assert.equal((await allowed.nativeTextChannel({user:{id:"owner"}},guildId,channelId)).type,"voice");
});
test("category or unsupported channel types remain forbidden, existing text unchanged",async()=>{
 await assert.rejects(makeChannel("category").nativeTextChannel({user:{id:"x"}},guildId,channelId),/n'accepte pas les messages texte/);
 for(const type of ["text","forum","announcement","media"]){
  const {nativeTextChannel}=makeChannel(type,{viewChannels:false});
  assert.equal((await nativeTextChannel({user:{id:"x"}},guildId,channelId)).type,type);
 }
});
test("all native voice channel entries open text with speaker symbol while external voice remains untouched",()=>{
 assert.match(server,/const openable=\['text','announcement','forum','media','voice'\]/);
 assert.match(server,/const openable=\["text","announcement","forum","media","voice"\]/);
 assert.match(server,/data-native-name="[\s\S]*?x\.type==='voice'\?'🔊':'#'/);
 assert.match(server,/Salon vocal · discussions écrites CMD Sphere \(appel vocal indépendant\)/);
 assert.match(server,/ch\?\.type!=='voice'&&S\.nativeImportedOwner/,"Voice text must not silently attach to external Discord streams");
 assert.match(server,/for\(const recipient of String\(ch\.type\)==="voice"\?\[\]:notifyRecipients\)/,"Voice room content must not leak via mentions before per-channel notification permissions");
 assert.match(server,/\['text','announcement','forum','media','voice'\]\.includes\(String\(x\.type\|\|''\)\)/);
 // External Discord voice channels are still non-text objects.
 assert.match(server,/function channelListItem\(x\)\{\s*const openable=\['text','announcement','thread'\]/);
});
test("voice text reuse must retain rules acceptance, AutoMod, slowmode and original notifications",()=>{
 const from=server.indexOf("async function sendNativeChannelMessage");
 const to=server.indexOf("async function updateNativeOverview",from);
 const scoped=server.slice(from,to);
 for(const token of ["assertNativeRulesAccepted(","guardCmdNativeAutoMod(","saveNativeMessageWithSlowmode(","isBlockedPair(","awardMessageXp("]){
  assert.ok(scoped.includes(token),"Existing messaging protection preserved: "+token);
 }
});
