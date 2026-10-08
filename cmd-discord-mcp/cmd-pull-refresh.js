/* CMD Sphere: swipe down to refresh the dashboard on touch phones.
   Existing desktop refresh action remains the source of truth.
   No sync/import or Discord writes are triggered. */
(function(){
  "use strict";
  const touchPhone=window.matchMedia("(max-width:850px) and (pointer:coarse)");
  const threshold=96;
  let startingX=0,startingY=0,distance=0,active=false,busy=false;
  let indicator=null;
  function inDashboard(){return Boolean(document.querySelector(".sphere-app"));}
  function blocked(){
    return Boolean(document.querySelector(
      "#channelOverlay.on, #serverSettingsModal.on, #cmd-bulk-sync:not([hidden]), "+
      "#mirrorModal.on, #webhookModal.on, #botsModal.on, #addModal.on, "+
      "[role=dialog][aria-modal=true]:not([hidden])"
    ));
  }
  function scrollTop(el){
    const root=document.scrollingElement||document.documentElement;
    if(window.scrollY>2||root.scrollTop>2)return false;
    for(let node=el;node&&node!==document.body;node=node.parentElement){
      if(node.scrollTop>2)return false;
    }
    return true;
  }
  function allowedTarget(el){
    if(!el||typeof el.closest!=="function")return false;
    if(el.closest("input,textarea,select,button,a,[contenteditable=true],"+
       ".server-rail,.rail-folder-wrap,.channel-messages,.channel-overlay,"+
       ".cmd-server-channels,.user-dock,[role=dialog],"+
       ".cmd-modal,.add-modal"))return false;
    return scrollTop(el);
  }
  function badge(){
    if(indicator)return indicator;
    const element=document.createElement("div");
    element.id="cmd-pull-refresh-indicator";
    element.setAttribute("role","status");
    element.setAttribute("aria-live","polite");
    element.textContent="↓ Glisse pour actualiser";
    document.body.appendChild(element);
    indicator=element;
    return element;
  }
  function label(value,ready){
    const el=badge();
    el.textContent=value;
    el.classList.add("visible");
    el.classList.toggle("ready",Boolean(ready));
  }
  function hide(){
    if(!indicator)return;
    indicator.classList.remove("visible","ready","loading");
  }
  async function refresh(){
    if(busy)return;
    busy=true;
    label("↻ Actualisation en cours…",true);
    badge().classList.add("loading");
    try{
      if(typeof window.refreshEverything==="function"){
        await window.refreshEverything();
      }else{
        const btn=document.querySelector("#refresh");
        if(btn&&!btn.disabled){
          btn.click();
          await new Promise(resolve=>setTimeout(resolve,950));
        }else{
          throw new Error("Actualisation indisponible");
        }
      }
      label("✓ CMD Sphere actualisé",true);
    }catch(err){
      label("Impossible d’actualiser : "+(err?.message||"erreur"),false);
    }finally{
      busy=false;
      window.setTimeout(hide,800);
    }
  }
  document.addEventListener("touchstart",event=>{
    active=false;distance=0;
    if(!touchPhone.matches||busy||!inDashboard()||blocked()||event.touches.length!==1)return;
    if(!allowedTarget(event.target))return;
    startingY=event.touches[0].clientY;
    startingX=event.touches[0].clientX;
    active=true;
  },{passive:true});
  document.addEventListener("touchmove",event=>{
    if(!active||busy||event.touches.length!==1)return;
    const y=event.touches[0].clientY-startingY;
    const x=event.touches[0].clientX-startingX;
    if(y<0||Math.abs(x)>Math.abs(y)*0.8){active=false;hide();return}
    if(y<12)return;
    if(!scrollTop(event.target)){active=false;hide();return}
    if(event.cancelable)event.preventDefault();
    distance=Math.min(160,y);
    label(distance>=threshold?"↑ Relâche pour actualiser":"↓ Glisse pour actualiser",distance>=threshold);
    badge().style.setProperty("--pull-distance",Math.min(50,distance*.25)+"px");
  },{passive:false});
  document.addEventListener("touchend",()=>{
    if(!active)return;
    const shouldRefresh=distance>=threshold;
    active=false;distance=0;
    if(shouldRefresh)refresh();else hide();
  },{passive:true});
  document.addEventListener("touchcancel",()=>{active=false;distance=0;hide()},{passive:true});
  window.addEventListener("resize",()=>{if(!touchPhone.matches){active=false;hide()}});
})();
