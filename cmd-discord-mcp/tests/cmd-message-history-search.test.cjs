const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const modulePromise=import(pathToFileURL(path.join(__dirname,'..','cmd-message-history-search.js')).href);
const GUILD='2d41a376-87b3-4c72-9b15-1089c181b308',CHANNEL='1c751631-81dc-4b2a-a841-bf1e20e4c17c',THREAD='f32b6017-1b2e-4c3e-8b10-5352e9e5460e',GROUP='a66248bd-87e4-410f-baa6-506810150f8f';
const auth={user:{id:'user-1'}};
const query=(scope,extra={})=>new URL('https://cmd.test/api/cmd/messages/history-search?'+new URLSearchParams({scope,q:'message',guildId:GUILD,channelId:CHANNEL,threadId:THREAD,groupId:GROUP,...extra}));
function fakePool(member='member',overwrites=[],parent=[],messages=[{id:'m1',content:'message autorisé'}]){
 const calls=[];
 return {calls,async query(sql,args){
  calls.push({sql,args});
  if(sql.includes('SELECT membership_role FROM cmd_native_members'))return {rows:member?[{membership_role:member}]:[]};
  if(sql.includes('SELECT c.id::text AS id,c.name'))return {rows:[{id:CHANNEL,name:'général',type:'text',permission_overwrites:overwrites,parent_overwrites:parent}]};
  if(sql.includes('SELECT m.id::text'))return {rows:messages};
  throw Error('Unexpected query: '+sql.slice(0,100));
 }};
}
test('history route validates identity, length, filters and date bounds',async()=>{
 const {cmdHistoryParameters:p}=await modulePromise;
 assert.equal(p(query('server')).guildId,GUILD);
 assert.equal(p(query('group')).groupId,GROUP);
 assert.equal(p(query('dm')).threadId,THREAD);
 assert.equal(p(query('server',{q:'  ab  '})).q,'ab');
});
test('empty, invalid, and inverted searches fail before hitting DB',async()=>{
 const {cmdHistoryParameters:p}=await modulePromise;
 assert.throws(()=>p(query('server',{q:'a'})),/2 à 120/);
 assert.throws(()=>p(query('invalid')),/inconnu/);
 assert.throws(()=>p(query('server',{guildId:'malformed'})),/invalide/);
 assert.throws(()=>p(query('server',{after:'2026-10-20',before:'2026-10-16'})),/inversée/);
 assert.throws(()=>p(query('dm',{threadId:'notuuid'})),/invalide/);
});
test('membership and role permissions block unauthorized server searches',async()=>{
 const {cmdHistoryParameters:p,searchCmdHistory:s}=await modulePromise;
 const args=p(query('server'));
 const outsider=fakePool(null);
 await assert.rejects(s(outsider,auth,args,{checkGuildPermissions:async()=>({viewChannels:true,readHistory:true})}),e=>e.status===403);
 assert.equal(outsider.calls.length,1);
 const member=fakePool();
 await assert.rejects(s(member,auth,args),e=>e.status===403);
 const denied=fakePool();
 await assert.rejects(s(denied,auth,args,{checkGuildPermissions:async()=>({viewChannels:false,readHistory:true})}),e=>e.status===403);
});
test('channel and category overwrites fail closed for ordinary members',async()=>{
 const {cmdHistoryParameters:p,searchCmdHistory:s}=await modulePromise;
 const params=p(query('server')),checkGuildPermissions=async()=>({viewChannels:true,readHistory:true});
 for(const [local,parent] of [[[],[{id:'restricted'}]],[[{id:'private'}],[]]]){
  const pool=fakePool('member',local,parent);
  await assert.rejects(s(pool,auth,params,{checkGuildPermissions}),e=>e.status===403);
 }
});
test('authorized server search is prepared, scoped, limited, and includes filters',async()=>{
 const {cmdHistoryParameters:p,searchCmdHistory:s}=await modulePromise;
 const pool=fakePool();
 const params=p(query('server',{q:'secret',limit:'500',authorId:'author-6',after:'2026-01-01'}));
 const result=await s(pool,auth,params,{checkGuildPermissions:async()=>({viewChannels:true,readHistory:true})});
 assert.equal(result.results.length,1);
 assert.equal(result.search,'full_stored_history');
 assert.equal(result.limit,50);
 const sql=pool.calls[2];
 assert.match(sql.sql,/m\.guild_id=\$8::uuid/);
 assert.equal(sql.args[1],'secret');
 assert.equal(sql.args[2],CHANNEL);
 assert.equal(sql.args[5],'author-6');
 assert.equal(sql.args[6],50);
 assert.equal(sql.args[7],GUILD);
});
test('private and group queries require ownership or membership in SQL',async()=>{
 const {cmdHistoryParameters:p,searchCmdHistory:s}=await modulePromise;
 for(const [scope,expected] of [['dm','t.user_low=$1 OR t.user_high=$1'],['group','gm.user_id=$1']]){
  const pool=fakePool();
  await s(pool,auth,p(query(scope)));
  assert.equal(pool.calls.length,1);
  assert.ok(pool.calls[0].sql.includes(expected));
  assert.equal(pool.calls[0].args.length,7);
 }
});
test('HTTP route rejects anonymous or unsupported methods',async()=>{
 const {handleCmdHistorySearch:h}=await modulePromise;
 const sent=[];
 const sendJson=(_res,status,value)=>sent.push({status,value});
 let result=await h({method:'POST'},{},query('server'),{pool:fakePool(),auth,sendJson});
 assert.equal(result,true);assert.equal(sent.at(-1).status,405);
 result=await h({method:'GET'},{},query('server'),{pool:fakePool(),auth:null,sendJson});
 assert.equal(result,true);assert.equal(sent.at(-1).status,401);
 result=await h({method:'GET'},{},new URL('https://cmd.test/other'),{pool:fakePool(),auth,sendJson});
 assert.equal(result,false);
});
