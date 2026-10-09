/* CMD Sphere: emoji creation + upload modal and shared server collections. */
(()=>{"use strict";
 const $=s=>document.querySelector(s);
 const bridge=()=>window.__cmdEmojiPickerBridge;
 const UUID=/^[0-9a-f-]{36}$/i;
 let pending=null,lastFetch=0,lastGuild="",panel=null,nextOffset=0,hasMore=false,pageLoading=false,generation=0;
 const activeGuild=()=>String($("#workspace")?.dataset.nativeGuildId||"");
 const label=s=>String(s||"").trim();
 const scrollRoot=()=>$("#cmdEmojiResults");
 const isShowingLibrary=()=>["all","mine","community","server"].includes(bridge()?.state.selected);
 let libraryError="";
 function normalize(e){
   return {kind:"cmd",id:e.id,name:e.name,scope:e.scope,animated:Boolean(e.animated),
     image:e.url,canDelete:Boolean(e.canDelete),
     packName:e.scope==="server"?(e.serverName||"Serveur"):e.scope==="community"?"Communauté":"Personnel",
     value:":cmdemoji:"+e.id+":"};
 }
 function libraryUrl(gid,offset=0){
   const args=new URLSearchParams({offset:String(offset),all:"1"});
   if(gid)args.set("guildId",gid);
   return "/api/cmd-emojis?"+args.toString();
 }
 function appendPage(data,p){
   const current=new Set(p.state.library.map(e=>e.id));
   const fresh=(data.emojis||[]).filter(e=>UUID.test(String(e.id||""))&&!current.has(e.id)).map(normalize);
   if(fresh.length)p.state.library.push(...fresh);
   const count=Array.isArray(data.emojis)?data.emojis.length:0;
   const newOffset=Number(data.nextOffset);
   if(Number.isFinite(newOffset)&&newOffset>nextOffset)nextOffset=newOffset;
   else nextOffset+=count;
   hasMore=Boolean(data.hasMore)&&count>0;
   return fresh.length;
 }
 function redrawLibrary(){
   const p=bridge();if(!p||!isShowingLibrary())return;
   const root=scrollRoot(),oldTop=root?.scrollTop||0;
   p.draw();
   const next=scrollRoot();if(next)next.scrollTop=oldTop;
 }
 async function fetchNextLibrary(){
   const p=bridge(),gid=activeGuild(),token=generation;
   if(!p||pending||pageLoading||!hasMore||lastGuild!==gid)return false;
   pageLoading=true;
   try{
     const res=await fetch(libraryUrl(gid,nextOffset),{credentials:"same-origin",cache:"no-store"});
     const data=await res.json().catch(()=>({}));
     if(!res.ok)throw Error(data.error||"Suite de la bibliothèque indisponible");
     if(generation!==token||lastGuild!==gid)return false;
     const added=appendPage(data,p);
     libraryError="";
     if(added)redrawLibrary();
     return true;
   }catch(error){
     if(generation===token){libraryError=error.message||"Téléchargement temporairement indisponible";console.warn("[CMD emoji]",libraryError)}
     return false;
   }finally{pageLoading=false}
 }
 async function fetchAllPages(token,gid){
   // Continue automatically beyond 500 / 1000 / 10000; only the visible thumbnails are rendered.
   // One request at a time avoids saturating mobiles and Railway.
   while(generation===token&&lastGuild===gid&&hasMore){
     const ok=await fetchNextLibrary();
     if(!ok)break;
     await new Promise(resolve=>setTimeout(resolve,0));
   }
   window.dispatchEvent(new CustomEvent("cmdEmojiLibraryLoaded",{detail:{total:bridge()?.state.library.length||0,complete:!hasMore}}));
 }
 async function getLibrary(force=false){
   const p=bridge();if(!p)return;
   const gid=activeGuild();
   if(pending&&!force&&lastGuild===gid)return pending;
   if(!force&&lastGuild===gid&&Date.now()-lastFetch<15000)return;
   const token=++generation;
   lastGuild=gid;nextOffset=0;hasMore=false;pageLoading=false;
   pending=(async()=>{
     try{
       const res=await fetch(libraryUrl(gid,0),{credentials:"same-origin",cache:"no-store"});
       const data=await res.json().catch(()=>({}));
       if(!res.ok)throw Error(data.error||"Bibliothèque non disponible");
       if(generation!==token)return;
       p.state.library=[];
       appendPage(data,p);
       p.state.libraryRole=data.role||null;p.state.libraryGuild=gid;p.state.libraryFounder=Boolean(data.founder);
       lastFetch=Date.now();libraryError="";
     }catch(error){
       if(generation!==token)return;
       p.state.library=[];p.state.libraryRole=null;p.state.libraryGuild=gid;hasMore=false;
       libraryError=error.message||"Bibliothèque non disponible";
       if($("#cmdEmojiCreatorNotice"))$("#cmdEmojiCreatorNotice").textContent=libraryError;
     }finally{
       if(generation===token){p.draw();pending=null}
     }
   })();
   await pending;
   if(generation===token&&hasMore)void fetchAllPages(token,gid);
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
     if(file.size>10*1024*1024)throw Error("Fichier de plus de 10 Mo.");
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
 async function importPhotoPack(){
   const file=$("#cmdEmojiBulkFile")?.files?.[0],button=$("#cmdEmojiBulkImport"),status=$("#cmdEmojiBulkStatus");
   if(!file){status.textContent="Sélectionne le fichier .json fourni dans ChatGPT.";return}
   if(file.size>45*1024*1024){status.textContent="Fichier trop volumineux.";return}
   button.disabled=true;let paused=false;
   const stop=$("#cmdEmojiBulkStop");
   if(stop){stop.hidden=false;stop.onclick=()=>{paused=true;status.textContent="Arrêt après le lot en cours…"}}
   try{
    status.textContent="Lecture du pack…";
    const pack=JSON.parse(await file.text());
    if(pack.format!=="cmd-emoji-pack-v1"||!Array.isArray(pack.items))throw Error("Pack JSON non reconnu.");
    const items=pack.items.filter(x=>x&&typeof x.name==="string"&&typeof x.dataUrl==="string");
    if(!items.length)throw Error("Pack vide.");
    const key="cmd-emoji-import-"+file.name+"-"+items.length;
    let index=Number(localStorage.getItem(key)||0);
    if(!Number.isSafeInteger(index)||index<0||index>=items.length)index=0;
    let created=0,skipped=0;
    while(index<items.length&&!paused){
     const batch=items.slice(index,index+40);
     let lastError=null,success=null;
     for(let attempt=0;attempt<3&&!success;attempt++){
      try{
       const res=await fetch("/api/cmd-emojis/bulk",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({items:batch})});
       const data=await res.json().catch(()=>({}));
       if(!res.ok)throw Error(data.error||"Serveur indisponible ("+res.status+")");
       success=data;
      }catch(error){lastError=error;if(attempt<2)await new Promise(r=>setTimeout(r,1000*(attempt+1)))}
     }
     if(!success)throw lastError||Error("Import impossible");
     created+=Number(success.created||0);skipped+=Number(success.skipped||0);
     index+=batch.length;localStorage.setItem(key,String(index));
     status.textContent=index+" / "+items.length+" emojis traités · "+created+" nouveaux · "+skipped+" déjà présents";
     if(index%400===0)await new Promise(r=>setTimeout(r,100));
    }
    if(!paused){
     localStorage.removeItem(key);status.textContent="Terminé : "+items.length+" emojis vérifiés, "+created+" ajoutés, "+skipped+" déjà présents. Visibles par toute la communauté.";
     void getLibrary(true);
    }else status.textContent="Import interrompu à "+index+"/"+items.length+". Reprends plus tard avec le même fichier.";
   }catch(error){status.textContent="Import non terminé : "+(error.message||"erreur");console.warn("[CMD emoji bulk]",error)}
   finally{button.disabled=false;if(stop)stop.hidden=true}
  }
 function makeBulkName(filename,used){
   let base=String(filename||"").replace(/\.[^.]+$/,"").normalize("NFKC").replace(/[^\p{L}\p{N}_-]+/gu,"_").replace(/^_+|_+$/g,"").slice(0,28);
   if(base.length<2)base="emoji";
   let name=base,n=2;while(used.has(name)){const tail="_"+n++;name=base.slice(0,32-tail.length)+tail;}
   used.add(name);return name;
 }
 async function importFilesAsEmojis(){
   const input=$("#cmdEmojiBulkFiles"),notice=$("#cmdEmojiBulkFilesStatus"),button=$("#cmdEmojiBulkButton");
   const files=Array.from(input?.files||[]);
   if(!files.length){notice.textContent="Sélectionne des fichiers individuels.";return}
   const allowed=files.filter(f=>/^image\/(gif|png|jpeg|webp)$/.test(f.type)&&f.size>0&&f.size<=10*1024*1024);
   if(!allowed.length){notice.textContent="Aucun fichier accepté : PNG/JPG/GIF/WebP, 10 Mo par fichier.";return}
   button.disabled=true;let completed=0,skipped=files.length-allowed.length,failed=0;
   const names=new Set(),batch=[];let batchSize=0;
   async function sendBatch(){
     if(!batch.length)return;
     const payload=batch.splice(0,batch.length);
     batchSize=0;
     const r=await fetch("/api/cmd-emojis/bulk",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({items:payload})});
     const output=await r.json().catch(()=>({}));
     if(!r.ok)throw Error(output.error||"Impossible d'enregistrer le lot.");
     completed+=Number(output.created||0);skipped+=Number(output.skipped||0);
     notice.textContent=completed+" emojis importés · "+skipped+" ignorés";
   }
   try{
     notice.textContent="Lecture de "+allowed.length+" fichiers…";
     for(let i=0;i<allowed.length;i++){
       try{
         const file=allowed[i],dataUrl=await imageData(file,"");
         if(batch.length>=10||(batch.length&&batchSize+dataUrl.length>16*1024*1024))await sendBatch();
         batch.push({name:makeBulkName(file.name,names),dataUrl,kind:String($("#cmdEmojiBulkKind")?.value||"emoji")});batchSize+=dataUrl.length;
         notice.textContent="Préparation "+(i+1)+"/"+allowed.length+" · "+completed+" enregistrés";
       }catch(e){failed++;console.warn("[CMD emoji file]",allowed[i]?.name,e)}
     }
     await sendBatch();
     notice.textContent="Terminé : "+completed+" emojis individuels enregistrés · "+skipped+" déjà existants ou invalides · "+failed+" erreurs.";
     input.value="";
     await getLibrary(true);drawMine();
     const p=bridge();if(p){p.state.selected="community";p.draw()}
   }catch(e){notice.textContent="Import arrêté : "+(e.message||"erreur")+". "+completed+" emojis enregistrés."}
   finally{button.disabled=false}
 }
 async function openCreator(){
   const sheet=$("#channelEmojiSheet");if(!sheet)return;
   if(panel){panel.remove();panel=null;return}
   await getLibrary();
   panel=document.createElement("div");panel.id="cmdEmojiCreator";panel.className="cmd-emoji-creator";
   const role=bridge()?.state.libraryRole,canServer=["owner","admin"].includes(role)&&Boolean(bridge()?.state.libraryGuild);
   const defaultKind=["emoji","gif","sticker"].includes(bridge()?.state.tab)?bridge().state.tab:"emoji";
   panel.innerHTML='<form id="cmdEmojiCreatorForm">'+
     '<div class="cmd-emoji-creator-head"><strong>Créer un emoji, GIF ou autocollant</strong><button type="button" id="cmdEmojiClose" aria-label="Fermer">✕</button></div>'+
     '<label>Nom de la création<input name="name" type="text" required minlength="2" maxlength="32" placeholder="ex. mon_dino"></label>'+ 
     '<label>Type<select name="kind" id="cmdEmojiKind"><option value="emoji">Emoji</option><option value="gif">GIF animé</option><option value="sticker">Autocollant (fixe ou animé)</option></select></label>'+
     '<label>Image / GIF animé<input id="cmdEmojiFile" type="file" accept="image/png,image/jpeg,image/gif,image/webp"></label>'+
     '<label>Ou créer un emoji avec un symbole<input id="cmdEmojiSymbol" maxlength="8" type="text" placeholder="🦖"></label>'+
     '<label>Qui pourra l’utiliser ?<select name="scope"><option value="personal">Moi (bibliothèque personnelle)</option><option value="community">Tout CMD Sphere (partagé)</option>'+
     (canServer?'<option value="server">Membres de ce serveur</option>':'')+'</select></label>'+
     '<small>Fichiers PNG, JPG, WebP ou GIF animé, jusqu’à 10 Mo chacun. Les GIF doivent être réellement animés.</small>'+
     '<button type="submit" id="cmdEmojiSave">Enregistrer</button><p id="cmdEmojiCreatorNotice" role="status"></p></form>'+
     (bridge()?.state.libraryFounder?'<section class="cmd-emoji-bulk" style="padding:12px;border:1px solid #ffffff26;border-radius:12px;margin:12px 0;display:grid;gap:9px"><strong>Importer les emojis des captures</strong><span>Réservé au fondateur · partager avec tous</span><label>Fichier CMD au format .json<input type="file" id="cmdEmojiBulkFile" accept=".json,application/json"></label><button type="button" id="cmdEmojiBulkImport">Importer tout le pack</button><button type="button" id="cmdEmojiBulkStop" hidden>Arrêter</button><p id="cmdEmojiBulkStatus" role="status" aria-live="polite"></p></section>':'')+
     '<section class="cmd-emoji-manage"><strong>Mes emojis, GIF et autocollants</strong><div id="cmdEmojiOwned"></div></section>'+
     (bridge()?.state.libraryFounder?'<section class="cmd-emoji-manage"><strong>Importation multiple du fondateur</strong><p>Chaque fichier devient un emoji, GIF ou autocollant indépendant, avec son animation d’origine.</p><label>Type des fichiers<select id="cmdEmojiBulkKind"><option value="emoji">Emojis</option><option value="gif">GIF animés</option><option value="sticker">Autocollants</option></select></label><label>Fichiers<input id="cmdEmojiBulkFiles" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple></label><button type="button" id="cmdEmojiBulkButton" class="cmd-emoji-import-bulk">Importer tous les emojis sélectionnés</button><p id="cmdEmojiBulkFilesStatus" role="status"></p></section>':'');
   sheet.append(panel);
   $("#cmdEmojiKind").value=defaultKind;
   $("#cmdEmojiClose").onclick=()=>{panel.remove();panel=null};
   if($("#cmdEmojiBulkButton"))$("#cmdEmojiBulkButton").onclick=importFilesAsEmojis;
   drawMine();
   if($("#cmdEmojiBulkImport"))$("#cmdEmojiBulkImport").onclick=importPhotoPack;
   $("#cmdEmojiCreatorForm").onsubmit=async event=>{
     event.preventDefault();const form=event.currentTarget,notice=$("#cmdEmojiCreatorNotice"),btn=$("#cmdEmojiSave");
     btn.disabled=true;notice.textContent="Enregistrement…";
     try{
       const name=label(form.elements.name.value);
       if(!/^[\p{L}\p{N}_-]{2,32}$/u.test(name))throw Error("Nom de 2 à 32 caractères, lettres/chiffres, tiret ou _.");
       const dataUrl=await imageData($("#cmdEmojiFile").files[0],$("#cmdEmojiSymbol").value);
       const scope=String(form.elements.scope.value),kind=String(form.elements.kind.value);
       const r=await fetch("/api/cmd-emojis",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({name,scope,kind,guildId:activeGuild()||null,dataUrl})});
       const output=await r.json();if(!r.ok)throw Error(output.error||"Erreur d'import");
       notice.textContent=(kind==="gif"?"GIF":kind==="sticker"?"Autocollant":"Emoji")+" ajouté avec succès.";
       form.reset();const p=bridge();p.state.tab=kind;p.state.selected=scope==="personal"?"mine":scope;
       await getLibrary(true);drawMine();
     }catch(e){notice.textContent=e.message||"Erreur"}
     finally{btn.disabled=false}
   };
 }
 window.cmdEmojiOpenCreator=openCreator;
})();
