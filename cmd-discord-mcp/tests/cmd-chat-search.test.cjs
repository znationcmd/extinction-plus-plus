const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','cmd-chat-search.js'),'utf8');

function mount(fragment){
 const dom=new JSDOM('<!doctype html><html><head></head><body>'+fragment+'</body></html>',{url:'https://example.org/dashboard',runScripts:'outside-only'});
 const win=dom.window;
 win.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrollHit='1'};
 win.eval(source);
 return dom;
}
test('chat search parses and stops safely on pages without chat',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.doesNotThrow(()=>vm.runInNewContext(source,{window:{},document:{querySelector:()=>null}}));
});
test('finds loaded server messages, not HTML markup',()=>{
 const dom=mount('<section id="channelOverlay"><div class="channel-actions"></div><div id="channelMessages"><article class="discord-message"><div class="msg-text">Bonjour à tous</div></article><article class="discord-message"><div class="msg-text">Au revoir</div></article></div></section>');
 const doc=dom.window.document;
 doc.querySelector('.cmd-search-launch').click();
 const input=doc.querySelector('.cmd-search-input');
 input.value='bonjour';input.dispatchEvent(new dom.window.Event('input'));
 const results=doc.querySelectorAll('.cmd-search-result');
 assert.equal(results.length,1);
 assert.equal(results[0].textContent,'Bonjour à tous');
 results[0].click();
 assert.equal(doc.querySelector('article').dataset.scrollHit,'1');
 assert.equal(doc.querySelectorAll('article').length,2);
 dom.window.close();
});
test('DM search ignores sender names and timestamps',()=>{
 const dom=mount('<div id="chatHead"><div class="callActions"></div></div><div id="msgs"><div class="bubble me"><b class="sender">Bonjour-nickname</b>Un message confidentiel<small>Bonjour, 09:00</small></div><div class="bubble">Message bonjour visible</div></div>');
 const doc=dom.window.document;
 doc.querySelector('.cmd-search-launch').click();
 const input=doc.querySelector('.cmd-search-input');
 input.value='bonjour';input.dispatchEvent(new dom.window.Event('input'));
 assert.equal(doc.querySelectorAll('.cmd-search-result').length,1);
 dom.window.close();
});
test('search is limited to visible loaded community DOM and never posts data',()=>{
 const dom=mount('<section id="chat"><header class="chatHead"></header><div id="messages"><article class="msg"><div class="text">Étude du projet CMD</div></article></div></section>');
 const doc=dom.window.document;
 doc.querySelector('.cmd-search-launch').click();
 const input=doc.querySelector('.cmd-search-input');input.value='étude';input.dispatchEvent(new dom.window.Event('input'));
 assert.equal(doc.querySelectorAll('.cmd-search-result').length,1);
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 assert.doesNotMatch(source,/\bXMLHttpRequest\b/);
 assert.doesNotMatch(source,/\bWebSocket\b/);
 assert.match(doc.querySelector('.cmd-search-status').textContent,/messages chargés/);
 dom.window.close();
});
