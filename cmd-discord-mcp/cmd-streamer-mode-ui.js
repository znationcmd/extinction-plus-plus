/* CMD Sphere personal Streamer mode; makes on-screen identities and invites less visible.
 * Per-account server preference, off by default. No data or assets are modified.
 */
(()=>{"use strict";if(window.cmdStreamerModeReady)return;window.cmdStreamerModeReady=true;
 const style=document.createElement("style");
 style.textContent=`
 #cmdProfileMotionStreamerRow{display:flex;align-items:stretch;gap:8px;box-sizing:border-box;margin:8px 12px 12px;width:calc(100% - 24px);max-width:720px}
 #cmdStreamerToggle{position:static;display:block;flex:1 1 0;min-width:0;max-width:none;min-height:44px;padding:9px 8px;border:1px solid #c1a1ff9e;border-radius:14px;background:linear-gradient(150deg,#35234c,#100d1b);box-shadow:0 6px 20px #0009;color:#fff;font:700 clamp(11px,3.1vw,14px)/1.2 system-ui;cursor:pointer;white-space:normal}
 #cmdProfileMotionStreamerRow > .cmd-photo-motion-toggle{box-sizing:border-box;flex:1 1 0;min-width:0;min-height:44px;max-width:none;padding:9px 8px;font:700 clamp(11px,3.1vw,14px)/1.2 system-ui;white-space:normal;text-align:center}
 #cmdStreamerToggle:disabled{opacity:.55;cursor:not-allowed}
 #cmdStreamerToggle[aria-pressed=true]{background:linear-gradient(140deg,#522b90,#291546);outline:2px solid #ad8bf1}
 #cmdStreamerToggle:focus-visible{outline:3px solid #f1d2ff}
 #cmdProfileWorldLanguageButton{position:static;display:flex;align-items:center;justify-content:center;flex:1 1 0;min-width:0;max-width:none;min-height:44px;padding:9px 6px;border:1px solid #9772ffb9;border-radius:14px;background:linear-gradient(150deg,#35234c,#100d1b);box-shadow:0 6px 20px #0009;color:#f4edff;font:700 clamp(11px,3vw,14px)/1.2 system-ui;cursor:pointer;white-space:normal}
 #cmdProfileWorldLanguageButton:focus-visible{outline:3px solid #f1d2ff}
 @media(max-width:430px){#cmdProfileMotionStreamerRow{gap:5px;margin-inline:8px;width:calc(100% - 16px)}#cmdStreamerToggle,#cmdProfileMotionStreamerRow>.cmd-photo-motion-toggle,#cmdProfileWorldLanguageButton{padding:8px 4px;font-size:11px}}
 body.cmd-streamer-enabled .msg-author,body.cmd-streamer-enabled .msg-meta .username,
 body.cmd-streamer-enabled .msg-avatar,body.cmd-streamer-enabled .cmd-profile-username,
 body.cmd-streamer-enabled .username,body.cmd-streamer-enabled .friendRow b,
 body.cmd-streamer-enabled .dmTo,body.cmd-streamer-enabled .thread .name,
 body.cmd-streamer-enabled [data-profile-username],body.cmd-streamer-enabled .cmd-person-target,
 body.cmd-streamer-enabled [data-testid=account-email] {filter:blur(8px)!important}
 body.cmd-streamer-enabled.cmd-streamer-mask-invites a[href*="/invite/"],
 body.cmd-streamer-enabled.cmd-streamer-mask-invites a[href*="discord.gg/"],
 body.cmd-streamer-enabled.cmd-streamer-mask-invites input[name="invite"],
 body.cmd-streamer-enabled.cmd-streamer-mask-invites [data-cmd-invite-code],
 body.cmd-streamer-enabled.cmd-streamer-mask-invites #copyInvite {filter:blur(9px)!important}
 body.cmd-streamer-enabled.cmd-streamer-hide-notifications .toast,
 body.cmd-streamer-enabled.cmd-streamer-hide-notifications .notification-popover,
 body.cmd-streamer-enabled.cmd-streamer-hide-notifications #notifPop {visibility:hidden!important}
 `;document.head.append(style);
 const cssClasses=["cmd-streamer-enabled","cmd-streamer-mask-invites","cmd-streamer-hide-notifications"];
 const state={enabled:false,maskInvites:true,hideNotifications:true},copy=()=>({...state});
 const languageButton=document.createElement("button");languageButton.id="cmdProfileWorldLanguageButton";languageButton.type="button";
 languageButton.textContent="🌐 Langues";languageButton.setAttribute("aria-label","Choisir parmi toutes les langues et dialectes");
 languageButton.title="Langues du monde, par pays ou par ordre alphabétique";
 languageButton.onclick=()=>{const picker=window.CMDWorldLanguagePicker;if(picker?.open)picker.open();else window.alert?.("Catalogue des langues en cours de chargement. Réessaie dans un instant.")};
 const button=document.createElement("button");button.id="cmdStreamerToggle";button.type="button";
 button.title="Masquer les informations personnelles pendant un partage d'écran";
 button.setAttribute("aria-label","Activer ou désactiver le mode Streamer");
 const notify=()=>{button.textContent=state.enabled?"🎥 Streamer ACTIVÉ":"🎥 Mode Streamer";button.setAttribute("aria-pressed",String(state.enabled))};
 const render=()=>{document.body.classList.toggle(cssClasses[0],state.enabled);document.body.classList.toggle(cssClasses[1],state.enabled&&state.maskInvites);document.body.classList.toggle(cssClasses[2],state.enabled&&state.hideNotifications);notify()};
 async function sync(method,data){
  const response=await fetch("/api/account/streamer-mode",{method,credentials:"same-origin",cache:"no-store",headers:method==="GET"?{}:{"content-type":"application/json"},...(data?{body:JSON.stringify(data)}:{})});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||"Impossible de régler le mode Streamer.");
  for(const key of Object.keys(state))if(typeof body[key]==="boolean")state[key]=body[key];
  render();return copy();
 }
 button.onclick=async()=>{
  button.disabled=true;const previous=copy();
  try{await sync("PATCH",{...state,enabled:!state.enabled})}
  catch(err){Object.assign(state,previous);render();window.alert?.(err.message)}
  finally{button.disabled=false}
 };
 function placeProfileToggle(){
  if(location.pathname!=="/profile")return false;
  const animation=document.querySelector(".cmd-photo-motion-toggle");
  if(!animation)return false;
  let row=document.getElementById("cmdProfileMotionStreamerRow");
  if(!row){row=document.createElement("div");row.id="cmdProfileMotionStreamerRow";row.setAttribute("role","group");row.setAttribute("aria-label","Options d’affichage du profil");animation.before(row)}
  if(animation.parentElement!==row)row.append(animation);
  if(button.parentElement!==row)row.append(button);
  if(languageButton.parentElement!==row)row.append(languageButton);
  document.dispatchEvent(new CustomEvent('cmd-profile-language-control-ready'));
  return true;
 }
 function mount(){
  if(!document.body)return;
  if(location.pathname==="/profile"&&!placeProfileToggle()){
   const observer=new MutationObserver(()=>{if(placeProfileToggle())observer.disconnect()});
   observer.observe(document.body,{childList:true,subtree:true});
  }
  render();
  sync("GET").catch(()=>{button.disabled=true;button.title="Connecte-toi à CMD Sphere pour activer ce réglage."});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
 window.cmdSphereStreamerMode={getSettings:copy,set:async settings=>sync("PATCH",{...state,...settings})};
})();
