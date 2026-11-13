// Patch an existing user-owned ZeroGPU Space without changing hardware or enabling billing.
// The Space's flash-attention binary is architecture-specific: force native PyTorch SDPA.
const SPACE="cmdofficiel/NEURIA-PULSE";
const ROOT="https://huggingface.co";
const log=(message)=>console.log("PULSE_REPAIR "+message);
function guardToken(){const token=process.env.HF_TOKEN||"";if(!token)throw Error("HF_TOKEN absent");return token;}
async function hf(path,options={}){
  const token=guardToken();
  const res=await fetch(ROOT+path,{
    ...options,
    headers:{authorization:"Bearer "+token,...options.headers},
    redirect:"error",
    signal:AbortSignal.timeout(50000)
  });
  if(!res.ok)throw Error("HTTP_"+res.status+"_"+path.split("?")[0].slice(0,90));
  return res;
}
function forceSDPA(source){
  const marker="# NEURIA_ZEROGPU_SDPA";
  if(source.includes(marker))return {text:source,changed:false};
  const pattern=/^([ \t]*)def get_best_attn_implementation\(self\)\s*->\s*str:\s*\r?\n/m;
  const match=source.match(pattern);
  if(!match)throw Error("Attention selector not found, no unsafe patch applied");
  const indent=match[1];
  const replacement=match[0]+indent+"    return \"sdpa\"  "+marker+"\n";
  const next=source.replace(pattern,replacement);
  if(next===source)throw Error("Patch not applied");
  return {text:next,changed:true};
}
export async function repairPulse() {
  const token=process.env.HF_TOKEN;
  if(!token){log("SKIP_HF_TOKEN_MISSING");return false}
  try{
    const info=await (await hf("/api/spaces/"+SPACE)).json();
    const requested=String(info?.runtime?.hardware?.requested||"");
    if(!requested.startsWith("zero-"))throw Error("NON_FREE_HARDWARE_REFUSED");
    if(typeof info.sha!=="string"||info.sha.length<16)throw Error("PARENT_COMMIT_UNKNOWN");
    const paths=["acestep/handler.py","acestep/llm_inference.py"];
    const changed={};
    for(const path of paths){
      const current=await(await hf("/spaces/"+SPACE+"/raw/main/"+path)).text();
      const patched=forceSDPA(current);
      if(patched.changed)changed[path]=patched.text;
    }
    if(!Object.keys(changed).length){log("ALREADY_PATCHED_NO_CHANGES");return true}
    const records=[
      {key:"header",value:{summary:"Fix ACE-Step Flash Attention CUDA crash on free ZeroGPU",description:"Use PyTorch SDPA, keep existing ZeroGPU hardware",parentCommit:info.sha}},
      ...Object.entries(changed).map(([path,content])=>({key:"file",value:{path,encoding:"base64",content:Buffer.from(content).toString("base64")}}))
    ];
    const res=await hf("/api/spaces/"+SPACE+"/commit/main",{
      method:"POST",
      headers:{"content-type":"application/x-ndjson"},
      body:records.map(x=>JSON.stringify(x)).join("\n")+"\n"
    });
    const result=await res.json();
    log("PATCH_PUBLISHED "+String(result.commitOid||"unknown").slice(0,40)+" FILES "+Object.keys(changed).join(","));
    return true;
  }catch(error){
    log("UNABLE_TO_PATCH "+String(error?.message||error).replaceAll(token||"\0","[REDACTED]").slice(0,220));
    return false;
  }
}
if(import.meta.main)await repairPulse();