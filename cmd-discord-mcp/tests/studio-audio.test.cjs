"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const src=fs.readFileSync(path.join(__dirname,"..","cmd-promo-studio.js"),"utf8");
test("Studio audio and recording remain feature-detected per browser",()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 assert.match(src,/studioRecordingType/);
 assert.match(src,/video\/mp4/);assert.match(src,/video\/webm/);
 assert.match(src,/decodeAudioData/);
 assert.match(src,/source\.loop=true/);
 assert.match(src,/const needsAudio=state\.volume>0/);
 assert.doesNotMatch(src,/audio\.createMediaElementSource\(soundtrack\)/);
});
test("Studio links legitimately licensed audio library and fallback without re-encoding",()=>{
 assert.match(src,/youtube\.com\/audiolibrary/);
 assert.match(src,/studioRawVideoFallback/);
 assert.match(src,/if\(pub\)pub\.disabled=false/);
});
