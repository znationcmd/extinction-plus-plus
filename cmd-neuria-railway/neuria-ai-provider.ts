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
