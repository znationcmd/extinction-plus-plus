const test=require("node:test"),assert=require("node:assert/strict");
const {readFileSync}=require("node:fs"),{join}=require("node:path"),{JSDOM}=require("jsdom");
const base=join(__dirname,".."),read=p=>readFileSync(join(base,p),"utf8");
const cmdApp={id:"11111111-1111-4111-8111-111111111111",name:"CMD BOT ARK",description:"Gaming, ark et serveur",discord_client_id:"123456789012345678"};
const nativeApp={id:"22222222-2222-4222-8222-222222222222",name:"Utilitaire CMD",description:"Rappels, moderation et salons",discord_client_id:null};
async function fixture(){
 const dom=new JSDOM('<!doctype html><html><body><aside class="dev-sidebar"><button data-dev-tab="home">Applications</button></aside><main id="dev-content"></main></body></html>',{
  url:"https://cmd-sphere.up.railway.app/developers",runScripts:"outside-only"});
 const {window}=dom;
 const calls=[];
 window.fetch=async url=>{
   const loc=new URL(url,window.location.origin);calls.push(loc.pathname+loc.search);
   const params=loc.searchParams;
   if(loc.hostname==="discord.bots.gg")return {ok:true,json:async()=>({count:53,bots:[{userId:"123456789012345678",clientId:"123456789012345678",username:"CMD BOT ARK",shortDescription:"Gaming Ark",guildCount:100},{userId:"888888888888888888",clientId:"888888888888888888",username:"Other Discord Bot",shortDescription:"Moderation",guildCount:500}]})};
   const apps=params.has("discordClientId")?(params.get("discordClientId")==="123456789012345678"?[cmdApp]:[]):[cmdApp,nativeApp];
   return {ok:true,json:async()=>({apps})};
 };
 window.eval(read("cmd-bot-dual-catalogue.js"));
 window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
 const open=window.document.querySelector("#cmd-dual-bot-catalogue-nav");
 assert.ok(open,"new catalogue navigation is registered");
 open.click();
 await new Promise(resolve=>setTimeout(resolve,15));
 return {window,calls,dom};
}
test("portal loads catalog from already served assets with cache busting",()=>{
 const page=read("cmd-developer-portal-page.js"),css=read("cmd-developer-portal.css"),js=read("cmd-developer-portal-client.js");
 assert.match(page,/cmd-developer-portal-client\.js\?v=20261019-3/);
 assert.match(page,/cmd-developer-portal\.css\?v=20261019-2/);
 assert.ok(!page.includes('src="/cmd-bot-dual-catalogue.js'),"no unserved independent script route");
 assert.match(css,/#cmd-dual-bot-catalogue/);
 assert.match(js,/cmd-dual-bot-catalogue-nav/);
});
test("CMD Sphere tab lists installed-capable CMD apps with permissioned invitations",async()=>{
 const {window,calls}=await fixture();const root=window.document.getElementById("cmd-dual-bot-catalogue");
 assert.ok(root);assert.equal(root.querySelector("#cat-tab-cmd").getAttribute("aria-selected"),"true");
 const links=[...root.querySelectorAll('.cat-card a[href^="/apps/invite"]')];
 assert.equal(links.length,2);
 assert.ok(links.some(a=>a.getAttribute("href").includes(cmdApp.id)));
 assert.ok(calls.includes("/api/cmd-apps/catalog"));
 window.close();
});
test("Discord tab does not pretend all Discord bots are CMD compatible",async()=>{
 const {window}=await fixture();const root=window.document.getElementById("cmd-dual-bot-catalogue");
 root.querySelector("#cat-tab-discord").click();
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.equal(root.querySelector("#cat-tab-discord").getAttribute("aria-selected"),"true");
 assert.equal(root.querySelectorAll("#cat-list .cat-card").length,1,"only CMD-linked Discord apps appear in CMD-compatible subsection");
 assert.equal(root.querySelectorAll("#cat-external-grid .cat-card").length,2,"real public Discord bots displayed");
 assert.equal(root.querySelectorAll("#cat-external-grid a[href^='/apps/invite']").length,1,"only linked bot can be invited to CMD");
 assert.match(root.querySelector("#cat-external-summary").textContent,/53 bots Discord/);
 assert.match(root.textContent,/Annuaire officiel Discord/i);
 const hrefs=[...root.querySelectorAll(".cat-source-list a")].map(x=>x.href);
 assert.ok(hrefs.some(x=>x.includes("discord.com/application-directory")));
 assert.ok(hrefs.some(x=>x.includes("discord.bots.gg/search")));
 assert.ok(hrefs.some(x=>x.includes("top.gg/search")));
 window.close();
});
test("search and category filters work without exposing unlisted bots",async()=>{
 const {window}=await fixture(),root=window.document.getElementById("cmd-dual-bot-catalogue");
 const q=root.querySelector("#cat-search");q.value="ark";q.dispatchEvent(new window.Event("input",{bubbles:true}));
 assert.equal(root.querySelectorAll(".cat-card").length,1);
 q.value="unknown bot";q.dispatchEvent(new window.Event("input",{bubbles:true}));
 assert.equal(root.querySelectorAll(".cat-card").length,0);
 window.close();
});
test("Discord Client ID lookup finds existing CMD version but does not invent an install",async()=>{
 const {window,calls}=await fixture(),root=window.document.getElementById("cmd-dual-bot-catalogue");
 root.querySelector("#cat-tab-discord").click();
 const field=root.querySelector("#cat-discord-id");field.value="123456789012345678";
 root.querySelector("#cat-id-form").dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.match(root.querySelector("#cat-id-result").textContent,/version\(s\) CMD enregistrée/);
 assert.ok(root.querySelector("#cat-id-result a[href^='/apps/invite']"));
 assert.ok(calls.some(x=>x.includes("discordClientId=123456789012345678")));
 field.value="123456789012345679";
 root.querySelector("#cat-id-form").dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.match(root.querySelector("#cat-id-result").textContent,/Aucune version CMD Sphere enregistrée/);
 assert.equal(root.querySelectorAll("#cat-id-result a").length,0);
 window.close();
});


test("public Discord catalogue pages are fetched separately and do not auto-install third-party bots",async()=>{
 const {window,calls}=await fixture(),root=window.document.getElementById("cmd-dual-bot-catalogue");
 root.querySelector("#cat-tab-discord").click();
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.ok(calls.some(x=>x.startsWith("/api/v1/bots?page=0&limit=24")));
 assert.ok(root.querySelector('#cat-external-grid a[href="https://discord.bots.gg/bots/888888888888888888"]'));
 root.querySelector("#cat-external-next").click();
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.ok(calls.some(x=>x.startsWith("/api/v1/bots?page=1&limit=24")));
 assert.match(root.querySelector("#cat-external-summary").textContent,/Page 2/);
 window.close();
});
