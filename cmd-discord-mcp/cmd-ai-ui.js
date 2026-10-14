(function(){
"use strict";
function mountNeuria(){
 if(!(document.querySelector('.sphere-app')||document.getElementById('dockProfileMain')||/^\/native\//.test(location.pathname))||document.getElementById('cmdAiLauncher'))return false;
 const style=document.createElement('style');style.textContent='.cmd-neuria-launch{position:fixed;right:24px;bottom:24px;z-index:899;width:58px;height:58px;display:grid;place-items:center;border:1px solid #c4b5fd;border-radius:50%;padding:0;background:radial-gradient(circle at 30% 20%,#c084fc,#6d28d9 72%);box-shadow:0 10px 32px #0900169c,0 0 20px #9333ea77;color:#fff;font:900 25px system-ui;cursor:grab;touch-action:none;user-select:none}.cmd-neuria-panel{position:fixed;right:24px;bottom:85px;width:min(460px,calc(100vw - 24px));height:min(690px,calc(100dvh - 115px));z-index:900;border:1px solid #60546f;border-radius:20px;overflow:hidden;background:#19112a;box-shadow:0 19px 70px #000c}.cmd-neuria-panel[hidden]{display:none!important}.cmd-neuria-grip{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:#282136;color:white;font:700 13px system-ui;cursor:grab;touch-action:none;user-select:none}.cmd-neuria-close{border:0;background:#463654;color:#fff;border-radius:7px;padding:5px 10px;cursor:pointer}.cmd-neuria-panel iframe{display:block;width:100%;height:calc(100% - 42px);border:0}@media(max-width:760px){.cmd-neuria-launch{right:12px;bottom:calc(88px + env(safe-area-inset-bottom))}.cmd-neuria-panel{left:8px;right:8px;bottom:calc(145px + env(safe-area-inset-bottom));width:auto;height:min(660px,calc(100dvh - 165px))}}';document.head.appendChild(style);
 const btn=document.createElement('button');btn.id='cmdAiLauncher';btn.className='cmd-neuria-launch';btn.type='button';btn.textContent='✦';btn.title='CMD NEURIA — déplacer ou ouvrir';btn.setAttribute('aria-label','Ouvrir CMD NEURIA');const panel=document.createElement('section');panel.id='cmdAiPanel';panel.className='cmd-neuria-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','CMD NEURIA');const grip=document.createElement('div');grip.className='cmd-neuria-grip';const name=document.createElement('span');name.textContent='⋮⋮  CMD NEURIA';const close=document.createElement('button');close.type='button';close.className='cmd-neuria-close';close.textContent='✕';close.setAttribute('aria-label','Fermer');grip.append(name,close);const frame=document.createElement('iframe');frame.title='CMD NEURIA';frame.referrerPolicy='no-referrer';frame.allow='clipboard-write';panel.append(grip,frame);document.body.append(btn,panel);const toggle=()=>{panel.hidden=!panel.hidden;btn.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden&&!frame.src)frame.src='https://cmd-ai-cpu-web-production.up.railway.app/'};let launcherDrag=null,ignoreLauncherClick=false;try{const saved=JSON.parse(localStorage.getItem('cmd-neuria-launch-position-v1')||'null');if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){btn.style.left=Math.max(0,Math.min(innerWidth-58,saved.x))+'px';btn.style.top=Math.max(0,Math.min(innerHeight-58,saved.y))+'px';btn.style.right='auto';btn.style.bottom='auto'}}catch{}btn.addEventListener('pointerdown',e=>{if(e.button!==0)return;const rect=btn.getBoundingClientRect();launcherDrag={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,moved:false};btn.setPointerCapture(e.pointerId)});btn.addEventListener('pointermove',e=>{if(!launcherDrag||launcherDrag.pointer!==e.pointerId)return;const dx=e.clientX-launcherDrag.x,dy=e.clientY-launcherDrag.y;if(Math.hypot(dx,dy)>7)launcherDrag.moved=true;if(!launcherDrag.moved)return;btn.style.left=Math.max(0,Math.min(innerWidth-btn.offsetWidth,launcherDrag.left+dx))+'px';btn.style.top=Math.max(0,Math.min(innerHeight-btn.offsetHeight,launcherDrag.top+dy))+'px';btn.style.right='auto';btn.style.bottom='auto'});btn.addEventListener('pointerup',e=>{if(!launcherDrag||launcherDrag.pointer!==e.pointerId)return;if(launcherDrag.moved){ignoreLauncherClick=true;try{localStorage.setItem('cmd-neuria-launch-position-v1',JSON.stringify({x:btn.offsetLeft,y:btn.offsetTop}))}catch{}}launcherDrag=null});btn.addEventListener('pointercancel',()=>{launcherDrag=null});btn.onclick=()=>{if(ignoreLauncherClick){ignoreLauncherClick=false;return}toggle()};close.onclick=()=>{panel.hidden=true;btn.setAttribute('aria-expanded','false')};let start=null;grip.addEventListener('pointerdown',e=>{if(e.target===close||e.button!==0)return;const r=panel.getBoundingClientRect();start={x:e.clientX,y:e.clientY,left:r.left,top:r.top};grip.setPointerCapture(e.pointerId)});grip.addEventListener('pointermove',e=>{if(!start)return;panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,start.left+e.clientX-start.x))+'px';panel.style.top=Math.max(0,Math.min(innerHeight-panel.offsetHeight,start.top+e.clientY-start.y))+'px';panel.style.right='auto';panel.style.bottom='auto'});grip.addEventListener('pointerup',()=>{start=null});grip.addEventListener('pointercancel',()=>{start=null});return true;
}
function mount(){
 if(mountNeuria())return;
 if(!document.querySelector('.sphere-app')||document.getElementById('cmdAiLauncher'))return;
 const st=document.createElement('style');st.textContent=[
 '.cmd-ai-open{position:fixed;right:24px;bottom:24px;z-index:899;border:1px solid #a78bfa88;border-radius:20px;display:flex;align-items:center;gap:9px;padding:13px 17px;background:linear-gradient(135deg,#6645dd,#9c45cb);box-shadow:0 10px 32px #0900169c;color:white;font-weight:800;font:800 14px system-ui;cursor:pointer}',
 '.cmd-ai-open:hover{filter:brightness(1.12)}',
 '.cmd-ai-open span{font-size:21px}',
 '.cmd-ai-panel{position:fixed;z-index:900;bottom:85px;right:24px;width:min(410px,calc(100vw - 24px));height:min(610px,calc(100dvh - 130px));background:#24242c;border:1px solid #50505a;border-radius:22px;box-shadow:0 19px 70px #000c;display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif;color:#f5f5fa}',
 '.cmd-ai-panel.on{display:flex}',
 '.cmd-ai-head{display:flex;align-items:center;gap:12px;padding:16px 18px;background:#282832;border-bottom:1px solid #ffffff12;flex:none}',
 '.cmd-ai-mark{font-size:27px;width:40px;height:40px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,#6d45df,#9a56c2)}',
 '.cmd-ai-head-copy{flex:1;min-width:0}.cmd-ai-head-copy b,.cmd-ai-head-copy small{display:block}.cmd-ai-head-copy small{color:#b4b5c0;font-size:11px;margin-top:3px}',
 '.cmd-ai-head button{background:transparent;color:#cbcad4;border:0;font-size:24px;cursor:pointer;width:34px;height:34px}',
 '.cmd-ai-messages{flex:1;min-height:0;overflow-y:auto;padding:17px 13px 15px;display:flex;flex-direction:column;gap:12px;overscroll-behavior:contain}',
 '.cmd-ai-bubble{max-width:91%;padding:12px 14px;border-radius:15px;font-size:14px;line-height:1.52;white-space:pre-wrap;overflow-wrap:anywhere;align-self:flex-start;background:#34343d;border:1px solid #ffffff0c}',
 '.cmd-ai-bubble.you{align-self:flex-end;background:#5865f2;border-color:transparent}',
 '.cmd-ai-chips{display:flex;gap:8px;padding:6px 13px 12px;flex-wrap:wrap}',
 '.cmd-ai-chips button{font:600 12px system-ui;cursor:pointer;background:#34333e;color:#dad7ed;border:1px solid #6c5d9466;border-radius:999px;padding:7px 10px}',
 '.cmd-ai-form{display:flex;gap:7px;padding:12px;background:#292930;border-top:1px solid #ffffff18;align-items:center;padding-bottom:calc(13px + env(safe-area-inset-bottom,0px))}',
 '.cmd-ai-form input{flex:1;min-width:0;border-radius:13px;border:1px solid #545363;background:#16161e;color:white;font:15px system-ui;padding:12px;outline:none}',
 '.cmd-ai-form input:focus{border-color:#9481f6}',
 '.cmd-ai-form button{background:#5865f2;color:white;border:0;border-radius:12px;padding:11px 13px;font:700 15px system-ui;cursor:pointer}',
 '.cmd-ai-form button:disabled{opacity:.5;cursor:wait}',
 '.cmd-ai-note{color:#a9a8b9;padding:0 15px 10px;font-size:10px;line-height:1.35;background:#292930}',
 ' .cmd-ai-generated-image{display:block;width:100%;height:auto;border-radius:13px;margin-top:9px;background:#18111e;object-fit:contain;max-height:460px} .cmd-ai-image-tip{font-size:12px;color:#dfd1f5;margin-top:8px}',
 '@media(max-width:760px){.cmd-ai-open{bottom:calc(88px + env(safe-area-inset-bottom,0px));right:12px;border-radius:16px;padding:10px 13px}.cmd-ai-panel{bottom:calc(145px + env(safe-area-inset-bottom,0px));right:8px;left:8px;width:auto;height:min(620px,calc(100dvh - 175px - env(safe-area-inset-bottom,0px)));border-radius:18px}.cmd-ai-form input{font-size:16px}}',
 '@media(max-height:520px){.cmd-ai-panel{top:8px;bottom:8px;height:auto}.cmd-ai-open{bottom:8px}}'
 ].join("");document.head.appendChild(st);
 const opener=document.createElement('button');opener.type='button';opener.id='cmdAiLauncher';opener.className='cmd-ai-open';opener.setAttribute('aria-label','Ouvrir CMD NEURIA');opener.innerHTML='<span>✦</span> CMD NEURIA';
 const root=document.createElement('section');root.className='cmd-ai-panel';root.id='cmdAiPanel';root.setAttribute('role','dialog');root.setAttribute('aria-label','Assistant gratuit CMD NEURIA');root.innerHTML='<header class="cmd-ai-head"><div class="cmd-ai-mark">✦</div><div class="cmd-ai-head-copy"><b>CMD NEURIA</b><small>Météo, heure, recettes et questions</small></div><button type="button" id="cmdAiClose" aria-label="Fermer">×</button></header><div class="cmd-ai-messages" id="cmdAiMessages" aria-live="polite"></div><div class="cmd-ai-chips"><button type="button" data-cmd-ai-quick="Raconte une blague !">😄 Une blague</button><button type="button" data-cmd-ai-quick="Comment gérer mes serveurs CMD Sphere ?">🔄 Mes serveurs Sphere</button><button type="button" data-cmd-ai-quick="Comment modifier mon profil ?">👤 Mon profil</button><button type="button" id="cmdAiImagePrompt">🎨 Créer une image</button><button type="button" id="cmdAiUploadDocument">📎 Fichier</button><button type="button" id="cmdAiUploadPhoto">📷 Photo</button><button type="button" data-cmd-ai-quick="Quelle est la météo à Ajaccio ?">🌤️ Météo</button><button type="button" data-cmd-ai-quick="Quelle heure est-il à Paris ?">🕓 Heure</button><button type="button" data-cmd-ai-quick="Donne-moi la recette des crêpes">🍳 Recette</button></div><input id="cmdAiDocInput" type="file" accept=".txt,.md,.json,.jsonc,.csv,.tsv,.js,.jsx,.ts,.tsx,.py,.xml,.html,.css,.yml,.yaml,.ini,.cfg,.log,.sql,.sh,.bat,.ps1,.java,.c,.cpp,.h,.cs,.go,.rs,.php,.rb,.lua" hidden><input id="cmdAiPhotoInput" type="file" accept="image/png,image/jpeg,image/webp" hidden></div><form class="cmd-ai-form" id="cmdAiForm"><input id="cmdAiInput" aria-label="Message à CMD NEURIA" maxlength="2000" placeholder="Écris ta demande..." autocomplete="off" required><button id="cmdAiSend" type="submit" aria-label="Envoyer">➤</button></form><div class="cmd-ai-note">Réponses automatiques gratuites. Les informations importantes sont à vérifier. Un modèle avancé peut être limité par les quotas du fournisseur.</div>';
 document.body.append(opener,root);
 const msgs=root.querySelector('#cmdAiMessages'),inp=root.querySelector('#cmdAiInput'),send=root.querySelector('#cmdAiSend');
 let history=[],busy=false;
 function message(role,content){const el=document.createElement('div');el.className='cmd-ai-bubble'+(role==='user'?' you':'');el.textContent=String(content||'');msgs.appendChild(el);msgs.scrollTop=msgs.scrollHeight;return el}
 message('assistant','Salut ! Je suis CMD NEURIA ✨ Pose-moi une question, demande une blague ou laisse-moi t’aider à utiliser CMD Sphere.');
 function open(){root.classList.add('on');inp.focus()}
 function close(){root.classList.remove('on');opener.focus()}
 opener.onclick=function(){root.classList.contains('on')?close():open()};
 root.querySelector('#cmdAiClose').onclick=close;
 window.addEventListener('keydown',function(e){if(e.key==='Escape'&&root.classList.contains('on'))close()});
 window.addEventListener('cmdsphere:open-ai',open);
 async function ask(value){
  if(busy)return;
  const q=String(value||'').trim().slice(0,2000);if(!q)return;
  busy=true;send.disabled=true;inp.value='';message('user',q);const wait=message('assistant','CMD NEURIA réfléchit…');
  try{
   const imageCommand=q.match(/^(?:g[eé]n[eè]re|cr[eé]e|dessine|fais|imagine)\s+(?:moi\s+)?(?:une\s+)?(?:image|photo|illustration)\s*(?:de|d'|avec|montrant)?\s*/i);
   const requestImage=Boolean(imageCommand);const description=requestImage?q.slice(imageCommand[0].length).trim():q;
   const r=await fetch(requestImage?'/api/cmd-ai/image':'/api/cmd-ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestImage?{prompt:description}:{message:q,history:history.slice(-8)}),cache:'no-store',signal:AbortSignal.timeout(requestImage?44000:19000)});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(data.error||'Service indisponible');
   const answer=requestImage?'Voici ton image 🎨':String(data.reply||'Réponse indisponible.');wait.textContent=answer;
   if(requestImage){
    if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(data.image||'')))throw Error("Réponse image invalide");
    const img=document.createElement('img');img.className='cmd-ai-generated-image';img.alt='Image générée par CMD NEURIA';img.src=data.image;wait.append(img);
    const tip=document.createElement('p');tip.className='cmd-ai-image-tip';tip.textContent='Appuie longuement sur l’image pour l’enregistrer.';wait.append(tip);
   }
   history.push({role:'user',text:q},{role:'assistant',text:answer});history=history.slice(-8);
  }catch(e){wait.textContent='Je ne peux pas répondre pour le moment : '+e.message+'. Réessaie.'}
  finally{busy=false;send.disabled=false;msgs.scrollTop=msgs.scrollHeight;inp.focus()}
 }
 root.querySelector('#cmdAiForm').addEventListener('submit',function(e){e.preventDefault();ask(inp.value)});
 root.querySelectorAll('[data-cmd-ai-quick]').forEach(function(b){b.addEventListener('click',function(){ask(b.dataset.cmdAiQuick)})});
 root.querySelector('#cmdAiImagePrompt').onclick=()=>{inp.value='Génère une image de ';open();inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length)};
 async function upload(file,photo){
  if(!file||busy)return;
  if(file.size>(photo?3000000:44000)){message('assistant',photo?'Photo limitée à 3 Mo.':'Fichier limité à 44 Ko.');return}
  const instruction=String(inp.value||'').trim().slice(0,800)||(photo?'Décris cette photo.':'Analyse ce fichier et indique les corrections possibles.');
  busy=true;send.disabled=true;inp.value='';message('user',(photo?'📷 ':'📎 ')+file.name+'\n'+instruction);
  const wait=message('assistant','CMD NEURIA examine ton fichier…');
  try{
   let endpoint,body;
   if(photo){
    const imageData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Lecture impossible'));reader.readAsDataURL(file)});
    endpoint=/(retouch|edit|modifi|eclair|noir|gris|flou|nettet|miroir|rotation|tourne|assombr)/i.test(instruction)?'/api/cmd-ai/photo/edit':'/api/cmd-ai/photo';
    body={imageData,instruction};
   }else{
    const content=await file.text();if(content.length>16000)throw Error('16 000 caractères maximum par fichier.');
    endpoint='/api/cmd-ai/file';body={filename:file.name,content,instruction};
   }
   const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(45000)});
   const d=await response.json().catch(()=>({}));if(!response.ok)throw Error(d.error||'Analyse indisponible');
   wait.textContent=String(d.reply||'Traitement terminé.');
   if(d.edited&&d.file&&typeof d.file.text==='string'){
    const button=document.createElement('button');button.type='button';button.textContent='⬇ Enregistrer le fichier corrigé';
    button.style.cssText='display:block;margin-top:12px;padding:9px 11px;border:0;border-radius:10px;background:#5865f2;color:white;cursor:pointer';
    button.onclick=()=>{const blob=new Blob([d.file.text],{type:d.file.type||'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=String(d.file.name||'corrige.txt').replace(/[\/\\]/g,'_');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)};wait.append(button);
   }
   if(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(d.image||''))){
    const img=document.createElement('img');img.className='cmd-ai-generated-image';img.alt='Photo retouchée';img.src=d.image;wait.append(img);
    const link=document.createElement('a');link.href=d.image;link.download='cmd-ia-retouche.jpg';link.textContent='⬇ Enregistrer la photo';link.style.cssText='display:block;margin-top:9px;color:#c7b7ff';wait.append(link);
   }
  }catch(e){wait.textContent='Impossible de traiter le fichier : '+String(e.message||e)}
  finally{busy=false;send.disabled=false;msgs.scrollTop=msgs.scrollHeight;inp.focus()}
 }
 root.querySelector('#cmdAiUploadDocument').onclick=()=>root.querySelector('#cmdAiDocInput').click();
 root.querySelector('#cmdAiUploadPhoto').onclick=()=>root.querySelector('#cmdAiPhotoInput').click();
 root.querySelector('#cmdAiDocInput').addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';upload(f,false)});
 root.querySelector('#cmdAiPhotoInput').addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';upload(f,true)});

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();