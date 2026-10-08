/* One tap / one message. Original text is never replaced or stored as a translation. */
(function(){
"use strict";
const visibleTranslations=new Map();
const supported={fr:"Français",en:"English",us:"English (US)",de:"Deutsch",es:"Español",it:"Italiano",ru:"Русский",ko:"한국어",ja:"日本語",zh:"中文",co:"Corsu",pt:"Português"};
function language(){try{const e=document.querySelector("#cmd-sphere-language");return supported[e?.value]?e.value:supported[localStorage.getItem("cmd-sphere-language")]?localStorage.getItem("cmd-sphere-language"):"fr"}catch{return"fr"}}

const targetOptions=Object.entries(supported);
function addTargetPickers(root){
  if(!root)return;
  const tools=root.querySelectorAll(".cmd-translation-tools:not([data-language-picker-ready])");
  for(const group of tools){
    group.dataset.languagePickerReady="1";
    const button=group.querySelector(".cmd-translate-action");
    if(!button)continue;
    const select=document.createElement("select");
    select.className="cmd-translation-target";
    select.setAttribute("aria-label","Langue de traduction du message");
    select.title="Choisir la langue de traduction";
    for(const [code,label] of targetOptions){
      const o=document.createElement("option");o.value=code;o.textContent=label;select.appendChild(o);
    }
    select.value=language();
    select.addEventListener("change",()=>{
      try{localStorage.setItem("cmd-sphere-language",select.value)}catch{}
      const global=document.querySelector("#cmd-sphere-language");
      if(global){global.value=select.value;global.dispatchEvent(new Event("change",{bubbles:true}))}
      root.querySelectorAll(".cmd-translation-target").forEach(picker=>{
        if(picker!==select)picker.value=select.value;
      });
    });
    group.insertBefore(select,button);
  }
}

function row(btn){return btn.closest(".discord-message,.bubble")}
function show(original,txt,type){
  let translation=original.querySelector(".cmd-translation-output");
  if(!translation){translation=document.createElement("div");translation.className="cmd-translation-output";const area=original.querySelector(".msg-main")||original;area?.appendChild(translation)}
  translation.hidden=false;translation.textContent=txt;translation.dataset.state=type;
  return translation;
}
document.addEventListener("click",async ev=>{
  const btn=ev.target.closest(".cmd-translate-action");
  if(!btn)return;
  ev.preventDefault();
  const article=row(btn);if(!article)return;
  const hideBtn=article.querySelector(".cmd-original-action");
  const original=article.querySelector(".msg-text,.dm-text");
  if(!original?.textContent.trim()){show(article,"Ce message ne contient pas de texte à traduire.","error");return}
  const chosen=article.querySelector(".cmd-translation-target")?.value;
  const lang=supported[chosen]?chosen:language(),name=supported[lang]||lang;
  const content=original.textContent;
  if(content.length>1700){show(article,"Message trop long pour le service de traduction gratuit (1 700 caractères maximum).","error");return}
  btn.disabled=true;btn.textContent="Traduction…";
  show(article,"Traduction en "+name+" en cours…","loading");
  try{
    const res=await fetch("/api/cmd/translate-message",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({text:content,target:lang,source:"auto"})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.translatedText)throw Error(data.error||"Service de traduction indisponible");
    show(article,data.translatedText,"translated");
    const id=String(article.dataset.messageId||"");
    if(id){
      visibleTranslations.set(id,{lang,original:content,translation:data.translatedText});
      if(visibleTranslations.size>140)visibleTranslations.delete(visibleTranslations.keys().next().value);
    }
    btn.hidden=true;
    if(hideBtn)hideBtn.hidden=false;
  }catch(error){show(article,"Traduction indisponible : "+error.message+". Le message original est conservé.","error")}
  finally{btn.disabled=false;btn.textContent="🌐 Traduire"}
});
document.addEventListener("click",ev=>{
  const btn=ev.target.closest(".cmd-original-action");if(!btn)return;
  ev.preventDefault();const article=row(btn);if(!article)return;
  const output=article.querySelector(".cmd-translation-output");if(output)output.hidden=true;
  const id=String(article.dataset.messageId||"");if(id)visibleTranslations.delete(id);
  btn.hidden=true;const translate=article.querySelector(".cmd-translate-action");if(translate)translate.hidden=false;
});

// A new message can cause the conversation to re-render. Keep previously requested
// translations visible without a second external request or saving private text to disk.
function restoreVisibleTranslations(){
  const box=document.querySelector("#channelMessages");
  if(!box||!visibleTranslations.size)return;
  for(const article of box.querySelectorAll("article.discord-message[data-message-id]")){
    const state=visibleTranslations.get(String(article.dataset.messageId||""));
    if(!state||state.lang!==language())continue;
    const original=article.querySelector(".msg-text");
    if(!original||original.textContent!==state.original)continue;
    const translated=article.querySelector(".cmd-translation-output");
    if(!translated||translated.hidden||translated.textContent!==state.translation){
      show(article,state.translation,"translated");
      const action=article.querySelector(".cmd-translate-action"),revert=article.querySelector(".cmd-original-action");
      if(action)action.hidden=true;if(revert)revert.hidden=false;
    }
  }
}
function attachChannelObserver(){
  const box=document.querySelector("#channelMessages");
  if(!box)return;
  const observer=new MutationObserver(()=>{addTargetPickers(box);restoreVisibleTranslations()});
  observer.observe(box,{childList:true});
  addTargetPickers(box);restoreVisibleTranslations();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",attachChannelObserver,{once:true});else attachChannelObserver();

// Private/group CMD conversations share the same explicit translation controls.
// Keep re-rendering inexpensive: only decorate new DOM nodes.
function decoratePrivateMessages(){
  const container=document.querySelector("#msgs");if(!container)return;
  for(const item of container.querySelectorAll(".bubble:not([data-cmd-translatable])")){
    item.dataset.cmdTranslatable="1";
    const node=[...item.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
    if(!node)continue;
    const content=document.createElement("span");content.className="dm-text";
    node.parentNode.replaceChild(content,node);content.appendChild(node);
    const tools=document.createElement("div");tools.className="cmd-translation-tools";
    const button=document.createElement("button");button.type="button";button.className="cmd-translate-action";button.textContent="🌐 Traduire";button.title="Traduction gratuite à la demande : le texte est envoyé au service de traduction externe";
    const original=document.createElement("button");original.type="button";original.className="cmd-original-action";original.hidden=true;original.textContent="Voir l’original";
    tools.append(button,original);item.appendChild(tools);
  }
}
function bootPrivate(){
  const box=document.querySelector("#msgs");if(!box)return;
  const style=document.createElement("style");
  style.textContent=".bubble .dm-text{white-space:pre-wrap;overflow-wrap:anywhere}.bubble .cmd-translation-tools{display:flex;gap:8px;flex-wrap:wrap;max-width:100%;margin-top:7px}.bubble .cmd-translation-tools button{font-size:12px;color:#ead6ff;background:#5c458f;border:0;border-radius:7px;padding:6px 9px}.bubble .cmd-translation-tools select{background:#20192e;color:#f3e9ff;border:1px solid #8c70b3;border-radius:7px;padding:5px 7px;max-width:100%;width:120px;font-size:12px}.bubble .cmd-translation-tools button[hidden],.bubble .cmd-translation-output[hidden]{display:none!important}.bubble .cmd-translation-output{margin-top:8px;max-width:100%;overflow-wrap:anywhere;border-left:3px solid #c1a4ff;background:#221a36;padding:8px;border-radius:5px}.bubble .cmd-translation-output[data-state=error]{color:#ffcece;border-color:#ff7878}";
  document.head.appendChild(style);
  decoratePrivateMessages();addTargetPickers(box);
  const observer=new MutationObserver(()=>{decoratePrivateMessages();addTargetPickers(box)});
  observer.observe(box,{childList:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootPrivate,{once:true});else bootPrivate();

})();