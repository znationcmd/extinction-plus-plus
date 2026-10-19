/** CMD NEURIA Work Studio: request -> generated project files -> inspect -> ZIP download. */
export const NEURIA_PROJECT_CREATOR_UI=String.raw`(()=>{
 if(window.__neuriaCreatorInstalled)return;
 window.__neuriaCreatorInstalled=true;
 const mode=document.getElementById("neuriaWorkMode"),panel=document.getElementById("neuriaWorkInfo");
 if(!mode||!panel)return;
 function render(){
   if(panel.querySelector("#cmdNeuriaProjectStudio"))return;
   const root=document.createElement("section");root.id="cmdNeuriaProjectStudio";
   root.style.cssText="margin:14px 0;padding:17px;background:#20152f;border:1px solid #a67dd8;border-radius:18px;box-shadow:inset 0 1px #ffffff25,0 10px 25px #0006;color:#f9efff";
   const title=document.createElement("h3");title.textContent="✨ CMD NEURIA — Créer un projet";
   const desc=document.createElement("p");desc.textContent="Décris ton idée. NEURIA génère des fichiers de code, que tu peux examiner et télécharger. Aucun déploiement automatique.";
   desc.style.cssText="font-size:13px;color:#ddc4f3";
   const kind=document.createElement("select");kind.setAttribute("aria-label","Type de projet");
   const categories=[["auto","Choix automatique"],["website","Site Internet"],["bot","Bot Discord"],["browser","Navigateur"],["hosting","Hébergeur de jeux (prototype)"],["game","Jeu vidéo 2D (prototype)"],["app","Application"],["custom","Autre projet"]];
   for(const [v,label] of categories){const opt=document.createElement("option");opt.value=v;opt.textContent=label;kind.append(opt)}
   const name=document.createElement("input");name.placeholder="Nom du projet (facultatif)";name.setAttribute("aria-label","Nom du projet");
   const spec=document.createElement("textarea");spec.rows=4;spec.placeholder="Exemple : crée un bot Discord pour mon serveur ARK avec /ping, commandes de bienvenue et tableau de bord...";spec.setAttribute("aria-label","Description du projet");
   const button=document.createElement("button");button.type="button";button.textContent="✨ Créer le projet";
   const status=document.createElement("p");status.setAttribute("role","status");status.style.color="#e9d7ff";
   const results=document.createElement("section");results.hidden=true;results.style.marginTop="12px";
   const stats=document.createElement("p");
   const fileList=document.createElement("select");fileList.setAttribute("aria-label","Fichier à consulter");
   const code=document.createElement("textarea");code.rows=12;code.setAttribute("aria-label","Contenu du fichier généré");
   const download=document.createElement("button");download.type="button";download.textContent="⬇ Télécharger le projet ZIP";
   const reuse=document.createElement("button");reuse.type="button";reuse.textContent="✏️ Décrire une amélioration";
   const warning=document.createElement("p");warning.style.cssText="font-size:12px;color:#e8c4ff";
   const label=(s,el)=>{const l=document.createElement("label");l.textContent=s;l.style.cssText="display:block;font-size:13px;margin-top:10px";l.append(el);return l};
   for(const el of [kind,name,spec,fileList,code])el.style.cssText="display:block;box-sizing:border-box;width:100%;padding:10px;margin-top:5px;background:#100a1e;color:#faf1ff;border:1px solid #9d72cd;border-radius:10px";
   for(const el of [button,download,reuse])el.style.cssText="margin:9px 8px 0 0;padding:11px 15px;border-radius:10px;background:#7042a8;color:white;border:1px solid #b88bff;cursor:pointer;box-shadow:inset 0 1px #ffffff60,0 3px #29163f";
   code.style.fontFamily="ui-monospace,monospace";code.spellcheck=false;
   let project=null,lastIndex=0;
   function flushEditor(){
    if(project&&project.files[lastIndex])project.files[lastIndex].content=code.value;
   }
   fileList.onchange=()=>{flushEditor();lastIndex=Number(fileList.value);code.value=project.files[lastIndex]?.content||""};
   const showProject=p=>{
    project=p;lastIndex=0;fileList.replaceChildren();
    for(let i=0;i<p.files.length;i++){const opt=document.createElement("option");opt.value=String(i);opt.textContent=p.files[i].path;fileList.append(opt)}
    code.value=p.files[0]?.content||"";
    const state=p.starter?"Base fonctionnelle à personnaliser":"Fichiers proposés par le modèle "+p.engine+" (non exécutés)";
    stats.textContent=p.name+" · "+p.kind+" · "+p.files.length+" fichiers · "+state;
    warning.textContent=(p.warnings||[]).join(" ");
    results.hidden=false;
   };
   button.onclick=async()=>{
    const request={description:spec.value.trim(),kind:kind.value,name:name.value.trim(),useAI:true};
    if(request.description.length<12){status.textContent="Décris ton projet en au moins 12 caractères.";return}
    button.disabled=true;status.textContent="CMD NEURIA prépare ton code et tes fichiers… (jusqu'à une minute)";
    results.hidden=true;
    try{
     const response=await fetch("/api/work/projects/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(request)});
     const data=await response.json();if(!response.ok)throw Error(data.error||"Erreur de création");
     showProject(data);status.textContent="Projet créé. Tu peux examiner et modifier les fichiers avant de télécharger le ZIP.";
     results.dataset.neuriaResponse=JSON.stringify({reply:"Création du projet "+data.name+" : "+data.files.length+" fichiers. Aucun déploiement réalisé.",projectKind:data.kind,files:data.files.map(x=>x.path)});
     document.dispatchEvent(new Event("neuria:response"));
    }catch(e){status.textContent="Création impossible : "+e.message}
    finally{button.disabled=false}
   };
   download.onclick=async()=>{
    if(!project)return;flushEditor();download.disabled=true;status.textContent="Préparation de l'archive ZIP…";
    try{
     const r=await fetch("/api/work/projects/download",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:project.name,files:project.files})});
     if(!r.ok){const d=await r.json();throw Error(d.error||"ZIP indisponible")}
     const url=URL.createObjectURL(await r.blob());
     const link=document.createElement("a");link.href=url;link.download=project.name.replace(/[^a-zA-Z0-9_-]/g,"-")+".zip";
     document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
     status.textContent="Archive générée, téléchargement lancé.";
    }catch(e){status.textContent="Téléchargement impossible : "+e.message}
    finally{download.disabled=false}
   };
   reuse.textContent="🛠 Améliorer ce projet";
   reuse.onclick=async()=>{
     if(!project){status.textContent="Crée d'abord un projet.";return}
     flushEditor();
     const improvement=spec.value.trim();
     if(improvement.length<12){status.textContent="Décris précisément les améliorations à apporter.";spec.focus();return}
     reuse.disabled=true;button.disabled=true;
     status.textContent="CMD NEURIA examine les fichiers existants et prépare les changements…";
     try{
       const response=await fetch("/api/work/projects/improve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:project.name,kind:project.kind,description:improvement,files:project.files})});
       const data=await response.json();
       if(!response.ok)throw Error(data.error||"Modification impossible");
       showProject(data);
       status.textContent=(data.summary||"Version modifiée.")+" · "+(data.changes?.length||0)+" fichier(s) modifié(s). Les autres fichiers ont été conservés.";
       spec.value="";
     }catch(e){status.textContent="Projet conservé sans modification : "+e.message}
     finally{reuse.disabled=false;button.disabled=false}
   };
   results.append(stats,label("Fichiers du projet",fileList),label("Contenu modifiable avant téléchargement",code),download,reuse,warning);
   root.append(title,desc,label("Type de projet",kind),label("Nom",name),label("Que doit créer NEURIA ?",spec),button,status,results);
   panel.append(root);
 }
 mode.addEventListener("click",()=>setTimeout(render,0));
 const plus=document.getElementById("neuriaPlusMenu");
 if(plus&&!plus.querySelector("[data-neuria-create-project]")){
   const b=document.createElement("button");b.type="button";b.dataset.neuriaCreateProject="true";
   b.textContent="✨ Créer un projet";b.title="Bots, sites, navigateurs, hébergement et jeux";
   b.onclick=()=>{mode.click();setTimeout(()=>{render();panel.querySelector("#cmdNeuriaProjectStudio")?.scrollIntoView({behavior:"smooth",block:"start"})},20)};
   plus.append(b);
 }
})();`;
