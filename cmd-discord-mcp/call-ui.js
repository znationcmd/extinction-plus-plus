export function callPage(auth,room){
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#150e25">
<title>Appel · CMD Sphere</title>
<style>
*{box-sizing:border-box}body{background:radial-gradient(circle at 30% 0,#422069,#111018 65%);color:white;font:15px system-ui,-apple-system,Segoe UI,Arial;margin:0;min-height:100dvh}
.top{display:flex;align-items:center;padding:16px 20px;gap:15px;background:#15111ded;border-bottom:1px solid #ffffff16}
.top a{color:#e5d5ff;text-decoration:none;font-size:28px}.top b{font-size:18px}
.top small{display:block;color:#b5aac5;font-weight:400}.wrap{max-width:1100px;margin:auto;padding:20px 14px 95px}
.hero{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}.hero h1{font-size:24px;margin:0}
.dot{width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 10px #22c55e}
#notice{color:#cbbbe0;margin-top:5px;min-height:23px}
.stage{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:15px;align-items:stretch}
.tile{border-radius:18px;overflow:hidden;background:#1c1a22;border:1px solid #ffffff22;min-height:220px;aspect-ratio:16/10;position:relative;display:grid;place-items:center}
.tile video{height:100%;width:100%;object-fit:cover;background:#14121a}
.tile .noVideo{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(circle,#42265c,#19131f);font-size:55px;pointer-events:none}
.tile.hasVideo .noVideo{display:none}.tile label{position:absolute;left:12px;bottom:12px;background:#000b;border-radius:9px;padding:7px 10px;font-size:13px}
.controls{display:flex;align-items:center;justify-content:center;gap:12px;position:fixed;bottom:0;left:0;right:0;padding:14px 12px calc(18px + env(safe-area-inset-bottom));background:#17121bf2;z-index:20;flex-wrap:wrap}
.controls button{border:none;border-radius:14px;padding:13px 18px;background:#37303e;color:white;font-weight:800;cursor:pointer;min-height:48px}
.controls .red{background:#da373c}.controls .primary{background:#7055ef}.controls button:disabled{opacity:.45}
.join{margin:20px 0;background:#221630;border:1px solid #7156a7;padding:25px;border-radius:22px;max-width:540px}.join button{background:#7455ea;color:white;border:none;border-radius:11px;padding:12px 22px;font-weight:800;margin:8px 6px 0 0}
.hint{color:#bcb3ca;font-size:13px;line-height:1.5}.hidden{display:none!important}

.call-chat-btn{margin-left:auto;width:46px;height:46px;border:0;border-radius:14px;background:#2e2337;color:white;font-size:24px;cursor:pointer;position:relative}
.call-chat-btn:hover,.call-chat-btn.active{background:#5b3aa3}
.call-chat-count{position:absolute;right:-3px;top:-4px;background:#e63f5f;border-radius:999px;color:white;min-width:17px;padding:2px 5px;font-size:10px;display:none}
.chat-panel{position:fixed;right:0;top:0;bottom:0;width:min(415px,100vw);background:#26242b;z-index:51;box-shadow:-20px 0 60px #0009;border-left:1px solid #ffffff16;display:flex;flex-direction:column;transform:translateX(105%);transition:transform .22s ease}
.chat-panel.visible{transform:translateX(0)}
.call-chat-header{padding:calc(14px + env(safe-area-inset-top)) 16px 12px;border-bottom:1px solid #ffffff1a;display:flex;align-items:center;gap:12px;background:#201c25}
.call-chat-header strong{flex:1}.call-chat-header button{border:0;border-radius:10px;color:#fff;background:#3a3441;padding:8px 12px;font-size:21px}
.call-chat-messages{flex:1;min-height:0;overflow-y:auto;padding:16px 12px}
.call-chat-empty{text-align:center;color:#b8b3bf;padding:36px 8px}
.call-chat-item{display:flex;gap:10px;padding:6px 3px 12px}.call-chat-avatar{width:38px;height:38px;border-radius:50%;flex-shrink:0;background:#603ab2;display:grid;place-items:center;overflow:hidden;font-weight:bold}.call-chat-avatar img{width:100%;height:100%;object-fit:cover}.call-chat-copy{min-width:0;flex:1}.call-chat-copy header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.call-chat-copy time{font-size:11px;color:#a69daf}.call-chat-copy p{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45;color:#f4f0f9}
.call-chat-form{display:flex;align-items:end;gap:8px;padding:12px 12px calc(10px + env(safe-area-inset-bottom));background:#1d1a21}
.call-chat-form textarea{background:#3c3741;color:#fff;border:0;border-radius:14px;min-height:48px;max-height:190px;resize:none;padding:12px;flex:1;min-width:0;font:inherit;outline:none}
.call-chat-form button{background:#6755df;color:white;border:0;border-radius:11px;padding:12px;font-weight:900;cursor:pointer}
.call-chat-info{margin:0;padding:0 14px 9px;background:#1d1a21;color:#a9a2af;font-size:11px}
@media(min-width:980px){body.call-chat-open .wrap{margin-right:min(415px,33vw)}body.call-chat-open .controls{right:min(415px,33vw)}}
@media(max-width:650px){.top{padding:calc(12px + env(safe-area-inset-top)) 12px 10px}.call-chat-btn{flex-shrink:0}.chat-panel{width:100%;top:15%;bottom:0;border-radius:23px 23px 0 0;transform:translateY(110%);border-top:1px solid #ffffff25}.chat-panel.visible{transform:translateY(0)}}

</style>
</head>
<body><header class="top"><a href="/messages" aria-label="Retour">‹</a><div><b>CMD Sphere · Appel privé</b><small id="roomTitle">Conversation sécurisée</small></div><button type="button" id="callChatToggle" class="call-chat-btn" title="Messages pendant l’appel" aria-label="Ouvrir les messages">💬<span id="callChatCount" class="call-chat-count"></span></button></header>
<main class="wrap"><div class="hero"><span class="dot"></span><h1 id="heading">Appel audio / vidéo</h1></div><div id="notice">Prêt à rejoindre.</div>
<section class="join" id="join"><h2>Rejoindre la conversation</h2><p>Choisis le micro seul ou active aussi la caméra. Les autres participants du groupe peuvent rejoindre la même conférence.</p>
<button id="joinVoice">🎙️ Appel vocal</button><button id="joinVideo">📹 Appel vidéo</button>
<p class="hint">Le navigateur demandera la permission pour le micro ou la caméra. En cas de réseau restrictif, un relais TURN peut être nécessaire.</p></section>
<div class="stage" id="stage"></div>
</main>
<div class="controls hidden" id="controls"><button id="mic">🎙️ Micro</button><button id="camera">📷 Caméra</button><button id="share">🖥️ Écran</button><button id="hang" class="red">📞 Raccrocher</button></div>
<aside id="callChatPanel" class="chat-panel" aria-label="Messages pendant l'appel">
  <header class="call-chat-header"><strong>💬 Messages pendant l’appel</strong><button id="callChatClose" type="button" aria-label="Fermer">×</button></header>
  <div id="callChatMessages" class="call-chat-messages"><div class="call-chat-empty">Chargement des messages…</div></div>
  <form id="callChatForm" class="call-chat-form"><textarea id="callChatInput" rows="1" placeholder="Envoyer un message…" aria-label="Message"></textarea><button type="submit">Envoyer</button></form>
  <p class="call-chat-info">Les messages restent disponibles dans les MP ou le groupe après l’appel.</p>
</aside>
<script>
const ROOM=new URL(location.href).searchParams.get("room")||"";
const initialVideo=new URL(location.href).searchParams.get("video")==="1";
const $=s=>document.querySelector(s);
const peerId=crypto.randomUUID();
let localStream=null,connected=false,wantsVideo=false,muted=false,after=0,poller=null,polling=false;
const pcs=new Map(),candidates=new Map(),known=new Set(),peerNames=new Map();
const config={iceServers:[{urls:"stun:stun.l.google.com:19302"}]};
const safe=s=>String(s||"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
function say(s){$("#notice").textContent=s}
async function post(path,body){
 const r=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Erreur réseau");return d;
}
function tile(id,name,stream,self=false){
 const key=self?"local":id;
 let el=document.querySelector('[data-peer="'+key+'"]');
 if(!el){el=document.createElement("div");el.className="tile";el.dataset.peer=key;
  el.innerHTML='<video playsinline autoplay '+(self?"muted":"")+'></video><div class="noVideo">'+(self?"👤":"🎧")+'</div><label></label>';$("#stage").append(el);}
 el.querySelector("label").textContent=name;
 const vid=el.querySelector("video");if(vid.srcObject!==stream)vid.srcObject=stream;
 if(self)vid.muted=true;
 const hasVideo=Boolean(stream?.getVideoTracks().some(t=>t.readyState==="live"&&t.enabled));
 el.classList.toggle("hasVideo",hasVideo);
 vid.play().catch(()=>{});return el;
}
async function send(to,type,payload){return post("/api/calls/signal",{room:ROOM,peerId,toPeer:to,type,payload})}
function connection(id){
 if(pcs.has(id))return pcs.get(id);
 const pc=new RTCPeerConnection(config);pcs.set(id,pc);
 if(localStream)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
 pc.onicecandidate=e=>{if(e.candidate)send(id,"ice",e.candidate.toJSON()).catch(()=>{})};
 pc.ontrack=e=>{const stream=e.streams?.[0]||new MediaStream([e.track]);tile(id,peerNames.get(id)||"Participant",stream);e.track.onmute=()=>{}};
 pc.onconnectionstatechange=()=>{if(pc.connectionState==="failed"){say("Connexion réseau difficile. Vérifie ton accès Internet.");}if(pc.connectionState==="disconnected"){say("Reconnexion d'un participant…");}};
 return pc;
}
async function flushIce(id){
 const pc=pcs.get(id),waiting=candidates.get(id)||[];if(!pc?.remoteDescription)return;
 while(waiting.length){try{await pc.addIceCandidate(waiting.shift())}catch{}}
 candidates.set(id,waiting);
}
async function makeOffer(id){
 const pc=connection(id);if(pc.signalingState!=="stable")return;
 const offer=await pc.createOffer();await pc.setLocalDescription(offer);await send(id,"offer",pc.localDescription);
}
async function handleSignal(s){
 const id=s.from; if(!connected||!id||id===peerId)return;
 const pc=connection(id);
 if(s.type==="offer"){
  await pc.setRemoteDescription(new RTCSessionDescription(s.payload));await flushIce(id);
  const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await send(id,"answer",pc.localDescription);
 }else if(s.type==="answer"){
  if(pc.signalingState==="have-local-offer"){await pc.setRemoteDescription(new RTCSessionDescription(s.payload));await flushIce(id)}
 }else if(s.type==="ice"){
  if(pc.remoteDescription){try{await pc.addIceCandidate(new RTCIceCandidate(s.payload))}catch{}}
  else{const q=candidates.get(id)||[];q.push(new RTCIceCandidate(s.payload));candidates.set(id,q)}
 }
}
async function tick(){
 if(!connected||polling)return;polling=true;
 try{
  const data=await post("/api/calls/poll",{room:ROOM,peerId,after,video:wantsVideo});
  const available=new Set();
  for(const p of data.peers||[]){
   available.add(p.peerId);peerNames.set(p.peerId,p.name);
   if(!known.has(p.peerId)){known.add(p.peerId);connection(p.peerId);if(peerId<p.peerId)await makeOffer(p.peerId)}
  }
  for(const id of [...known])if(!available.has(id)){known.delete(id);pcs.get(id)?.close();pcs.delete(id);document.querySelector('[data-peer="'+id+'"]')?.remove()}
  for(const s of data.signals||[]){after=Math.max(after,s.id);try{await handleSignal(s)}catch(err){say("Signal vidéo : "+err.message)}}
  say("Dans l'appel · "+(available.size+1)+" participant(s)");
 }catch(e){say(e.message)}finally{polling=false}
}
async function join(video){
 if(connected)return;
 if(!navigator.mediaDevices?.getUserMedia){say("Micro ou caméra indisponible dans ce navigateur.");return}
 try{
  try{localStream=await navigator.mediaDevices.getUserMedia({audio:true,video});wantsVideo=video}
  catch(e){if(!video)throw e;localStream=await navigator.mediaDevices.getUserMedia({audio:true});wantsVideo=false;say("Caméra indisponible : appel audio seulement.")}
  await post("/api/calls/join",{room:ROOM,peerId,video:wantsVideo});
  connected=true;$("#join").classList.add("hidden");$("#controls").classList.remove("hidden");
  tile("local","Toi",localStream,true);
  say("En attente des autres participants…");
  await tick();poller=setInterval(tick,1600);
 }catch(e){localStream?.getTracks().forEach(t=>t.stop());localStream=null;say("Impossible de rejoindre : "+e.message)}
}
async function leave(){
 if(!connected){location.href="/messages";return}
 connected=false;clearInterval(poller);for(const pc of pcs.values())pc.close();pcs.clear();known.clear();
 localStream?.getTracks().forEach(t=>t.stop());
 post("/api/calls/leave",{room:ROOM,peerId}).catch(()=>{});
 location.href="/messages";
}
$("#joinVoice").onclick=()=>join(false);
$("#joinVideo").onclick=()=>join(true);
$("#mic").onclick=()=>{
 if(!localStream)return;muted=!muted;for(const t of localStream.getAudioTracks())t.enabled=!muted;
 $("#mic").textContent=muted?"🔇 Réactiver":"🎙️ Micro";
};
$("#camera").onclick=async()=>{
 if(!localStream)return;
 const current=localStream.getVideoTracks()[0];
 if(current){wantsVideo=!wantsVideo;current.enabled=wantsVideo;tile("local","Toi",localStream,true)}
 else{
  try{const extra=await navigator.mediaDevices.getUserMedia({video:true,audio:false}),track=extra.getVideoTracks()[0];localStream.addTrack(track);
   wantsVideo=true;tile("local","Toi",localStream,true);
   for(const [id,pc] of pcs){pc.addTrack(track,localStream);if(pc.signalingState==="stable"&&peerId<id)await makeOffer(id)}
  }catch(e){say("Caméra indisponible : "+e.message)}
 }
 $("#camera").textContent=wantsVideo?"📷 Couper caméra":"📷 Activer caméra";
};
$("#share").onclick=async()=>{
 if(!navigator.mediaDevices?.getDisplayMedia){say("Partage d'écran indisponible sur cet appareil.");return}
 try{const captured=await navigator.mediaDevices.getDisplayMedia({video:true}),track=captured.getVideoTracks()[0];
  const current=localStream?.getVideoTracks()[0];
  for(const pc of pcs.values()){const sender=pc.getSenders().find(x=>x.track?.kind==="video");if(sender)await sender.replaceTrack(track)}
  tile("local","Toi · écran",captured,true);
  track.onended=async()=>{for(const pc of pcs.values()){const sender=pc.getSenders().find(x=>x.track?.kind==="video");if(sender)await sender.replaceTrack(current||null)}tile("local","Toi",localStream,true)};
 }catch(e){say("Partage impossible : "+e.message)}
};

const callChatType=ROOM.startsWith("group:")?"group":"dm";
const callChatRoomId=ROOM.split(":")[1]||"";
let callChatVisible=false,callChatLast="",callChatSeen="",callChatTimer=null,callChatHasLoaded=false;
const callMyName="Moi";
function callChatElem(tag,cls,value){
 const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el;
}
async function callChatApi(url,body){
 const r=await fetch(url,{method:body?"POST":"GET",headers:body?{"content-type":"application/json"}:{},body:body?JSON.stringify(body):undefined,cache:"no-store",credentials:"same-origin"});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Erreur");return data;
}
async function callChatLoad(force=false){
 if(!callChatRoomId)return;
 try{
  const path=(callChatType==="group"?"/api/groups/thread/":"/api/dm/thread/")+encodeURIComponent(callChatRoomId);
  const data=await callChatApi(path),messages=Array.isArray(data.messages)?data.messages:[];
  const latest=String(messages[messages.length-1]?.id||"");
  if(callChatHasLoaded&&latest!==callChatLast&&!callChatVisible){
    const badge=$("#callChatCount");badge.textContent="●";badge.style.display="inline-block";
  }
  if(!force&&callChatHasLoaded&&latest===callChatLast)return;
  const box=$("#callChatMessages");const isAtBottom=box.scrollHeight-box.scrollTop-box.clientHeight<130;
  callChatLast=latest;callChatHasLoaded=true;box.replaceChildren();
  const fallback=data.other?.displayName||"Participant";
  if(!messages.length)box.append(callChatElem("div","call-chat-empty","Aucun message. Écris le premier pendant l’appel."));
  else for(const m of messages){
    const author=String(m.senderName|| (String(m.senderUserId)===String(data.myId||"")?callMyName:fallback) ||"Utilisateur");
    const row=callChatElem("article","call-chat-item"),avatar=callChatElem("span","call-chat-avatar",author.slice(0,1).toUpperCase());
    if(m.avatar&&String(m.avatar).startsWith("https://")){
      const im=document.createElement("img");im.src=m.avatar;im.alt="";avatar.replaceChildren(im);
    }
    const content=callChatElem("div","call-chat-copy"),head=callChatElem("header"),time=callChatElem("time","",new Date(m.createdAt||Date.now()).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}));
    head.append(callChatElem("strong","",author),time);
    content.append(head,callChatElem("p","",m.body||""));row.append(avatar,content);box.append(row);
  }
  if(force||isAtBottom)box.scrollTop=box.scrollHeight;
 }catch(e){if(force)$("#callChatMessages").replaceChildren(callChatElem("div","call-chat-empty",e.message))}
}
function toggleCallChat(){
 callChatVisible=!callChatVisible;$("#callChatPanel").classList.toggle("visible",callChatVisible);document.body.classList.toggle("call-chat-open",callChatVisible);
 $("#callChatToggle").classList.toggle("active",callChatVisible);
 if(callChatVisible){$("#callChatCount").style.display="none";callChatLoad(true);$("#callChatInput").focus();}
}
$("#callChatToggle").onclick=toggleCallChat;
$("#callChatClose").onclick=toggleCallChat;
$("#callChatForm").onsubmit=async e=>{
 e.preventDefault();const field=$("#callChatInput"),body=field.value.trim();if(!body)return;field.value="";
 try{
  const endpoint=callChatType==="group"?"/api/groups/send":"/api/dm/send";
  const payload=callChatType==="group"?{groupId:callChatRoomId,body}:{threadId:callChatRoomId,body};
  await callChatApi(endpoint,payload);await callChatLoad(true);
 }catch(err){field.value=body;$("#callChatMessages").append(callChatElem("p","call-chat-empty","Échec de l’envoi : "+err.message))}
};
callChatTimer=setInterval(()=>callChatLoad(false),4000);
callChatLoad(true);

$("#hang").onclick=leave;
window.addEventListener("pagehide",()=>{if(connected){navigator.sendBeacon?.("/api/calls/leave",new Blob([JSON.stringify({room:ROOM,peerId})],{type:"application/json"}));for(const pc of pcs.values())pc.close();localStream?.getTracks().forEach(t=>t.stop())}});
$("#roomTitle").textContent=ROOM.startsWith("group:")?"Appel de groupe":"Appel privé";
if(initialVideo)$("#joinVideo").focus();
</script></body></html>`;
}