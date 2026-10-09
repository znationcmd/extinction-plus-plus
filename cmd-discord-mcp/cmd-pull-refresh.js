/* CMD Sphere — pull-to-refresh sur iOS, Android et PWA.
   Au sommet d'un salon, recharge les messages ; ailleurs, recharge les données.
   Ne modifie jamais un serveur Discord et n'exécute pas d'importation. */
(function(){
  "use strict";
  if(window.__cmdPullRefreshInstalled)return;
  window.__cmdPullRefreshInstalled=true;
  const phone=window.matchMedia("(max-width: 850px) and (pointer: coarse)");
  const threshold=75;
  let startX=0,startY=0,pulled=0,tracking=false,busy=false,indicator=null;
  const $=s=>document.querySelector(s);
  const visible=el=>Boolean(el&&el.getClientRects().length&&getComputedStyle(el).visibility!=="hidden");
  function blocked(){
    return ["#serverSettingsModal","#mirrorModal","#webhookModal","#botsModal","#addModal",
      "#folderModal","#csm-server-menu","#cmd-bulk-sync"].some(q=>{
        const el=$(q);
        return visible(el)&&(
          el.id==="csm-server-menu"||
          el.classList.contains("on")||
          el.classList.contains("csm-open")||
          (el.id==="cmd-bulk-sync"&&!el.hidden)
        );
      });
  }
  function topOfScroll(target){
    const root=document.scrollingElement||document.documentElement;
    if(window.scrollY>2||root.scrollTop>2)return false;
    for(let node=target;node&&node!==document.body;node=node.parentElement){
      if(node.scrollTop>2)return false;
    }
    return true;
  }
  function eligible(target){
    if(!target?.closest||!$(".sphere-app")||blocked())return false;
    if(target.closest("input,textarea,select,[contenteditable=true],"+
      ".server-rail,.rail-folder-wrap,.user-dock,.cmd-modal,.add-modal,"+
      "#csm-server-menu,.channel-composer,.channel-compose-wrap,[role=dialog]"))return false;
    // Les noms de salons sont des liens : on doit aussi pouvoir tirer dessus.
    // L'interaction normale d'un lien est conservée si le mouvement reste court.
    return topOfScroll(target);
  }
  function chip(){
    if(indicator)return indicator;
    indicator=document.createElement("div");
    indicator.id="cmd-pull-refresh-indicator";
    indicator.setAttribute("role","status");
    indicator.setAttribute("aria-live","polite");
    indicator.textContent="↓ Tirer pour actualiser";
    document.body.appendChild(indicator);
    return indicator;
  }
  function show(message,ready,shift=0){
    const el=chip();
    el.textContent=message;
    el.classList.add("visible");
    el.classList.toggle("ready",!!ready);
    el.style.setProperty("--pull-distance",Math.min(52,shift*.35)+"px");
  }
  function hide(){
    if(indicator){
      indicator.classList.remove("visible","ready","loading");
      indicator.style.setProperty("--pull-distance","0px");
    }
  }
  async function update(){
    if(busy)return;
    busy=true;
    show("↻ Actualisation…",true,50);
    chip().classList.add("loading");
    try{
      let result;
      if($("#channelOverlay.on")&&typeof window.cmdSphereRefreshCurrentChannel==="function"){
        result=await window.cmdSphereRefreshCurrentChannel();
      }else if(typeof window.refreshEverything==="function"){
        result=await window.refreshEverything();
      }else {
        // Les pages autres que le tableau de bord utilisent le rechargement natif.
        location.reload();
        return;
      }
      if(result===false)throw new Error("Actualisation impossible");
      show("✓ Actualisé",true,40);
    }catch(err){
      show("Échec de l’actualisation : "+(err?.message||"erreur"),false,40);
    }finally{
      busy=false;
      setTimeout(hide,1200);
    }
  }
  document.addEventListener("touchstart",event=>{
    tracking=false;pulled=0;
    if(!phone.matches||busy||event.touches.length!==1||!eligible(event.target))return;
    startX=event.touches[0].clientX;
    startY=event.touches[0].clientY;
    tracking=true;
  },{passive:true});
  document.addEventListener("touchmove",event=>{
    if(!tracking||busy||event.touches.length!==1)return;
    const dy=event.touches[0].clientY-startY;
    const dx=event.touches[0].clientX-startX;
    if(dy<0||Math.abs(dx)>Math.abs(dy)*.8){tracking=false;hide();return}
    if(dy<8)return;
    if(!topOfScroll(event.target)){tracking=false;hide();return}
    if(event.cancelable)event.preventDefault();
    pulled=Math.min(180,dy);
    show(pulled>=threshold?"↑ Relâcher pour actualiser":"↓ Tirer pour actualiser",pulled>=threshold,pulled);
  },{passive:false});
  document.addEventListener("touchend",()=>{
    if(!tracking)return;
    const ready=pulled>=threshold;
    tracking=false;pulled=0;
    if(ready)update();else hide();
  },{passive:true});
  document.addEventListener("touchcancel",()=>{tracking=false;pulled=0;hide()},{passive:true});
  window.addEventListener("resize",()=>{if(!phone.matches){tracking=false;hide()}});
})();
