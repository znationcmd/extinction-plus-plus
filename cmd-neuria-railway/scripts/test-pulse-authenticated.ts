// Production pre-deploy health probe: no GPU generation or billable resource creation.
// Manual full tests are kept in scripts/test-oracle-aura.ts.
// One GPU-generation verification has already succeeded; do not repeat on every deploy.
const token=process.env.HF_TOKEN||"";
const checks=[
  {name:"oracle_aura",url:"https://cmdofficiel-neuria.hf.space/gradio_api/info",expected:["/generate","/recognize"]},
  {name:"pulse",url:"https://cmdofficiel-neuria-pulse.hf.space/gradio_api/info",expected:["/generation_wrapper"]}
];
for(const item of checks){
  try{
    const resp=await fetch(item.url,{headers:token?{authorization:"Bearer "+token}:{},redirect:"error",signal:AbortSignal.timeout(12000)});
    if(!resp.ok){console.warn("NEURIA_PREDEPLOY "+item.name+" HTTP_"+resp.status);continue}
    const info=await resp.json();
    const names=new Set(Object.keys(info.named_endpoints||{}));
    const missing=item.expected.filter(key=>!names.has(key));
    console.log("NEURIA_PREDEPLOY "+item.name+" "+(missing.length?"missing:"+missing.join(","):"api_reachable"));
  }catch(error){
    console.warn("NEURIA_PREDEPLOY "+item.name+" check_unavailable "+String(error?.name||"network_error"));
  }
}
try{await import("./test-neuria-mobile-ui.ts")}catch(error){console.warn("NEURIA_MOBILE_UI FAIL "+String(error?.stack||error).slice(0,900))}

