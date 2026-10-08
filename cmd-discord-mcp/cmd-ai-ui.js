(function(){
"use strict";
function mount(){
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
 '@media(max-width:760px){.cmd-ai-open{bottom:calc(88px + env(safe-area-inset-bottom,0px));right:12px;border-radius:16px;padding:10px 13px}.cmd-ai-panel{bottom:calc(145px + env(safe-area-inset-bottom,0px));right:8px;left:8px;width:auto;height:min(620px,calc(100dvh - 175px - env(safe-area-inset-bottom,0px)));border-radius:18px}.cmd-ai-form input{font-size:16px}}',
 '@media(max-height:520px){.cmd-ai-panel{top:8px;bottom:8px;height:auto}.cmd-ai-open{bottom:8px}}'
 ].join("");document.head.appendChild(st);
 const opener=document.createElement('button');opener.type='button';opener.id='cmdAiLauncher';opener.className='cmd-ai-open';opener.setAttribute('aria-label','Ouvrir CMD IA');opener.innerHTML='<span>✦</span> CMD IA';
 const root=document.createElement('section');root.className='cmd-ai-panel';root.id='cmdAiPanel';root.setAttribute('role','dialog');root.setAttribute('aria-label','Assistant gratuit CMD IA');root.innerHTML='<header class="cmd-ai-head"><div class="cmd-ai-mark">✦</div><div class="cmd-ai-head-copy"><b>CMD IA</b><small>Blagues, aide CMD Sphere et questions</small></div><button type="button" id="cmdAiClose" aria-label="Fermer">×</button></header><div class="cmd-ai-messages" id="cmdAiMessages" aria-live="polite"></div><div class="cmd-ai-chips"><button type="button" data-cmd-ai-quick="Raconte une blague !">😄 Une blague</button><button type="button" data-cmd-ai-quick="Comment synchroniser mes Discord ?">🔄 Mes Discord</button><button type="button" data-cmd-ai-quick="Comment modifier mon profil ?">👤 Mon profil</button></div><form class="cmd-ai-form" id="cmdAiForm"><input id="cmdAiInput" aria-label="Message à CMD IA" maxlength="2000" placeholder="Écris ta demande..." autocomplete="off" required><button id="cmdAiSend" type="submit" aria-label="Envoyer">➤</button></form><div class="cmd-ai-note">Réponses automatiques gratuites. Les informations importantes sont à vérifier. Un modèle avancé peut être limité par les quotas du fournisseur.</div>';
 document.body.append(opener,root);
 const msgs=root.querySelector('#cmdAiMessages'),inp=root.querySelector('#cmdAiInput'),send=root.querySelector('#cmdAiSend');
 let history=[],busy=false;
 function message(role,content){const el=document.createElement('div');el.className='cmd-ai-bubble'+(role==='user'?' you':'');el.textContent=String(content||'');msgs.appendChild(el);msgs.scrollTop=msgs.scrollHeight;return el}
 message('assistant','Salut ! Je suis CMD IA ✨ Pose-moi une question, demande une blague ou laisse-moi t’aider à utiliser CMD Sphere.');
 function open(){root.classList.add('on');inp.focus()}
 function close(){root.classList.remove('on');opener.focus()}
 opener.onclick=function(){root.classList.contains('on')?close():open()};
 root.querySelector('#cmdAiClose').onclick=close;
 window.addEventListener('keydown',function(e){if(e.key==='Escape'&&root.classList.contains('on'))close()});
 window.addEventListener('cmdsphere:open-ai',open);
 async function ask(value){
  if(busy)return;
  const q=String(value||'').trim().slice(0,2000);if(!q)return;
  busy=true;send.disabled=true;inp.value='';message('user',q);const wait=message('assistant','CMD IA réfléchit…');
  try{
   const r=await fetch('/api/cmd-ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:q,history:history.slice(-8)}),cache:'no-store',signal:AbortSignal.timeout(19000)});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(data.error||'Service indisponible');
   const answer=String(data.reply||'Réponse indisponible.');wait.textContent=answer;
   history.push({role:'user',text:q},{role:'assistant',text:answer});history=history.slice(-8);
  }catch(e){wait.textContent='Je ne peux pas répondre pour le moment : '+e.message+'. Réessaie.'}
  finally{busy=false;send.disabled=false;msgs.scrollTop=msgs.scrollHeight;inp.focus()}
 }
 root.querySelector('#cmdAiForm').addEventListener('submit',function(e){e.preventDefault();ask(inp.value)});
 root.querySelectorAll('[data-cmd-ai-quick]').forEach(function(b){b.addEventListener('click',function(){ask(b.dataset.cmdAiQuick)})});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();