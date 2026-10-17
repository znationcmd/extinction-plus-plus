const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");
const script=fs.readFileSync(path.join(__dirname,"../cmd-personal-backgrounds.js"),"utf8");
const chat=fs.readFileSync(path.join(__dirname,"../cmd-chat-polish.js"),"utf8");
const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
const wait=()=>new Promise(resolve=>setTimeout(resolve,35));
function app(native=true){
 const content=native?
  '<div class="sphere-app"><section id="channelOverlay"><div id="channelMessages"></div><div id="channelToolSheet"><div class="compose-sheet-grid"><button id="toolFiles" type="button"><b>▧</b><span>Fond</span></button></div></div></section></div>':
  '<div id="msgs"></div><div id="cmdDmToolSheet"><div class="compose-sheet-grid"></div></div>';
 const dom=new JSDOM('<!doctype html><html><head></head><body>'+content+'</body></html>',{url:"https://cmd-sphere.up.railway.app/dashboard",runScripts:"outside-only"});
 const {window}=dom;
 window.CHAT={guildId:native?"srv1":""};
 const requests=[];
 window.fetch=async(url,opt={})=>{
  requests.push({url:String(url),method:opt.method||"GET",body:opt.body||null});
  return {ok:true,json:async()=>({image:null})};
 };
 window.eval(script);
 return {dom,window,requests,document:window.document};
}
test("the second screenshot is THE ONLY wallpaper panel in a native chat",async()=>{
 assert.doesNotThrow(()=>new Function(script));
 assert.doesNotMatch(chat,/cmdWallpaperPanel=document\.createElement/);
 const {dom,document,window}=app(true);
 assert.equal(document.querySelectorAll("#cmdWallpaperPanel").length,1);
 assert.equal(document.querySelectorAll("#cmdPersonalBackgroundPanel").length,0);
 assert.equal(document.querySelectorAll("#channelToolSheet [data-cmd-background-tool]").length,0);
 assert.equal(document.querySelectorAll("#toolFiles").length,1);
 assert.equal(typeof window.cmdPersonalBackgrounds.open,"function");
 window.cmdPersonalBackgrounds.open();
 const panel=document.getElementById("cmdWallpaperPanel");
 assert.equal(panel.hidden,false);
 assert.equal(panel.querySelector("h3").textContent,"Fond de cette conversation");
 assert.equal(panel.querySelectorAll(".cmd-wallpaper-preset").length,7);
 assert.deepEqual([...panel.querySelectorAll("select option")].map(x=>x.value),["global","server"]);
 assert.equal(panel.querySelector("select").value,"server");
 assert.match(panel.textContent,/Importer mon image/);
 assert.match(panel.textContent,/Rétablir le fond par défaut/);
 await wait(); // allow initial async remote wallpaper load to finish before jsdom teardown
 dom.window.close();
});
test("wallpaper presets save to SERVER scope and reflect in conversation",async()=>{
 const {dom,document,window,requests}=app(true);
 window.cmdPersonalBackgrounds.open();
 const violet=[...document.querySelectorAll(".cmd-wallpaper-preset")].find(x=>x.textContent==="violet");
 violet.click();await wait();
 assert.ok(requests.some(x=>x.method==="PUT"&&x.url.includes("scope=server%3Asrv1")&&JSON.parse(x.body).image==="preset:violet"));
 assert.match(document.getElementById("channelMessages").style.backgroundImage,/gradient/);
 const mode=document.querySelector("#cmdWallpaperPanel select");mode.value="global";
 const ocean=[...document.querySelectorAll(".cmd-wallpaper-preset")].find(x=>x.textContent==="ocean");
 ocean.click();await wait();
 assert.ok(requests.some(x=>x.method==="PUT"&&x.url.includes("scope=global")&&JSON.parse(x.body).image==="preset:ocean"));
 dom.window.close();
});
test("private messages get only one unified launcher and main/global scope",async()=>{
 const {dom,window,document}=app(false);
 const grid=document.querySelector("#cmdDmToolSheet .compose-sheet-grid");
 assert.equal(grid.querySelectorAll("[data-cmd-background-tool]").length,1);
 window.cmdPersonalBackgrounds.open();
 const select=document.querySelector("#cmdWallpaperPanel select");
 assert.equal(select.value,"global");
 assert.equal(select.querySelector('option[value="server"]').disabled,true);
 await wait(); // allow initial async wallpaper load to settle
 dom.window.close();
});
test("PWA/app uses single synced wallpaper asset with no-store cache and validated preset API",()=>{
 assert.equal((server.match(/cmd-personal-backgrounds\.js\?v=/g)||[]).length,1);
 assert.match(server,/20261017-unified2/);
 assert.match(server,/const isPreset=\/\^preset:/);
 assert.match(server,/cmd-personal-backgrounds\.js"\)\{res\.writeHead\(200,[^\n]*"cache-control":"no-store"/);
 assert.match(chat,/window\.cmdPersonalBackgrounds\?\.open/);
 assert.doesNotMatch(script,/createElement\("div"\);panel\.id="cmdPersonalBackgroundPanel"/);
});
