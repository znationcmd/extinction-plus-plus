"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
test("Studio IA is in the main/server profile and never covers the original banner",()=>{
 const profile=read("cmd-profile-premium.js"),scene=read("cmd-profile-scene.js"),studio=read("cmd-promo-studio.js");
 assert.match(profile,/id="cmdPmOpenStudio"/);
 assert.match(profile,/window\.cmdOpenPromoStudio/);
 assert.match(profile,/id="cmdPmProfileVideos"/);
 assert.match(scene,/function mountSceneCard\(/);
 assert.match(scene,/cmd-profile-universe-section/);
 assert.doesNotMatch(scene,/banner\.before\(wrap\);wrap\.append\(banner\)/);
 assert.doesNotMatch(studio,/document\.body\.append\(b\);\s*const actions=\$\("\.channel-head/);
});
test("Simplified phone video editor maps real actions to settings and storytelling",()=>{
 const studio=read("cmd-promo-studio.js"),styles=read("cmd-promo-studio.css");
 assert.match(studio,/data-cmd-tool="text"/);
 assert.match(studio,/data-cmd-tool="sticker"/);
 assert.match(studio,/data-cmd-tool="music"/);
 assert.match(studio,/data-cmd-tool="effect"/);
 assert.match(studio,/data-cmd-tool="filter"/);
 assert.match(studio,/data-cmd-tool="camera"/);
 assert.match(studio,/id="cmdStudioStory"/);
 assert.match(studio,/id="cmdStudioNext"/);
 assert.match(studio,/function showTool\(/);
 assert.match(studio,/async function publishStory\(/);
 assert.match(studio,/\/api\/cmd-profile-videos/);
 assert.match(studio,/\.put\(draft,"profile:"\+studioScope\)/);
 assert.match(studio,/\.get\("profile:"\+studioScope\)/);
 assert.match(studio,/setPointerCapture/);
 assert.match(styles,/#cmdStudioToolRail/);
 assert.match(styles,/#cmdStudioBottomBar/);
});
test("Profile video API is user-scoped and checks membership for server profiles",()=>{
 const api=read("cmd-promo-studio-api.js");
 assert.match(api,/CREATE TABLE IF NOT EXISTS cmd_sphere_profile_videos/);
 assert.match(api,/WHERE user_id=\$1 AND profile_guild=\$2/);
 assert.match(api,/auth\.guildIds/);
 assert.match(api,/DELETE FROM cmd_sphere_profile_videos WHERE id=\$1 AND user_id=\$2/);
 assert.match(api,/accept-ranges/);
});
test("Profile and Studio browser scripts parse successfully",()=>{
 for(const name of ["cmd-profile-premium.js","cmd-profile-scene.js","cmd-promo-studio.js"]){
  assert.doesNotThrow(()=>new Function(read(name)),"syntax: "+name);
 }
});
