const test=require("node:test"),assert=require("node:assert/strict");
const {join}=require("node:path");
async function load(){return import("../cmd-native-invites.js")}
const GUILD_A="22222222-2222-4222-8222-222222222222",GUILD_B="33333333-3333-4333-8333-333333333333";
const AUTH={user:{id:"member1",name:"Membre"}};
const ROOT="https://cmd-sphere.up.railway.app";
function mockRes(){return{status:null,data:null,body:null,writeHead(){},end(){}}}
function makeContext({memberRole="owner",query,admin=true}={}){
 let writes=[];
 const pool={query:async(q,p)=>{writes.push({q,p});return query?query(q,p):{rows:[]}}};
 const ctx={pool,auth:AUTH,baseUrl:ROOT,sendJson:(res,status,data)=>{res.status=status;res.data=data},
   readBody:async req=>req.body||{},requireNativeMember:async(a,id)=>{if(id!==GUILD_A)throw Object.assign(new Error("Tu n'es pas membre de ce serveur"),{status:403});return{membership_role:memberRole}},
   requireNativeAdmin:async(a,id)=>{if(!admin||id!==GUILD_A)throw Object.assign(new Error("Permission administrateur requise"),{status:403})}
 };
 return{ctx,writes};
}
test("Expiration configurable: 3 jours / 30 jours / jamais seulement",async()=>{
 const {inviteExpiry}=await load(),d=new Date("2026-10-10T00:00:00Z");
 assert.equal(inviteExpiry(3,d).toISOString(),"2026-10-13T00:00:00.000Z");
 assert.equal(inviteExpiry(30,d).toISOString(),"2026-11-09T00:00:00.000Z");
 assert.equal(inviteExpiry("never",d),null);
 assert.throws(()=>inviteExpiry(2,d),/3 jours/);
});
test("Invite creation refuses unauthorized member and never creates any foreign-guild invitation",async()=>{
 const {handleCmdNativeInvites}=await load();let m=makeContext({admin:false});
 const request={method:"POST",body:{guildId:GUILD_A,expiry:"3"}},res=mockRes();
 assert.equal(await handleCmdNativeInvites(request,res,new URL(ROOT+"/api/native/invites"),m.ctx),true);
 assert.equal(res.status,403);assert.equal(m.writes.length,0);
 const foreign=mockRes();
 await handleCmdNativeInvites({method:"POST",body:{guildId:GUILD_B,expiry:"3"}},foreign,new URL(ROOT+"/api/native/invites"),makeContext().ctx);
 assert.equal(foreign.status,403);
});
test("Per-guild links are checked by membership and cannot enumerate another community",async()=>{
 const {handleCmdNativeInvites}=await load();let m=makeContext({query:()=>({rows:[{code:"aBC123",label:"Équipe",expires_at:null,revoked_at:null,uses:1}]})});
 const response=mockRes();
 await handleCmdNativeInvites({method:"GET"},response,new URL(ROOT+"/api/native/invites?guildId="+GUILD_A),m.ctx);
 assert.equal(response.status,200);assert.equal(response.data.guildId,GUILD_A);
 assert.equal(response.data.invites[0].url,ROOT+"/invite/aBC123");
 const foreign=mockRes();
 await handleCmdNativeInvites({method:"GET"},foreign,new URL(ROOT+"/api/native/invites?guildId="+GUILD_B),m.ctx);
 assert.equal(foreign.status,403);
});
test("An expired, revoked or invalid invite is rejected before inserting a membership",async()=>{
 const {joinNativeInvite}=await load();
 let sql=[],client={query:async(q,p)=>{
  sql.push({q,p});if(q.includes("SELECT g.id,g.name FROM cmd_native_invites"))return{rows:[]};
  return{rows:[]}},release(){}};
 const pool={connect:async()=>client};
 await assert.rejects(()=>joinNativeInvite(pool,AUTH,"abcdDEFG"),/expiré|désactivé/);
 assert.equal(sql.some(x=>/INSERT INTO cmd_native_members/.test(x.q)),false);
 assert.equal(sql.some(x=>x.q==="ROLLBACK"),true);
 await assert.rejects(()=>joinNativeInvite(pool,AUTH,"<script>"),/invalide/);
});
test("A valid invitation grants membership to ONLY its linked guild",async()=>{
 const {joinNativeInvite}=await load();let sql=[];
 const client={query:async(q,p)=>{
  sql.push({q,p});
  if(q.includes("SELECT g.id,g.name FROM cmd_native_invites"))return{rows:[{id:GUILD_A,name:"Extinction"}]};
  return{rows:[]}},release(){}};
 const g=await joinNativeInvite({connect:async()=>client},AUTH,"abcdefABC123");
 assert.equal(g.id,GUILD_A);
 const inserts=sql.filter(x=>x.q.includes("INSERT INTO cmd_native_members"));
 assert.equal(inserts.length,1);
 assert.equal(inserts[0].p[0],GUILD_A);
 assert.equal(sql.filter(x=>x.q==="COMMIT").length,1);
});
test("Custom codes reject unsafe values and revocation is scoped to owned guild",async()=>{
 const {handleCmdNativeInvites}=await load();
 const m=makeContext({query:async(q,p)=>({rows:[{code:p?.[1]}]})});
 const bad=mockRes();
 await handleCmdNativeInvites({method:"POST",body:{guildId:GUILD_A,expiry:"never",customCode:"???"}},bad,new URL(ROOT+"/api/native/invites"),m.ctx);
 assert.equal(bad.status,400);
 const revoke=mockRes();
 await handleCmdNativeInvites({method:"POST",body:{guildId:GUILD_A,code:"my-friends"}},revoke,new URL(ROOT+"/api/native/invites/revoke"),m.ctx);
 assert.equal(revoke.status,200);
 assert.ok(m.writes.some(x=>/WHERE guild_id=\$1 AND code=\$2/.test(x.q)&&x.p[0]===GUILD_A));
});


test("Invite input accepts visible names with spaces and accents, stores only URL-safe code",async()=>{
 const {normalizeInviteCode,handleCmdNativeInvites}=await load();
 assert.equal(normalizeInviteCode("Extinction dayz ps5"),"extinction-dayz-ps5");
 assert.equal(normalizeInviteCode("Éxtinction    DAYZ PS5"),"extinction-dayz-ps5");
 assert.equal(normalizeInviteCode("  Mon Serveur !  "),"mon-serveur");
 const m=makeContext({query:async()=>({rows:[]})});
 const req={method:"POST",body:{guildId:GUILD_A,expiry:"never",label:"Extinction",customCode:"Extinction dayz ps5"}};
 const res=mockRes();await handleCmdNativeInvites(req,res,new URL(ROOT+"/api/native/invites"),m.ctx);
 assert.equal(res.status,201);assert.equal(res.data.code,"extinction-dayz-ps5");
 assert.equal(res.data.url,ROOT+"/invite/extinction-dayz-ps5");
 const stmt=m.writes.find(x=>/INSERT INTO cmd_native_invites/.test(x.q));
 assert.ok(stmt);assert.equal(stmt.p[0],"extinction-dayz-ps5");assert.equal(stmt.p[1],GUILD_A);
});
test("Invalid custom names never silently produce random codes",async()=>{
 const {handleCmdNativeInvites}=await load();
 const m=makeContext();const response=mockRes();
 await handleCmdNativeInvites({method:"POST",body:{guildId:GUILD_A,expiry:"30",customCode:"!!!"}},response,new URL(ROOT+"/api/native/invites"),m.ctx);
 assert.equal(response.status,400);
 assert.equal(m.writes.some(x=>/INSERT INTO cmd_native_invites/.test(x.q)),false);
});
