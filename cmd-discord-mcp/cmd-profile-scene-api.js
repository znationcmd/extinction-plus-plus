/* CMD Sphere — personalized avatar-and-pet scene rendered inside the existing profile banner. */
const SCENES=new Set(["beach","seaside","forest","neonforest","waterfall","city","night","space","mountains","chalet","crystal","custom","none"]);
const HAIR=new Set(["short","long","curly","bob","shaved","ponytail"]);
const TOPS=new Set(["hoodie","tshirt","jacket","shirt","polo","sweater","coat","dress","sport","suit","armor"]);
const BOTTOMS=new Set(["jeans","dark","shorts","skirt","cargo","formal"]);
const SHOES=new Set(["sneakers","boots","sandals","formal"]);
const PETS=new Set(["none","dog","cat","rabbit","fox","bird","horse","wolf","turtle","duck","flamingo","stork"]);
const POSES=new Set(["stand","wave","peace","crossed","walk","run","dance"]);
const ACCESSORIES=new Set(["none","glasses","sunglasses","hat","cap","headphones","earrings","necklace","crown"]);
const GENDERS=new Set(["male","female","neutral"]);
const STYLES=new Set(["3d","illustrated","photo"]);
const AVATAR_MODELS=new Set(["civilian","soldier","michelle","custom"]);
const PRESETS=new Set(["guardian","nocturne","azur","luna","nova","iris"]);
const PET_MODELS=new Set(["fox","cat","horse","parrot","duck","flamingo","stork","dog","rabbit","wolf","turtle","custom"]);
const VEHICLES=new Set(["none","compact","sportscar","convertible","scooter","motorcycle","bike","van","truck","kart","boat","plane","rocket"]);
const HOMES=new Set(["none","cottage","house","villa","apartment","castle","cabin","beach","snow","tree","crystal"]);
const COLORS=new Set(["#f7cb9e","#e8ad7e","#c68a60","#905a3d","#573b30","#2f2728"]);
const HAIR_COLORS=new Set(["#201b27","#58372a","#a65d32","#dcc071","#9b9ba9","#d76884","#f7f0e1"]);
const OUTFIT_COLORS=new Set(["#ffffff","#212331","#7549b9","#237a9b","#d24e79","#e6a53a","#317f67","#b23b3b"]);
const defaultConfig=()=>({scene:"none",avatarPreset:"guardian",gender:"neutral",skin:"#f7cb9e",hair:"short",hairColor:"#201b27",top:"hoodie",topColor:"#7549b9",bottom:"jeans",shoes:"sneakers",pet:"none",pose:"stand",accessory:"none",avatarStyle:"3d",petStyle:"3d",avatarModel:"civilian",petModel:"fox",vehicle:"none",home:"none",hideHome:true,petName:"",label:""});
const clean=(v,a,def)=>a.has(String(v||""))?String(v):def;
function config(input){
 const a=input&&typeof input==="object"?input:{},d=defaultConfig(),result={...d};
 for(const [key,set] of Object.entries({scene:SCENES,avatarPreset:PRESETS,gender:GENDERS,skin:COLORS,hair:HAIR,hairColor:HAIR_COLORS,top:TOPS,topColor:OUTFIT_COLORS,bottom:BOTTOMS,shoes:SHOES,pet:PETS,pose:POSES,accessory:ACCESSORIES,avatarStyle:STYLES,petStyle:STYLES,avatarModel:AVATAR_MODELS,petModel:PET_MODELS,vehicle:VEHICLES,home:HOMES})){result[key]=clean(a[key],set,d[key])}
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
}
export async function handleCmdProfileScene(req,res,url,{pool,auth}){
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
