/* CMD Sphere message reminders: opt-in real API, account-scoped list and cancellation.
 * No automatic reminders, no secrets, no persistent local copies of messages.
 */
(()=>{"use strict";if(window.cmdSphereReminders)return;
 const request=async(method,input)=>{
  const r=await fetch("/api/messages/reminders",{method,credentials:"same-origin",
   headers:method==="GET"?{}:{"content-type":"application/json"},
   ...(input?{body:JSON.stringify(input)}:{})});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(body.error||"Rappel indisponible.");return body;
 };
 const node=(tag,text="",cls="")=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(text)el.textContent=text;return el;
 };
 const stylesheet=node("style");
 stylesheet.textContent=`
 .cmd-reminder-shade{position:fixed;inset:0;z-index:17000;background:#05030bda;display:flex;align-items:center;justify-content:center;padding:18px}
 .cmd-reminder-panel{box-sizing:border-box;width:min(440px,100%);max-height:88dvh;overflow:auto;background:linear-gradient(145deg,#2a1e38,#120f1d);color:#f4e9ff;border:1px solid #9c72d5;border-radius:20px;box-shadow:0 22px 65px #000d;padding:20px;font:15px system-ui}
 .cmd-reminder-panel h2{font-size:19px;margin:0 0 10px}.cmd-reminder-panel label{display:block;margin:13px 0}
 .cmd-reminder-panel input{display:block;margin-top:5px;width:100%;box-sizing:border-box;min-height:44px;color-scheme:dark;background:#191321;border:1px solid #9874ba;border-radius:8px;color:#fff;padding:8px}
 .cmd-reminder-panel button{border:1px solid #9573d1;border-radius:10px;background:#3b2850;color:#fff;font-weight:650;min-height:40px;padding:8px 13px;cursor:pointer;margin:3px}
 .cmd-reminder-panel button:disabled{opacity:.55;cursor:wait}.cmd-reminder-panel .cmd-reminder-actions{display:flex;flex-wrap:wrap;justify-content:flex-end}
 .cmd-reminder-panel .cmd-reminder-row{border-bottom:1px solid #ffffff22;padding:9px 0;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px}
 .cmd-reminder-panel [role=status]{color:#cae6ff;min-height:20px;font-size:13px}
 `;
 document.head.append(stylesheet);
 function overlay(){
  document.querySelector(".cmd-reminder-shade")?.remove();
  const shade=node("div","","cmd-reminder-shade"),box=node("section","","cmd-reminder-panel");
  box.setAttribute("role","dialog");box.setAttribute("aria-modal","true");box.setAttribute("aria-label","Rappels de messages CMD Sphere");
  shade.append(box);document.body.append(shade);
  const close=()=>shade.remove();
  shade.addEventListener("click",e=>{if(e.target===shade)close()});
  shade.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  return {box,close};
 }
 function fmt(iso){try{return new Date(iso).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})}catch{return "Date inconnue"}}
 async function showList(box,status){
  const list=box.querySelector(".cmd-reminder-list");if(!list)return;
  list.replaceChildren(node("p","Chargement…"));
  try{
   const results=await request("GET");
   list.replaceChildren();
   if(!results.reminders?.length){list.append(node("p","Aucun rappel programmé."));return}
   for(const reminder of results.reminders){
    const line=node("div","","cmd-reminder-row");
    line.append(node("span",fmt(reminder.due_at)+" · Message enregistré"));
    const cancel=node("button","Annuler");cancel.type="button";
    cancel.onclick=async()=>{
     cancel.disabled=true;try{await request("DELETE",{id:reminder.id});await showList(box,status);status.textContent="Rappel annulé."}
     catch(err){status.textContent=err.message;cancel.disabled=false}
    };
    line.append(cancel);list.append(line);
   }
  }catch(e){list.replaceChildren(node("p",e.message))}
 }
 function show(article){
  const context=window.cmdSphereMessageActions?.context?.();
  const messageId=String(article?.dataset?.messageId||"");
  const valid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
  if(!context?.guildId||!context?.channelId||!valid.test(messageId))return false;
  const {box,close}=overlay();
  box.append(node("h2","Rappeler ce message"));
  const label=node("label","Date et heure du rappel");const date=node("input");
  date.type="datetime-local";date.required=true;
  const then=new Date(Date.now()+3600_000);const local=new Date(then.getTime()-then.getTimezoneOffset()*60000);
  date.value=local.toISOString().slice(0,16);label.append(date);box.append(label);
  const status=node("p","","");status.setAttribute("role","status");box.append(status);
  const actions=node("div","","cmd-reminder-actions");
  const cancel=node("button","Fermer"),save=node("button","Créer le rappel");
  cancel.type=save.type="button";cancel.onclick=close;
  actions.append(cancel,save);box.append(actions);
  box.append(node("h2","Mes rappels en attente"));
  box.append(node("div","","cmd-reminder-list"));
  save.onclick=async()=>{
   const parsed=new Date(date.value);if(!date.value||!Number.isFinite(parsed.getTime())){status.textContent="Sélectionne une date valide.";return}
   save.disabled=true;status.textContent="Enregistrement…";
   try{
    const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";
    await request("POST",{guildId:context.guildId,channelId:context.channelId,messageId,
      dueAt:parsed.toISOString(),timezone});
    status.textContent="Rappel enregistré pour le "+fmt(parsed.toISOString())+".";
    await showList(box,status);
   }catch(err){status.textContent=err.message}
   finally{save.disabled=false}
  };
  void showList(box,status);date.focus();return true;
 }
 function list(){
  const {box,close}=overlay();box.append(node("h2","Mes rappels de messages"));
  const status=node("p");status.setAttribute("role","status");box.append(status);
  box.append(node("div","","cmd-reminder-list"));
  const button=node("button","Fermer");button.onclick=close;box.append(button);
  void showList(box,status);
 }
 window.cmdSphereReminders={open:show,list};
})();
