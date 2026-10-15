/** Read-only GitHub folder inventory; never fetch file bodies or write to repositories. */
export async function inventoryGitHubFolder(input: { owner: string; repo: string; ref: string; folder?: string }, token: string, fetcher: typeof fetch = fetch) {
  const {owner,repo,ref} = input, folder = (input.folder ?? "").replace(/^\/+|\/+$/g,"");
  if (![owner,repo].every(v=>/^[a-zA-Z0-9_.-]{1,100}$/.test(v)) || !ref || ref.length>150 || !/^[a-zA-Z0-9_.\/-]{1,150}$/.test(ref) || ref.includes("..") || folder.includes("..") || (folder && !/^[a-zA-Z0-9_.\/-]{1,250}$/.test(folder)) || !token) throw new Error("Paramètres invalides");
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const response = await fetcher(url,{headers:{authorization:`Bearer ${token}`,accept:"application/vnd.github+json","user-agent":"CMD-Neuria"},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`GitHub HTTP ${response.status}`);
  const data = await response.json();
  if(!Array.isArray(data?.tree))throw new Error("Arborescence invalide");
  const prefix=folder?folder+"/":"";
  const entries=data.tree.filter((item:any)=>typeof item.path==="string"&&item.path.startsWith(prefix)&&["blob","tree"].includes(item.type))
    .slice(0,2000).map((item:any)=>({path:item.path,type:item.type,size:item.type==="blob"?item.size??null:null,sha:item.sha}));
  return {repository:`${owner}/${repo}`,ref,folder,entries,returned:entries.length,treeTruncated:!!data.truncated,resultsTruncated:entries.length===2000,readOnly:true};
}

/** Analyze small UTF-8 files in a selected folder without writing to GitHub. */
export async function inspectGitHubFolderFiles(
 input: {owner:string;repo:string;ref:string;folder?:string;maxFiles?:number},
 token:string, fetcher:typeof fetch=fetch
) {
 const inventory=await inventoryGitHubFolder(input,token,fetcher);
 const maxFiles=input.maxFiles??20;
 if(!Number.isInteger(maxFiles)||maxFiles<1||maxFiles>30)throw new Error("Nombre de fichiers invalide");
 const files=inventory.entries.filter(e=>e.type==="blob"&&typeof e.size==="number"&&e.size<=25000&&/\.(md|txt|json|yaml|yml|ini|cfg|ts|js|py|css|html)$/i.test(e.path)).slice(0,maxFiles);
 const results=[];
 for(const file of files) {
  const url=`https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/blobs/${encodeURIComponent(file.sha)}`;
  const response=await fetcher(url,{headers:{authorization:`Bearer ${token}`,accept:"application/vnd.github+json","user-agent":"CMD-Neuria"},signal:AbortSignal.timeout(12000)});
  if(!response.ok){results.push({path:file.path,error:"Lecture impossible"});continue}
  const blob=await response.json();
  if(blob.encoding!=="base64"||typeof blob.content!=="string"||blob.content.length>40000){results.push({path:file.path,error:"Format non pris en charge"});continue}
  const content=Buffer.from(blob.content.replace(/\s/g,""),"base64").toString("utf8");
  const lines=content.split(/\r?\n/);
  results.push({path:file.path,bytes:Buffer.byteLength(content),lines:lines.length,preview:content.slice(0,500)});
 }
 return {repository:inventory.repository,folder:inventory.folder,inspected:results.length,files:results,readOnly:true,treeTruncated:inventory.treeTruncated};
}
