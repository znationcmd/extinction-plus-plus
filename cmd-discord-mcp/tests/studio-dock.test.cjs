"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,".."),js=fs.readFileSync(path.join(root,"cmd-promo-studio.js"),"utf8"),css=fs.readFileSync(path.join(root,"cmd-promo-studio.css"),"utf8"),sv=fs.readFileSync(path.join(root,"server.js"),"utf8");
test("real action bar uses isolated dock with 3 columns",()=>{
 assert.match(js,/bottom.id="cmdStudioActionDock"/);
 assert.match(js,/getElementById\("cmdStudioActionDock"\)/);
 assert.doesNotMatch(js,/cmdStudioBottomBar/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) 84px 84px/);
});
test("landscape rail is horizontal and first media can update aspect",()=>{
 assert.match(css,/overflow-x:auto!important/);
 assert.match(js,/state\.format=w\/h>1\.25\?"16:9":w\/h<\.8\?"9:16":"1:1"/);
 assert.match(js,/surface\.style\.aspectRatio=w\+"\/"\+h/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
test("Studio stylesheet/script cache bust",()=>{
 assert.equal((sv.match(/\/cmd-promo-studio\.js\?v=20261012-studio-dock-v5/g)||[]).length,2);
 assert.equal((sv.match(/\/cmd-promo-studio\.css\?v=20261012-studio-dock-v5/g)||[]).length,2);
});
