/* CMD Sphere: local unsaved profile form recovery. Server database remains authoritative after a successful save. */
(()=>{
"use strict";
const form=document.getElementById("profileForm");
if(!form||window.__cmdProfileDraft)return;
window.__cmdProfileDraft=true;
const user=String(form.dataset.userId||""),guild=String(form.elements.guildId?.value||"main");
if(!user)return;
const key="cmd_sphere_profile_draft_v2:"+user+":"+guild;
const names=["displayName","pronouns","bio","status","nameStyle","accentColor","avatarDecoration","profileEffect","profileFrame","nameplateStyle","featuredTagGuildId","roleId","serverTag","serverTagIcon","serverTagStyle","badgePack"];
const read=()=>{
const values={};
for(const name of names){const f=form.elements.namedItem(name);if(f&&typeof f.value==="string")values[name]=f.value}
values.badges=Array.from(form.querySelectorAll("[data-badge]:checked")).map(x=>x.value);
return values;
};
const safeStorage={get(){try{return localStorage.getItem(key)}catch{return null}},set(v){try{localStorage.setItem(key,v)}catch{}},remove(){try{localStorage.removeItem(key)}catch{}}};
let initial=JSON.stringify(read()),savedAt=0,dirty=false;
function syncSelectors(){
for(const [selector,name] of [[".decoTile","avatarDecoration"],[".effectTile","profileEffect"],[".frameTile","profileFrame"],[".nameplateTile","nameplateStyle"],[".tagPick","featuredTagGuildId"]]){
const value=String(form.elements.namedItem(name)?.value||"");
document.querySelectorAll(selector).forEach(b=>b.classList.toggle("selected",b.dataset.value===value));
}
}
function write(d){
if(!d||typeof d!=="object")return;
for(const name of names){
if(!Object.prototype.hasOwnProperty.call(d,name)||typeof d[name]!=="string")continue;
const field=form.elements.namedItem(name);
if(field&&typeof field.value==="string"){
if(field.tagName==="SELECT"&&![...field.options].some(o=>o.value===d[name]))continue;
field.value=d[name];
}
}
if(Array.isArray(d.badges)){
const set=new Set(d.badges);
form.querySelectorAll("[data-badge]").forEach(x=>{x.checked=set.has(x.value)});
}
syncSelectors();
}
const raw=safeStorage.get();
if(raw)try{
const draft=JSON.parse(raw);
if(draft&&draft.savedAt&&Date.now()-draft.savedAt<7*24*3600000&&draft.data&&Object.keys(draft.data).length){
write(draft.data);
dirty=true;
savedAt=draft.savedAt;
}else safeStorage.remove();
}catch{safeStorage.remove()}
function saveDraft(){
const data=read(),serialized=JSON.stringify(data);
if(serialized===initial&&!dirty)return;
dirty=true;savedAt=Date.now();safeStorage.set(JSON.stringify({savedAt,data}));
}
form.addEventListener("input",saveDraft,{passive:true});
form.addEventListener("change",saveDraft,{passive:true});
// Pickers set hidden input.value programmatically: they do not fire input/change.
for(const selector of [".decoTile",".effectTile",".frameTile",".nameplateTile",".tagPick"]){
document.querySelectorAll(selector).forEach(el=>el.addEventListener("click",()=>setTimeout(saveDraft,0),{passive:true}));
}
form.querySelectorAll("[data-badge]").forEach(el=>el.addEventListener("click",saveDraft,{passive:true}));
window.cmdProfileDraftClear=()=>{safeStorage.remove();dirty=false;initial=JSON.stringify(read())};
// Show a non-invasive indicator when reopening an unfinished draft.
if(dirty){
const info=document.createElement("div");
info.setAttribute("role","status");
info.style.cssText="padding:10px 12px;margin:8px 0;background:#21394a;border:1px solid #4b8596;border-radius:9px;color:#bdeeff;font:12px/1.45 system-ui";
info.textContent="✓ Tes changements non enregistrés ont été retrouvés. Appuie sur Enregistrer pour les sauvegarder sur ton compte.";
form.querySelector("h2")?.after(info);
}
})();
