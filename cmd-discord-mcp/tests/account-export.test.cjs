"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const modulePromise=import(pathToFileURL(path.join(__dirname,"..","cmd-account-export.js")).href);
const accountId="11111111-1111-4111-8111-111111111111",auth={user:{id:accountId,name:"alice"}};
function fakeDb(count=1){
 const calls=[];
 return {calls,async query(sql,args){
  calls.push({sql,args});
  if(sql.includes("FROM cmd_global_profiles"))return {rows:[{user_id:accountId,display_name:"Alice",bio:"Bienvenue"}]};
  if(sql.includes("FROM cmd_accounts"))return {rows:[{id:accountId,username:"alice",display_name:"Alice",password_hash:"LEAK-ME",password_salt:"SECRET"}]};
  const rows=Array.from({length:count},(_,i)=>({id:String(i),body:"Message "+i,sender_user_id:"OTHER_PERSON_SHOULD_NOT_APPEAR"}));
  return {rows};
 }};
}
test("own export uses only cookie-authenticated ID and explicit column lists",async()=>{
 const {collectAccountExport:exportSelf}=await modulePromise,db=fakeDb(2);
 const report=await exportSelf(db,auth,{now:new Date("2026-10-18T12:00:00Z")});
 assert.equal(report.accountId,accountId);assert.equal(report.format,"cmd-sphere-account-data-v1");
 assert.equal(report.complete,false);assert.equal(report.sections.serverMessages.records.length,2);
 assert.equal(db.calls.length,6);
 for(const call of db.calls){
  assert.equal(call.args[0],accountId);
  assert.doesNotMatch(call.sql,/SELECT \*|password_hash|password_salt|token|secret|private_key/i);
  assert.match(call.sql,/WHERE (?:user_id|sender_user_id|id)=\$1/);
 }
 assert.ok(!JSON.stringify(report).includes("LEAK-ME"));
 assert.ok(!JSON.stringify(report).includes("SECRET"));
});
test("all lists enforce 500 max and openly report truncation",async()=>{
 const {collectAccountExport:exportSelf,ACCOUNT_EXPORT_SECTION_LIMIT:limit}=await modulePromise,db=fakeDb(501);
 const result=await exportSelf(db,auth);
 assert.equal(limit,500);
 for(const section of Object.values(result.sections)){
  assert.equal(section.records.length,500);
  assert.equal(section.truncated,true);
 }
 assert.equal(result.limits.binaryMediaIncluded,false);
 assert.match(result.note,/partiel/i);
});
test("legacy account IDs bypass UUID-only account table while exporting own messages",async()=>{
 const {collectAccountExport:exportSelf}=await modulePromise;
 const db=fakeDb(1);
 const report=await exportSelf(db,{user:{id:"discord-legacy-1234567890123456"}});
 assert.equal(report.account,null);
 assert.equal(db.calls.length,5);
 for(const query of db.calls)assert.equal(query.args[0],"discord-legacy-1234567890123456");
});
test("anonymous exports and unavailable databases are rejected",async()=>{
 const {collectAccountExport:exportSelf}=await modulePromise;
 await assert.rejects(exportSelf(fakeDb(),null),e=>e.status===401);
 await assert.rejects(exportSelf(null,auth),e=>e.status===503);
});
test("route requires POST, private session and no-store download",async()=>{
 const {handleCmdAccountExport:handle}=await modulePromise,db=fakeDb(1);
 const sent=[],headers=[],sendJson=(_res,status,payload)=>sent.push({status,payload});
 const deps={pool:db,auth,sendJson};
 assert.equal(await handle({method:"POST"},{},new URL("https://cmd.test/another"),deps),false);
 await handle({method:"GET"},{},new URL("https://cmd.test/api/account/export-data"),deps);
 assert.equal(sent.at(-1).status,405);
 await handle({method:"POST"},{},new URL("https://cmd.test/api/account/export-data"),{...deps,auth:null});
 assert.equal(sent.at(-1).status,401);
 await handle({method:"POST"},{setHeader:(key,value)=>headers.push([key,value])},new URL("https://cmd.test/api/account/export-data"),deps);
 assert.equal(sent.at(-1).status,200);
 assert.ok(headers.some(([key,value])=>key==="Cache-Control"&&value==="private, no-store"));
 assert.ok(headers.some(([key,value])=>key==="Content-Disposition"&&value.includes("attachment")));
});
test("native account settings add an actual download, not just a placeholder",()=>{
 const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
 const settings=fs.readFileSync(path.join(__dirname,"..","settings-ui.js"),"utf8");
 assert.match(server,/handleCmdAccountExport\(req,res,url,\{pool,auth:dashboardAuth\(req\),sendJson\}\)/);
 assert.match(settings,/data-cmd-subaction="export-data"/);
 assert.match(settings,/fetch\('\/api\/account\/export-data'/);
 assert.match(settings,/response\.blob\(\)/);
 assert.match(settings,/link\.download='cmd-sphere-mes-donnees\.json'/);
});
