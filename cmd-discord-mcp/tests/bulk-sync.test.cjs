const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');const fs=require('node:fs');const path=require('node:path');
test('One click starts all-server sync and waits for history before announcing completion',async()=>{
 let phase=0;const writes=[];
 const dom=new JSDOM('<aside class="server-rail"></aside><button id="syncDiscordBtn"></button>',{url:'https://sphere.example/dashboard',runScripts:'dangerously'}),w=dom.window;
 w.setTimeout=()=>1;w.clearTimeout=()=>{};
 w.fetch=async(url,options={})=>{
  if(options.method==='POST')writes.push({url,body:options.body});
  const data=url==='/api/discord/sync'?{job:{id:'s'}}:url==='/api/discord/sync-job'?{job:{status:'complete',progress:{full:2,total:2,index:2},summary:{mirrorJob:'m'}}}:{job:{status:phase?'complete':'running',progress:{guildIndex:1,guildCount:2,messages:100},summary:phase?{bots:4,webhooks:6,messages:250,errors:[]}:{} }};
  return {ok:true,json:async()=>data};
 };
 w.eval(fs.readFileSync(path.join(__dirname,'../bulk-sync.js'),'utf8'));
 await w.cmdSphereBulkSync.start();
 assert.equal(writes.length,1);assert.equal(writes[0].url,'/api/discord/sync');
 assert.match(w.document.querySelector('[data-progress]').textContent,/2\/2/);assert.doesNotMatch(w.document.querySelector('[data-progress]').textContent,/Synchronisation terminée/);
 phase=1;await w.cmdSphereBulkSync.open();
 assert.match(w.document.querySelector('[data-progress]').textContent,/Synchronisation terminée/);assert.match(w.document.querySelector('[data-progress]').textContent,/6 webhooks/);assert.match(w.document.querySelector('[data-progress]').textContent,/250 messages/);assert.equal(writes.length,1);dom.window.close();
});
test('Partial permissions produce a qualified completion with errors',async()=>{
 const dom=new JSDOM('<aside class="server-rail"></aside>',{url:'https://sphere.example/dashboard',runScripts:'dangerously'}),w=dom.window;
 w.fetch=async url=>({ok:true,json:async()=>url==='/api/discord/sync-job'?{job:{status:'complete',summary:{mirrorJob:'m'},progress:{}}}:{job:{status:'complete',summary:{errors:[{guildName:'CMD',error:'Permission refusée'}],shellGuilds:1}}}});
 w.eval(fs.readFileSync(path.join(__dirname,'../bulk-sync.js'),'utf8'));await w.cmdSphereBulkSync.open();assert.match(w.document.querySelector('[data-progress]').textContent,/Terminé avec des éléments inaccessibles/);assert.match(w.document.querySelector('[data-progress]').textContent,/Permission refusée/);dom.window.close();
});
