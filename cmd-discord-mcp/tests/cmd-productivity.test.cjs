const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','cmd-productivity.js'),'utf8');
test('productivity bundle parses and safely exits outside messaging',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.doesNotThrow(()=>vm.runInNewContext(source,{window:{},document:{querySelector:()=>null}}));
});
test('drafts and favorites use account and conversation namespaced keys',()=>{
 assert.match(source,/encodeURIComponent\(user\)/);
 assert.match(source,/encodeURIComponent\(suffix\)/);
 assert.match(source,/locationKey\(\)/);
 assert.match(source,/safeSet\(k,current\)/);
 assert.match(source,/\.slice\(0,50\)/);
 assert.match(source,/\.textContent=item\.text/);
 assert.match(source,/deviceOnly:true/);
});
test('no remote writes or purchases introduced by productivity module',()=>{
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 assert.doesNotMatch(source,/\bXMLHttpRequest\b/);
 assert.doesNotMatch(source,/\bWebSocket\b/);
});
