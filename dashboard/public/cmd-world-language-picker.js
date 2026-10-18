/* CMD universal language picker — 8148 ISO 639-3 / BCP47 entries.
 * A language preference is NOT a claim that every interface text is translated.
 * Works without cookies, API keys, databases, tracking or paid services.
 */
(function(){
 "use strict";
 if(typeof window==="undefined"||window.CMDWorldLanguagePicker)return;
 const tag=/^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,5}(?:-x(?:-[a-z0-9]{1,8}){1,5})?$/i;
 const originalChoices=["fr","en","us","de","es","it","ru","ko","ja","zh","co","pt"];
 const status={languages:null,loading:null};
 const existing=()=>{
  try{const chosen=localStorage.getItem("cmd-world-language");if(chosen)return chosen}catch{}
  // Use the visitor's actual browser language, not an assumed country or IP location.
  const preferred=typeof navigator!=="undefined"?(navigator.languages||[navigator.language]).filter(Boolean):[];
  return preferred[0]||"fr";
 };
 const root=document.createElement("div");
 root.id="cmd-world-language-root";
 root.style.cssText="position:fixed;right:14px;bottom:14px;z-index:2147483000;pointer-events:none";
 const shadow=root.attachShadow({mode:"open"});
 const style=document.createElement("style");
 style.textContent=`
*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}
.trigger{pointer-events:auto;display:flex;gap:6px;align-items:center;justify-content:center;min-width:51px;min-height:48px;padding:9px;border:1px solid #9772ff;color:#fff;border-radius:15px;background:linear-gradient(145deg,#281443,#111322);box-shadow:0 8px 28px #0008}
.panel{pointer-events:auto;position:absolute;bottom:58px;right:0;width:min(360px,calc(100vw - 25px));height:min(510px,calc(100dvh - 100px));padding:16px;display:flex;flex-direction:column;gap:10px;color:#f8f4ff;border:1px solid #9b69ec;border-radius:18px;background:#111323;box-shadow:0 14px 40px #000b;font:14px/1.4 system-ui,-apple-system,Arial,sans-serif}
.panel[hidden]{display:none}.head{display:flex;align-items:center;justify-content:space-between;gap:12px}.head strong{font-size:16px}
.close{border:1px solid #65517c;border-radius:10px;background:#27203b;color:#fff;padding:5px 12px}
input{min-height:42px;border:1px solid #604984;border-radius:10px;background:#202239;color:#fff;padding:9px;width:100%;outline-offset:2px}
.results{min-height:80px;overflow-y:auto;flex:1;border:1px solid #2d2541;border-radius:9px}
.choice{display:block;width:100%;background:transparent;color:#e9e6f5;border:0;border-bottom:1px solid #342e4c;text-align:left;padding:9px 10px;overflow-wrap:anywhere}
.choice:hover,.choice:focus{background:#352052}
.letter{margin:0;border-bottom:1px solid #342e4c}
.letter>summary{display:flex;justify-content:space-between;align-items:center;padding:12px;cursor:pointer;min-height:44px;font-weight:750;background:#1d1730;list-style-position:inside}
.letter>summary:hover,.letter>summary:focus-visible{background:#33204c}
.letter[open]>summary{background:#392153}
.letter .choice{padding-left:22px}
.letter small{color:#cbb5e5;font-weight:500}
.choice[aria-selected="true"]{color:#dbbcff;background:#322044}
.results>p{padding:12px;margin:0}
.muted{font-size:12px;color:#cfc4e9;line-height:1.45;margin:0}
.status{font-size:12px;color:#bcefd3;min-height:20px;overflow-wrap:anywhere}
`;
 const trigger=document.createElement("button");trigger.type="button";trigger.className="trigger";
 trigger.setAttribute("aria-label","Choisir une langue ou un dialecte");
 trigger.title="Langues du monde, y compris le suisse allemand";trigger.textContent="🌐";
 const panel=document.createElement("section");panel.className="panel";panel.hidden=true;
 panel.setAttribute("aria-label","Langues et dialectes du monde");panel.setAttribute("role","dialog");
 const head=document.createElement("div");head.className="head";
 const title=document.createElement("strong");title.textContent="🌐 Langues du monde";
 const close=document.createElement("button");close.type="button";close.className="close";close.textContent="Fermer";head.append(title,close);
 const query=document.createElement("input");query.type="search";query.placeholder="Rechercher : suisse allemand, bernois, gsw-CH…";
 query.setAttribute("aria-label","Rechercher une langue ou un dialecte");
 const results=document.createElement("div");results.className="results";results.setAttribute("role","group");results.setAttribute("aria-label","Langues classées de A à Z");
 const custom=document.createElement("input");custom.type="text";custom.maxLength=64;
 custom.placeholder="Code régional personnel : gsw-CH-x-bern";
 custom.setAttribute("aria-label","Code de langue régional BCP 47");
 const applyCustom=document.createElement("button");applyCustom.type="button";applyCustom.className="close";applyCustom.textContent="Utiliser ce code";
 const note=document.createElement("p");note.className="muted";
 note.textContent="Les 8 148 codes identifient des langues, pas 8 148 traductions. Si une interface n'est pas traduite, elle garde sa langue existante. Le dialecte suisse allemand peut utiliser l'allemand standard comme secours.";
 const msg=document.createElement("p");msg.className="status";msg.setAttribute("role","status");
 const customRow=document.createElement("div");customRow.append(custom,applyCustom);
 panel.append(head,query,results,customRow,note,msg);
 shadow.append(style,panel,trigger);
 function fallback(code){
  const base=String(code).split("-")[0].toLowerCase();
  return ({gsw:"de",fra:"fr",eng:"en",deu:"de",ger:"de",spa:"es",ita:"it",zho:"zh",cos:"co",por:"pt"})[base]||base;
 }
 function validate(input){
  const raw=String(input||"").trim();if(!tag.test(raw)||raw.length>64)return null;
  try{return Intl.getCanonicalLocales(raw)[0]||null}catch{return null}
 }
 function save(code,label){
  const safe=validate(code);if(!safe){msg.textContent="Code BCP 47 invalide.";return}
  const fb=fallback(safe);
  try{localStorage.setItem("cmd-world-language",safe)}catch{}
  document.documentElement.lang=safe;
  const ids=["language","mobile-language","lng","cmd-sphere-language","cmdLanguageChoice","cmdSettingsLanguagePicker"];
  for(const id of ids){
   const select=document.getElementById(id);
   if(!select||select.tagName!=="SELECT")continue;
   const candidates=[safe,fb,fb==="en"?"us":""];
   const match=candidates.find(c=>c&&[...select.options].some(option=>option.value===c));
   if(match&&select.value!==match){
    select.value=match;select.dispatchEvent(new Event("change",{bubbles:true}));
   }
  }
  const known=originalChoices.includes(fb);
  // Notify the individual applications, including CMD Sphere settings and React views.
  try{localStorage.setItem("cmd-sphere-language",known?fb:safe)}catch{}
  window.dispatchEvent(new CustomEvent("cmd-sphere-language-change",{detail:{language:known?fb:safe,selectedLanguage:safe}}));
  window.dispatchEvent(new CustomEvent("cmd-language-change",{detail:{language:safe,fallback:fb}}));
  if(known){
   const legacyKeys=["cmdLang","cmdpad-language","cmdpad-ui-lang","dayz-gate-language","ark-language","cmd-browser-lang"];
   for(const key of legacyKeys){try{if(localStorage.getItem(key)!==null)localStorage.setItem(key,fb)}catch{}}
  }
  window.dispatchEvent(new CustomEvent("cmd-world-language-change",{detail:{language:safe,fallback:fb}}));
  msg.textContent="✓ "+(label||safe)+" sélectionné : "+safe+". "+(safe!==fb?"Interface existante : "+fb+" si disponible.":"");
  trigger.setAttribute("aria-label","Langue choisie : "+safe);
  trigger.title="Langue : "+safe;
 }
 function normalized(value){return String(value||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLocaleLowerCase()}
 function render(){
  results.replaceChildren();
  if(!status.languages){results.textContent="Chargement du catalogue…";return}
  const needle=normalized(query.value.trim());
  const buckets=new Map();
  for(const [code,name] of status.languages){
   if(needle&&!normalized(code+" "+name).includes(needle))continue;
   const first=normalized(name).charAt(0).toUpperCase();
   const letter=/^[A-Z]$/.test(first)?first:"#";
   if(!buckets.has(letter))buckets.set(letter,[]);
   buckets.get(letter).push([code,name]);
  }
  const letters=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter(letter=>buckets.has(letter));
  if(buckets.has("#"))letters.push("#");
  if(!letters.length){const none=document.createElement("p");none.textContent="Aucune langue correspondante.";results.append(none);return}
  const selected=existing();
  for(const letter of letters){
   const rows=buckets.get(letter);
   const section=document.createElement("details");section.className="letter";
   const summary=document.createElement("summary");
   const heading=document.createElement("span");heading.textContent=letter==="#"?"Autres":letter;
   const count=document.createElement("small");count.textContent=rows.length+" langues";
   summary.append(heading,count);section.append(summary);
   const entries=document.createElement("div");entries.setAttribute("role","listbox");entries.setAttribute("aria-label","Langues "+letter);section.append(entries);
   // Create options only when a letter opens: all 8,148 entries remain accessible
   // without generating thousands of interactive DOM nodes at every keystroke.
   const fill=()=>{
    if(entries.childElementCount)return;
    const fragment=document.createDocumentFragment();
    for(const [code,name] of rows){
     const button=document.createElement("button");button.type="button";button.className="choice";
     button.setAttribute("role","option");button.setAttribute("aria-selected",String(code===selected));
     button.textContent=name+" · "+code;
     button.addEventListener("click",()=>{save(code,name);panel.hidden=true;trigger.setAttribute("aria-expanded","false")});
     fragment.append(button);
    }
    entries.append(fragment);
   };
   section.addEventListener("toggle",()=>{if(section.open)fill()});
   // Short search results expand directly; larger matches stay neatly grouped.
   if(needle&&rows.length<=35){section.open=true;fill()}
   results.append(section);
  }
 }
 async function load(){
  if(status.languages)return;
  if(!status.loading){
   status.loading=fetch("/cmd-world-languages.json",{cache:"force-cache"})
    .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
    .then(o=>{if(!Array.isArray(o.languages)||o.languages.length<8000)throw Error("Catalogue incomplet");status.languages=o.languages})
    .catch(e=>{msg.textContent="Catalogue indisponible : "+e.message+". Saisie régionale possible.";results.textContent="Recherche indisponible."})
    .finally(()=>{status.loading=null;render()});
  }
  await status.loading;
 }
 async function toggle(){panel.hidden=!panel.hidden;trigger.setAttribute("aria-expanded",String(!panel.hidden));if(!panel.hidden){query.focus();await load();}}
 trigger.addEventListener("click",toggle);
 close.addEventListener("click",()=>{panel.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus()});
 query.addEventListener("input",render);
 applyCustom.addEventListener("click",()=>save(custom.value,custom.value));
 custom.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();save(custom.value,custom.value)}});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden){panel.hidden=true;trigger.setAttribute("aria-expanded","false")}});
 document.addEventListener("DOMContentLoaded",()=>{if(!document.getElementById(root.id))document.body.append(root)},{once:true});
 if(document.readyState!=="loading")document.body.append(root);
 const saved=existing();if(validate(saved)){
  document.documentElement.lang=saved;
  // Synchronize the initial preference once widgets and app menus have mounted.
  const signal=()=>window.dispatchEvent(new CustomEvent("cmd-world-language-change",{detail:{language:saved,fallback:fallback(saved),initial:true}}));
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",signal,{once:true});else queueMicrotask(signal);
 }
 window.CMDWorldLanguagePicker={get language(){return existing()},open:()=>{if(panel.hidden)void toggle()},set:(code)=>save(code,code)};
})();
