/* CMD Sphere personal Streamer mode; makes on-screen identities and invites less visible.
 * Per-account server preference, off by default. No data or assets are modified.
 */
(()=>{"use strict";if(window.cmdStreamerModeReady)return;window.cmdStreamerModeReady=true;
 const style=document.createElement("style");
 style.textContent=`
 #cmdStreamerToggle{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(14px + env(safe-area-inset-bottom));z-index:14000;max-width:145px;padding:11px 14px;border:1px solid #c1a1ff9e;border-radius:14px;background:linear-gradient(150deg,#35234c,#100d1b);box-shadow:0 6px 28px #000b;color:#fff;font:700 12px system-ui;cursor:pointer;min-height:46px}
 #cmdStreamerToggle[aria-pressed=true]{background:linear-gradient(140deg,#522b90,#291546);outline:2px solid #ad8bf1}
 #cmdStreamerToggle:focus-visible{outline:3px solid #f1d2ff}
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
 function mount(){if(!document.body)return;document.body.append(button);render();sync("GET").catch(()=>{button.disabled=true;button.title="Connecte-toi à CMD Sphere pour activer ce réglage."})}
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
 window.cmdSphereStreamerMode={getSettings:copy,set:async settings=>sync("PATCH",{...state,...settings})};
})();
