const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=pathToFileURL(path.join(__dirname,'..','cmd-parity-24.js')).href;
const manifest=import(root);

test('all 24 identified Discord parity gaps are preinstalled without activation',async()=>{
 const m=await manifest;
 assert.equal(m.CMD_PARITY_MISSING_24.length,24);
 assert.equal(new Set(m.CMD_PARITY_MISSING_24.map(f=>f.id)).size,24);
 const counts=Object.fromEntries(['voice','messaging','community','developer','accounts'].map(k=>[k,m.cmdParityByCategory(k).length]));
 assert.deepEqual(counts,{voice:5,messaging:2,community:8,developer:6,accounts:3});
 const status=m.cmdParityStatus();
 assert.deepEqual(status,{total:24,preinstalled:24,contractsOnly:24,implemented:0,enabled:0,verified:0});
});
test('unverified parity contracts cannot grant permissions or activate API endpoints',async()=>{
 const m=await manifest;
 const allPassed={permissions:true,security:true,production:true};
 for(const item of m.CMD_PARITY_MISSING_24){
  assert.equal(m.cmdParityReady(item.id,allPassed),false,item.id);
  assert.equal(item.enabled,false);
  assert.equal(item.implemented,false);
  assert.equal(item.verified,false);
  assert.ok(item.permission);
  assert.ok(item.endpoint);
  assert.ok(item.acceptance);
  assert.ok(item.fields.length);
 }
 assert.equal(m.cmdParityReady('__proto__',allPassed),false);
});
test('preinstall contracts preserve sensitive safety gates',async()=>{
 const m=await manifest;
 for(const id of ['voice_turn_relay','large_file_upload','automod_engine','raid_protection','app_monetization','family_center','cloud_backgrounds']){
  const f=m.CMD_PARITY_MISSING_24.find(x=>x.id===id);
  assert.ok(f,id);
  assert.equal(f.enabled,false,id);
 }
 const copy=m.cmdParityByCategory('voice');
 copy[0].fields.push('malicious');
 assert.equal(m.cmdParityByCategory('voice')[0].fields.includes('malicious'),false);
});
