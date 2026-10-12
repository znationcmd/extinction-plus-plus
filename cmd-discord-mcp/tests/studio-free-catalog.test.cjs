"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,".."),ui=fs.readFileSync(path.join(root,"cmd-promo-studio.js"),"utf8"),api=fs.readFileSync(path.join(root,"cmd-studio-music.js"),"utf8");
test("Free catalog sources and guardrails",()=>{
 for(const s of ["openverse","ccmixter","audius","jamendo"])assert.ok(ui.includes('["'+s+'",'));
 assert.match(api,/freeSearch\(src,q\)/);assert.match(api,/audiusSearch\(q\)/);
 assert.match(api,/Accès Jamendo commercial soumis à licence/);
 assert.match(ui,/track\.canUseInVideo===false\|\|studioBadMusic\.has/);
 assert.doesNotThrow(()=>new vm.Script(ui));
});
test("No automatic unverified media streaming",()=>{
 assert.match(api,/function safeSong\(url\)/);
 assert.match(api,/function usableLicense\(str\)/);
 assert.match(api,/allowedMediaUrl\(track\.remoteUrl\)\|\|safeSong\(track\.remoteUrl\)/);
});
