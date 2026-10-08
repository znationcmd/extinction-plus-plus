/* CMD Sphere — reader-language automatic translation.
   The original message is never overwritten. Only visible messages are sent,
   with a small queue and rate limit to protect free translation providers. */
(function(){
"use strict";
const supported={fr:"Français",en:"English",us:"English (US)",de:"Deutsch",es:"Español",it:"Italiano",ru:"Русский",ko:"한국어",ja:"日本語",zh:"中文",co:"Corsu",pt:"Português"};
const translatedCache=new Map(), failedCache=new Map();
const waiting=[],queued=new WeakSet(),watched=new WeakSet();
let inFlight=0,windowCount=0,windowStart=Date.now(),pausedUntil=0,epoch=0;
const MAX_ACTIVE=2,MAX_MINUTE=12,MAX_LENGTH=1700;
function code(){try{
 const saved=localStorage.getItem("cmd-sphere-language")||document.querySelector("#cmd-sphere-language")?.value||"fr";
 return supported[saved]?saved:"fr";
}catch{return"fr"}}
function actualLang(){const c=code();return c==="us"?"en":c}
function findMessage(node){return node?.closest?.(".discord-message,.bubble")||null}
function contentNode(row){return row?.querySelector(".msg-text,.dm-text,.msg-embed")}
function originalText(row){const el=contentNode(row);return el?String(el.innerText||el.textContent||"").trim():""}
function autoEnabled(){try{return localStorage.getItem("cmd-sphere-auto-translate")!=="0"}catch{return true}}
function clue(text){const str=text.toLowerCase();
 const en=(str.match(/\b(the|hello|thanks|thank you|you|your|please|what|with|this|where|how|today|good|are|have|can|welcome|morning)\b/g)||[]).length;
 const fr=(str.match(/\b(les|des|bonjour|merci|vous|avec|pour|dans|cette|comment|salut|bienvenue|aujourd'hui|toujours|nous|je|une|est)\b/g)||[]).length;
 if(en>=2&&en>=fr+1)return "en";
 if(fr>=2&&fr>=en+1)return "fr";
 return "auto";
}
function sameLanguage(text,target){
 const guess=clue(text);
 return guess!=="auto"&&guess===target;
}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function maxRate(){
 const now=Date.now();
 if(now-windowStart>=60000){windowStart=now;windowCount=0}
 if(now<pausedUntil)return false;
 return windowCount<MAX_MINUTE;
}
function cooldown(ms){pausedUntil=Math.max(pausedUntil,Date.now()+ms)}
function cacheKey(text,target){return target+"\0"+text}
function remember(key,value){translatedCache.set(key,value);if(translatedCache.size>240)translatedCache.delete(translatedCache.keys().next().value)}
function tools(row){
 let toolbar=row.querySelector(".cmd-translation-tools");
 if(!toolbar){
  toolbar=document.createElement("div");toolbar.className="cmd-translation-tools";
  toolbar.innerHTML='<button type="button" class="cmd-translate-action">🌐 Traduire</button><button type="button" class="cmd-original-action" hidden>Voir l’original</button>';
  (row.querySelector(".msg-main")||row).appendChild(toolbar);
 }
 toolbar.querySelector(".cmd-translation-target")?.remove();
 return toolbar;
}
function output(row){
 let div=row.querySelector(".cmd-translation-output");
 if(!div){
  div=document.createElement("div");div.className="cmd-translation-output";
  div.setAttribute("aria-live","off");
  const bar=tools(row);bar.parentNode.insertBefore(div,bar);
 }
 return div;
}
function modeOriginal(row){
 const original=contentNode(row),div=row.querySelector(".cmd-translation-output");
 if(original)original.hidden=false;
 if(div)div.hidden=true;
 const show=row.querySelector(".cmd-original-action");
 if(show){show.hidden=true;show.textContent="Voir l’original"}
 const translate=row.querySelector(".cmd-translate-action");
 if(translate){translate.hidden=false;translate.textContent="🌐 Traduire";translate.title="Traduire dans ma langue"}
}
function modeTranslated(row,result){
 const original=contentNode(row);
 if(!original||!result?.translatedText)return;
 if(result.translatedText.trim()===originalText(row)||result.sourceLanguage===actualLang()){
  modeOriginal(row);row.dataset.cmdAutoDone=actualLang();return;
 }
 const target=actualLang(),div=output(row);
 div.textContent=result.translatedText;
 div.dataset.state="translated";
 div.setAttribute("lang",target);
 div.hidden=false;
 original.hidden=true;
 const show=row.querySelector(".cmd-original-action");
 if(show){show.hidden=false;show.textContent="Voir l’original"}
 const button=row.querySelector(".cmd-translate-action");if(button)button.hidden=true;
 row.dataset.cmdAutoDone=target;
}
function errorState(row,manual=false){
 modeOriginal(row);
 row.dataset.cmdAutoDone=actualLang();
 const button=row.querySelector(".cmd-translate-action");
 if(button){
  button.title="Service gratuit indisponible. Appuie pour réessayer.";
  button.textContent=manual?"🌐 Réessayer":"🌐 Traduire";
 }
 // Keep the original text visible instead of displaying a red error card.
}
function loadTranslated(row,result,target){
 if(!row.isConnected||target!==actualLang())return;
 modeTranslated(row,result);
}
async function requestServer(message,target){
 const response=await fetch("/api/cmd/translate-message",{
   method:"POST",credentials:"same-origin",cache:"no-store",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({text:message,target,source:"auto"})
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Object.assign(Error(data.error||"Service de traduction indisponible"),{status:response.status});
 if(!data.translatedText)throw Error("Traduction indisponible");
 return data;
}
/* Public-service fallback through the reader's browser. Only try well-recognized
   French/English source pairs and never guess an unknown source language. */
async function browserFallback(message,target,manual){
 const source=clue(message);
 if(source==="auto"||source===target)return null;
 const chunks=[],encoder=new TextEncoder();
 let current="";
 for(const ch of message){
  if(encoder.encode(current+ch).length>420){if(current)chunks.push(current);current=ch}
  else current+=ch;
 }
 if(current)chunks.push(current);
 if(!chunks.length||chunks.length>(manual?5:1))return null;
 const results=[];
 for(const chunk of chunks){
  const url="https://api.mymemory.translated.net/get?"+new URLSearchParams({q:chunk,langpair:source+"|"+target});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5500);
  try{
   const r=await fetch(url,{mode:"cors",cache:"no-store",signal:controller.signal,headers:{accept:"application/json"}});
   if(!r.ok)return null;
   const data=await r.json();
   let value=String(data?.responseData?.translatedText||"");
   if(Number(data?.responseStatus)!==200||!value||/^MYMEMORY WARNING/i.test(value))return null;
   const box=document.createElement("textarea");box.innerHTML=value;
   value=box.value;
   results.push(value);
  }catch{return null}
  finally{clearTimeout(timer)}
 }
 const translatedText=results.join(" ").trim();
 return translatedText&&translatedText!==message.trim()?{translatedText,sourceLanguage:source,targetLanguage:target,provider:"MyMemory (navigateur)"}:null;
}

async function doTranslate(row,manual=false){
 if(!row?.isConnected)return;
 const target=actualLang(),text=originalText(row),key=cacheKey(text,target);
 if(!text||text.length>MAX_LENGTH||!/[a-zÀ-ž\u0400-\u04FF\u3040-\u9FFF\uAC00-\uD7AF]/i.test(text))return;
 if(sameLanguage(text,target)){row.dataset.cmdAutoDone=target;modeOriginal(row);return}
 const cached=translatedCache.get(key);
 if(cached){loadTranslated(row,cached,target);return}
 if(!manual&&failedCache.get(key)>Date.now()){row.dataset.cmdAutoDone=target;return}
 if(!manual&&!autoEnabled())return;
 if(!manual&&!maxRate())return;
 const revision=epoch;
 if(!manual)windowCount++;
 const button=row.querySelector(".cmd-translate-action");
 if(button){button.disabled=true;if(manual)button.textContent="Traduction…"}
 try{
  let result;
  try{result=await requestServer(text,target)}
  catch(primary){
   // Browser backup is rate-limited by the same queue; never retry 429 automatically.
   result=primary.status===429?null:await browserFallback(text,target,manual);
   if(!result)throw primary;
  }
  remember(key,result);
  if(revision===epoch)loadTranslated(row,result,target);
 }catch(e){
  const tooMany=e.status===429,unavailable=e.status===503;
  if(tooMany||unavailable)cooldown(tooMany?60000:15000);
  failedCache.set(key,Date.now()+(tooMany?60000:30000));
  if(revision===epoch&&row.isConnected)errorState(row,manual);
 }finally{
  if(button&&row.isConnected)button.disabled=false;
 }
}
function pump(){
 if(!autoEnabled())return;
 if(!maxRate()){
  const ms=Math.max(1500,Math.min(60000,pausedUntil-Date.now()||windowStart+60000-Date.now()));
  if(waiting.length)setTimeout(pump,ms);
  return;
 }
 while(inFlight<MAX_ACTIVE&&waiting.length&&maxRate()){
  const row=waiting.shift();queued.delete(row);
  if(!row?.isConnected||row.dataset.cmdAutoDone===actualLang())continue;
  inFlight++;
  doTranslate(row).finally(()=>{inFlight--;pump()});
 }
}
function enqueue(row){
 if(!autoEnabled()||!row?.isConnected||queued.has(row)||row.dataset.cmdAutoDone===actualLang())return;
 if(!contentNode(row))return;
 const text=originalText(row),target=actualLang();
 if(text.length<2||text.length>MAX_LENGTH)return;
 if(sameLanguage(text,target)){row.dataset.cmdAutoDone=target;return}
 queued.add(row);waiting.push(row);
 pump();
}
const visible=new IntersectionObserver((entries)=>{
 for(const item of entries)if(item.isIntersecting){visible.unobserve(item.target);enqueue(item.target)}
},{rootMargin:"150px 0px"});
function observeRow(row){
 if(!row||watched.has(row))return;
 watched.add(row);
 if(row.matches(".bubble")&&!row.querySelector(".dm-text")){
  const child=[...row.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
  if(child){const t=document.createElement("span");t.className="dm-text";row.replaceChild(t,child);t.appendChild(child)}
 }
 if(!contentNode(row))return;
 tools(row);
 if(autoEnabled())visible.observe(row);
}
let scanScheduled=false;
function scan(){
 scanScheduled=false;
 for(const row of document.querySelectorAll("#channelMessages .discord-message,#msgs .bubble"))observeRow(row);
}
function scheduleScan(){
 if(scanScheduled)return;scanScheduled=true;
 requestAnimationFrame(scan);
}
function changed(){
 epoch++;waiting.length=0;failedCache.clear();
 for(const row of document.querySelectorAll(".discord-message,.bubble")){
  row.removeAttribute("data-cmd-auto-done");modeOriginal(row);
  if(autoEnabled())visible.observe(row);
 }
 scheduleScan();
}
document.addEventListener("click",ev=>{
 const button=ev.target.closest(".cmd-original-action");
 if(button){
  ev.preventDefault();const row=findMessage(button);if(!row)return;
  const original=contentNode(row),display=row.querySelector(".cmd-translation-output");
  if(!original||!display)return;
  const showingOriginal=!display.hidden;
  original.hidden=showingOriginal;display.hidden=!showingOriginal;
  button.textContent=showingOriginal?"Voir la traduction":"Voir l’original";
  return;
 }
 const manual=ev.target.closest(".cmd-translate-action");
 if(manual){
  ev.preventDefault();const row=findMessage(manual);if(row){
   failedCache.delete(cacheKey(originalText(row),actualLang()));
   doTranslate(row,true);
  }
 }
});
document.addEventListener("change",ev=>{
 if(ev.target?.matches?.("#cmd-sphere-language,#cmdLanguageChoice"))setTimeout(changed,0);
});
window.addEventListener("storage",ev=>{
 if(ev.key==="cmd-sphere-language"||ev.key==="cmd-sphere-auto-translate")changed();
});
function boot(){
 const css=document.createElement("style");css.id="cmd-auto-translate-css";
 css.textContent='.discord-message .msg-text[hidden],.bubble .dm-text[hidden],.cmd-translation-output[hidden],.cmd-translation-tools button[hidden]{display:none!important}'+
 '.cmd-translation-output{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;max-width:100%;color:inherit}'+
 '.cmd-translation-output[data-state="translated"]{border-left:3px solid #9e7dd2;padding:8px 10px;border-radius:5px;background:#7861a525}'+
 '.cmd-translation-tools{display:flex;gap:9px;flex-wrap:wrap;align-items:center;max-width:100%}'+
 '.cmd-translation-tools button{cursor:pointer}.cmd-translation-tools button:disabled{opacity:.55}';
 document.head.appendChild(css);
 const observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.(".discord-message,.bubble")||n.querySelector?.(".discord-message,.bubble")))))scheduleScan();
 });
 observer.observe(document.body,{childList:true,subtree:true});
 scheduleScan();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();