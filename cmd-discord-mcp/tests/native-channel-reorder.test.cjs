"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const ui=fs.readFileSync(path.join(root,"cmd-server-manager.js"),"utf8");
const server=fs.readFileSync(path.join(root,"server.js"),"utf8");

test("drag across categories keeps pointer capture on stationary screen",()=>{
  const start=ui.indexOf("function openChannelReorderMode(mode)");
  const end=ui.indexOf("\nasync function createChannel(",start);
  assert.ok(start>=0&&end>start,"reorder UI function must exist");
  const block=ui.slice(start,end);
  assert.match(block,/page\.setPointerCapture\(e\.pointerId\)/);
  assert.doesNotMatch(block,/grip\.setPointerCapture\(e\.pointerId\)/);
  assert.match(block,/target\.insertBefore\(drag\.row,next\)/);
  assert.match(block,/nearestBucket\(drag\.y\)/);
  assert.match(block,/requestAnimationFrame\(autoscroll\)/);
  assert.match(block,/document\.addEventListener\('pointercancel',onCancel/);
  assert.doesNotThrow(()=>new vm.Script(ui));
});
test("text and voice reordering submit destination category and order together",()=>{
  const block=ui.slice(ui.indexOf("function openChannelReorderMode(mode)"),ui.indexOf("\nasync function createChannel("));
  assert.match(block,/mode==='category'\?\['category'\]:mode==='voice'\?\['voice'\]/);
  assert.match(block,/const snapshot=\(\)=>rows\(\)\.map\(row=>\(\{id:row\.dataset\.sortId,parentId:/);
  assert.match(block,/action:'reorder_channels',mode,channelIds:after\.map\(x=>x\.id\),placements:after/);
  assert.match(block,/parent!==expectedParent/);
  assert.match(block,/restore\(before\);updateLabels\(\)/);
});
test("server persists category destinations atomically on native CMD Sphere only",()=>{
  const begin=server.indexOf('}else if(action==="reorder_channels"){');
  const end=server.indexOf('}else if(action==="delete_channel"){',begin);
  assert.ok(begin>=0&&end>begin,"reorder API handler must exist");
  const block=server.slice(begin,end);
  for(const sql of ['BEGIN','FOR UPDATE','FOR SHARE','COMMIT','ROLLBACK','source_parent_id=$4']){
    assert.ok(block.includes(sql),"missing transactional safeguard: "+sql);
  }
  assert.match(server,/requireNativePermission\(auth,gid,"manageChannels"\)/);
  assert.doesNotMatch(block,/syncNativeFromDiscord\(|backend\(/);
});
