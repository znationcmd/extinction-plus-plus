import crypto from "node:crypto";
/* CMD Sphere OAuth2, public client, authorization-code + PKCE S256.
 * Supported scope: identify. No refresh tokens, no unapproved redirect URLs.
 * Installed Discord apps do not inherit these permissions. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hash=s=>crypto.createHash("sha256").update(String(s)).digest("hex");
const challenge=s=>crypto.createHash("sha256").update(String(s)).digest("base64url");
const tok=()=>crypto.randomBytes(32).toString("base64url");
function error(message,status=400){const e=new Error(message);e.status=status;throw e}
export async function initCmdOAuthDb(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_oauth_codes(code_hash TEXT PRIMARY KEY,app_id UUID NOT NULL REFERENCES cmd_developer_apps(id) ON DELETE CASCADE,user_id TEXT NOT NULL,redirect_uri TEXT NOT NULL,pkce_challenge TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_oauth_access_tokens(token_hash TEXT PRIMARY KEY,app_id UUID NOT NULL REFERENCES cmd_developer_apps(id) ON DELETE CASCADE,user_id TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_oauth_user_idx ON cmd_oauth_access_tokens(user_id)");
}
async function configFor(pool,clientId,redirectUri){
 if(!uuid.test(clientId))error("Client ID CMD Sphere invalide");
 const r=await pool.query("SELECT a.id,a.name,a.description,COALESCE(s.config,'{}'::jsonb) AS config FROM cmd_developer_apps a LEFT JOIN cmd_developer_app_settings s ON s.app_id=a.id WHERE a.id=$1",[clientId]);
 const a=r.rows[0];if(!a)error("Application non enregistrée",404);
 if(!Array.isArray(a.config?.redirectUris)||!a.config.redirectUris.includes(redirectUri))error("URL de retour non autorisée. Enregistre-la dans CMD Sphere Développeur.");
 return a;
}
function params(body){return {clientId:String(body.client_id||""),redirectUri:String(body.redirect_uri||""),state:String(body.state||""),
  scope:String(body.scope||""),responseType:String(body.response_type||""),pkce:String(body.code_challenge||""),pkceMethod:String(body.code_challenge_method||"")}}
function validate(p){
 if(p.responseType!=="code")error("Seul response_type=code est pris en charge.");
 if(p.scope!=="identify")error("Seul le scope identify est pris en charge.");
 if(p.pkceMethod!=="S256"||!/^[A-Za-z0-9_-]{43,128}$/.test(p.pkce))error("Une preuve PKCE S256 valide est obligatoire.");
 if(p.redirectUri.length>500||p.state.length>500)error("Paramètre trop long.");
}
function consentPage(p,app){
 const details=JSON.stringify({client_id:p.clientId,redirect_uri:p.redirectUri,state:p.state,scope:p.scope,
  response_type:p.responseType,code_challenge:p.pkce,code_challenge_method:"S256"}).replace(/</g,"\\u003c");
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="referrer" content="no-referrer"><title>Autoriser '+esc(app.name)+' · CMD Sphere</title>'+
 '<style>body{font:16px system-ui;background:#18151f;color:#f5f3fa;min-height:100dvh;display:grid;place-items:center;padding:18px}main{max-width:450px;width:100%;padding:24px;background:#272231;border:1px solid #71608c;border-radius:18px}h1{font-size:24px}p{line-height:1.6;color:#cfc6df}button,a{padding:11px 15px;border-radius:9px;color:white;font:inherit}button{border:0;background:#6751ba}a{display:inline-block}small{color:#bdafc8}#err{color:#ffb9b9}</style></head><body><main>'+
 '<h1>Autoriser '+esc(app.name)+' ?</h1><p>'+esc(app.description||"Application CMD Sphere")+'</p>'+
 '<p>Cette application demande uniquement l’autorisation de connaître ton <b>identifiant et ton pseudo CMD Sphere</b>. Elle ne pourra ni lire tes messages ni accéder à tes serveurs.</p>'+
 '<small>Destination approuvée : '+esc(p.redirectUri)+'</small><p id="err" role="alert"></p>'+
 '<div><button id="ok" type="button">Autoriser</button> <a href="/developers">Annuler</a></div></main>'+
 '<script>const request='+details+';document.getElementById("ok").onclick=async()=>{const b=document.getElementById("ok");b.disabled=true;try{const r=await fetch("/api/cmd-oauth/authorize",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(request)});const d=await r.json();if(!r.ok||!d.redirect)throw Error(d.error||"Échec");location.assign(d.redirect)}catch(e){document.getElementById("err").textContent=e.message;b.disabled=false}}</script></body></html>';
}
export async function handleCmdOAuth(req,res,url,{pool,auth,html,sendJson,readBody}){
 const path=url.pathname;
 if(!path.startsWith("/api/cmd-oauth/"))return false;
 const json=(status,obj)=>sendJson(res,status,obj);
 try{
  if(path==="/api/cmd-oauth/authorize"&&(req.method==="GET"||req.method==="POST")){
   if(!auth){if(req.method==="GET"){res.writeHead(302,{location:"/dashboard-login"});res.end();return true}error("Connexion CMD Sphere requise",401)}
   const body=req.method==="GET"?Object.fromEntries(url.searchParams.entries()):await readBody(req);
   const p=params(body);validate(p);
   const app=await configFor(pool,p.clientId,p.redirectUri);
   if(req.method==="GET"){html(res,consentPage(p,app));return true}
   if(String(req.headers["content-type"]||"").split(";")[0]!=="application/json")error("JSON requis");
   if(req.headers.origin&&new URL(req.headers.origin).origin!==url.origin)error("Origine refusée",403);
   const code=tok();
   await pool.query("INSERT INTO cmd_oauth_codes(code_hash,app_id,user_id,redirect_uri,pkce_challenge,expires_at) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '5 minutes')",
      [hash(code),p.clientId,String(auth.user.id),p.redirectUri,p.pkce]);
   const dest=new URL(p.redirectUri);dest.searchParams.set("code",code);if(p.state)dest.searchParams.set("state",p.state);
   json(200,{redirect:dest.toString()});return true;
  }
  if(path==="/api/cmd-oauth/token"&&req.method==="POST"){
   if(String(req.headers["content-type"]||"").split(";")[0]!=="application/x-www-form-urlencoded")error("Corps x-www-form-urlencoded requis");
   const chunks=[];let total=0;for await(const b of req){total+=b.length;if(total>8192)error("Corps trop long",413);chunks.push(b)}
   const body=new URLSearchParams(Buffer.concat(chunks).toString("utf8")),code=body.get("code")||"",
    id=body.get("client_id")||"",redirect=body.get("redirect_uri")||"",verifier=body.get("code_verifier")||"";
   if(body.get("grant_type")!=="authorization_code"||!uuid.test(id)||!/^[A-Za-z0-9_-]{43,128}$/.test(verifier)||!code)error("Échange OAuth2 invalide");
   const row=await pool.query("DELETE FROM cmd_oauth_codes WHERE code_hash=$1 AND app_id=$2 AND redirect_uri=$3 AND expires_at>NOW() RETURNING user_id,pkce_challenge",[hash(code),id,redirect]);
   if(!row.rows[0])error("Code d’autorisation invalide, expiré ou déjà utilisé");
   const expected=Buffer.from(row.rows[0].pkce_challenge),actual=Buffer.from(challenge(verifier));
   if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual))error("Preuve PKCE incorrecte");
   const bearer=tok();
   await pool.query("INSERT INTO cmd_oauth_access_tokens(token_hash,app_id,user_id,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '1 hour')",
      [hash(bearer),id,String(row.rows[0].user_id)]);
   res.writeHead(200,{"content-type":"application/json","cache-control":"no-store","pragma":"no-cache"});
   res.end(JSON.stringify({access_token:bearer,token_type:"Bearer",expires_in:3600,scope:"identify"}));return true;
  }
  if(path==="/api/cmd-oauth/user"&&req.method==="GET"){
   const header=String(req.headers.authorization||"");
   if(!/^Bearer [A-Za-z0-9_-]{40,150}$/.test(header))error("Jeton Bearer requis",401);
   const t=await pool.query("SELECT user_id FROM cmd_oauth_access_tokens WHERE token_hash=$1 AND expires_at>NOW() LIMIT 1",[hash(header.slice(7))]);
   if(!t.rows[0])error("Jeton expiré ou invalide",401);
   const r=await pool.query("SELECT id::text AS id,username,COALESCE(display_name,username) AS display_name FROM cmd_accounts WHERE id::text=$1 LIMIT 1",[String(t.rows[0].user_id)]);
   if(!r.rows[0])error("Profil introuvable",404);
   json(200,r.rows[0]);return true;
  }
  json(404,{error:"Route OAuth2 inconnue"});return true;
 }catch(e){json(e.status||400,{error:e.message||"Échec OAuth2"});return true}
}
