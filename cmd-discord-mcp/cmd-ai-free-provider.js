/* CMD Sphere shared provider: server-side only. No user token required. */
/* Cloudflare Workers AI can be used with the account's included free quota. */
/* Production billing policy must be configured in the provider dashboard. */
const base=()=>String(process.env.CLOUDFLARE_ACCOUNT_ID||"").trim();
const token=()=>String(process.env.CLOUDFLARE_AI_API_TOKEN||"").trim();
export function cmdFreeProviderConfigured(){return Boolean(base()&&token())}
export function cmdImageGenerationConfigured(){return cmdFreeProviderConfigured()}
const usage=new Map();let daily={day:new Date().toISOString().slice(0,10),images:0};
export async function cmdCloudflareReply(message,history=[],options={}){
 if(!cmdFreeProviderConfigured())return null;
 const dialogue=[{role:"system",content:"Tu es CMD IA, assistant convivial de CMD Sphere, ouvert gratuitement aux membres dans les limites du quota du fournisseur. Aide pour les questions, recettes, rédaction, jeux, programmation et explications. Réponds dans la langue du membre. N'invente jamais des données en temps réel, une génération d'image ou une action non effectuée."}];
 for(const x of (Array.isArray(history)?history:[]).slice(-8)){
  if(["user","assistant"].includes(x?.role)&&typeof x.text==="string")
   dialogue.push({role:x.role,content:x.text.slice(0,1300)});
 }
 dialogue.push({role:"user",content:String(message||"").slice(0,Math.min(24000,Number(options.maxInput)||1800))});
 try{
  const result=await fetch("https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(base())+"/ai/run/@cf/zai-org/glm-4.7-flash",{
   method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token()},
   body:JSON.stringify({messages:dialogue,max_completion_tokens:Math.min(5200,Number(options.maxOutputTokens)||900)}),signal:AbortSignal.timeout(16000)
  });
  if(!result.ok)return null;
  const d=await result.json();
  const text=d.result?.response||d.result?.choices?.[0]?.message?.content||d.result?.output?.[0]?.content?.[0]?.text;
  const out=typeof text==="string"?text:Array.isArray(text)?text.map(x=>String(x.text||"")).join("\n"):"";
  return out.trim().slice(0,Math.min(28000,Number(options.maxOutputChars)||24000))||null;
 }catch{return null}
}
// Multimodal question answering for a member-supplied, temporary photo.
export async function cmdCloudflareVisionReply(question,imageData){
 if(!cmdFreeProviderConfigured())return null;
 try{
  const messages=[
   {role:"system",content:"Tu es CMD IA. Analyse honnêtement la photo fournie et réponds en français ou dans la langue du membre. Ne devine pas l'identité des personnes. N'invente pas d'éléments invisibles."},
   {role:"user",content:[{type:"text",text:String(question||"Décris cette image.").slice(0,800)},{type:"image_url",image_url:{url:String(imageData)}}]}
  ];
  const response=await fetch("https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(base())+"/ai/run/@cf/google/gemma-4-26b-a4b-it",{
   method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token()},
   body:JSON.stringify({messages,max_completion_tokens:850}),signal:AbortSignal.timeout(25000)
  });
  if(!response.ok)return null;
  const data=await response.json();
  const r=data.result?.response||data.result?.choices?.[0]?.message?.content||data.result?.output?.[0]?.content?.[0]?.text;
  return typeof r==="string"?r.trim().slice(0,3500):null;
 }catch{return null}
}

export async function cmdGenerateSharedImage(userId,prompt,referenceImage=null){
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
 let request;
 if(referenceImage){
  // FLUX.2 Klein supports true image-to-image editing with an uploaded source.
  // Input must be an actual image, not a text prompt pretending to have edited one.
  const sharp=(await import("sharp")).default;
  const raw=String(referenceImage);
  const match=/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw);
  if(!match||match[1].length>3500000)throw Object.assign(new Error("Photo invalide ou trop volumineuse (JPG, PNG ou WebP)."),{status:400});
  let bytes;
  try{bytes=await sharp(Buffer.from(match[1],"base64"),{failOn:"error",limitInputPixels:22000000}).rotate().resize(480,480,{fit:"inside",withoutEnlargement:true}).jpeg({quality:86}).toBuffer()}
  catch{throw Object.assign(new Error("Photo illisible. Choisis une photo JPG, PNG ou WebP."),{status:400})}
  const form=new FormData();
  form.append("prompt",description);
  form.append("input_image_0",new Blob([bytes],{type:"image/jpeg"}),"photo.jpg");
  form.append("width","768");form.append("height","768");
  request=await fetch("https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(base())+"/ai/run/@cf/black-forest-labs/flux-2-klein-4b",{
   method:"POST",headers:{"authorization":"Bearer "+token()},body:form,signal:AbortSignal.timeout(45000)
  }).catch(()=>null);
 }else{
  request=await fetch("https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(base())+"/ai/run/@cf/black-forest-labs/flux-1-schnell",{
   method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token()},
   body:JSON.stringify({prompt:description,steps:4}),signal:AbortSignal.timeout(38000)
  }).catch(()=>null);
 }
 if(!request?.ok){
  const unavailable=referenceImage?"Le modèle de retouche d'image est indisponible sur ce compte ou son quota gratuit est épuisé. La photo d'origine reste intacte.":"Le fournisseur d'images est indisponible ou son quota gratuit est atteint.";
  throw Object.assign(new Error(unavailable),{status:request?.status===429?429:503});
 }
 let json;try{json=await request.json()}catch{}
 const picture=json?.result?.image;
 if(typeof picture!=="string"||picture.length<100)throw Object.assign(new Error("Aucune image n'a été renvoyée par le fournisseur."),{status:503});
 return {image:"data:image/jpeg;base64,"+picture,model:referenceImage?"FLUX.2 klein (retouche)":"FLUX.1 schnell",prompt:description};
}
