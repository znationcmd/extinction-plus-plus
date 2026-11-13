const URL="https://cmdofficiel-neuria.hf.space";
const token=process.env.HF_TOKEN||"";
const log=s=>console.log("NEURIA_ENGINE_SMOKE "+String(s).slice(0,1000));
async function call(url,options={},limit=130000){
  const response=await fetch(url,{...options,headers:{...(options.headers||{}),...(token?{authorization:"Bearer "+token}:{})},redirect:"error",signal:AbortSignal.timeout(limit)});
  if(!response.ok)throw Error("HTTP "+response.status+" "+url.split("/").slice(-1)[0]);
  return response;
}
async function task(name,args,limit){
  const start=await call(URL+"/gradio_api/call/"+name,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({data:args})},20000);
  const job=await start.json();if(!job?.event_id)throw Error("NO_EVENT_ID");
  const stream=await call(URL+"/gradio_api/call/"+name+"/"+job.event_id,{},limit);
  const reader=stream.body.getReader(),decoder=new TextDecoder();let pending="";
  try{
    while(true){
      const event=await reader.read();if(event.done)break;
      pending+=decoder.decode(event.value,{stream:true});
      const blocks=pending.split(/\r?\n\r?\n/);pending=blocks.pop()||"";
      for(const block of blocks){
        if(/event:\s*error/.test(block))throw Error("REMOTE_GENERATION_ERROR");
        if(/event:\s*complete/.test(block)){
          const data=block.split(/\r?\n/).find(x=>x.startsWith("data:"));
          if(!data)throw Error("NO_RESULT");
          return JSON.parse(data.slice(5));
        }
      }
      if(pending.length>250000)throw Error("EVENTS_TOO_LARGE");
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
  throw Error("NO_COMPLETION");
}
function tone(){
  const rate=16000,samples=rate*10,buf=new ArrayBuffer(44+samples*2),v=new DataView(buf);
  const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  str(0,"RIFF");v.setUint32(4,36+samples*2,true);str(8,"WAVE");str(12,"fmt ");v.setUint32(16,16,true);
  v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);
  v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,"data");v.setUint32(40,samples*2,true);
  for(let i=0;i<samples;i++)v.setInt16(44+i*2,Math.round(5000*Math.sin(2*Math.PI*440*i/rate)),true);
  return new Blob([buf],{type:"audio/wav"});
}
async function aura(){
  const form=new FormData();form.append("files",tone(),"aura-smoke.wav");
  const r=await call(URL+"/gradio_api/upload",{method:"POST",body:form},35000);
  const files=await r.json();if(!Array.isArray(files)||typeof files[0]!=="string")throw Error("UPLOAD_FAILED");
  log("AURA_UPLOAD_OK");
  const item={path:files[0],url:URL+"/gradio_api/file="+files[0],orig_name:"aura-smoke.wav",mime_type:"audio/wav",meta:{"_type":"gradio.FileData"}};
  const result=await task("recognize",[item],65000);
  log("AURA_API_COMPLETE "+JSON.stringify(result).slice(0,300));
}
function file(result){
  const queue=[result];let n=0;
  while(queue.length&&n++<100){
    const x=queue.shift();
    if(x&&typeof x==="object"){
      if(typeof x.url==="string"&&x.url.includes("/gradio_api/file=")&&/\.glb(?:$|\?)/i.test(x.url))return x.url;
      queue.push(...Object.values(x).filter(v=>v&&typeof v==="object"));
    }
  }
  return "";
}
async function oracle(){
  const data=await task("generate",["a simple solid blue cube"],115000);
  const url=file(data);if(!url)throw Error("NO_GLB_OUTPUT");
  const u=new globalThis.URL(url);
  if(u.origin!==URL)throw Error("CROSS_ORIGIN_FILE");
  const binary=new Uint8Array(await(await call(url,{},35000)).arrayBuffer());
  if(new TextDecoder().decode(binary.slice(0,4))!=="glTF")throw Error("INVALID_GLB");
  log("ORACLE_VALID_GLB "+binary.length);
}
try{await aura()}catch(e){log("AURA_FAILED "+String(e?.message||e))}
try{await oracle()}catch(e){log("ORACLE_FAILED "+String(e?.message||e))}

async function pulseBridge(){
  const {handleNeuriaPulseSong}=await import("../neuria-pulse-song-api.ts");
  const body={idea:"Une chanson joyeuse sur la liberté",style:"Pop",language:"français",instrumental:false};
  const req=new Request("http://localhost/api/neuria/pulse/song",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const server={requestIP:()=>({address:"127.0.0.63"})};
  const res=await handleNeuriaPulseSong(req,server);
  if(!res.ok)throw Error("BRIDGE_HTTP_"+res.status+"_"+(await res.text()).slice(0,250));
  if(!["audio/mpeg","audio/flac"].includes(res.headers.get("content-type")))throw Error("BRIDGE_NOT_AUDIO");
  const bytes=new Uint8Array(await res.arrayBuffer());
  if(bytes.length<1000)throw Error("BRIDGE_EMPTY");
  const magic=new TextDecoder().decode(bytes.slice(0,4));
  if(magic!=="fLaC"&&!magic.startsWith("ID3")&&!(bytes[0]===255&&(bytes[1]&224)===224))throw Error("BRIDGE_INVALID_AUDIO");
  log("PULSE_BRIDGE_MP3_OK "+bytes.length+" BYTES");
}
try{await pulseBridge()}catch(e){log("PULSE_BRIDGE_FAILED "+String(e?.message||e))}
