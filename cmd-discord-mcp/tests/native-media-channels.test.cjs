const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const media=import('../cmd-native-media-channels.js');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const manager=fs.readFileSync(path.join(__dirname,'../cmd-server-manager.js'),'utf8');
test('Media validation does not change the behavior of old text and forum rooms',async()=>{
 const {assertNativeMediaPost}=await media;
 for(const type of ['text','forum','announcement','voice'])assert.doesNotThrow(()=>assertNativeMediaPost({type},[]));
});
test('Media room rejects text-only, empty and non-media uploads',async()=>{
 const {assertNativeMediaPost}=await media;
 for(const items of [[],undefined,[{contentType:'application/pdf'}],[{contentType:'audio/webm'}]]){
  assert.throws(()=>assertNativeMediaPost({type:'media'},items),e=>e.status===415&&/photo ou une vidéo/.test(e.message));
 }
});
test('Media room accepts uploaded and validated photos and videos',async()=>{
 const {assertNativeMediaPost}=await media;
 for(const mime of ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
  assert.doesNotThrow(()=>assertNativeMediaPost({type:'media'},[{contentType:mime}]));
});
test('Media room content enforcement occurs after upload sanitization and before SQL storage',()=>{
 const begin=server.indexOf('async function sendNativeChannelMessage('),end=server.indexOf('async function ',begin+18);
 const send=server.slice(begin,end);
 const validate=send.indexOf('sanitizeNativeAttachments(input.attachments)');
 const gate=send.indexOf('assertNativeMediaPost(ch,attachments)');
 const save=send.indexOf('saveNativeMessageWithSlowmode(pool,');
 assert.ok(validate>=0&&gate>validate&&save>gate);
});
test('Media channels are created and edited using native IDs without modifying imported Discord',()=>{
 assert.ok(server.includes('["text","voice","announcement","forum","media"]'));
 assert.ok(server.includes('["text","voice","announcement","forum","media","category"]'));
 assert.ok(server.includes('["text","announcement","forum","media","voice"].includes(String(ch.type))'));
 assert.ok(server.includes('if(String(ch.type)==="voice")'),"Voice channels keep separate effective permission check");;
 assert.ok(server.includes("type IN ('text','announcement','forum','media')"));
});
test('Media channel messages render with the existing persistent message source and gallery layout',()=>{
 assert.ok(server.includes("CHAT.channelType=String(ch?.type||\"text\")"));
 assert.ok(server.includes("box.classList.toggle('cmd-media-channel',CHAT.mode==='native'&&CHAT.channelType==='media')"));
 assert.ok(server.includes('#channelMessages.cmd-media-channel'));
 assert.ok(server.includes('messageBody(m)'));
});
test('Native channel picker exposes actual media choice and small-screen image gallery',()=>{
 assert.ok(manager.includes("['media','🖼️ Médias']"));
 assert.ok(manager.includes("c.type==='media'?'🖼️'"));
 assert.ok(manager.includes("['text','announcement','forum','media'].includes(ch.type)"));
 assert.ok(server.includes('grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))'));
});
