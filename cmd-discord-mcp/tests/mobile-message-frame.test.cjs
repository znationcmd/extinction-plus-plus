const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");
const script=fs.readFileSync(path.join(__dirname,"../cmd-conversation-frames.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../discord-native-layout.css"),"utf8");
function app(frame="amethyst"){
 const dom=new JSDOM('<!doctype html><html><body><section id="channelOverlay" class="channel-overlay on"><header class="channel-head"></header><div id="channelMessages"><article class="discord-message cmd-own-message" data-cmd-source="cmd"><div class="msg-avatar"></div><div class="msg-main" id="own"><div class="msg-text">Test</div></div></article><article class="discord-message" data-cmd-source="cmd"><div class="msg-main" id="other">Autre</div></article></div><div class="channel-compose-wrap"><form class="channel-composer"><button id="channelPlus">+</button><textarea id="channelInput"></textarea><button id="channelSend">Envoyer</button></form></div><div id="channelToolSheet"><div class="compose-sheet-grid"></div></div></section></body></html>',{url:"https://cmd-sphere.up.railway.app/dashboard",runScripts:"outside-only",pretendToBeVisual:true});
 const win=dom.window;
 win.MutationObserver=class {observe(){} disconnect(){}}; // static DOM unit test, no post-teardown paint callbacks
 win.fetch=async(input)=>({ok:true,json:async()=>({profile:{profileFrame:frame}})});
 win.eval(script);
 return {dom,window:win,document:win.document};
}
const tick=()=>new Promise(done=>setTimeout(done,30));
test("frame module parses: the old invalid wallpaper regex no longer breaks all message frames",()=>{
 assert.doesNotThrow(()=>new Function(script));
 assert.doesNotMatch(script,/location\.pathname\.match\(/);
 assert.doesNotMatch(script,/cmdWallpaperClear|cmdWallpaperFile|cmdWallpaperScope/);
});
test("the selected account message frame is applied in the foreground to OWN messages only",async()=>{
 const {dom,document}=app();
 await tick();
 const own=document.getElementById("own"),other=document.getElementById("other");
 assert.equal(own.classList.contains("cmd-chat-framed"),true);
 assert.match(own.style.getPropertyValue("--cmd-chat-border-image"),/amethyst\.svg/);
 assert.equal(other.classList.contains("cmd-chat-framed"),false);
 assert.ok(document.querySelector("#cmdChatFramePicker"));
 assert.equal(document.querySelector("#cmdChatFramePicker").value,"amethyst");
 assert.match(document.querySelector("style").textContent,/msg-main\.cmd-chat-framed\.cmd-equipped-profile-frame::after/);
 assert.equal(document.querySelectorAll(".cmd-wallpaper-picker").length,0);
 dom.window.close();
});
test("an explicit 'Aucun cadre' setting remains respected",async()=>{
 // Simulate an existing explicit None choice before module initialization.
 const third=new JSDOM('<!doctype html><html><body><div id="channelMessages"><article class="discord-message cmd-own-message" data-cmd-source="cmd"><div class="msg-main" id="bubble">Test</div></article></div><div id="channelToolSheet"><div class="compose-sheet-grid"></div></div></body></html>',{url:"https://cmd-sphere.up.railway.app/dashboard",runScripts:"outside-only",pretendToBeVisual:true});
 third.window.localStorage.setItem("cmd:chat-border:server","none");
 third.window.MutationObserver=class {observe(){} disconnect(){}};
 third.window.fetch=async()=>({ok:true,json:async()=>({profile:{profileFrame:"amethyst"}})});
 third.window.eval(script);
 await tick();
 assert.equal(third.window.document.getElementById("bubble").classList.contains("cmd-chat-framed"),false);
 third.window.close();
});
test("iPhone composer retains framed textarea and practical send controls",()=>{
 assert.match(css,/restore premium message-composer FRAME/);
 assert.match(css,/cmd-chat-mobile-portal #channelOverlay\.on \.channel-composer textarea/);
 assert.match(css,/#channelSend/);
 assert.match(css,/\.send-note/);
 assert.match(css,/safe-area-inset-bottom/);
});


test("long messages use one nine-slice SVG border instead of stretching crystal art across the text",async()=>{
 const {dom,document,window}=app("amethyst");
 const own=document.getElementById("own");
 own.querySelector(".msg-text").textContent="Message long ".repeat(80);
 await tick();
 assert.equal(own.classList.contains("cmd-chat-framed"),true);
 const style=[...document.querySelectorAll("style")].map(n=>n.textContent).join("\n");
 assert.match(style,/border-image-slice:105 122 105 122!important/);
 assert.match(style,/background-image:none!important/);
 assert.match(style,/--cmd-frame-clear-x/);
 assert.match(style,/--cmd-frame-clear-y/);
 assert.doesNotMatch(style,/background-size:100% 100%/);
 assert.equal(own.dataset.cmdFrameSelected,"amethyst");
 assert.equal(document.querySelectorAll("#channelMessages .msg-main.cmd-chat-framed").length,1);
 dom.window.close();
});
