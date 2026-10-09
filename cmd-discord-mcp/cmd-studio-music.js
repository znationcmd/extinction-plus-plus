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
 if(req.method==="GET"&&url.pathname==="/api/cmd-studio-music/search"){
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
    if(list.length>=35)break;
   }
   if(results.size>350){for(const [id,x] of results)if(Date.now()-x.date>3600000)results.delete(id)}
   const response={items:list,catalog:"Wikimedia Commons",notice:"Musique réellement enregistrée, dont la licence libre a été identifiée. Respecte les attributions.",source:"https://commons.wikimedia.org"};
   searchCache.set(key,{response,date:Date.now()});
   if(searchCache.size>45)searchCache.delete(searchCache.keys().next().value);
   send(res,200,response);
  }catch(e){console.warn("[CMD studio music search]",e.message);send(res,503,{error:"Recherche musicale indisponible momentanément.",items:[]})}
  return true;
 }
 const hit=/^\/api\/cmd-studio-music\/file\/([0-9a-f]{32})$/.exec(url.pathname);
 if(req.method==="GET"&&hit){
  const track=results.get(hit[1]);if(!track||!allowedMediaUrl(track.remoteUrl)){send(res,404,{error:"Musique indisponible. Relance la recherche."});return true}
  const saved=fileCache.get(hit[1]);
  if(saved&&Date.now()-saved.time<900000){
   sendAudio(res,req,track,saved.bytes);return true;
  }
  try{
   const remote=await fetch(track.remoteUrl,{headers:{"User-Agent":"CMDSphereStudio/1.0 (CC-licensed music preview)","Accept":"audio/*"},redirect:"error",signal:AbortSignal.timeout(REQUEST_TIMEOUT)});
   if(!remote.ok)throw Error("Audio indisponible");
   if(Number(remote.headers.get("content-length")||0)>LIMIT)throw Error("Morceau trop volumineux");
   const pieces=[];let size=0;
   for await(const part of remote.body){size+=part.length;if(size>LIMIT)throw Error("Morceau trop volumineux");pieces.push(part)}
   const bytes=Buffer.concat(pieces);
   if(bytes.length<128)throw Error("Audio trop court");
   if(fileCache.size>5)fileCache.delete(fileCache.keys().next().value);
   if(bytes.length<5*1024*1024)fileCache.set(hit[1],{bytes,time:Date.now()});
   sendAudio(res,req,track,bytes);
  }catch(error){console.warn("[CMD studio music file]",error.message);send(res,502,{error:"Impossible de charger ce morceau actuellement. Essaie un autre titre."})}
  return true;
 }
 send(res,404,{error:"Musique introuvable."});return true;
}
