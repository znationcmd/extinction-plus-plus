/* CMD Sphere shared provider: server-side only. No user token required. */
/* Cloudflare Workers AI can be used with the account's included free quota. */
/* Production billing policy must be configured in the provider dashboard. */
const base=()=>String(process.env.CLOUDFLARE_ACCOUNT_ID||"").trim();
const token=()=>String(process.env.CLOUDFLARE_AI_API_TOKEN||"").trim();
export function cmdFreeProviderConfigured(){return Boolean(base()&&token())}
export function cmdImageGenerationConfigured(){return cmdFreeProviderConfigured()}
const usage=new Map();let daily={day:new Date().toISOString().slice(0,10),images:0};
export async function cmdCloudflareReply(message,history=[]){
 if(!cmdFreeProviderConfigured())return null;
 const dialogue=[{role:"system",content:"Tu es CMD IA, assistant convivial de CMD Sphere, ouvert gratuitement aux membres dans les limites du quota du fournisseur. Aide pour les questions, recettes, rédaction, jeux, programmation et explications. Réponds dans la langue du membre. N'invente jamais des données en temps réel, une génération d'image ou une action non effectuée."}];
 for(const x of (Array.isArray(history)?history:[]).slice(-8)){
  if(["user","assistant"].includes(x?.role)&&typeof x.text==="string")
   dialogue.push({role:x.role,content:x.text.slice(0,1300)});
 }
 dialogue.push({role:"user",content:String(message||"").slice(0,1800)});
 try{
  const result=await fetch("https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(base())+"/ai/run/@cf/zai-org/glm-4.7-flash",{
   method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token()},
   body:JSON.stringify({messages:dialogue,max_completion_tokens:650}),signal:AbortSignal.timeout(16000)
  });
  if(!result.ok)return null;
  const d=await result.json();
  const text=d.result?.response||d.result?.choices?.[0]?.message?.content||d.result?.output?.[0]?.content?.[0]?.text;
  const out=typeof text==="string"?text:Array.isArray(text)?text.map(x=>String(x.text||"")).join("\n"):"";
  return out.trim().slice(0,5000)||null;
 }catch{return null}
}
export async function cmdGenerateSharedImage(userId,prompt){
 if(!cmdImageGenerationConfigured())throw Object.assign(new Error("La génération d'images sera disponible après l'activation du fournisseur gratuit par CMD Sphere."),{status:503});
 const description=String(prompt||"").trim().slice(0,500);
 if(description.length<5)throw Object.assign(new Error("Décris l'image souhaitée plus précisément."),{status:400});
 const today=new Date().toISOString().slice(0,10);
 if(daily.day!==today)daily={day:today,images:0};
 if(daily.images>=40)throw Object.assign(new Error("Le quota quotidien des images est atteint. Réessaie demain."),{status:429});
 const me=String(userId||"anonymous"),now=Date.now();
 if(now-(usage.get(me)||0)<120000)throw Object.assign(new Error("Pour garder l'IA gratuite pour tous, attends deux minutes entre deux images."),{status:429});
 usage.set(me,now);daily.images++;
 if(usage.size>2500){for(const [k,v] of usage){if(now-v>86400000)usage.delete(k)}}
 const request=await fetch("https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(base())+"/ai/run/@cf/black-forest-labs/flux-1-schnell",{
  method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token()},
  body:JSON.stringify({prompt:description,steps:4}),signal:AbortSignal.timeout(38000)
 }).catch(()=>null);
 if(!request?.ok)throw Object.assign(new Error("Le fournisseur d'images est indisponible ou son quota gratuit est atteint."),{status:503});
 let json;try{json=await request.json()}catch{}
 const picture=json?.result?.image;
 if(typeof picture!=="string"||picture.length<100)throw Object.assign(new Error("Aucune image n'a été renvoyée par le fournisseur."),{status:503});
 return {image:"data:image/jpeg;base64,"+picture,model:"FLUX.1 schnell",prompt:description};
}
