/* CMD Sphere PWA/app update notification — all installed and web views.
   Detect deployments via same-origin version endpoint; never interrupt an open chat. */
(()=>{"use strict";
if(window.__cmdSphereUpdateWatch)return;window.__cmdSphereUpdateWatch=true;
const meta=document.querySelector('meta[name="cmd-sphere-release"]');
if(!meta)return;
const current=String(meta.content||"").trim();
let checking=false,notified=false;
async function check(){
 if(checking||notified||document.hidden)return;
 checking=true;
 try{
  const r=await fetch("/api/cmd/app-version",{credentials:"same-origin",cache:"no-store",headers:{"accept":"application/json"}});
  if(!r.ok)return;
  const data=await r.json(),next=String(data.release||"");
  if(!next||next===current)return;
  notified=true;
  const bar=document.createElement("aside");bar.id="cmdSphereAppUpdate";bar.setAttribute("role","status");
  bar.style.cssText="position:fixed;right:12px;top:calc(10px + env(safe-area-inset-top,0px));z-index:25000;width:min(340px,calc(100vw - 24px));border:1px solid #c69bfa;border-radius:15px;background:linear-gradient(145deg,#302145,#150d23);color:#f6edff;box-shadow:inset 0 2px #ffffff30,0 15px 45px #000b;padding:13px;font:600 13px/1.45 system-ui;box-sizing:border-box";
  const title=document.createElement("strong");title.textContent="Mise à jour CMD Sphere disponible";title.style.display="block";
  const text=document.createElement("p");text.textContent="Actualise pour retrouver la nouvelle version sur le site et dans l’application installée.";text.style.margin="7px 0";
  const buttons=document.createElement("div");buttons.style.cssText="display:flex;gap:8px";
  const apply=document.createElement("button");apply.type="button";apply.textContent="Mettre à jour";
  apply.style.cssText="padding:10px 13px;border:1px solid #ddbbff;border-radius:10px;background:#6f42af;color:white;font-weight:750";
  apply.addEventListener("click",async()=>{
   apply.disabled=true;apply.textContent="Actualisation…";
   if("serviceWorker" in navigator){try{const reg=await navigator.serviceWorker.getRegistration();await reg?.update()}catch{}}
   location.reload();
  });
  const later=document.createElement("button");later.type="button";later.textContent="Plus tard";
  later.style.cssText="padding:10px 13px;border:1px solid #8a6ca8;border-radius:10px;background:#2d2039;color:white";
  later.addEventListener("click",()=>{bar.remove();notified=false});
  buttons.append(apply,later);bar.append(title,text,buttons);document.body.append(bar);
 }catch{}finally{checking=false}
}
window.addEventListener("focus",()=>{void check()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void check()});
window.addEventListener("pageshow",()=>{void check()});
setInterval(()=>{void check()},120000);
})();
