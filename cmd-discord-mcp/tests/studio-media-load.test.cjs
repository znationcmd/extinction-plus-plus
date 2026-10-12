"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const s=fs.readFileSync(path.join(__dirname,"..","cmd-promo-studio.js"),"utf8");
test("on media loaded selects all format buttons and registers handler before setting source",()=>{
 assert.match(s,/\$\$\("\[data-studio-format\]",root\)\.forEach/);
 assert.doesNotMatch(s,/(?<!\$)\$\("\[data-studio-format\]",root\)\.forEach/);
 const start=s.indexOf('const first=clips.length===1'),assign=s.indexOf('element.src=url;',start);
 const handler=s.indexOf('element.onloadedmetadata=onReady',start);
 assert.ok(handler>start&&assign>handler);
 assert.doesNotThrow(()=>new vm.Script(s));
});
