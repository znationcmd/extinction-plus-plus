"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const root=path.resolve(__dirname,"..");
test("personal recommendations use engagement but avoid immediate repeated creators",async()=>{
 const {rankStudioFeed,studioWords}=await import(pathToFileURL(path.join(root,"cmd-studio-recommendations.js")));
 const time=Date.now();const iso=new Date(time-86400000).toISOString();
 const vids=[
  {id:"a",user_id:"A",title:"ARK dragons",created_at:iso,likes:5,comments:0,views:5,completions:3},
  {id:"b",user_id:"A",title:"ARK créatures",created_at:iso,likes:4,comments:0,views:5,completions:3},
  {id:"c",user_id:"B",title:"ARK carte Astraeos",created_at:iso,likes:2,comments:0,views:2,completions:1},
  {id:"d",user_id:"C",title:"Géographie",created_at:iso,likes:0,comments:0,views:1,completions:0}
 ];
 const ranked=rankStudioFeed(vids,{positive:[{title:"ARK dragons",user_id:"A",weight:3}]},time);
 assert.equal(ranked.length,4);assert.equal(ranked[0].id,"a");
 assert.notEqual(ranked[0].user_id,ranked[1].user_id);
 assert.match(ranked[0].why,/regardé|suis|intéresse|Découvre/);
 assert.equal("watched_seconds" in ranked[0],false);
 assert.ok(studioWords("Épiques dragons #ARK").includes("dragons"));
});
test("Studio API keeps private server videos out of public recommendations",()=>{
 const api=fs.readFileSync(path.join(root,"cmd-promo-studio-api.js"),"utf8");
 const ui=fs.readFileSync(path.join(root,"cmd-promo-studio.js"),"utf8");
 assert.match(api,/p\.profile_guild=''|profile_guild='' AND format LIKE/);
 assert.match(api,/AND w\.not_interested/);
 assert.match(api,/CREATE TABLE IF NOT EXISTS cmd_sphere_studio_watch/);
 assert.match(api,/GREATEST\(cmd_sphere_studio_watch\.watched_seconds/);
 assert.match(api,/ON CONFLICT\(video_id,user_id\)/);
 assert.match(ui,/feedSignal\(item,"not_interested"\)/);
 assert.match(ui,/feedRequest\?\.abort\(\)/);
 assert.match(ui,/feedItems\.map\(v=>v\.id\)/);
 assert.match(ui,/if\(studioProfileGuild\)/);
});
