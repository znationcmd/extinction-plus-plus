/* CMD Sphere — real, account-persisted premium profile additions.
   User-declared social links are not presented as OAuth-verified connections. */
const allowed=new Set(["facebook","instagram","tiktok","x","youtube","steam","playstation","xbox","nintendo","spotify","website"]);
const providerHost={facebook:["facebook.com","fb.com"],instagram:["instagram.com"],tiktok:["tiktok.com"],x:["x.com","twitter.com"],youtube:["youtube.com","youtu.be"],steam:["steamcommunity.com"],playstation:["playstation.com","psnprofiles.com"],xbox:["xbox.com"],nintendo:["nintendo.com"],spotify:["spotify.com","open.spotify.com"]};
function normalizeLinks(raw){
 const arr=Array.isArray(raw)?raw:[],links=[];
 for(const x of arr.slice(0,18)){
  const platform=String(x?.platform||"").toLowerCase().trim();if(!allowed.has(platform))continue;
  let url;try{url=new URL(String(x?.url||"").trim())}catch{continue}
  if(url.protocol!=="https:"||url.username||url.password||url.href.length>500)continue;
  if(platform!=="website"&&!providerHost[platform].some(host=>url.hostname===host||url.hostname.endsWith("."+host)))continue;
  if(links.some(l=>l.platform===platform))continue;
  links.push({platform,url:url.toString()});
 }
 return links;
}
function json(res,status,data){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(data))}
export async function initCmdProfilePremium(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_profile_premium(user_id TEXT PRIMARY KEY,private_note TEXT NOT NULL DEFAULT '',wishlist JSONB NOT NULL DEFAULT '[]'::jsonb,social_links JSONB NOT NULL DEFAULT '[]'::jsonb,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
}
export async function handleCmdProfilePremium(req,res,url,{pool,auth}){
 if(url.pathname!=="/api/profile/premium")return false;
 if(!auth?.user?.id){json(res,401,{error:"Connecte-toi à CMD Sphere."});return true}
 const uid=String(auth.user.id);
 try{
  if(req.method==="GET"){
   const r=await pool.query("SELECT private_note,wishlist,social_links FROM cmd_profile_premium WHERE user_id=$1",[uid]);const v=r.rows[0]||{};
   json(res,200,{note:v.private_note||"",wishlist:Array.isArray(v.wishlist)?v.wishlist:[],socialLinks:Array.isArray(v.social_links)?v.social_links:[]});return true;
  }
  if(req.method==="POST"){
   const parts=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>24*1024)throw Error("Profil trop volumineux");parts.push(chunk)}
   const raw=JSON.parse(Buffer.concat(parts).toString("utf8"));
   const note=String(raw.note||"").slice(0,1200);
   const wishlist=Array.isArray(raw.wishlist)?raw.wishlist.slice(0,35).map(s=>String(s||"").trim().slice(0,140)).filter(Boolean):[];
   const unique=[...new Set(wishlist)].slice(0,35);
   const links=normalizeLinks(raw.socialLinks);
   await pool.query("INSERT INTO cmd_profile_premium(user_id,private_note,wishlist,social_links) VALUES($1,$2,$3::jsonb,$4::jsonb) ON CONFLICT(user_id) DO UPDATE SET private_note=EXCLUDED.private_note,wishlist=EXCLUDED.wishlist,social_links=EXCLUDED.social_links,updated_at=NOW()",[uid,note,JSON.stringify(unique),JSON.stringify(links)]);
   json(res,200,{ok:true,note,wishlist:unique,socialLinks:links});return true;
  }
  json(res,405,{error:"Méthode non autorisée"});return true;
 }catch(e){json(res,400,{error:e.message||"Profil indisponible"});return true}
}
