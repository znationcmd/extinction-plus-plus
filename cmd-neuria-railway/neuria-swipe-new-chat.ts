/* Progressive pull-up suggestion: never overlays composer by default and never creates chats automatically. */
export const NEURIA_SWIPE_NEW_CHAT_CLIENT = String.raw`(()=>{
  const feed=document.getElementById("feed");
  const form=document.querySelector("main > form");
  const newChat=document.getElementById("newChat");
  if(!feed||!form||!newChat||document.getElementById("neuria-swipe-new-chat"))return;
  const PREF="neuria-swipe-up-new-chat-v1";
  let enabled=true;
  try{enabled=localStorage.getItem(PREF)!=="off"}catch{}
  const panel=document.createElement("div");
  panel.id="neuria-swipe-new-chat";
  panel.hidden=true;
  panel.setAttribute("role","region");
  panel.setAttribute("aria-label","Proposition de nouvelle discussion");
  panel.innerHTML='<button type="button" id="neuria-swipe-new-chat-trigger" aria-label="Créer une nouvelle discussion"><span class="neuria-swipe-ring" aria-hidden="true">＋</span><span>Nouveau chat</span></button><span class="neuria-swipe-hint">La discussion actuelle reste enregistrée</span><button type="button" class="neuria-swipe-dismiss" aria-label="Fermer la proposition">×</button><div class="neuria-swipe-progress" aria-hidden="true"><i></i></div>';
  document.body.appendChild(panel);
  const css=document.createElement("style");
  css.id="neuria-swipe-new-chat-css";
  css.textContent=[
    "#neuria-swipe-new-chat{position:fixed;left:50%;width:min(330px,calc(100vw - 34px));z-index:40;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:3px;padding:11px 35px 13px;border:1px solid #ac81ed9c;border-radius:19px;background:linear-gradient(165deg,#392450f7,#170e26fb);box-shadow:0 12px 32px #000a,inset 0 1px #fff4;color:#f8edff;opacity:0;transform:translate(-50%,42px) scale(.94);pointer-events:none;will-change:transform,opacity}",
    "#neuria-swipe-new-chat[hidden]{display:none!important}",
    "#neuria-swipe-new-chat-trigger{display:flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;background:none!important;border:none!important;box-shadow:none!important;color:#fff!important;font:700 15px system-ui!important;padding:3px 6px!important;min-height:44px!important}",
    "#neuria-swipe-new-chat-trigger .neuria-swipe-ring{width:35px;height:35px;border:2px solid #bd91ff;border-radius:100%;display:grid;place-items:center;background:#38274e;font-size:26px;line-height:1}",
    "#neuria-swipe-new-chat .neuria-swipe-hint{color:#c9b5d9;font:12px system-ui;text-align:center}",
    "#neuria-swipe-new-chat .neuria-swipe-dismiss{position:absolute;right:6px;top:4px;padding:1px 10px!important;min-height:31px!important;font-size:24px!important;background:none!important;border:0!important;box-shadow:none!important;color:#f8edff!important}",
    "#neuria-swipe-new-chat .neuria-swipe-progress{height:3px;width:80%;overflow:hidden;border-radius:4px;background:#4a335d;margin-top:6px}",
    "#neuria-swipe-new-chat .neuria-swipe-progress i{display:block;height:100%;width:0;background:#d4a5ff;border-radius:4px;transition:width .08s linear}",
    "@media(prefers-reduced-motion:reduce){#neuria-swipe-new-chat{will-change:auto}}"
  ].join("\n");
  document.head.appendChild(css);
  const trigger=panel.querySelector("#neuria-swipe-new-chat-trigger");
  const dismiss=panel.querySelector(".neuria-swipe-dismiss");
  const bar=panel.querySelector(".neuria-swipe-progress i");
  let armed=false,active=false,startX=0,startY=0,currentProgress=0,lastCompletedGesture=0;
  function atBottom(){return feed.scrollHeight-feed.scrollTop-feed.clientHeight<24}
  function position(){const bounds=form.getBoundingClientRect();panel.style.bottom=Math.max(8,window.innerHeight-bounds.top+10)+"px"}
  function hide(){armed=false;active=false;currentProgress=0;panel.hidden=true;panel.style.opacity="0";panel.style.pointerEvents="none";bar.style.width="0%"}
  function reveal(progress,settled){
    position();panel.hidden=false;
    const p=Math.min(1,Math.max(0,progress));currentProgress=p;
    panel.style.transition=settled?"opacity .2s ease,transform .2s ease":"none";
    panel.style.opacity=String(settled?1:Math.max(.12,p));
    panel.style.transform="translate(-50%,"+Math.round((1-p)*42)+"px) scale("+(0.94+0.06*p).toFixed(3)+")";
    panel.style.pointerEvents=settled?"auto":"none";
    if(settled)lastCompletedGesture=Date.now();
    bar.style.width=Math.round(p*100)+"%";
  }
  trigger.addEventListener("click",()=>{hide();newChat.click();document.getElementById("message")?.focus({preventScroll:true})});
  dismiss.addEventListener("click",hide);
  window.addEventListener("resize",()=>{if(!panel.hidden)position()},{passive:true});
  document.addEventListener("neuria:chat-changed",hide);
  // Track the gesture on the page, not only on #feed: iPhone swipes often
  // begin beside or directly above the composer, outside the scrollable feed.
  // It must also work before the first message has been sent.
  let fingerId=null;
  const interactive="button,a,input,textarea,select,[contenteditable],#neuriaPlusMenu,#neuria-swipe-new-chat";
  function touchById(list){
    for(const t of Array.from(list||[]))if(t.identifier===fingerId)return t;
    return null;
  }
  document.addEventListener("touchstart",event=>{
    if(!enabled||!atBottom()||event.touches.length!==1||!panel.hidden)return;
    if(event.target?.closest?.(interactive))return;
    const touch=event.touches[0],feedBox=feed.getBoundingClientRect(),formBox=form.getBoundingClientRect();
    const lowerZone=Math.max(feedBox.top,formBox.top-260);
    const upperLimit=Math.min(window.innerHeight-12,formBox.bottom+30);
    if(touch.clientY<lowerZone||touch.clientY>upperLimit)return;
    armed=true;active=false;fingerId=touch.identifier;startY=touch.clientY;startX=touch.clientX;currentProgress=0;
  },{passive:true});
  document.addEventListener("touchmove",event=>{
    if(!armed)return;
    const touch=touchById(event.touches);
    if(!touch){hide();fingerId=null;return}
    const dy=startY-touch.clientY,dx=Math.abs(startX-touch.clientX);
    if(dx>65||dy < -12||!atBottom()){hide();fingerId=null;return}
    if(dy<12)return;
    active=true;
    reveal((dy-12)/100,false);
    // Only block native scrolling once the user is deliberately pulling up
    // from the bottom; normal scrolling, typing and tapping remain untouched.
    if(event.cancelable)event.preventDefault();
  },{passive:false});
  document.addEventListener("touchend",event=>{
    if(!armed)return;
    const touch=touchById(event.changedTouches);
    if(!touch)return;
    armed=false;fingerId=null;
    const distance=startY-touch.clientY;
    if(active&&distance>=90&&currentProgress>=.75)reveal(1,true);
    else hide();
  },{passive:true});
  document.addEventListener("touchcancel",event=>{
    if(armed&&touchById(event.changedTouches)){hide();fingerId=null}
  },{passive:true});
  document.addEventListener("click",event=>{
    if(!panel.hidden&&!panel.contains(event.target)&&Date.now()-lastCompletedGesture>500)hide();
  });
  const menu=document.getElementById("neuriaMenu");
  if(menu){
    const pref=document.createElement("label");pref.id="neuria-swipe-new-chat-settings";
    pref.style.cssText="display:flex;align-items:center;gap:9px;padding:10px 6px;color:#e8d5f7;font-size:13px";
    const box=document.createElement("input");box.type="checkbox";box.checked=enabled;
    box.style.cssText="width:18px;height:18px;flex:0 0 18px";
    pref.append(box,document.createTextNode("Proposer un nouveau chat en glissant vers le haut"));
    box.addEventListener("change",()=>{enabled=box.checked;try{localStorage.setItem(PREF,enabled?"on":"off")}catch{}if(!enabled)hide()});
    menu.append(pref);
  }
})();`;
