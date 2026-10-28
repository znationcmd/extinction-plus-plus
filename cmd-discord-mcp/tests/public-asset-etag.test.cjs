const {test}=require("node:test");
const assert=require("node:assert/strict");
const {mkdtempSync,writeFileSync,rmSync}=require("node:fs");
const {tmpdir}=require("node:os");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
let createPublicAssetResponder;\nrequire("../cmd-public-asset-etag.js");

function response() {
  return {status:null,headers:null,body:null,
    writeHead(status,headers){this.status=status;this.headers=headers;return this},
    end(body){this.body=body;return this}
  };
}
test("fresh public asset carries content bytes and a SHA-256 ETag",()=>{
 const dir=mkdtempSync(path.join(tmpdir(),"cmd-sphere-asset-"));
 try {
  const file=path.join(dir,"client.js");
  writeFileSync(file,"console.log('sphere');");
  const serve=createPublicAssetResponder(pathToFileURL(file),"application/javascript");
  const res=response();
  assert.equal(serve({method:"GET",headers:{}},res),true);
  assert.equal(res.status,200);
  assert.match(res.headers.etag,/^"sha256-[a-f0-9]{64}"$/);
  assert.equal(res.headers["cache-control"],"public, no-cache, must-revalidate");
  assert.equal(Buffer.from(res.body).toString("utf8"),"console.log('sphere');");
  const cached=response();
  serve({method:"GET",headers:{"if-none-match":res.headers.etag}},cached);
  assert.equal(cached.status,304);
  assert.equal(cached.body,undefined);
  const head=response();
  serve({method:"HEAD",headers:{}},head);
  assert.equal(head.status,200);
  assert.equal(head.body,undefined);
  assert.equal(serve({method:"POST",headers:{}},response()),false);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test("new deployment content changes ETag; old clients download new content",()=>{
 const dir=mkdtempSync(path.join(tmpdir(),"cmd-sphere-asset-"));
 try {
  const file=path.join(dir,"client.json");
  writeFileSync(file,'{"v":1}');
  const original=createPublicAssetResponder(pathToFileURL(file),"application/json");
  const old=response();
  original({method:"GET",headers:{}},old);
  writeFileSync(file,'{"v":2}');
  const newDeployment=createPublicAssetResponder(pathToFileURL(file),"application/json");
  const latest=response();
  newDeployment({method:"GET",headers:{"if-none-match":old.headers.etag}},latest);
  assert.equal(latest.status,200);
  assert.notEqual(latest.headers.etag,old.headers.etag);
  assert.equal(Buffer.from(latest.body).toString("utf8"),'{"v":2}');
 }finally{rmSync(dir,{recursive:true,force:true})}
});
