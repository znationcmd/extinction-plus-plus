/* Forward visible CMD native text messages with explicit destination selection.
 * No forwarding from archived external messages or private messages.
 */
(()=>{"use strict";
 if(window.cmdSphereForwardMessage)return;
 const make=(tag,parent,label)=>{
  const element=document.createElement(tag);
  if(label!==undefined)element.textContent=String(label);
  if(parent)parent.append(element);
  return element;
 };
 let active=false;
 async function json(url,options){
  const r=await fetch(url,{credentials:"same-origin",cache:"no-store",...options});
  const b=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(b.error||"Impossible de transférer ce message.");
  return b;
 }
 async function open(article){
  if(active)return;
  const ctx=window.cmdSphereMessageActions?.context?.();
  const messageId=String(article?.dataset?.messageId||"");
  if(!ctx||!ctx.guildId||!ctx.channelId||!/^[-a-f0-9]{36}$/i.test(messageId)||
    String(article.dataset.cmdSource||"")==="discord_archive")return false;
  active=true;
  const dialog=make("dialog",document.body),form=make("form",dialog);
  form.method="dialog";
  dialog.style.cssText="border:1px solid #ab86e5;border-radius:18px;padding:20px;width:min(430px,calc(100vw - 24px));max-height:85dvh;overflow:auto;background:#21172d;color:#fff;box-shadow:0 24px 90px #000d;font:14px system-ui";
  make("h3",form,"↪ Transférer le message");
  make("p",form,"Choisis un serveur et un salon où tu disposes des droits nécessaires.");
  make("label",form,"Serveur de destination");
  const guild=make("select",form),channel=make("select",form);
  for(const select of [guild,channel]){select.style.cssText="display:block;box-sizing:border-box;width:100%;min-height:46px;margin:8px 0 12px;border:1px solid #a889d8;border-radius:10px;background:#352443;color:white;padding:8px";select.setAttribute("aria-label",select===guild?"Serveur de destination":"Salon de destination");}
  make("label",form,"Salon de destination").before(channel);
  const notice=make("p",form,"Chargement…");notice.setAttribute("role","status");
  const bar=make("div",form);bar.style.cssText="display:flex;gap:10px;justify-content:flex-end";
  const cancel=make("button",bar,"Annuler"),submit=make("button",bar,"Transférer");
  for(const btn of [cancel,submit]){btn.type="button";btn.style.cssText="border:1px solid #9770c9;border-radius:10px;padding:12px;background:#443160;color:#fff;min-height:44px"; }
  submit.disabled=true;
  const fill=(select,items,placeholder)=>{
   select.replaceChildren();const empty=make("option",select,placeholder);empty.value="";empty.disabled=true;empty.selected=true;
   for(const item of items){const o=make("option",select,item.name);o.value=item.id;}
  };
  const close=()=>{dialog.close();dialog.remove();active=false};
  cancel.onclick=close;dialog.addEventListener("close",()=>{dialog.remove();active=false},{once:true});
  const loadChannels=async()=>{
   submit.disabled=true;notice.textContent="Chargement des salons…";
   const id=guild.value;
   if(!id){fill(channel,[],"Sélectionne d’abord un serveur");return}
   try{
    const data=await json("/api/native/guild/"+encodeURIComponent(id));
    const channels=(data.channels||[]).filter(x=>["text","announcement","forum"].includes(x.type))
     .map(x=>({id:String(x.id),name:"# "+String(x.name||"salon")}));
    fill(channel,channels,"Choisis un salon");
    notice.textContent=channels.length?"Les messages ne sont transférés qu’après confirmation.":"Aucun salon texte disponible.";
   }catch(error){fill(channel,[],"Salons indisponibles");notice.textContent=error.message}
  };
  guild.onchange=loadChannels;
  channel.onchange=()=>{submit.disabled=!channel.value;};
  submit.onclick=async()=>{
   if(!guild.value||!channel.value)return;
   submit.disabled=true;notice.textContent="Transfert en cours…";
   try{
    await json("/api/messages/forward",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
     sourceGuildId:ctx.guildId,sourceChannelId:ctx.channelId,messageId,
     destinationGuildId:guild.value,destinationChannelId:channel.value
    })});
    notice.textContent="Message transféré.";setTimeout(close,450);
   }catch(error){notice.textContent=error.message;submit.disabled=false;}
  };
  try{dialog.showModal()}catch{dialog.setAttribute("open","")};
  try{
   const data=await json("/api/native/guilds");
   fill(guild,(data.guilds||[]).map(x=>({id:String(x.id),name:String(x.name||"Serveur")})),"Choisis un serveur");
   fill(channel,[],"Choisis d’abord un serveur");notice.textContent="";
  }catch(error){notice.textContent=error.message;}
  return true;
 }
 window.cmdSphereForwardMessage={open};
})();
