"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync(path.join(__dirname,'../cmd-social-message-actions.js'),'utf8');
function fixture(){
 const dom=new JSDOM('<!doctype html><html lang="fr"><body><div id="channelMessages"><article class="discord-message" data-message-id="1" data-cmd-author-id="alice"><div class="msg-avatar">A</div><div class="msg-main"><div class="msg-meta"><b>Alice</b></div><div class="msg-text">Bonjour et bienvenue !</div></div></article></div></body></html>',{url:'https://cmd.test/dashboard',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,speech={spoken:[],cancelled:0,cancel(){this.cancelled++},speak(value){this.spoken.push(value)}};
 w.speechSynthesis=speech;
 w.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 w.fetch=async()=>({ok:true,json:async()=>({userId:'alice'})});
 w.eval(src);
 const message=w.document.querySelector('.msg-text');
 return {dom,w,speech,message,close:()=>w.close()};
}
const openMenu=f=>{f.message.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,clientX:40,clientY:50}));return [...f.w.document.querySelectorAll('.cmd-compact-action-menu button')]};
const button=(buttons,label)=>{const b=buttons.find(x=>x.textContent.includes(label));assert.ok(b,label+' action visible');return b};
test('TTS stays opt-in and reads only the selected visible local message',()=>{
 const f=fixture();
 try{
  assert.equal(f.speech.spoken.length,0,'Opening app cannot autoplay speech');
  const list=openMenu(f);
  button(list,'Lire à voix haute').click();
  assert.equal(f.speech.spoken.length,1);
  assert.equal(f.speech.spoken[0].text,'Bonjour et bienvenue !');
  assert.equal(f.speech.spoken[0].lang,'fr');
  assert.equal(f.speech.spoken[0].volume,1);
 }finally{f.close()}
});
test('User can stop TTS and mute without exposing the message to a remote API',()=>{
 const f=fixture();
 try{
  button(openMenu(f),'Lire à voix haute').click();
  button(openMenu(f),'Arrêter la lecture').click();
  assert.ok(f.speech.cancelled>=2);
  assert.equal(f.w.cmdSphereTts.setVolume(0),true);
  assert.equal(f.w.cmdSphereTts.getSettings().volume,0);
  assert.equal(f.w.cmdSphereTts.speak('Test muet'),false);
  assert.equal(f.speech.spoken.length,1);
  assert.equal(f.w.cmdSphereTts.setVolume(1),true);
  assert.equal(f.w.cmdSphereTts.setVolume(5),false,'Reject invalid volume');
  f.w.dispatchEvent(new f.w.Event('pagehide'));
  assert.ok(f.speech.cancelled>=3);
 }finally{f.close()}
});
test('Missing browser synthesis yields no inert menu item or automatic fallback',()=>{
 const f=fixture();
 try{
  delete f.w.speechSynthesis;
  assert.equal(f.w.cmdSphereTts.speak('Hors service'),false);
  const list=openMenu(f);
  assert.ok(!list.some(x=>x.textContent.includes('Lire à voix haute')));
 }finally{f.close()}
});
