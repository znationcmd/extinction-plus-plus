const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('chat search and navigation scripts compile without touching the server',()=>{
 for(const name of ['cmd-chat-search.js','cmd-chat-navigation.js']){
  const source=read(name);
  assert.doesNotThrow(()=>new vm.Script(source));
  assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/);
 }
});
test('search restricts results to loaded messages and uses text-only output',()=>{
 const dom=new JSDOM('<!doctype html><div id="channelOverlay"><div class="channel-actions"></div><div id="channelMessages"><article class="discord-message"><div class="msg-text">Bonjour CMD Sphere</div></article><article class="discord-message"><div class="msg-text">Autre message</div></article></div></div>',{url:'https://cmd.example/chat',runScripts:'outside-only',pretendToBeVisual:true});
 try{
  dom.window.eval(read('cmd-chat-search.js'));
  dom.window.document.querySelector('.cmd-search-launch').click();
  const input=dom.window.document.querySelector('.cmd-search-input');
  input.value='bonjour';
  input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  const results=dom.window.document.querySelectorAll('.cmd-search-result');
  assert.equal(results.length,1);
  assert.match(results[0].textContent,/Bonjour CMD Sphere/);
  assert.equal(dom.window.cmdSphereChatSearch.scope,'loaded-messages-only');
 }finally{dom.window.close()}
});
test('jump-to-latest appears on scrollback and restores latest scroll position',()=>{
 const dom=new JSDOM('<!doctype html><div id="chatHead"><div class="callActions"></div></div><div id="msgs"><div class="bubble">Salut</div></div>',{url:'https://cmd.example/messages',runScripts:'outside-only',pretendToBeVisual:true});
 try{
  const host=dom.window.document.querySelector('#msgs');
  Object.defineProperty(host,'scrollHeight',{configurable:true,value:900});
  Object.defineProperty(host,'clientHeight',{configurable:true,value:300});
  let position=30;
  Object.defineProperty(host,'scrollTop',{configurable:true,get:()=>position,set:v=>{position=v}});
  host.scrollTo=({top})=>{position=top};
  dom.window.eval(read('cmd-chat-navigation.js'));
  host.dispatchEvent(new dom.window.Event('scroll'));
  const button=dom.window.document.querySelector('.cmd-jump-new');
  assert.equal(button.dataset.visible,'true');
  button.click();
  assert.equal(position,900);
  assert.equal(dom.window.cmdSphereChatNavigation.loadedOnly,true);
 }finally{dom.window.close()}
});
