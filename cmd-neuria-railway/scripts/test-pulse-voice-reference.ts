// One-time integration test: exercise reference audio on the existing free ACE-Step Space.
// Synthetic reference tone tests upload/conditioning, NOT a voice-clone fidelity test.
const ORIGIN="https://cmdofficiel-neuria-pulse.hf.space";
const token=process.env.HF_TOKEN||"";
function say(s){console.log("PULSE_VOICE_REFERENCE_TEST "+String(s).slice(0,1000))}
async function req(url,options={},ms=100000){
  const r=await fetch(url,{...options,headers:{...(options.headers||{}),...(token?{authorization:"Bearer "+token}:{})},redirect:"error",signal:AbortSignal.timeout(ms)});
  if(!r.ok)throw Error("HTTP_"+r.status);
  return r;
}
function wav(){
  const rate=22050,n=rate*6,buffer=new ArrayBuffer(44+n*2),v=new DataView(buffer);
  const write=(offset,str)=>{for(let i=0;i<str.length;i++)v.setUint8(offset+i,str.charCodeAt(i))};
  write(0,"RIFF");v.setUint32(4,36+n*2,true);write(8,"WAVE");write(12,"fmt ");
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
  write(36,"data");v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){const t=i/rate;const sample=0.12*Math.sin(t*2*Math.PI*220)*(0.6+0.4*Math.sin(t*2*Math.PI*5));v.setInt16(44+2*i,Math.round(sample*32767),true);}
  return new Blob([buffer],{type:"audio/wav"});
}
function audioFile(result){
  const nodes=[result];let count=0;
  while(nodes.length&&count++<250){
    const o=nodes.shift();
    if(o&&typeof o==="object"){
      if(typeof o.url==="string"&&o.url.startsWith(ORIGIN+"/gradio_api/file=")&&/\.mp3(?:$|[?&])/.test(o.url))return o.url;
      nodes.push(...Object.values(o).filter(x=>x&&typeof x==="object"));
    }
  }
  return null;
}
async function run(){
  if(!token){say("SKIP_NO_TOKEN");return}
  const config=await (await req(ORIGIN+"/config",{},20000)).json();
  const dep=(config.dependencies||[]).find(x=>x.api_name==="generation_wrapper");
  if(!dep||dep.inputs.length<49||dep.inputs.length>70)throw Error("UNEXPECTED_SCHEMA");
  const map=new Map((config.components||[]).map(c=>[c.id,c]));
  const component=map.get(dep.inputs[14]);
  say("REFERENCE_AUDIO_FIELD "+JSON.stringify({index:14,label:component?.props?.label,type:component?.type}));
  if(String(component?.type).toLowerCase()!=="audio")throw Error("REFERENCE_AUDIO_SCHEMA_CHANGED");
  const form=new FormData();
  form.append("files",wav(),"synthetic-reference.wav");
  const uploaded=await (await req(ORIGIN+"/gradio_api/upload",{method:"POST",body:form},45000)).json();
  const path=uploaded?.[0];
  if(typeof path!=="string"||!path.startsWith("/tmp/gradio/"))throw Error("UPLOAD_FAILED");
  say("REFERENCE_UPLOAD_SUCCESS");
  const data=dep.inputs.map(id=>map.get(id)?.props?.value??null);
  data[0]="acestep-v15-turbo";data[1]="custom";
  data[3]="fr";
  data[4]="Gentle French folk music, acoustic guitar, soft lead voice, simple melody";
  data[5]="[Verse]\nNos rêves brillent au matin\nNos chemins se croisent enfin\n[Chorus]\nNous chantons demain";
  data[9]="fr";data[16]=1;data[30]="mp3";
  data[14]={path,url:ORIGIN+"/gradio_api/file="+path,orig_name:"synthetic-reference.wav",mime_type:"audio/wav",meta:{"_type":"gradio.FileData"}};
  const start=await (await req(ORIGIN+"/gradio_api/call/generation_wrapper",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({data})},20000)).json();
  if(!/^[A-Za-z0-9_-]{3,128}$/.test(String(start.event_id)))throw Error("JOB_NOT_ACCEPTED");
  say("REFERENCE_GENERATION_SUBMITTED");
  const stream=await req(ORIGIN+"/gradio_api/call/generation_wrapper/"+start.event_id,{},170000);
  const reader=stream.body.getReader(),decoder=new TextDecoder();let partial="";
  try{
    for(;;){
      const item=await reader.read();if(item.done)break;
      partial+=decoder.decode(item.value,{stream:true});
      const chunks=partial.split(/\r?\n\r?\n/);partial=chunks.pop()||"";
      for(const chunk of chunks){
        if(/(?:^|\n)event:\s*error/.test(chunk))throw Error("MODEL_GENERATION_ERROR");
        if(/(?:^|\n)event:\s*complete/.test(chunk)){
          const line=chunk.split(/\r?\n/).find(x=>x.startsWith("data:"));if(!line)throw Error("EMPTY_RESULT");
          const url=audioFile(JSON.parse(line.slice(5).trim()));if(!url)throw Error("NO_MP3_FILE");
          const bytes=new Uint8Array(await(await req(url,{},30000)).arrayBuffer());
          const valid=bytes.length>1000&&(new TextDecoder().decode(bytes.slice(0,3))==="ID3"||(bytes[0]===255&&(bytes[1]&224)===224));
          if(!valid)throw Error("INVALID_MP3");
          say("REFERENCE_GENERATED_MP3 "+bytes.byteLength+" BYTES");
          return;
        }
      }
      if(partial.length>500000)throw Error("SSE_TOO_LARGE");
    }
  }finally{try{await reader.cancel()}catch{}reader.releaseLock()}
  throw Error("NO_FINAL_EVENT");
}
try{await run()}catch(e){say("FAILED "+String(e?.message||e))}