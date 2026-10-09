/* CMD Sphere Studio Pub — mobile/desktop creative editor with on-device video rendering. */
(()=>{"use strict";
if(window.__cmdPromoStudio)return;window.__cmdPromoStudio=true;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const MODES=[["video","🎬 Vidéo"],["photos","🖼️ Photos animées"],["story","📱 Story"],["gif","✨ GIF"],["poster","🪧 Affiche"]];
const THEMES={epic:["Épique","#090d27","#58309c"],neon:["Néon","#111025","#ea318f"],survival:["Survie","#0c1c1a","#437c48"],rp:["Roleplay","#221522","#ae624c"],space:["Galaxie","#081323","#207ac7"],minimal:["Sobre","#181923","#454957"]};
const FORMATS={"9:16":[720,1280],"1:1":[720,720],"16:9":[1280,720]};
let root=null,canvas=null,ctx=null,clips=[],musicFile=null,recorded=null,recordedUrl="",raf=0,playStart=0,playing=false,videoRecorder=null,audioCtx=null,previewAudio=null,mountTimer=null;
const state={mode:"video",theme:"epic",format:"9:16",effect:"zoom",transition:"fade",filter:"natural",duration:12,music:"electro",volume:40,headline:"Rejoins notre serveur !",subtitle:"Une communauté t'attend",emoji:"🚀",title:"Publicité de mon serveur",guildId:""};
const safe=s=>String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const note=t=>{const n=$("#cmdStudioNotice");if(n)n.textContent=String(t||"")};
function buttonHTML(arr,key){return arr.map(([v,label])=>'<button type="button" data-studio-'+key+'="'+safe(v)+'" class="'+(state[key]===v?"selected":"")+'">'+label+'</button>').join("")}
function open(){
 if(root){root.hidden=false;document.body.classList.add("cmd-studio-active");return}
 root=document.createElement("section");root.id="cmdPromoStudio";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-label","Studio publicité CMD Sphere");
 root.innerHTML='<header class="cmd-studio-header"><b>🎬 CMD Sphere · Studio Pub</b><button type="button" id="cmdStudioClose" aria-label="Fermer">✕</button></header>'+
 '<div class="cmd-studio-main"><div class="cmd-studio-preview"><canvas id="cmdStudioCanvas" width="540" height="960" aria-label="Prévisualisation animée"></canvas><div class="cmd-studio-playbar"><button type="button" id="cmdStudioPlay">▶ Prévisualiser</button><span id="cmdStudioClock">0:00 / 0:12</span></div><small>La musique et l’animation sont assemblées lors de l’export vidéo.</small></div>'+
 '<div class="cmd-studio-controls"><h2>Que veux-tu créer ?</h2><div class="cmd-studio-choices" id="cmdStudioModes">'+buttonHTML(MODES,"mode")+'</div>'+
 '<div class="cmd-studio-card"><h3>1. Images et vidéos</h3><label class="cmd-studio-upload">＋ Ajouter photos ou vidéos<input id="cmdStudioMedia" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple></label><div id="cmdStudioFiles" class="cmd-studio-files"></div><small>Choisis plusieurs images pour un diaporama. Les fichiers sources peuvent dépasser 10 Mo (150 Mo par fichier).</small></div>'+
 '<div class="cmd-studio-card"><h3>2. Format et modèle</h3><div class="cmd-studio-choices">'+buttonHTML([["9:16","📱 Vertical"],["1:1","⬛ Carré"],["16:9","🖥️ Horizontal"]],"format")+'</div><div id="cmdStudioThemes" class="cmd-studio-choices cmd-studio-themes">'+buttonHTML(Object.entries(THEMES).map(([k,v])=>[k,v[0]]),"theme")+'</div></div>'+
 '<div class="cmd-studio-card"><h3>3. Texte et autocollants</h3><label>Texte principal<input id="cmdStudioHeadline" maxlength="100" placeholder="Rejoins notre serveur"></label><label>Sous-titre<input id="cmdStudioSubtitle" maxlength="140" placeholder="Événement, RP, communauté…"></label><label>Autocollant <input id="cmdStudioEmoji" maxlength="12" placeholder="🚀 🔥 💎"></label></div>'+
 '<div class="cmd-studio-card"><h3>4. Animations et filtres</h3><label>Effet<select id="cmdStudioEffect"><option value="zoom">Zoom dynamique</option><option value="pan">Mouvement caméra</option><option value="pulse">Pulsation</option><option value="slide">Glissement</option><option value="none">Aucun</option></select></label><label>Transition<select id="cmdStudioTransition"><option value="fade">Fondu</option><option value="slide">Glissé</option><option value="cut">Coupe directe</option></select></label><label>Filtre<select id="cmdStudioFilter"><option value="natural">Naturel</option><option value="vivid">Vif</option><option value="warm">Chaud</option><option value="retro">Rétro</option><option value="mono">Noir et blanc</option></select></label><label>Durée : <output id="cmdStudioDurLabel">12 s</output><input id="cmdStudioDuration" type="range" min="5" max="30" step="1" value="12"></label></div>'+
 '<div class="cmd-studio-card"><h3>5. Musique</h3><label>Choix de la musique<select id="cmdStudioMusic"><option value="electro">Électro CMD (libre, générée)</option><option value="epic">Épique CMD (libre, générée)</option><option value="chill">Chill CMD (libre, générée)</option><option value="file">Ma musique (fichier personnel)</option><option value="none">Sans musique</option></select></label><label class="cmd-studio-upload">♪ Importer un son<input type="file" id="cmdStudioAudioFile" accept="audio/*"></label><small id="cmdStudioMusicName">Aucun fichier musical sélectionné.</small><label>Volume : <output id="cmdStudioVolumeLabel">40 %</output><input id="cmdStudioVolume" type="range" min="0" max="100" step="5" value="40"></label><small>Utilise tes propres musiques ou des sons autorisés. Les sons TikTok commerciaux ne sont pas copiés.</small></div>'+
 '<div class="cmd-studio-card"><h3>6. Publicité de serveur</h3><label>Titre de publication<input id="cmdStudioTitle" maxlength="100"></label><label>Mon serveur<select id="cmdStudioServer"><option value="">Choisir mon serveur…</option></select></label><small>Pour publier dans CMD Sphere, tu dois être propriétaire ou administrateur de ton serveur.</small></div>'+
 '<div class="cmd-studio-actions"><button type="button" id="cmdStudioSaveDraft">💾 Brouillon</button><button type="button" id="cmdStudioLoadDraft">📂 Reprendre</button><button type="button" id="cmdStudioPng">🖼️ Image PNG</button><button type="button" id="cmdStudioExport" class="primary">🎬 Exporter avec musique</button><button type="button" id="cmdStudioPublish" class="primary" disabled>🚀 Publier sur CMD Sphere</button><div id="cmdStudioPublication"></div><p id="cmdStudioNotice" role="status" aria-live="polite"></p></div></div></div>';
 document.body.append(root);document.body.classList.add("cmd-studio-active");
 canvas=$("#cmdStudioCanvas");ctx=canvas.getContext("2d",{alpha:false});
 $("#cmdStudioClose").onclick=close;
 $("#cmdStudioPlay").onclick=togglePreview;
 $("#cmdStudioMedia").onchange=e=>{addFiles(e.target.files);e.target.value=""};
 $("#cmdStudioAudioFile").onchange=e=>{const f=e.target.files?.[0];if(f&&f.size<=150*1024*1024&&f.type.startsWith("audio/")){musicFile=f;state.music="file";$("#cmdStudioMusic").value="file";$("#cmdStudioMusicName").textContent=f.name;note("Musique chargée : "+f.name)}else if(f)note("Fichier audio invalide ou supérieur à 150 Mo");e.target.value=""};
 $$(".cmd-studio-choices button",root).forEach(b=>b.onclick=()=>choose(b));
 const ids={Headline:"headline",Subtitle:"subtitle",Emoji:"emoji",Title:"title",Effect:"effect",Transition:"transition",Filter:"filter",Duration:"duration",Music:"music",Volume:"volume",Server:"guildId"};
 for(const [id,key] of Object.entries(ids)){
  const field=$("#cmdStudio"+id);if(!field)continue;
  field.value=state[key];field.addEventListener("input",()=>{state[key]=["duration","volume"].includes(key)?Number(field.value):field.value;$("#cmdStudioDurLabel").textContent=state.duration+" s";$("#cmdStudioVolumeLabel").textContent=state.volume+" %";render(0)});
 }
 $("#cmdStudioSaveDraft").onclick=saveDraft;$("#cmdStudioLoadDraft").onclick=loadDraft;
 $("#cmdStudioPng").onclick=savePng;$("#cmdStudioExport").onclick=exportVideo;$("#cmdStudioPublish").onclick=publish;
 document.addEventListener("keydown",onEscape);
 loadServers();resize();render(0);
}
function choose(btn){
 const attr=[...btn.attributes].find(x=>x.name.startsWith("data-studio-"));if(!attr)return;
 const key=attr.name.slice(12),value=attr.value;
 if(!(key in state))return;
 state[key]=value;$$("[data-studio-"+key+"]",root).forEach(b=>b.classList.toggle("selected",b===btn));
 if(key==="mode"){if(value==="story")state.format="9:16";else if(value==="poster")state.format="1:1";else if(value==="video")state.format="9:16";else if(value==="gif")state.duration=6;
  $("#cmdStudioDuration").value=state.duration;$("#cmdStudioDurLabel").textContent=state.duration+" s";$$("[data-studio-format]",root).forEach(b=>b.classList.toggle("selected",b.dataset.studioFormat===state.format))}
 if(key==="format"||key==="mode")resize();
 render(0);
}
function close(){
 stop();if(previewAudio){previewAudio.pause();previewAudio=null}if(root)root.hidden=true;document.body.classList.remove("cmd-studio-active");
}
function onEscape(e){if(e.key==="Escape"&&root&&!root.hidden)close()}
function resize(){
 if(!canvas)return;const [w,h]=FORMATS[state.format]||FORMATS["9:16"];canvas.width=w;canvas.height=h;canvas.style.aspectRatio=w+"/"+h;render(0);
}
function addFiles(files){
 let count=0;
 for(const f of Array.from(files||[])){
  if(!(/^(image\/(png|jpeg|webp|gif|heic|heif)|video\/(mp4|webm|quicktime))$/i.test(f.type)))continue;
  if(f.size>150*1024*1024){note(f.name+" dépasse 150 Mo.");continue}
  if(clips.length>=12){note("Maximum 12 photos ou vidéos par création.");break}
  const url=URL.createObjectURL(f),video=f.type.startsWith("video/"),element=document.createElement(video?"video":"img");
  element.src=url;if(video){element.muted=true;element.loop=true;element.playsInline=true;element.preload="metadata"}else element.decoding="async";
  clips.push({file:f,url,element,video});
  if(video)element.onloadedmetadata=()=>render(0);else element.onload=()=>render(0);
  count++;
 }
 if(count)note(count+" fichier(s) ajouté(s). Tu peux les réorganiser.");
 drawFiles();render(0);
}
function drawFiles(){
 const box=$("#cmdStudioFiles");if(!box)return;box.replaceChildren();
 clips.forEach((item,i)=>{
  const chip=document.createElement("div");chip.className="cmd-studio-file";
  const title=document.createElement("span");title.textContent=(i+1)+". "+item.file.name.slice(0,42);
  const up=document.createElement("button");up.textContent="↑";up.title="Monter";up.disabled=i===0;up.onclick=()=>swap(i,i-1);
  const down=document.createElement("button");down.textContent="↓";down.title="Descendre";down.disabled=i===clips.length-1;down.onclick=()=>swap(i,i+1);
  const del=document.createElement("button");del.textContent="×";del.title="Retirer";del.onclick=()=>{URL.revokeObjectURL(item.url);clips.splice(i,1);drawFiles();render(0)};
  chip.append(title,up,down,del);box.append(chip);
 });
}
function swap(a,b){[clips[a],clips[b]]=[clips[b],clips[a]];drawFiles();render(0)}
function roundedRect(context,x,y,w,h,r){
 context.beginPath();context.roundRect(x,y,w,h,r);context.fill();
}
function wrapWords(text,maxWidth,fontSize,maxLines){
 const words=String(text||"").split(/\s+/).filter(Boolean),lines=[];let line="";
 for(const word of words){const trial=line?line+" "+word:word;if(ctx.measureText(trial).width>maxWidth&&line){lines.push(line);line=word}else line=trial}
 if(line)lines.push(line);return lines.slice(0,maxLines);
}
function drawMedia(item,t,local,slot){
 if(!item)return;
 const el=item.element,w=canvas.width,h=canvas.height;
 if(item.video&&el.readyState>=2&&Math.abs(el.currentTime-local)>0.4){
  try{el.currentTime=Math.min(Math.max(0,local),Math.max(0,(el.duration||slot)-0.05))}catch{}
 }
 const iw=item.video?el.videoWidth:el.naturalWidth,ih=item.video?el.videoHeight:el.naturalHeight;
 if(!iw||!ih)return;
 const p=Math.min(1,Math.max(0,local/slot));
 let zoom=1,x=0,y=0;
 if(state.effect==="zoom")zoom=1.025+0.13*p;
 if(state.effect==="pan"){zoom=1.12;x=(p-.5)*w*.12}
 if(state.effect==="pulse")zoom=1.03+.05*Math.sin(t*5);
 if(state.effect==="slide")x=(.5-p)*w*.16;
 ctx.save();ctx.translate(w/2+x,h/2+y);ctx.scale(zoom,zoom);
 const filters={natural:"none",vivid:"saturate(1.6) contrast(1.12)",warm:"sepia(.24) saturate(1.3)",retro:"sepia(.6) contrast(1.2)",mono:"grayscale(1) contrast(1.18)"};
 ctx.filter=filters[state.filter]||"none";
 const scale=Math.max(w/iw,h/ih);ctx.drawImage(el,-iw*scale/2,-ih*scale/2,iw*scale,ih*scale);
 ctx.restore();
}
function render(time=0){
 if(!ctx||!canvas)return;
 const w=canvas.width,h=canvas.height,t=Math.max(0,time),theme=THEMES[state.theme]||THEMES.epic;
 const grd=ctx.createLinearGradient(0,0,w,h);grd.addColorStop(0,theme[1]);grd.addColorStop(1,theme[2]);ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);
 ctx.globalAlpha=1;
 if(clips.length){
  const slot=state.duration/clips.length,idx=Math.min(clips.length-1,Math.floor(Math.max(0,t-.0001)/slot)),local=t-idx*slot;
  const phase=Math.min(1,Math.max(0,local/slot));
  drawMedia(clips[idx],t,Math.max(0,local),slot);
  if(state.transition==="fade"){
   if(local<.35){ctx.fillStyle=theme[1];ctx.globalAlpha=(.35-local)/.35;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1}
  }
  if(state.transition==="slide"&&local<.35){ctx.fillStyle=theme[1];ctx.globalAlpha=.4*(1-local/.35);ctx.fillRect(0,0,w,h);ctx.globalAlpha=1}
 }
 const overlay=ctx.createLinearGradient(0,h*.35,0,h);overlay.addColorStop(0,"rgba(0,0,0,0)");overlay.addColorStop(1,"rgba(0,0,0,.86)");ctx.fillStyle=overlay;ctx.fillRect(0,0,w,h);
 ctx.fillStyle="rgba(255,255,255,.18)";roundedRect(ctx,w*.065,h*.055,w*.36,Math.min(66,h*.065),18);
 ctx.fillStyle="#ffffff";ctx.textAlign="left";ctx.font="bold "+Math.round(w*.038)+"px system-ui";ctx.fillText("CMD SPHERE",w*.09,h*.096);
 const anim=state.effect==="pulse"?.99+.01*Math.sin(t*7):1;
 const size=Math.round(w*.077*anim);ctx.font="900 "+size+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,.8)";ctx.shadowBlur=16;ctx.shadowOffsetY=5;
 let head=wrapWords(state.headline,w*.84,size,3);if(!head.length)head=["Ton serveur, ton univers"];
 const lineHeight=size*1.18,mid=h*.67-(head.length-1)*lineHeight/2;
 head.forEach((line,i)=>ctx.fillText(line,w/2,mid+i*lineHeight));
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.font="500 "+Math.round(w*.041)+"px system-ui";ctx.fillStyle="#f6eafd";
 const sub=wrapWords(state.subtitle,w*.85,w*.041,2);sub.forEach((line,i)=>ctx.fillText(line,w/2,h*.82+i*w*.056));
 if(state.emoji){ctx.font=Math.round(w*.13)+"px system-ui";ctx.fillText(state.emoji.slice(0,8),w*.5,h*.43)}
 ctx.font="bold "+Math.round(w*.037)+"px system-ui";ctx.fillStyle="#ebc8ff";ctx.fillText("Rejoins la communauté ✦",w/2,h*.95);
 const clk=$("#cmdStudioClock");if(clk)clk.textContent="0:"+String(Math.floor(Math.min(state.duration,t))).padStart(2,"0")+" / 0:"+String(state.duration).padStart(2,"0");
}
function stop(){
 playing=false;cancelAnimationFrame(raf);raf=0;
 if($("#cmdStudioPlay"))$("#cmdStudioPlay").textContent="▶ Prévisualiser";
 for(const c of clips)if(c.video)c.element.pause();
 if(previewAudio){previewAudio.pause();previewAudio=null}
}
function playFrame(){
 if(!playing)return;
 const time=(performance.now()-playStart)/1000;
 if(time>=state.duration){stop();render(state.duration);return}
 render(time);raf=requestAnimationFrame(playFrame);
}
function togglePreview(){
 if(playing){stop();return}
 stop();playing=true;playStart=performance.now();$("#cmdStudioPlay").textContent="⏸ Arrêter";
 for(const c of clips)if(c.video){try{c.element.currentTime=0;void c.element.play().catch(()=>{})}catch{}}
 if(musicFile&&state.music==="file"){previewAudio=new Audio(URL.createObjectURL(musicFile));previewAudio.volume=state.volume/100;previewAudio.play().catch(()=>{})}
 playFrame();
}
function blobDownload(blob,filename){
 const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
}
async function savePng(){
 stop();render(0);
 const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));if(!blob){note("Export image non pris en charge.");return}
 recorded=blob;$("#cmdStudioPublish").disabled=false;blobDownload(blob,"CMD-Sphere-Publicite.png");note("Image PNG exportée. Tu peux maintenant la publier.");
}
function synthMusic(audio,dest,total){
 const vol=state.volume/100;if(state.music==="none"||state.music==="file"||!vol)return;
 const scores={electro:[220,330,440,330,261.6,392,523.2,392],epic:[110,164.8,220,164.8,130.8,196,261.6,196],chill:[196,246.9,293.7,246.9,174.6,220,261.6,220]};
 const notes=scores[state.music]||scores.electro,start=audio.currentTime+.04,count=Math.ceil(total*3);
 for(let i=0;i<count;i++){
  const osc=audio.createOscillator(),gain=audio.createGain(),when=start+i/3;
  osc.type=state.music==="epic"?"sawtooth":state.music==="chill"?"sine":"triangle";osc.frequency.value=notes[i%notes.length];
  const amp=.045*vol;gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(amp,when+.025);gain.gain.exponentialRampToValueAtTime(.0001,when+.29);
  osc.connect(gain);gain.connect(dest);osc.start(when);osc.stop(when+.31);
 }
}
async function exportVideo(){
 if($("#cmdStudioExport").disabled)return;stop();note("Préparation de la vidéo et de la musique…");
 if(!canvas.captureStream||!window.MediaRecorder){note("L’export vidéo n’est pas pris en charge par ce navigateur. Tu peux enregistrer l’affiche PNG.");return}
 const type=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(x=>MediaRecorder.isTypeSupported(x));
 if(!type){note("Export vidéo indisponible sur ce navigateur. Utilise l’export PNG ou un navigateur compatible.");return}
 const exportButton=$("#cmdStudioExport");exportButton.disabled=true;$("#cmdStudioPublish").disabled=true;
 let soundtrack=null,source=null,audio=null,dest=null,stream=null;
 try{
  render(0);stream=canvas.captureStream(24);audio=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();dest=audio.createMediaStreamDestination();
  if(state.music==="file"&&musicFile){
    soundtrack=new Audio(URL.createObjectURL(musicFile));soundtrack.loop=true;soundtrack.crossOrigin="anonymous";soundtrack.volume=1;
    source=audio.createMediaElementSource(soundtrack);const volume=audio.createGain();volume.gain.value=state.volume/100;source.connect(volume);volume.connect(dest);
  }else synthMusic(audio,dest,state.duration);
  const combined=new MediaStream([...stream.getVideoTracks(),...dest.stream.getAudioTracks()]);
  const parts=[],rec=new MediaRecorder(combined,{mimeType:type,videoBitsPerSecond:2700000});
  videoRecorder=rec;
  const result=new Promise((resolve,reject)=>{rec.ondataavailable=e=>{if(e.data?.size)parts.push(e.data)};rec.onerror=e=>reject(e.error||Error("Enregistrement interrompu"));rec.onstop=()=>resolve(new Blob(parts,{type:type.startsWith("video/mp4")?"video/mp4":"video/webm"}))});
  rec.start(500);if(soundtrack)await soundtrack.play();
  let begin=performance.now();
  await new Promise(resolve=>{
   const frame=()=>{
    const t=Math.min(state.duration,(performance.now()-begin)/1000);render(t);
    if(t>=state.duration||rec.state==="inactive"){resolve();return}
    requestAnimationFrame(frame);
   };requestAnimationFrame(frame);
  });
  if(rec.state!=="inactive")rec.stop();const blob=await result;
  if(!blob.size)throw Error("Le navigateur a créé une vidéo vide.");
  recorded=blob;
  if(recordedUrl)URL.revokeObjectURL(recordedUrl);recordedUrl=URL.createObjectURL(blob);
  $("#cmdStudioPublish").disabled=blob.size>60*1024*1024;
  blobDownload(blob,"CMD-Sphere-Publicite."+(blob.type==="video/mp4"?"mp4":"webm"));
  note("Vidéo avec musique créée : "+(blob.size/1048576).toFixed(1)+" Mo."+(blob.size>60*1048576?" Réduis sa durée pour la publier.":" Tu peux aussi la publier sur CMD Sphere."));
 }catch(e){console.error("[CMD Studio export]",e);note("Export impossible : "+(e.message||e)+". Tu peux essayer l’image PNG.")}
 finally{soundtrack?.pause();if(soundtrack?.src)URL.revokeObjectURL(soundtrack.src);stream?.getTracks().forEach(t=>t.stop());try{await audio?.close()}catch{};exportButton.disabled=false;videoRecorder=null}
}
async function loadServers(){
 try{
  const response=await fetch("/api/native/guilds",{credentials:"same-origin",cache:"no-store"});if(!response.ok)throw Error();
  const data=await response.json();const list=(data.guilds||[]).filter(x=>["owner","admin"].includes(String(x.membership_role||"")));
  const select=$("#cmdStudioServer");select.replaceChildren(new Option("Choisir mon serveur…",""));
  for(const g of list)select.append(new Option(g.name||"Serveur",String(g.id)));
  if(state.guildId)select.value=state.guildId;
  if(!list.length)note("Crée d’abord ton serveur CMD Sphere ou demande le rôle administrateur pour publier.");
 }catch{note("Impossible de charger les serveurs. L’export local reste disponible.")}
}
async function publish(){
 if(!recorded){note("Exporte d’abord une vidéo ou une image.");return}
 if(!state.guildId){note("Choisis le serveur à promouvoir.");return}
 if(recorded.size>60*1024*1024){note("Fichier de plus de 60 Mo. Réduis la durée avant publication.");return}
 const button=$("#cmdStudioPublish");button.disabled=true;note("Publication en cours, conserve cette page ouverte…");
 try{
  const response=await fetch("/api/cmd-promos",{method:"POST",credentials:"same-origin",headers:{"content-type":recorded.type,"x-cmd-guild-id":state.guildId,"x-cmd-title":encodeURIComponent(state.title).slice(0,200),"x-cmd-kind":state.mode},body:recorded});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||"Échec de publication");
  const link=new URL(result.url,location.origin).href,box=$("#cmdStudioPublication");box.replaceChildren();
  const a=document.createElement("a");a.href=link;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Voir ma publicité ↗";
  const b=document.createElement("button");b.type="button";b.textContent="Copier le lien";b.onclick=()=>navigator.clipboard?.writeText(link).then(()=>note("Lien copié")).catch(()=>note(link));
  box.append(a,b);note("Publicité publiée sur CMD Sphere !");
 }catch(e){note("Publication impossible : "+(e.message||e))}
 finally{button.disabled=false}
}
function db(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error("Brouillons indisponibles sur cet appareil"));return}
  const request=indexedDB.open("cmd-studio-drafts",1);
  request.onupgradeneeded=()=>request.result.createObjectStore("drafts");
  request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);
 });
}
async function saveDraft(){
 note("Sauvegarde du brouillon…");
 try{
  const conn=await db();const draft={state:{...state},media:clips.map(x=>x.file),music:musicFile,saved:new Date().toISOString()};
  await new Promise((resolve,reject)=>{const tx=conn.transaction("drafts","readwrite");tx.objectStore("drafts").put(draft,"last");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  conn.close();note("Brouillon enregistré sur cet appareil, photos et musique comprises.");
 }catch(e){note("Sauvegarde impossible : "+(e.message||e))}
}
async function loadDraft(){
 try{
  const conn=await db(),draft=await new Promise((resolve,reject)=>{const req=conn.transaction("drafts").objectStore("drafts").get("last");req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});conn.close();
  if(!draft){note("Aucun brouillon enregistré sur cet appareil.");return}
  stop();clips.forEach(x=>URL.revokeObjectURL(x.url));clips=[];Object.assign(state,draft.state||{});musicFile=draft.music||null;
  $$("[data-studio-mode],[data-studio-theme],[data-studio-format]",root).forEach(btn=>{const prop=Object.keys(btn.dataset).find(x=>x.startsWith("studio"));if(prop){const key=prop.slice(6).toLowerCase();btn.classList.toggle("selected",btn.dataset[prop]===state[key])}});
  const ids={Headline:"headline",Subtitle:"subtitle",Emoji:"emoji",Title:"title",Effect:"effect",Transition:"transition",Filter:"filter",Duration:"duration",Music:"music",Volume:"volume",Server:"guildId"};
  Object.entries(ids).forEach(([id,key])=>{const input=$("#cmdStudio"+id);if(input)input.value=state[key]});
  $("#cmdStudioDurLabel").textContent=state.duration+" s";$("#cmdStudioVolumeLabel").textContent=state.volume+" %";
  $("#cmdStudioMusicName").textContent=musicFile?.name||"Aucun fichier musical sélectionné.";
  addFiles(draft.media||[]);resize();note("Brouillon retrouvé.");
 }catch(e){note("Impossible de reprendre le brouillon : "+(e.message||e))}
}
function mount(){
 if($("#cmdPromoLaunch"))return;
 const b=document.createElement("button");b.id="cmdPromoLaunch";b.type="button";b.textContent="🎬 Studio Pub";b.title="Créer une publicité photo ou vidéo avec animations et musique";b.onclick=open;
 document.body.append(b);
 const actions=$(".channel-head .channel-actions");
 if(actions&&!$("#cmdPromoChannel")){const x=document.createElement("button");x.type="button";x.id="cmdPromoChannel";x.className="cmd-chat-compact";x.title="Studio Pub";x.textContent="🎬";x.onclick=open;actions.append(x)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
function start(){mount();mountTimer=setInterval(()=>{if(!$("#cmdPromoLaunch"))mount()},4000);window.cmdOpenPromoStudio=open}
})();