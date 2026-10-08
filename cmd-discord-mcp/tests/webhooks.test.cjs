const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const modulePromise=import('../native-webhooks.js');
test('Independent webhook creates a secret URL, stores only its hash and delivers to its own CMD room',async()=>{
 const mod=await modulePromise;let stored,inserted;
 const pool={query:async(sql,args)=>{
  if(sql.startsWith('CREATE TABLE'))return {rows:[]};
  if(sql.startsWith('SELECT id FROM'))return {rows:[{id:'room'}]};
  if(sql.startsWith('INSERT INTO cmd_native_webhooks')){stored={id:args[0],guild_id:args[1],channel_id:args[2],name:args[3],token_hash:args[4]};return {rows:[]}};
  if(sql.startsWith('SELECT * FROM cmd_native_webhooks'))return {rows:args[0]===stored.id&&args[1]===stored.token_hash?[stored]:[]};
  if(sql.startsWith('INSERT INTO cmd_native_channel_messages')){inserted=args;return {rows:[{created_at:'2026-10-08T09:00:00Z'}]}};
  throw Error(sql);
 }};
 const created=await mod.createNativeWebhook(pool,{guildId:'guild',channelId:'room',name:'CMD independent',userId:'local-account',baseUrl:'https://sphere.example'});
 const token=created.webhook.url.split('/').pop();assert.equal(stored.token_hash,crypto.createHash('sha256').update(token).digest('hex'));assert.notEqual(stored.token_hash,token);
 await assert.rejects(mod.receiveNativeWebhook(pool,stored.id,'a'.repeat(43),{content:'test'}),/introuvable/);assert.equal(inserted,undefined);
 const delivered=await mod.receiveNativeWebhook(pool,stored.id,token,{content:'Direct sans Discord',embeds:[{title:'CMD',image:{url:'https://example.test/image.png'}}],username:'Tool'});
 assert.equal(delivered.content,'Direct sans Discord');assert.equal(inserted[2],'room');assert.equal(inserted[3],'webhook:'+stored.id);assert.equal(JSON.parse(inserted[5]).webhook.name,'Tool');assert.equal(delivered.embeds[0].title,'CMD');
});
test('Independent webhook rejects empty and oversized messages and strips unsafe embed URLs',async()=>{
 const mod=await modulePromise;
 assert.throws(()=>mod.webhookPayload({}),/vide/);assert.throws(()=>mod.webhookPayload({content:'x'.repeat(2001)}),/2000/);
 const r=mod.webhookPayload({embeds:[{title:'CMD',url:'javascript:alert(1)',image:{url:'file:///private'}}]});assert.equal(r.embeds[0].url,undefined);assert.equal(r.embeds[0].image,undefined);
});
