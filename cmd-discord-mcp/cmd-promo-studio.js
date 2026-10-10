/* CMD Sphere Studio Pub — mobile/desktop creative editor with on-device video rendering. */
(()=>{"use strict";
if(window.__cmdPromoStudio)return;window.__cmdPromoStudio=true;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const MODES=[["video","🎬 Vidéo"],["photos","🖼️ Photos animées"],["story","📱 Story"],["gif","✨ GIF"],["poster","🪧 Affiche"]];
const THEMES={epic:["Épique","#090d27","#58309c"],neon:["Néon","#111025","#ea318f"],survival:["Survie","#0c1c1a","#437c48"],rp:["Roleplay","#221522","#ae624c"],space:["Galaxie","#081323","#207ac7"],minimal:["Sobre","#181923","#454957"]};
const FORMATS={"9:16":[720,1280],"1:1":[720,720],"16:9":[1280,720]};
let root=null,canvas=null,ctx=null,clips=[],musicFile=null,recorded=null,recordedUrl="",raf=0,playStart=0,playing=false,videoRecorder=null,audioCtx=null,previewCtx=null,previewAudio=null,mountTimer=null;
let studioScope="",studioProfileGuild="",activeTool="";
let selectedTrack=null,musicResults=[],musicSearchId=0,musicSearchTimer=null,audition=null,auditionId="",musicLength=0,previewCursor=0;
const state={mode:"story",theme:"minimal",format:"9:16",effect:"none",transition:"fade",filter:"natural",duration:12,music:"none",musicStart:0,volume:40,headline:"",subtitle:"",emoji:"",title:"Ma vidéo",guildId:"",crop:"cover",textX:.5,textY:.67,stickerX:.5,stickerY:.43};
const safe=s=>String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const note=t=>{const message=String(t||"");const n=$("#cmdStudioNotice");if(n)n.textContent=message;const toast=$("#cmdStudioToast");if(toast){toast.textContent=message;toast.hidden=!message}};
function buttonHTML(arr,key){return arr.map(([v,label])=>'<button type="button" data-studio-'+key+'="'+safe(v)+'" class="'+(state[key]===v?"selected":"")+'">'+label+'</button>').join("")}
function open(context={}){
 const user=String(context.profileId||document.querySelector("#profileForm")?.dataset.userId||"member").slice(0,120);
 const guild=String(context.serverId||new URLSearchParams(location.search).get("server")||"").slice(0,64);
 const nextScope=user+":"+guild;
 if(studioScope&&studioScope!==nextScope){
  stop();clips.forEach(item=>URL.revokeObjectURL(item.url));clips=[];musicFile=null;selectedTrack=null;recorded=null;
  Object.assign(state,{mode:"story",theme:"minimal",format:"9:16",effect:"none",transition:"fade",filter:"natural",duration:12,music:"none",musicStart:0,volume:40,headline:"",subtitle:"",emoji:"",title:"Ma vidéo",guildId:"",crop:"cover",textX:.5,textY:.67,stickerX:.5,stickerY:.43});
  if(root){root.remove();root=null;canvas=null;ctx=null}
 }
 studioScope=nextScope;studioProfileGuild=guild;
 if(root){root.hidden=false;document.body.classList.add("cmd-studio-active");closeTool();render(0);return}
 root=document.createElement("section");root.id="cmdPromoStudio";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-label","Studio vidéo CMD Sphere");
 root.innerHTML='<header class="cmd-studio-header"><b>Studio IA · CMD Sphere</b><button type="button" id="cmdStudioClose" aria-label="Fermer">✕</button></header>'+
 '<div class="cmd-studio-main"><div class="cmd-studio-preview"><canvas id="cmdStudioCanvas" width="540" height="960" aria-label="Prévisualisation animée"></canvas><div class="cmd-studio-playbar"><button type="button" id="cmdStudioPlay">▶ Aperçu avec musique</button><span id="cmdStudioClock">0:00 / 0:12</span></div><input id="cmdStudioSeek" class="cmd-studio-seek" type="range" min="0" max="12" step="0.1" value="0" aria-label="Avancer ou reculer dans la vidéo"><small>Lecture synchronisée de la vidéo, de ses effets et de sa musique. Déplace la barre pour choisir un moment.</small></div>'+
 '<div class="cmd-studio-controls"><h2>Que veux-tu créer ?</h2><div class="cmd-studio-choices" id="cmdStudioModes">'+buttonHTML(MODES,"mode")+'</div>'+
 '<div class="cmd-studio-card"><h3>1. Images et vidéos</h3><label class="cmd-studio-upload">＋ Ajouter photos ou vidéos<input id="cmdStudioMedia" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple></label><div id="cmdStudioFiles" class="cmd-studio-files"></div><small>Choisis plusieurs images pour un diaporama. Les fichiers sources peuvent dépasser 10 Mo (150 Mo par fichier).</small></div>'+
 '<div class="cmd-studio-card"><h3>2. Format et modèle</h3><div class="cmd-studio-choices">'+buttonHTML([["9:16","📱 Vertical"],["1:1","⬛ Carré"],["16:9","🖥️ Horizontal"]],"format")+'</div><div id="cmdStudioThemes" class="cmd-studio-choices cmd-studio-themes">'+buttonHTML(Object.entries(THEMES).map(([k,v])=>[k,v[0]]),"theme")+'</div></div>'+
 '<div class="cmd-studio-card"><h3>3. Texte et autocollants</h3><label>Texte principal<input id="cmdStudioHeadline" maxlength="100" placeholder="Rejoins notre serveur"></label><label>Sous-titre<input id="cmdStudioSubtitle" maxlength="140" placeholder="Événement, RP, communauté…"></label><label>Autocollant <input id="cmdStudioEmoji" maxlength="12" placeholder="🚀 🔥 💎"></label></div>'+
 '<div class="cmd-studio-card"><h3>4. Animations et filtres</h3><label>Effet<select id="cmdStudioEffect"><option value="zoom">Zoom dynamique</option><option value="pan">Mouvement caméra</option><option value="pulse">Pulsation</option><option value="slide">Glissement</option><option value="none">Aucun</option></select></label><label>Transition<select id="cmdStudioTransition"><option value="fade">Fondu</option><option value="slide">Glissé</option><option value="cut">Coupe directe</option></select></label><label>Filtre<select id="cmdStudioFilter"><option value="natural">Naturel</option><option value="vivid">Vif</option><option value="warm">Chaud</option><option value="retro">Rétro</option><option value="mono">Noir et blanc</option></select></label><label>Durée : <output id="cmdStudioDurLabel">12 s</output><input id="cmdStudioDuration" type="range" min="5" max="30" step="1" value="12"></label></div>'+
 '<div class="cmd-studio-card cmd-studio-music"><h3>5. 🎵 Ajouter un son</h3><button type="button" id="cmdStudioOpenMusic" class="cmd-studio-add-sound">🎵 Parcourir les vraies musiques　⌕</button><div id="cmdStudioSelectedSong" class="cmd-studio-selected-song" aria-live="polite">Aucun morceau choisi dans la bibliothèque.</div><label>Choix de la musique<select id="cmdStudioMusic"><option value="library">🎧 Musique de la bibliothèque</option><option value="electro">Électro CMD (générée)</option><option value="epic">Épique CMD (générée)</option><option value="chill">Chill CMD (générée)</option><option value="file">Ma musique (fichier personnel)</option><option value="none">Sans musique</option></select></label><label class="cmd-studio-upload">♪ Importer mon son<input type="file" id="cmdStudioAudioFile" accept="audio/*"></label><small id="cmdStudioMusicName">Choisis un vrai morceau et écoute son aperçu.</small><label>✂️ Début de l’extrait : <output id="cmdStudioMusicStartLabel">0:00</output><input id="cmdStudioMusicStart" type="range" min="0" max="240" step="1" value="0"></label><label>Volume : <output id="cmdStudioVolumeLabel">40 %</output><input id="cmdStudioVolume" type="range" min="0" max="100" step="5" value="40"></label><small>Les morceaux libres indiquent leur artiste et licence. Les chansons commerciales de TikTok ne sont pas accessibles sans contrat de licence.</small></div>'+
 '<div class="cmd-studio-card"><h3>6. Publicité de serveur</h3><label>Titre de publication<input id="cmdStudioTitle" maxlength="100"></label><label>Mon serveur<select id="cmdStudioServer"><option value="">Choisir mon serveur…</option></select></label><small>Pour publier dans CMD Sphere, tu dois être propriétaire ou administrateur de ton serveur.</small></div>'+
 '<div class="cmd-studio-actions"><button type="button" id="cmdStudioSaveDraft">💾 Brouillon</button><button type="button" id="cmdStudioLoadDraft">📂 Reprendre</button><button type="button" id="cmdStudioPng">🖼️ Image PNG</button><button type="button" id="cmdStudioExport" class="primary">🎬 Exporter avec musique</button><button type="button" id="cmdStudioPublish" class="primary" disabled>🚀 Publier sur CMD Sphere</button><div id="cmdStudioPublication"></div><p id="cmdStudioNotice" role="status" aria-live="polite"></p></div></div></div><section id="cmdStudioMusicSheet" class="cmd-studio-music-sheet" hidden role="dialog" aria-modal="true" aria-label="Choisir une musique"><div class="cmd-studio-music-panel"><header><b>🎵 Ajouter un son</b><button type="button" id="cmdStudioCloseMusic" aria-label="Fermer">✕</button></header><label class="cmd-studio-search">⌕ <input type="search" id="cmdStudioMusicQuery" placeholder="Rechercher une musique, un style…" autocomplete="off"></label><div class="cmd-studio-music-genres" id="cmdStudioMusicGenres"><button type="button" data-search-music="instrumental">Instrumental</button><button type="button" data-search-music="rock music">Rock</button><button type="button" data-search-music="pop music">Pop</button><button type="button" data-search-music="electronic music">Électro</button><button type="button" data-search-music="piano">Piano</button><button type="button" data-search-music="jazz">Jazz</button><button type="button" data-search-music="classical music">Classique</button><button type="button" data-search-music="hip hop music">Hip-hop</button></div><div id="cmdStudioMusicResults" class="cmd-studio-music-results"><p>Recherche des titres accessibles…</p></div><div class="cmd-studio-music-foot"><small>Catalogue : Wikimedia Commons · morceaux à licence libre identifiée. Écoute un titre avant de l’ajouter. Les obligations de crédit restent applicables.</small><button type="button" id="cmdStudioMusicDone">Terminer</button></div></div></section>';
 // One clean video preview, right-side tools, and two main actions.
 const preview=$(".cmd-studio-preview",root),controls=$(".cmd-studio-controls",root);
 const surface=document.createElement("div");surface.className="cmd-studio-surface";
 const videoCanvas=$("#cmdStudioCanvas",root);videoCanvas.before(surface);surface.append(videoCanvas);
 const textHandle=document.createElement("div");textHandle.id="cmdStudioTextHandle";textHandle.className="cmd-studio-draggable";textHandle.hidden=true;textHandle.setAttribute("aria-label","Déplacer le texte");surface.append(textHandle);
 const stickerHandle=document.createElement("div");stickerHandle.id="cmdStudioStickerHandle";stickerHandle.className="cmd-studio-draggable";stickerHandle.hidden=true;stickerHandle.setAttribute("aria-label","Déplacer le sticker");surface.append(stickerHandle);
 const toast=document.createElement("p");toast.id="cmdStudioToast";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");toast.hidden=true;preview.append(toast);
 const toolbar=document.createElement("nav");toolbar.id="cmdStudioToolRail";toolbar.setAttribute("aria-label","Outils vidéo");
 toolbar.innerHTML='<button type="button" data-cmd-tool="media"><span>▧</span><small>Médias</small></button>'+
  '<button type="button" data-cmd-tool="text"><span>Aa</span><small>Texte</small></button>'+
  '<button type="button" data-cmd-tool="sticker"><span>☻</span><small>Stickers</small></button>'+
  '<button type="button" data-cmd-tool="music"><span>♫</span><small>Son</small></button>'+
  '<button type="button" data-cmd-tool="effect"><span>✦</span><small>Effets</small></button>'+
  '<button type="button" data-cmd-tool="filter"><span>◉</span><small>Filtres</small></button>'+
  '<button type="button" data-cmd-tool="format"><span>▣</span><small>Format</small></button>'+
  '<button type="button" data-cmd-tool="camera"><span>◉</span><small>Caméra</small></button>'+
  '<button type="button" data-cmd-tool="clips"><span>✂</span><small>Clips</small></button>';
 preview.append(toolbar);
 const titles=["Médias","Format et modèle","Texte et stickers","Effets et filtres","Musique et son","Publication"];
 const tools=["media","format","text","effect","music","publish"];
 $(".cmd-studio-card",controls).forEach((card,i)=>{card.dataset.toolPanel=tools[i]||"";const head=card.querySelector("h3");if(head)head.textContent=titles[i]||head.textContent});
 const heading=document.createElement("header");heading.className="cmd-studio-tool-header";heading.innerHTML='<strong id="cmdStudioToolName">Outils</strong><button type="button" id="cmdStudioHideTool" aria-label="Masquer les outils">✕</button>';
 controls.prepend(heading);
 const cropCard=$(".cmd-studio-card",controls)[1];
 const cropSetting=document.createElement("label");cropSetting.textContent="Recadrage";
 const cropSelect=document.createElement("select");cropSelect.id="cmdStudioCrop";
 cropSelect.innerHTML='<option value="cover">Remplir l’écran</option><option value="contain">Afficher toute l’image</option>';
 cropSelect.value=state.crop||"cover";cropSetting.append(cropSelect);cropCard.append(cropSetting);
 cropSelect.onchange=()=>{state.crop=cropSelect.value;recorded=null;render(previewCursor)};
 const camera=document.createElement("input");camera.type="file";camera.id="cmdStudioCameraCapture";
 camera.setAttribute("accept","video/*,image/*");camera.setAttribute("capture","environment");camera.hidden=true;root.append(camera);
 camera.onchange=e=>{addFiles(e.target.files);camera.value="";showTool("media")};
 const bottom=document.createElement("footer");bottom.id="cmdStudioBottomBar";bottom.innerHTML='<button type="button" id="cmdStudioStory">Ta Story</button><button type="button" id="cmdStudioNext">Suivant</button>';root.append(bottom);
 $("#cmdStudioHideTool",root).onclick=closeTool;
 $("[data-cmd-tool]",toolbar).forEach(b=>b.onclick=()=>showTool(b.dataset.cmdTool));
 $("#cmdStudioNext",root).onclick=()=>showTool("publish");
 $("#cmdStudioStory",root).onclick=publishStory;
 for(const [handle,x,y] of [[textHandle,"textX","textY"],[stickerHandle,"stickerX","stickerY"]]){
  handle.addEventListener("pointerdown",e=>{e.preventDefault();handle.setPointerCapture(e.pointerId);handle.dataset.dragging="true"});
  handle.addEventListener("pointermove",e=>{
   if(handle.dataset.dragging!=="true")return;
   const rect=surface.getBoundingClientRect();if(!rect.width||!rect.height)return;
   state[x]=Math.max(.08,Math.min(.92,(e.clientX-rect.left)/rect.width));recorded=null;
   state[y]=Math.max(.08,Math.min(.92,(e.clientY-rect.top)/rect.height));
   render(previewCursor);
  });
  const done=()=>{delete handle.dataset.dragging};
  handle.addEventListener("pointerup",done);handle.addEventListener("pointercancel",done);
 }
 document.body.append(root);document.body.classList.add("cmd-studio-active");
 canvas=$("#cmdStudioCanvas");ctx=canvas.getContext("2d",{alpha:false});
 $("#cmdStudioClose").onclick=close;
 $("#cmdStudioPlay").onclick=togglePreview;
 $("#cmdStudioSeek").oninput=e=>{const time=Number(e.target.value)||0;stop();previewCursor=time;render(time)};
 $("#cmdStudioOpenMusic").onclick=openMusicSheet;
 $("#cmdStudioCloseMusic").onclick=$("#cmdStudioMusicDone").onclick=()=>{stopAudition();$("#cmdStudioMusicSheet").hidden=true};
 $("#cmdStudioMusicQuery").addEventListener("input",e=>{clearTimeout(musicSearchTimer);const term=e.target.value.trim();musicSearchTimer=setTimeout(()=>searchMusic(term),400)});
 $("[data-search-music]",root).forEach(b=>b.onclick=()=>{const term=b.dataset.searchMusic;$("#cmdStudioMusicQuery").value=term;searchMusic(term)});
 $("#cmdStudioMusicStart").oninput=e=>{state.musicStart=Number(e.target.value)||0;$("#cmdStudioMusicStartLabel").textContent=clock(state.musicStart);if(audition&&selectedTrack?.id===auditionId){try{audition.currentTime=state.musicStart}catch{}}if(previewAudio){try{previewAudio.currentTime=state.musicStart}catch{}}};
 $("#cmdStudioMedia").onchange=e=>{addFiles(e.target.files);e.target.value=""};
 $("#cmdStudioAudioFile").onchange=e=>{const f=e.target.files?.[0];if(f&&f.size<=150*1024*1024&&f.type.startsWith("audio/")){musicFile=f;state.music="file";$("#cmdStudioMusic").value="file";$("#cmdStudioMusicName").textContent=f.name;selectedTrack=null;state.musicStart=0;refreshSelectedMusic();note("Musique chargée : "+f.name)}else if(f)note("Fichier audio invalide ou supérieur à 150 Mo");e.target.value=""};
 $$(".cmd-studio-choices button",root).forEach(b=>b.onclick=()=>choose(b));
 const ids={Headline:"headline",Subtitle:"subtitle",Emoji:"emoji",Title:"title",Effect:"effect",Transition:"transition",Filter:"filter",Duration:"duration",Music:"music",Volume:"volume",Server:"guildId"};
 for(const [id,key] of Object.entries(ids)){
  const field=$("#cmdStudio"+id);if(!field)continue;
  field.value=state[key];field.addEventListener("input",()=>{state[key]=["duration","volume"].includes(key)?Number(field.value):field.value;recorded=null;$("#cmdStudioDurLabel").textContent=state.duration+" s";$("#cmdStudioVolumeLabel").textContent=state.volume+" %";render(0)});
 }
 $("#cmdStudioMusic").onchange=()=>{if(state.music==="library"&&!selectedTrack){$("#cmdStudioMusic").value="electro";state.music="electro";note("Choisis d’abord une musique dans la bibliothèque.")}refreshSelectedMusic()};
 $("#cmdStudioVolume").addEventListener("input",()=>{if(previewAudio)previewAudio.volume=state.volume/100;if(audition)audition.volume=state.volume/100});
 refreshSelectedMusic();
 $("#cmdStudioSaveDraft").onclick=saveDraft;$("#cmdStudioLoadDraft").onclick=loadDraft;
 $("#cmdStudioPng").onclick=savePng;$("#cmdStudioExport").onclick=()=>state.mode==="gif"?exportGif():exportVideo();$("#cmdStudioPublish").onclick=publish;
 document.addEventListener("keydown",onEscape);
 loadServers();resize();render(0);closeTool();
}
function showTool(tool){
 if(!root)return;
 activeTool=tool;
 const panel=({sticker:"text",filter:"effect",clips:"media"})[tool]||tool;
 if(tool==="camera"){$("#cmdStudioCameraCapture")?.click();return}
 const controls=$(".cmd-studio-controls",root);controls.classList.add("cmd-tool-open");controls.dataset.activeTool=tool;
 $("[data-tool-panel]",controls).forEach(card=>{card.hidden=card.dataset.toolPanel!==panel});
 const modes=$("#cmdStudioModes");if(modes)modes.hidden=panel!=="format";
 $("#cmdStudioToolName").textContent=({media:"Ajouter des médias",clips:"Mon montage",text:"Ajouter du texte",sticker:"Ajouter un sticker",music:"Ajouter un son",effect:"Effets",filter:"Filtres",format:"Format et durée",publish:"Suivant · Enregistrer ou publier"})[tool]||"Outils";
 $("[data-cmd-tool]",root).forEach(btn=>btn.classList.toggle("selected",btn.dataset.cmdTool===tool));
 updateDragHandles();
 if(panel==="text"){const input=$("#cmdStudio"+(tool==="sticker"?"Emoji":"Headline"));if(input)input.focus({preventScroll:true})}
 controls.scrollTop=0;
}
function closeTool(){
 activeTool="";if(!root)return;const controls=$(".cmd-studio-controls",root);
 controls.classList.remove("cmd-tool-open");delete controls.dataset.activeTool;
 $("[data-tool-panel]",controls).forEach(card=>card.hidden=false);
 $("[data-cmd-tool]",root).forEach(btn=>btn.classList.remove("selected"));
 updateDragHandles();
}
function updateDragHandles(){
 if(!root)return;
 for(const [id,value,x,y,enabled] of [["cmdStudioTextHandle",state.headline,"textX","textY",activeTool==="text"],["cmdStudioStickerHandle",state.emoji,"stickerX","stickerY",activeTool==="sticker"]]){
  const el=$("#"+id);if(!el)continue;
  el.hidden=!enabled||!String(value||"").trim();el.textContent=String(value||"").slice(0,45);
  el.style.left=100*(state[x]||.5)+"%";el.style.top=100*(state[y]||.5)+"%";
 }
}
async function publishStory(){
 if(!root)return;const btn=$("#cmdStudioStory");btn.disabled=true;
 try{
  if(!recorded){
   note("Préparation de ta Story…");
   if(state.mode==="poster")await savePng();else if(state.mode==="gif")await exportGif();else await exportVideo();
  }
  if(!recorded?.size){note("L'export n'est pas disponible. Consulte le message dans les options.");return}
  const response=await fetch("/api/cmd-profile-videos",{method:"POST",credentials:"same-origin",headers:{"content-type":recorded.type,"x-cmd-title":"Ma Story","x-cmd-kind":state.mode,"x-cmd-profile-guild":studioProfileGuild},body:recorded});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||"Publication refusée");
  note("Ta Story est enregistrée dans ton profil CMD Sphere.");
  document.dispatchEvent(new CustomEvent("cmd:profile-video-saved"));
 }catch(e){note("Ta Story : "+(e.message||e))}finally{btn.disabled=false}
}
function choose(btn){
 const attr=[...btn.attributes].find(x=>x.name.startsWith("data-studio-"));if(!attr)return;
 const key=attr.name.slice(12),value=attr.value;
 if(!(key in state))return;
 state[key]=value;recorded=null;const pb=$("#cmdStudioPublish");if(pb)pb.disabled=true;$("[data-studio-"+key+"]",root).forEach(b=>b.classList.toggle("selected",b===btn));
 if(key==="mode"){if(value==="story")state.format="9:16";else if(value==="poster")state.format="1:1";else if(value==="video")state.format="9:16";else if(value==="gif")state.duration=6;
  $("#cmdStudioDuration").value=state.duration;$("#cmdStudioDurLabel").textContent=state.duration+" s";$$("[data-studio-format]",root).forEach(b=>b.classList.toggle("selected",b.dataset.studioFormat===state.format))}
 if(key==="format"||key==="mode")resize();
 const exp=$("#cmdStudioExport");if(exp)exp.textContent=state.mode==="gif"?"✨ Exporter GIF (sans musique)":"🎬 Exporter avec musique";
 render(0);
}
function close(){
 stop();if(previewAudio){previewAudio.pause();previewAudio=null}stopAudition();if($("#cmdStudioMusicSheet"))$("#cmdStudioMusicSheet").hidden=true;if(root)root.hidden=true;document.body.classList.remove("cmd-studio-active");
}
function onEscape(e){if(e.key==="Escape"&&root&&!root.hidden)close()}
function resize(){
 if(!canvas)return;const [w,h]=FORMATS[state.format]||FORMATS["9:16"];canvas.width=w;canvas.height=h;canvas.style.aspectRatio=w+"/"+h;render(0);
}
function addFiles(files){
 recorded=null;
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
function swap(a,b){recorded=null;[clips[a],clips[b]]=[clips[b],clips[a]];drawFiles();render(0)}
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
 const scale=state.crop==="contain"?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih);ctx.drawImage(el,-iw*scale/2,-ih*scale/2,iw*scale,ih*scale);
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
 if(state.headline||state.subtitle||state.emoji){const overlay=ctx.createLinearGradient(0,h*.35,0,h);overlay.addColorStop(0,"rgba(0,0,0,0)");overlay.addColorStop(1,"rgba(0,0,0,.6)");ctx.fillStyle=overlay;ctx.fillRect(0,0,w,h)}
 if(!studioScope){ctx.fillStyle="rgba(255,255,255,.18)";roundedRect(ctx,w*.065,h*.055,w*.36,Math.min(66,h*.065),18);
 ctx.fillStyle="#ffffff";ctx.textAlign="left";ctx.font="bold "+Math.round(w*.038)+"px system-ui";ctx.fillText("CMD SPHERE",w*.09,h*.096)}
 const anim=state.effect==="pulse"?.99+.01*Math.sin(t*7):1;
 const size=Math.round(w*.077*anim);ctx.font="900 "+size+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,.8)";ctx.shadowBlur=16;ctx.shadowOffsetY=5;
 let head=wrapWords(state.headline,w*.84,size,3);if(!head.length&&!studioScope)head=["Ton serveur, ton univers"];
 const lineHeight=size*1.18,mid=h*(state.textY||.67)-(head.length-1)*lineHeight/2;
 head.forEach((line,i)=>ctx.fillText(line,w*(state.textX||.5),mid+i*lineHeight));
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.font="500 "+Math.round(w*.041)+"px system-ui";ctx.fillStyle="#f6eafd";
 const sub=wrapWords(state.subtitle,w*.85,w*.041,2);sub.forEach((line,i)=>ctx.fillText(line,w/2,h*.82+i*w*.056));
 if(state.emoji){ctx.font=Math.round(w*.13)+"px system-ui";ctx.fillText(state.emoji.slice(0,8),w*(state.stickerX||.5),h*(state.stickerY||.43))}
 if(!studioScope){ctx.font="bold "+Math.round(w*.037)+"px system-ui";ctx.fillStyle="#ebc8ff";ctx.fillText("Rejoins la communauté ✦",w/2,h*.95)}
 if(state.music==="library"&&selectedTrack&&state.mode!=="gif"){ctx.font=Math.max(10,Math.round(w*.019))+"px system-ui";ctx.fillStyle="#f3e7ff";ctx.fillText(("♪ "+selectedTrack.title+" · "+selectedTrack.artist+" · "+selectedTrack.license).slice(0,92),w/2,h*.985)}
 updateDragHandles();const clk=$("#cmdStudioClock");if(clk)clk.textContent=clock(t)+" / "+clock(state.duration);
 const seek=$("#cmdStudioSeek");if(seek){seek.max=state.duration;seek.value=Math.min(state.duration,t)}
}
function stop(){
 playing=false;cancelAnimationFrame(raf);raf=0;
 if($("#cmdStudioPlay"))$("#cmdStudioPlay").textContent="▶ Aperçu avec musique";
 for(const c of clips)if(c.video)c.element.pause();
 if(previewAudio){previewAudio.pause();if(previewAudio.src.startsWith("blob:"))URL.revokeObjectURL(previewAudio.src);previewAudio=null}
 if(previewCtx){void previewCtx.close().catch(()=>{});previewCtx=null}
}
function playFrame(){
 if(!playing)return;
 const time=(performance.now()-playStart)/1000;
 if(time>=state.duration){stop();previewCursor=0;render(state.duration);return}
 previewCursor=time;render(time);raf=requestAnimationFrame(playFrame);
}
function togglePreview(){
 if(playing){stop();return}
 stop();playing=true;playStart=performance.now()-previewCursor*1000;$("#cmdStudioPlay").textContent="⏸ Arrêter";
 for(const c of clips)if(c.video){try{c.element.currentTime=0;void c.element.play().catch(()=>{})}catch{}}
 stopAudition();
 if((state.music==="file"&&musicFile)||(state.music==="library"&&selectedTrack)){
   previewAudio=new Audio(state.music==="library"?selectedTrack.url:URL.createObjectURL(musicFile));previewAudio.volume=state.volume/100;
   previewAudio.onloadedmetadata=()=>{try{previewAudio.currentTime=Math.min((state.musicStart||0)+previewCursor,Math.max(0,(previewAudio.duration||0)-.2))}catch{}};
   previewAudio.onended=()=>{if(playing){try{previewAudio.currentTime=Math.min(state.musicStart||0,Math.max(0,(previewAudio.duration||0)-.2));void previewAudio.play().catch(()=>{})}catch{}}};
   previewAudio.play().catch(e=>note("Aperçu musical indisponible : "+e.message));
 }
 else if(state.music!=="none"&&state.music!=="library"&&state.volume){try{previewCtx=new (window.AudioContext||window.webkitAudioContext)();void previewCtx.resume();synthMusic(previewCtx,previewCtx.destination,state.duration)}catch(error){console.warn("[CMD studio audio]",error)}}
 playFrame();
}
function clock(seconds){
 const t=Math.max(0,Math.floor(Number(seconds)||0));return Math.floor(t/60)+":"+String(t%60).padStart(2,"0");
}
function stopAudition(){
 if(audition){audition.pause();audition.src="";audition=null}
 auditionId="";if(root)$(".cmd-music-play",root).forEach(b=>b.textContent="▶");
}
function openMusicSheet(){
 if(!root)return;
 const panel=$("#cmdStudioMusicSheet");panel.hidden=false;
 $("#cmdStudioMusicQuery").value=$("#cmdStudioMusicQuery").value||"instrumental";
 if(!musicResults.length)searchMusic($("#cmdStudioMusicQuery").value);
}
async function searchMusic(value){
 if(!root)return;
 const query=String(value||"").trim();
 if(query.length<2){$("#cmdStudioMusicResults").textContent="Écris au moins deux lettres.";return}
 const ticket=++musicSearchId;stopAudition();
 const container=$("#cmdStudioMusicResults");container.textContent="Recherche des morceaux…";
 try{
  const response=await fetch("/api/cmd-studio-music/search?q="+encodeURIComponent(query),{credentials:"same-origin",cache:"no-store"});
  const result=await response.json();if(!response.ok)throw Error(result.error||"Recherche indisponible");
  if(ticket!==musicSearchId)return;
  musicResults=Array.isArray(result.items)?result.items:[];
  renderMusicSearch();
 }catch(error){if(ticket===musicSearchId){container.textContent="Recherche indisponible : "+(error.message||error)+". Tu peux toujours importer ton propre son.";musicResults=[]}}
}
function renderMusicSearch(){
 const container=$("#cmdStudioMusicResults");container.replaceChildren();
 if(!musicResults.length){container.textContent="Aucun morceau avec une licence utilisable pour cette recherche. Essaie « piano », « classique », « instrumental » ou un autre style.";return}
 for(const track of musicResults){
  const row=document.createElement("article");row.className="cmd-music-row";
  const play=document.createElement("button");play.type="button";play.className="cmd-music-play";play.textContent="▶";play.setAttribute("aria-label","Écouter "+track.title);play.onclick=()=>toggleAudition(track,play);
  const info=document.createElement("div");info.className="cmd-music-meta";
  const name=document.createElement("strong");name.textContent=track.title;
  const artist=document.createElement("small");artist.textContent=track.artist+" · "+track.license;
  const link=document.createElement("a");link.href=track.sourceUrl;link.rel="noopener noreferrer";link.target="_blank";link.textContent="Licence et crédits ↗";
  info.append(name,artist,link);
  const add=document.createElement("button");add.type="button";add.className="cmd-music-add";add.textContent="＋ Ajouter";add.onclick=()=>useTrack(track);
  if(selectedTrack?.id===track.id){add.textContent="✓ Choisi";row.classList.add("chosen")}
  row.append(play,info,add);container.append(row);
 }
}
function toggleAudition(track,button){
 if(audition&&auditionId===track.id){stopAudition();return}
 stop();stopAudition();auditionId=track.id;audition=new Audio(track.url);audition.preload="auto";audition.volume=state.volume/100;
 button.textContent="⏸";
 audition.onloadedmetadata=()=>{musicLength=Number.isFinite(audition.duration)?audition.duration:0;if(selectedTrack?.id===track.id)syncTrim();try{audition.currentTime=Math.min(state.musicStart||0,Math.max(0,musicLength-.2))}catch{}};
 audition.onerror=()=>{stopAudition();note("L'aperçu du titre n'est pas disponible. Essaie un autre morceau.")};
 audition.onended=()=>stopAudition();
 audition.play().catch(e=>{stopAudition();note("L'écoute a échoué : "+e.message)});
}
function useTrack(track){
 selectedTrack={id:track.id,title:track.title,artist:track.artist,license:track.license,licenseUrl:track.licenseUrl,sourceUrl:track.sourceUrl,url:track.url,mime:track.mime};
 state.music="library";state.musicStart=0;$("#cmdStudioMusic").value="library";musicLength=0;
 stopAudition();renderMusicSearch();refreshSelectedMusic();
 note("🎵 Musique choisie : "+selectedTrack.title+". Appuie sur « Prévisualiser » pour écouter le montage.");
}
function syncTrim(){
 const slider=$("#cmdStudioMusicStart");if(!slider)return;
 slider.max=musicLength?Math.max(0,Math.floor(musicLength-1)):240;
 state.musicStart=Math.min(state.musicStart||0,Number(slider.max));
 slider.value=state.musicStart;
 $("#cmdStudioMusicStartLabel").textContent=clock(state.musicStart);
}
function refreshSelectedMusic(){
 const box=$("#cmdStudioSelectedSong");if(!box)return;box.replaceChildren();
 if(state.music==="library"&&selectedTrack){
  const title=document.createElement("strong");title.textContent="♫ "+selectedTrack.title;
  const author=document.createElement("small");author.textContent=selectedTrack.artist+" · "+selectedTrack.license;
  const source=document.createElement("a");source.href=selectedTrack.sourceUrl;source.target="_blank";source.rel="noopener noreferrer";source.textContent="Voir la source et les droits ↗";
  const listen=document.createElement("button");listen.type="button";listen.className="cmd-music-selected-play";listen.textContent="▶ Écouter le morceau";listen.onclick=()=>toggleAudition(selectedTrack,listen);
  box.append(title,author,source,listen);
  $("#cmdStudioMusicName").textContent="Vrai morceau enregistré · "+selectedTrack.license;
  if(!musicLength){
   const metaAudio=new Audio(selectedTrack.url);metaAudio.preload="metadata";
   metaAudio.onloadedmetadata=()=>{if(selectedTrack?.url&&new URL(selectedTrack.url,location.origin).href===metaAudio.src){musicLength=metaAudio.duration;syncTrim()}metaAudio.src=""};
  }else syncTrim();
 }else{
  box.textContent=state.music==="file"&&musicFile?"♫ "+musicFile.name:"Tu peux chercher un vrai morceau, utiliser ton propre fichier audio ou choisir un son généré.";
  $("#cmdStudioMusicName").textContent=musicFile&&state.music==="file"?musicFile.name:"Bibliothèque musicale libre et import personnel.";
 }
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
 const vol=state.volume/100;if(state.music==="none"||state.music==="file"||state.music==="library"||!vol)return;
 const scores={electro:[220,330,440,330,261.6,392,523.2,392],epic:[110,164.8,220,164.8,130.8,196,261.6,196],chill:[196,246.9,293.7,246.9,174.6,220,261.6,220]};
 const notes=scores[state.music]||scores.electro,start=audio.currentTime+.04,count=Math.ceil(total*3);
 for(let i=0;i<count;i++){
  const osc=audio.createOscillator(),gain=audio.createGain(),when=start+i/3;
  osc.type=state.music==="epic"?"sawtooth":state.music==="chill"?"sine":"triangle";osc.frequency.value=notes[i%notes.length];
  const amp=.045*vol;gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(amp,when+.025);gain.gain.exponentialRampToValueAtTime(.0001,when+.29);
  osc.connect(gain);gain.connect(dest);osc.start(when);osc.stop(when+.31);
 }
}
async function exportGif(){
 if(!window.CMDEncodeAnimatedGif){note("Encodeur GIF non disponible. Actualise CMD Sphere.");return}
 stop();const btn=$("#cmdStudioExport");btn.disabled=true;note("Création du GIF animé en cours…");
 try{
  const ratio=canvas.width/canvas.height,w=ratio>1?480:ratio===1?380:300,h=Math.round(w/ratio);
  const blob=await window.CMDEncodeAnimatedGif({source:canvas,draw:async t=>render(t),duration:state.duration,fps:7,width:w,height:h,onProgress:(done,total)=>{if(done%5===0||done===total)note("Animation "+done+"/"+total+" images…")}});
  if(!blob.size)throw Error("GIF vide");recorded=blob;$("#cmdStudioPublish").disabled=blob.size>60*1024*1024;
  blobDownload(blob,"CMD-Sphere-Publicite.gif");note("GIF animé exporté : "+(blob.size/1048576).toFixed(1)+" Mo. Un GIF ne peut pas contenir de musique.");
 }catch(error){note("Export GIF impossible : "+(error.message||error))}
 finally{btn.disabled=false}
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
  if((state.music==="file"&&musicFile)||(state.music==="library"&&selectedTrack)){
    soundtrack=new Audio(state.music==="library"?selectedTrack.url:URL.createObjectURL(musicFile));soundtrack.preload="auto";soundtrack.volume=1;
    await new Promise((resolve,reject)=>{if(soundtrack.readyState>=1)return resolve();soundtrack.onloadedmetadata=resolve;soundtrack.onerror=()=>reject(Error("Le morceau n’est plus disponible."));setTimeout(()=>reject(Error("Délai de chargement audio dépassé.")),12000)});
    soundtrack.currentTime=Math.min(state.musicStart||0,Math.max(0,(soundtrack.duration||0)-.2));
    soundtrack.onended=()=>{if(videoRecorder?.state==="recording"){try{soundtrack.currentTime=Math.min(state.musicStart||0,Math.max(0,(soundtrack.duration||0)-.2));void soundtrack.play().catch(()=>{})}catch{}}};
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
 finally{soundtrack?.pause();if(soundtrack?.src?.startsWith("blob:"))URL.revokeObjectURL(soundtrack.src);stream?.getTracks().forEach(t=>t.stop());try{await audio?.close()}catch{};exportButton.disabled=false;videoRecorder=null}
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
  const response=await fetch("/api/cmd-promos",{method:"POST",credentials:"same-origin",headers:{"content-type":recorded.type,"x-cmd-guild-id":state.guildId,"x-cmd-title":encodeURIComponent(state.title).slice(0,200),"x-cmd-kind":state.mode,...(state.music==="library"&&selectedTrack?{"x-cmd-music-credit":encodeURIComponent(JSON.stringify({title:selectedTrack.title,artist:selectedTrack.artist,license:selectedTrack.license,sourceUrl:selectedTrack.sourceUrl,licenseUrl:selectedTrack.licenseUrl})).slice(0,1200)}:{})},body:recorded});
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
  const conn=await db();const draft={state:{...state},media:clips.map(x=>x.file),music:musicFile,selectedTrack,saved:new Date().toISOString()};
  await new Promise((resolve,reject)=>{const tx=conn.transaction("drafts","readwrite");tx.objectStore("drafts").put(draft,"profile:"+studioScope);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  conn.close();note("Brouillon enregistré sur cet appareil, photos et musique comprises.");
 }catch(e){note("Sauvegarde impossible : "+(e.message||e))}
}
async function loadDraft(){
 try{
  const conn=await db(),draft=await new Promise((resolve,reject)=>{const req=conn.transaction("drafts").objectStore("drafts").get("profile:"+studioScope);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});conn.close();
  if(!draft){note("Aucun brouillon enregistré sur cet appareil.");return}
  stop();clips.forEach(x=>URL.revokeObjectURL(x.url));clips=[];Object.assign(state,draft.state||{});musicFile=draft.music||null;
  $$("[data-studio-mode],[data-studio-theme],[data-studio-format]",root).forEach(btn=>{const prop=Object.keys(btn.dataset).find(x=>x.startsWith("studio"));if(prop){const key=prop.slice(6).toLowerCase();btn.classList.toggle("selected",btn.dataset[prop]===state[key])}});
  const ids={Headline:"headline",Subtitle:"subtitle",Emoji:"emoji",Title:"title",Effect:"effect",Transition:"transition",Filter:"filter",Duration:"duration",Music:"music",Volume:"volume",Server:"guildId"};
  Object.entries(ids).forEach(([id,key])=>{const input=$("#cmdStudio"+id);if(input)input.value=state[key]});
  $("#cmdStudioDurLabel").textContent=state.duration+" s";$("#cmdStudioVolumeLabel").textContent=state.volume+" %";
  $("#cmdStudioMusicName").textContent=musicFile?.name||"Aucun fichier musical sélectionné.";
  selectedTrack=draft.selectedTrack||null;refreshSelectedMusic();
  addFiles(draft.media||[]);resize();note("Brouillon retrouvé.");
 }catch(e){note("Impossible de reprendre le brouillon : "+(e.message||e))}
}
function mount(){const old=$("#cmdPromoLaunch");if(old)old.remove()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
function start(){mount();window.cmdOpenPromoStudio=open}
})();