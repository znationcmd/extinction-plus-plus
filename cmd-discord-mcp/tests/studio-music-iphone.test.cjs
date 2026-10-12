"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const js=fs.readFileSync(path.join(__dirname,"..","cmd-promo-studio.js"),"utf8"),proxy=fs.readFileSync(path.join(__dirname,"..","cmd-studio-music.js"),"utf8");
test("Apple mobile only accepts compatible MP3 catalog and verifies actual playback",()=>{
 assert.match(js,/studioPlayableMime/);
 assert.match(js,/apple&&type!=="audio\/mpeg"/);
 assert.match(js,/studioWithTimeout\(player\.play\(\),14000/);
 assert.match(js,/musicResults=.*\.filter\(studioPlayableMime\)/);
});
test("Music proxy supports HTTP range streaming without full buffering",()=>{
 assert.match(proxy,/remoteHeaders\.Range=cleanRange/);
 assert.match(proxy,/remote\.status===206/);
 assert.match(proxy,/for await\(const chunk of remote\.body\)/);
});
test("Exports show progress and timeout stalled recorder",()=>{
 assert.match(js,/options\.onProgress\(second,Math\.ceil\(state\.duration\)\)/);
 assert.match(js,/studioWithTimeout\(completed,12000/);
 assert.match(js,/onProgress:\(sec,total\)=>/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
