const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");

const script=fs.readFileSync(path.join(__dirname,"../cmd-chat-polish.js"),"utf8");
const marker="/* CMD Sphere iPhone chat restoration 2026-10-17.";
const i=script.indexOf(marker);
const portalCode=script.slice(i);
const css=fs.readFileSync(path.join(__dirname,"../discord-native-layout.css"),"utf8");

function setup(isMobile=true){
 const dom=new JSDOM('<!doctype html><html><body><div class="sphere-app cmd-native-selected"><nav id="cmdServerChannels"></nav><section id="channelOverlay" class="channel-overlay"><header class="channel-head"><button class="channel-back">Retour</button><b id="channelTitle"># général</b></header><div id="channelMessages">Messages existants</div><form class="channel-composer"><textarea id="channelInput"></textarea></form></section><footer id="after">Liste salons</footer></div></body></html>',{url:"https://cmd-sphere.up.railway.app/dashboard",runScripts:"outside-only"});
 dom.window.matchMedia=()=>({matches:isMobile,addListener(){},removeListener(){}});
 dom.window.eval(portalCode);
 dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
 return {dom,window:dom.window,document:dom.window.document,overlay:dom.window.document.getElementById("channelOverlay")};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test("iPhone tap opens exactly the existing messages full-screen and back restores the list",async()=>{
 assert.notEqual(i,-1);
 const {dom,document,overlay}=setup(true);
 const initialParent=overlay.parentNode;
 const input=document.getElementById("channelInput");
 const messages=document.getElementById("channelMessages");
 overlay.classList.add("on");
 await tick();
 const portal=overlay.parentElement;
 assert.equal(portal.classList.contains("cmd-chat-mobile-portal"),true);
 assert.equal(portal.parentElement,document.body);
 assert.equal(portal.classList.contains("cmd-native-selected"),true);
 assert.equal(portal.hidden,false);
 assert.equal(document.documentElement.classList.contains("cmd-channel-screen-open"),true);
 assert.equal(overlay.contains(messages),true);
 assert.equal(overlay.contains(input),true);
 assert.equal(document.getElementById("after").parentNode,initialParent);
 overlay.classList.remove("on");
 await tick();
 assert.equal(overlay.parentNode,initialParent);
 assert.equal(document.getElementById("after").previousElementSibling,overlay);
 assert.equal(portal.hidden,true);
 assert.equal(document.documentElement.classList.contains("cmd-channel-screen-open"),false);
 dom.window.close();
});

test("desktop does not move original conversation node",async()=>{
 const {dom,document,overlay}=setup(false);
 const original=overlay.parentNode;
 overlay.classList.add("on");await tick();
 assert.equal(overlay.parentNode,original);
 assert.equal(document.documentElement.classList.contains("cmd-channel-screen-open"),false);
 dom.window.close();
});

test("CSS prioritizes messages + composer and hides server list behind phone chat",()=>{
 assert.ok(css.includes(".sphere-app.cmd-chat-mobile-portal #channelOverlay.on"));
 assert.ok(css.includes("grid-template-rows:auto minmax(0,1fr) auto!important"));
 assert.ok(css.includes("body>.sphere-app.cmd-chat-mobile-portal[hidden]"));
 assert.ok(css.includes("#channelMessages"));
 assert.ok(css.includes(".channel-compose-wrap"));
});
