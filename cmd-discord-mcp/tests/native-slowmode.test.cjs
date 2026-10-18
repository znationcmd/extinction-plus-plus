"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const slowmode=import("../cmd-native-slowmode.js");
const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const manager=fs.readFileSync(path.join(__dirname,"../cmd-server-manager.js"),"utf8");
const uuid=i=>String(i).padStart(8,"0")+"-0000-4000-8000-000000000001";
function store({failInserts=false}={}){
 const state=new Map(),messages=[],history=[],locks=new Map();
 const metrics={opened:0,rollbacks:0,commits:0};
 const handle=()=>{
  let copy=null;
  return {
   async query(sql,args=[]){
    history.push(sql);
    if(sql==="BEGIN"){copy=new Map(state);return {rows:[]}};
    if(sql==="ROLLBACK"){metrics.rollbacks++;state.clear();for(const [key,value] of copy)state.set(key,value);return {rows:[]}};
    if(sql==="COMMIT"){metrics.commits++;return {rows:[]}};
    if(sql.includes("INSERT INTO cmd_native_slowmode_state")){
     assert.match(sql,/ON CONFLICT\(channel_id,sender_user_id\) DO UPDATE/);
     assert.match(sql,/WHERE cmd_native_slowmode_state.next_allowed_at<=NOW\(\)/);
     const key=args[0]+"/"+args[1],now=Date.now(),old=state.get(key);
     if(old>now)return {rows:[]};
     state.set(key,now+args[2]*1000);
     return {rows:[{next_allowed_at:new Date(state.get(key))}]};
    }
    if(sql.includes("SELECT GREATEST(1,CEIL(EXTRACT")){
     return {rows:[{retry_after:Math.max(1,Math.ceil(((state.get(args[0]+"/"+args[1])||Date.now())-Date.now())/1000))}]};
    }
    if(sql.startsWith("INSERT INTO cmd_native_channel_messages")){
     if(failInserts)throw Error("database insert failed");
     messages.push(args);return {rows:[]};
    }
    return {rows:[]};
   },
   release(){}
  };
 };
 const pool={query:async(sql,args)=>handle().query(sql,args),connect:async()=>{metrics.opened++;return handle();}};
 return {pool,state,messages,history,metrics};
}
function msg(userId="member",extra={}){
 return {id:uuid(Math.floor(Math.random()*10000000)),guildId:uuid(3),channelId:uuid(4),userId,body:"Bonjour",replyTo:null,attachments:[],metadata:{},cooldownSeconds:30,...extra};
}
test("Slowmode uses non-destructive column and unique per-member database state",async()=>{
 const {initCmdSlowmode}=await slowmode,s=store();
 await initCmdSlowmode(s.pool);
 assert.ok(s.history.some(q=>q.includes("ADD COLUMN IF NOT EXISTS slowmode_seconds")));
 assert.ok(s.history.some(q=>q.includes("PRIMARY KEY(channel_id,sender_user_id)")));
 assert.ok(s.history.every(q=>!/\b(DROP|TRUNCATE)\b/i.test(q)));
});
test("Cooldown settings reject invalid, fractional, negative and excessive values",async()=>{
 const {parseSlowmodeSeconds}=await slowmode;
 for(const x of [null,undefined,-1,1.5,21601,"none",NaN])
  assert.throws(()=>parseSlowmodeSeconds(x),/durée invalide/);
 assert.equal(parseSlowmodeSeconds(0),0);assert.equal(parseSlowmodeSeconds(21600),21600);
});
test("Member can send once; second immediate attempt is rejected server-side without saving",async()=>{
 const {saveNativeMessageWithSlowmode:send}=await slowmode,s=store(),m=msg();
 assert.equal((await send(s.pool,m)).applied,true);
 const e=await send(s.pool,{...m,id:uuid(22)}).catch(x=>x);
 assert.equal(e.status,429);assert.ok(e.retryAfter>=1);
 assert.equal(s.messages.length,1);assert.equal(s.metrics.commits,1);
 assert.equal(s.metrics.rollbacks,1);
});
test("Two simultaneous writes from same member never both pass the cooldown",async()=>{
 const {saveNativeMessageWithSlowmode:send}=await slowmode,s=store(),m=msg();
 const items=await Promise.allSettled([send(s.pool,m),send(s.pool,{...m,id:uuid(12)})]);
 assert.equal(items.filter(x=>x.status==="fulfilled").length,1);
 assert.equal(items.filter(x=>x.status==="rejected"&&x.reason.status===429).length,1);
 assert.equal(s.messages.length,1);
});
test("Cooldown is per channel and member; privileged sender can bypass",async()=>{
 const {saveNativeMessageWithSlowmode:send}=await slowmode,s=store();
 await send(s.pool,msg("alice"));
 await send(s.pool,msg("bob"));
 await send(s.pool,msg("alice",{channelId:uuid(9)}));
 await send(s.pool,msg("alice",{bypass:true}));
 await send(s.pool,msg("alice",{cooldownSeconds:0}));
 assert.equal(s.messages.length,5);
 assert.equal(s.metrics.opened,3,"Bypass and disabled modes must not lock");
});
test("Failed insert rolls back cooldown; no partial state is persisted",async()=>{
 const {saveNativeMessageWithSlowmode:send}=await slowmode,s=store({failInserts:true});
 await assert.rejects(send(s.pool,msg()),/database insert failed/);
 assert.equal(s.state.size,0);
 assert.equal(s.metrics.rollbacks,1);
});
test("Server enforces permission-scoped endpoint, includes cooldown in channel and guards message POST",()=>{
 assert.match(server,/initCmdNativeDb\(\);await initCmdSlowmode\(pool\)/);
 assert.match(server,/await requireNativePermission\(auth,guildId,"manageChannels"\)/);
 assert.match(server,/url.pathname==="/api/native/slowmode"&&\(req.method==="GET"\|\|req.method==="PATCH"\)/);
 assert.match(server,/saveNativeMessageWithSlowmode\(pool,\{id,guildId,channelId:ch.id,userId:auth.user.id/);
 assert.match(server,/COALESCE\(\$8::integer,slowmode_seconds\)/);
 assert.match(server,/retryAfter:e.retryAfter\|\|undefined/);
 assert.match(server,/slowmodeSeconds:Number\(ch.slowmode_seconds\|\|0\)/);
});
test("Salon settings let admins configure mode lent without altering external Discord servers",()=>{
 assert.match(manager,/name="slowmodeSeconds"/);
 assert.match(manager,/isNative\(\)&&\['text','announcement','forum'\].includes\(ch.type\)/);
 assert.match(manager,/slowmodeSeconds:Number\(d.get\('slowmodeSeconds'\)\)/);
 assert.match(manager,/Désactivé/);
});
