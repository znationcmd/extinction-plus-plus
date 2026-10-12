/* CMD Sphere Studio: deterministic, transparent recommendation heuristics.
   Not TikTok's proprietary model. Works only with public CMD Sphere videos and
   each authenticated member's interactions, never with private server videos. */
const STOP=new Set(["dans","pour","avec","sans","cette","comme","plus","moins","video","vidéo","studio","sphere","cmd","the","and","from","your","une","des","les","aux","est","que","qui","sur","par","you","are","tout","tous"]);
export function studioWords(value){
 return [...new Set(String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").match(/[#\p{L}\p{N}]{3,}/gu)||[])].filter(w=>!STOP.has(w)&&w.length<=35).slice(0,14);
}
function preferenceWeights(rows){
 const result=new Map();
 for(const r of rows||[]){
  const weight=Number(r.weight)||1;
  for(const word of studioWords(r.title))result.set(word,Math.min(15,(result.get(word)||0)+weight));
 }
 return result;
}
export function rankStudioFeed(items,interests={},clock=Date.now()){
 const positive=preferenceWeights(interests.positive);
 const negative=preferenceWeights(interests.negative);
 const seenAuthors=new Map();
 for(const r of interests.positive||[])if(r.user_id)seenAuthors.set(String(r.user_id),(seenAuthors.get(String(r.user_id))||0)+1);
 const ranked=items.map(v=>{
  const age=Math.max(0,(clock-new Date(v.created_at).getTime())/86400000);
  const words=studioWords(v.title);
  const similarity=Math.min(5,words.reduce((sum,w)=>sum+(positive.get(w)||0)*.65,0));
  const dislike=Math.min(8,words.reduce((sum,w)=>sum+(negative.get(w)||0)*1.3,0));
  const fresh=2.6/(1+age/7);
  const social=Math.min(4,Math.log1p(Number(v.likes)||0)*.65+Math.log1p(Number(v.comments)||0)*.35);
  const quality=Math.min(3,Math.log1p(Number(v.completions)||0)*.65+Math.log1p(Number(v.views)||0)*.18);
  const creator=Math.min(2,(seenAuthors.get(String(v.user_id))||0)*.6);
  const following=v.following?1.4:0;
  const watched=v.watched_seconds>3?2.2:0;
  const score=fresh+social+quality+similarity+creator+following-dislike-watched;
  const why=v.following?"Tu suis ce créateur":similarity>1?"Tu as regardé des vidéos sur des sujets proches":social+quality>2?"Cette vidéo intéresse la communauté":"Découvre un nouveau créateur";
  const {watched_seconds,completions,views,...safe}=v;
  return {...safe,why,_score:score};
 }).sort((a,b)=>b._score-a._score||new Date(b.created_at)-new Date(a.created_at)||String(a.id).localeCompare(String(b.id)));
 // Nearby alternatives reduce back-to-back posts from the same author.
 for(let i=1;i<ranked.length;i++){
  if(ranked[i].user_id!==ranked[i-1].user_id)continue;
  const next=ranked.findIndex((v,j)=>j>i&&j<=i+12&&v.user_id!==ranked[i-1].user_id&&ranked[i]._score-v._score<3);
  if(next>=0){const [alternative]=ranked.splice(next,1);ranked.splice(i,0,alternative)}
 }
 return ranked.map(({_score,...publicItem})=>publicItem);
}
