import {test,expect,afterEach} from "bun:test";
import {runInNewContext,Script} from "node:vm";
import {Window} from "happy-dom";
import {NEURIA_SWIPE_NEW_CHAT_CLIENT} from "./neuria-swipe-new-chat.ts";
const windows:Window[]=[];
async function setup(){
 const window=new Window({url:"https://neuria.test"});
 windows.push(window);
 const doc=window.document;
 doc.body.innerHTML='<aside id="neuriaMenu"><div id="chatList"></div><button id="newChat">Nouveau</button><button id="closeMenu">Fermer</button></aside><main><section id="feed" role="log"><article class="bubble me">Ma première question</article><article class="bubble bot">Une réponse sauvegardée</article></section><form><input id="message"></form></main>';
 const feed=doc.getElementById("feed")!;
 Object.defineProperties(feed,{scrollHeight:{configurable:true,value:1000},clientHeight:{configurable:true,value:300},scrollTop:{configurable:true,writable:true,value:700}});
 const context={window,document:doc,localStorage:window.localStorage,MutationObserver:window.MutationObserver,Event:window.Event,CustomEvent:window.CustomEvent,setTimeout,clearTimeout,confirm:()=>true,prompt:()=>null};
 // Use the same code that creates chats in production, not a dummy click handler.
 const index=await Bun.file(import.meta.dir+"/index.ts").text();
 const raw=index.match(/^const NEURIA_NAV=(.*);$/m)?.[1];
 if(!raw)throw Error("Conversation manager is missing");
 const nav=runInNewContext(raw,context);
 runInNewContext(nav,context);
 runInNewContext(NEURIA_SWIPE_NEW_CHAT_CLIENT,context);
 function swipe(upward=true){
  const start=new window.Event("touchstart",{bubbles:true});
  Object.defineProperty(start,"touches",{value:[{clientY:250,clientX:120}]});
  feed.dispatchEvent(start);
  const end=new window.Event("touchend",{bubbles:true});
  Object.defineProperty(end,"changedTouches",{value:[{clientY:upward?148:315,clientX:120}]});
  feed.dispatchEvent(end);
 }
 return {window,doc,feed,swipe};
}
afterEach(async()=>{for(const win of windows.splice(0))await win.happyDOM.close()});
test("new chat gesture code parses and keeps current chat until confirmation",async()=>{
 expect(()=>new Script(NEURIA_SWIPE_NEW_CHAT_CLIENT)).not.toThrow();
 const {doc,swipe}=await setup();
 const panel=doc.getElementById("neuria-swipe-new-chat")!;
 expect(panel.hasAttribute("hidden")).toBe(true);
 swipe();
 expect(panel.hidden).toBe(false);
 expect(doc.querySelectorAll("#feed > .bubble").length).toBe(2);
 expect(JSON.parse(doc.defaultView!.localStorage.getItem("cmd-neuria-chats-v2")!).length).toBe(1);
 doc.getElementById("neuria-swipe-new-chat-trigger")!.click();
 const chats=JSON.parse(doc.defaultView!.localStorage.getItem("cmd-neuria-chats-v2")!);
 expect(chats.length).toBe(2);
 expect(chats[1].items.map((x:any)=>x.text)).toContain("Ma première question");
 expect(doc.querySelectorAll("#feed > .bubble").length).toBe(0);
 expect(panel.hidden).toBe(true);
});
test("gesture only activates upward near bottom, and respects opt-out",async()=>{
 const {doc,feed,swipe}=await setup();
 const panel=doc.getElementById("neuria-swipe-new-chat")!;
 swipe(false);expect(panel.hidden).toBe(true);
 feed.scrollTop=350;swipe();expect(panel.hidden).toBe(true);
 feed.scrollTop=700;
 const setting=doc.querySelector("#neuria-swipe-new-chat-settings input") as HTMLInputElement;
 setting.checked=false;setting.dispatchEvent(new doc.defaultView!.Event("change"));
 swipe();expect(panel.hidden).toBe(true);
 expect(doc.defaultView!.localStorage.getItem("neuria-swipe-up-new-chat-v1")).toBe("off");
 setting.checked=true;setting.dispatchEvent(new doc.defaultView!.Event("change"));
 swipe();expect(panel.hidden).toBe(false);
 doc.querySelector(".neuria-swipe-dismiss")!.click();expect(panel.hidden).toBe(true);
});
test("assistant reply to the previous chat stays in its saved thread after new chat",async()=>{
 const {doc,swipe,window}=await setup();
 const original=window.neuriaGetActiveChatId();
 swipe();doc.getElementById("neuria-swipe-new-chat-trigger")!.click();
 expect(window.neuriaGetActiveChatId()).not.toBe(original);
 doc.dispatchEvent(new window.CustomEvent("neuria:background-reply",{detail:{chatId:original,text:"Réponse terminée pendant le changement",meta:{provider:"google"}}}));
 const chats=JSON.parse(window.localStorage.getItem("cmd-neuria-chats-v2")!);
 const initial=chats.find((c:any)=>c.id===original);
 expect(initial.items.at(-1).text).toBe("Réponse terminée pendant le changement");
 expect(doc.querySelector("#feed")!.textContent).not.toContain("Réponse terminée pendant le changement");
});
