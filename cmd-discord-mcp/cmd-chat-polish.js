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
 function improveTools(){
  const grid=$("#channelToolSheet .compose-sheet-grid");
  if(!grid)return;
  const tool=$("#cmdToolPaint");
  if(!tool){
   const b=document.createElement("button");b.type="button";b.className="compose-tool";b.id="cmdToolPaint";
   b.innerHTML="<b>🎨</b><span>Peinture</span>";
   b.onclick=()=>{palette?.classList.toggle("open");$("#channelToolSheet")?.classList.remove("on");markPalette()};
   grid.append(b);
  }
  if(colorButton)colorButton.style.display="none";
 }
 let cmdWallpaperPanel=null;
 function cmdWallpaperKey(){return "cmd-wallpaper:"+location.pathname+":"+(window.CHAT?.channelId||$("#channelTitle")?.textContent||"default")}
 function cmdWallpaperApply(){const box=$("#channelMessages");if(!box)return;let value="";try{value=localStorage.getItem(cmdWallpaperKey())||""}catch{}const presets={aurora:"radial-gradient(ellipse at 15% 15%,#bd65ff88,transparent 45%),radial-gradient(ellipse at 75% 65%,#6d28d988,transparent 55%),linear-gradient(130deg,#070510,#26103c,#0a0820)",violet:"radial-gradient(circle at 25% 20%,#7e22ce77,transparent 50%),linear-gradient(145deg,#160e35,#271345,#080e26)",ocean:"radial-gradient(circle at 70% 10%,#06b6d477,transparent 55%),linear-gradient(145deg,#051d32,#102b53,#0d101f)",forest:"radial-gradient(circle at 30% 35%,#22c55e55,transparent 55%),linear-gradient(145deg,#081d1b,#123c2b,#0d101f)",sunset:"radial-gradient(circle at 60% 25%,#fb718577,transparent 55%),linear-gradient(145deg,#40123c,#522545,#14102b)",midnight:"radial-gradient(circle at 80% 15%,#818cf855,transparent 55%),linear-gradient(145deg,#090d25,#1e1b4b,#030712)",rose:"radial-gradient(circle at 20% 10%,#f472b677,transparent 55%),linear-gradient(145deg,#321333,#542b63,#171127)"};box.style.backgroundImage=value.startsWith("preset:")?(presets[value.slice(7)]||""):value.startsWith("data:image/")?"linear-gradient(#10101c88,#10101c88),url("+JSON.stringify(value)+")":"";box.style.backgroundSize="cover";box.style.backgroundPosition="center";box.classList.toggle("cmdAuroraWallpaper",value==="preset:aurora")}
 const cmdAuroraWallpaperStyle=document.createElement("style");cmdAuroraWallpaperStyle.textContent=`#channelMessages.cmdAuroraWallpaper{position:relative;background-attachment:local;animation:cmdWallpaperAurora 14s ease-in-out infinite alternate;background-size:140% 140%!important}@keyframes cmdWallpaperAurora{from{background-position:0% 25%}to{background-position:100% 75%}}@media(prefers-reduced-motion:reduce){#channelMessages.cmdAuroraWallpaper{animation:none!important}}`;document.head.append(cmdAuroraWallpaperStyle);
 function cmdWallpaperOpen(){
  $("#channelToolSheet")?.classList.remove("on");
  if(!cmdWallpaperPanel){
   cmdWallpaperPanel=document.createElement("div");cmdWallpaperPanel.id="cmdWallpaperPanel";cmdWallpaperPanel.style.cssText="position:absolute;z-index:100;left:10px;right:10px;bottom:95px;max-height:60vh;overflow:auto;background:#21152e;border:1px solid #9467bd;border-radius:20px;padding:16px;color:white;box-shadow:0 10px 35px #0009";
   const title=document.createElement("h3");title.textContent="Fond de cette conversation";cmdWallpaperPanel.append(title);
   const help=document.createElement("p");help.textContent="Choisis une ambiance ou une photo personnelle. Le fond est conservé sur cet appareil pour cette conversation.";cmdWallpaperPanel.append(help);
   const presets=document.createElement("div");presets.style.cssText="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0";
   for(const [name,colors] of Object.entries({aurora:["#bd65ff","#26103c"],violet:["#7117bd","#1d123d"],ocean:["#06b6d4","#102b53"],forest:["#22c55e","#123c2b"],sunset:["#fb7185","#522545"],midnight:["#818cf8","#090d25"],rose:["#f472b6","#542b63"]})){const b=document.createElement("button");b.type="button";b.textContent=name;b.style.cssText="padding:16px 5px;color:white;border:1px solid #ffffff55;border-radius:12px;background:linear-gradient(135deg,"+colors.join(",")+")";b.onclick=()=>{try{localStorage.setItem(cmdWallpaperKey(),"preset:"+name);cmdWallpaperApply();cmdWallpaperPanel.remove();cmdWallpaperPanel=null}catch(e){alert("Impossible d'enregistrer le fond : "+e.message)}};presets.append(b)}cmdWallpaperPanel.append(presets);
   const reset=document.createElement("button");reset.type="button";reset.textContent="↺ Rétablir le fond par défaut";reset.style.cssText="display:block;width:100%;margin:8px 0 12px;padding:12px;border-radius:12px;border:1px solid #ffffff55;background:#342342;color:white;cursor:pointer";reset.onclick=()=>{try{localStorage.removeItem(cmdWallpaperKey());cmdWallpaperApply();cmdWallpaperPanel.remove();cmdWallpaperPanel=null}catch(e){alert("Impossible de rétablir le fond : "+e.message)}};cmdWallpaperPanel.append(reset);
   const file=document.createElement("input");file.type="file";file.accept="image/*";file.style.width="100%";file.onchange=()=>{const f=file.files?.[0];if(!f)return;if(f.size>20e6){alert("Image limitée à 20 Mo");return}const img=new Image(),url=URL.createObjectURL(f);img.onload=()=>{try{const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);localStorage.setItem(cmdWallpaperKey(),canvas.toDataURL("image/jpeg",.76));cmdWallpaperApply();cmdWallpaperPanel.remove();cmdWallpaperPanel=null}catch(e){alert("Image trop volumineuse pour cet appareil. Essaie une image plus petite.")}finally{URL.revokeObjectURL(url)}};img.onerror=()=>{URL.revokeObjectURL(url);alert("Format d'image non pris en charge.")};img.src=url};cmdWallpaperPanel.append(file);
  }
  $("#channelOverlay")?.append(cmdWallpaperPanel);cmdWallpaperApply()
 }
 function cmdTool(label,emoji,fn,id){
  const grid=$("#channelToolSheet .compose-sheet-grid");if(!grid||$("#"+id))return;
  const b=document.createElement("button");b.type="button";b.className="compose-tool";b.id=id;
  const ico=document.createElement("b");ico.textContent=emoji;const txt=document.createElement("span");txt.textContent=label;b.append(ico,txt);
  b.onclick=fn;grid.append(b)
 }
 function cmdCopyText(value){const text=String(value||'');if(!text)return;const done=()=>{const b=$('#cmdToolShare');if(b){const label=b.querySelector('span');if(label){label.textContent='Lien copié ✓';setTimeout(()=>{if(label.isConnected)label.textContent='Partager le salon'},1800)}}};if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(done).catch(()=>window.prompt('Copie ce lien :',text))}else window.prompt('Copie ce lien :',text)}
function cmdShareChannel(){const url=location.href;const title='Salon CMD Sphere';if(navigator.share){navigator.share({title,url}).catch(e=>{if(e.name!=='AbortError')cmdCopyText(url)})}else cmdCopyText(url)}
function cmdExtras(){
  const grid=$("#channelToolSheet .compose-sheet-grid");if(!grid)return;
  const files=$("#toolFiles");if(files){files.querySelector("b").textContent="🖼️";files.querySelector("span").textContent="Fond d’écran";files.onclick=cmdWallpaperOpen}
  cmdTool("Caméra","📸",()=>{let input=$("#cmdCameraInput");if(!input){input=document.createElement("input");input.id="cmdCameraInput";input.type="file";input.accept="image/*";input.capture="environment";input.hidden=true;input.onchange=()=>{const photos=$("#channelPhotoInput");if(photos&&input.files?.length){const dt=new DataTransfer();for(const f of input.files)dt.items.add(f);photos.files=dt.files;photos.dispatchEvent(new Event("change",{bubbles:true}))}};document.body.append(input)}input.click()},"cmdToolCamera");
  cmdTool("Émojis","😊",()=>{$("#channelToolSheet")?.classList.remove("on");$("#channelEmoji")?.click();document.querySelector('[data-emoji-tab="emoji"]')?.click()},"cmdToolEmoji");
  cmdTool("Stickers","💟",()=>{$("#channelToolSheet")?.classList.remove("on");$("#channelEmoji")?.click();document.querySelector('[data-emoji-tab="sticker"]')?.click()},"cmdToolSticker");
  // Wallpaper is already available through the relabeled #toolFiles action.
  cmdTool("Message vocal","🎙️",()=>{$("#channelToolSheet")?.classList.remove("on");$("#channelMic")?.click()},"cmdToolVoice");
  cmdTool("GIF","🎞️",()=>{$("#channelToolSheet")?.classList.remove("on");$("#channelEmoji")?.click();document.querySelector('[data-emoji-tab="gif"]')?.click()},"cmdToolGif");
  cmdTool("Partager le salon","📤",cmdShareChannel,"cmdToolShare");
  cmdTool("Lien","🔗",()=>{const api=window.cmdSphereServerSettings;if(api&&typeof api.open==="function")api.open("invites");else alert("Ouvre les invitations dans les paramètres du serveur pour créer un lien valide.")},"cmdToolInvite");
  cmdTool("Rôles","👑",()=>{const api=window.cmdSphereServerSettings;if(api&&typeof api.open==="function")api.open("roles");else alert("Ouvre les paramètres du serveur pour consulter tes rôles.")},"cmdToolRoles");
  cmdTool("Événements","📅",()=>{const api=window.cmdSphereServerSettings;if(api&&typeof api.open==="function")api.open("events");else alert("Ouvre les paramètres du serveur pour consulter les événements.")},"cmdToolEvents");
  cmdTool("Salon vocal","🎤",()=>{const api=window.cmdSphereServerSettings;if(api&&typeof api.open==="function")api.open("channels");else alert("Ouvre la liste des salons vocaux du serveur.")},"cmdToolVoiceChannel");
  cmdTool("Dons","💚",()=>{let dialog=$("#cmdDonationDialog");if(!dialog){dialog=document.createElement("dialog");dialog.id="cmdDonationDialog";dialog.style.cssText="border:1px solid #7252a0;border-radius:20px;background:#1c142b;color:white;padding:24px;max-width:min(92vw,420px);box-shadow:0 24px 90px #000b";const heading=document.createElement("h2");heading.textContent="Soutenir CMD Sphere";const description=document.createElement("p");description.textContent="Don volontaire via PayPal. Aucun paiement n'est effectué dans CMD Sphere.";const amount=document.createElement("select");amount.id="cmdDonationAmount";amount.setAttribute("aria-label","Montant du don");amount.style.cssText="display:block;width:100%;padding:12px;margin:14px 0;background:#302444;color:white;border-radius:10px";for(const [value,label] of [["10","10 €"],["20","20 €"],["","Montant libre sur PayPal"]]){const option=document.createElement("option");option.value=value;option.textContent=label;amount.append(option)}const actions=document.createElement("div");actions.style.cssText="display:flex;gap:12px;justify-content:flex-end";const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Annuler";cancel.onclick=()=>dialog.close();const proceed=document.createElement("button");proceed.type="button";proceed.textContent="Continuer vers PayPal";proceed.onclick=()=>{const url="https://www.paypal.me/ZnationCmdofficiel"+(amount.value?"/"+encodeURIComponent(amount.value)+"EUR":"");window.open(url,"_blank","noopener,noreferrer");dialog.close()};actions.append(cancel,proceed);dialog.append(heading,description,amount,actions);document.body.append(dialog)}$("#channelToolSheet")?.classList.remove("on");if(!dialog.open)dialog.showModal()},"cmdToolDonations");
  cmdTool("Mention","＠",()=>{const input=$("#channelInput");if(input){input.value+=" @";input.focus()}$("#channelToolSheet")?.classList.remove("on")},"cmdToolMention");
  cmdTool("Vidéo","🎥",()=>{const input=document.querySelector("#channelPhotoInput");if(!input){const status=document.querySelector("#channelStatus");if(status)status.textContent="Pièces jointes indisponibles dans ce salon.";return}input.setAttribute("accept","image/*,video/mp4,video/webm,video/quicktime");$("#channelToolSheet")?.classList.remove("on");input.click()},"cmdToolVideo");
  cmdWallpaperApply()
 }
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
   improveTools();cmdExtras();setupMessageActions();

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

 // Local preview of profile-name styling in the chat. Server sync requires a dedicated profile API.
 const nameStyleKey="cmd-profile-name-style-v1";
 function readNameStyle(){try{return JSON.parse(localStorage.getItem(nameStyleKey)||"{}")}catch{return {}}}
 function applyNameStyle(){const st=readNameStyle();const own=mine();if(!own)return;for(const msg of document.querySelectorAll("#channelMessages .discord-message")){const id=msg.dataset.cmdAuthorId||msg.getAttribute("data-author-id")||"";if(id!==own)continue;const name=msg.querySelector(".msg-meta b");if(!name)continue;name.classList.toggle("cmd-styled-name",!!st.effect);name.style.setProperty("--cmd-name-gradient",(st.colors||["#9b00fb","#7ccbff","#f38ad8"]).join(","));name.style.fontFamily=st.font||"inherit";name.style.textShadow=st.effect==="neon"?"0 0 8px #a35bff,0 0 16px #ad68ff":"none";name.style.backgroundImage=st.effect==="uni"?"none":"linear-gradient(90deg,"+(st.colors||["#9b00fb","#7ccbff","#f38ad8"]).join(",")+")";name.style.color=st.effect==="uni"?(st.colors?.[0]||"#b38cff"):"";}}
 window.cmdOpenProfileNameStyle=openNameStyle;
 function openNameStyle(){let panel=$("#cmdNameStylePanel");if(!panel){panel=document.createElement("div");panel.id="cmdNameStylePanel";panel.innerHTML='<div class="cmd-name-style-card"><div class="cmd-name-style-head"><strong>Style du pseudonyme</strong><button type="button" id="cmdNameStyleClose" aria-label="Fermer">✕</button></div><label>Police<select id="cmdNameFont"><option value="inherit">Classique</option><option value="Georgia,serif">Journal</option><option value="cursive">Manuscrite</option><option value="monospace">Pixel / Mono</option><option value="fantasy">Fantaisie</option></select></label><label>Effet<select id="cmdNameEffect"><option value="uni">Uni</option><option value="gradient">Dégradé</option><option value="neon">Néon</option><option value="cartoon">Cartoon</option><option value="pop">Pop</option><option value="gelatine">Gélatine</option><option value="prisme">Prisme</option></select></label><div class="cmd-name-colors"><label>Couleur 1<input type="color" id="cmdNameC1"></label><label>Couleur 2<input type="color" id="cmdNameC2"></label><label>Couleur 3<input type="color" id="cmdNameC3"></label></div><div id="cmdNamePreview">Aperçu du pseudonyme</div><p>Prévisualisation sur cet appareil. Synchronisation des profils entre appareils non encore disponible.</p><div class="cmd-name-style-actions"><button type="button" id="cmdNameRandom">🎲 Surprends-moi</button><button type="button" id="cmdNameReset">Réinitialiser</button><button type="button" id="cmdNameSave">Enregistrer</button></div></div>';document.body.append(panel);$("#cmdNameStyleClose").onclick=()=>panel.classList.remove("on");$("#cmdNameReset").onclick=()=>{localStorage.removeItem(nameStyleKey);panel.classList.remove("on");applyNameStyle()};$("#cmdNameSave").onclick=()=>{const colors=[1,2,3].map(i=>$("#cmdNameC"+i).value);try{localStorage.setItem(nameStyleKey,JSON.stringify({font:$("#cmdNameFont").value,effect:$("#cmdNameEffect").value,colors}))}catch{}panel.classList.remove("on");applyNameStyle()};$("#cmdNameRandom").onclick=()=>{const palette=["#9b00fb","#7ccbff","#f38ad8","#11d3a6","#ffb13d","#ff3687"];for(let i=1;i<=3;i++)$("#cmdNameC"+i).value=palette[Math.floor(Math.random()*palette.length)];updatePreview()};for(const el of panel.querySelectorAll("select,input"))el.addEventListener("input",updatePreview)}const st=readNameStyle();$("#cmdNameFont").value=st.font||"inherit";$("#cmdNameEffect").value=st.effect||"prisme";[1,2,3].forEach((i)=>$("#cmdNameC"+i).value=st.colors?.[i-1]||["#9b00fb","#7ccbff","#f38ad8"][i-1]);updatePreview();panel.classList.add("on")}
 function updatePreview(){const p=$("#cmdNamePreview");if(!p)return;p.style.fontFamily=$("#cmdNameFont").value;p.style.backgroundImage="linear-gradient(90deg,"+[1,2,3].map(i=>$("#cmdNameC"+i).value).join(",")+")";p.style.textShadow=$("#cmdNameEffect").value==="neon"?"0 0 12px #a35bff":"none"}

 // Message actions: accessible via tap, long press or right click.
 function setupMessageActions(){if($("#cmdMessageActionSheet"))return;
  const sheet=document.createElement("div");sheet.id="cmdMessageActionSheet";sheet.innerHTML='<div class="cmd-message-action-panel"><div class="cmd-message-reactions"></div><div class="cmd-message-action-list"></div><button type="button" class="cmd-message-action-cancel">Fermer</button></div>';document.body.append(sheet);
  const close=()=>{sheet.classList.remove("on");sheet.setAttribute("aria-hidden","true")};sheet.setAttribute("role","dialog");sheet.setAttribute("aria-label","Actions du message");sheet.setAttribute("aria-modal","true");sheet.setAttribute("aria-hidden","true");sheet.addEventListener("click",e=>{if(e.target===sheet||e.target.closest(".cmd-message-action-cancel"))close()});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheet.classList.contains("on"))close()});
  function open(msg){const id=msg.dataset.messageId,author=msg.dataset.cmdAuthorId,own=author&&author===mine(),content=msg.querySelector(".msg-text")?.innerText||"";const actions=sheet.querySelector(".cmd-message-action-list");actions.replaceChildren();
   const add=(label,fn,destructive=false)=>{const b=document.createElement("button");b.type="button";b.textContent=label;if(destructive)b.className="destructive";b.onclick=()=>{close();fn()};actions.append(b)};
   const react=sheet.querySelector(".cmd-message-reactions");react.replaceChildren();for(const emoji of ["✅","👍","❤️","🤣","💯","👎","😊"]){const b=document.createElement("button");b.type="button";b.textContent=emoji;b.onclick=()=>{close();alert("Les réactions doivent être raccordées au service de messages.")};react.append(b)}
   if(own&&window.cmdSphereMessageActions?.mode()==="native")add("✏️ Modifier le message",async()=>{const next=prompt("Modifier ton message :",content);if(next===null||next===content)return;try{await window.cmdSphereMessageActions.edit(id,next)}catch(e){alert(e.message)}});
   add("↩ Répondre",()=>{try{window.cmdSphereMessageActions?.reply(id)}catch(e){const btn=msg.querySelector("[data-reply-message]");if(btn)btn.click();else alert(e.message||"Réponse indisponible")}});
   add("➦ Transférer",()=>{if(navigator.share)navigator.share({text:content}).catch(()=>{});else navigator.clipboard?.writeText(content)});
   add("▣ Copier le texte",()=>navigator.clipboard?.writeText(content));
   add("🔗 Copier le lien du message",()=>navigator.clipboard?.writeText(location.href.split("#")[0]+"#message-"+encodeURIComponent(id)));
   add("📌 Épingler",()=>alert("L’épinglage nécessite les permissions du serveur et une API dédiée."));
   if(own&&window.cmdSphereMessageActions?.mode()==="native")add("🗑 Supprimer le message",async()=>{if(!confirm("Supprimer définitivement ce message ?"))return;try{await window.cmdSphereMessageActions.delete(id)}catch(e){alert(e.message)}},true);
   sheet.classList.add("on");sheet.setAttribute("aria-hidden","false");sheet.querySelector(".cmd-message-action-cancel")?.focus()}
  let touchTimer=0,started=null,suppressClickUntil=0;const area=$("#channelMessages");if(!area)return;
  area.addEventListener("contextmenu",e=>{const msg=e.target.closest(".discord-message");if(!msg)return;e.preventDefault();open(msg)});
  area.addEventListener("click",e=>{if(Date.now()<suppressClickUntil)return;if(e.target.closest("button,a,input,textarea,video,audio"))return;const msg=e.target.closest(".discord-message");if(msg)open(msg)});
  area.addEventListener("touchstart",e=>{const msg=e.target.closest(".discord-message");if(!msg)return;started=msg;touchTimer=setTimeout(()=>{if(started){suppressClickUntil=Date.now()+900;open(started)}},550)},{passive:true});
  for(const event of ["touchend","touchcancel","touchmove"])area.addEventListener(event,()=>{clearTimeout(touchTimer);started=null},{passive:true});
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
   applyNameStyle();
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
