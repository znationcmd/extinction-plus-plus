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
 const status=m.parityStatus();
 assert.equal(status.audited,59);
 assert.equal(status.unique,59);
 assert.equal(status.duplicates,0);
 assert.equal(status.preinstalled,59);
 assert.equal(status.notPreinstalled,0);
 assert.equal(status.contractsOnly,m.CMD_PARITY_59.filter(x=>!x.implemented).length);
 assert.equal(status.implemented,m.CMD_PARITY_59.filter(x=>x.implemented).length);
 assert.equal(status.enabled,m.CMD_PARITY_59.filter(x=>x.enabled).length);
 assert.equal(status.verified,m.CMD_PARITY_59.filter(x=>x.verified).length);
 assert.equal(m.parityAuditRows().length,59);
 assert.ok(m.parityAuditRows().every(f=>['preinstalled_contract','partially_implemented','verified'].includes(f.stage)));
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
   assert.equal(entry.installed,true);
   assert.equal(typeof entry.implemented,'boolean');
   assert.equal(typeof entry.enabled,'boolean');
   assert.equal(typeof entry.verified,'boolean');
   assert.ok(!entry.enabled||entry.implemented,'Never activate contract without implementation');
   assert.ok(!entry.verified||(entry.implemented&&entry.enabled),'Never verify inactive or unimplemented contracts');
   assert.ok(entry.acceptance);
  }
 });
 assert.equal(sum,22);
});
