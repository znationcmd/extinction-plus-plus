/* CMD Sphere: translate incoming visible messages automatically into each reader's
   chosen language. Keep the original in the DOM, never overwrite the original
   in the database or modify any Discord server. External free providers may fail. */
(function(){
"use strict";
const names={fr:"Français",en:"English",us:"English (US)",de:"Deutsch",es:"Español",it:"Italiano",ru:"Русский",ko:"한국어",ja:"日本語",zh:"中文",co:"Corsu"};
const cache=new Map(),pending=new Set(),visible=new Map();
const MAX=1700,WAIT=4200,CONCURRENT=1;
let queue=[],running=0,lastRequest=0,suspendedUntil=0,scanTimer=0;
const firstSource=txt=>{
 const t=String(txt||"").toLowerCase();
 if(/[\u0400-\u052f]/.test(t))return"ru";
 if(/[\uac00-\ud7af]/.test(t))return"ko";
 if(/[\u3040-\u30ff]/.test(t))return"ja";
 if(/[\u3400-\u9fff]/.test(t))return"zh";
 const count=re=>(t.match(re)||[]).length;
 const fr=count(/\b(bonjour|salut|merci|vous|avec|pour|dans|est|une|comment|ça|des|le|les|je|suis)\b/g);
 const en=count(/\b(hello|thanks|please|you|your|with|this|there|the|and|good|what|how|are|can)\b/g);
 const es=count(/\b(hola|gracias|buenos|buenas|como|estás|por|favor)\b/g);
 const it=count(/\b(ciao|grazie|buongiorno|come|prego|buonasera)\b/g);
 const de=count(/\b(hallo|danke|guten|morgen|wie|bitte|tschüss)\b/g);
 const vals={fr,en,es,it,de};const max=Math.max(...Object.values(vals));
 return max?Object.keys(vals).find(k=>vals[k]===max):"auto";
};
function language(){
 try{const choice=document.getElementById("cmd-sphere-language")?.value||localStorage.getItem("cmd-sphere-language")||"fr";
 return names[choice]?choice:"fr";}catch{return"fr"}
}
const keyFor=(text,lang)=>lang+"|"+text;
function row(el){return el.closest(".discord-message,.bubble")}
function originalNode(article){
 return article.querySelector(".msg-text,.dm-text")||article.querySelector(".msg-embed");
}
function controls(article){
 let area=article.querySelector(".cmd-translation-tools");
 if(!area){
  area=document.createElement("div");area.className="cmd-translation-tools";
  (article.querySelector(".msg-main")||article).append(area);
 }
 let showOriginal=area.querySelector(".cmd-original-action");
 if(!showOriginal){
  showOriginal=document.createElement("button");showOriginal.type="button";
  showOriginal.className="cmd-original-action";showOriginal.hidden=true;
  showOriginal.textContent="Voir l’original";area.append(showOriginal);
 }
 let retry=area.querySelector(".cmd-translate-action");
 if(!retry){
  retry=document.createElement("button");retry.type="button";retry.className="cmd-translate-action";
  retry.textContent="Traduire";retry.hidden=true;area.append(retry);
 }
 return{area,showOriginal,retry};
}
function translationNode(article){
 let node=article.querySelector(".cmd-translation-output");
 if(!node){
  node=document.createElement("div");node.className="cmd-translation-output";
  node.setAttribute("lang",language()==="us"?"en":language());
  (article.querySelector(".msg-main")||article).append(node);
 }
 return node;
}
function showOriginal(article){
 const source=originalNode(article);if(source)source.hidden=false;
 article.querySelector(".cmd-translation-output")?.setAttribute("hidden","");
 article.classList.remove("cmd-auto-translated");
 const {showOriginal:button,retry}=controls(article);
 button.hidden=true;
 if(article.dataset.cmdTranslated==="1"){retry.hidden=false;retry.textContent="Voir la traduction"}
}
function showTranslated(article,translated,lang,sourceLang){
 const source=originalNode(article);if(!source)return;
 const node=translationNode(article);node.textContent=translated;
 node.hidden=false;node.setAttribute("lang",lang==="us"?"en":lang);
 node.dataset.state="translated";source.hidden=true;
 article.classList.add("cmd-auto-translated");
 const {showOriginal:button,retry}=controls(article);button.hidden=false;retry.hidden=true;
 article.dataset.cmdTranslated="1";article.dataset.cmdOriginalLanguage=sourceLang||"auto";
}
function showFailure(article){
 const source=originalNode(article);if(source)source.hidden=false;
 const node=article.querySelector(".cmd-translation-output");if(node)node.hidden=true;
 article.classList.remove("cmd-auto-translated");
 const {showOriginal:button,retry}=controls(article);
 button.hidden=true;retry.hidden=false;retry.textContent="Traduire";
 retry.title="Le service gratuit est indisponible pour ce message. Réessayer.";
 // A transient provider error must never replace the user's message with a red box.
}
async function translate(message,target){
 const source=firstSource(message);
 if(source===target||(source==="en"&&target==="us"))return{unchanged:true,sourceLanguage:source};
 const response=await fetch("/api/cmd/translate-message",{
   method:"POST",credentials:"same-origin",cache:"no-store",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({text:message,target,source:source==="auto"?"auto":source})
 });
 const json=await response.json().catch(()=>({}));
 if(response.ok&&json.translatedText){
  const detected=json.sourceLanguage||source;
  if((detected===target)||(detected==="en"&&target==="us")||json.translatedText.trim()===message.trim())
    return{unchanged:true,sourceLanguage:detected};
  return{translatedText:json.translatedText,sourceLanguage:detected};
 }
 // Fallback uses the free provider's browser CORS endpoint only if it is reachable.
 const actual=target==="us"?"en":target;
 const from=source==="auto"?(actual==="fr"?"en":"fr"):source;
 if(from===actual) return{unchanged:true,sourceLanguage:from};
 const chunks=[];let part="";
 for(const cp of message){
  if(new TextEncoder().encode(part+cp).length>440){if(part)chunks.push(part);part=cp}
  else part+=cp;
 }
 if(part)chunks.push(part);
 if(chunks.length>6)throw Error("Trop long");
 const translations=[];
 for(const chunk of chunks){
  const url="https://api.mymemory.translated.net/get?"+new URLSearchParams({q:chunk,langpair:from+"|"+actual});
  const r=await fetch(url,{mode:"cors",cache:"no-store",headers:{accept:"application/json"}});
  if(!r.ok)throw Error("Service indisponible");
  const obj=await r.json(),result=String(obj?.responseData?.translatedText||"").trim();
  if(Number(obj?.responseStatus)!==200||!result||/^MYMEMORY WARNING/i.test(result))throw Error("Traduction indisponible");
  // Convert HTML entities safely without rendering HTML.
  const element=document.createElement("textarea");element.innerHTML=result;
  translations.push(element.value);
 }
 const translatedText=translations.join(" ").trim();
 if(translatedText===message.trim())return{unchanged:true,sourceLanguage:from};
 return{translatedText,sourceLanguage:from};
}
function articleKey(article){
 const source=originalNode(article),text=source?.textContent?.trim()||"";
 return{text,lang:language(),key:keyFor(text,language())};
}
function complete(article,key){
 if(!article.isConnected)return;
 const {text,lang,key:now}=articleKey(article);if(now!==key||!text)return;
 const cached=cache.get(key);
 if(cached?.translatedText)showTranslated(article,cached.translatedText,lang,cached.sourceLanguage);
 else if(cached?.unchanged){
  showOriginal(article);
  const {retry}=controls(article);retry.hidden=true;
 }else showFailure(article);
}
function pump(){
 if(running>=CONCURRENT||!queue.length)return;
 const now=Date.now();
 if(now<suspendedUntil)return;
 // The free API cannot translate dozens of messages per second.
 const delay=Math.max(0,WAIT-(now-lastRequest));
 if(delay>0){window.setTimeout(pump,delay);return}
 const task=queue.shift(),key=task.key;
 if(pending.has(key)){pump();return}
 running++;pending.add(key);lastRequest=Date.now();
 translate(task.text,task.lang).then(result=>{
   cache.set(key,result);visible.delete(key);
   for(const article of document.querySelectorAll(".discord-message,.bubble")){
     if(articleKey(article).key===key)complete(article,key);
   }
 }).catch(()=>{
   cache.set(key,{failed:true});
   suspendedUntil=Date.now()+30000;
   for(const article of document.querySelectorAll(".discord-message,.bubble")){
     if(articleKey(article).key===key)showFailure(article);
   }
 }).finally(()=>{running--;pending.delete(key);window.setTimeout(pump,WAIT)});
}
function queueMessage(article,force=false){
 const source=originalNode(article),text=source?.textContent?.trim()||"";
 if(!text||text.length>MAX)return;
 const lang=language(),origin=firstSource(text),key=keyFor(text,lang);
 if(origin===lang||(origin==="en"&&lang==="us")){
   const {retry}=controls(article);retry.hidden=true;
   return;
 }
 const remembered=cache.get(key);
 if(remembered&&!force){complete(article,key);return}
 if(force){cache.delete(key);suspendedUntil=0}
 if(pending.has(key)||queue.some(x=>x.key===key))return;
 queue.push({key,lang,text});pump();
}
let viewportObserver=null;
function observe(article){
 if(article.dataset.cmdTranslationObserved==="1")return;
 const source=originalNode(article);if(!source)return;
 if(article.classList.contains("bubble")&&!article.querySelector(".dm-text")){
   const node=[...article.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
   if(node){const span=document.createElement("span");span.className="dm-text";node.replaceWith(span);span.append(node)}
 }
 article.dataset.cmdTranslationObserved="1";
 const {retry}=controls(article);retry.hidden=true;
 if(viewportObserver)viewportObserver.observe(article);
 else queueMessage(article);
}
function scan(){
 const lists=document.querySelectorAll("#channelMessages .discord-message,#msgs .bubble");
 for(const article of lists)observe(article);
}
function scheduleScan(){if(scanTimer)return;scanTimer=window.setTimeout(()=>{scanTimer=0;scan()},150)}
function resetLanguage(){
 queue=[];cache.clear();suspendedUntil=0;
 for(const article of document.querySelectorAll(".discord-message,.bubble")){
  article.dataset.cmdTranslationObserved="";
  article.dataset.cmdTranslated="";
  const source=originalNode(article);if(source)source.hidden=false;
  const node=article.querySelector(".cmd-translation-output");if(node)node.hidden=true;
  const original=article.querySelector(".cmd-original-action");if(original)original.hidden=true;
  const retry=article.querySelector(".cmd-translate-action");if(retry)retry.hidden=true;
  article.classList.remove("cmd-auto-translated");
  viewportObserver?.unobserve(article);
 }
 scheduleScan();
}
document.addEventListener("click",event=>{
 const original=event.target.closest(".cmd-original-action");
 if(original){
  event.preventDefault();const article=row(original);if(!article)return;
  showOriginal(article);return;
 }
 const retry=event.target.closest(".cmd-translate-action");if(!retry)return;
 event.preventDefault();const article=row(retry);if(!article)return;
 const data=articleKey(article),remembered=cache.get(data.key);
 if(remembered?.translatedText){showTranslated(article,remembered.translatedText,data.lang,remembered.sourceLanguage);return}
 queueMessage(article,true);
 retry.hidden=true;
});
document.addEventListener("change",event=>{
 if(event.target?.id==="cmd-sphere-language"){
  resetLanguage();
 }
});
document.addEventListener("DOMContentLoaded",scheduleScan,{once:true});
if(document.readyState!=="loading")scheduleScan();
if(typeof IntersectionObserver==="function"){
 viewportObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){if(entry.isIntersecting){viewportObserver.unobserve(entry.target);queueMessage(entry.target)}}
 },{rootMargin:"120px 0px"});
}
const domObserver=new MutationObserver(records=>{
 if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&
 !node.classList?.contains("cmd-translation-output")&&!node.classList?.contains("cmd-translation-tools")&&
 !node.classList?.contains("cmd-translation-target"))))scheduleScan();
});
function attach(){if(document.body)domObserver.observe(document.body,{subtree:true,childList:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",attach,{once:true});else attach();
const css=document.createElement("style");
css.textContent='.cmd-auto-translated .msg-text[hidden],.cmd-auto-translated .dm-text[hidden],.cmd-translation-output[hidden],.cmd-translation-tools button[hidden]{display:none!important}.cmd-translation-output{white-space:pre-wrap;overflow-wrap:anywhere;color:inherit;background:transparent;border:0;padding:0;margin:5px 0}.cmd-translation-tools{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}.cmd-translation-tools button{font-size:11px;color:#bda7ef;background:transparent;border:0;padding:3px 5px;cursor:pointer}.cmd-translation-tools button:hover{text-decoration:underline}.bubble .cmd-translation-output{color:inherit!important;background:transparent!important;border:0!important;padding:0!important}.bubble .cmd-translation-tools button[hidden]{display:none!important}';
(document.head||document.documentElement).append(css);
})();
