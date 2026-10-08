import crypto from "node:crypto";

const clean=(v,max=254)=>String(v??"").trim().slice(0,max);
const sha=t=>crypto.createHash("sha256").update(String(t)).digest("hex");
const token=()=>crypto.randomBytes(32).toString("hex");
const h=s=>clean(s,300).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const base=String(process.env.PUBLIC_BASE_URL||"").replace(/\/$/,"");
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function json(res,code,data){res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(data))}
function html(res,body,status=200){res.writeHead(status,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Frame-Options":"DENY"});res.end(body)}
function layout(title,body){return '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+h(title)+'</title><style>*{box-sizing:border-box}body{font:16px system-ui;background:#100d22;color:#eae5ff;max-width:600px;margin:11vh auto;padding:20px}main{border:1px solid #7161ad;background:#20172f;border-radius:18px;padding:26px}a{color:#b9a2ff}input,button{width:100%;font:inherit;border:1px solid #806ba6;border-radius:9px;padding:13px;margin:9px 0}input{background:#121126;color:white}button{background:#6441aa;color:white;font-weight:700}</style><main><h1>CMD Sphere</h1><h2>'+h(title)+'</h2>'+body+'<p><a href="/">Retour à CMD Sphere</a></p></main></html>'}
export async function initCmdEmailDb(pool){
 await pool.query("ALTER TABLE cmd_accounts ADD COLUMN IF NOT EXISTS email TEXT");
 await pool.query("ALTER TABLE cmd_accounts ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE");
 await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS cmd_accounts_email_unique ON cmd_accounts(lower(email)) WHERE email IS NOT NULL");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_account_email_tokens(token_hash TEXT PRIMARY KEY,account_id UUID NOT NULL REFERENCES cmd_accounts(id) ON DELETE CASCADE,purpose TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
}
export function normalizeEmail(email){
 const v=clean(email).toLowerCase();
 if(!emailPattern.test(v)||v.length>254)throw new Error("Adresse e-mail valide obligatoire.");
 return v;
}
export async function sendCmdAccountMail(pool,account,purpose="verify"){
 const email=normalizeEmail(account.email);
 const api=String(process.env.RESEND_API_KEY||""),from=String(process.env.RESEND_FROM_EMAIL||"");
 if(!api||!from)throw new Error("Expédition des e-mails indisponible pour le moment.");
 if(/@resend\.dev>?$/i.test(from)&&email!==String(process.env.CMD_FOUNDER_EMAIL||"").toLowerCase())throw new Error("L'expédition aux autres adresses attend un domaine CMD vérifié.");
 const recent=await pool.query("SELECT COUNT(*)::int AS n FROM cmd_account_email_tokens WHERE account_id=$1 AND purpose=$2 AND created_at>NOW()-INTERVAL '1 hour'",[account.id,purpose]);
 if(Number(recent.rows[0]?.n||0)>=3)throw new Error("Trop de liens demandés. Réessaie dans une heure.");
 const t=token(),ttl=purpose==="verify"?"24 hours":"30 minutes";
 await pool.query("INSERT INTO cmd_account_email_tokens(token_hash,account_id,purpose,expires_at) VALUES($1,$2,$3,NOW()+($4::text)::interval)",[sha(t),account.id,purpose,ttl]);
 const url=base+(purpose==="verify"?"/account-mail/verify":"/account-mail/reset")+"?token="+encodeURIComponent(t);
 const subject=purpose==="verify"?"CMD Sphere · Confirme ton adresse e-mail":"CMD Sphere · Mot de passe oublié";
 const body="<div style='font:17px Arial;background:#17112b;color:white;padding:27px;border-radius:14px'><h2>CMD Sphere</h2><p>Bonjour "+h(account.display_name||account.username)+",</p><p>"+(purpose==="verify"?"Confirme ton adresse e-mail.":"Tu as demandé un nouveau mot de passe.")+"</p><p><a style='background:#7457d7;color:white;padding:13px 19px;border-radius:10px;text-decoration:none;display:inline-block' href='"+url+"'>"+(purpose==="verify"?"Activer mon compte":"Réinitialiser mon mot de passe")+"</a></p><p>Lien à usage unique. Expiration : "+(purpose==="verify"?"24 heures.":"30 minutes.")+"</p></div>";
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+api,"Content-Type":"application/json"},body:JSON.stringify({from,to:[email],subject,html:body,reply_to:String(process.env.CMD_FOUNDER_EMAIL||"")})});
 if(!response.ok)throw new Error("Envoi non accepté par le service d'e-mail.");
 return true;
}
export async function attachFounderEmail(pool){
 const email=normalizeEmail(process.env.CMD_FOUNDER_EMAIL||"");
 const found=await pool.query("SELECT id,username,display_name,email,email_verified FROM cmd_accounts WHERE username_key=$1 LIMIT 1",[String(process.env.CMD_FOUNDER_USERNAME||"cmd").toLowerCase()]);
 const item=found.rows[0];if(!item)return;
 if(!item.email){await pool.query("UPDATE cmd_accounts SET email=$1 WHERE id=$2",[email,item.id]);item.email=email}
 if(item.email!==email)return;
 if(item.email_verified)return;
 const recent=await pool.query("SELECT 1 FROM cmd_account_email_tokens WHERE account_id=$1 AND purpose='verify' AND created_at>NOW()-INTERVAL '23 hours' LIMIT 1",[item.id]);
 if(!recent.rows.length){try{await sendCmdAccountMail(pool,item,"verify");console.log("[cmd-sphere-mail] Founder verification accepted")}catch(err){console.error("[cmd-sphere-mail] "+err.message)}}
}
export async function cmdEmailRoute(req,res,url,{pool,readBody,resetPassword}){
 const path=url.pathname;
 if(!["/account-recovery","/account-mail/verify","/account-mail/reset","/api/account/forgot","/api/account/resend","/api/account/reset-password"].includes(path))return false;
 try{
 if(path==="/account-recovery"&&req.method==="GET"){
 html(res,layout("Récupérer mon compte",'<p>Entre ton e-mail pour récupérer ton mot de passe ou demander un nouveau lien de validation.</p><form id="recover"><input type="email" name="email" placeholder="Adresse e-mail" required><select name="kind"><option value="forgot">Mot de passe oublié</option><option value="resend">Renvoyer le lien de vérification</option></select><button>Envoyer</button></form><p id="msg"></p><script>document.getElementById("recover").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target),url="/api/account/"+f.get("kind"),r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:f.get("email")})}),j=await r.json();document.getElementById("msg").textContent=j.message||j.error||"Demande envoyée"}</script>'));return true
 }
 if(path==="/account-mail/verify"&&req.method==="GET"){
 const hash=sha(clean(url.searchParams.get("token"),128));
 const used=await pool.query("UPDATE cmd_account_email_tokens SET used_at=NOW() WHERE token_hash=$1 AND purpose='verify' AND used_at IS NULL AND expires_at>NOW() RETURNING account_id",[hash]);
 if(used.rows.length)await pool.query("UPDATE cmd_accounts SET email_verified=TRUE WHERE id=$1",[used.rows[0].account_id]);
 html(res,layout("Vérification de l'e-mail",'<p>'+(used.rows.length?"Adresse confirmée. Tu peux te connecter sur CMD Sphere et son portail Développeur.":"Lien expiré ou déjà utilisé.")+'</p>'),used.rows.length?200:400);return true
 }
 if(path==="/account-mail/reset"&&req.method==="GET"){
 const t=clean(url.searchParams.get("token"),128);
 html(res,layout("Changer le mot de passe",'<form id="reset"><input name="password" placeholder="Nouveau mot de passe (6 caractères minimum)" type="password" required minlength="6" maxlength="128"><button>Modifier mon mot de passe</button></form><p id="msg"></p><script>document.getElementById("reset").onsubmit=async e=>{e.preventDefault();let r=await fetch("/api/account/reset-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:'+JSON.stringify(t)+',password:e.target.password.value})}),j=await r.json();document.getElementById("msg").textContent=j.message||j.error||"Erreur";if(r.ok)e.target.remove()}</script>'));return true
 }
 if(req.method!=="POST"){json(res,405,{error:"Méthode invalide"});return true}
 const body=await readBody(req);
 if(path==="/api/account/reset-password"){
 const t=clean(body.token,128),pw=String(body.password||"");
 if(pw.length<6||pw.length>128){json(res,400,{error:"6 caractères minimum"});return true}
 const used=await pool.query("UPDATE cmd_account_email_tokens SET used_at=NOW() WHERE token_hash=$1 AND purpose='reset' AND used_at IS NULL AND expires_at>NOW() RETURNING account_id",[sha(t)]);
 if(!used.rows.length){json(res,400,{error:"Lien invalide ou expiré"});return true}
 await resetPassword(used.rows[0].account_id,pw);
 json(res,200,{message:"Mot de passe changé. Connecte-toi avec ton nouvel identifiant."});return true
 }
 const email=normalizeEmail(body.email);
 const result=await pool.query("SELECT id,email,display_name,username,email_verified FROM cmd_accounts WHERE lower(email)=$1 LIMIT 1",[email]);const user=result.rows[0];
 if(user&&((path.endsWith("/forgot")&&user.email_verified)||(path.endsWith("/resend")&&!user.email_verified))){
   await sendCmdAccountMail(pool,user,path.endsWith("/forgot")?"reset":"verify");
 }
 json(res,200,{message:"Si cette adresse correspond à un compte éligible, un e-mail a été demandé."});return true
 }catch(e){json(res,400,{error:e.message});return true}
}
