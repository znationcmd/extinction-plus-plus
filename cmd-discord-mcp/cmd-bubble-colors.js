/* CMD Sphere message bubble colors. Each account chooses a color; readers see it. */
const PALETTE=new Set(["#5141bc","#6d37ae","#275da8","#217f79","#28754e","#89572b","#924772","#384455","#59626f"]);
function send(res,status,data){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(data))}
export async function initCmdBubbleColors(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_bubble_colors (user_id TEXT PRIMARY KEY,color VARCHAR(7) NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW())");
}
export async function cmdBubbleColorsRoute(req,res,url,{pool,auth}){
 if(url.pathname!=="/api/cmd-bubbles")return false;
 const user=String(auth?.user?.id||"");
 if(!user){send(res,401,{error:"Connexion requise"});return true}
 try{
  if(req.method==="GET"){
   const raw=String(url.searchParams.get("ids")||"");const ids=[...new Set(raw.split(",").map(x=>x.trim()).filter(x=>/^[\w-]{1,72}$/.test(x)))].slice(0,100);
   if(!ids.includes(user))ids.push(user);
   const result=await pool.query("SELECT user_id,color FROM cmd_sphere_bubble_colors WHERE user_id=ANY($1::text[])",[ids]);
   send(res,200,{colors:Object.fromEntries(result.rows.map(r=>[r.user_id,r.color])),palette:[...PALETTE],userId:user});return true;
  }
  if(req.method==="POST"){
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error("Requête trop volumineuse.");chunks.push(chunk)}
   let data;try{data=JSON.parse(Buffer.concat(chunks).toString()||"{}")}catch{throw Error("Données invalides")}
   const color=String(data.color||"").toLowerCase();
   if(!PALETTE.has(color))throw Error("Couleur non autorisée");
   await pool.query("INSERT INTO cmd_sphere_bubble_colors(user_id,color) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET color=EXCLUDED.color,updated_at=NOW()",[user,color]);
   send(res,200,{ok:true,color});return true;
  }
  send(res,405,{error:"Méthode non autorisée"});return true;
 }catch(e){send(res,400,{error:String(e.message||"Erreur")});return true}
}
