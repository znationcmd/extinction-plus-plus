import { repairPulse } from "./repair-pulse-zerogpu.ts";
await repairPulse();
const token=process.env.HF_TOKEN||"";
const origin="https://cmdofficiel-neuria-pulse.hf.space";
const headers={Authorization:"Bearer "+token,"Content-Type":"application/json"};
const log=(line)=>console.log("PULSE_TEST "+String(line).slice(0,3500));
async function start(){
  if(!token){log("NO_HF_TOKEN");return}
  const signal=AbortSignal.timeout(160000);
  const confRes=await fetch(origin+"/config",{headers,signal});
  if(!confRes.ok)throw Error("CONFIG_"+confRes.status);
  const config=await confRes.json();
  const deps=(config.dependencies||[]).filter(d=>d.api_name==="generation_wrapper");
  if(deps.length!==1)throw Error("GENERATION_WRAPPER_DEPENDENCIES_"+deps.length);
  const dep=deps[0],map=new Map((config.components||[]).map(c=>[c.id,c]));
  const params=dep.inputs.map((id,i)=>{
    const component=map.get(id);
    const props=component?.props||{};
    const value=Object.hasOwn(props,"value")?props.value:null;
    return {i,id,component:component?.type||"unknown",label:props.label||"",value:value===undefined?null:value};
  });
  log("CONFIG_INPUT_COUNT "+params.length);
  log("INPUTS_LAST_20 "+JSON.stringify(params.slice(-20).map(({i,component,label,value})=>({i,component,label,value:typeof value==="string"?value.slice(0,60):value}))));
  if(params.length<49||params.length>70)throw Error("UNEXPECTED_INPUT_COUNT");
  const data=params.map(p=>p.value);
  const use=(i,value)=>{if(i<data.length)data[i]=value};
  use(0,"acestep-v15-turbo");use(1,"custom");
  use(4,"French acoustic pop, clear female vocals, warm guitar, 90 bpm");
  use(5,"[Verse]\nDans la lumière du matin\nJe chante sur le chemin\n[Chorus]\nUn chant pour demain");
  use(9,"fr");use(16,1);use(30,"mp3");
  // Defensive defaults for hidden inputs absent from Gradio's public named-endpoint schema.
  for(let i=0;i<data.length;i++){
    if(data[i]!==null&&data[i]!==undefined)continue;
    const kind=params[i].component;
    if(kind==="Checkbox")data[i]=false;
    else if(kind==="Checkboxgroup")data[i]=[];
    else if(kind==="Slider"||kind==="Number")data[i]=0;
    else if(kind==="Textbox")data[i]="";
    else if(kind==="Dropdown"){const choices=map.get(params[i].id)?.props?.choices||[];data[i]=Array.isArray(choices)&&choices.length?(Array.isArray(choices[0])?choices[0][1]:choices[0]):"";}
  }
  log("POST_INPUT_COUNT "+data.length);
  const start=await fetch(origin+"/gradio_api/call/generation_wrapper",{method:"POST",headers,body:JSON.stringify({data}),signal});
  if(!start.ok)throw Error("SUBMIT_"+start.status+"_"+(await start.text()).slice(0,300));
  const job=await start.json();
  log("SUBMITTED "+job.event_id);
  const stream=await fetch(origin+"/gradio_api/call/generation_wrapper/"+job.event_id,{headers,signal});
  if(!stream.ok)throw Error("STREAM_"+stream.status);
  const reader=stream.body.getReader();let buffer="";const decode=new TextDecoder();let final=false;
  while(true){
    const {done,value}=await reader.read();if(done)break;
    buffer+=decode.decode(value,{stream:true});
    const blocks=buffer.split(/\r?\n\r?\n/);buffer=blocks.pop()||"";
    for(const block of blocks)if(/event:\s*(complete|error)/.test(block)){log("RESULT "+block.slice(0,2800));final=true;}
    if(final)break;
  }
  if(!final)log("NO_COMPLETED_EVENT");
}
try{await start()}catch(e){log("FAILED "+String(e?.message||e).slice(0,500))}
await import("./diagnose-pulse.ts");
await import("./test-oracle-aura.ts");
