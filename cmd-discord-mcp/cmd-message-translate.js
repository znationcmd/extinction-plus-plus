/* One tap / one message. Original text is never replaced or stored as a translation. */
(function(){
"use strict";
const supported={fr:"Français",en:"English",us:"English (US)",de:"Deutsch",es:"Español",it:"Italiano",ru:"Русский",ko:"한국어",ja:"日本語",zh:"中文",co:"Corsu",pt:"Português"};
function language(){try{const e=document.querySelector("#cmd-sphere-language");return supported[e?.value]?e.value:supported[localStorage.getItem("cmd-sphere-language")]?localStorage.getItem("cmd-sphere-language"):"fr"}catch{return"fr"}}
function row(btn){return btn.closest(".discord-message")}
function show(original,txt,type){
  let translation=original.querySelector(".cmd-translation-output");
  if(!translation){translation=document.createElement("div");translation.className="cmd-translation-output";const area=original.querySelector(".msg-main");area?.appendChild(translation)}
  translation.hidden=false;translation.textContent=txt;translation.dataset.state=type;
  return translation;
}
document.addEventListener("click",async ev=>{
  const btn=ev.target.closest(".cmd-translate-action");
  if(!btn)return;
  ev.preventDefault();
  const article=row(btn);if(!article)return;
  const hideBtn=article.querySelector(".cmd-original-action");
  const original=article.querySelector(".msg-text");
  if(!original?.textContent.trim()){show(article,"Ce message ne contient pas de texte à traduire.","error");return}
  const lang=language(),name=supported[lang]||lang;
  const content=original.textContent;
  if(content.length>1700){show(article,"Message trop long pour le service de traduction gratuit (1 700 caractères maximum).","error");return}
  btn.disabled=true;btn.textContent="Traduction…";
  show(article,"Traduction en "+name+" en cours…","loading");
  try{
    const res=await fetch("/api/cmd/translate-message",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({text:content,target:lang,source:"auto"})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.translatedText)throw Error(data.error||"Service de traduction indisponible");
    show(article,data.translatedText,"translated");
    btn.hidden=true;
    if(hideBtn)hideBtn.hidden=false;
  }catch(error){show(article,"Traduction indisponible : "+error.message+". Le message original est conservé.","error")}
  finally{btn.disabled=false;btn.textContent="🌐 Traduire"}
});
document.addEventListener("click",ev=>{
  const btn=ev.target.closest(".cmd-original-action");if(!btn)return;
  ev.preventDefault();const article=row(btn);if(!article)return;
  const output=article.querySelector(".cmd-translation-output");if(output)output.hidden=true;
  btn.hidden=true;const translate=article.querySelector(".cmd-translate-action");if(translate)translate.hidden=false;
});
})();