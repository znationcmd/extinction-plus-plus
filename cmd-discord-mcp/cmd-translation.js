/* CMD Sphere — opt-in free message translation.
   Providers used only after a reader explicitly clicks "Traduire".
   The original message is never modified. No paid API key is needed.
   Availability of free public endpoints is not guaranteed. */
const allowed=new Set(["fr","en","de","es","it","ru","ko","ja","zh","co","pt"]);
const cache=new Map();
const hitTimes=new Map();
const MAX_MESSAGE=1700;
function fail(message,status=503){const e=new Error(message);e.status=status;throw e}
async function getJson(url,timeout=7000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const r=await fetch(url,{headers:{"accept":"application/json","user-agent":"CMD-Sphere/1.0"},signal:ctrl.signal});
    if(!r.ok)fail("Le service gratuit de traduction ne répond pas (HTTP "+r.status+").");
    return await r.json();
  }finally{clearTimeout(timer)}
}
function rateLimit(userId){
  const now=Date.now(),key=String(userId),list=(hitTimes.get(key)||[]).filter(t=>now-t<60000);
  if(list.length>=15)fail("Limite gratuite : patiente une minute avant de retraduire.",429);
  list.push(now);hitTimes.set(key,list);
  if(hitTimes.size>4000){for(const [k,v] of hitTimes){if(!v.some(t=>now-t<60000))hitTimes.delete(k)}}
}
function decode(s){return String(s||"").replace(/&quot;/g,'"').replace(/&#39;|&#x27;/gi,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&")}
async function googlePublic(text,target){
  const query=new URLSearchParams({client:"gtx",sl:"auto",tl:target,dt:"t",q:text});
  const out=await getJson("https://translate.googleapis.com/translate_a/single?"+query.toString());
  const translated=(Array.isArray(out?.[0])?out[0]:[]).map(part=>String(part?.[0]||"")).join("").trim();
  if(!translated)fail("Traduction non disponible.");
  return {translatedText:translated,sourceLanguage:String(out[2]||"auto"),provider:"service public"};
}
// MyMemory free API accepts at most 500 UTF-8 bytes per request.
function splitForMyMemory(message,maxBytes=440){
  const parts=[],encoder=new TextEncoder(),words=String(message).split(/(\s+)/);
  let current="";
  for(const word of words){
    if(encoder.encode(current+word).length<=maxBytes){current+=word;continue}
    if(current.trim()){parts.push(current);current=""}
    if(encoder.encode(word).length<=maxBytes){current=word;continue}
    let piece="";
    for(const char of word){
      if(encoder.encode(piece+char).length>maxBytes){if(piece)parts.push(piece);piece=""}
      piece+=char;
    }
    current=piece;
  }
  if(current.trim())parts.push(current);
  return parts;
}
function likelySource(message,target){
  const m=String(message).toLowerCase();
  const english=/\b(the|hello|thanks|you|your|please|what|with|this|have|good|can|how|where)\b/g;
  const french=/\b(le|la|les|des|bonjour|merci|vous|avec|pour|dans|est|une|pas|comment|salut)\b/g;
  const en=(m.match(english)||[]).length,fr=(m.match(french)||[]).length;
  return fr>en?"fr":en>fr?"en":target==="fr"?"en":"fr";
}
async function myMemory(text,target,source){
  // The free memory provider has no language auto-detect: estimate the source.
  const from=allowed.has(source)&&source!==target?source:likelySource(text,target);
  if(from===target)fail("Langue source non reconnue pour le service gratuit.");
  const translated=[];
  for(const part of splitForMyMemory(text)){
    const query=new URLSearchParams({q:part,langpair:from+"|"+target});
    const out=await getJson("https://api.mymemory.translated.net/get?"+query.toString());
    const result=decode(out?.responseData?.translatedText||"").trim();
    if(Number(out?.responseStatus||0)!==200||!result||/^MYMEMORY WARNING/i.test(result))
      fail("Paire de langues indisponible auprès du service gratuit.");
    translated.push(result);
  }
  const value=translated.join(" ").trim();
  if(value===text&&source!==target)fail("Ce service n'a fourni aucune traduction.");
  return {translatedText:value,sourceLanguage:from,provider:"MyMemory (source estimée)"};
}

export async function freeMessageTranslation({userId,text,target,source="auto"}){
  const content=String(text||"").trim(),lang=target==="us"?"en":String(target||"").trim().toLowerCase();
  if(!allowed.has(lang))fail("Langue demandée non disponible.",400);
  if(!content||content.length>MAX_MESSAGE)fail("Sélectionne un message de 1 à 1 700 caractères.",400);
  if(source===lang)return {translatedText:content,sourceLanguage:source,provider:"identique"};
  const key=lang+"|"+source+"|"+content;
  const old=cache.get(key);if(old&&Date.now()-old.at<3*3600*1000)return old.value;
  rateLimit(userId);
  let translated=null,reason="";
  try{translated=await googlePublic(content,lang)}catch(e){reason=e.message}
  if(!translated){
    try{translated=await myMemory(content,lang,source)}
    catch(e){reason+=" ; "+e.message}
  }
  if(!translated)fail("Traduction indisponible actuellement pour "+lang+". Le message original reste visible. "+reason);
  const value={...translated,targetLanguage:lang};
  cache.set(key,{value,at:Date.now()});
  if(cache.size>700){const first=cache.keys().next().value;cache.delete(first)}
  return value;
}
