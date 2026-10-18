const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const fs=require('node:fs');
const vm=require('node:vm');
const safety=import('../cmd-request-safety.js');
const base='https://sphere.example';
function request(chunks,headers={}){const req=Readable.from(chunks);req.headers=headers;return req}
test('API mutations reject foreign, opaque and malformed origins before handlers',async()=>{
 const {assertApiOrigin}=await safety;
 for(const method of ['POST','PUT','PATCH','DELETE'])for(const origin of ['https://attacker.example','null','%%%','http://sphere.example']){
  assert.throws(()=>assertApiOrigin({method,headers:{origin}},new URL('/api/profile',base),base),e=>e.status===403);
 }
 assert.throws(()=>assertApiOrigin({method:'POST',headers:{'sec-fetch-site':'cross-site'}},new URL('/api/auth/login',base),base),e=>e.status===403);
});
test('same-origin PWA, server webhooks, read requests and MCP retain their auth flow',async()=>{
 const {assertApiOrigin}=await safety;
 for(const req of [{method:'POST',headers:{origin:base}},{method:'POST',headers:{}},{method:'GET',headers:{origin:'https://other.example'}}])
  assert.doesNotThrow(()=>assertApiOrigin(req,new URL('/api/native/messages',base),base));
 assert.doesNotThrow(()=>assertApiOrigin({method:'POST',headers:{origin:'https://chatgpt.com'}},new URL('/mcp',base),base));
});
test('JSON reader accepts split UTF-8 and rejects malformed JSON',async()=>{
 const {readBoundedJson}=await safety;
 const raw=Buffer.from('{"message":"été"}');
 assert.deepEqual(await readBoundedJson(request([raw.subarray(0,13),raw.subarray(13)]),raw.length),{message:'été'});
 assert.deepEqual(await readBoundedJson(request([]),10),{});
 await assert.rejects(readBoundedJson(request(['{']),10),e=>e.status===400);
});
test('JSON limits apply to both declared size and chunked streams before parsing',async()=>{
 const {readBoundedJson}=await safety;
 await assert.rejects(readBoundedJson(request(['{}'],{'content-length':'100'}),10),e=>e.status===413);
 await assert.rejects(readBoundedJson(request(['12345','67890','x']),10),e=>e.status===413);
 await assert.rejects(readBoundedJson(request(['"ééé"']),7),e=>e.status===413);
});
test('malformed cookie cannot break valid session parsing or pollute prototypes',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
 const code=source.slice(source.indexOf('function parseCookies('),source.indexOf('function dashboardAuth('));
 const parse=vm.runInNewContext(code+';parseCookies');
 const cookies=parse({headers:{cookie:'broken=%XX; cmd_sphere_session=valid%2Etoken; __proto__=nope'}});
 assert.equal(cookies.cmd_sphere_session,'valid.token');assert.equal(cookies.broken,undefined);
 assert.equal(Object.getPrototypeOf(cookies),null);
});
