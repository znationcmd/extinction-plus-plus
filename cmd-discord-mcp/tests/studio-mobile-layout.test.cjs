"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const base=path.join(__dirname,"..");
const js=fs.readFileSync(path.join(base,"cmd-promo-studio.js"),"utf8");
const css=fs.readFileSync(path.join(base,"cmd-promo-studio.css"),"utf8");
test("iPhone bottom actions use stable grid widths without stacked letter clipping",()=>{
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(76px,92px\) minmax\(76px,92px\)/);
 assert.match(css,/word-break:normal!important/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/@media\(min-width:600px\)/);
});
test("New videos display full photos by default while retaining manual crop option",()=>{
 assert.equal((js.match(/crop:"contain"/g)||[]).length,2);
 assert.match(js,/state\.crop==="contain"/);
 assert.match(js,/cropSelect\.innerHTML=.*value="cover"/);
 assert.match(js,/if\(raw\)\{recorded=raw;if\(pub\)pub\.disabled=false/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
