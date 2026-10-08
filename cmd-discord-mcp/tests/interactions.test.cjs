const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(process.env.CMD_TEST_SERVER||require('node:path').join(__dirname,'../server.js'),'utf8');
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pageFn=source.slice(source.indexOf('function dashboardPage('),source.indexOf('\nfunction bearerAuth('));
const renderer=vm.runInNewContext(pageFn+';dashboardPage',{escHtml:escape});
const guild={id:'local-guild',name:'CMD Test',owner_user_id:'test-user',source_discord_id:'1513783303285637181'};
const channels=[{id:'category',source_channel_id:'1513783303285637182',name:'Informations',type:'category'},{id:'room',source_channel_id:'1513783303285637183',source_parent_id:'1513783303285637182',name:'général "CMD"',type:'text'},{id:'orphan',source_parent_id:'missing',name:'Salon conservé',type:'text'}];
const detail={guild,channels,roles:[],member:{membership_role:'owner',user_id:'test-user'},inviteUrl:'https://example.test/invite/test'};
const auth={user:{id:'test-user',name:'CMD Test'},guildIds:[]};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const requests=[],timers=[],errors=[],observers=[];
 const dom=new JSDOM(renderer(auth,[guild]),{url:'https://example.test/dashboard',runScripts:'dangerously',beforeParse(w){
  const MO=w.MutationObserver;w.MutationObserver=class extends MO{constructor(cb){super(cb);observers.push(this)}};w.HTMLElement.prototype.scrollIntoView=()=>{};w.setInterval=()=>0;w.setTimeout=(f,ms)=>{timers.push({f,ms});return timers.length};w.clearTimeout=()=>{};
  w.requestAnimationFrame=f=>f();w.alert=()=>{};w.confirm=()=>false;w.CSS={escape:v=>String(v)};
  w.fetch=async(url,opts={})=>{requests.push({url:String(url),opts});const path=String(url).split('?')[0];
   const data=path==='/api/native/guild/local-guild'?detail:path==='/api/native/guilds'?{guilds:[guild]}:path==='/api/profile'?{profile:{presenceMode:'invisible'}}:path==='/api/native/messages'?{messages:[],hasMore:false}:path==='/api/dashboard/guilds'?{guilds:[]}:path==='/api/folders'?{folders:[]}:path==='/api/server-layout'?{itemKeys:[]}:{};
   return {ok:true,json:async()=>data};
  };
  w.addEventListener('error',e=>errors.push(e.error||e.message));
 }});
 return {dom,w:dom.window,requests,timers,errors,close(){observers.forEach(o=>o.disconnect());dom.window.close()}};
}
test('Discord channel names containing quotes open through a bound click handler',async()=>{
 const x=setup();try{await tick();x.w.eval('S.guild={id:"1513783303285637181"}; S.bot="dayz"; S.structure='+JSON.stringify({channels:[{id:'1513783303285637183',name:'général "CMD" <test>',type:'text'}],roles:[]})+'; render();');
 const b=x.w.document.querySelector('[data-discord-channel]');assert.ok(b);assert.equal(b.getAttribute('onclick'),null);b.click();await tick();assert.equal(x.w.document.querySelector('#channelTitle').textContent,'# général "CMD" <test>');assert.equal(x.w.document.querySelector('#channelOverlay').classList.contains('on'),true);assert.deepEqual(x.errors,[]);
 }finally{x.close()}
});
test('Reply buttons preserve author and message quotes without inline JavaScript',async()=>{
 const x=setup();try{await tick();const m={id:'1513783303285637199',content:'Salut "CMD" <test>',author:{username:'Derek "CMD"'},timestamp:'2026-10-08T07:00:00Z'};
 x.w.eval('CHAT.messages='+JSON.stringify([m])+';renderChannelMessages();');const b=x.w.document.querySelector('[data-reply-message]');assert.equal(b.getAttribute('onclick'),null);b.click();assert.match(x.w.document.querySelector('#replyText').textContent,/Derek "CMD"/);assert.equal(x.w.eval('CHAT.replyTo'),m.id);assert.deepEqual(x.errors,[]);
 }finally{x.close()}
});
test('Native server keeps orphaned rooms visible and offers working channel settings',async()=>{
 const x=setup();try{await tick();await x.w.selectNative(guild);x.w.eval(fs.readFileSync(require('node:path').join(__dirname,'../cmd-server-manager.js'),'utf8'));
 assert.ok(x.w.document.querySelector('[data-native-channel="orphan"]'));assert.ok(x.w.document.querySelector('[data-csm-open-settings]'));const gear=x.w.document.querySelector('[data-csm-channel-settings="room"]');assert.ok(gear);gear.click();await tick();await tick();assert.ok(x.w.document.querySelector('#csm-channel-form'));assert.equal(x.w.document.querySelector('#csm-channel-form input[name="name"]').value,'général "CMD"');assert.equal(x.requests.filter(r=>r.opts.method==='POST').length,0);assert.deepEqual(x.errors,[]);
 }finally{await tick();x.close()}
});
test('Long press opens exactly four statuses and suppresses the following short click',async()=>{
 const x=setup();try{await tick();const el=x.w.document.querySelector('#dockProfileMain');assert.equal(el.getAttribute('role'),'button');const down=new x.w.Event('pointerdown');Object.assign(down,{pointerType:'touch',clientX:10,clientY:10});el.dispatchEvent(down);const hold=x.timers.find(t=>t.ms===550);assert.ok(hold);hold.f();await tick();assert.equal(x.w.document.querySelector('#dockPresenceSheet').classList.contains('on'),true);assert.equal(x.w.document.querySelectorAll('[data-presence-mode]').length,4);assert.deepEqual([...x.w.document.querySelectorAll('[data-presence-mode]')].map(x=>x.dataset.presenceMode),['online','idle','dnd','invisible']);el.click();assert.equal(x.w.document.querySelector('#dockPresenceSheet').classList.contains('on'),true);assert.equal(x.requests.filter(r=>r.opts.method==='POST').length,0);
 }finally{x.close()}
});
const mutationFn=source.slice(source.indexOf('async function applyNativeStructureAction('),source.indexOf('\nasync function updateNativeProfile('));
function mutationHarness({failWrite=false,failSync=false}={}){
 const calls=[];const ctx={requireNativeAdmin:async()=>{},pool:{query:async()=>({rows:[{source_discord_id:guild.source_discord_id}]})},resolveBot:async()=> 'dayz',nativeSourceId:async(g,k,id)=>'remote-'+id,bots:{dayz:{label:'DAYZ GATE'}},backend:async()=>{calls.push('write');if(failWrite)throw Error('Discord refused')},syncNativeFromDiscord:async()=>{calls.push('sync');if(failSync)throw Error('refresh failed')},applyNativeLocalAction:async()=>{calls.push('local');return {ok:true}}};
 const fn=vm.runInNewContext(mutationFn+';applyNativeStructureAction',ctx);return {fn,calls};
}
test('Failed Discord write never silently mutates the local copy',async()=>{const x=mutationHarness({failWrite:true});await assert.rejects(x.fn(auth,{nativeGuildId:guild.id,action:'create_channel'}),/Discord refused/);assert.deepEqual(x.calls,['write'])});
test('Failed refresh after a successful Discord write never duplicates the action locally',async()=>{const x=mutationHarness({failSync:true});const r=await x.fn(auth,{nativeGuildId:guild.id,action:'create_channel'});assert.equal(r.remoteApplied,true);assert.equal(r.synced,false);assert.match(r.warning,/refresh failed/);assert.deepEqual(x.calls,['write','sync'])});

test('Switching channels ignores a slow response from the previous channel',async()=>{
 const x=setup();try{await tick();x.w.eval('S.guild={id:"1513783303285637181"};S.bot="dayz";');
 let resolveOld;x.w.fetch=async url=>({ok:true,json:async()=>String(url).includes('channelId=old')?await new Promise(r=>resolveOld=r):{messages:[{id:'new-message',content:'Nouveau salon',author:{username:'CMD'},timestamp:'2026-10-08T07:00:00Z'}],hasMore:false}});
 const first=x.w.openDiscordChannel('old','ancien');await tick();await x.w.openDiscordChannel('new','nouveau');resolveOld({messages:[{id:'old-message',content:'Ancien salon',author:{username:'CMD'}}],hasMore:false});await first;assert.equal(x.w.eval('CHAT.channelId'),'new');assert.deepEqual(Array.from(x.w.eval('CHAT.messages'),m=>m.id),['new-message']);assert.match(x.w.document.querySelector('#channelMessages').textContent,/Nouveau salon/);assert.doesNotMatch(x.w.document.querySelector('#channelMessages').textContent,/Ancien salon/);
 }finally{x.close()}
});
test('Recovered or edited content refreshes even when the message count stays the same',async()=>{
 const x=setup();try{await tick();const msg={id:'1513783303285637199',content:'',author:{username:'CMD'},timestamp:'2026-10-08T07:00:00Z'};
 x.w.eval('CHAT.open=true;CHAT.version=1;CHAT.mode="discord";CHAT.guildId="1513783303285637181";CHAT.channelId="1513783303285637183";CHAT.messages='+JSON.stringify([msg])+';renderChannelMessages();');
 x.w.fetch=async()=>({ok:true,json:async()=>({messages:[{...msg,content:'Texte accessible'}]})});await x.w.refreshDiscordMessages();assert.match(x.w.document.querySelector('#channelMessages').textContent,/Texte accessible/);
 }finally{x.close()}
});
