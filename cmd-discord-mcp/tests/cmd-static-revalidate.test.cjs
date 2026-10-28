const test=require("node:test");
const assert=require("node:assert/strict");
const {mkdtempSync,writeFileSync,rmSync}=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {pathToFileURL}=require("node:url");

function call(handler,method,headers={}) {
  let status,head,body;
  handler({method,headers},{writeHead:(s,h)=>{status=s;head=h;},end: b=>{body=b;}});
  return {status,head,body};
}

test("CMD Sphere only resends a changed public asset", async()=>{
  const {createConditionalStaticHandler}=await import("../cmd-static-revalidate.mjs");
  const dir=mkdtempSync(path.join(os.tmpdir(),"cmd-sphere-static-"));
  try {
    const file=path.join(dir,"cmd-pwa-update.js");
    writeFileSync(file,"window.CMD_SPHERE_VERSION=1;");
    const handler=createConditionalStaticHandler(pathToFileURL(file),"application/javascript; charset=utf-8");
    const first=call(handler,"GET");
    assert.equal(first.status,200);
    assert.equal(first.body.toString(),"window.CMD_SPHERE_VERSION=1;");
    assert.match(first.head.etag,/^"sha256-[a-f0-9]{64}"$/);
    assert.equal(first.head["cache-control"],"public, no-cache, must-revalidate");
    const unchanged=call(handler,"GET",{"if-none-match":first.head.etag});
    assert.equal(unchanged.status,304);
    assert.equal(unchanged.body,undefined);
    const head=call(handler,"HEAD");
    assert.equal(head.status,200);
    assert.equal(head.body,undefined);
    const rejected=call(handler,"POST");
    assert.equal(rejected.status,405);
    // A new deployment starts a fresh handler and checks new file contents.
    writeFileSync(file,"window.CMD_SPHERE_VERSION=2;");
    const upgraded=createConditionalStaticHandler(pathToFileURL(file),"application/javascript; charset=utf-8");
    const latest=call(upgraded,"GET",{"if-none-match":first.head.etag});
    assert.equal(latest.status,200);
    assert.equal(latest.body.toString(),"window.CMD_SPHERE_VERSION=2;");
    assert.notEqual(latest.head.etag,first.head.etag);
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
});
