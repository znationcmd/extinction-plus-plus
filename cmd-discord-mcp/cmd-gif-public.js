/* CMD Sphere: optional, keyless animated GIF discovery from Wikimedia Commons.
   Each result links to its Wikimedia file page for attribution/licensing. */
const cache=new Map();
function json(res,status,data){
 res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"private, max-age=60","x-content-type-options":"nosniff"});
 res.end(JSON.stringify(data));
}
export async function handleCmdGifSearch(req,res,url,{auth}={}){
 if(req.method!=="GET"||url.pathname!=="/api/cmd-gifs/search")return false;
 if(!auth?.user?.id){json(res,401,{error:"Connexion CMD Sphere requise."});return true}
 const q=String(url.searchParams.get("q")||"").trim().slice(0,64);
 if(q.length<2){json(res,200,{items:[],source:"Wikimedia Commons"});return true}
 const key=q.toLocaleLowerCase("fr");
 const saved=cache.get(key);
 if(saved&&Date.now()-saved.time<120000){json(res,200,saved.data);return true}
 try{
  const params=new URLSearchParams({
   action:"query",format:"json",formatversion:"2",generator:"search",
   gsrsearch:q+" gif",gsrnamespace:"6",gsrlimit:"100",
   prop:"imageinfo",iiprop:"url|mime|size"
  });
  const response=await fetch("https://commons.wikimedia.org/w/api.php?"+params.toString(),{
   headers:{"User-Agent":"CMDSphere-GifSearch/1.0 (community GIF selector; Wikimedia Commons attribution links)"},
   signal:AbortSignal.timeout(7500)
  });
  if(!response.ok)throw new Error("Wikimedia indisponible ("+response.status+")");
  const payload=await response.json();
  const items=[];
  for(const page of payload?.query?.pages||[]){
   const info=page?.imageinfo?.[0];
   if(info?.mime!=="image/gif"||!info?.url||!/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//.test(info.url))continue;
   if(Number(info.size||0)>10*1024*1024||Number(info.size||0)<=0)continue;
   const name=String(page.title||"GIF").replace(/^File:/i,"").replace(/\.gif$/i,"").replace(/_/g," ").slice(0,100);
   items.push({name,url:info.url,sourceUrl:String(info.descriptionurl||"https://commons.wikimedia.org/wiki/"+encodeURIComponent(page.title||""))});
   if(items.length>=30)break;
  }
  const data={items,source:"Wikimedia Commons",external:true};
  cache.set(key,{time:Date.now(),data});
  if(cache.size>70)cache.delete(cache.keys().next().value);
  json(res,200,data);
 }catch(error){
  console.warn("[CMD public GIF search]",error?.message||error);
  json(res,200,{items:[],source:"Wikimedia Commons",temporarilyUnavailable:true});
 }
 return true;
}
