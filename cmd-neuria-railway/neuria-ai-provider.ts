/** CMD NEURIA - provider selection and resilient, server-only Google Gemini integration. */
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

type ProviderReply=Response & {neuriaModel?:string;neuriaProvider?:string;neuriaFallback?:boolean;neuriaPrimaryStatus?:number;neuriaPrimaryReason?:string};
function annotate(r:Response,values:{model:string;provider:string;fallback:boolean;status:number;reason:string}):ProviderReply{
 return Object.assign(r,{neuriaModel:values.model,neuriaProvider:values.provider,neuriaFallback:values.fallback,neuriaPrimaryStatus:values.status,neuriaPrimaryReason:values.reason}) as ProviderReply;
}

/** A metadata-only check. No text is generated, and neither the key nor Google's raw response is logged. */
export async function probeGeminiAccess(env:Record<string,string|undefined>=Bun.env,request:typeof fetch=fetch){
 const config=aiConfiguration(env);
 if(config.provider!=='google')return {configured:false,status:'not_selected',httpStatus:null,model:null};
 try{
  const url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(config.model);
  const result=await request(url,{method:'GET',headers:{'x-goog-api-key':config.token,'accept':'application/json'},signal:AbortSignal.timeout(8500)});
  // A 200 proves this key can access model metadata, not that inference is available.
  const classification=result.ok?'model_accessible':result.status===400?'invalid_request':result.status===401?'key_rejected':result.status===403?'access_forbidden':result.status===404?'model_not_accessible':result.status===429?'quota_limited':result.status===503?'google_unavailable':'google_error';
  return {configured:true,status:classification,httpStatus:result.status,model:config.model};
 }catch(e:any){
  return {configured:true,status:e?.name==='TimeoutError'||e?.name==='AbortError'?'metadata_timeout':'metadata_network_error',httpStatus:null,model:config.model};
 }
}

/** Retry one short-lived Google 503/429/5xx, then use the existing configured GPT-OSS fallback.
 * The total upstream request still obeys the calling chat handler's 45-second deadline.
 */
export async function fetchAI(endpoint:string,options:RequestInit,env:Record<string,string|undefined>=Bun.env,request:typeof fetch=fetch):Promise<ProviderReply>{
 const selected=aiConfiguration(env);
 if(selected.provider!=='google'){
  const direct=await request(endpoint,options);
  return annotate(direct,{model:selected.model,provider:selected.provider,fallback:false,status:direct.status,reason:'direct'});
 }
 let response:Response|undefined;
 let reason='response',status=504;
 const deadline=AbortSignal.timeout(24000);
 const signal=options.signal?AbortSignal.any([options.signal,deadline]):deadline;
 for(let attempt=0;attempt<2;attempt++){
  if(options.signal?.aborted)throw options.signal.reason;
  try{
   response=await request(endpoint,{...options,signal});
   status=response.status;
   reason='http_'+status;
  }catch(e:any){
   if(options.signal?.aborted)throw e;
   response=undefined;
   status=504;
   reason=deadline.aborted?'timeout':(e?.name==='TimeoutError'||e?.name==='AbortError'?'timeout':'network_error');
  }
  const retryable=(!response||[429,500,502,503,504].includes(response.status));
  if(!retryable||attempt===1||deadline.aborted)break;
  await new Promise(resolve=>setTimeout(resolve,700));
 }
 if(response&&!([429,500,502,503,504].includes(response.status))){
  return annotate(response,{model:selected.model,provider:selected.provider,fallback:false,status:response.status,reason});
 }
 // Log only a numeric HTTP status/reason; never log credentials or the request body.
 console.info('[NEURIA_GEMINI] primary='+status+' reason='+reason+' -> configured fallback');
 const fallback=aiConfiguration(Object.fromEntries(Object.entries(env).filter(([name])=>name.trim()!=='GEMINI_API_KEY')));
 if(fallback.endpoint&&fallback.token&&fallback.model&&!fallback.token.includes('${{')&&!options.signal?.aborted){
  const body=JSON.parse(String(options.body||'{}'));
  body.model=fallback.model;
  delete body.reasoning_effort;
  const result=await request(fallback.endpoint,{...options,headers:{'content-type':'application/json',authorization:'Bearer '+fallback.token},body:JSON.stringify(body)});
  return annotate(result,{model:fallback.model,provider:fallback.provider,fallback:true,status,reason});
 }
 if(response)return annotate(response,{model:selected.model,provider:selected.provider,fallback:false,status,reason});
 return annotate(new Response('{"error":{"code":"GEMINI_TIMEOUT"}}',{status:504,headers:{'content-type':'application/json'}}),{model:selected.model,provider:selected.provider,fallback:false,status,reason});
}
