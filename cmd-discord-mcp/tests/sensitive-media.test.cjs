const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const mod=import("../cmd-sensitive-media.js");
const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const menu=fs.readFileSync(path.join(__dirname,"../cmd-social-message-actions.js"),"utf8");
const ui=fs.readFileSync(path.join(__dirname,"../cmd-sensitive-media-ui.js"),"utf8");
const a="11111111-1111-4111-8111-111111111111",b="22222222-2222-4222-8222-222222222222";
function db(){
 const records=new Map(),sqls=[];
 return {sqls,async query(sql,args=[]){
  sqls.push(sql);
  if(sql.startsWith("SELECT blur_attachments"))return {rows:records.has(args[0])?[{blur_attachments:records.get(args[0])}]:[]};
  if(sql.startsWith("INSERT INTO cmd_sensitive_media_preferences")){
   records.set(args[0],args[1]);return {rows:[{blur_attachments:args[1]}]};
  }
  return {rows:[]};
 }};
}
test("Account media blur is opt-in, per-user and non-destructive",async()=>{
 const {initCmdSensitiveMedia,getCmdSensitiveMedia,saveCmdSensitiveMedia}=await mod;
 const pool=db();await initCmdSensitiveMedia(pool);
 assert.deepEqual(await getCmdSensitiveMedia(pool,a),{blurAttachments:false});
 assert.deepEqual(await saveCmdSensitiveMedia(pool,a,{blurAttachments:true}),{blurAttachments:true});
 assert.deepEqual(await getCmdSensitiveMedia(pool,b),{blurAttachments:false});
 assert.deepEqual(await saveCmdSensitiveMedia(pool,a,{blurAttachments:false}),{blurAttachments:false});
 assert.ok(pool.sqls.some(s=>s.includes("CREATE TABLE IF NOT EXISTS cmd_sensitive_media_preferences")));
 assert.ok(pool.sqls.every(s=>!/\b(DROP|TRUNCATE)\b/.test(s)));
});
test("Strict settings reject accidental false-string and missing authorization",async()=>{
 const {getCmdSensitiveMedia,saveCmdSensitiveMedia}=await mod;
 const pool=db();
 await assert.rejects(saveCmdSensitiveMedia(pool,a,{blurAttachments:"true"}),/invalide/);
 await assert.rejects(saveCmdSensitiveMedia(pool,a,{}),/invalide/);
 await assert.rejects(getCmdSensitiveMedia(pool,null),e=>e.status===401);
});
test("UI blurs only attachments, lets viewers reveal and offers a reversible manual control",()=>{
 assert.match(ui,/a\.msg-image-link/);
 assert.match(ui,/\.msg-file:has\(video\)/);
 assert.match(ui,/cmd-media-reveal/);
 assert.match(ui,/cmd-media-revealed/);
 assert.match(ui,/api\/account\/sensitive-media/);
 assert.ok(!/deleteElement|deleteAccount|\bDELETE\b/.test(ui));
 assert.match(menu,/window\.cmdSphereSensitiveMedia\.toggle/);
 assert.doesNotThrow(()=>new Function(ui));
});
test("Backend stores only own preference and offers GET/PATCH auth guard",()=>{
 assert.match(server,/initCmdSensitiveMedia\(pool\)/);
 assert.match(server,/await saveCmdSensitiveMedia\(pool,userId,await readFormBodyJson\(req\)\)/);
 assert.ok(server.includes('url.pathname==="/api/account/sensitive-media"'));
 assert.ok(server.includes('url.pathname==="/cmd-sensitive-media-ui.js"'));
 assert.ok(server.includes('src="/cmd-sensitive-media-ui.js'));
});
