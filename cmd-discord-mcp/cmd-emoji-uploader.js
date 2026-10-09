/* CMD Sphere: emoji creation + upload modal and shared server collections. */
(()=>{"use strict";
 const $=s=>document.querySelector(s);
 const bridge=()=>window.__cmdEmojiPickerBridge;
 const UUID=/^[0-9a-f-]{36}$/i;
 let pending=null,lastFetch=0,lastGuild="",panel=null,nextOffset=0,hasMore=false,pageLoading=false;
 const activeGuild=()=>String($("#workspace")?.dataset.nativeGuildId||"");
 const label=s=>String(s||"").trim();
 function normalize(e){
   return {kind:"cmd",id:e.id,name:e.name,scope:e.scope,animated:Boolean(e.animated),
     image:e.url,canDelete:Boolean(e.canDelete),packName:e.scope==="server"?"Ce serveur":e.scope==="community"?"Communauté":"Personnel",
     value:":cmdemoji:"+e.id+":"};
 }
 async function getLibrary(force=false){
   const p=bridge();if(!p)return;
   const gid=activeGuild();if(!force&&pending)return pending;
   if(!force&&lastGuild===gid&&Date.now()-lastFetch<15000)return;
   pending=(async()=>{
     try{
       const q=await fetch("/api/cmd-emojis"+(gid?"?guildId="+encodeURIComponent(gid):""),{credentials:"same-origin",cache:"no-store"});
       if(!q.ok)throw Error("Bibliothèque non disponible");
       const data=await q.json();
       p.state.library=(data.emojis||[]).filter(e=>UUID.test(String(e.id||""))).map(normalize);
       nextOffset=Number(data.nextOffset||0);hasMore=Boolean(data.hasMore);
       p.state.libraryRole=data.role||null;p.state.libraryGuild=gid;
       lastGuild=gid;lastFetch=Date.now();
     }catch(e){
       p.state.library=[];p.state.libraryRole=null;p.state.libraryGuild=gid;
       nextOffset=0;hasMore=false;
       $("#cmdEmojiCreatorNotice")&&( $("#cmdEmojiCreatorNotice").textContent=e.message );
     }finally{p.draw();pending=null}
   })();
   return pending;
 }
 async function fetchNextLibrary(){
   const p=bridge(),gid=activeGuild();
   if(!p||pending||pageLoading||!hasMore||lastGuild!==gid)return;
   pageLoading=true;
   const oldTop=$("#cmdEmojiResults")?.scrollTop||0;
   try{
     const route="/api/cmd-emojis?offset="+encodeURIComponent(nextOffset)+(gid?"&guildId="+encodeURIComponent(gid):"");
     const r=await fetch(route,{credentials:"same-origin",cache:"no-store"});
     if(!r.ok)throw Error("Suite du catalogue indisponible");
     const data=await r.json();
     const fresh=(data.emojis||[]).filter(e=>UUID.test(String(e.id||""))).map(normalize);
     const known=new Set(p.state.library.map(e=>e.id));
     p.state.library.push(...fresh.filter(e=>!known.has(e.id)));
     hasMore=Boolean(data.hasMore);nextOffset=Number(data.nextOffset||nextOffset+fresh.length);
     p.draw();
     const root=$("#cmdEmojiResults");if(root)root.scrollTop=oldTop;
   }catch(error){
     hasMore=false;
     const notice=$("#cmdEmojiCreatorNotice");if(notice)notice.textContent=error.message;
   }finally{pageLoading=false}
 }
 window.cmdEmojiFetchNext=fetchNextLibrary;
 window.cmdEmojiRefreshLibrary=getLibrary;
 function drawMine(){
   const root=$("#cmdEmojiOwned");if(!root)return;
   root.replaceChildren();const list=bridge()?.state.library.filter(e=>e.canDelete)||[];
   if(!list.length){root.textContent="Aucun emoji à gérer.";return}
   for(const e of list){
     const line=document.createElement("div");line.className="cmd-emoji-owned";
     const image=document.createElement("img");image.src=e.image;image.alt="";
     const txt=document.createElement("span");txt.textContent=e.name+" · "+(e.scope==="server"?"Serveur":e.scope==="community"?"Communauté":"Moi");
     const del=document.createElement("button");del.type="button";del.textContent="Supprimer";
     del.addEventListener("click",async()=>{
       if(!confirm("Supprimer l’emoji "+e.name+" ?"))return;
       try{
         const r=await fetch("/api/cmd-emojis/"+e.id,{method:"DELETE",credentials:"same-origin"});
         const j=await r.json();if(!r.ok)throw Error(j.error||"Suppression impossible");
         await getLibrary(true);drawMine();
       }catch(error){$("#cmdEmojiCreatorNotice").textContent=error.message}
     });
     line.append(image,txt,del);root.append(line);
   }
 }
 async function imageData(file,character){
   if(file){
     if(!/^image\/(gif|png|jpeg|webp)$/.test(file.type))throw Error("Formats acceptés : PNG, JPG, WebP, GIF.");
     if(file.size>1024*1024)throw Error("Fichier de plus de 1 Mo.");
     return await new Promise((resolve,reject)=>{
       const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));
       reader.onerror=()=>reject(Error("Lecture impossible"));reader.readAsDataURL(file);
     });
   }
   if(!character.trim())throw Error("Choisis une image ou un symbole.");
   const cv=document.createElement("canvas");cv.width=128;cv.height=128;
   const ctx=cv.getContext("2d");if(!ctx)throw Error("Création impossible sur cet appareil.");
   ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="90px 'Apple Color Emoji','Segoe UI Emoji',sans-serif";
   ctx.fillText(character.trim(),64,65,122);
   return cv.toDataURL("image/png");
 }
 async function openCreator(){
   const sheet=$("#channelEmojiSheet");if(!sheet)return;
   if(panel){panel.remove();panel=null;return}
   await getLibrary();
   panel=document.createElement("div");panel.id="cmdEmojiCreator";panel.className="cmd-emoji-creator";
   const role=bridge()?.state.libraryRole,canServer=["owner","admin"].includes(role)&&Boolean(bridge()?.state.libraryGuild);
   panel.innerHTML='<form id="cmdEmojiCreatorForm">'+
     '<div class="cmd-emoji-creator-head"><strong>Créer un emoji</strong><button type="button" id="cmdEmojiClose" aria-label="Fermer">✕</button></div>'+
     '<label>Nom de l’emoji<input name="name" type="text" required minlength="2" maxlength="32" placeholder="ex. mon_dino"></label>'+
     '<label>Image / GIF animé<input id="cmdEmojiFile" type="file" accept="image/png,image/jpeg,image/gif,image/webp"></label>'+
     '<label>Ou créer un emoji avec un symbole<input id="cmdEmojiSymbol" maxlength="8" type="text" placeholder="🦖"></label>'+
     '<label>Qui pourra l’utiliser ?<select name="scope"><option value="personal">Moi (bibliothèque personnelle)</option><option value="community">Tout CMD Sphere (partagé)</option>'+
     (canServer?'<option value="server">Membres de ce serveur</option>':'')+'</select></label>'+
     '<small>Fichiers PNG, JPG, WebP ou GIF animé, jusqu’à 1 Mo. Choisis uniquement des images autorisées.</small>'+
     '<button type="submit" id="cmdEmojiSave">Enregistrer</button><p id="cmdEmojiCreatorNotice" role="status"></p></form>'+
     '<section class="cmd-emoji-manage"><strong>Mes emojis et ceux que je peux gérer</strong><div id="cmdEmojiOwned"></div></section>';
   sheet.append(panel);
   $("#cmdEmojiClose").onclick=()=>{panel.remove();panel=null};
   drawMine();
   $("#cmdEmojiCreatorForm").onsubmit=async event=>{
     event.preventDefault();const form=event.currentTarget,notice=$("#cmdEmojiCreatorNotice"),btn=$("#cmdEmojiSave");
     btn.disabled=true;notice.textContent="Enregistrement…";
     try{
       const name=label(form.elements.name.value);
       if(!/^[\p{L}\p{N}_-]{2,32}$/u.test(name))throw Error("Nom de 2 à 32 caractères, lettres/chiffres, tiret ou _.");
       const dataUrl=await imageData($("#cmdEmojiFile").files[0],$("#cmdEmojiSymbol").value);
       const scope=String(form.elements.scope.value);
       const r=await fetch("/api/cmd-emojis",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({name,scope,guildId:activeGuild()||null,dataUrl})});
       const output=await r.json();if(!r.ok)throw Error(output.error||"Erreur d'import");
       notice.textContent="Emoji ajouté avec succès.";
       form.reset();const p=bridge();p.state.selected=scope==="personal"?"mine":scope;
       await getLibrary(true);drawMine();
     }catch(e){notice.textContent=e.message||"Erreur"}
     finally{btn.disabled=false}
   };
 }
 window.cmdEmojiOpenCreator=openCreator;
})();
