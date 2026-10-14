/* CMD Sphere Studio Pub — real recorded music from free-licensed Wikimedia Commons audio.
   This is NOT TikTok's or any streaming service's commercial catalog. */
import crypto from "node:crypto";
const results=new Map(),searchCache=new Map(),fileCache=new Map();
function sendAudio(res,req,track,bytes){
 const total=bytes.length,raw=String(req.headers?.range||"");
 const range=/^bytes=(\d*)-(\d*)$/.exec(raw);
 const type=track.mime==="application/ogg"?"audio/ogg":track.mime;
 if(raw&&(!range||(range[1]===""&&range[2]===""))){res.writeHead(416,{"content-range":"bytes */"+total});res.end();return}
 if(range){
  let start=Number(range[1]||0),end=range[2]?Number(range[2]):Math.min(total-1,start+1024*1024-1);
  if(range[1]===""){const suffix=Number(range[2]);start=Math.max(0,total-suffix);end=total-1}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=total||end<start){res.writeHead(416,{"content-range":"bytes */"+total});res.end();return}
  end=Math.min(end,total-1);
  res.writeHead(206,{"content-type":type,"content-length":end-start+1,"content-range":"bytes "+start+"-"+end+"/"+total,"accept-ranges":"bytes","cache-control":"private, max-age=600","x-content-type-options":"nosniff"});
  res.end(bytes.subarray(start,end+1));return;
 }
 res.writeHead(200,{"content-type":type,"content-length":total,"accept-ranges":"bytes","cache-control":"private, max-age=600","x-content-type-options":"nosniff"});
 res.end(bytes);
}
const LIMIT=18*1024*1024;
const ALLOWED_MIME=new Set(["audio/mpeg","audio/ogg","application/ogg","audio/wav","audio/x-wav","audio/webm","audio/flac"]);
const REQUEST_TIMEOUT=14000;

function safeSong(url){
 try{const u=new URL(String(url||""));const h={
  "upload.wikimedia.org":/^\/wikipedia\/commons\//,
  "cdn.freesound.org":/^\/previews\//,
  "freesound.org":/^\/data\/previews\//,
  "ccmixter.org":/^\/(?:content|files)\//,
  "www.ccmixter.org":/^\/(?:content|files)\//};
  return u.protocol==="https:"&&!u.port&&!u.username&&!u.password&&!/%2f|%5c|%00|\.\./i.test(u.pathname)&&!!h[u.hostname]?.test(u.pathname);
 }catch{return false}
}
function usableLicense(str){
 const val=String(str||"").toLowerCase();
 if(["cc0","pdm","public domain"].includes(val)||/^https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/?$/.test(val))return {name:"CC0",url:"https://creativecommons.org/publicdomain/zero/1.0/"};
 if(val==="by"||/^https:\/\/creativecommons\.org\/licenses\/by\/(?:2\.0|2\.5|3\.0|4\.0)\/?$/.test(val))return {name:"CC BY",url:val.startsWith("https:")?val:"https://creativecommons.org/licenses/by/4.0/"};
 return null;
}
async function freeSearch(source,q){
 if(source==="openverse"){
  const params=new URLSearchParams({q,license:"by,cc0",license_type:"commercial,modification",page_size:"20",mature:"false"});
  const r=await fetch("https://api.openverse.org/v1/audio/?"+params,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(10000),redirect:"error"});
  if(!r.ok)throw Error("Openverse "+r.status);
  const data=await r.json();
  return (data.results||[]).flatMap(x=>{
   const lic=usableLicense(x.license),landing=String(x.foreign_landing_url||"");
   if(!lic||!safeSong(x.url)||x.mature||!(x.filetype==="mp3"||/\.mp3(?:$|\?)/i.test(x.url))||!/^https:\/\/[^/\s?#]+\//.test(landing))return [];
   return [{title:htmlText(x.title||"Musique"),artist:htmlText(x.creator||"Artiste"),license:lic.name,licenseUrl:lic.url,
    sourceUrl:landing,remoteUrl:x.url,mime:"audio/mpeg",size:Number(x.filesize)||0}];
  }).slice(0,20);
 }
 if(source==="ccmixter"){
  const params=new URLSearchParams({f:"json",tags:q.replace(/[^a-z0-9_\s-]/gi,"").replace(/\s+/g,"+"),limit:"20"});
  const r=await fetch("https://ccmixter.org/api/query?"+params,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(10000),redirect:"error"});
  if(!r.ok)throw Error("ccMixter "+r.status);
  const data=await r.json(),list=Array.isArray(data)?data:Array.isArray(data?.results)?data.results:[];
  return list.flatMap(x=>{
   const lic=usableLicense(x.license_url||x.license?.url),landing=String(x.upload_page_url||x.file_page_url||"");
   const f=(Array.isArray(x.files)?x.files:[]).find(z=>{
    const url=String(z.download_url||z.file_raw_url||z.url||"");
    return safeSong(url)&&(/\.mp3(?:$|\?)/i.test(url)||z.file_format==="audio/mpeg");
   });
   if(!lic||!f||!/^https:\/\/(?:www\.)?ccmixter\.org\//.test(landing))return [];
   return [{title:htmlText(x.upload_name||x.name||"Mix"),artist:htmlText(x.user_name||"Artiste"),
    license:lic.name,licenseUrl:lic.url,sourceUrl:landing,remoteUrl:String(f.download_url||f.file_raw_url||f.url),mime:"audio/mpeg",size:Number(f.file_size)||0}];
  }).slice(0,20);
 }
 return [];
}
async function audiusSearch(q){
 const headers={Accept:"application/json"};if(process.env.AUDIUS_API_KEY)headers["x-api-key"]=process.env.AUDIUS_API_KEY;
 const r=await fetch("https://api.audius.co/v1/tracks/search?"+new URLSearchParams({query:q,limit:"20"}),{headers,signal:AbortSignal.timeout(10000),redirect:"error"});
 if(!r.ok)throw Error("Audius "+r.status);
 const d=await r.json();
 return (Array.isArray(d.data)?d.data:[]).map(x=>({
  id:String(x.id||""),title:htmlText(x.title),artist:htmlText(x.user?.name||x.user?.handle),
  canUseInVideo:false,sourceUrl:/^https:\/\/audius\.co\//.test(String(x.permalink||""))?x.permalink:"https://audius.co",
  license:"Écoute externe : autorisation de synchronisation à vérifier"
 })).filter(x=>x.id&&x.title).slice(0,20);
}

const htmlText=x=>String(x||"").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim().slice(0,140);
function allowedMediaUrl(u){
 try{
  const url=new URL(u);
  return url.protocol==="https:"&&url.hostname==="upload.wikimedia.org"&&/^\/wikipedia\/commons\/(?:[a-z0-9/_%.\-]+)$/i.test(url.pathname)&&!url.username&&!url.password;
 }catch{return false}
}
function permissiveLicense(meta){
 const short=htmlText(meta?.LicenseShortName?.value||"").trim(),url=String(meta?.LicenseUrl?.value||"").trim();
 if(/^(?:CC0(?:\b|$)|Public domain(?:\b|$)|PD(?:\b|$))|public domain mark/i.test(short))return {name:short||"Domaine public",url:url.startsWith("https://")?url:""};
 // Attribution license (commercial use permitted) — source/artist/license credit is retained.
 if(/^CC BY (?:2\.0|2\.5|3\.0|4\.0)\b/i.test(short)&&!/\bNC\b|\bND\b/i.test(short))return {name:short,url:url.startsWith("https://")?url:""};
 return null;
}
function send(res,status,data){
 res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store","x-content-type-options":"nosniff"});
 res.end(JSON.stringify(data));
}
export async function handleCmdStudioMusic(req,res,url,{auth}={}){
 if(!url.pathname.startsWith("/api/cmd-studio-music"))return false;
 if(!auth?.user?.id){send(res,401,{error:"Connexion CMD Sphere requise."});return true}
 if(req.method==="GET"&&url.pathname==="/api/cmd-studio-music/external"){
  const provider=String(url.searchParams.get("provider")||"").toLowerCase();
  const raw=String(url.searchParams.get("url")||"").trim();
  let parsed;try{parsed=new URL(raw)}catch{send(res,400,{error:"Lien musical invalide."});return true}
  if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.port){send(res,400,{error:"Lien HTTPS officiel requis."});return true}
  let embed=null,external=null;
  if(provider==="youtube"&&["youtube.com","www.youtube.com","m.youtube.com","youtu.be"].includes(parsed.hostname)){
    const id=parsed.hostname==="youtu.be"?parsed.pathname.slice(1):parsed.pathname.startsWith("/shorts/")?parsed.pathname.split("/")[2]:parsed.searchParams.get("v");
    if(!/^[A-Za-z0-9_-]{11}$/.test(id||"")){send(res,400,{error:"Identifiant YouTube invalide."});return true}
    external="https://www.youtube.com/watch?v="+id;embed="https://www.youtube-nocookie.com/embed/"+id;
  }else if(provider==="spotify"&&["open.spotify.com"].includes(parsed.hostname)){
    const parts=parsed.pathname.split("/").filter(Boolean);
    const kind=parts[0]==="intl-fr"?parts[1]:parts[0],id=parts[0]==="intl-fr"?parts[2]:parts[1];
    if(!["track","album","playlist"].includes(kind)||!/^[A-Za-z0-9]{22}$/.test(id||"")){send(res,400,{error:"Lien Spotify invalide."});return true}
    external="https://open.spotify.com/"+kind+"/"+id;embed="https://open.spotify.com/embed/"+kind+"/"+id;
  }else{send(res,400,{error:"Utilise un lien officiel YouTube ou Spotify."});return true}
  send(res,200,{provider,externalUrl:external,embedUrl:embed,canUseInVideo:false,canDownload:false,notice:"Aperçu officiel uniquement. L'intégration audio dans une vidéo exige les droits de synchronisation nécessaires."});return true;
 }
 if(req.method==="GET"&&url.pathname==="/api/cmd-studio-music/search"){
  const src=String(url.searchParams.get("source")||"wikimedia");
  if(["openverse","ccmixter","audius","jamendo"].includes(src)){
   const q=String(url.searchParams.get("q")||"").trim().slice(0,70);
   if(q.length<2){send(res,200,{items:[],catalog:src});return true}
   if(src==="jamendo"){send(res,200,{items:[],catalog:src,notice:"Accès Jamendo commercial soumis à licence, non activé."});return true}
   try{
    if(src==="audius"){send(res,200,{items:await audiusSearch(q),catalog:"Audius",notice:"À écouter sur Audius. Droits de montage non vérifiés."})}
    else{
     const items=(await freeSearch(src,q)).map(song=>{
      const id=crypto.createHash("sha256").update(song.remoteUrl).digest("hex").slice(0,32);
      const track={...song,id,url:"/api/cmd-studio-music/file/"+id};
      results.set(id,{...track,date:Date.now()});return track;
     });
     send(res,200,{items,catalog:src,notice:"CC0 et CC BY avec crédit obligatoire pour CC BY."});
    }
   }catch(e){console.warn("[CMD Studio free catalog]",src,e.message);send(res,503,{items:[],error:"Catalogue temporairement indisponible."})}
   return true;
  }
  const q=String(url.searchParams.get("q")||"").trim().slice(0,75);
  if(q.length<2){send(res,200,{items:[],catalog:"Wikimedia Commons",publicDomainOnly:false});return true}
  const key=q.toLowerCase();const cached=searchCache.get(key);
  if(cached&&Date.now()-cached.date<180000){send(res,200,cached.response);return true}
  try{
   const params=new URLSearchParams({
    action:"query",format:"json",formatversion:"2",generator:"search",
    gsrsearch:q+" filetype:audio",gsrnamespace:"6",gsrlimit:"100",
    prop:"imageinfo",iiprop:"url|mime|size|extmetadata"
   });
   const upstream=await fetch("https://commons.wikimedia.org/w/api.php?"+params.toString(),{
    headers:{"User-Agent":"CMDSphereStudio/1.0 (Creative Commons audio search; contact: znation.cmd@gmail.com)","Accept":"application/json"},
    signal:AbortSignal.timeout(REQUEST_TIMEOUT)
   });
   if(!upstream.ok)throw Error("Service musical distant indisponible ("+upstream.status+")");
   const data=await upstream.json(),list=[];
   for(const page of data?.query?.pages||[]){
    const item=page.imageinfo?.[0],meta=item?.extmetadata||{},license=permissiveLicense(meta);
    if(!item||!license||!ALLOWED_MIME.has(item.mime)||!allowedMediaUrl(item.url))continue;
    if(!Number(item.size)||Number(item.size)>LIMIT)continue;
    const title=htmlText(page.title||"Musique").replace(/^File:/i,"").replace(/\.(ogg|mp3|wav|webm|oga|flac)$/i,"").replace(/_/g," ").slice(0,95);
    const artist=htmlText(meta.Artist?.value||meta.Credit?.value||"Artiste non renseigné").slice(0,105);
    const sourceUrl=/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/i.test(item.descriptionurl||"")?item.descriptionurl:"https://commons.wikimedia.org/wiki/"+encodeURIComponent(page.title||"");
    const id=crypto.createHash("sha256").update(item.url).digest("hex").slice(0,32);
    const track={id,title,artist,license:license.name,licenseUrl:license.url,sourceUrl,mime:item.mime,size:Number(item.size),url:"/api/cmd-studio-music/file/"+id};
    results.set(id,{...track,remoteUrl:item.url,date:Date.now()});list.push(track);
    if(list.length>=90)break;
   }
   if(results.size>350){for(const [id,x] of results)if(Date.now()-x.date>3600000)results.delete(id)}
   list.sort((a,b)=>(Number(b.mime==="audio/mpeg")-Number(a.mime==="audio/mpeg"))||(Number(b.mime==="audio/wav")-Number(a.mime==="audio/wav"))||a.title.localeCompare(b.title));
   const response={items:list.slice(0,35),catalog:"Wikimedia Commons",notice:"Musique réellement enregistrée, dont la licence libre a été identifiée. Respecte les attributions.",source:"https://commons.wikimedia.org"};
   searchCache.set(key,{response,date:Date.now()});
   if(searchCache.size>45)searchCache.delete(searchCache.keys().next().value);
   send(res,200,response);
  }catch(e){console.warn("[CMD studio music search]",e.message);send(res,503,{error:"Recherche musicale indisponible momentanément.",items:[]})}
  return true;
 }
 const hit=/^\/api\/cmd-studio-music\/file\/([0-9a-f]{32})$/.exec(url.pathname);
 if(req.method==="GET"&&hit){
  const track=results.get(hit[1]);if(!track||!(allowedMediaUrl(track.remoteUrl)||safeSong(track.remoteUrl))){send(res,404,{error:"Musique indisponible. Relance la recherche."});return true}
  const saved=fileCache.get(hit[1]);
  if(saved&&Date.now()-saved.time<900000){
   sendAudio(res,req,track,saved.bytes);return true;
  }
  try{
   const reqRange=String(req.headers?.range||"");
   const cleanRange=/^bytes=(\d+)-(\d*)$/.test(reqRange)?reqRange:"";
   const remoteHeaders={"User-Agent":"CMDSphereStudio/1.0 (CC-licensed music preview)","Accept":"audio/*"};
   if(cleanRange)remoteHeaders.Range=cleanRange;
   const remote=await fetch(track.remoteUrl,{headers:remoteHeaders,redirect:"error",signal:AbortSignal.timeout(REQUEST_TIMEOUT)});
   if(!remote.ok)throw Error("Audio indisponible");
   if(cleanRange&&remote.status===206){
    const span=String(remote.headers.get("content-range")||""),length=Number(remote.headers.get("content-length"));
    if(!/^bytes \d+-\d+\/\d+$/.test(span)||!Number.isSafeInteger(length)||length<=0||length>LIMIT)throw Error("Plage audio invalide");
    const type=track.mime==="application/ogg"?"audio/ogg":track.mime;
    res.writeHead(206,{"content-type":type,"content-range":span,"content-length":length,"accept-ranges":"bytes","cache-control":"private, max-age=600","x-content-type-options":"nosniff"});
    let count=0;
    for await(const chunk of remote.body){count+=chunk.length;if(count>length)throw Error("Réponse audio trop longue");res.write(chunk)}
    res.end();return true;
   }
   if(Number(remote.headers.get("content-length")||0)>LIMIT)throw Error("Morceau trop volumineux");
   const pieces=[];let size=0;
   for await(const part of remote.body){size+=part.length;if(size>LIMIT)throw Error("Morceau trop volumineux");pieces.push(part)}
   const bytes=Buffer.concat(pieces);
   if(bytes.length<128)throw Error("Audio trop court");
   if(fileCache.size>5)fileCache.delete(fileCache.keys().next().value);
   if(bytes.length<5*1024*1024)fileCache.set(hit[1],{bytes,time:Date.now()});
   sendAudio(res,req,track,bytes);
  }catch(error){console.warn("[CMD studio music file]",error.message);if(res.headersSent)res.destroy();else send(res,502,{error:"Impossible de charger ce morceau actuellement. Essaie un autre titre."})}
  return true;
 }
 send(res,404,{error:"Musique introuvable."});return true;
}
