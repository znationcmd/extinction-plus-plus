const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../cmd-social-message-actions.js'),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,60));
async function fixture(){
 const dom=new JSDOM('<button id="before">Before</button><div id="channelMessages"><article class="discord-message" data-message-id="11111111-1111-1111-1111-111111111111" data-cmd-author-id="me" data-cmd-source="cmd"><div class="msg-avatar">M</div><div class="msg-main"><div class="msg-meta"><b>Moi</b><button class="reply-mini">Reply</button></div><div class="msg-text">Bonjour</div></div></article></div>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://cmd.test/'});
 const w=dom.window,observers=[];const Observer=w.MutationObserver;w.MutationObserver=class extends Observer{constructor(fn){super(fn);observers.push(this)}};dom.cleanup=()=>{observers.forEach(o=>o.disconnect());w.close()};w.CHAT={open:true,mode:'native',guildId:'guild',channelId:'channel'};
 w.fetch=async url=>({ok:true,json:async()=>url.includes('message-controls')?{userId:'me'}:{profile:{id:'me',displayName:'Moi',friendStatus:'self'}}});
 w.eval(source);await tick();return dom;
}
test('single menu on message tap; author edit does not depend on cosmetic own-message class',async()=>{
 const dom=await fixture();try{const d=dom.window.document;d.querySelector('.msg-text').click();assert.equal(d.querySelectorAll('.cmd-compact-action-menu').length,1);assert.match(d.querySelector('.cmd-compact-action-menu').textContent,/Modifier/);assert.match(d.querySelector('.cmd-compact-action-menu').textContent,/Supprimer/);d.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(d.querySelectorAll('.cmd-compact-action-menu').length,0)}finally{await tick();dom.cleanup()}
});
test('avatar and name open only profile; close remains above banner',async()=>{
 const dom=await fixture();try{const w=dom.window,d=w.document;d.querySelector('.msg-avatar').click();await tick();assert.equal(d.querySelectorAll('.cmd-person-overlay').length,1);assert.equal(d.querySelectorAll('.cmd-compact-action-menu').length,0);assert.equal(w.getComputedStyle(d.querySelector('.cmd-person-close')).zIndex,'6');assert.equal(w.getComputedStyle(d.querySelector('.cmd-person-avatar')).boxSizing,'border-box');d.querySelector('.cmd-person-close').click();assert.equal(d.querySelectorAll('.cmd-person-overlay').length,0)}finally{await tick();dom.cleanup()}
});
test('reloading enhancement does not duplicate listeners; reply buttons stay independent',async()=>{
 const dom=await fixture();try{const w=dom.window,d=w.document;w.eval(source);let replies=0;d.querySelector('.reply-mini').onclick=()=>replies++;d.querySelector('.reply-mini').click();assert.equal(replies,1);assert.equal(d.querySelectorAll('.cmd-compact-action-menu').length,0);d.querySelector('.msg-text').dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,clientX:50,clientY:70}));assert.equal(d.querySelectorAll('.cmd-compact-action-menu').length,1)}finally{await tick();dom.cleanup()}
});
test('long press opens once and suppresses the trailing click',async()=>{
 const dom=await fixture();try{const w=dom.window,d=w.document,target=d.querySelector('.msg-text');const e=new w.Event('touchstart',{bubbles:true});Object.defineProperty(e,'touches',{value:[{clientX:50,clientY:60}]});target.dispatchEvent(e);await new Promise(r=>setTimeout(r,580));const menu=d.querySelector('.cmd-compact-action-menu');assert.ok(menu);target.click();assert.equal(d.querySelector('.cmd-compact-action-menu'),menu);let replies=0;d.querySelector('.reply-mini').onclick=()=>replies++;menu.querySelector('button').click();assert.equal(replies,1)}finally{await tick();dom.cleanup()}
});
test('premium avatar ornament stays centered with the smaller profile photo',async()=>{
 const {CMD_PREMIUM_ART_CSS,CMD_SHOP_REFINEMENT_CSS}=await import('../cmd-premium-art.js');
 const css=fs.readFileSync(path.join(__dirname,'../cmd-profile-premium.css'),'utf8');
 const dom=new JSDOM('<style>'+css+CMD_PREMIUM_ART_CSS+CMD_SHOP_REFINEMENT_CSS+'</style><div class="page cmd-premium-profile"><section class="hero cmd-pm-hero"><div class="avatarWrap"><img class="avatar"><img class="cmd-profile-art-avatar"></div></section></div>');
 try{const d=dom.window.document,photo=dom.window.getComputedStyle(d.querySelector('.avatar')),ring=dom.window.getComputedStyle(d.querySelector('.cmd-profile-art-avatar'));for(const [pos,size] of [['left','width'],['top','height']])assert.equal(parseFloat(photo[pos])+parseFloat(photo[size])/2,parseFloat(ring[pos])+parseFloat(ring[size])/2)}finally{dom.window.close()}
});
