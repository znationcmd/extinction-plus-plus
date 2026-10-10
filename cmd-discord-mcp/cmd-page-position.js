/* CMD Sphere — restore scroll and profile tab on explicit browser refresh.
   Scoped to this tab and exact route. No redirect, no cross-server state leak. */
(()=>{
"use strict";
const path=location.pathname;
if(!(/^\/(?:dashboard|profile|messages)$/.test(path)))return;
const key=()=> "cmd-sphere-position-v2:"+location.pathname+location.search;
const storage=()=>{try{return sessionStorage}catch{return null}};
let last=0,restoring=false,interaction=false;
const tabKey=()=> "cmd-sphere-profile-tab-v2:"+location.pathname+location.search;
function save(){
 const st=storage();if(!st)return;
 try{st.setItem(key(),JSON.stringify({x:window.scrollX||0,y:window.scrollY||0,at:Date.now()}))}catch{}
}
function selectedTab(){
 const st=storage();if(!st||path!=="/profile")return;
 const tab=document.querySelector("[data-premium-tab].selected");
 if(tab&&["principal","tableau","wishlist"].includes(tab.dataset.premiumTab))
  st.setItem(tabKey(),tab.dataset.premiumTab);
}
function restoreTab(){
 if(path!=="/profile")return;
 const st=storage(),tab=st?.getItem(tabKey());
 if(!["principal","tableau","wishlist"].includes(tab))return;
 const button=Array.from(document.querySelectorAll("[data-premium-tab]")).find(b=>b.dataset.premiumTab===tab);
 if(button&&!button.classList.contains("selected"))button.click();
}
function restore(){
 if(interaction||!restoring)return;
 const st=storage();let entry=null;
 try{entry=JSON.parse(st?.getItem(key())||"null")}catch{}
 if(!entry||Date.now()-Number(entry.at)>30*60*1000)return;
 restoreTab();
 // Reattempt after async components (profile cards and server channel list) have mounted.
 window.scrollTo({left:Math.max(0,Number(entry.x)||0),top:Math.max(0,Number(entry.y)||0),behavior:"instant"});
}
const isReload=(()=>{
 try{return performance.getEntriesByType("navigation")[0]?.type==="reload"}catch{return false}
})();
window.addEventListener("pagehide",()=>{selectedTab();save()});
window.addEventListener("beforeunload",()=>{selectedTab();save()});
window.addEventListener("scroll",()=>{
 if(restoring)return;
 const now=Date.now();if(now-last>200){last=now;save()}
 },{passive:true});
document.addEventListener("click",event=>{
 const button=event.target.closest?.("[data-premium-tab]");
 if(button)setTimeout(selectedTab,0);
 },true);
if(!isReload)return;
restoring=true;
document.addEventListener("touchstart",()=>{interaction=true},{passive:true,once:true});
document.addEventListener("pointerdown",()=>{interaction=true},{passive:true,once:true});
function start(){
 for(const time of [0,100,400,950,1700])setTimeout(restore,time);
 setTimeout(()=>{restoring=false},2000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();