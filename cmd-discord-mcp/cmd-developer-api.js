import crypto from "node:crypto";
const idRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const scopeList=["view_channels","read_messages","send_messages"];
const perms=items=>[...new Set((Array.isArray(items)?items:[]).filter(v=>scopeList.includes(v)))];
const clean=(v,max)=>String(v??"").trim().slice(0,max);
const hashed=v=>crypto.createHash("sha256").update(v).digest("hex");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const siteStyle="*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 5% 0,#29194b,#100d18 68%);color:#f7f2ff;font:15px system-ui}main{width:min(950px,96vw);margin:auto;padding:25px 12px 90px}nav{display:flex;gap:16px;align-items:center;flex-wrap:wrap}nav b{flex:1;font-size:22px}h1{font-size:clamp(28px,5vw,40px)}h2{font-size:19px}p{color:#c9bdd9;line-height:1.55}a{color:#d9b6ff}section{background:#242034;border:1px solid #76539677;border-radius:17px;margin:19px 0;padding:20px}label{display:grid;gap:7px;margin:13px 0}input,textarea,select{background:#13101e;border:1px solid #8b71b5;border-radius:9px;color:white;font:inherit;min-height:40px;padding:10px;width:100%}button,.button{font:inherit;cursor:pointer;border:0;border-radius:10px;background:#674bb3;padding:11px 16px;color:#fff;text-decoration:none;display:inline-flex}button:disabled{opacity:.5}.item{padding:14px;margin:10px 0;border:1px solid #ffffff18;border-radius:10px;background:#ffffff0c}.row{display:flex;gap:13px;flex-wrap:wrap}.check{display:flex;gap:9px;align-items:center}.check input{width:auto}.token{display:block;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;background:#10101c;border:1px solid #9774ca;border-radius:10px}";
function page(kind){
 const dev=kind==="developers";
 const title=dev?"CMD Sphere Développeur":kind==="choose"?"Inviter un bot":kind==="invite"?"Autoriser un bot":"Applications CMD Sphere";
 const intro=dev?'<h1>CMD Sphere Développeur</h1><p>Crée tes propres bots et applications directement sur CMD Sphere, sans passer par Discord.</p><section><h2>Créer une application</h2><form id="cmd-create-app"><label>Nom du bot<input name="name" minlength="2" maxlength="80" required></label><label>Description<textarea name="description" maxlength="500"></textarea></label><label>Identifiant Discord facultatif (pour une invitation sur les deux plateformes)<input name="discordClientId" pattern="[0-9]{15,22}"></label><button>Créer le bot</button></form><div id="cmd-token-area" hidden><p>Clé privée : copie-la maintenant, elle ne sera affichée qu’une fois.</p><code class="token" id="cmd-token"></code></div></section><section><h2>Mes applications</h2><div id="cmd-app-list"></div></section><section><h2>API pour les bots CMD</h2><p>Une clé API et des permissions par serveur permettent de lire les salons et les messages ou d’écrire dans les salons autorisés.</p><code class="token">Authorization: Bearer CLE_PRIVEE\nGET /api/cmd-bot/guilds\nGET /api/cmd-bot/channels?guildId=...\nGET /api/cmd-bot/messages?guildId=...&channelId=...\nPOST /api/cmd-bot/messages</code><p>Les bots Discord tiers devront être adaptés à cette API pour fonctionner sans Discord.</p></section>'
 :kind==="invite"?'<h1>Autoriser un bot CMD Sphere</h1><section><h2 id="cmd-bot-name">Chargement du bot…</h2><p id="cmd-bot-description"></p><label>Serveur CMD Sphere<select id="cmd-guild"></select></label><p>Droits accordés par le propriétaire ou administrateur :</p><label class="check"><input type="checkbox" value="view_channels" checked>Voir les salons</label><label class="check"><input type="checkbox" value="read_messages">Lire les messages</label><label class="check"><input type="checkbox" value="send_messages">Envoyer des messages</label><button id="cmd-confirm-install">Autoriser sur CMD Sphere</button></section>'
 :kind==="choose"?'<h1>Inviter un bot : choisir la plateforme</h1><section><h2 id="cmd-bot-name">Chargement…</h2><div class="row"><a class="button" id="cmd-choice-discord" hidden target="_blank" rel="noopener noreferrer">Discord</a><a class="button" id="cmd-choice-native" hidden>CMD Sphere</a></div><p id="cmd-choice-warning"></p></section>'
 :'<h1>Catalogue de bots CMD Sphere</h1><p>Applications enregistrées sur CMD Sphere et installables sans compte Discord.</p><section id="cmd-app-list"></section>';
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>'+title+'</title><meta name="robots" content="noindex,nofollow"><style>'+siteStyle+'</style></head><body><main><nav><b>CMD Sphere</b><a href="/dashboard">Accueil</a><a href="/developers">Développeur</a><a href="/apps/directory">Catalogue</a></nav>'+intro+'<p id="cmd-result" aria-live="polite"></p></main><script defer src="/cmd-developer.js"></script></body></html>';
}
export async function initDeveloperDb(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_developer_apps(id UUID PRIMARY KEY,owner_user_id TEXT NOT NULL,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',discord_client_id TEXT,token_hash TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_developer_apps_owner ON cmd_developer_apps(owner_user_id)");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_native_app_installs(guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,app_id UUID NOT NULL REFERENCES cmd_developer_apps(id) ON DELETE CASCADE,installed_by TEXT NOT NULL,permissions JSONB NOT NULL DEFAULT '[]'::jsonb,installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(guild_id,app_id))");
}
async function botAuth(pool,req){
 const token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
 if(!/^[\w-]{32,100}$/.test(token))throw Error("Clé du bot CMD requise.");
 const r=await pool.query("SELECT id,name FROM cmd_developer_apps WHERE token_hash=$1",[hashed(token)]);
 if(!r.rows[0])throw Error("Clé du bot CMD invalide.");
 return r.rows[0];
}
async function requireGrant(pool,app,gid,permission){
 if(!idRe.test(gid))throw Error("Serveur CMD invalide.");
 const r=await pool.query("SELECT permissions FROM cmd_native_app_installs WHERE guild_id=$1 AND app_id=$2",[gid,app.id]);
 if(!r.rows[0]||!perms(r.rows[0].permissions).includes(permission))throw Error("Permission non accordée au bot : "+permission);
}
export async function developerRoute(req,res,url,ctx){
 const p=url.pathname,m=req.method;
 if(!["/developers","/apps/directory","/apps/choose","/apps/invite"].includes(p)&&!p.startsWith("/api/developer/")&&!p.startsWith("/api/cmd-apps/")&&!p.startsWith("/api/cmd-bot/"))return false;
 const {pool,auth,baseUrl,sendJson,html,readBody,requireNativeAdmin,requireNativeMember}=ctx;
 const send=(code,data)=>sendJson(res,code,data);
 try{
  if(m==="GET"&&["/developers","/apps/directory","/apps/choose","/apps/invite"].includes(p)){
   if(!auth){res.writeHead(302,{Location:baseUrl+"/dashboard-login?next="+encodeURIComponent(p+url.search)});res.end();return true}
   html(res,page(p.split("/").pop()));return true;
  }
  if(p.startsWith("/api/cmd-bot/")){
   const app=await botAuth(pool,req);
   if(m==="GET"&&p==="/api/cmd-bot/guilds"){
    const r=await pool.query("SELECT g.id,g.name,i.permissions FROM cmd_native_app_installs i JOIN cmd_native_guilds g ON g.id=i.guild_id WHERE i.app_id=$1",[app.id]);
    send(200,{guilds:r.rows});return true;
   }
   const gid=String(url.searchParams.get("guildId")||"");
   if(m==="GET"&&p==="/api/cmd-bot/channels"){
    await requireGrant(pool,app,gid,"view_channels");
    const r=await pool.query("SELECT id,name,type,topic,position FROM cmd_native_channels WHERE guild_id=$1 ORDER BY position,name",[gid]);
    send(200,{channels:r.rows});return true;
   }
   if(m==="GET"&&p==="/api/cmd-bot/messages"){
    await requireGrant(pool,app,gid,"read_messages");const cid=String(url.searchParams.get("channelId")||"");
    if(!idRe.test(cid))throw Error("Salon invalide.");
    const r=await pool.query("SELECT m.id,m.body AS content,m.sender_user_id,m.created_at FROM cmd_native_channel_messages m JOIN cmd_native_channels c ON c.id=m.channel_id WHERE m.guild_id=$1 AND m.channel_id=$2 AND c.type IN ('text','announcement','forum') ORDER BY m.created_at DESC LIMIT 50",[gid,cid]);
    send(200,{messages:r.rows});return true;
   }
   if(m==="POST"&&p==="/api/cmd-bot/messages"){
    const b=await readBody(req),guildId=String(b.guildId||""),cid=String(b.channelId||""),content=clean(b.content,2000);
    await requireGrant(pool,app,guildId,"send_messages");
    if(!idRe.test(cid)||!content)throw Error("Salon ou message invalide.");
    const c=await pool.query("SELECT id FROM cmd_native_channels WHERE id=$1 AND guild_id=$2 AND type IN ('text','announcement','forum')",[cid,guildId]);if(!c.rows[0])throw Error("Salon introuvable.");
    const id=crypto.randomUUID();
    await pool.query("INSERT INTO cmd_native_channel_messages(id,guild_id,channel_id,sender_user_id,body,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)",[id,guildId,cid,"cmd-bot:"+app.id,content,JSON.stringify({bot:{id:app.id,name:app.name}})]);
    send(201,{ok:true,id});return true;
   }
   send(404,{error:"API du bot inconnue"});return true;
  }
  if(!auth){send(401,{error:"Connexion CMD Sphere requise"});return true}
  const user=String(auth.user.id);
  if(m==="GET"&&p==="/api/developer/apps"){
   const r=await pool.query("SELECT id,name,description,discord_client_id,created_at FROM cmd_developer_apps WHERE owner_user_id=$1 ORDER BY created_at DESC",[user]);send(200,{apps:r.rows});return true;
  }
  if(m==="POST"&&p==="/api/developer/apps"){
   const b=await readBody(req),name=clean(b.name,80),did=clean(b.discordClientId,22);
   if(name.length<2||(did&&!/^\d{15,22}$/.test(did)))throw Error("Nom ou identifiant invalide.");
   const count=await pool.query("SELECT COUNT(*)::int AS n FROM cmd_developer_apps WHERE owner_user_id=$1",[user]);if(Number(count.rows[0].n)>=40)throw Error("40 applications maximum.");
   const id=crypto.randomUUID(),secret=crypto.randomBytes(32).toString("base64url");
   await pool.query("INSERT INTO cmd_developer_apps(id,owner_user_id,name,description,discord_client_id,token_hash) VALUES($1,$2,$3,$4,$5,$6)",[id,user,name,clean(b.description,500),did||null,hashed(secret)]);
   send(201,{id,token:secret});return true;
  }
  if(m==="GET"&&p==="/api/cmd-apps/catalog"){
   const id=String(url.searchParams.get("clientId")||""),did=String(url.searchParams.get("discordClientId")||"");
   let r;
   if(id){if(!idRe.test(id))throw Error("Application inconnue.");r=await pool.query("SELECT id,name,description,discord_client_id FROM cmd_developer_apps WHERE id=$1",[id])}
   else if(did){if(!/^\d{15,22}$/.test(did))throw Error("Identifiant Discord invalide.");r=await pool.query("SELECT id,name,description,discord_client_id FROM cmd_developer_apps WHERE discord_client_id=$1",[did])}
   else r=await pool.query("SELECT id,name,description,discord_client_id FROM cmd_developer_apps ORDER BY created_at DESC LIMIT 100");
   send(200,{apps:r.rows});return true;
  }
  if(m==="POST"&&p==="/api/cmd-apps/install"){
   const b=await readBody(req),gid=String(b.guildId||""),id=String(b.clientId||"");
   if(!idRe.test(gid)||!idRe.test(id))throw Error("Serveur ou bot invalide.");
   await requireNativeAdmin(auth,gid);
   const a=await pool.query("SELECT id FROM cmd_developer_apps WHERE id=$1",[id]);if(!a.rows[0])throw Error("Bot CMD inconnu.");
   const rights=perms(b.permissions);
   await pool.query("INSERT INTO cmd_native_app_installs(guild_id,app_id,installed_by,permissions) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(guild_id,app_id) DO UPDATE SET installed_by=EXCLUDED.installed_by,permissions=EXCLUDED.permissions",[gid,id,user,JSON.stringify(rights)]);
   send(200,{ok:true,permissions:rights});return true;
  }
  if(m==="GET"&&p==="/api/cmd-apps/installed"){
   const gid=String(url.searchParams.get("guildId")||"");await requireNativeMember(auth,gid);
   const r=await pool.query("SELECT a.id,a.name,i.permissions FROM cmd_native_app_installs i JOIN cmd_developer_apps a ON a.id=i.app_id WHERE i.guild_id=$1",[gid]);send(200,{apps:r.rows});return true;
  }
  if(m==="POST"&&p==="/api/cmd-apps/remove"){
   const b=await readBody(req),gid=String(b.guildId||""),id=String(b.clientId||"");await requireNativeAdmin(auth,gid);
   await pool.query("DELETE FROM cmd_native_app_installs WHERE guild_id=$1 AND app_id=$2",[gid,id]);send(200,{ok:true});return true;
  }
  send(404,{error:"Route inconnue"});return true;
 }catch(e){send(400,{error:String(e.message||e)});return true}
}
