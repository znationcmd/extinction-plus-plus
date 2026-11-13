const token=process.env.HF_TOKEN,base="https://huggingface.co";
const log=s=>console.log("NEURIA_FIX "+s);
const get=async(path)=>{const r=await fetch(base+path,{headers:{Authorization:"Bearer "+token},redirect:"follow",signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error("READ "+r.status);return r;};
const publish=async(repo,files)=>{const info=await(await get("/api/spaces/"+repo)).json();if(!String(info.runtime?.hardware?.requested).startsWith("zero-"))throw Error("Nonfree hardware refused");const rows=[{key:"header",value:{summary:"Fix free inference compatibility",description:"No hardware changes.",parentCommit:info.sha}},...Object.entries(files).map(([path,c])=>({key:"file",value:{path,encoding:"base64",content:Buffer.from(c).toString("base64")}}))];const r=await fetch(base+"/api/spaces/"+repo+"/commit/main",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/x-ndjson"},body:rows.map(x=>JSON.stringify(x)).join("\n")+"\n",redirect:"error",signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error("WRITE "+r.status+" "+(await r.text()).replaceAll(token,"[REDACTED]").slice(0,300));log(repo+" "+(await r.json()).commitOid);};

try{
let handler=await(await get("/spaces/cmdofficiel/NEURIA-PULSE/raw/main/acestep/handler.py")).text();
handler=handler.replace('text_encoder_attn = self.get_best_attn_implementation()', 'text_encoder_attn = "sdpa"  # portable ZeroGPU attention');
handler=handler.replace('for attn_impl in [text_encoder_attn, "flash_attention_2", "sdpa", "eager"]:', 'for attn_impl in ["sdpa", "eager"]:');
await publish("cmdofficiel/NEURIA-PULSE",{"acestep/handler.py":handler});
}catch(e){log("PULSE_FAILED "+e.message);}
