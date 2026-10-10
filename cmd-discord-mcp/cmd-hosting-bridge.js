/* CMD Sphere / CMD Hosting: private, PKCE account link, server-side-only tokens. */
import crypto from "node:crypto";
const HOST="https://cmd-hosting-web-production.up.railway.app";
const txt=(s,n=200)=>String(s||"").trim().slice(0,n);
const json=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(data))};
const digest=s=>crypto.createHash("sha256").update(s).digest("hex");
const getKey=()=>{const secret=process.env.CMD_SPHERE_HOSTING_BRIDGE_KEY||"";if(!/^[a-f0-9]{64}$/i.test(secret))return null;return Buffer.from(secret,"hex")};
const encrypted=token=>{const iv=crypto.randomBytes(12),key=getKey();if(!key)throw Error("CMD Hosting bridge key missing");const cipher=crypto.createCipheriv("aes-256-gcm",key,iv);const bytes=Buffer.concat([cipher.update(token,"utf8"),cipher.final()]);return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),bytes.toString("base64url")].join(".")};
const decrypted=value=>{const p=String(value||"").split(".");if(p.length!==3||!getKey())throw Error("Connexion invalide");const decipher=crypto.createDecipheriv("aes-256-gcm",getKey(),Buffer.from(p[0],"base64url"));decipher.setAuthTag(Buffer.from(p[1],"base64url"));return decipher.update(Buffer.from(p[2],"base64url"),undefined,"utf8")+decipher.final("utf8")};
function allowed(req,baseUrl){const o=String(req.headers.origin||"");return !o||o===new URL(baseUrl).origin}
async function remote(path,token,opts={}){
 const r=await fetch(HOST+path,{signal:AbortSignal.timeout(12000),headers:{"authorization":"Bearer "+token,"accept":"application/json",...(opts.body?{"content-type":"application/json"}:{})},method:opts.method||"GET",body:opts.body?JSON.stringify(opts.body):undefined,redirect:"error"});
 const d=await r.json().catch(()=>({}));
 if(!r.ok){const error=new Error(txt(d.message||"CMD Hosting indisponible",200));error.status=r.status;throw error}
 return d;
}
export async function initCmdHostingBridge(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_hosting_pending(state_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,verifier VARCHAR(130) NOT NULL,expires_at TIMESTAMPTZ NOT NULL)");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_hosting_links(user_id TEXT PRIMARY KEY,token_enc TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_hosting_guild_links(guild_id UUID PRIMARY KEY REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,owner_user_id TEXT NOT NULL,rental_id UUID NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_hosting_role_access(guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,role_id UUID NOT NULL REFERENCES cmd_native_roles(id) ON DELETE CASCADE,enabled BOOLEAN NOT NULL DEFAULT FALSE,PRIMARY KEY(guild_id,role_id))");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_hosting_role_members(guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,role_id UUID NOT NULL REFERENCES cmd_native_roles(id) ON DELETE CASCADE,user_id TEXT NOT NULL,PRIMARY KEY(guild_id,role_id,user_id))");

 await pool.query("ALTER TABLE cmd_sphere_hosting_pending ADD COLUMN IF NOT EXISTS guild_id UUID");
}

async function hostingMemberAccess(pool,gid,uid){
 const r=await pool.query("SELECT owner_user_id FROM cmd_native_guilds WHERE id=$1",[gid]);
 if(!r.rows.length)return {allowed:false,owner:false,ownerId:""};
 const ownerId=String(r.rows[0].owner_user_id);
 if(ownerId===uid)return {allowed:true,owner:true,ownerId};
 const m=await pool.query("SELECT 1 FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2",[gid,uid]);
 if(!m.rows.length)return {allowed:false,owner:false,ownerId};
 // Only owner-issued membership assignments count; profile_role_id is user-editable and never grants control.
 const grants=await pool.query("SELECT 1 FROM cmd_sphere_hosting_role_members rm JOIN cmd_sphere_hosting_role_access ra ON ra.guild_id=rm.guild_id AND ra.role_id=rm.role_id AND ra.enabled=TRUE JOIN cmd_native_roles r ON r.id=rm.role_id AND r.guild_id=rm.guild_id WHERE rm.guild_id=$1 AND rm.user_id=$2 LIMIT 1",[gid,uid]);
 return {allowed:!!grants.rows.length,owner:false,ownerId};
}
async function hostingOwnerToken(pool,uid){
 const r=await pool.query("SELECT token_enc FROM cmd_sphere_hosting_links WHERE user_id=$1 AND expires_at>NOW()",[uid]);
 if(!r.rows.length)return null;
 return decrypted(r.rows[0].token_enc);
}
async function hostingAssociation(pool,gid,ownerId,token){
 const r=await pool.query("SELECT rental_id FROM cmd_sphere_hosting_guild_links WHERE guild_id=$1 AND owner_user_id=$2",[gid,ownerId]);
 if(!r.rows.length)return null;
 const d=await remote("/api/integrations/cmd-sphere/servers",token);
 return (d.servers||[]).find(x=>x.id===String(r.rows[0].rental_id))||null;
}

export async function handleCmdHostingBridge(req,res,url,{pool,auth,baseUrl}){
 const path=url.pathname;
 if(!path.startsWith("/api/cmd-hosting/"))return false;
 if(!auth?.user?.id){json(res,401,{error:"Connecte-toi à CMD Sphere"});return true}
 const uid=String(auth.user.id);
 if(path==="/api/cmd-hosting/callback"&&req.method==="GET"){
  const state=txt(url.searchParams.get("state"),100),code=txt(url.searchParams.get("code"),100);
  let connected=false,guild="";
  try{
   if(!/^[a-f0-9]{64}$/.test(state)||!/^csp_[a-f0-9]{64}$/.test(code))throw Error("Liaison invalide");
   const q=await pool.query("DELETE FROM cmd_sphere_hosting_pending WHERE state_hash=$1 AND user_id=$2 AND expires_at>NOW() RETURNING verifier,guild_id",[digest(state),uid]);
   if(!q.rows.length)throw Error("Liaison expirée");guild=String(q.rows[0].guild_id||"");
   const resp=await fetch(HOST+"/api/integrations/cmd-sphere/exchange",{method:"POST",signal:AbortSignal.timeout(12000),headers:{"content-type":"application/json"},body:JSON.stringify({state,code,verifier:q.rows[0].verifier}),redirect:"error"});
   const d=await resp.json().catch(()=>({}));if(!resp.ok||!/^cmds_[a-f0-9]{64}$/.test(d.token||""))throw Error("CMD Hosting a refusé la liaison");
   await pool.query("INSERT INTO cmd_sphere_hosting_links(user_id,token_enc,expires_at) VALUES($1,$2,NOW()+INTERVAL '89 days') ON CONFLICT(user_id) DO UPDATE SET token_enc=EXCLUDED.token_enc,expires_at=EXCLUDED.expires_at,updated_at=NOW()",[uid,encrypted(d.token)]);
   connected=true;
  }catch(e){console.warn("[cmd-hosting-link]",String(e.message||e).slice(0,150))}
    res.writeHead(302,{"location":baseUrl+"/dashboard?cmdHosting="+(connected?"connected":"failed")+(guild?"&cmdHostingGuild="+encodeURIComponent(guild):""),"cache-control":"no-store"});res.end();return true;
 }
 if(req.method==="POST"&&!allowed(req,baseUrl)){json(res,403,{error:"Origine non autorisée"});return true}
 if(path==="/api/cmd-hosting/connect"&&req.method==="POST"){
  if(!getKey()){json(res,503,{error:"Connexion CMD Hosting indisponible"});return true}
  let guildId="";
  if(req.headers["content-type"]?.includes("application/json")){const raw=[];for await(const chunk of req){raw.push(chunk);if(Buffer.concat(raw).length>1024){json(res,413,{error:"Requête trop volumineuse"});return true}}try{guildId=txt(JSON.parse(Buffer.concat(raw).toString("utf8")).guildId,64)}catch{}}
  if(guildId){if(!/^[0-9a-f-]{36}$/i.test(guildId)){json(res,400,{error:"Serveur CMD Sphere incorrect"});return true}
   const owner=await pool.query("SELECT 1 FROM cmd_native_guilds WHERE id=$1 AND owner_user_id=$2",[guildId,uid]);if(!owner.rows.length){json(res,403,{error:"Tu n'es pas propriétaire de ce serveur"});return true}}
  const state=crypto.randomBytes(32).toString("hex"),verifier=crypto.randomBytes(32).toString("base64url"),challenge=crypto.createHash("sha256").update(verifier).digest("base64url");
  await pool.query("INSERT INTO cmd_sphere_hosting_pending(state_hash,user_id,verifier,expires_at,guild_id) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes',$4)",[digest(state),uid,verifier,guildId||null]);
  json(res,200,{url:HOST+"/api/integrations/cmd-sphere/connect?state="+encodeURIComponent(state)+"&challenge="+encodeURIComponent(challenge)});return true;
 }

 const rolePath=path==="/api/cmd-hosting/roles";
 if(rolePath){
  const gid=txt(url.searchParams.get("guildId"),64),rid=txt(url.searchParams.get("roleId"),64);
  if(!/^[0-9a-f-]{36}$/i.test(gid)){json(res,400,{error:"Serveur invalide"});return true}
  const access=await hostingMemberAccess(pool,gid,uid);
  if(!access.owner){json(res,403,{error:"Seul le propriétaire attribue les accès CMD Hosting"});return true}
  if(req.method==="GET"){
   const preset=await pool.query("SELECT 1 FROM cmd_native_roles WHERE guild_id=$1 AND source_role_id=$2 LIMIT 1",[gid,"cmd-hosting-"+gid]);
   if(!preset.rows.length){const newId=crypto.randomUUID();
    await pool.query("INSERT INTO cmd_native_roles(id,guild_id,source_role_id,name,color,permissions,position,hoist,mentionable) VALUES($1,$2,$3,'Gestion CMD Hosting','#9160cf',$4::jsonb,1,TRUE,FALSE) ON CONFLICT(guild_id,source_role_id) DO NOTHING",[newId,gid,"cmd-hosting-"+gid,JSON.stringify({manageCmdHosting:true})]);
    await pool.query("INSERT INTO cmd_sphere_hosting_role_access(guild_id,role_id,enabled) SELECT $1,id,TRUE FROM cmd_native_roles WHERE guild_id=$1 AND source_role_id=$2 ON CONFLICT(guild_id,role_id) DO NOTHING",[gid,"cmd-hosting-"+gid]);
   }
   const roles=await pool.query("SELECT r.id,r.name,COALESCE(a.enabled,FALSE) AS enabled FROM cmd_native_roles r LEFT JOIN cmd_sphere_hosting_role_access a ON a.role_id=r.id AND a.guild_id=r.guild_id WHERE r.guild_id=$1 ORDER BY r.position DESC,r.name",[gid]);
   const members=await pool.query("SELECT m.user_id,COALESCE(NULLIF(m.profile_display_name,''),NULLIF(a.display_name,''),a.username,'Membre') AS name,m.membership_role FROM cmd_native_members m LEFT JOIN cmd_accounts a ON a.id::text=m.user_id WHERE m.guild_id=$1 ORDER BY m.joined_at LIMIT 500",[gid]);
   const grants=await pool.query("SELECT role_id,user_id FROM cmd_sphere_hosting_role_members WHERE guild_id=$1",[gid]);
   json(res,200,{roles:roles.rows,members:members.rows,grants:grants.rows});return true;
  }
  if(req.method!=="POST"){json(res,405,{error:"Méthode non autorisée"});return true}
  if(!allowed(req,baseUrl)){json(res,403,{error:"Origine non autorisée"});return true}
  let body="";for await(const chunk of req){body+=chunk.toString();if(body.length>1500){json(res,413,{error:"Requête trop longue"});return true}}
  let d;try{d=JSON.parse(body)}catch{json(res,400,{error:"Données invalides"});return true}
  const roleId=txt(d.roleId,64),targetUid=txt(d.userId,100);
  if(!/^[0-9a-f-]{36}$/i.test(roleId)){json(res,400,{error:"Rôle incorrect"});return true}
  const role=await pool.query("SELECT 1 FROM cmd_native_roles WHERE id=$1 AND guild_id=$2",[roleId,gid]);
  if(!role.rows.length){json(res,404,{error:"Ce rôle n'existe pas dans ce serveur"});return true}
  if(d.kind==="permission"&&typeof d.enabled==="boolean"){
   await pool.query("INSERT INTO cmd_sphere_hosting_role_access(guild_id,role_id,enabled) VALUES($1,$2,$3) ON CONFLICT(guild_id,role_id) DO UPDATE SET enabled=EXCLUDED.enabled",[gid,roleId,d.enabled]);
   json(res,200,{saved:true});return true;
  }
  if(d.kind==="member"&&typeof d.enabled==="boolean"){
   if(!targetUid||targetUid===uid){json(res,400,{error:"Choisis un autre membre"});return true}
   const m=await pool.query("SELECT 1 FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2",[gid,targetUid]);
   if(!m.rows.length){json(res,404,{error:"Membre introuvable"});return true}
   if(d.enabled)await pool.query("INSERT INTO cmd_sphere_hosting_role_members(guild_id,role_id,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[gid,roleId,targetUid]);
   else await pool.query("DELETE FROM cmd_sphere_hosting_role_members WHERE guild_id=$1 AND role_id=$2 AND user_id=$3",[gid,roleId,targetUid]);
   json(res,200,{saved:true});return true;
  }
  json(res,400,{error:"Modification non autorisée"});return true;
 }

 const guildId=txt(url.searchParams.get("guildId"),64);
 if(path==="/api/cmd-hosting/association"){
  if(!/^[0-9a-f-]{36}$/i.test(guildId)){json(res,400,{error:"Serveur CMD Sphere incorrect"});return true}
  const access=await hostingMemberAccess(pool,guildId,uid);
  if(!access.allowed){json(res,403,{error:"Tu n'as pas accès à l'hébergement de ce serveur"});return true}
  if(req.method==="GET"){
   const a=await pool.query("SELECT rental_id FROM cmd_sphere_hosting_guild_links WHERE guild_id=$1 AND owner_user_id=$2",[guildId,access.ownerId]);
   const linked=await pool.query("SELECT 1 FROM cmd_sphere_hosting_links WHERE user_id=$1 AND expires_at>NOW()",[access.ownerId]);
   if(!linked.rows.length){json(res,200,{linked:false,assigned:false,server:null,owner:access.owner});return true}
   let token;try{token=await hostingOwnerToken(pool,access.ownerId)}catch{json(res,503,{error:"Renouvelle la connexion CMD Hosting"});return true}
   try{const d=await remote("/api/integrations/cmd-sphere/servers",token);const server=(d.servers||[]).find(s=>s.id===String(a.rows[0]?.rental_id||""))||null;
   json(res,200,{linked:true,assigned:!!server,server,canManage:access.allowed,owner:access.owner});return true}
   catch(e){json(res,502,{error:"État CMD Hosting indisponible : "+e.message});return true}
  }
  if(!access.owner){json(res,403,{error:"Seul le propriétaire peut changer la location associée"});return true}
  if(req.method==="DELETE"){
   if(!allowed(req,baseUrl)){json(res,403,{error:"Origine refusée"});return true}
   await pool.query("DELETE FROM cmd_sphere_hosting_guild_links WHERE guild_id=$1 AND owner_user_id=$2",[guildId,uid]);json(res,200,{ok:true});return true}
  if(req.method!=="POST"){json(res,405,{error:"Méthode non autorisée"});return true}
  if(!allowed(req,baseUrl)){json(res,403,{error:"Origine interdite"});return true}
  let b="";for await(const chunk of req){b+=chunk.toString();if(b.length>1024){json(res,413,{error:"Requête trop volumineuse"});return true}}
  let rentalId;try{rentalId=txt(JSON.parse(b).rentalId,64)}catch{json(res,400,{error:"JSON invalide"});return true}
  if(!/^[0-9a-f-]{36}$/i.test(rentalId)){json(res,400,{error:"Location invalide"});return true}
  const userLink=await pool.query("SELECT token_enc FROM cmd_sphere_hosting_links WHERE user_id=$1 AND expires_at>NOW()",[uid]);if(!userLink.rows.length){json(res,401,{error:"Connecte ton compte CMD Hosting"});return true}
  try{const d=await remote("/api/integrations/cmd-sphere/servers",decrypted(userLink.rows[0].token_enc));
   const server=(d.servers||[]).find(s=>s.id===rentalId);if(!server){json(res,403,{error:"Cette location CMD Hosting n'appartient pas à ton compte"});return true}
   await pool.query("INSERT INTO cmd_sphere_hosting_guild_links(guild_id,owner_user_id,rental_id) VALUES($1,$2,$3) ON CONFLICT(guild_id) DO UPDATE SET owner_user_id=EXCLUDED.owner_user_id,rental_id=EXCLUDED.rental_id,updated_at=NOW()",[guildId,uid,rentalId]);
   json(res,200,{ok:true,server});return true;
  }catch(e){json(res,502,{error:"Impossible de vérifier cette location CMD Hosting : "+e.message});return true}
 }
 const link=await pool.query("SELECT token_enc,expires_at FROM cmd_sphere_hosting_links WHERE user_id=$1 AND expires_at>NOW()",[uid]);
 if(path==="/api/cmd-hosting/status"&&req.method==="GET"){json(res,200,{linked:!!link.rows.length});return true}
 if(!link.rows.length && !(path==="/api/cmd-hosting/command"&&req.method==="POST")){json(res,401,{error:"Lie ton compte CMD Hosting pour retrouver tes serveurs"});return true}
 let token=null;if(link.rows.length){try{token=decrypted(link.rows[0].token_enc)}catch{json(res,503,{error:"Connexion à renouveler"});return true}}
 try{
  if(path==="/api/cmd-hosting/servers"&&req.method==="GET"){
   const d=await remote("/api/integrations/cmd-sphere/servers",token);json(res,200,d);return true;
  }
  if(path==="/api/cmd-hosting/command"&&req.method==="POST"){
   if(Number(req.headers["content-length"]||0)>2048){json(res,413,{error:"Requête trop longue"});return true}
   let b="";for await(const chunk of req){b+=chunk.toString();if(b.length>2048){json(res,413,{error:"Requête trop longue"});return true}}
   let data;try{data=JSON.parse(b)}catch{json(res,400,{error:"JSON invalide"});return true}
   const id=txt(data.id,60),action=txt(data.action,30);
   let commandToken=token;
   if(data.guildId){
    const gid=txt(data.guildId,64);
    if(!/^[0-9a-f-]{36}$/i.test(gid)){json(res,400,{error:"Serveur incorrect"});return true}
    const access=await hostingMemberAccess(pool,gid,uid);
    if(!access.allowed){json(res,403,{error:"Permission CMD Hosting absente pour ce serveur"});return true}
    const isLinked=await pool.query("SELECT 1 FROM cmd_sphere_hosting_guild_links WHERE guild_id=$1 AND rental_id=$2 AND owner_user_id=$3",[gid,id,access.ownerId]);
    if(!isLinked.rows.length){json(res,403,{error:"Location non liée à ce serveur"});return true}
    commandToken=await hostingOwnerToken(pool,access.ownerId);
    if(!commandToken){json(res,401,{error:"Le propriétaire doit relier CMD Hosting"});return true}
   }
   if(!/^[0-9a-f-]{36}$/i.test(id)||!["start","stop","restart"].includes(action)){json(res,400,{error:"Commande invalide"});return true}
   const d=await remote("/api/integrations/cmd-sphere/command",commandToken,{method:"POST",body:{id,action}});json(res,202,d);return true;
  }
  if(path==="/api/cmd-hosting/disconnect"&&req.method==="POST"){
   await remote("/api/integrations/cmd-sphere/revoke",token,{method:"POST"});
   await pool.query("DELETE FROM cmd_sphere_hosting_links WHERE user_id=$1",[uid]);
   await pool.query("DELETE FROM cmd_sphere_hosting_guild_links WHERE owner_user_id=$1",[uid]);
   json(res,200,{ok:true});return true;
  }
 }catch(e){json(res,[401,403,404,409,429].includes(e.status)?e.status:502,{error:txt(e.message||"Connexion CMD Hosting impossible",200)});return true}
 json(res,405,{error:"Méthode non autorisée"});return true;
}
