/* CMD Sphere desktop/mobile PWA updates. Keeps installed app identity and sessions. */
(()=>{"use strict";
if(!("serviceWorker" in navigator)||!window.isSecureContext)return;
if(window.__cmdPwaUpdateStarted)return;
window.__cmdPwaUpdateStarted=true;

const POLL_MS=15*60*1000;
const MIN_POLL_MS=3*60*1000;
const RELEASE="20261011pwa1";
let registration=null,lastPoll=0,pendingReload=false,oldController=Boolean(navigator.serviceWorker.controller),hasReloaded=false,knownBuild=(()=>{try{return localStorage.getItem("cmd-pwa-runtime-build")}catch{return null}})();
const path=String(location.pathname||"");
const callPage=/^\/(?:call|voice|video)(?:\/|$)/i.test(path);

function editingOrCalling(){
 if(callPage)return true; // Never disconnect a running call or replace its WebRTC page.
 const a=document.activeElement;
 if(a&&a.matches&&a.matches("input,textarea,select,[contenteditable], [contenteditable=true]")){
  if(a.matches("[contenteditable]")||a.matches("textarea")||(a.value&&String(a.value).trim().length))return true;
 }
 if(document.querySelector("dialog[open], .cmd-person-overlay, #cmdSceneSheet.on, #cmdAiPanel.on, [data-recording=true], .is-recording"))return true;
 const inputs=document.querySelectorAll("textarea,input[type=text],[contenteditable=true]");
 for(const item of inputs)if((item.value&&String(item.value).trim())||(item.isContentEditable&&item.textContent.trim()))return true;
 return false;
}
let notice=null;
function hint(){
 if(notice||!document.body)return;
 notice=document.createElement("div");notice.id="cmdPwaUpdateNotice";
 notice.style.cssText="position:fixed;bottom:calc(14px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);z-index:2147483000;max-width:min(94vw,420px);padding:10px 12px;border:1px solid #b7a2ff88;border-radius:14px;background:#21172eea;color:#fff;box-shadow:0 12px 36px #0009;display:flex;align-items:center;gap:10px;font:600 12px system-ui;";
 const label=document.createElement("span");label.textContent="Nouvelle version CMD Sphere prête.";
 const button=document.createElement("button");button.type="button";button.textContent="Actualiser";
 button.style.cssText="border:0;border-radius:9px;padding:9px 10px;background:#7554e5;color:#fff;font:700 12px system-ui;cursor:pointer";
 button.addEventListener("click",()=>refresh(true));notice.append(label,button);document.body.append(notice);
}
function refresh(manual=false){
 if(!pendingReload||hasReloaded||document.visibilityState==="hidden")return;
 if(!manual&&editingOrCalling()){hint();return}
 // Prevent reload loops when the service worker is initially installed or another tab updates.
 try{const key="cmd-pwa-sw-reload:"+RELEASE;if(Date.now()-Number(sessionStorage.getItem(key)||0)<45000)return;sessionStorage.setItem(key,String(Date.now()))}catch{}
 hasReloaded=true;
 location.reload(); // Same URL, installed app, browser session and selected route retained.
}
function scheduleRefresh(){
 if(!pendingReload||document.visibilityState==="hidden")return;
 if(editingOrCalling()){hint();return}
 window.setTimeout(()=>refresh(false),1250);
}
function onControllerChange(){
 if(!oldController){oldController=true;return}
 pendingReload=true;
 scheduleRefresh();
}
navigator.serviceWorker.addEventListener("controllerchange",onControllerChange);
async function checkRuntimeVersion(){
 try{
  const response=await fetch("/api/pwa/version",{credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(6000)});
  if(!response.ok)return;
  const data=await response.json();
  if(typeof data.version!=="string"||!data.version)return;
  if(knownBuild===null){knownBuild=data.version;try{localStorage.setItem("cmd-pwa-runtime-build",data.version)}catch{};return}
  if(knownBuild!==data.version){
   knownBuild=data.version;
   try{localStorage.setItem("cmd-pwa-runtime-build",data.version)}catch{}
   pendingReload=true;
   scheduleRefresh();
  }
 }catch{/* An offline PWA continues operating with its current version. */}
}
async function check(force=false){
 if(!navigator.onLine)return;
 const now=Date.now();
 if(!force&&now-lastPoll<MIN_POLL_MS)return;
 lastPoll=now;
 try{
  registration=registration||await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});
  if(registration.waiting){
   registration.waiting.postMessage({type:"CMD_PWA_SKIP_WAITING"});
  }
  await registration.update();
  await checkRuntimeVersion();
  if(registration.waiting)registration.waiting.postMessage({type:"CMD_PWA_SKIP_WAITING"});
 }catch{/* Remain usable even offline or while a Railway deploy is in progress. */}
}
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState==="visible"){scheduleRefresh();check()}
});
window.addEventListener("focus",()=>{scheduleRefresh();check()});
window.addEventListener("online",()=>check(true));
window.addEventListener("pageshow",()=>{scheduleRefresh();check()});
window.setInterval(()=>{if(document.visibilityState==="visible")check()},POLL_MS);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>check(true),{once:true});
else check(true);
})();