
(function(){
 if(window.__cmdNotifyLoaded)return;window.__cmdNotifyLoaded=true;
 const css=document.createElement("style");css.textContent='#cmdNotifyRoot{position:fixed;z-index:215;right:12px;bottom:max(14px,env(safe-area-inset-bottom));font:14px system-ui;pointer-events:none}#cmdNotifyEnable{pointer-events:auto;color:#fff;background:#312143;border:1px solid #a78bfa;border-radius:12px;padding:11px 14px;box-shadow:0 5px 25px #0009;font-weight:800}#cmdNotifyPopup{display:none;pointer-events:auto;max-width:min(365px,calc(100vw - 24px));border-radius:17px;padding:18px;color:#fff;background:linear-gradient(135deg,#312244,#13121b);border:2px solid #9871f4;box-shadow:0 15px 80px #000d}#cmdNotifyPopup.is-call{border-color:#4fd9ed;box-shadow:0 0 28px #22d3ee66,0 15px 80px #000d}#cmdNotifyPopup strong{font-size:18px}#cmdNotifyPopup p{margin:9px 0 14px;color:#ddd8e5;overflow-wrap:anywhere}#cmdNotifyActions{display:flex;gap:9px}#cmdNotifyAnswer,#cmdNotifyDismiss{flex:1;padding:11px 14px;text-align:center;text-decoration:none;font-weight:800;border:0;border-radius:10px;background:#248046;color:#fff;cursor:pointer}#cmdNotifyDismiss{background:#d33c55}#cmdNotifyEnable.hidden{display:none}';
 document.head.appendChild(css);
 const root=document.createElement("div");root.id="cmdNotifyRoot";
 root.innerHTML='<button type="button" id="cmdNotifyEnable">🔔 Activer les notifications</button><div id="cmdNotifyPopup" role="alertdialog" aria-live="assertive"><strong id="cmdNotifyTitle"></strong><p id="cmdNotifyBody"></p><div id="cmdNotifyActions"><a id="cmdNotifyAnswer" href="/messages">Ouvrir</a><button id="cmdNotifyDismiss">Fermer</button></div></div>';
 document.body.appendChild(root);
 const enable=document.getElementById("cmdNotifyEnable"),popup=document.getElementById("cmdNotifyPopup"),answer=document.getElementById("cmdNotifyAnswer"),dismiss=document.getElementById("cmdNotifyDismiss");
 const supported="serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&window.isSecureContext;
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
 const installed=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
 if(!supported)enable.textContent=ios&&!installed?"📲 Installer CMD Sphere":"Notifications non disponibles";
 if(supported&&Notification.permission==="granted")enable.classList.add("hidden");
 function decodeKey(b){const p=b.replace(/-/g,"+").replace(/_/g,"/");const raw=atob(p+"=".repeat((4-p.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
 async function connectPush(){
  if(!supported){alert(ios?"Sur iPhone, utilise Safari > Partager > Sur l’écran d’accueil, puis ouvre CMD Sphere.":"Ton navigateur ne prend pas en charge les notifications.");return}
  if(ios&&!installed){alert("Installe CMD Sphere sur l’écran d’accueil depuis Safari, puis ouvre l’application pour activer les notifications.");return}
  const perm=await Notification.requestPermission();if(perm!=="granted"){alert("Tu dois autoriser les notifications CMD Sphere dans les réglages.");return}
  const reg=await navigator.serviceWorker.register("/sw.js");
  const r=await fetch("/api/push/key",{cache:"no-store"}),j=await r.json();if(!r.ok||!j.publicKey)throw new Error("Clé de notification indisponible.");
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(j.publicKey)});
  const out=await fetch("/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(sub.toJSON())});
  if(!out.ok)throw new Error("Impossible d'enregistrer cet appareil.");
  enable.classList.add("hidden");alert("Notifications CMD Sphere activées sur cet appareil !");
 }
 enable.onclick=()=>connectPush().catch(e=>alert(e.message));
 if(supported&&Notification.permission==="granted")navigator.serviceWorker.register("/sw.js").then(async reg=>{
   const sub=await reg.pushManager.getSubscription();if(sub)await fetch("/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(sub.toJSON())});
 }).catch(()=>{});
 let last=0,first=true,timeout=null;try{last=Number(sessionStorage.getItem("cmdNotifyLastId")||0)}catch{}
 function bell(){
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const ctx=new Audio(),o=ctx.createOscillator(),g=ctx.createGain();
   o.type="sine";o.frequency.value=720;g.gain.value=.09;o.connect(g);g.connect(ctx.destination);o.start();
   o.frequency.setValueAtTime(920,ctx.currentTime+.35);g.gain.setValueAtTime(0,ctx.currentTime+.85);
   o.stop(ctx.currentTime+.9);o.onended=()=>ctx.close();}catch{}
 }
 function display(n){
   const call=n.kind==="call";popup.classList.toggle("is-call",call);popup.style.display="block";
   document.getElementById("cmdNotifyTitle").textContent=(call?"📞 ":"💬 ")+n.title;
   document.getElementById("cmdNotifyBody").textContent=n.body;
   answer.href=n.href||"/messages";answer.textContent=call?"📞 Accepter":"Ouvrir";
   dismiss.textContent=call?"✕ Refuser":"Fermer";
   if(call){bell();navigator.vibrate?.([350,180,350,180,350])}
   clearTimeout(timeout);timeout=setTimeout(()=>popup.style.display="none",call?45000:9500);
 }
 dismiss.onclick=()=>{popup.style.display="none";clearTimeout(timeout)};
 async function check(){
   if(document.visibilityState!=="visible")return;
   try{
    const r=await fetch("/api/notifications/poll?after="+last,{cache:"no-store"});if(!r.ok)return;
    const data=await r.json();
    for(const event of data.events||[]){
      last=Math.max(last,Number(event.id)||0);if(!first)display(event);
    }
    first=false;sessionStorage.setItem("cmdNotifyLastId",String(last));
   }catch{}
 }
 check();setInterval(check,4000);
})();
