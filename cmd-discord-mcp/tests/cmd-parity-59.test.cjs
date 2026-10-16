const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..');
const load=p=>import(pathToFileURL(path.join(root,p)).href);

test('keeps 37 original gaps and adds 22 new, 59 distinct',async()=>{
 const m=await load('cmd-parity-59.js');
 const ids=m.CMD_PARITY_59.map(x=>x.id);
 assert.equal(ids.length,59);
 assert.equal(new Set(ids).size,59);
 assert.deepEqual(m.AUDIT_VERSIONS,{first:24,second:13,third:22,expectedTotal:59});
 assert.deepEqual(m.parityStatus(),{
  audited:59,unique:59,duplicates:0,preinstalled:59,notPreinstalled:0,contractsOnly:59,implemented:0,enabled:0,verified:0
 });
 assert.equal(m.parityAuditRows().length,59);
 assert.ok(m.parityAuditRows().every(f=>f.stage==='preinstalled_contract'&&!f.enabled&&!f.verified));
});
test('expanded categories sum to 22 and no additional functions have been enabled',async()=>{
 const m=await load('cmd-parity-59.js');
 const c=m.parityBreakdown().categories;
 for(const [category,count] of Object.entries({privacy:5,servers:6,voice:10,accounts:3,applications:0})){
  // Categories from previous audits also contribute, so only enforce a lower bound.
  if(count)assert.ok((c[category]||0)>=count,category);
 }
 const newer=await Promise.all([
  'privacy','servers','voice','accounts','apps','accessibility','monetization'
 ].map(k=>load('cmd-parity-expansion-'+k+'.js')));
 const expected=[4,6,5,3,2,1,1];
 let sum=0;
 newer.forEach((module,i)=>{
  assert.equal(module.features.length,expected[i]);sum+=module.features.length;
  for(const entry of module.features){
   assert.equal(entry.installed,true);assert.equal(entry.implemented,false);
   assert.equal(entry.enabled,false);assert.equal(entry.verified,false);
   assert.ok(entry.acceptance);
  }
 });
 assert.equal(sum,22);
});
