/* CMD Sphere: polished chat header, adjustable colored bubbles and return to keyboard. */
(()=>{"use strict";
 if(window.__cmdChatPolish)return;window.__cmdChatPolish=true;
 const $=s=>document.querySelector(s);
 const ids=["cmdChannelSourceToggle","cmdArchiveHistoryToggle","cmdLiveMessagesToggle"];
 const PALETTE=["#5141bc","#6d37ae","#275da8","#217f79","#28754e","#89572b","#924772","#384455","#59626f"];
 const mine=()=>String(window.CMD_CHAT_USER_ID||"");
 let colors={},palette,sourcePanel,colorButton,sourceButton,observedMessages=null,seenIds="",observedHead=null,scheduled=false;
 function closeEmojiFocus(){
   $("#channelEmojiSheet")?.classList.remove("on");
   $("#channelToolSheet")?.classList.remove("on");
   $("#channelInput")?.focus({preventScroll:true});
 }
 function keyboardControl(){
   const tabs=$("#channelEmojiSheet .emoji-tabs");
   if(!tabs||$("#cmdEmojiBackKeyboard"))return;
   const b=document.createElement("button");b.type="button";b.id="cmdEmojiBackKeyboard";b.textContent="⌨";
   b.title="Retour au clavier";b.setAttribute("aria-label","Retour au clavier");
   b.onclick=closeEmojiFocus;tabs.append(b);
 }
 function hideMenus(){palette?.classList.remove("open");sourcePanel?.classList.remove("open")}
 function mountChat(){
   const overlay=$("#channelOverlay"),head=overlay?.querySelector(".channel-head"),buttons=head?.querySelector(".channel-actions");
   if(!overlay||!head||!buttons)return;
   if(!sourcePanel){sourcePanel=document.createElement("div");sourcePanel.id="cmdChatSourcesPanel";overlay.append(sourcePanel)}
   if(!palette){
     palette=document.createElement("div");palette.id="cmdChatColorPanel";
     const label=document.createElement("strong");label.textContent="Couleur de mes bulles";
     const options=document.createElement("div");options.className="cmd-chat-color-options";
     for(const color of PALETTE){
       const b=document.createElement("button");b.type="button";b.style.backgroundColor=color;b.dataset.color=color;b.title=color;b.setAttribute("aria-label","Couleur "+color);
       b.onclick=async()=>{
         try{
           const r=await fetch("/api/cmd-bubbles",{credentials:"same-origin",method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({color})});
           const d=await r.json();if(!r.ok)throw Error(d.error||"Sauvegarde impossible");
           colors[mine()]=color;decorateMessages();markPalette();hideMenus();
         }catch(e){window.alert("Impossible d'enregistrer la couleur : "+e.message)}
       };
       options.append(b);
     }
     palette.append(label,options);overlay.append(palette);
   }
   if(!sourceButton){
     sourceButton=document.createElement("button");sourceButton.type="button";sourceButton.className="cmd-chat-compact";
     sourceButton.title="Choisir les messages visibles";sourceButton.setAttribute("aria-label","Sources des messages");
     sourceButton.textContent="☰";sourceButton.onclick=()=>{
       palette?.classList.remove("open");sourcePanel?.classList.toggle("open");
     };buttons.prepend(sourceButton);
   }
   if(!colorButton){
     colorButton=document.createElement("button");colorButton.type="button";colorButton.className="cmd-chat-compact";
     colorButton.title="Couleur des bulles";colorButton.setAttribute("aria-label","Changer la couleur de mes bulles");
     colorButton.textContent="🎨";colorButton.onclick=()=>{
       sourcePanel?.classList.remove("open");palette?.classList.toggle("open");markPalette();
     };buttons.prepend(colorButton);
   }
   let count=0;
   for(const id of ids){
     const elem=document.getElementById(id);if(!elem)continue;
     sourcePanel.append(elem);elem.style.display="block";count++;
   }
   sourceButton.style.display=count?"":"none";
   const messages=$("#channelMessages");
   if(messages&&messages!==observedMessages){
     observedMessages?.__cmdObserver?.disconnect();
     observedMessages=messages;
     const obs=new MutationObserver(()=>queueMessageDecorations());
     obs.observe(messages,{childList:true});messages.__cmdObserver=obs;
     queueMessageDecorations();
   }
   if(head!==observedHead){
     observedHead=head;
     const obs=new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;mountChat()})}});
     obs.observe(head,{childList:true,subtree:true});
   }
 }
 function markPalette(){
   palette?.querySelectorAll("[data-color]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.color===(colors[mine()]||PALETTE[0]))));
 }
 function decorateMessages(){
   const own=mine();let idsToLoad=[];
   for(const msg of document.querySelectorAll("#channelMessages .discord-message")){
     let userId=msg.dataset.cmdAuthorId||"";
     if(!userId){
       // New messages carry the author ID as data attribute; older ones keep their default bubble.
       userId=msg.getAttribute("data-author-id")||"";
     }
     if(userId&&userId===own)msg.classList.add("cmd-own-message");else msg.classList.remove("cmd-own-message");
     msg.style.setProperty("--cmd-message-bubble",colors[userId]||(userId===own?PALETTE[0]:"#40424c"));
     if(userId&&!Object.hasOwn(colors,userId))idsToLoad.push(userId);
   }
   if(own&&!Object.hasOwn(colors,own))idsToLoad.push(own);
   idsToLoad=[...new Set(idsToLoad)];
   if(idsToLoad.length){
     const fingerprint=idsToLoad.join(",");
     if(fingerprint!==seenIds){seenIds=fingerprint;fetchColors(idsToLoad)}
   }
 }
 async function fetchColors(ids){
   try{
     const r=await fetch("/api/cmd-bubbles?ids="+encodeURIComponent(ids.slice(0,100).join(",")),{credentials:"same-origin",cache:"no-store"});
     if(!r.ok)return;
     const d=await r.json();
     for(const id of ids)colors[id]=d.colors?.[id]|| (id===mine()?PALETTE[0]:"#40424c");
     decorateMessages();markPalette();
   }catch{}
 }
 let paintPending=false;
 function queueMessageDecorations(){
   if(paintPending)return;paintPending=true;
   requestAnimationFrame(()=>{paintPending=false;decorateMessages()});
 }
 document.addEventListener("click",e=>{
   if(e.target.closest("#cmdChatSourcesPanel .btn"))sourcePanel?.classList.remove("open");
   if(e.target.closest("#channelInput"))hideMenus();
   if(e.target.closest("#channelEmoji"))setTimeout(keyboardControl,0);
   if(e.target.closest("#channelOverlay .channel-back"))hideMenus();
 });
 document.addEventListener("keydown",e=>{
   if(e.key==="Escape"){hideMenus();if($("#channelEmojiSheet")?.classList.contains("on"))closeEmojiFocus()}
 });
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
 function start(){
   keyboardControl();mountChat();fetchColors(mine()?[mine()]:[]);
   document.addEventListener("focusin",e=>{if(e.target?.id==="channelInput")$("#channelEmojiSheet")?.classList.remove("on")});
   setInterval(()=>{if($("#channelOverlay")?.classList.contains("on")){mountChat();keyboardControl()}},1000);
 }
})();
