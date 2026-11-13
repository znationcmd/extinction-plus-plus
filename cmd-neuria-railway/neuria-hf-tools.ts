
const NEURIA_HF_ORIGIN = "https://cmdofficiel-neuria.hf.space";
const NEURIA_HF_LIMITS = new Map();
function neuriaHfJson(obj,status=200) {
  return new Response(JSON.stringify(obj),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
}
function neuriaHfThrottled(key,kind) {
  const now=Date.now(), windowMs=kind==="oracle"?1800000:600000, max=kind==="oracle"?2:5;
  if(NEURIA_HF_LIMITS.size>5000){for(const [k,v] of NEURIA_HF_LIMITS)if(!v.some(t=>now-t<1800000))NEURIA_HF_LIMITS.delete(k);}
  const prior=(NEURIA_HF_LIMITS.get(key)||[]).filter(t=>now-t<windowMs);
  if(prior.length>=max)return true;
  prior.push(now);NEURIA_HF_LIMITS.set(key,prior);return false;
}
async function neuriaHfRequest(url,options={},timeout=90000) {
  const token=Bun.env.HF_TOKEN||"";
  const headers={...(options.headers||{})};
  if(token)headers.authorization="Bearer "+token;
  const res=await fetch(url,{...options,headers,redirect:"error",signal:AbortSignal.timeout(timeout)});
  if(!res.ok)throw new Error("Hugging Face indisponible (HTTP "+res.status+")");
  return res;
}
async function neuriaHfCall(endpoint,data,timeout=90000) {
  const submit=await neuriaHfRequest(NEURIA_HF_ORIGIN+"/gradio_api/call/"+endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({data})},18000);
  const job=await submit.json();
  if(typeof job.event_id!=="string"||!/^[a-zA-Z0-9_-]{3,128}$/.test(job.event_id))throw new Error("Aucun travail accepté par le moteur");
  const stream=await neuriaHfRequest(NEURIA_HF_ORIGIN+"/gradio_api/call/"+endpoint+"/"+job.event_id,{},timeout);
  const reader=stream.body?.getReader();
  if(!reader)throw new Error("Réponse du moteur manquante");
  const decoder=new TextDecoder();let buffer="",total=0;const deadline=Date.now()+timeout;
  try {
    while(Date.now()<deadline){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.length;
      if(total>500000)throw new Error("Réponse du moteur trop volumineuse");
      buffer+=decoder.decode(value,{stream:true});
      const blocks=buffer.split(/\r?\n\r?\n/);buffer=blocks.pop()||"";
      for(const block of blocks){
        if(/(?:^|\n)event:\s*error\s*(?:\n|$)/.test(block))throw new Error("La génération a échoué sur Hugging Face");
        if(/(?:^|\n)event:\s*complete\s*(?:\n|$)/.test(block)){
          const line=block.split(/\r?\n/).find(l=>l.startsWith("data:"));
          if(!line)throw new Error("Résultat absent");
          const parsed=JSON.parse(line.slice(5).trim());
          if(!Array.isArray(parsed))throw new Error("Résultat inattendu du moteur");
          return parsed;
        }
      }
    }
  } finally {try{await reader.cancel()}catch{}reader.releaseLock();}
  throw new Error("Aucun résultat reçu. Le Space est peut-être indisponible ou son quota épuisé.");
}
export async function handleNeuriaHfRequest(req,server,path) {
  if(!["/api/neuria/aura/identify","/api/neuria/oracle/create"].includes(path))return null;
  const kind=path.endsWith("create")?"oracle":"aura";
  if(req.method!=="POST")return neuriaHfJson({error:"Méthode non autorisée"},405);
  const client=server.requestIP(req)?.address||"inconnu";
  if(neuriaHfThrottled(client+":"+kind,kind))return neuriaHfJson({error:"Trop de demandes. Réessaie plus tard pour préserver le quota gratuit."},429);
  try {
    if(kind==="aura"){
      if(Number(req.headers.get("content-length")||0)>12000000)return neuriaHfJson({error:"Enregistrement limité à 12 Mo"},413);
      const mime=(req.headers.get("content-type")||"audio/webm").split(";")[0].trim().toLowerCase();
      if(!["audio/webm","audio/mp4","audio/mpeg","audio/wav","audio/x-wav","audio/ogg","audio/aac","audio/x-m4a","audio/flac"].includes(mime))return neuriaHfJson({error:"Format audio non pris en charge"},415);
      const bytes=new Uint8Array(await req.arrayBuffer());
      if(bytes.byteLength<128||bytes.byteLength>12000000)return neuriaHfJson({error:"Le fichier audio doit contenir 128 octets à 12 Mo"},400);
      const extension=mime.includes("webm")?"webm":mime.includes("mp4")||mime.includes("m4a")?"m4a":mime.includes("mpeg")?"mp3":mime.includes("wav")?"wav":mime.includes("ogg")?"ogg":mime.includes("flac")?"flac":"aac";
      const form=new FormData();
      form.append("files",new Blob([bytes],{type:mime}),"extrait."+extension);
      const upload=await neuriaHfRequest(NEURIA_HF_ORIGIN+"/gradio_api/upload",{method:"POST",body:form},45000);
      const paths=await upload.json();
      const uploaded=Array.isArray(paths)?paths[0]:null;
      if(typeof uploaded!=="string"||!uploaded.startsWith("/tmp/gradio/"))throw new Error("Téléversement audio non accepté");
      const input={path:uploaded,url:NEURIA_HF_ORIGIN+"/gradio_api/file="+uploaded,orig_name:"extrait."+extension,mime_type:mime,meta:{"_type":"gradio.FileData"}};
      const output=await neuriaHfCall("recognize",[input],80000);
      const title=String(output[0]||"Aucune correspondance").slice(0,350);
      const rawUrl=typeof output[1]==="string"?output[1]:"";
      const link=rawUrl.startsWith("https://")?rawUrl.slice(0,1000):"";
      return neuriaHfJson({recognized:!/^aucune correspondance/i.test(title),title,link,engine:"ShazamIO (non officiel)",note:"Résultat de la reconnaissance distante, sujet à disponibilité du service"});
    }
    if(Number(req.headers.get("content-length")||0)>2048)return neuriaHfJson({error:"Description trop longue"},413);
    let body;try{body=await req.json()}catch{return neuriaHfJson({error:"JSON invalide"},400)}
    const prompt=typeof body?.prompt==="string"?body.prompt.trim():"";
    if(prompt.length<3||prompt.length>500)return neuriaHfJson({error:"Écris une description de 3 à 500 caractères"},400);
    const output=await neuriaHfCall("generate",[prompt],145000);
    const files=output.flatMap(x=>x&&typeof x==="object"?(Array.isArray(x)?x:[x]):[]);
    const result=files.find(x=>typeof x.path==="string"&&/\.glb(?:$|\?)/i.test(x.path))||files.find(x=>typeof x.url==="string"&&/\.glb(?:$|\?)/i.test(x.url))||files.find(x=>typeof x.path==="string")||files[0];
    if(!result)throw new Error("Le moteur n'a retourné aucun modèle");
    const candidate=typeof result.url==="string"?result.url:NEURIA_HF_ORIGIN+"/gradio_api/file="+String(result.path||"");
    const parsed=new URL(candidate,NEURIA_HF_ORIGIN);
    if(parsed.origin!==NEURIA_HF_ORIGIN||!parsed.pathname.startsWith("/gradio_api/file="))throw new Error("Lien de modèle non autorisé");
    const model=await neuriaHfRequest(parsed.toString(),{},50000);
    const bytes=new Uint8Array(await model.arrayBuffer());
    if(bytes.length<32||bytes.length>40000000||new TextDecoder().decode(bytes.slice(0,4))!=="glTF")throw new Error("Le modèle GLB retourné n'est pas valide");
    return new Response(bytes,{headers:{"content-type":"model/gltf-binary","content-disposition":"attachment; filename=\"NEURIA-Oracle.glb\"","cache-control":"no-store","x-content-type-options":"nosniff"}});
  } catch(error) {
    console.error("[NEURIA_HF]",kind,error?.message||"unavailable");
    return neuriaHfJson({error:String(error?.message||"Moteur indisponible").slice(0,300)},502);
  }
}
