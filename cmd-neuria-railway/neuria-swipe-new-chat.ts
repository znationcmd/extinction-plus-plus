/* CMD NEURIA — swipe up at the bottom to suggest a new conversation.
   No implicit navigation, no deletion, opt-out available in the menu. */
export const NEURIA_SWIPE_NEW_CHAT_CLIENT = String.raw`(()=>{
 const feed=document.getElementById("feed");
 const newChat=document.getElementById("newChat");
 if(!feed||!newChat||document.getElementById("neuria-swipe-new-chat"))return;
 const PREF="neuria-swipe-up-new-chat-v1";
 let enabled=true;
 try{enabled=localStorage.getItem(PREF)!=="off"}catch{}
 const panel=document.createElement("div");
 panel.id="neuria-swipe-new-chat";
 panel.hidden=true;
 panel.setAttribute("role","region");
 panel.setAttribute("aria-label","Suggestion de nouvelle discussion");
 const trigger=document.createElement("button");
 trigger.type="button";
 trigger.id="neuria-swipe-new-chat-trigger";
 trigger.setAttribute("aria-label","Créer une nouvelle discussion");
 const icon=document.createElement("span");
 icon.className="neuria-swipe-ring";
 icon.textContent="+";
 icon.setAttribute("aria-hidden","true");
 const caption=document.createElement("span");
 caption.textContent="Nouveau chat";
 trigger.append(icon,caption);
 const hint=document.createElement("span");
 hint.className="neuria-swipe-hint";
 hint.textContent="La discussion actuelle reste enregistrée";
 const close=document.createElement("button");
 close.type="button";
 close.className="neuria-swipe-dismiss";
 close.textContent="×";
 close.setAttribute("aria-label","Fermer la proposition");
 panel.append(trigger,hint,close);
 feed.insertAdjacentElement("afterend",panel);
 const css=document.createElement("style");
 css.id="neuria-swipe-new-chat-css";
 css.textContent=`
 #neuria-swipe-new-chat{position:relative;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:7px 42px 12px;margin:0 auto 5px;width:min(100%,380px);min-height:100px;border:1px solid #9b76ff45;border-radius:17px;background:linear-gradient(180deg,#20152bde,#120c21eb);box-shadow:inset 0 1px 0 #ffffff24,0 5px 18px #0007;animation:neuria-swipe-enter .22s ease-out;z-index:3}
 #neuria-swipe-new-chat[hidden]{display:none!important}
 #neuria-swipe-new-chat-trigger{display:flex!important;flex-direction:column!important;align-items:center!important;gap:7px!important;min-height:0!important;margin:0!important;padding:3px 17px 1px!important;background:transparent!important;box-shadow:none!important;border:0!important;color:#f4e8ff!important;font-size:14px!important;transform:none!important}
 #neuria-swipe-new-chat-trigger .neuria-swipe-ring{display:grid;place-items:center;width:43px;height:43px;border-radius:100%;font-size:25px;font-weight:400;color:#fff;background:linear-gradient(#241432,#241432) padding-box,conic-gradient(#a573ff,#eccbff,#5638a3,#a573ff) border-box;border:3px solid transparent;box-shadow:0 0 11px #8b54ff4d}
 #neuria-swipe-new-chat-trigger:focus-visible{outline:2px solid #cfa7ff!important;outline-offset:3px}
 #neuria-swipe-new-chat-trigger:hover .neuria-swipe-ring{box-shadow:0 0 18px #b280ffad}
 #neuria-swipe-new-chat .neuria-swipe-hint{color:#c8acd9;font-size:11px;text-align:center}
 #neuria-swipe-new-chat .neuria-swipe-dismiss{position:absolute;top:5px;right:5px;padding:2px 8px!important;font-size:22px!important;line-height:1!important;min-height:24px!important;border:0!important;box-shadow:none!important;background:transparent!important}
 #neuria-swipe-new-chat-settings{display:flex;gap:10px;align-items:center;padding:10px 6px;color:#eadcf8;font-size:13px;cursor:pointer}
 #neuria-swipe-new-chat-settings input{flex:0 0 auto!important;accent-color:#a573ff;width:18px;height:18px;margin:0}
 @keyframes neuria-swipe-enter{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
 @media (prefers-reduced-motion:reduce){#neuria-swipe-new-chat{animation:none!important}}
 `;
 document.head.append(css);
 function hide(){panel.hidden=true}
 function atBottom(){return feed.scrollHeight-feed.scrollTop-feed.clientHeight<12}
 function hasMessages(){return !!feed.querySelector(":scope > .bubble.me,:scope > .bubble.bot")}
 function offer(){if(enabled&&atBottom()&&hasMessages())panel.hidden=false}
 function accept(){
  if(!newChat.isConnected)return;
  hide();
  newChat.click();
  // Don't carry the previous thread's draft into the new discussion.
  const input=document.getElementById("message");
  if(input){input.value="";input.required=true}
  try{localStorage.removeItem("cmd-neuria-draft-v2")}catch{}
  input?.focus({preventScroll:true});
 }
 trigger.addEventListener("click",accept);
 close.addEventListener("click",hide);
 feed.addEventListener("scroll",()=>{if(!atBottom())hide()},{passive:true});
 document.addEventListener("neuria:chat-changed",hide);
 let startY=0,startX=0,armed=false;
 feed.addEventListener("touchstart",event=>{
  if(event.touches.length!==1){armed=false;return}
  const target=event.target;
  if(target?.closest?.("button,a,input,textarea,select,[contenteditable]")){armed=false;return}
  armed=enabled&&hasMessages()&&atBottom();
  startY=event.touches[0].clientY;
  startX=event.touches[0].clientX;
 },{passive:true});
 feed.addEventListener("touchend",event=>{
  if(!armed||!event.changedTouches.length)return;
  armed=false;
  const y=startY-event.changedTouches[0].clientY,x=Math.abs(startX-event.changedTouches[0].clientX);
  if(y>65&&x<85&&atBottom())offer();
 },{passive:true});
 feed.addEventListener("touchcancel",()=>{armed=false},{passive:true});
 // Desktop trackpads and mice: an extra downward scroll at the very bottom.
 let wheelDistance=0,lastWheel=0;
 feed.addEventListener("wheel",event=>{
  if(!enabled||!hasMessages()||!atBottom()||event.deltaY<=0){wheelDistance=0;return}
  const now=Date.now();
  if(now-lastWheel>750)wheelDistance=0;
  lastWheel=now;wheelDistance+=event.deltaY;
  if(wheelDistance>115){wheelDistance=0;offer()}
 },{passive:true});
 const menu=document.getElementById("neuriaMenu");
 if(menu){
  const label=document.createElement("label");
  label.id="neuria-swipe-new-chat-settings";
  const checkbox=document.createElement("input");
  checkbox.type="checkbox";
  checkbox.checked=enabled;
  const text=document.createElement("span");
  text.textContent="Proposer un nouveau chat en glissant vers le haut";
  label.append(checkbox,text);
  checkbox.addEventListener("change",()=>{
   enabled=checkbox.checked;
   try{localStorage.setItem(PREF,enabled?"on":"off")}catch{}
   if(!enabled)hide();
  });
  menu.append(label);
 }
})();`;
