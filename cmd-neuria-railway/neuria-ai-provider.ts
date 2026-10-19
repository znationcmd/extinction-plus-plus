/** Server-only credentials. Accepts accidental whitespace in environment variable names. */
export function aiConfiguration(env:Record<string,string|undefined>=Bun.env){
 const entry=Object.entries(env).find(([name,value])=>name.trim()==='GEMINI_API_KEY'&&!!value?.trim());
 const geminiKey=entry?.[1]?.trim();
 if(geminiKey&&!geminiKey.includes('${{'))return {endpoint:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',token:geminiKey,model:env.NEURIA_GEMINI_MODEL?.trim()||'gemini-3.8-flash',provider:'google',normalizedKeyName:entry![0]!=='GEMINI_API_KEY'};
 return {endpoint:env.NEURIA_AI_ENDPOINT||'',token:env.NEURIA_AI_API_KEY||'',model:env.NEURIA_AI_MODEL||'',provider:(env.NEURIA_AI_ENDPOINT||'').includes('cloudflare.com')?'cloudflare':'other',normalizedKeyName:false};
}
export function aiPublicStatus(env:Record<string,string|undefined>=Bun.env){
 const selected=aiConfiguration(env);const configured=!!(selected.endpoint&&selected.token&&selected.model),unresolved=selected.token.includes('${{');
 return {configured,unresolved,provider:selected.provider,model:selected.model||null,ready:configured&&!unresolved,normalizedKeyName:selected.normalizedKeyName,note:'Configuration uniquement. Une réponse réelle est nécessaire pour confirmer le fonctionnement.'};
}
export function aiGenerationOptions(provider:string,length:string='normal'){
 return provider==='google'?{max_tokens:length==='court'?1024:length==='detaille'?4096:2048,reasoning_effort:'low'}:{};
}

/** Retry a temporary Gemini refusal through the existing configured provider. */
export async function fetchAI(endpoint:string,options:RequestInit,env:Record<string,string|undefined>=Bun.env,request:typeof fetch=fetch){
 const selected=aiConfiguration(env);
 let response:Response;
 try{
  const signal=selected.provider==='google'?AbortSignal.any([...(options.signal?[options.signal]:[]),AbortSignal.timeout(15000)]):options.signal;
  response=await request(endpoint,{...options,signal});
 }catch(error){
  if(selected.provider!=='google'||options.signal?.aborted)throw error;
  response=new Response('{}',{status:504});
 }
 if(selected.provider==='google'&&[429,500,502,503,504].includes(response.status)&&!options.signal?.aborted){
  const fallback=aiConfiguration(Object.fromEntries(Object.entries(env).filter(([name])=>name.trim()!=='GEMINI_API_KEY')));
  if(fallback.endpoint&&fallback.token&&fallback.model&&!fallback.token.includes('${{')){
   const body=JSON.parse(String(options.body||'{}'));body.model=fallback.model;delete body.reasoning_effort;
   const result=await request(fallback.endpoint,{...options,headers:{'content-type':'application/json',authorization:'Bearer '+fallback.token},body:JSON.stringify(body)});
   return Object.assign(result,{neuriaModel:fallback.model,neuriaProvider:fallback.provider,neuriaFallback:true,neuriaPrimaryStatus:response.status});
  }
 }
 return Object.assign(response,{neuriaModel:selected.model,neuriaProvider:selected.provider,neuriaFallback:false,neuriaPrimaryStatus:response.status});
}
