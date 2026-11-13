import { createHash } from "node:crypto";
import { reserveGeneration, refundFailedGeneration } from "./neuria-generation-quota.ts";

const PULSE_ORIGIN="https://cmdofficiel-neuria-pulse.hf.space";
const STYLES=new Set(["Pop","Rap / Trap","Rock","Électro","R&B","Zouk","Afrobeat","Reggae","Latino","Country","Jazz","Cinématique"]);
const LANGUAGES=new Set(["français","anglais","corse","espagnol"]);
function reply(value,status=200){return new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
function lyrics(idea,language){
  const theme=idea.replace(/[\[\]<>\r\n]/g," ").replace(/\s+/g," ").slice(0,75);
  if(language==="anglais")return "[Verse]\nI keep our story in my heart\n"+theme+"\nEvery day is a brand new start\n[Chorus]\nWe rise again into the light\nAnd keep our dreams alive tonight";
  if(language==="espagnol")return "[Verse]\nEsta historia vive en mí\n"+theme+"\nEl mañana está aquí\n[Chorus]\nUna canción para soñar\nJuntos vamos a cantar";
  return "[Verse]\nAujourd'hui je raconte notre histoire\n"+theme+"\nJe garde une lumière dans le noir\n[Chorus]\nNos rêves nous font avancer\nChaque instant reste à partager\n[Verse]\nEt lorsque revient le matin\nJe sais que demain nous appartient";
}
async function remote(url,options={},timeout=165000){
  const key=process.env.HF_TOKEN||"";
  const result=await fetch(url,{...options,headers:{...(options.headers||{}),...(key?{authorization:"Bearer "+key}:{})},redirect:"error",signal:AbortSignal.timeout(timeout)});
  if(!result.ok)throw Error("Hugging Face a répondu HTTP "+result.status);
  return result;
}
function findFile(result){
  const queue=[result];
  for(let n=0;queue.length&&n<160;n++){
    const value=queue.shift();
    if(value&&typeof value==="object"){
      if(typeof value.url==="string"&&value.url.includes("/gradio_api/file="))return value.url;
      if(typeof value.path==="string"&&/\.(flac|mp3)$/i.test(value.path))return value.path;
      queue.push(...Object.values(value).filter(x=>x&&typeof x==="object"));
    }
  }
  return "";
}
async function generate({idea,style,language,instrumental}){
  const config=await (await remote(PULSE_ORIGIN+"/config",{},18000)).json();
  const dependency=(config.dependencies||[]).find(x=>x.api_name==="generation_wrapper");
  if(!dependency||dependency.inputs.length<49||dependency.inputs.length>70)throw Error("L'interface du moteur a changé");
  const components=new Map((config.components||[]).map(x=>[x.id,x]));
  const inputs=dependency.inputs.map(id=>components.get(id)?.props?.value??null);
  inputs[0]="acestep-v15-turbo";
  inputs[1]="custom";
  inputs[3]=language==="anglais"?"en":language==="espagnol"?"es":"fr";
  inputs[4]=style+", original "+(instrumental?"instrumental":"vocal")+" song, "+idea+", studio quality, warm melody, clear mixing";
  inputs[5]=instrumental?"[Instrumental]":lyrics(idea,language);
  inputs[9]=inputs[3];
  inputs[16]=1;
  inputs[30]="mp3";
  // Gradio's hidden State components are also required by generation_wrapper.
  const submit=await remote(PULSE_ORIGIN+"/gradio_api/call/generation_wrapper",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({data:inputs})},20000);
  const job=await submit.json();
  if(!/^[A-Za-z0-9_-]{3,128}$/.test(String(job?.event_id||"")))throw Error("Aucun travail accepté");
  const events=await remote(PULSE_ORIGIN+"/gradio_api/call/generation_wrapper/"+job.event_id,{},160000);
  const reader=events.body?.getReader();
  if(!reader)throw Error("Flux de génération indisponible");
  let buffer="",total=0;const decoder=new TextDecoder();
  try{
    while(true){
      const item=await reader.read();if(item.done)break;
      total+=item.value.byteLength;if(total>1000000)throw Error("Réponse trop volumineuse");
      buffer+=decoder.decode(item.value,{stream:true});
      const blocks=buffer.split(/\r?\n\r?\n/);buffer=blocks.pop()||"";
      for(const block of blocks){
        if(/(?:^|\n)event:\s*error/.test(block))throw Error("ACE-Step n'a pas pu générer de musique sur ZeroGPU");
        if(/(?:^|\n)event:\s*complete/.test(block)){
          const entry=block.split(/\r?\n/).find(x=>x.startsWith("data:"));
          if(!entry)throw Error("Pas de résultat musical");
          const file=findFile(JSON.parse(entry.slice(5).trim()));
          if(!file)throw Error("Aucun fichier audio retourné par ACE-Step");
          const target=file.startsWith("/")?PULSE_ORIGIN+"/gradio_api/file="+file:file;
          const u=new URL(target,PULSE_ORIGIN);
          if(u.origin!==PULSE_ORIGIN||!u.pathname.startsWith("/gradio_api/file="))throw Error("Lien de fichier refusé");
          const bytes=new Uint8Array(await(await remote(u.toString(),{},30000)).arrayBuffer());
          if(bytes.length<1024||bytes.length>40000000)throw Error("Audio vide ou trop grand");
          const head=new TextDecoder().decode(bytes.slice(0,4));
          const flac=head==="fLaC";
          const mp3=head.startsWith("ID3")||(bytes[0]===255&&(bytes[1]&224)===224);
          if(!flac&&!mp3)throw Error("Audio non reconnu");
          return {bytes,flac};
        }
      }
    }
  }finally{try{await reader.cancel()}catch{}reader.releaseLock();}
  throw Error("Génération interrompue sans résultat");
}
export async function handleNeuriaPulseSong(req,server){
  if(req.method!=="POST")return reply({error:"Méthode interdite"},405);
  if(Number(req.headers.get("content-length")||0)>2000)return reply({error:"Texte trop long"},413);
  let body;try{body=await req.json()}catch{return reply({error:"JSON invalide"},400)}
  const idea=typeof body?.idea==="string"?body.idea.trim():"";
  const style=typeof body?.style==="string"?body.style:"";
  const language=typeof body?.language==="string"?body.language:"";
  const instrumental=body?.instrumental===true;
  if(!idea||idea.length>350||!STYLES.has(style)||!LANGUAGES.has(language))return reply({error:"Écris ton idée puis choisis un style"},400);
  const ip=server.requestIP(req)?.address||"";
  const secret=process.env.NEURIA_WORK_ADMIN_KEY||"";
  if(!process.env.HF_TOKEN||!process.env.NEURIA_QUOTA_DB_PATH||ip.length<3||secret.length<24)return reply({error:"Quotas gratuits ou moteur non configurés"},503);
  const account="anonymous:"+createHash("sha256").update(secret+ip).digest("hex");
  const now=Date.now();
  try{
    const quota=reserveGeneration(account,"pulse",now);
    if(!quota.allowed)return reply({error:"Quota gratuit de 24 heures atteint",retryAt:quota.retryAt},429);
  }catch{return reply({error:"Impossible de réserver le quota"},503)}
  let ok=false;
  try{
    const audio=await generate({idea,style,language,instrumental});
    ok=true;
    return new Response(audio.bytes,{headers:{"content-type":audio.flac?"audio/flac":"audio/mpeg","content-disposition":"attachment; filename=\"Pulse."+(audio.flac?"flac":"mp3")+"\"","cache-control":"no-store","x-content-type-options":"nosniff"}});
  }catch(e){
    console.error("[NEURIA_PULSE_SONG]",String(e?.message||"Erreur").slice(0,180));
    return reply({error:String(e?.message||"Moteur indisponible").slice(0,200)},502);
  }finally{
    if(!ok){try{refundFailedGeneration(account,"pulse",now)}catch{}}
  }
}
