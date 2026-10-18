const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync(path.join(__dirname,'../cmd-message-reminders-ui.js'),'utf8');
const menu=fs.readFileSync(path.join(__dirname,'../cmd-social-message-actions.js'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
function view(){
 const dom=new JSDOM('<!doctype html><html lang="fr"><head></head><body><article class="discord-message" data-message-id="11111111-1111-4111-8111-111111111111"><div class="msg-text">Bonjour</div></article></body></html>',{url:'https://cmd.test/dashboard',runScripts:'outside-only'});
 const requests=[];
 dom.window.cmdSphereMessageActions={context:()=>({guildId:'22222222-2222-4222-8222-222222222222',channelId:'33333333-3333-4333-8333-333333333333'})};
 dom.window.fetch=async(url,init={})=>{
  const method=init.method||'GET',body=init.body?JSON.parse(init.body):undefined;
  requests.push({url,method,body});
  if(method==='GET')return {ok:true,json:async()=>({reminders:[]})};
  if(method==='POST')return {ok:true,json:async()=>({id:'44444444-4444-4444-8444-444444444444',ok:true})};
  if(method==='DELETE')return {ok:true,json:async()=>({ok:true})};
  return {ok:false,json:async()=>({error:'not implemented'})};
 };
 dom.window.eval(src);
 return {dom,window:dom.window,requests,article:dom.window.document.querySelector('article')};
}
test('Reminder UI is available only as intentional on-device user action',async()=>{
 const {dom,window,requests,article}=view();
 assert.ok(window.cmdSphereReminders);
 assert.equal(requests.length,0);
 assert.equal(window.cmdSphereReminders.open(article),true);
 assert.ok(window.document.querySelector('[role="dialog"][aria-modal="true"]'));
 assert.equal(window.document.querySelector('.cmd-reminder-panel input').type,'datetime-local');
 await new Promise(r=>setTimeout(r,8));
 dom.window.close();
});
test('Message reminder action sends only authorized context, target message and timezone to API',async()=>{
 const x=view();x.window.cmdSphereReminders.open(x.article);
 const input=x.window.document.querySelector('.cmd-reminder-panel input');
 const date=new Date(Date.now()+7200_000);
 input.value=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
 x.window.document.querySelector('.cmd-reminder-actions button:last-child').click();
 await new Promise(r=>setTimeout(r,8));
 const posted=x.requests.find(v=>v.method==='POST');
 assert.ok(posted,'Action must send to server');
 assert.equal(posted.url,'/api/messages/reminders');
 assert.equal(posted.body.messageId,x.article.dataset.messageId);
 assert.equal(posted.body.guildId,'22222222-2222-4222-8222-222222222222');
 assert.equal(posted.body.channelId,'33333333-3333-4333-8333-333333333333');
 assert.ok(posted.body.timezone);
 assert.ok(new Date(posted.body.dueAt)>new Date());
 assert.ok(x.window.document.querySelector('[role=status]').textContent.includes('enregistré'));
 x.dom.window.close();
});
test('A real cancel action only cancels the current account reminder',async()=>{
 const x=view();
 x.window.fetch=async(url,init={})=>{
  const method=init.method||'GET',body=init.body?JSON.parse(init.body):undefined;
  x.requests.push({url,method,body});
  return {ok:true,json:async()=>method==='GET'?({reminders:[{id:'55555555-5555-4555-8555-555555555555',due_at:new Date(Date.now()+60000).toISOString()}]}):({ok:true})};
 };
 x.window.cmdSphereReminders.list();
 await new Promise(r=>setTimeout(r,8));
 const b=x.window.document.querySelector('.cmd-reminder-row button');assert.ok(b);
 b.click();await new Promise(r=>setTimeout(r,8));
 const deleted=x.requests.find(v=>v.method==='DELETE');assert.ok(deleted);
 assert.equal(deleted.body.id,'55555555-5555-4555-8555-555555555555');
 assert.equal(deleted.url,'/api/messages/reminders');
 x.dom.window.close();
});
test('Reminders integrate with existing compact menu and private SQL API',()=>{
 assert.match(menu,/Me rappeler ce message/);
 assert.match(menu,/cmdSphereReminders\.open\(article\)/);
 assert.match(server,/createCmdMessageReminder\(pool,auth,input,nativeTextChannel\)/);
 assert.match(server,/cancelCmdMessageReminder\(pool,auth,input.id\)/);
 assert.match(server,/\/cmd-message-reminders-ui\.js/);
 assert.match(server,/body\.includes\('id="channelMessages"'\)/);
});
