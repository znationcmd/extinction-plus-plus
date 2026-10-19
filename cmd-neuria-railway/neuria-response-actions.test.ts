import {runInNewContext} from "node:vm";
import {test,expect,afterEach} from 'bun:test';
import {Window} from 'happy-dom';
import {RESPONSE_ACTIONS_CLIENT} from './neuria-response-actions.ts';
const windows:Window[]=[];
function setup(){
 const window=new Window({url:'https://neuria.test'});windows.push(window);
 window.document.body.innerHTML='<main><section id="feed"><article class="bubble me">Ma question</article><article class="bubble bot">Une réponse utile.</article></section><form><select aria-label="Niveau de réflexion"><option value="normal">Standard</option><option value="approfondi">Approfondie</option></select><input id="message"><button id="send">Envoyer</button></form></main>';
 window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};window.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new window.Event('close'))};
 const bubble=window.document.querySelector('.bot')!;
 bubble.dataset.neuriaResponse=JSON.stringify({model:'test-model',research:{sources:[{title:'Source vérifiée',url:'https://example.com/report'},{title:'Lien invalide',url:'javascript:alert(1)'}]}});
 const calls:any[]=[];window.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new window.Response('{}')};
 runInNewContext(RESPONSE_ACTIONS_CLIENT,{window,document:window.document,localStorage:window.localStorage,navigator:window.navigator,MutationObserver:window.MutationObserver,Event:window.Event,CustomEvent:window.CustomEvent,Option:window.Option,URL:window.URL,queueMicrotask});return {window,doc:window.document,bubble,calls};
}
afterEach(async()=>{for(const window of windows.splice(0))await window.happyDOM.close()});
test('answer controls preserve text and only display safe, supplied source links',()=>{
 const {doc,bubble}=setup();expect(bubble.dataset.neuriaMessageText).toBe('Une réponse utile.');expect(bubble.querySelectorAll('.neuria-answer-actions button').length).toBe(6);
 bubble.querySelector('button[aria-label="Sources"]')!.click();expect(doc.querySelectorAll('dialog a').length).toBe(1);expect(doc.querySelector('dialog a')!.getAttribute('href')).toBe('https://example.com/report');
});
test('feedback toggles locally and branching identifies the actual answer',()=>{
 const {doc,bubble}=setup();const useful=bubble.querySelector('[data-feedback="like"]')!;useful.click();expect(useful.getAttribute('aria-pressed')).toBe('true');expect(JSON.parse(bubble.dataset.neuriaResponse!).feedback).toBe('like');useful.click();expect(useful.getAttribute('aria-pressed')).toBe('false');
 let selected;doc.addEventListener('neuria:branch',e=>selected=e.detail.element);bubble.querySelector('[aria-label="Plus d’actions"]')!.click();doc.querySelector('[aria-label="Continuer dans une nouvelle branche"]')!.click();expect(selected).toBe(bubble);
});
test('saved settings are sent to Work and chat; Web retry forces a real search',async()=>{
 const {window,doc,bubble,calls}=setup();doc.querySelector('#neuriaResponseSettings')!.click();const selects=[...doc.querySelectorAll('dialog select')];for(const [i,value] of ['approfondi','court','off'].entries()){selects[i].value=value;selects[i].dispatchEvent(new window.Event('change'))}
 await window.fetch('/api/work/run',{body:JSON.stringify({goal:'Mon objectif'})});expect(calls[0].body).toMatchObject({reasoningLevel:'approfondi',responseLength:'court',webSearch:'off'});
 window.neuriaBranchContext='Objectif conservé de la discussion précédente';doc.querySelector('dialog')!.close();doc.querySelector('form')!.addEventListener('submit',e=>{e.preventDefault();window.fetch('/api/chat',{body:JSON.stringify({message:doc.querySelector('#message')!.value})})});
 bubble.querySelector('[aria-label="Plus d’actions"]')!.click();doc.querySelector('[aria-label="Rechercher sur le Web"]')!.click();await Promise.resolve();expect(calls[1].body).toMatchObject({message:'Ma question',webSearch:'on',branchContext:'Objectif conservé de la discussion précédente'});
 expect(JSON.parse(window.localStorage.getItem('cmd-neuria-response-settings-v1')!)).toMatchObject({reasoning:'approfondi',length:'court',web:'off'});
});
test('Work reports receive the same controls, without adding action labels to report text',async()=>{
 const {window,doc}=setup();const panel=doc.createElement('section');panel.id='neuriaWorkInfo';const out=doc.createElement('pre');out.id='workResult';out.textContent='Rapport vérifié';out.dataset.neuriaResponse=JSON.stringify({work:true,goal:'Analyser le rapport',sources:[]});panel.append(out);doc.body.append(panel);doc.dispatchEvent(new window.Event('neuria:response'));
 expect(panel.querySelectorAll('.neuria-answer-actions button').length).toBe(6);expect(out.textContent).toBe('Rapport vérifié');
 panel.querySelector('[aria-label="Sources"]')!.click();expect(doc.querySelector('dialog')!.textContent).toContain('Aucune source Web fournie');
});
test('a fork preserves source metadata and leaves the original discussion intact',async()=>{
 const {window,doc,bubble}=setup();const menu=doc.createElement('aside');menu.id='neuriaMenu';menu.innerHTML='<div id="chatList"></div><button id="newChat">Nouveau</button><button id="closeMenu">Fermer</button>';doc.body.append(menu);
 const index=await Bun.file(import.meta.dir+'/index.ts').text();const literal=index.match(/^const NEURIA_NAV=(.*);$/m)![1];const nav=runInNewContext(literal);
 runInNewContext(nav,{window,document:doc,localStorage:window.localStorage,MutationObserver:window.MutationObserver,Event:window.Event,CustomEvent:window.CustomEvent,setTimeout,clearTimeout,confirm:()=>true,prompt:()=>null});
 doc.dispatchEvent(new window.CustomEvent('neuria:branch',{detail:{element:bubble}}));
 const saved=JSON.parse(window.localStorage.getItem('cmd-neuria-chats-v2')!);expect(saved.length).toBe(2);expect(saved[0].context).toContain('Ma question');expect(window.neuriaBranchContext).toContain('Une réponse utile.');expect(saved[0].items.length).toBe(2);expect(saved[1].items.length).toBe(2);expect(saved[0].items[1].text).toBe('Une réponse utile.');expect(JSON.parse(saved[0].items[1].meta).research.sources[0].title).toBe('Source vérifiée');
 await new Promise(resolve=>setTimeout(resolve,350));expect(JSON.parse(window.localStorage.getItem('cmd-neuria-chats-v2')!)[0].items[1].text).toBe('Une réponse utile.');
});

test('long discussions show one visible continuation action on their latest answer',()=>{
 const {window,doc}=setup();const feed=doc.getElementById('feed')!;for(let i=0;i<18;i++){const bubble=doc.createElement('article');bubble.className='bubble '+(i%2?'bot':'me');bubble.textContent='Message '+i;feed.append(bubble)}doc.dispatchEvent(new window.Event('neuria:response'));
 const buttons=feed.querySelectorAll('.neuria-continue-branch');expect(buttons.length).toBe(1);expect(buttons[0].parentElement).toBe(feed.lastElementChild);expect(buttons[0].textContent).toContain('Continuer dans une nouvelle branche');
});
