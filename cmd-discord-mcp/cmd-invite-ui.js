// CMD Sphere - shareable invite links on mobile and desktop.
(() => {
 "use strict";
 if (window.__cmdInviteUiReady) return;
 window.__cmdInviteUiReady=true;
 const css=document.createElement("style");
 css.textContent=`
 .cmd-invite-launch{border:1px solid #b77ef988;background:linear-gradient(120deg,#522d82,#26204d);color:#fff;border-radius:12px;padding:10px 12px;font:750 12px system-ui;cursor:pointer;box-shadow:0 4px 16px #0004}
 .cmd-invite-launch:hover{filter:brightness(1.12)}
 .cmd-invite-backdrop{position:fixed;inset:0;background:#08050bd9;z-index:99998;display:none;align-items:center;justify-content:center;padding:20px}
 .cmd-invite-backdrop.open{display:flex}
 .cmd-invite-dialog{width:min(440px,100%);background:linear-gradient(145deg,#29223b,#161623);color:#f5ecff;border:1px solid #9b71dd77;border-radius:22px;padding:24px;box-shadow:0 28px 75px #000b;font:14px system-ui}
 .cmd-invite-dialog h2{margin:0 0 10px;font-size:23px}.cmd-invite-dialog p{color:#c6b9d6;line-height:1.5}
 .cmd-invite-dialog label{display:block;font-weight:700;margin-top:16px;font-size:12px}
 .cmd-invite-dialog input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #77639a;border-radius:11px;background:#10101b;color:#fff;margin-top:8px;font-size:12px}
 .cmd-invite-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}
 .cmd-invite-actions button{border:1px solid #8e62d1;border-radius:10px;background:#623e9c;color:white;padding:11px 13px;font-weight:800;cursor:pointer}
 .cmd-invite-actions button:last-child{background:#292534}
 .cmd-invite-hint{min-height:24px;color:#93f3db;margin-top:12px;font-size:12px}
 .cmd-invite-inline{margin:12px 0;background:#1f1a30;border:1px solid #8061a6;border-radius:12px;padding:10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;color:#f5ecff}
 .cmd-invite-inline span{font:12px system-ui}
 .cmd-invite-inline input{box-sizing:border-box;flex:1 1 180px;min-width:0;padding:9px;background:#111021;color:#e8e0ff;border:1px solid #61557d;border-radius:8px;font-size:11px}
 .cmd-invite-inline button{padding:9px 11px;border:0;background:#8149c4;border-radius:8px;color:#fff;cursor:pointer;font-weight:700}
 .cmd-invite-floating{position:fixed;right:10px;top:calc(74px + env(safe-area-inset-top));z-index:45;max-width:220px}
 @media(max-width:580px){.cmd-invite-floating{right:7px;top:calc(62px + env(safe-area-inset-top));padding:7px 10px;font-size:11px}}
 `;
 document.head.append(css);
 const appLink=location.origin+"/dashboard-login?next="+encodeURIComponent("/dashboard");
 const panel=document.createElement("div");panel.className="cmd-invite-backdrop";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");
 panel.innerHTML='<section class="cmd-invite-dialog"><h2>🔗 Inviter des amis</h2><p id="cmdInviteDescription">Partage CMD Sphere avec tes amis.</p><label>Lien d’invitation<input id="cmdInviteLinkInput" readonly></label><div class="cmd-invite-actions"><button type="button" id="cmdInviteCopyAction">📋 Copier le lien</button><button type="button" id="cmdInviteShareAction">↗ Partager</button><button type="button" id="cmdInviteCloseAction">Fermer</button></div><div class="cmd-invite-hint" id="cmdInviteMsg" role="status"></div></section>';
 document.body.append(panel);
 const inp=panel.querySelector("#cmdInviteLinkInput"),msg=panel.querySelector("#cmdInviteMsg"),desc=panel.querySelector("#cmdInviteDescription");
 let inviteUrl=appLink;
 function toast(s){msg.textContent=s}
 async function copy(text){try{if(navigator.clipboard&&isSecureContext){await navigator.clipboard.writeText(text);return true}}catch{}try{const el=document.createElement("textarea");el.value=text;el.style.position="fixed";el.style.left="-9999px";document.body.append(el);el.select();const yes=document.execCommand("copy");el.remove();return yes}catch{return false}}
 function open(url,title){inviteUrl=url;inp.value=url;desc.textContent=title;toast("");panel.classList.add("open");inp.focus();inp.select()}
 panel.querySelector("#cmdInviteCopyAction").onclick=async()=>{toast(await copy(inviteUrl)?"Lien d’invitation copié !":"Sélectionne et copie le lien ci-dessus.")};
 panel.querySelector("#cmdInviteShareAction").onclick=async()=>{if(navigator.share){try{await navigator.share({title:"CMD Sphere",url:inviteUrl});return}catch(e){if(e.name==="AbortError")return}}toast(await copy(inviteUrl)?"Lien copié !":"Tu peux copier le lien ci-dessus.")};
 panel.querySelector("#cmdInviteCloseAction").onclick=()=>panel.classList.remove("open");
 panel.addEventListener("click",e=>{if(e.target===panel)panel.classList.remove("open")});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")panel.classList.remove("open")});
 const shareBtn=document.createElement("button");
 shareBtn.type="button";shareBtn.className="cmd-invite-launch cmd-invite-floating";shareBtn.textContent="🔗 Inviter des amis";
 shareBtn.onclick=()=>open(appLink,"Partage CMD Sphere. Pour inviter dans un serveur précis, ouvre ce serveur puis utilise son lien d’invitation.");
 document.body.append(shareBtn);
 let lastGuildId="";
 const process=()=>{
  const root=document.querySelector("#workspace"),id=root?.dataset.nativeGuildId,header=document.querySelector(".cmd-server-head-actions");
  if(!id||!header||!header.isConnected){lastGuildId="";return}
  if(lastGuildId===id&&header.querySelector(".cmd-invite-inline"))return;
  lastGuildId=id;
  header.querySelector(".cmd-invite-inline")?.remove();
  const box=document.createElement("div");box.className="cmd-invite-inline";
  const label=document.createElement("span");label.textContent="🔗 Lien d’invitation :";
  const field=document.createElement("input");field.readOnly=true;field.value="Chargement…";field.setAttribute("aria-label","Lien d'invitation du serveur");
  const btn=document.createElement("button");btn.type="button";btn.textContent="Copier / partager";
  box.append(label,field,btn);header.append(box);
  fetch("/api/native/guild/"+encodeURIComponent(id),{credentials:"same-origin",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Impossible de charger l’invitation");return r.json()}).then(d=>{
    if(root?.dataset.nativeGuildId!==id)return;
    const url=String(d.inviteUrl||"");
    if(!/^https:\/\//.test(url))throw Error("Pas d’invitation disponible");
    field.value=url;field.onclick=()=>{field.select()};btn.onclick=()=>open(url,"Invitation pour rejoindre ce serveur CMD Sphere.");shareBtn.onclick=()=>open(url,"Invitation pour rejoindre ce serveur CMD Sphere.");
  }).catch(()=>{field.value="Lien indisponible";btn.disabled=true;btn.textContent="Non disponible"});
 };
 const observer=new MutationObserver(()=>{if(!window.__cmdInvitePending){window.__cmdInvitePending=true;requestAnimationFrame(()=>{window.__cmdInvitePending=false;process()})}});
 observer.observe(document.body,{childList:true,subtree:true});process();
})();