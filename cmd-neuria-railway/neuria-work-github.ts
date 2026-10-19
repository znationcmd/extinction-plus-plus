/**
 * CMD NEURIA Work: inspect real GitHub repositories without executing or changing code.
 * Public data can be read anonymously. Private data uses ONLY the current user's
 * GitHub OAuth cookie; it never uses a cross-user server token.
 */
const API="https://api.github.com";
const REPO=/^[A-Za-z0-9_.-]{1,80}\/[A-Za-z0-9_.-]{1,100}$/;
const REF=/^[A-Za-z0-9_./-]{1,120}$/;
const FORBIDDEN=/(^|\/)(\.env(?:\.|$)|\.git\/|node_modules\/|dist\/|build\/|coverage\/|vendor\/|secrets?\/|credentials?\/)|\.(?:pem|p12|pfx|key|lock|sqlite|db|wasm|png|jpe?g|gif|webp|zip|gz|tar|pdf|woff2?|svg)$/i;
const MAX_TREE_BYTES=1400000;
type GitHubSource={title:string;url:string;excerpt:string;sourceType:string};
type InspectorResult={repository:string;branch:string;private:boolean;filesIndexed:number;truncated:boolean;sources:GitHubSource[];verified:boolean;readonly:true;checkedAt:string};

async function ghGet(url:string, token:string, getter:typeof fetch){
 const headers:Record<string,string>={accept:"application/vnd.github+json","user-agent":"CMD-NEURIA-Work","x-github-api-version":"2022-11-28"};
 if(token)headers.authorization="Bearer "+token;
 const response=await getter(url,{headers,signal:AbortSignal.timeout(11000)});
 if(!response.ok)throw new Error(response.status===401?"GitHub authorization expired":response.status===403?"GitHub access refused or rate limited":response.status===404?"Repository or file not accessible":"GitHub HTTP "+response.status);
 const len=Number(response.headers.get("content-length")||0);
 if(len>MAX_TREE_BYTES)throw new Error("GitHub result too large");
 const data=await response.text();
 if(data.length>MAX_TREE_BYTES)throw new Error("GitHub result too large");
 try{return JSON.parse(data)}catch{throw new Error("Invalid GitHub response")}
}
export function validWorkRepo(repo:unknown,branch:unknown){
 if(typeof repo!=="string"||!REPO.test(repo)||repo.includes(".."))throw new Error("Dépôt attendu au format propriétaire/nom");
 if(branch!==undefined&&branch!==""&&(typeof branch!=="string"||!REF.test(branch)||branch.includes("..")||branch.startsWith("/")))throw new Error("Branche GitHub invalide");
 return {repo,branch:typeof branch==="string"?branch:""};
}
export async function inspectWorkRepository(repository:unknown,branchInput:unknown,token="",getter:typeof fetch=fetch):Promise<InspectorResult>{
 const {repo,branch}=validWorkRepo(repository,branchInput);
 const meta=await ghGet(API+"/repos/"+repo,token,getter);
 if(meta.private&&!token)throw new Error("Ce dépôt privé nécessite la connexion GitHub personnelle.");
 if(meta.archived&&meta.disabled)throw new Error("Dépôt indisponible");
 const actual=branch||String(meta.default_branch||"main");
 if(!REF.test(actual)||actual.includes(".."))throw new Error("Branche par défaut GitHub invalide");
 const ref=encodeURIComponent(actual);
 const tree=await ghGet(API+"/repos/"+repo+"/git/trees/"+ref+"?recursive=1",token,getter);
 if(!Array.isArray(tree.tree))throw new Error("Arborescence GitHub inaccessible");
 const sourceList:GitHubSource[]=[];
 const link=(path:string)=>"https://github.com/"+repo+"/blob/"+actual.split("/").map(encodeURIComponent).join("/")+"/"+path.split("/").map(encodeURIComponent).join("/");
 const metaExcerpt=["Description : "+String(meta.description||"non renseignée").slice(0,260),
 "Branche : "+actual,"Privé : "+Boolean(meta.private),"Archivé : "+Boolean(meta.archived),
 "Dernière mise à jour : "+String(meta.updated_at||"indéterminée")].join("\n");
 sourceList.push({title:"Dépôt "+repo,url:"https://github.com/"+repo,excerpt:metaExcerpt,sourceType:"metadata"});
 const files=tree.tree.filter((f:any)=>f.type==="blob"&&typeof f.path==="string"&&f.path.length<=250&&!FORBIDDEN.test(f.path));
 const selectedNames=files.slice(0,300).map((f:any)=>String(f.path));
 sourceList.push({title:"Arborescence "+repo,url:"https://github.com/"+repo+"/tree/"+encodeURIComponent(actual),excerpt:selectedNames.join("\n").slice(0,7500),sourceType:"tree"});
 const preferred=/^(?:README(?:\.[^/]+)?|package\.json|pyproject\.toml|requirements\.txt|railway\.json|railway\.toml|src\/index\.(?:js|ts)|src\/app\.(?:js|ts)|app\/page\.tsx|Dockerfile)$/i;
 const candidates=files.filter((f:any)=>preferred.test(f.path)&&(!f.size||f.size<16000)).slice(0,4);
 for(const f of candidates){
  try{
   const payload=await ghGet(API+"/repos/"+repo+"/contents/"+f.path.split("/").map(encodeURIComponent).join("/")+"?ref="+ref,token,getter);
   if(payload.encoding!=="base64"||typeof payload.content!=="string"||Number(payload.size)>16000)continue;
   const code=Buffer.from(payload.content.replace(/\s/g,""),"base64").toString("utf8");
   if(!code||code.includes("\u0000"))continue;
   sourceList.push({title:f.path,url:link(f.path),excerpt:code.slice(0,2300),sourceType:"file"});
  }catch{ /* Missing optional file does not invalidate the repo tree. */ }
 }
 return {repository:repo,branch:actual,private:!!meta.private,filesIndexed:files.length,
  truncated:!!tree.truncated||files.length>300,sources:sourceList,verified:true,readonly:true,checkedAt:new Date().toISOString()};
}
