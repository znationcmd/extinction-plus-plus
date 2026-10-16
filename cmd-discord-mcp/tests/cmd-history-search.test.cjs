const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const mod=import(pathToFileURL(path.join(__dirname,'..','cmd-message-history-search.js')).href);
const guild='11111111-1111-4111-8111-111111111111';
const channel='22222222-2222-4222-8222-222222222222';
const thread='33333333-3333-4333-8333-333333333333';
const group='44444444-4444-4444-8444-444444444444';
const parse=(qs)=>new URL('https://example.test/api/cmd/messages/history-search?'+qs);
test('validates scopes, dates, identifiers and message length',async()=>{
 const {cmdHistoryParameters}=await mod;
 assert.equal(cmdHistoryParameters(parse('scope=server&guildId='+guild+'&channelId='+channel+'&q=salut')).scope,'server');
 assert.equal(cmdHistoryParameters(parse('scope=dm&threadId='+thread+'&q=salut')).scope,'dm');
 assert.equal(cmdHistoryParameters(parse('scope=group&groupId='+group+'&q=salut')).scope,'group');
 for(const query of ['scope=server&q=x','scope=dm&threadId=abc&q=test','scope=group&groupId='+group+'&q=x','scope=dm&threadId='+thread+'&q=hello&after=not-a-date','scope=dm&threadId='+thread+'&q=hello&after=2026-12-01&before=2026-10-01']){
  assert.throws(()=>cmdHistoryParameters(parse(query)));
 }
});
test('server search denies non-members before querying messages',async()=>{
 const {searchCmdHistory,cmdHistoryParameters}=await mod;
 const queries=[];
 const pool={query:async(sql,params)=>{queries.push({sql,params});return {rows:[]}}};
 const p=cmdHistoryParameters(parse('scope=server&guildId='+guild+'&channelId='+channel+'&q=test'));
 await assert.rejects(searchCmdHistory(pool,{user:{id:'test-user'}},p,{checkGuildPermissions:async()=>({viewChannels:true,readHistory:true})}),e=>e.status===403);
 assert.equal(queries.length,1);
 assert.match(queries[0].sql,/cmd_native_members/);
});
test('member needs guild read rights and cannot search channels with unverified overrides',async()=>{
 const {searchCmdHistory,cmdHistoryParameters}=await mod;
 const p=cmdHistoryParameters(parse('scope=server&guildId='+guild+'&channelId='+channel+'&q=test'));
 const mk=(overwrites)=>({query:async sql=>{
  if(sql.includes('SELECT membership_role'))return {rows:[{membership_role:'member'}]};
  if(sql.includes('SELECT c.id::text'))return {rows:[{id:channel,type:'text',permission_overwrites:overwrites,parent_overwrites:[]}]};
  throw Error('Message query should not run');
 }});
 await assert.rejects(searchCmdHistory(mk([]),{user:{id:'u1'}},p,{checkGuildPermissions:async()=>({viewChannels:false,readHistory:true})}),e=>e.status===403);
 await assert.rejects(searchCmdHistory(mk([{id:'private'}]),{user:{id:'u1'}},p,{checkGuildPermissions:async()=>({viewChannels:true,readHistory:true})}),e=>e.status===403);
});
test('native guild SQL binds guild and authorized channel; DM and group queries isolate members',async()=>{
 const {searchCmdHistory,cmdHistoryParameters}=await mod;
 const q=[];
 const pool={query:async(sql,params)=>{q.push({sql,params});
  if(sql.includes('SELECT membership_role'))return {rows:[{membership_role:'owner'}]};
  if(sql.includes('SELECT c.id::text'))return {rows:[{id:channel,type:'text',permission_overwrites:[],parent_overwrites:[]}]};
  return {rows:[{id:'msg',content:'bonjour'}]};
 }};
 const user={user:{id:'member'}};
 const server=await searchCmdHistory(pool,user,cmdHistoryParameters(parse('scope=server&guildId='+guild+'&channelId='+channel+'&q=bonjour')));
 assert.equal(server.results[0].content,'bonjour');
 assert.match(q[2].sql,/m.guild_id=\$8::uuid/);
 assert.equal(q[2].params[7],guild);
 assert.equal(q[2].params[2],channel);
 const dm=await searchCmdHistory(pool,user,cmdHistoryParameters(parse('scope=dm&threadId='+thread+'&q=bonjour')));
 assert.match(q[3].sql,/t.user_low=\$1 OR t.user_high=\$1/);
 assert.equal(q[3].params.length,7);
 assert.equal(dm.results.length,1);
 const g=await searchCmdHistory(pool,user,cmdHistoryParameters(parse('scope=group&groupId='+group+'&q=bonjour')));
 assert.match(q[4].sql,/EXISTS \(SELECT 1 FROM cmd_group_dm_members/);
 assert.equal(q[4].params.length,7);
 assert.equal(g.results.length,1);
});
