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
