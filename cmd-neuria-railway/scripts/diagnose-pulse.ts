const token=process.env.HF_TOKEN;
try{
const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),12000);
const r=await fetch("https://huggingface.co/api/spaces/cmdofficiel/NEURIA-PULSE/logs/run",{headers:{Authorization:"Bearer "+token},signal:ctrl.signal});console.log("PULSE_DIAG HTTP "+r.status);
if(r.ok){const reader=r.body.getReader();let collected="";try{while(collected.length<120000){const {done,value}=await reader.read();if(done)break;collected+=new TextDecoder().decode(value);}}catch{}finally{await reader.cancel().catch(()=>{});}
const lines=collected.split("\n").filter(x=>/error|exception|traceback|killed|memory|cuda|abort|duration|generat|failed|warning/i.test(x));
for(const line of lines.slice(-55))console.log("PULSE_DIAG "+line.replaceAll(token,"[REDACTED]").slice(0,1600));
}clearTimeout(t);
}catch(e){console.log("PULSE_DIAG "+String(e.message).replaceAll(token||"NONE","[REDACTED]"));}
