import crypto from "node:crypto";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean=(value,max)=>String(value??"").trim().slice(0,max);
const urlField=value=>{if(!value)return "";let url;try{url=new URL(String(value))}catch{throw Error("URL invalide")};if(url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))throw Error("HTTPS requis sauf localhost");if(url.username||url.password||url.hash)throw Error("URL non autorisée");return url.toString().slice(0,500)};
const asConfig=obj=>{const o=obj&&typeof obj==="object"?obj:{},redirectUris=Array.isArray(o.redirectUris)?o.redirectUris.slice(0,10).filter(Boolean).map(urlField):[];return{iconUrl:urlField(o.iconUrl||""),termsUrl:urlField(o.termsUrl||""),privacyUrl:urlField(o.privacyUrl||""),supportUrl:urlField(o.supportUrl||""),redirectUris:[...new Set(redirectUris)]}};
const originCheck=(req,baseUrl)=>{if(req.headers.origin&&new URL(req.headers.origin).origin!==new URL(baseUrl).origin)throw Error("Origine non autorisée");if(String(req.headers["content-type"]||"").split(";")[0]!=="application/json")throw Error("Corps JSON requis")};
export async function initDeveloperPortalDb(pool){
  await pool.query("CREATE TABLE IF NOT EXISTS cmd_developer_app_settings(app_id UUID PRIMARY KEY REFERENCES cmd_developer_apps(id) ON DELETE CASCADE,config JSONB NOT NULL DEFAULT '{}'::jsonb,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("CREATE TABLE IF NOT EXISTS cmd_developer_commands(id UUID PRIMARY KEY,app_id UUID NOT NULL REFERENCES cmd_developer_apps(id) ON DELETE CASCADE,name VARCHAR(32) NOT NULL,description VARCHAR(100) NOT NULL,options JSONB NOT NULL DEFAULT '[]'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(app_id,name))");
  await pool.query("CREATE INDEX IF NOT EXISTS cmd_developer_commands_app ON cmd_developer_commands(app_id)");
}
async function owned(pool,user,id){
  if(!UUID.test(id))throw Error("Identifiant de l'application incorrect");
  const r=await pool.query("SELECT a.id,a.name,a.description,a.discord_client_id,a.created_at,COALESCE(s.config,'{}'::jsonb) AS config,(SELECT COUNT(*)::int FROM cmd_native_app_installs i WHERE i.app_id=a.id) AS installed_count,(SELECT COUNT(*)::int FROM cmd_developer_commands c WHERE c.app_id=a.id) AS command_count FROM cmd_developer_apps a LEFT JOIN cmd_developer_app_settings s ON s.app_id=a.id WHERE a.id=$1 AND a.owner_user_id=$2 LIMIT 1",[id,user]);
  if(!r.rows[0])throw Error("Cette application ne fait pas partie de ton compte CMD Sphere");
  return r.rows[0];
}
export async function developerPortalRoute(req,res,url,ctx){
  const p=url.pathname;
  if(!p.startsWith("/api/developer/portal/"))return false;
  const {pool,auth,baseUrl,sendJson,readBody}=ctx;
  const send=(status,data)=>sendJson(res,status,data);
  try{
    if(!auth){send(401,{error:"Connexion CMD Sphere requise"});return true}
    const route=p.match(/^\/api\/developer\/portal\/apps\/([0-9a-f-]{36})(?:\/(settings|rotate|commands|installations)(?:\/([0-9a-f-]{36})\/delete)?)?$/i);
    if(!route){send(404,{error:"Route inconnue"});return true}
    const id=route[1],action=route[2],commandId=route[3],user=String(auth.user.id),app=await owned(pool,user,id);
    if(req.method==="GET"&&!action){send(200,{app});return true}
    if(req.method==="GET"&&action==="installations"){
      const r=await pool.query("SELECT i.guild_id,g.name AS guild_name,i.permissions,i.installed_at FROM cmd_native_app_installs i JOIN cmd_native_guilds g ON g.id=i.guild_id WHERE i.app_id=$1 ORDER BY i.installed_at DESC LIMIT 100",[id]);
      send(200,{installations:r.rows});return true;
    }
    if(req.method==="GET"&&action==="commands"){
      const r=await pool.query("SELECT id,name,description,options,created_at FROM cmd_developer_commands WHERE app_id=$1 ORDER BY created_at DESC",[id]);
      send(200,{commands:r.rows});return true;
    }
    if(req.method!=="POST"){send(405,{error:"Méthode non autorisée"});return true}
    originCheck(req,baseUrl);
    const body=await readBody(req);
    if(action==="settings"){
      const name=clean(body.name,80),description=clean(body.description,500),did=clean(body.discordClientId,22);
      if(name.length<2)throw Error("Nom de deux caractères minimum");
      if(did&&!/^\d{15,22}$/.test(did))throw Error("ID Discord non valide");
      const config=asConfig(body.config);
      await pool.query("UPDATE cmd_developer_apps SET name=$3,description=$4,discord_client_id=$5 WHERE id=$1 AND owner_user_id=$2",[id,user,name,description,did||null]);
      await pool.query("INSERT INTO cmd_developer_app_settings(app_id,config) VALUES($1,$2::jsonb) ON CONFLICT(app_id) DO UPDATE SET config=EXCLUDED.config,updated_at=NOW()",[id,JSON.stringify(config)]);
      send(200,{ok:true,app:await owned(pool,user,id)});return true;
    }
    if(action==="rotate"){
      const token=crypto.randomBytes(32).toString("base64url"),hash=crypto.createHash("sha256").update(token).digest("hex");
      await pool.query("UPDATE cmd_developer_apps SET token_hash=$3 WHERE id=$1 AND owner_user_id=$2",[id,user,hash]);
      send(200,{ok:true,token,warning:"L'ancienne clé est révoquée; conserve la nouvelle en lieu sûr."});return true;
    }
    if(action==="commands"&&commandId){
      if(!UUID.test(commandId))throw Error("Commande invalide");
      const r=await pool.query("DELETE FROM cmd_developer_commands WHERE id=$1 AND app_id=$2 RETURNING id",[commandId,id]);
      send(200,{ok:!!r.rows[0]});return true;
    }
    if(action==="commands"){
      const name=clean(body.name,32).toLowerCase(),description=clean(body.description,100);
      if(!/^[a-z0-9_-]{1,32}$/.test(name)||!description)throw Error("Nom et description de commande obligatoires");
      const count=await pool.query("SELECT COUNT(*)::int AS n FROM cmd_developer_commands WHERE app_id=$1",[id]);
      if(Number(count.rows[0].n)>=100)throw Error("Limite de 100 commandes");
      const newId=crypto.randomUUID();
      try{await pool.query("INSERT INTO cmd_developer_commands(id,app_id,name,description) VALUES($1,$2,$3,$4)",[newId,id,name,description])}
      catch(e){if(e.code==="23505")throw Error("Commande déjà existante");throw e}
      send(201,{ok:true,id:newId,name,description,note:"Déclaration enregistrée. Le bot doit implémenter la commande pour qu'elle réponde."});return true;
    }
    send(404,{error:"Action inconnue"});return true;
  }catch(e){send(400,{error:String(e.message||e)});return true}
}
