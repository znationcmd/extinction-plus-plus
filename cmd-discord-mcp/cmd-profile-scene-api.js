import "./unpack-profile-assets.cjs";
import {readFileSync} from "node:fs";
const individualUniverse=JSON.parse(readFileSync(new URL("./public/universe/v1/manifest.json",import.meta.url),"utf8"));
/* CMD Sphere — personalized avatar-and-pet scene rendered inside the existing profile banner. */
const HD_SCENES=JSON.parse(readFileSync(new URL("./cmd-hd-scenes.json",import.meta.url),"utf8"));
const SCENES=new Set(["none",...individualUniverse.scenes.map(x=>x.id),...HD_SCENES.map(x=>x.id)]);
const HAIR=new Set(["short","long","curly","bob","shaved","ponytail","buzz","fade","crop","undercut","quiff","swept","wavy","afro","braids","locs"]);
const BEARDS=new Set(["none","stubble","short","trimmed","full","long","goatee","mustache"]);
const FACE_SHAPES=new Set(["oval","round","square","heart"]);
const BROW_STYLES=new Set(["natural","thick","thin","arched"]);
const EYE_SHAPES=new Set(["normal","wide","almond"]);
const BEARD_COLORS=new Set(["#201b27","#58372a","#a65d32","#dcc071","#9b9ba9","#d76884","#f7f0e1"]);
const TOPS=new Set(["hoodie","tshirt","jacket","shirt","polo","sweater","coat","dress","sport","suit","armor"]);
const BOTTOMS=new Set(["jeans","dark","shorts","skirt","cargo","formal","baggy","wide","joggers"]);
const SHOES=new Set(["sneakers","boots","sandals","formal"]);
const PETS=new Set(["none",...individualUniverse.pets.map(x=>x.id)]);
for(const item of individualUniverse.pets)PETS.add(item.id);
const POSES=new Set(["stand","wave","peace","crossed","walk","run","dance"]);
const ACCESSORIES=new Set(["none","glasses","sunglasses","hat","cap","headphones","earrings","necklace","crown","roundglasses","aviator","mask","beanie","bucket","cowboy","hoops","studs"]);
const GENDERS=new Set(["male","female","neutral"]);
const STYLES=new Set(["3d","2d","illustrated","photo"]);
const AVATAR_MODELS=new Set(["civilian","soldier","michelle","custom"]);
const PRESETS=new Set(["guardian","nocturne","azur","luna","nova","iris",...Array.from({length:68},(_,i)=>"reference-avatar-"+i)]);
const PET_MODELS=new Set(["fox","cat","horse","parrot","duck","flamingo","stork","dog","rabbit","wolf","turtle","custom",...PETS]);
const BODY_TYPES=new Set(["slim","average","athletic"]);
const EYE_COLORS=new Set(["#28222e","#674931","#4587a5","#5b8e67","#aa9080"]);
const NOSES=new Set(["small","standard","defined"]);
const MOUTHS=new Set(["smile","neutral","soft"]);
const BAGS=new Set(["none","tote","handbag","crossbody","backpack","mini","clutch"]);
const PIERCINGS=new Set(["none","nose-stud","nose-ring","septum","brow-left","brow-right","lip-left","lip-right","labret","double-lip","ear-studs","ear-hoops","ear-chain"]);
const VEHICLES=new Set(["none",...individualUniverse.vehicles.map(x=>x.id)]);
for(const item of individualUniverse.vehicles)VEHICLES.add(item.id);
const HOMES=new Set(["none",...individualUniverse.homes.map(x=>x.id)]);
const COLORS=new Set(["#f7cb9e","#e8ad7e","#c68a60","#905a3d","#573b30","#2f2728"]);
const HAIR_COLORS=new Set(["#201b27","#58372a","#a65d32","#dcc071","#9b9ba9","#d76884","#f7f0e1"]);
const OUTFIT_COLORS=new Set(["#ffffff","#212331","#7549b9","#237a9b","#d24e79","#e6a53a","#317f67","#b23b3b"]);
const defaultConfig=()=>({scene:"none",avatarPreset:"reference-avatar-0",gender:"neutral",skin:"#f7cb9e",hair:"short",hairColor:"#201b27",beard:"none",beardColor:"#201b27",faceShape:"oval",browStyle:"natural",eyeShape:"normal",top:"hoodie",topColor:"#7549b9",bottom:"jeans",shoes:"sneakers",bag:"none",piercing:"none",pet:"none",pose:"stand",accessory:"none",avatarStyle:"2d",petStyle:"2d",avatarModel:"civilian",petModel:"fox",vehicle:"none",home:"none",hideHome:true,petName:"",bodyType:"average",eyeColor:"#28222e",nose:"standard",mouth:"smile",label:""});
const clean=(v,a,def)=>a.has(String(v||""))?String(v):def;
function config(input){
 const a=input&&typeof input==="object"?input:{},d=defaultConfig(),result={...d};
 for(const [key,set] of Object.entries({scene:SCENES,avatarPreset:PRESETS,gender:GENDERS,skin:COLORS,hair:HAIR,hairColor:HAIR_COLORS,beard:BEARDS,beardColor:BEARD_COLORS,faceShape:FACE_SHAPES,browStyle:BROW_STYLES,eyeShape:EYE_SHAPES,top:TOPS,topColor:OUTFIT_COLORS,bottom:BOTTOMS,shoes:SHOES,bag:BAGS,piercing:PIERCINGS,pet:PETS,pose:POSES,accessory:ACCESSORIES,avatarStyle:STYLES,petStyle:STYLES,avatarModel:AVATAR_MODELS,petModel:PET_MODELS,vehicle:VEHICLES,home:HOMES,bodyType:BODY_TYPES,eyeColor:EYE_COLORS,nose:NOSES,mouth:MOUTHS})){result[key]=clean(a[key],set,d[key])}
 if(!/^reference-avatar-/.test(result.avatarPreset))result.avatarPreset="reference-avatar-0";result.avatarStyle="2d";result.petStyle="2d";
 result.label=String(a.label||"").trim().slice(0,42);
 result.petName=String(a.petName||"").trim().slice(0,40);
 result.hideHome=a.hideHome!==false;
 return result;
}
function send(res,status,body){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(body))}
function checkCustom(value){
 if(value===null)return null;
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(value||""));
 if(!match)throw Error("Image personnelle : PNG, JPEG ou WebP requis.");
 const bytes=Buffer.from(match[2],"base64");
 if(!bytes.length||bytes.length>2*1024*1024)throw Error("Fond personnel limité à 2 Mo après optimisation.");
 if(match[1]==="png"&&bytes.subarray(0,8).toString("hex")!=="89504e470d0a1a0a")throw Error("Fichier PNG invalide.");
 if(match[1]==="jpeg"&&bytes.subarray(0,3).toString("hex")!=="ffd8ff")throw Error("Fichier JPEG invalide.");
 if(match[1]==="webp"&&!(bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP"))throw Error("Fichier WebP invalide.");
 return value;
}
export async function initCmdProfileScene(pool){
 await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS cmd_avatar_scene JSONB NOT NULL DEFAULT '{}'::jsonb");
 await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS cmd_avatar_scene_image TEXT");
 await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS cmd_avatar_character_image TEXT");
 await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS cmd_avatar_pet_image TEXT");
 await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS cmd_profile_public BOOLEAN NOT NULL DEFAULT FALSE");
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function safeImage(value){
 const s=String(value||"");
 return /^(https:\/\/[^"<> ]{1,2048}|data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]{20,})$/.test(s)?s:"";
}
function publicProfileHtml(record){
 const scene=config(record.cmd_avatar_scene);
 const name=escapeHtml(record.display_name||"Membre CMD Sphere");
 const about=escapeHtml(record.bio||"Retrouve-moi sur CMD Sphere.");
 const avatar=safeImage(record.avatar_data_url),banner=safeImage(record.banner_data_url);
 const animal=scene.pet!=="none"?"<p>🐾 Compagnon : "+escapeHtml(scene.petName||scene.pet)+"</p>":"";
 const vehicle=scene.vehicle!=="none"?"<p>🚘 Véhicule : "+escapeHtml(scene.vehicle)+"</p>":"";
 const home=scene.hideHome===false&&scene.home!=="none"?"<p>🏡 Maison virtuelle : "+escapeHtml(scene.home)+"</p>":"";
 const bannerStyle=banner?' style="background-image:url(&quot;'+escapeHtml(banner)+'&quot;)"':"";
 const icon=avatar?'<img class="avatar" src="'+escapeHtml(avatar)+'" alt="Avatar du profil">':'<div class="avatar placeholder">CMD</div>';
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
 '<meta name="robots" content="noindex,nofollow"><meta property="og:type" content="profile"><meta property="og:title" content="'+name+' · CMD Sphere">'+
 '<meta property="og:description" content="'+about+'"><title>'+name+' · CMD Sphere</title>'+
 '<style>*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 30% 0%,#46305d,#0e0e18 62%);color:#faf6ff;font:16px system-ui;min-height:100vh;padding:32px 12px}main{margin:0 auto;max-width:520px;border-radius:23px;overflow:hidden;background:#20182b;border:1px solid #a76cd849;box-shadow:0 20px 65px #0006}.banner{height:176px;background:linear-gradient(120deg,#3b2256,#805cb1);background-position:center;background-size:cover}.body{padding:0 24px 30px}.avatar{width:94px;height:94px;object-fit:cover;border:5px solid #20182b;border-radius:50%;margin-top:-45px;background:#3a244e;display:grid;place-items:center}.placeholder{font-size:25px;font-weight:900}h1{margin:12px 0 5px;font-size:26px}p{line-height:1.5}small{color:#d7c6e2}a{display:inline-block;margin-top:16px;padding:12px 18px;border-radius:12px;color:#fff;background:#7652aa;text-decoration:none;font-weight:800}</style>'+
 '</head><body><main><div class="banner"'+bannerStyle+'></div><div class="body">'+icon+'<small>Profil CMD Sphere partagé volontairement</small><h1>'+name+'</h1><p>'+about+'</p>'+animal+vehicle+home+
 '<a href="/">Découvrir CMD Sphere</a></div></main></body></html>';
}
async function getShareRequest(req){
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>8192)throw Error("Requête trop volumineuse.");chunks.push(chunk)}
 return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function handleCmdProfileScene(req,res,url,{pool,auth}){
 if(/^\/p\/[^/]{1,180}$/.test(url.pathname)){
  if(req.method!=="GET"){send(res,405,{error:"Méthode non autorisée"});return true}
  let publicUser;
  try{publicUser=decodeURIComponent(url.pathname.slice(3));if(publicUser.length>120)throw Error("Identifiant trop long")}
  catch{send(res,404,{error:"Profil indisponible"});return true}
  try{
   const r=await pool.query("SELECT display_name,avatar_data_url,banner_data_url,bio,cmd_avatar_scene FROM cmd_global_profiles WHERE user_id=$1 AND cmd_profile_public=TRUE LIMIT 1",[publicUser]);
   if(!r.rows[0]){send(res,404,{error:"Profil privé ou inexistant"});return true}
   res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"private,no-store","x-content-type-options":"nosniff","x-robots-tag":"noindex,nofollow"});
   res.end(publicProfileHtml(r.rows[0]));return true;
  }catch(e){console.error("[CMD share]",e);send(res,503,{error:"Profil partagé indisponible"});return true}
 }
 if(url.pathname==="/api/profile/share"){
  if(!auth?.user?.id){send(res,401,{error:"Connecte-toi à CMD Sphere."});return true}
  const uid=String(auth.user.id);
  try{
   if(req.method==="GET"){
    const r=await pool.query("SELECT cmd_profile_public FROM cmd_global_profiles WHERE user_id=$1",[uid]);
    send(res,200,{enabled:r.rows[0]?.cmd_profile_public===true,url:"/p/"+encodeURIComponent(uid)});return true;
   }
   if(req.method==="POST"){
    const data=await getShareRequest(req);
    if(typeof data.enabled!=="boolean")throw Error("Choix de confidentialité incorrect");
    await pool.query("INSERT INTO cmd_global_profiles(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING",[uid]);
    await pool.query("UPDATE cmd_global_profiles SET cmd_profile_public=$2,updated_at=NOW() WHERE user_id=$1",[uid,data.enabled]);
    send(res,200,{enabled:data.enabled,url:"/p/"+encodeURIComponent(uid)});return true;
   }
   send(res,405,{error:"Méthode non autorisée"});return true;
  }catch(e){send(res,400,{error:e.message||"Partage impossible"});return true}
 }
 if(url.pathname!=="/api/profile/scene")return false;
 if(!auth?.user?.id){send(res,401,{error:"Connecte-toi à CMD Sphere."});return true}
 const uid=String(auth.user.id);
 try{
  if(req.method==="GET"){
   const r=await pool.query("SELECT cmd_avatar_scene,cmd_avatar_scene_image,cmd_avatar_character_image,cmd_avatar_pet_image FROM cmd_global_profiles WHERE user_id=$1",[uid]);
   send(res,200,{scene:config(r.rows[0]?.cmd_avatar_scene),customBackground:r.rows[0]?.cmd_avatar_scene_image||null,characterImage:r.rows[0]?.cmd_avatar_character_image||null,animalImage:r.rows[0]?.cmd_avatar_pet_image||null});
   return true;
  }
  if(req.method==="POST"){
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>10*1024*1024)throw Error("Images trop volumineuses. Optimise les photos avant l’envoi.");chunks.push(chunk)}
   const data=JSON.parse(Buffer.concat(chunks).toString("utf8"));
   const scene=config(data.scene);
   const image=Object.prototype.hasOwnProperty.call(data,"customBackground")?checkCustom(data.customBackground):undefined;
   const character=Object.prototype.hasOwnProperty.call(data,"characterImage")?checkCustom(data.characterImage):undefined;
   const animal=Object.prototype.hasOwnProperty.call(data,"animalImage")?checkCustom(data.animalImage):undefined;
   await pool.query("INSERT INTO cmd_global_profiles(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING",[uid]);
   await pool.query("UPDATE cmd_global_profiles SET cmd_avatar_scene=$2::jsonb,cmd_avatar_scene_image=COALESCE($3,cmd_avatar_scene_image),cmd_avatar_character_image=COALESCE($4,cmd_avatar_character_image),cmd_avatar_pet_image=COALESCE($5,cmd_avatar_pet_image),updated_at=NOW() WHERE user_id=$1",[uid,JSON.stringify(scene),image===undefined?null:image,character===undefined?null:character,animal===undefined?null:animal]);
   send(res,200,{ok:true,scene});return true;
  }
  send(res,405,{error:"Méthode non autorisée"});return true;
 }catch(e){send(res,400,{error:e.message||"Décor indisponible"});return true}
}
