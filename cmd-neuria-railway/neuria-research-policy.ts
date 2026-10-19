/** Shared policy for current-information questions; provider output stays untrusted data. */
export function shouldResearch(question:string,setting:string='auto'){
 if(setting==='off')return false;
 if(setting==='on')return true;
 return /recherch|cherch|internet|\bweb\b|source|actualité|aujourd.hui|maintenant|récent|derni[eè]r|prix|tarif|co[uû]t|version|mise [àa] jour|documentation|\bapi\b|horaire|disponib|qui est|qu.est.ce que|définition|histoire de|wikip[eé]dia|research|search|latest|who is|what is|\b20[2-9]\d\b/i.test(question);
}
export function normalizeResearch(found:any){
 const seen=new Set<string>();const sources=[];
 for(const item of Array.isArray(found?.results)?found.results:[]){
  if(sources.length>=6)break;
  try{const u=new URL(item.url);if(u.protocol!=='https:'||u.username||u.password||seen.has(u.href))continue;seen.add(u.href);sources.push({title:String(item.title||u.hostname).slice(0,180),url:u.href,excerpt:String(item.description||item.excerpt||'').replace(/<[^>]*>/g,'').slice(0,600)})}catch{}
 }
 return {provider:sources.length?String(found?.provider||'Web'):'none',sources};
}
