/** Work — GitHub project research UI, only renders on deliberate Work action. */
export const NEURIA_WORK_GITHUB_UI=String.raw`(()=>{
  const work=document.getElementById("neuriaWorkMode");
  if(!work||window.__neuriaGithubWorkUI)return;
  window.__neuriaGithubWorkUI=true;
  work.addEventListener("click",()=>{
    setTimeout(()=>{
      const panel=document.getElementById("neuriaWorkInfo");
      if(!panel||panel.querySelector("#neuriaProjectInspector"))return;
      const box=document.createElement("section");
      box.id="neuriaProjectInspector";
      box.style.cssText="margin:16px 0;padding:15px;border:1px solid #a782da;border-radius:16px;background:#241732;color:#fff";
      const title=document.createElement("h3");
      title.textContent="GitHub — analyser un véritable projet";
      const info=document.createElement("p");
      info.textContent="Lecture réelle du dépôt, de l'arborescence et de certains fichiers. Aucun fichier ni serveur ne sera modifié.";
      info.style.cssText="font-size:13px;color:#ddc8f2";
      const repo=document.createElement("input");
      repo.placeholder="Propriétaire/dépôt, ex. znationcmd/BOT-ARK";
      repo.setAttribute("aria-label","Dépôt GitHub");
      repo.style.cssText="width:100%;padding:12px;margin:6px 0;background:#100a1b;color:white;border:1px solid #8d69bb;border-radius:10px;box-sizing:border-box";
      const branch=document.createElement("input");
      branch.placeholder="Branche (facultatif, défaut du dépôt)";
      branch.setAttribute("aria-label","Branche GitHub");
      branch.style.cssText=repo.style.cssText;
      const row=document.createElement("div");
      row.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:center";
      const inspect=document.createElement("button");
      inspect.type="button";inspect.textContent="Analyser avec CMD NEURIA";
      const connect=document.createElement("a");
      connect.href="/api/oauth/github/start";
      connect.textContent="Connecter GitHub (dépôts privés)";
      connect.style.cssText="color:#d8b6ff";
      const result=document.createElement("pre");
      result.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;max-height:45vh;overflow:auto;font:13px/1.5 system-ui;margin:10px 0";
      inspect.onclick=async()=>{
        const goal=panel.querySelector("textarea")?.value?.trim()||"Examiner le dépôt et donner des recommandations avec références exactes.";
        if(!/^[A-Za-z0-9_.-]{1,80}\/[A-Za-z0-9_.-]{1,100}$/.test(repo.value.trim())){result.textContent="Saisis un dépôt au format propriétaire/nom.";return}
        inspect.disabled=true;result.textContent="Lecture GitHub et analyse de code en cours…";
        try{
          const response=await fetch("/api/work/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({goal,repository:repo.value.trim(),branch:branch.value.trim(),webSearch:"off"})});
          const data=await response.json();
          if(!response.ok)throw Error(data.error||"GitHub indisponible");
          const r=data.githubInspection;
          const sources=(data.sources||[]).filter(x=>x.sourceType==="file"||x.sourceType==="metadata");
          result.textContent="Dépôt : "+r?.repository+"\nBranche : "+r?.branch+"\nFichiers indexés : "+r?.filesIndexed+"\nLecture seule : oui\n\n"+
             (data.summary||"Réponse indisponible")+"\n\nSources GitHub :\n"+sources.map(x=>"- "+x.title+": "+x.url).join("\n");
          result.dataset.neuriaResponse=JSON.stringify({...data,work:true});
          document.dispatchEvent(new Event("neuria:response"));
        }catch(e){result.textContent="Analyse impossible : "+e.message}
        finally{inspect.disabled=false}
      };
      row.append(inspect,connect);box.append(title,info,repo,branch,row,result);
      panel.appendChild(box);
    },0);
  });
})();`;
