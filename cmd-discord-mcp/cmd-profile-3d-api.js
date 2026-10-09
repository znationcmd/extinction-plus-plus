/* CMD Sphere: restricted 3D GLB model hosting + private user avatar/pet assets. */
const MAX_GLB=12*1024*1024;
const SOURCES={
 Soldier:"https://cdn.jsdelivr.net/gh/mrdoob/three.js@r180/examples/models/gltf/Soldier.glb",
 Michelle:"https://cdn.jsdelivr.net/gh/mrdoob/three.js@r180/examples/models/gltf/Michelle.glb",
 Fox:"https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb",
 Cat:"https://raw.githubusercontent.com/code4fukui/vr-cats/main/bicolor_cat.glb",
 Horse:"https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/models/gltf/Horse.glb",
 Parrot:"https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/models/gltf/Parrot.glb",
 Flamingo:"https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/models/gltf/Flamingo.glb",
 Stork:"https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/models/gltf/Stork.glb",
 Duck:"https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/models/gltf/duck.glb"
};
const cache=new Map();
function send(res,code,data){res.writeHead(code,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(data))}
function verifyGLB(bytes){
 if(bytes.length<24||bytes.length>MAX_GLB)throw Error("Modèle GLB : 12 Mo maximum.");
 if(bytes.toString("ascii",0,4)!=="glTF"||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error("Modèle GLB 2.0 invalide.");
 const n=bytes.readUInt32LE(12),type=bytes.toString("ascii",16,20);
 if(type!=="JSON"||n<2||n>1024*1024||20+n>bytes.length)throw Error("Fichier GLB sans scène valide.");
 let doc;try{doc=JSON.parse(bytes.subarray(20,20+n).toString("utf8"))}catch{throw Error("GLB JSON invalide.")}
 if(!doc?.asset||doc.asset.version!=="2.0"||!Array.isArray(doc.scenes)||!Array.isArray(doc.nodes))throw Error("Modèle GLB 2.0 incomplet.");
 if(doc.nodes.length>900||doc.meshes?.length>160||doc.images?.length>80)throw Error("Modèle trop complexe pour mobile.");
 const uriExists=[...(doc.buffers||[]),...(doc.images||[])].some(x=>typeof x.uri==="string"&&!x.uri.startsWith("data:"));
 if(uriExists)throw Error("Modèle GLB non autonome : les ressources externes sont interdites.");
 const badExtensions=(doc.extensionsRequired||[]).filter(x=>!["KHR_materials_unlit","KHR_materials_clearcoat","KHR_materials_emissive_strength","KHR_texture_transform"].includes(x));
 if(badExtensions.length)throw Error("Extension 3D non prise en charge : "+badExtensions[0]);
 return true;
}
export async function initCmdProfile3D(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_profile_3d_assets(user_id TEXT NOT NULL,kind VARCHAR(8) NOT NULL,glb BYTEA NOT NULL,bytes INTEGER NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,kind))");
}
export async function handleCmdProfile3D(req,res,url,{pool,auth}){
 const path=url.pathname;
 if(path.startsWith("/cmd-three/models/")){
  const key=/^\/cmd-three\/models\/([A-Za-z]+)\.glb$/.exec(path)?.[1];
  if(!key||!Object.prototype.hasOwnProperty.call(SOURCES,key)){send(res,404,{error:"Modèle indisponible"});return true}
  try{
   const saved=cache.get(key);let bytes=saved?.bytes;
   if(!bytes||Date.now()-saved.at>12*3600000){
    const answer=await fetch(SOURCES[key],{signal:AbortSignal.timeout(15000),headers:{"accept":"model/gltf-binary,application/octet-stream"}});
    if(!answer.ok)throw Error("HTTP "+answer.status);
    const chunks=[];let len=0;for await(const chunk of answer.body){len+=chunk.length;if(len>MAX_GLB)throw Error("Modèle distant trop volumineux");chunks.push(chunk)}
    bytes=Buffer.concat(chunks);verifyGLB(bytes);
    cache.set(key,{bytes,at:Date.now()});
   }
   res.writeHead(200,{"content-type":"model/gltf-binary","content-length":bytes.length,"cache-control":"public, max-age=86400","x-content-type-options":"nosniff","accept-ranges":"none"});
   res.end(bytes);
  }catch(e){console.warn("[CMD Profile 3D]",key,e.message);send(res,502,{error:"Modèle 3D momentanément indisponible."})}
  return true;
 }
 if(!path.startsWith("/api/profile/3d/"))return false;
 if(!auth?.user?.id){send(res,401,{error:"Connexion CMD Sphere requise."});return true}
 const kind=/^\/api\/profile\/3d\/(avatar|pet)$/.exec(path)?.[1];
 if(!kind){send(res,404,{error:"Type de modèle inconnu"});return true}
 const uid=String(auth.user.id);
 try{
  if(req.method==="GET"){
   const r=await pool.query("SELECT glb FROM cmd_profile_3d_assets WHERE user_id=$1 AND kind=$2",[uid,kind]);
   const data=r.rows[0]?.glb;if(!data){send(res,404,{error:"Aucun modèle personnel enregistré."});return true}
   res.writeHead(200,{"content-type":"model/gltf-binary","content-length":data.length,"cache-control":"private, no-store","x-content-type-options":"nosniff","accept-ranges":"none"});res.end(data);return true;
  }
  if(req.method==="PUT"){
   if(String(req.headers["content-type"]||"").split(";")[0]!=="model/gltf-binary"){send(res,415,{error:"Choisis un fichier GLB 3D."});return true}
   let length=0;const arr=[];
   for await(const part of req){length+=part.length;if(length>MAX_GLB)throw Error("Modèle 3D supérieur à 12 Mo.");arr.push(part)}
   const bytes=Buffer.concat(arr);verifyGLB(bytes);
   await pool.query("INSERT INTO cmd_profile_3d_assets(user_id,kind,glb,bytes) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,kind) DO UPDATE SET glb=EXCLUDED.glb,bytes=EXCLUDED.bytes,updated_at=NOW()",[uid,kind,bytes,bytes.length]);
   send(res,200,{ok:true,kind,size:bytes.length});return true;
  }
  if(req.method==="DELETE"){await pool.query("DELETE FROM cmd_profile_3d_assets WHERE user_id=$1 AND kind=$2",[uid,kind]);send(res,200,{ok:true});return true}
  send(res,405,{error:"Méthode non autorisée"});return true;
 }catch(e){send(res,400,{error:e.message||"Modèle 3D non valide"});return true}
}
