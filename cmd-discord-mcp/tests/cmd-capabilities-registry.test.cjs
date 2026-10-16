const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
// Parse as data without executing imports, keep compatibility with Node >=20.
test('capabilities registry declares 23 distinct gates and keeps all disabled',()=>{
 const source=fs.readFileSync(new URL('../cmd-capabilities-registry.js', 'file://'+__filename), 'utf8');
 const labels=[...source.matchAll(/\{id:'([a-z_]+)',priority:'(P[012])',status:'(partial|unverified)',gate:'([a-z0-9_]+)'\}/g)];
 assert.equal(labels.length,23);
 assert.equal(new Set(labels.map(x=>x[1])).size,23);
 for(const x of labels){assert.ok(x[4]);assert.match(x[2],/^P[012]$/)}
 assert.match(source,/enabled:false,preinstalled:true,verified:false/);
 assert.match(source,/checks\.security===true&&checks\.integration===true&&checks\.production===true/);
});
