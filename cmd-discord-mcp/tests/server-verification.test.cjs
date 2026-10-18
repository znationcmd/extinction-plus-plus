'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const verification=import('../cmd-server-verification.js');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const invites=fs.readFileSync(path.join(__dirname,'../cmd-native-invites.js'),'utf8');
const settings=fs.readFileSync(path.join(__dirname,'../cmd-server-manager.js'),'utf8');

const G='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',U='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
function db({level='none',verified=false,ageMinutes=0,alreadyMember=false,duplicateConstraint=false}={}){
 const queries=[];
 const pool={async query(sql,args){
  queries.push({sql,args});
  if(duplicateConstraint&&sql.includes('ADD CONSTRAINT'))throw Object.assign(new Error('duplicate'),{code:'42710'});
  if(sql.startsWith('SELECT id,verification_level'))return {rows:[{id:G,verification_level:level}]};
  if(sql.startsWith('UPDATE cmd_native_guilds SET verification_level'))return {rows:[{id:G,verification_level:args[1]}]};
  if(sql.includes('EXISTS(SELECT 1 FROM cmd_native_members'))return {rows:[{
   level,email_verified:verified,account_created_at:new Date(Date.now()-ageMinutes*60000),
   already_member:alreadyMember
  }]};
  return {rows:[]};
 }};
 return {pool,queries};
}
test('Legacy communities default to none and schema change is additive',async()=>{
 const {initCmdServerVerification}=await verification,v=db();
 await initCmdServerVerification(v.pool);
 assert.ok(v.queries.some(x=>x.sql.includes("ADD COLUMN IF NOT EXISTS verification_level TEXT NOT NULL DEFAULT 'none'")));
 assert.ok(v.queries.some(x=>x.sql.includes('cmd_native_verification_level_check')));
 assert.ok(v.queries.every(x=>!/(?:DROP TABLE|TRUNCATE|DELETE FROM|ALTER COLUMN)/i.test(x.sql)));
});
test('Boot remains safe when verification constraint already exists',async()=>{
 const {initCmdServerVerification}=await verification;
 await assert.doesNotReject(initCmdServerVerification(db({duplicateConstraint:true}).pool));
});
test('Rejects invalid and unsupported tiers to prevent coercion',async()=>{
 const {parseServerVerificationLevel}=await verification;
 for(const x of [undefined,null,3,'phone','admin','',true,{}])assert.throws(()=>parseServerVerificationLevel(x));
 for(const level of ['none','email','email_5m','email_1d'])assert.equal(parseServerVerificationLevel(level),level);
});
test('Existing guild members are grandfathered without changing memberships',async()=>{
 const {assertCmdInviteVerification}=await verification;
 const r=await assertCmdInviteVerification(db({level:'email_1d',alreadyMember:true}).pool,G,U);
 assert.equal(r.alreadyMember,true);
});
test('Disabled tier preserves current invitation behavior',async()=>{
 const {assertCmdInviteVerification}=await verification;
 assert.equal((await assertCmdInviteVerification(db({level:'none'}).pool,G,U)).level,'none');
});
test('Verified email required by opt-in email tier',async()=>{
 const {assertCmdInviteVerification}=await verification;
 await assert.rejects(assertCmdInviteVerification(db({level:'email'}).pool,G,U),e=>e.status===403);
 assert.equal((await assertCmdInviteVerification(db({level:'email',verified:true}).pool,G,U)).level,'email');
});
test('Five-minute tier applies verified account age and cannot be bypassed by younger account',async()=>{
 const {assertCmdInviteVerification}=await verification;
 await assert.rejects(assertCmdInviteVerification(db({level:'email_5m',verified:true,ageMinutes:1}).pool,G,U),e=>e.status===403);
 assert.equal((await assertCmdInviteVerification(db({level:'email_5m',verified:true,ageMinutes:6}).pool,G,U)).level,'email_5m');
});
test('High tier enforces verified email and account age 24 hours',async()=>{
 const {assertCmdInviteVerification}=await verification;
 await assert.rejects(assertCmdInviteVerification(db({level:'email_1d',verified:true,ageMinutes:60}).pool,G,U),e=>e.status===403);
 assert.equal((await assertCmdInviteVerification(db({level:'email_1d',verified:true,ageMinutes:1500}).pool,G,U)).level,'email_1d');
});
test('Invitation acceptance enforces verification inside transaction before inserting a member',()=>{
 const start=invites.indexOf('export async function joinNativeInvite');
 const end=invites.indexOf('export async function handleCmdNativeInvites',start);
 assert.ok(start>=0&&end>start);
 const flow=invites.slice(start,end);
 const check=flow.indexOf('await assertCmdInviteVerification(client,g.id,user)');
 const insert=flow.indexOf('INSERT INTO cmd_native_members');
 assert.ok(check>0&&insert>check,'verify inside transaction before member write');
 assert.ok(flow.includes('await client.query("BEGIN")'));
 assert.ok(flow.includes('await client.query("ROLLBACK")'));
});
test('Owner-only verification API exposes a read path and validates the desired tier',()=>{
 assert.ok(server.includes('initCmdServerVerification(pool)'));
 const route=server.slice(server.indexOf('if(url.pathname==="/api/native/verification"'),server.indexOf('if(url.pathname==="/api/native/slowmode"'));
 assert.ok(route.includes('dashboardAuth(req)'));
 assert.ok(route.includes('await requireNativeMember(auth,guildId)'));
 assert.ok(route.includes('await requireNativeOwner(auth,guildId)'));
 assert.ok(route.includes('setCmdServerVerification(pool,guildId,input?.level)'));
});
test('Native server settings exposes tiers to the owner and sends PATCH to API',()=>{
 assert.ok(settings.includes("name=\"verificationLevel\""));
 assert.ok(settings.includes("['email_1d','E-mail vérifié et compte CMD de 24 heures']"));
 assert.ok(settings.includes("request('/api/native/verification',{guildId:id(),level:verification},'PATCH')"));
 assert.ok(settings.includes("async function request(path,body,method)"));
});
