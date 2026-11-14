import { Window } from "happy-dom";
import { NEURIA_PULSE_SIMPLE_UI } from "../neuria-pulse-simple-ui.ts";
import { NEURIA_ORACLE_AURA_SIMPLE_UI } from "../neuria-oracle-aura-simple-ui.ts";

const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const window=new Window({url:"https://neuria.local/"});
const document=window.document;
document.body.innerHTML='<nav id="neuriaMenu"><button data-neuria-panel="Pulse — Création musicale">Pulse</button><button data-neuria-panel="Aura — Reconnaissance musicale">Aura</button><button data-neuria-panel="Oracle — Avatar 3D">Oracle</button></nav>';
const submissions=[];
const fakeFetch=async (url,options)=>{
  submissions.push({url,options});
  if(url==="/api/neuria/pulse/song")return new Response(new Uint8Array(2600),{headers:{"content-type":"audio/mpeg"}});
  return new Response(JSON.stringify({title:"Aucune correspondance",recognized:false}),{headers:{"content-type":"application/json"}});
};
for(const script of [NEURIA_PULSE_SIMPLE_UI,NEURIA_ORACLE_AURA_SIMPLE_UI]){
  new Function("window","document","navigator","URL","Blob","FormData","fetch","MediaRecorder",script)(
    window,document,window.navigator,URL,Blob,FormData,fakeFetch,class DummyRecorder{}
  );
}
const open=(title)=>document.querySelector('[data-neuria-panel="'+title+'"]').dispatchEvent(new window.MouseEvent("click",{bubbles:true,cancelable:true}));
const settle=()=>new Promise(resolve=>setTimeout(resolve,50));
open("Pulse — Création musicale");
check(document.querySelector("#pulseUseVoice"),"Pulse consent control missing");
check(document.querySelector("#pulseRecord"),"Pulse microphone button missing");
document.querySelector("#pulseIdea").value="Une chanson pour mes amis";
document.querySelector("#pulseGo").click();
await settle();
check(submissions.length===1&&submissions[0].options.headers["content-type"]==="application/json","Standard Pulse request failed");
const file=new File([new Uint8Array(1200)],"voice.m4a",{type:"audio/mp4"});
const input=document.querySelector("#pulseUpload");
Object.defineProperty(input,"files",{configurable:true,value:[file]});
input.dispatchEvent(new window.Event("change",{bubbles:true}));
document.querySelector("#pulseUseVoice").checked=true;
document.querySelector("#pulseGo").click();
await settle();
check(submissions.length===2,"Voice request absent");
const form=submissions[1].options.body;
check(form instanceof FormData,"Voice request not multipart");
check(form.get("voiceConsent")==="true"&&form.get("useVoiceReference")==="true","Explicit voice consent missing");
check(form.get("voice") instanceof Blob,"Voice file not attached");
console.log("NEURIA_MOBILE_UI PASS Pulse voice opt-in and submission");
document.querySelector("#pulseBack").click();
open("Aura — Reconnaissance musicale");
check(document.querySelector("#ntRecord")&&document.querySelector("#ntFile"),"Aura microphone or audio import missing");
document.querySelector("#ntBack").click();
open("Oracle — Avatar 3D");
check(document.querySelector("#ntPrompt")&&document.querySelector("#ntGo"),"Oracle mobile input missing");
console.log("NEURIA_MOBILE_UI PASS Aura microphone and Oracle generation controls");
