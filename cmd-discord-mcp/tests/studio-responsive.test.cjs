"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const css=fs.readFileSync(path.join(root,"cmd-promo-studio.css"),"utf8");
const ui=fs.readFileSync(path.join(root,"cmd-promo-studio.js"),"utf8");
const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
test("Editor adapts phone portrait, tablet portrait, large landscape and short landscape",()=>{
 assert.match(css,/@media \(max-width: 599px\) and \(orientation: portrait\)/);
 assert.match(css,/@media \(min-width: 600px\) and \(max-width: 899px\) and \(orientation: portrait\)/);
 assert.match(css,/@media \(min-width: 900px\) and \(min-height: 520px\)/);
 assert.match(css, /grid-template-columns:minmax\(0,1fr\) clamp\(315px,35vw,470px\)/);
 assert.match(css,/@media \(orientation: landscape\) and \(max-height: 519px\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.doesNotMatch(css,/display:none!important[^}]*#cmdStudioFeed/);
});
test("Viewer centers desktop video, preserves touch layout and keyboard control",()=>{
 assert.match(ui,/@media \(min-width: 700px\)/);
 assert.match(ui,/\.csf-scroll/);
 assert.match(ui,/onFeedKeyDown/);
 assert.match(ui,/PageDown/);
 assert.match(ui,/onFeedVisibility/);
 assert.match(ui,/document\.removeEventListener\("keydown",onFeedKeyDown\)/);
 assert.match(ui,/document\.addEventListener\("keydown",onFeedKeyDown\)/);
 assert.match(ui,/if\(w\.started\)\{w\.seconds/);
 assert.doesNotThrow(()=>new (require("node:vm").Script)(ui));
});
test("PWA version forces Studio script and stylesheet to refresh together",()=>{
 assert.equal((server.match(/\/cmd-promo-studio\.js\?v=20261012-studio-free-fx-v8/g)||[]).length,2);
 assert.equal((server.match(/\/cmd-promo-studio\.css\?v=20261012-studio-free-fx-v8/g)||[]).length,2);
});
