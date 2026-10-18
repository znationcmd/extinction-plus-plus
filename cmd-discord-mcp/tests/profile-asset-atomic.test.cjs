"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
test("profile archive validates release paths and never exposes half-written final images",()=>{
 const source=fs.readFileSync(path.join(__dirname,"..","unpack-profile-assets.cjs"),"utf8");
 assert.match(source,/Invalid catalogue asset path/);
 assert.match(source,/flag:'wx'/);
 assert.match(source,/renameSync\(tmp,destination\)/);
 assert.match(source,/randomBytes\(8\)/);
 assert.ok(!/writeFileSync\(destination,/.test(source),"direct in-place write would truncate public manifest");
});
test("atomic manifest replacement keeps every intermediate read valid during subsequent writes",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cmd-sphere-atomic-test-"));
 try{
  const destination=path.join(dir,"manifest.json");
  fs.writeFileSync(destination,JSON.stringify({scenes:[{id:"scene-a"}]}));
  for(let i=0;i<12;i++){
   const replacement=path.join(dir,"manifest.json.tmp-"+i);
   const bytes=JSON.stringify({scenes:[{id:"scene-"+i}],pets:[],vehicles:[]});
   fs.writeFileSync(replacement,bytes,{flag:"wx"});
   assert.deepEqual(JSON.parse(fs.readFileSync(destination,"utf8")).scenes.length,1);
   fs.renameSync(replacement,destination);
   assert.equal(JSON.parse(fs.readFileSync(destination,"utf8")).scenes[0].id,"scene-"+i);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
