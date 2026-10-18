const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');

const base=path.join(__dirname,'..');
const get=filename=>import(pathToFileURL(path.join(base,filename)).href);

test('13 additional Discord gaps are preinstalled as inactive contracts',async()=>{
 const {CMD_PARITY_EXTRA_13,extraStatus,extraGap}=await get('cmd-parity-extra-13.js');
 assert.equal(CMD_PARITY_EXTRA_13.length,13);
 assert.equal(new Set(CMD_PARITY_EXTRA_13.map(f=>f.id)).size,13);
 const implemented=CMD_PARITY_EXTRA_13.filter(f=>f.implemented).length;
 assert.deepEqual(extraStatus(),{total:13,preinstalled:13,implemented,enabled:0,verified:0});
 for(const item of CMD_PARITY_EXTRA_13){
  assert.ok(item.id);assert.ok(item.title);assert.ok(item.permission);
  assert.ok(item.acceptance);assert.ok(item.endpoint);assert.ok(item.fields.length);
  assert.equal(typeof item.implemented,'boolean');assert.equal(item.enabled,false);assert.equal(item.verified,false);
  assert.equal(extraGap(item.id).id,item.id);
 }
 assert.equal(extraGap('__proto__'),null);
});

test('original 24 plus new 13 form 37 unique, still-unverified gaps',async()=>{
 const {CMD_PARITY_37,cmdGapStatus,cmdGapList}=await get('cmd-parity-37.js');
 assert.equal(CMD_PARITY_37.length,37);
 assert.equal(new Set(CMD_PARITY_37.map(f=>f.id)).size,37);
 const implemented=CMD_PARITY_37.filter(f=>f.implemented).length;
 assert.deepEqual(cmdGapStatus(),{audited:37,preinstalled:37,notPreinstalled:0,contractsOnly:37-implemented,implemented,enabled:0,verified:0,duplicates:0});
 const visible=cmdGapList();
 assert.equal(visible.length,37);
 assert.ok(visible.every(x=>['preinstalled_contract','implementation_unverified'].includes(x.stage)&&!x.enabled&&!x.verified));
});

test('new safety functions remain explicitly disabled',async()=>{
 const {CMD_PARITY_37}=await get('cmd-parity-37.js');
 for(const name of ['account_passkeys','account_mfa_recovery','stream_clips','call_audio_video_effects','voice_channel_text','voice_messages','message_forwarding','message_reminders','forum_advanced_tags_gallery','streamer_mode','sensitive_media_blur','abuse_reports','e2ee_key_verification']){
  const f=CMD_PARITY_37.find(x=>x.id===name);
  assert.ok(f,name);assert.equal(f.enabled,false);assert.equal(f.verified,false);
 }
});

test('read-only progress endpoint rejects anonymous clients and exposes only status',()=>{
 const server=fs.readFileSync(path.join(base,'server.js'),'utf8');
 assert.ok(server.includes('from "./cmd-parity-59.js"'));
 assert.ok(server.includes('"/api/cmd/parity/status"'));
 assert.match(server,/if\(!session\)\{sendJson\(res,401/);
 assert.match(server,/parityStatus\(\).*parityBreakdown\(\).*parityAuditRows\(\)/);
});
