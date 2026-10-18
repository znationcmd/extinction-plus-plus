const {test}=require('node:test');
const assert=require('node:assert/strict');
test('unclaimed chests remain discoverable after the first hundred are claimed',async()=>{
 const {pendingLevelChests}=await import('../cmd-levels.js');
 const claimed=new Set(Array.from({length:100},(_,i)=>i+2));
 assert.deepEqual(pendingLevelChests(105,claimed),[102,103,104,105]);
 assert.deepEqual(pendingLevelChests(1,new Set()),[]);
 assert.equal(pendingLevelChests(500,new Set()).length,100);
 assert.deepEqual(pendingLevelChests(10001,new Set(Array.from({length:9998},(_,i)=>i+2))),[10000]);
});
test('level status returns the next unclaimed rewards for the requesting account',async()=>{
 const {levelStatus}=await import('../cmd-levels.js');
 const queries=[];
 const pool={query:async(sql,args)=>{queries.push({sql,args});return {rows:sql.startsWith('SELECT xp')?[{xp:104**2*120}]:sql.startsWith('SELECT level')?Array.from({length:100},(_,i)=>({level:i+2})):[]}}};
 const status=await levelStatus(pool,'account-A');
 assert.equal(status.level,105);assert.deepEqual(status.pendingChests,[102,103,104,105]);
 for(const query of queries.filter(q=>q.sql.startsWith('SELECT')))assert.deepEqual(query.args,['account-A']);
});
