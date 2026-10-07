import { createServer } from "node:http";
import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import pg from "pg";
import { initConnections, getConnections, saveConnection, removeConnection, connectionsPage, profileConnectionsHtml, statusConnection } from "./connections.js";

const port=Number(process.env.PORT||8787);
const baseUrl=String(process.env.PUBLIC_BASE_URL||"").replace(/\/$/,"");
const backendSecret=String(process.env.CMD_MCP_SECRET||"");
const oauthSecret=String(process.env.OAUTH_SIGNING_SECRET||"");
const discordBridgeSecret=String(process.env.DISCORD_BRIDGE_SECRET||"");
const bridgeLoginUrl=String(process.env.DISCORD_ACCOUNT_BRIDGE_URL||"https://dashboard-production-e07b.up.railway.app/api/mod-auth/login");
const databaseUrl=String(process.env.DATABASE_URL||"");
const logoB64=String(process.env.CMD_DISCORD_LOGO_B64||"");
const iconB64=String(process.env.CMD_DISCORD_ICON_B64||"");
const pool=databaseUrl?new pg.Pool({connectionString:databaseUrl,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:5000}):null;
if(!/^https:\/\//.test(baseUrl))throw new Error("PUBLIC_BASE_URL must be HTTPS");
if(backendSecret.length<32)throw new Error("CMD_MCP_SECRET must be at least 32 characters");
if(oauthSecret.length<32)throw new Error("OAUTH_SIGNING_SECRET must be at least 32 characters");
if(discordBridgeSecret.length<32)throw new Error("DISCORD_BRIDGE_SECRET must be at least 32 characters");

const issuer=baseUrl;
const resource=baseUrl;
const MCP_PATH="/mcp";
const readScope="discord.read";
const writeScope="discord.write";
const readSecurity=[{type:"oauth2",scopes:[readScope]}];
const writeSecurity=[{type:"oauth2",scopes:[writeScope]}];

const bots={
  dayz:{label:"DAYZ GATE",base:String(process.env.DAYZ_ADMIN_URL||"")},
  ark:{label:"BOT ARK",base:String(process.env.ARK_ADMIN_URL||"")},
  extinction:{label:"EXTINCTION ++ RSS",base:String(process.env.EXT_ADMIN_URL||"")}
};
for(const [k,v] of Object.entries(bots))if(!/^https:\/\//.test(v.base))throw new Error("Missing "+k+" backend URL");

const jsonText=value=>JSON.stringify(value,null,2);
const ok=(message,data)=>({content:[{type:"text",text:message+"\n"+jsonText(data)}],structuredContent:data});
const failResult=e=>({isError:true,content:[{type:"text",text:String(e?.message||e)}]});
const b64url=input=>Buffer.from(input).toString("base64url");

function signPayload(payload,secret=oauthSecret){
  const encoded=b64url(JSON.stringify(payload));
  const sig=crypto.createHmac("sha256",secret).update(encoded).digest("base64url");
  return encoded+"."+sig;
}
function verifySigned(value,secret=oauthSecret){
  const parts=String(value||"").split(".");
  if(parts.length!==2)throw new Error("Jeton signé invalide.");
  const [encoded,sig]=parts;
  const expected=crypto.createHmac("sha256",secret).update(encoded).digest("base64url");
  const a=Buffer.from(sig),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw new Error("Signature invalide.");
  let data;try{data=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"))}catch{throw new Error("Jeton invalide.")}
  if(Number(data.exp||0)<Date.now())throw new Error("Jeton expiré.");
  return data;
}
function verifyDiscordBridge(value){
  const data=verifySigned(value,discordBridgeSecret);
  if(data?.v!==1||!data?.user?.id||!Array.isArray(data.guilds))throw new Error("Connexion Discord invalide.");
  const guilds=data.guilds.map(g=>({
    id:String(g.id||""),
    name:String(g.name||g.id||"Discord").slice(0,100),
    icon:g.icon?String(g.icon).slice(0,300):null
  })).filter(g=>/^\d{15,22}$/.test(g.id)).slice(0,100);
  return {
    user:{
      id:String(data.user.id),
      name:String(data.user.name||"Discord").slice(0,100),
      displayName:String(data.user.displayName||data.user.name||"Discord").slice(0,100),
      avatar:data.user.avatar?String(data.user.avatar).slice(0,500):null,
      banner:data.user.banner?String(data.user.banner).slice(0,500):null,
      accentColor:data.user.accentColor??null
    },
    guildIds:[...new Set(guilds.map(g=>g.id))],
    guilds
  };
}
function pkceS256(value){return crypto.createHash("sha256").update(String(value)).digest("base64url")}
function parseScopes(value){
  const requested=String(value||"").split(/\s+/).filter(Boolean);
  const allowed=new Set([readScope,writeScope]);
  const scopes=requested.filter(x=>allowed.has(x));
  if(!scopes.includes(readScope))scopes.unshift(readScope);
  return [...new Set(scopes)];
}
function validateChatGPTClient(clientId,redirectUri){
  let c,r;try{c=new URL(String(clientId));r=new URL(String(redirectUri))}catch{throw new Error("Client OAuth invalide.")}
  if(c.protocol!=="https:"||c.hostname!=="chatgpt.com"||!c.pathname.startsWith("/oauth/"))throw new Error("Client OAuth non autorisé.");
  if(r.protocol!=="https:"||r.hostname!=="chatgpt.com"||!(r.pathname==="/connector_platform_oauth_redirect"||r.pathname.startsWith("/connector/oauth/")))throw new Error("Redirect OAuth non autorisé.");
}
function sendJson(res,status,data,headers={}){
  res.writeHead(status,{"content-type":"application/json","cache-control":"no-store",...headers});
  res.end(JSON.stringify(data));
}
function redirect(res,url){res.writeHead(302,{Location:url,"cache-control":"no-store"});res.end()}
async function readFormBodyJson(req){
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024)throw new Error("Requête trop volumineuse (12 Mo maximum).");chunks.push(chunk)}
  return JSON.parse(Buffer.concat(chunks).toString("utf8")||"{}");
}
async function readForm(req){
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>65536)throw new Error("Requête OAuth trop volumineuse.");chunks.push(chunk)}
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}
function oauthErrorRedirect(res,redirectUri,state,error,description){
  const url=new URL(redirectUri);url.searchParams.set("error",error);if(description)url.searchParams.set("error_description",description);if(state)url.searchParams.set("state",state);url.searchParams.set("iss",issuer);redirect(res,url);
}
function issueTokens(codeData){
  const now=Date.now();
  const access={typ:"access",exp:now+8*3600*1000,iat:now,user:codeData.user,guildIds:codeData.guildIds,scope:codeData.scope,aud:resource,clientId:codeData.clientId};
  const refresh={typ:"refresh",exp:now+30*24*3600*1000,iat:now,user:codeData.user,guildIds:codeData.guildIds,scope:codeData.scope,aud:resource,clientId:codeData.clientId};
  return {access_token:signPayload(access),token_type:"Bearer",expires_in:8*3600,refresh_token:signPayload(refresh),scope:codeData.scope.join(" ")};
}
function parseCookies(req){
  const out={};for(const part of String(req.headers.cookie||"").split(";")){const i=part.indexOf("=");if(i<0)continue;const k=part.slice(0,i).trim(),v=part.slice(i+1).trim();if(k)out[k]=decodeURIComponent(v)}
  return out;
}
function dashboardAuth(req){
  const cookies=parseCookies(req);
  const raw=cookies.cmd_sphere_session||cookies.cmd_discord_dashboard;
  if(!raw)return null;
  try{const d=verifySigned(raw);return d.typ==="dashboard_session"&&d.user?.id&&Array.isArray(d.guildIds)?d:null}catch{return null}
}
function dashboardCookie(value,maxAge=10*365*24*3600){
  return "cmd_sphere_session="+encodeURIComponent(value)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+maxAge+"; Expires="+new Date(Date.now()+maxAge*1000).toUTCString();
}
function clearDashboardCookies(){
  return [
    "cmd_sphere_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "cmd_discord_dashboard=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ];
}
function html(res,body,status=200,headers={}){
  res.writeHead(status,{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer",...headers});res.end(body);
}
function dashboardPage(auth){
  const user=String(auth?.user?.name||"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]));
  const style='*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,Segoe UI,Arial;background:radial-gradient(circle at 20% 0,#2b1c55 0,#0b0d15 38%,#05070b 100%);color:#fff;min-height:100vh}a{color:inherit}.wrap{max-width:1180px;margin:auto;padding:24px}.top{display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap}.brand{display:flex;gap:12px;align-items:center}.logo{width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,#7c3aed,#ec4899);display:grid;place-items:center;font-weight:1000;box-shadow:0 10px 35px #7c3aed44}.muted{color:#aeb4c0}.btn{border:1px solid #ffffff22;background:#ffffff0d;color:#fff;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px}.btn:hover{background:#ffffff17}.primary{background:linear-gradient(135deg,#7c3aed,#db2777);border:0}.grid{display:grid;grid-template-columns:320px 1fr;gap:18px;margin-top:24px}.card{background:#10131bcc;border:1px solid #ffffff14;border-radius:18px;padding:16px;box-shadow:0 16px 50px #0005;backdrop-filter:blur(10px)}label{display:grid;gap:6px;font-size:13px;color:#c9ced8;margin-bottom:12px}input,select,textarea{width:100%;background:#080a10;border:1px solid #ffffff1d;color:#fff;border-radius:11px;padding:11px;font:inherit}textarea{min-height:84px;resize:vertical}.guild{width:100%;text-align:left;margin:7px 0}.guild.active{outline:2px solid #a78bfa}.bot{display:inline-flex;padding:3px 7px;border-radius:999px;background:#ffffff12;font-size:11px;margin-right:5px}.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.section{margin-top:16px}.list{display:grid;gap:8px;max-height:460px;overflow:auto}.row{padding:10px 12px;border:1px solid #ffffff12;background:#ffffff08;border-radius:12px}.row small{color:#9aa1ad}.status{position:fixed;right:18px;bottom:18px;max-width:360px;padding:12px 15px;border-radius:12px;background:#111827;border:1px solid #ffffff22;display:none}.status.show{display:block}.hero{padding:70px 20px;text-align:center}.hero h1{font-size:clamp(38px,7vw,72px);margin:0 0 12px}.hero p{font-size:18px;color:#b9bfca;max-width:720px;margin:0 auto 24px}.empty{padding:30px;text-align:center;color:#aeb4c0}.sphere-app{min-height:100dvh;padding-left:82px}.server-rail{position:fixed;z-index:15;left:0;top:0;bottom:0;width:82px;background:#0d0a11;border-right:1px solid #ffffff10;padding:10px 9px;display:flex;flex-direction:column;align-items:center;gap:9px;overflow-y:auto}.server-rail::-webkit-scrollbar{display:none}.rail-home,.rail-server,.rail-plus{width:56px;height:56px;min-height:56px;border:0;border-radius:19px;background:#24172d;color:#fff;display:grid;place-items:center;overflow:hidden;position:relative;transition:.16s}.rail-home:hover,.rail-server:hover,.rail-server.active,.rail-plus:hover{border-radius:15px;background:#5865f2}.rail-home img,.rail-server img{width:100%;height:100%;object-fit:cover}.rail-server.off{opacity:.4;filter:grayscale(.5)}.rail-server.off:after{content:"+";position:absolute;right:0;bottom:0;width:20px;height:20px;border-radius:50%;background:#5865f2;border:3px solid #0d0a11;display:grid;place-items:center;font-size:13px;font-weight:1000}.rail-initial{font-weight:950}.rail-sep{width:36px;height:2px;border-radius:3px;background:#ffffff17}.rail-plus{margin-top:auto;font-size:31px;color:#aab5ff}.rail-top{background:linear-gradient(135deg,#5b21b6,#db2777);font-size:27px;text-decoration:none}.rail-top:after{content:\"VOTE\";position:absolute;bottom:2px;left:50%;transform:translateX(-50%);font-size:7px;font-weight:1000;background:#09070dcb;padding:1px 4px;border-radius:4px}.logo-img{width:58px;height:58px;border-radius:16px;object-fit:cover;box-shadow:0 10px 35px #5b21b655}.brand-logo{width:min(560px,92vw);display:block;margin:0 auto 20px;border-radius:24px;box-shadow:0 24px 70px #0009}.add-modal{display:none;position:fixed;z-index:30;inset:0;background:#000b;align-items:center;justify-content:center;padding:18px}.add-modal.on{display:flex}.add-card{width:min(620px,100%);max-height:88dvh;overflow:auto;background:#1b1221;border:1px solid #ffffff16;border-radius:22px;padding:20px;box-shadow:0 28px 80px #000c}.add-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.add-choice{min-height:90px;text-align:left}.add-card input{width:100%;background:#09070d;border:1px solid #ffffff1c;border-radius:11px;padding:12px;color:#fff}.native-box{padding:13px;border:1px solid #ffffff12;border-radius:14px;background:#ffffff07;margin-top:10px}.native-box strong,.native-box small{display:block}.native-box small{color:#aeb4c0}.hidden{display:none!important}@media(max-width:850px){.sphere-app{padding-left:72px}.server-rail{width:72px;padding-inline:7px}.rail-home,.rail-server,.rail-plus{width:52px;height:52px;min-height:52px}.grid{grid-template-columns:1fr}.grid>aside.card{display:none}.cols{grid-template-columns:1fr}.wrap{padding:14px}.top{align-items:flex-start}.brand>div:not(.logo-img){min-width:0}.add-grid{grid-template-columns:1fr}}';
  if(!auth)return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>CMD Sphere</title><meta name="theme-color" content="#9b4dff"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/app-icon.webp?v=5"><style>'+style+'.authbox{width:min(920px,94vw);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:14px;text-align:left}.authpanel{background:#121019dd;border:1px solid #ffffff14;border-radius:20px;padding:18px}.authpanel h2{margin-top:0}.authpanel .btn{width:100%;justify-content:center}.authpanel input{margin-bottom:10px}.or{text-align:center;color:#8e8795;margin:14px 0}@media(max-width:720px){.authbox{grid-template-columns:1fr}}</style></head><body><div class="hero" style="padding-bottom:22px"><img class="brand-logo" src="/brand-logo.webp?v=5" alt="CMD Sphere"><h1>CMD Sphere</h1><p>Un seul compte CMD Sphere. Tu peux te connecter avec Discord ou avec un compte créé directement ici.</p></div><div class="authbox"><div class="authpanel"><h2>Continuer avec Discord</h2><p class="muted">Ton compte Discord devient automatiquement un compte CMD Sphere et garde tes serveurs accessibles.</p><a class="btn primary" href="/dashboard-login">💬 Continuer avec Discord</a><div class="or">ou</div><h2>Se connecter</h2><form id="nativeLogin"><input name="username" autocomplete="username" placeholder="Identifiant CMD Sphere" required minlength="3" maxlength="32"><input name="password" autocomplete="current-password" type="password" placeholder="Mot de passe" required minlength="8" maxlength="128"><button class="btn" type="submit">Connexion CMD Sphere</button></form></div><div class="authpanel"><h2>Créer un compte CMD Sphere</h2><p class="muted">Pas besoin de Discord. Tu pourras le lier plus tard au même compte.</p><form id="nativeSignup"><input name="displayName" autocomplete="name" placeholder="Nom affiché" maxlength="80"><input name="username" autocomplete="username" placeholder="Identifiant (3 à 32 caractères)" required minlength="3" maxlength="32"><input name="password" autocomplete="new-password" type="password" placeholder="Mot de passe (8 caractères minimum)" required minlength="8" maxlength="128"><button class="btn primary" type="submit">Créer mon compte</button></form><p id="authMsg" class="muted"></p></div></div><script>async function account(url,form){const msg=document.getElementById("authMsg");msg.textContent="";const body=Object.fromEntries(new FormData(form));const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Erreur");location.href="/dashboard"}document.getElementById("nativeLogin").onsubmit=async e=>{e.preventDefault();try{await account("/api/account/login",e.currentTarget)}catch(x){document.getElementById("authMsg").textContent=x.message}};document.getElementById("nativeSignup").onsubmit=async e=>{e.preventDefault();try{await account("/api/account/signup",e.currentTarget)}catch(x){document.getElementById("authMsg").textContent=x.message}}</script></body></html>';
  const script=`
  const S={guild:null,bot:null,structure:null};const qs=s=>document.querySelector(s);
  function esc(v){return String(v||'').replace(/[&<>]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]))}
  function toast(m,ok=true){const e=qs('#status');e.textContent=m;e.style.borderColor=ok?'#34d39966':'#fb718566';e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3500)}
  async function api(url,opt){const r=await fetch(url,{cache:'no-store',...opt,headers:{'content-type':'application/json',...(opt&&opt.headers||{})}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Erreur');return d}
  function iconUrl(g){if(!g||!g.icon)return '';if(/^https?:/.test(g.icon))return g.icon;if(/^\d{15,22}$/.test(String(g.id)))return 'https://cdn.discordapp.com/icons/'+g.id+'/'+g.icon+'.png?size=128';return ''}
  function iconHtml(g){const u=iconUrl(g);return u?'<img src="'+esc(u)+'" alt="">':'<span class="rail-initial">'+esc((g.name||'?').slice(0,2).toUpperCase())+'</span>'}
  async function loadGuilds(){const [d,n]=await Promise.all([api('/api/dashboard/guilds'),api('/api/native/guilds')]);const e=qs('#guilds'),rail=qs('#railGuilds');e.innerHTML='';rail.innerHTML='';
    for(const ng of n.guilds||[]){const r=document.createElement('button');r.className='rail-server';r.title=ng.name;r.innerHTML=iconHtml(ng);r.onclick=()=>selectNative(ng,r);rail.appendChild(r)}
    if((n.guilds||[]).length&&(d.guilds||[]).length){const sep=document.createElement('div');sep.className='rail-sep';rail.appendChild(sep)}
    for(const g of d.guilds||[]){const b=document.createElement('button');b.className='btn guild'+(g.installed?'':' off');b.innerHTML='<strong>'+esc(g.name)+'</strong><br><span class="muted">'+(g.installed?g.availableBots.map(x=>esc(x.name)).join(' · '):'Aucun bot CMD installé')+'</span>';b.onclick=()=>selectGuild(g,b);e.appendChild(b);const r=document.createElement('button');r.className='rail-server '+(g.installed?'':'off');r.title=g.name;r.innerHTML=iconHtml(g);r.onclick=()=>selectGuild(g,b,r);rail.appendChild(r)}
    if(!e.children.length)e.innerHTML='<div class="empty">Tes Discord apparaîtront ici.</div>'}
  async function selectGuild(g,el,railEl){document.querySelectorAll('.guild,.rail-server').forEach(x=>x.classList.remove('active'));el&&el.classList.add('active');railEl&&railEl.classList.add('active');S.guild=g;S.bot=g.availableBots[0]?.id||null;qs('#gtitle').textContent=g.name;qs('#gbots').innerHTML=g.availableBots.map(x=>'<span class="bot">'+esc(x.name)+'</span>').join('');qs('#refresh').disabled=!g.installed;if(!g.installed){qs('#workspace').className='empty';qs('#workspace').innerHTML='<h2>'+esc(g.name)+'</h2><p>Ce Discord est visible car tu le gères, mais aucun bot CMD n’y est installé. Il reste grisé dans la barre à gauche.</p><button class="btn primary" onclick="openAdd(\'import\')">Importer / connecter</button>';return}await loadStructure()}
  async function selectNative(g,railEl){document.querySelectorAll('.guild,.rail-server').forEach(x=>x.classList.remove('active'));railEl&&railEl.classList.add('active');S.guild=null;S.bot=null;qs('#refresh').disabled=true;qs('#gtitle').textContent=g.name;qs('#gbots').innerHTML='<span class="bot">CMD Sphere</span>';try{const d=await api('/api/native/guild/'+encodeURIComponent(g.id));const cats=(d.channels||[]).filter(x=>x.type==='category'),chs=(d.channels||[]).filter(x=>x.type!=='category');qs('#workspace').className='';qs('#workspace').innerHTML='<div class="card"><h2>'+esc(d.guild.name)+'</h2><p class="muted">'+Number(d.guild.member_count||1)+' membre(s) · serveur CMD Sphere</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="copyInvite(\''+esc(d.inviteUrl)+'\')">Copier invitation</button><a class="btn" href="/profile">Mon profil</a></div></div><div class="section"><h3>Catégories & salons</h3><div class="list">'+cats.map(c=>'<div class="row"><strong>📁 '+esc(c.name)+'</strong>'+chs.filter(x=>String(x.source_parent_id||'')===String(c.source_channel_id||c.id)).map(x=>'<div><small>'+esc(x.type)+'</small> · '+esc(x.name)+'</div>').join('')+'</div>').join('')+chs.filter(x=>!x.source_parent_id).map(x=>'<div class="row"><small>'+esc(x.type)+'</small> · '+esc(x.name)+'</div>').join('')+'</div></div><div class="section"><h3>Rôles</h3><div class="list">'+(d.roles||[]).map(r=>'<div class="row"><strong>'+esc(r.name)+'</strong> <small>position '+Number(r.position||0)+'</small></div>').join('')+'</div></div>'}catch(e){toast(e.message,false)}}
  async function loadStructure(){try{const d=await api('/api/dashboard/structure?guildId='+encodeURIComponent(S.guild.id)+(S.bot?'&bot='+encodeURIComponent(S.bot):''));S.structure=d;render()}catch(e){toast(e.message,false)}}
  function render(){const d=S.structure||{},cats=(d.channels||[]).filter(x=>x.type==='category'),channels=(d.channels||[]).filter(x=>x.type!=='category'),roles=(d.roles||[]).filter(x=>!x.managed),w=qs('#workspace');w.className='';
    let h='<div class="cols section">';
    h+='<form id="catf" class="card"><h3>Nouvelle catégorie</h3><label>Nom<input name="name" required maxlength="100"></label><button class="btn primary">Créer</button></form>';
    h+='<form id="chf" class="card"><h3>Nouveau salon</h3><label>Nom<input name="name" required maxlength="100"></label><label>Type<select name="type"><option value="text">Texte</option><option value="voice">Vocal</option><option value="announcement">Annonce</option><option value="forum">Forum</option></select></label><label>Catégorie<select name="parentId"><option value="">Aucune</option>';
    h+=cats.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');
    h+='</select></label><label>Sujet<textarea name="topic" maxlength="1024"></textarea></label><button class="btn primary">Créer</button></form>';
    h+='<form id="rolef" class="card"><h3>Nouveau rôle</h3><label>Nom<input name="name" required maxlength="100"></label><label>Couleur<input name="color" value="#7c3aed" pattern="#?[0-9A-Fa-f]{6}"></label><label><input type="checkbox" name="hoist" style="width:auto"> Afficher séparément</label><label><input type="checkbox" name="mentionable" style="width:auto"> Mentionnable</label><button class="btn primary">Créer</button></form></div>';
    h+='<div class="section"><h3>Catégories & salons</h3><div class="list">';
    h+=cats.map(c=>'<div class="row"><strong>📁 '+esc(c.name)+'</strong>'+channels.filter(x=>x.parentId===c.id).map(x=>'<div><small>'+esc(x.type)+'</small> · '+esc(x.name)+'</div>').join('')+'</div>').join('');
    h+=channels.filter(x=>!x.parentId).map(x=>'<div class="row"><small>'+esc(x.type)+'</small> · '+esc(x.name)+'</div>').join('');
    h+='</div></div><div class="section"><h3>Rôles</h3><div class="list">';
    h+=roles.map(r=>'<div class="row"><strong>'+esc(r.name)+'</strong> <small>position '+Number(r.position||0)+'</small></div>').join('');
    h+='</div></div>';w.innerHTML=h;
    qs('#catf').onsubmit=e=>submit(e,'create_category');qs('#chf').onsubmit=e=>submit(e,'create_channel');qs('#rolef').onsubmit=e=>submit(e,'create_role');
  }
  async function submit(e,action){e.preventDefault();const f=new FormData(e.currentTarget),body={action,guildId:S.guild.id,bot:S.bot};for(const [k,v] of f)body[k]=v;if(action==='create_role'){body.hoist=e.currentTarget.hoist.checked;body.mentionable=e.currentTarget.mentionable.checked}try{await api('/api/dashboard/action',{method:'POST',body:JSON.stringify(body)});toast('Modification appliquée sur Discord');e.currentTarget.reset();await loadStructure()}catch(x){toast(x.message,false)}}
  function openAdd(view='menu'){qs('#addModal').classList.add('on');renderAdd(view)}
  function closeAdd(){qs('#addModal').classList.remove('on')}
  function renderAdd(view){const box=qs('#addBody');if(view==='menu'){box.innerHTML='<h2>Ajouter un serveur</h2><p class="muted">Comme sur une application communautaire classique.</p><div class="add-grid"><button class="btn add-choice" onclick="renderAdd(\'create\')"><b>＋ Créer un serveur</b><br><small>Nouvel espace CMD Sphere</small></button><button class="btn add-choice" onclick="renderAdd(\'join\')"><b>🔗 J’ai une invitation</b><br><small>Rejoindre par lien ou code</small></button><button class="btn add-choice" onclick="renderAdd(\'discover\')"><b>◎ Découvrir</b><br><small>Voir les serveurs publics</small></button><button class="btn add-choice" onclick="renderAdd(\'import\')"><b>⬇ Importer Discord</b><br><small>Copier salons, rôles et permissions</small></button></div>';return}if(view==='create'){box.innerHTML='<h2>Créer un serveur CMD Sphere</h2><form id="createNative"><p><input name="name" required maxlength="100" placeholder="Nom du serveur"></p><label><input type="checkbox" name="isPublic" style="width:auto"> Visible dans Découvrir</label><p><button class="btn primary">Créer</button> <button type="button" class="btn" onclick="renderAdd(\'menu\')">Retour</button></p></form>';qs('#createNative').onsubmit=createNative;return}if(view==='join'){box.innerHTML='<h2>Rejoindre un serveur</h2><form id="joinNative"><p><input name="invite" required placeholder="Lien ou code d’invitation CMD Sphere"></p><p><button class="btn primary">Rejoindre</button> <button type="button" class="btn" onclick="renderAdd(\'menu\')">Retour</button></p></form>';qs('#joinNative').onsubmit=joinNative;return}if(view==='discover'){box.innerHTML='<h2>Découvrir</h2><div id="discoverNative"><p class="muted">Chargement…</p></div><p><button class="btn" onclick="renderAdd(\'menu\')">Retour</button></p>';loadDiscover();return}if(view==='import'){box.innerHTML='<h2>Importer depuis Discord</h2><p class="muted">Seuls les Discord avec un bot CMD peuvent être copiés automatiquement.</p><button class="btn primary" onclick="importAll()">Importer tous ceux disponibles</button><div id="importList"></div><p><button class="btn" onclick="renderAdd(\'menu\')">Retour</button></p>';loadImports();return}}
  async function createNative(e){e.preventDefault();const f=new FormData(e.currentTarget);try{await api('/api/native/guilds',{method:'POST',body:JSON.stringify({name:f.get('name'),isPublic:f.get('isPublic')==='on'})});closeAdd();await loadGuilds();toast('Serveur CMD Sphere créé')}catch(x){toast(x.message,false)}}
  function joinNative(e){e.preventDefault();let v=String(new FormData(e.currentTarget).get('invite')||'').trim();try{if(v.includes('/invite/'))v=new URL(v).pathname.split('/').filter(Boolean).pop()}catch{}if(v)location.href='/invite/'+encodeURIComponent(v)}
  async function loadDiscover(){try{const d=await api('/api/native/discover');qs('#discoverNative').innerHTML=(d.guilds||[]).map(g=>'<div class="native-box"><strong>'+esc(g.name)+'</strong><small>'+Number(g.member_count||0)+' membre(s)</small><p><a class="btn primary" href="'+esc(g.inviteUrl)+'">Rejoindre</a></p></div>').join('')||'<p class="muted">Aucun serveur public.</p>'}catch(x){toast(x.message,false)}}
  async function loadImports(){try{const d=await api('/api/dashboard/guilds');qs('#importList').innerHTML=(d.guilds||[]).map(g=>'<div class="native-box"><strong>'+esc(g.name)+'</strong><small>'+(g.installed?'Bot CMD disponible':'Aucun bot CMD installé')+'</small>'+(g.installed?'<p><button class="btn" onclick="importOne(\''+esc(g.id)+'\')">Importer</button></p>':'')+'</div>').join('')}catch(x){toast(x.message,false)}}
  async function importOne(id){try{await api('/api/native/import',{method:'POST',body:JSON.stringify({sourceGuildId:id})});closeAdd();await loadGuilds();toast('Discord importé dans CMD Sphere')}catch(x){toast(x.message,false)}}
  async function importAll(){try{const d=await api('/api/native/import-all',{method:'POST',body:'{}'});closeAdd();await loadGuilds();toast((d.imported||[]).length+' serveur(s) importé(s)')}catch(x){toast(x.message,false)}}
  async function copyInvite(v){try{await navigator.clipboard.writeText(v);toast('Invitation copiée')}catch{prompt('Copie le lien',v)}}
  qs('#refresh').onclick=loadStructure;qs('#railPlus').onclick=()=>openAdd('menu');qs('#addClose').onclick=closeAdd;qs('#addModal').onclick=e=>{if(e.target.id==='addModal')closeAdd()};if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});loadGuilds().catch(e=>toast(e.message,false));
  `;
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#12051f"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/app-icon.webp?v=5"><title>CMD Sphere</title><style>'+style+'</style></head><body><div class="sphere-app"><aside class="server-rail"><a class="rail-home" href="/dashboard" title="CMD Sphere"><img src="/app-icon.webp?v=5" alt="CMD Sphere"></a><div class="rail-sep"></div><a class="rail-server rail-top" href="https://cmd-top-serveur-production.up.railway.app" target="_blank" rel="noopener" title="CMD Top Serveur · Voter">🏆</a><div class="rail-sep"></div><div id="railGuilds" style="display:contents"></div><button class="rail-plus" id="railPlus" title="Créer ou rejoindre">＋</button></aside><div class="wrap"><div class="top"><div class="brand"><img src="/app-icon.webp?v=5" class="logo-img" alt="CMD Sphere"><div><h1 style="margin:0">CMD Sphere</h1><div class="muted">Communautés · Salons · Rôles · Invitations · Votes</div></div></div><div><span class="muted">'+user+'</span> <a class="btn" href="/profile">Mon profil</a> <a class="btn" href="/dashboard-logout">Déconnexion</a></div></div><div class="grid"><aside class="card"><h2>Mes Discord</h2><div id="guilds" class="list"><div class="empty">Chargement…</div></div></aside><main class="card"><div class="top"><div><h2 id="gtitle" style="margin:0">CMD Sphere</h2><div id="gbots" class="muted"></div></div><button id="refresh" class="btn" disabled>Actualiser</button></div><div id="workspace" class="empty"><img class="brand-logo" src="/brand-logo.webp?v=5" alt="CMD Sphere"><h2>Choisis un serveur dans la barre de gauche</h2><p>Ou appuie sur ＋ pour en créer/rejoindre un.</p><div class="card" style="margin:22px auto 0;max-width:640px;text-align:left;background:linear-gradient(135deg,#24102f,#15101f)"><div class="top"><div><div class="muted">🏆 CMD TOP SERVEUR</div><h2 style="margin:5px 0">Vote pour tes serveurs préférés</h2><p class="muted" style="margin:0">Classement par votes · 24 h / mois / total · 1 vote toutes les 2 heures.</p></div><a class="btn primary" href="https://cmd-top-serveur-production.up.railway.app" target="_blank" rel="noopener">🗳️ VOTER</a></div></div></div></main></div></div></div><div id="addModal" class="add-modal"><div class="add-card"><div style="display:flex;justify-content:flex-end"><button class="btn" id="addClose">✕</button></div><div id="addBody"></div></div></div><div id="status" class="status"></div><script>'+script+'</script></body></html>';
}

function bearerAuth(req){
  const raw=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  if(!raw)return null;
  try{
    const data=verifySigned(raw);
    if(data.typ!=="access"||data.aud!==resource||!data.user?.id||!Array.isArray(data.guildIds)||!Array.isArray(data.scope))return null;
    return data;
  }catch{return null}
}
function requireScope(auth,scope){
  if(!auth?.scope?.includes(scope))throw new Error("Autorisation manquante: "+scope);
}
function requireGuild(auth,guildId){
  if(!auth.guildIds.includes(String(guildId)))throw new Error("Ce Discord n'est pas autorisé pour ce compte.");
}

async function initNativeDb(){
  if(!pool)throw new Error("DATABASE_URL manquant");
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_guilds(
    id UUID PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    source_discord_id TEXT,
    name TEXT NOT NULL,
    icon TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner_user_id,source_discord_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_members(
    guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    membership_role TEXT NOT NULL DEFAULT 'member',
    profile_display_name TEXT,
    profile_avatar_data_url TEXT,
    profile_bio TEXT,
    profile_status TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(guild_id,user_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_channels(
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
    source_channel_id TEXT,
    source_parent_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    topic TEXT,
    position INT NOT NULL DEFAULT 0,
    permission_overwrites JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(guild_id,source_channel_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_roles(
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
    source_role_id TEXT,
    name TEXT NOT NULL,
    color TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    position INT NOT NULL DEFAULT 0,
    hoist BOOLEAN NOT NULL DEFAULT FALSE,
    mentionable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(guild_id,source_role_id)
  )`);  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_global_profiles(
    user_id TEXT PRIMARY KEY,
    display_name TEXT,
    avatar_data_url TEXT,
    banner_data_url TEXT,
    bio TEXT,
    status TEXT,
    accent_color TEXT,
    theme TEXT NOT NULL DEFAULT 'purple',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_accounts(
    id UUID PRIMARY KEY,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL UNIQUE,
    display_name TEXT,
    password_salt TEXT,
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_account_identities(
    account_id UUID NOT NULL REFERENCES cmd_accounts(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    guilds JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(provider,provider_user_id),
    UNIQUE(account_id,provider)
  )`);
  await pool.query('ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_banner_data_url TEXT');
  await pool.query('ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_accent_color TEXT');
  await pool.query("ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_theme TEXT NOT NULL DEFAULT 'purple'");
  await initConnections(pool);

}
function authGuildMeta(auth,id){
  return (Array.isArray(auth.guilds)?auth.guilds:[]).find(g=>String(g.id)===String(id))||{id:String(id),name:String(id),icon:null};
}
function safeText(v,max=100){return String(v??"").trim().slice(0,max)}
function normalizeUsername(v){
  const raw=String(v||"").trim();
  if(!/^[A-Za-z0-9._-]{3,32}$/.test(raw))throw new Error("Identifiant : 3 à 32 caractères, lettres, chiffres, point, tiret ou underscore.");
  return {username:raw,key:raw.toLowerCase()};
}
function passwordParts(password,saltHex){
  const p=String(password||"");
  if(p.length<8||p.length>128)throw new Error("Le mot de passe doit contenir entre 8 et 128 caractères.");
  const salt=saltHex?Buffer.from(saltHex,"hex"):crypto.randomBytes(16);
  const hash=crypto.scryptSync(p,salt,64);
  return {salt:salt.toString("hex"),hash:hash.toString("hex")};
}
function passwordMatches(password,saltHex,hashHex){
  try{
    const got=passwordParts(password,saltHex).hash;
    const a=Buffer.from(got,"hex"),b=Buffer.from(String(hashHex||""),"hex");
    return a.length===b.length&&crypto.timingSafeEqual(a,b);
  }catch{return false}
}
function sessionPayload(authData){
  return signPayload({typ:"dashboard_session",exp:Date.now()+10*365*24*3600*1000,user:authData.user,guildIds:authData.guildIds||[],guilds:authData.guilds||[]});
}
async function accountById(id){
  const r=await pool.query('SELECT * FROM cmd_accounts WHERE id=$1 LIMIT 1',[String(id)]);
  return r.rows[0]||null;
}
async function discordIdentityForAccount(accountId){
  const r=await pool.query("SELECT * FROM cmd_account_identities WHERE account_id=$1 AND provider='discord' LIMIT 1",[String(accountId)]);
  return r.rows[0]||null;
}
function authFromAccount(account,identity){
  const profile=identity?.profile&&typeof identity.profile==="object"?identity.profile:{};
  const guilds=Array.isArray(identity?.guilds)?identity.guilds:[];
  return {
    user:{
      id:String(account.id),
      name:String(account.username||profile.name||"CMD"),
      displayName:String(account.display_name||profile.displayName||account.username||"CMD"),
      avatar:profile.avatar||null,
      banner:profile.banner||null,
      accentColor:profile.accentColor??null,
      discordId:identity?.provider_user_id?String(identity.provider_user_id):null
    },
    guildIds:[...new Set(guilds.map(g=>String(g.id||"")).filter(id=>/^\d{15,22}$/.test(id)))],
    guilds:guilds.map(g=>({id:String(g.id||""),name:String(g.name||g.id||"Discord").slice(0,100),icon:g.icon?String(g.icon).slice(0,300):null})).filter(g=>/^\d{15,22}$/.test(g.id)).slice(0,100)
  };
}
async function migrateLegacyDiscordUser(discordId,accountId){
  const oldId=String(discordId),newId=String(accountId);
  if(oldId===newId)return;
  await pool.query(`INSERT INTO cmd_native_members(guild_id,user_id,membership_role,profile_display_name,profile_avatar_data_url,profile_banner_data_url,profile_bio,profile_status,profile_accent_color,profile_theme,joined_at)
    SELECT guild_id,$2,membership_role,profile_display_name,profile_avatar_data_url,profile_banner_data_url,profile_bio,profile_status,profile_accent_color,profile_theme,joined_at
    FROM cmd_native_members WHERE user_id=$1 ON CONFLICT(guild_id,user_id) DO NOTHING`,[oldId,newId]);
  await pool.query('DELETE FROM cmd_native_members WHERE user_id=$1',[oldId]);
  await pool.query(`INSERT INTO cmd_global_profiles(user_id,display_name,avatar_data_url,banner_data_url,bio,status,accent_color,theme,updated_at)
    SELECT $2,display_name,avatar_data_url,banner_data_url,bio,status,accent_color,theme,updated_at FROM cmd_global_profiles WHERE user_id=$1
    ON CONFLICT(user_id) DO NOTHING`,[oldId,newId]);
  await pool.query('DELETE FROM cmd_global_profiles WHERE user_id=$1',[oldId]);
  try{await pool.query('UPDATE cmd_native_guilds SET owner_user_id=$2 WHERE owner_user_id=$1',[oldId,newId])}catch{}
}
async function resolveDiscordAccount(identity,linkAccountId=null){
  const did=String(identity.user.id);
  const found=await pool.query("SELECT account_id FROM cmd_account_identities WHERE provider='discord' AND provider_user_id=$1 LIMIT 1",[did]);
  let accountId=found.rows[0]?.account_id||null;
  if(linkAccountId){
    if(accountId&&String(accountId)!==String(linkAccountId))throw new Error("Ce compte Discord est déjà lié à un autre compte CMD Sphere.");
    accountId=String(linkAccountId);
  }
  if(!accountId){
    accountId=crypto.randomUUID();
    const base=("discord_"+did.slice(-8)).toLowerCase();
    let username=base,key=base,n=0;
    while(true){
      const exists=await pool.query('SELECT 1 FROM cmd_accounts WHERE username_key=$1 LIMIT 1',[key]);
      if(!exists.rows[0])break;
      n++;username=base+"_"+n;key=username;
    }
    await pool.query('INSERT INTO cmd_accounts(id,username,username_key,display_name) VALUES($1,$2,$3,$4)',[accountId,username,key,safeText(identity.user.displayName||identity.user.name,80)]);
  }
  const account=await accountById(accountId);
  if(!account)throw new Error("Compte CMD Sphere introuvable.");
  const profile={
    name:identity.user.name,
    displayName:identity.user.displayName,
    avatar:identity.user.avatar,
    banner:identity.user.banner,
    accentColor:identity.user.accentColor
  };
  await pool.query(`INSERT INTO cmd_account_identities(account_id,provider,provider_user_id,profile,guilds)
    VALUES($1,'discord',$2,$3::jsonb,$4::jsonb)
    ON CONFLICT(provider,provider_user_id) DO UPDATE SET account_id=EXCLUDED.account_id,profile=EXCLUDED.profile,guilds=EXCLUDED.guilds,updated_at=NOW()`,
    [String(accountId),did,JSON.stringify(profile),JSON.stringify(identity.guilds||[])]);
  await migrateLegacyDiscordUser(did,accountId);
  return authFromAccount(account,{provider_user_id:did,profile,guilds:identity.guilds||[]});
}
async function createNativeAccount(input){
  const {username,key}=normalizeUsername(input.username);
  const displayName=safeText(input.displayName||username,80)||username;
  const pw=passwordParts(input.password);
  const id=crypto.randomUUID();
  try{
    await pool.query('INSERT INTO cmd_accounts(id,username,username_key,display_name,password_salt,password_hash) VALUES($1,$2,$3,$4,$5,$6)',[id,username,key,displayName,pw.salt,pw.hash]);
  }catch(e){
    if(String(e.code)==="23505")throw new Error("Cet identifiant est déjà utilisé.");
    throw e;
  }
  return authFromAccount(await accountById(id),null);
}
async function loginNativeAccount(input){
  const {key}=normalizeUsername(input.username);
  const r=await pool.query('SELECT * FROM cmd_accounts WHERE username_key=$1 LIMIT 1',[key]);
  const account=r.rows[0];
  if(!account||!account.password_hash||!passwordMatches(input.password,account.password_salt,account.password_hash))throw new Error("Identifiant ou mot de passe incorrect.");
  const identity=await discordIdentityForAccount(account.id);
  return authFromAccount(account,identity);
}

function safeImageData(v,maxChars,label){
  v=String(v||"");
  if(!v)return null;
  if(!/^data:image\/(png|jpeg|webp);base64,/i.test(v))throw new Error("Format d'image non pris en charge.");
  if(v.length>maxChars)throw new Error(label+" trop lourde après compression.");
  return v;
}
function safeAvatar(v){return safeImageData(v,2800000,"Avatar")}
function safeBanner(v){return safeImageData(v,7000000,"Bannière")}
async function getGlobalProfile(auth){
  const r=await pool.query('SELECT * FROM cmd_global_profiles WHERE user_id=$1 LIMIT 1',[String(auth.user.id)]);
  const saved=r.rows[0]||{};
  return {
    userId:String(auth.user.id),
    username:String(auth.user.name||"Discord"),
    displayName:saved.display_name||auth.user.displayName||auth.user.name||"Discord",
    avatar:saved.avatar_data_url||auth.user.avatar||null,
    banner:saved.banner_data_url||auth.user.banner||null,
    bio:saved.bio||"",
    status:saved.status||"",
    accentColor:saved.accent_color||((auth.user.accentColor!=null)?("#"+Number(auth.user.accentColor).toString(16).padStart(6,"0")):"#9b4dff"),
    theme:saved.theme||"purple"
  };
}
async function updateGlobalProfile(auth,input){
  const displayName=safeText(input.displayName||auth.user.displayName||auth.user.name,80);
  const bio=safeText(input.bio,500),status=safeText(input.status,80);
  const avatar=input.avatarDataUrl?safeAvatar(input.avatarDataUrl):(input.avatarUrl?safeText(input.avatarUrl,500):null);
  const banner=input.bannerDataUrl?safeBanner(input.bannerDataUrl):(input.bannerUrl?safeText(input.bannerUrl,500):null);
  const accentColor=/^#[0-9A-Fa-f]{6}$/.test(String(input.accentColor||""))?String(input.accentColor):"#9b4dff";
  const theme=["purple","midnight","dark","blue"].includes(String(input.theme||""))?String(input.theme):"purple";
  await pool.query(`INSERT INTO cmd_global_profiles(user_id,display_name,avatar_data_url,banner_data_url,bio,status,accent_color,theme)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,avatar_data_url=EXCLUDED.avatar_data_url,banner_data_url=EXCLUDED.banner_data_url,bio=EXCLUDED.bio,status=EXCLUDED.status,accent_color=EXCLUDED.accent_color,theme=EXCLUDED.theme,updated_at=NOW()`,
    [String(auth.user.id),displayName,avatar,banner,bio,status,accentColor,theme]);
  return getGlobalProfile(auth);
}
function escHtml(v){return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}
function profilePage(auth,profile){
  const accent=escHtml(profile.accentColor||"#9b4dff");
  const avatar=escHtml(profile.avatar||"/app-icon.webp?v=5");
  const banner=profile.banner?escHtml(profile.banner):"";
  const name=escHtml(profile.displayName||profile.username||"CMD");
  const username=escHtml(profile.username||"");
  const bio=escHtml(profile.bio||"Ajoute une bio à ton profil CMD Sphere.");
  const status=escHtml(profile.status||"En ligne");
  const connections=profile.socialLinks||{};
  const connHtml=profileConnectionsHtml(connections);
  const statusConn=statusConnection(connections);
  const bg=banner?("background-image:linear-gradient(180deg,rgba(25,0,38,.08),rgba(24,0,36,.78)),url('"+banner+"')"):"background:linear-gradient(135deg,#46145f,#8b37d6 55%,#32103f)";
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="'+accent+'"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/app-icon.webp?v=5"><title>'+name+' · CMD Sphere</title><style>'+
  '*{box-sizing:border-box}body{margin:0;background:#050306;color:#fff;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial}.page{min-height:100vh;background:radial-gradient(circle at 50% 0,'+accent+'33,transparent 42%),linear-gradient(#070407,#120716 45%,#070407)}.shell{max-width:720px;margin:auto;padding:30px 22px 120px}.back{display:inline-flex;color:#eee;text-decoration:none;font-weight:800;margin-bottom:16px}.card{overflow:hidden;border-radius:26px;background:linear-gradient(180deg,#25102d,#130817 70%);border:1px solid #ffffff12;box-shadow:0 30px 80px #0008}.banner{height:250px;background-size:cover!important;background-position:center!important;position:relative}.avatarWrap{position:relative;height:76px}.avatar{position:absolute;left:28px;top:-72px;width:144px;height:144px;border-radius:50%;object-fit:cover;border:9px solid #25102d;background:#111;box-shadow:0 12px 32px #0009}.online{position:absolute;left:136px;top:35px;width:34px;height:34px;border-radius:50%;background:#23a559;border:7px solid #25102d}.body{padding:14px 28px 32px}.display{font-size:31px;font-weight:950;letter-spacing:-.03em}.handle{margin-top:7px;color:#d5c7da;font-size:17px}.badges{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.badge{padding:7px 10px;border-radius:10px;background:#ffffff12;border:1px solid #ffffff10}.edit{width:100%;border:0;border-radius:14px;background:'+accent+';color:white;padding:16px;font-size:18px;font-weight:900;margin:16px 0 8px;cursor:pointer}.manage{display:block;width:100%;text-align:center;text-decoration:none;border-radius:14px;background:#ffffff0d;border:1px solid #ffffff16;color:#fff;padding:14px;font-weight:900;margin:0 0 16px}.connections{overflow:hidden;border-radius:16px;background:#ffffff08;border:1px solid #ffffff10}.conn{display:flex;align-items:center;gap:12px;padding:14px;border-bottom:1px solid #ffffff0c}.conn:last-child{border-bottom:0}.connIcon{width:42px;height:42px;border-radius:50%;background:#ffffff0e;display:grid;place-items:center;font-size:22px}.connMain{flex:1;min-width:0}.connMain b,.connMain span,.connMain a,.connMain small{display:block}.connMain span,.connMain a{color:#eee;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.connMain small{color:#aaa1ae;margin-top:4px}.ok{font-size:20px}.mutedBox{padding:17px;color:#aaa2ae;background:#ffffff08;border-radius:14px}.tabs{display:flex;gap:36px;border-bottom:1px solid #ffffff14;margin:10px 0 26px}.tab{padding:13px 0;font-weight:800}.tab.active{border-bottom:3px solid #fff}.section{margin-top:24px}.section h3{margin:0 0 12px;font-size:18px}.bio{font-size:17px;line-height:1.55;white-space:pre-wrap;color:#f2eef4}.status{display:inline-flex;margin-top:10px;padding:7px 10px;background:#ffffff0e;border-radius:10px}.modal{display:none;position:fixed;inset:0;background:#000a;z-index:10;align-items:flex-end;justify-content:center}.modal.on{display:flex}.sheet{width:min(720px,100%);background:#17121b;border-radius:24px 24px 0 0;padding:22px;max-height:92vh;overflow:auto}.sheet h2{margin-top:0}label{display:grid;gap:7px;margin:12px 0;color:#d7cbdc}input,textarea,select{width:100%;background:#0c0910;border:1px solid #ffffff1a;color:#fff;border-radius:12px;padding:12px;font:inherit}textarea{min-height:100px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.save{width:100%;border:0;border-radius:12px;background:'+accent+';color:#fff;font-weight:900;padding:14px}.close{width:100%;margin-top:8px;background:#ffffff0d;color:#fff;border:1px solid #ffffff16;border-radius:12px;padding:12px}@media(max-width:560px){.shell{padding:0 0 110px}.card{border-radius:0}.banner{height:205px}.avatar{width:126px;height:126px;top:-63px;left:22px}.online{left:119px;top:32px}.body{padding:12px 22px 26px}.display{font-size:27px}.back{position:fixed;z-index:5;left:14px;top:14px;background:#0008;padding:9px 12px;border-radius:999px}.row{grid-template-columns:1fr}}</style></head><body><div class="page"><div class="shell"><a class="back" href="/dashboard">← CMD Sphere</a><div class="card"><div class="banner" style="'+bg+'"></div><div class="avatarWrap"><img class="avatar" src="'+avatar+'" alt=""><span class="online"></span></div><div class="body"><div class="display">'+name+'</div><div class="handle">'+username+'</div><div class="badges"><span class="badge">👑 CMD</span><span class="badge">💎 Fondateur</span><span class="badge">🌐 '+status+'</span>'+(auth.user?.discordId?'<span class="badge">✓ Discord lié</span>':'<a class="badge" href="/dashboard-login?link=1&next=/profile" style="color:white;text-decoration:none">🔗 Associer Discord</a>')+'</div><button class="edit" id="edit">✎ Modifier le profil</button><a class="manage" href="/connections">🔗 Gérer mes connexions</a>'+(statusConn?'<div class="status">'+statusConn.p.icon+' '+escHtml(statusConn.p.label)+' · '+escHtml(statusConn.c.value)+'</div>':'')+'<div class="tabs"><div class="tab active">Principal</div><div class="tab">Tableau</div><div class="tab">Serveurs</div></div><div class="section"><h3>Bio</h3><div class="bio">'+bio+'</div></div><div class="section"><h3>Connexions</h3>'+connHtml+'</div></div></div></div></div>'+
  '<div class="modal" id="modal"><form class="sheet" id="form"><h2>Modifier le profil CMD</h2><label>Nom affiché<input name="displayName" maxlength="80" value="'+name+'"></label><label>Bio<textarea name="bio" maxlength="500">'+bio+'</textarea></label><label>Statut<input name="status" maxlength="80" value="'+status+'"></label><div class="row"><label>Couleur du thème<input name="accentColor" type="color" value="'+accent+'"></label><label>Thème<select name="theme"><option value="purple">Violet</option><option value="midnight">Minuit</option><option value="dark">Sombre</option><option value="blue">Bleu</option></select></label></div><label>Avatar · jusqu’à 2 Mo<input id="avatarFile" type="file" accept="image/png,image/jpeg,image/webp"></label><label>Bannière · jusqu’à 5 Mo<input id="bannerFile" type="file" accept="image/png,image/jpeg,image/webp"></label><button class="save">Enregistrer</button><button class="close" type="button" id="close">Annuler</button></form></div>'+
  '<script>const m=document.getElementById("modal"),f=document.getElementById("form");document.getElementById("edit").onclick=()=>m.classList.add("on");document.getElementById("close").onclick=()=>m.classList.remove("on");async function dataUrl(id,kind){const file=document.getElementById(id).files[0];if(!file)return null;const max=kind==="banner"?5*1024*1024:2*1024*1024;if(file.size>max)throw new Error((kind==="banner"?"Bannière":"Avatar")+" trop lourd : maximum "+(kind==="banner"?"5 Mo":"2 Mo")+".");const img=await new Promise((r,j)=>{const u=URL.createObjectURL(file),im=new Image;im.onload=()=>{URL.revokeObjectURL(u);r(im)};im.onerror=()=>{URL.revokeObjectURL(u);j(new Error("Image invalide"))};im.src=u});const cap=kind==="banner"?1600:768;let w=img.naturalWidth,h=img.naturalHeight;if(Math.max(w,h)>cap){const s=cap/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s)}const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(img,0,0,w,h);let quality=.88,out=canvas.toDataURL("image/webp",quality),target=kind==="banner"?1800000:850000;while(out.length>target&&quality>.48){quality-=.08;out=canvas.toDataURL("image/webp",quality)}return out}f.onsubmit=async e=>{e.preventDefault();try{const body=Object.fromEntries(new FormData(f));body.avatarDataUrl=await dataUrl("avatarFile","avatar");body.bannerDataUrl=await dataUrl("bannerFile","banner");const r=await fetch("/api/profile",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Erreur");location.reload()}catch(e){alert(e.message)}};if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});</script></body></html>';
}
async function nativeMembership(userId,guildId){
  const r=await pool.query('SELECT * FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 LIMIT 1',[String(guildId),String(userId)]);
  return r.rows[0]||null;
}
async function requireNativeMember(auth,guildId){
  const m=await nativeMembership(auth.user.id,guildId);if(!m)throw new Error("Tu n'es pas membre de ce serveur CMD.");return m;
}
async function requireNativeAdmin(auth,guildId){
  const m=await requireNativeMember(auth,guildId);if(!["owner","admin"].includes(m.membership_role))throw new Error("Permission administrateur requise.");return m;
}
async function allManagedGuilds(auth){
  const installed=await installedEverywhere(auth);
  const byId=new Map(installed.guilds.map(g=>[String(g.id),g]));
  const guilds=auth.guildIds.map(id=>{
    const meta=authGuildMeta(auth,id),hit=byId.get(String(id));
    return {id:String(id),name:hit?.name||meta.name||String(id),icon:hit?.icon||meta.icon||null,memberCount:hit?.memberCount??null,availableBots:hit?.availableBots||[],installed:Boolean(hit)};
  }).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
  return {guilds,errors:installed.errors||[]};
}
async function listNativeGuilds(auth){
  const r=await pool.query(`SELECT g.*,m.membership_role,m.profile_display_name,m.profile_avatar_data_url,m.profile_bio,m.profile_status,
    (SELECT COUNT(*)::int FROM cmd_native_members mm WHERE mm.guild_id=g.id) AS member_count
    FROM cmd_native_guilds g JOIN cmd_native_members m ON m.guild_id=g.id
    WHERE m.user_id=$1 ORDER BY g.updated_at DESC`,[String(auth.user.id)]);
  return r.rows;
}
async function createNativeGuild(auth,input){
  const name=safeText(input.name,100);if(!name)throw new Error("Nom du serveur requis.");
  const id=crypto.randomUUID(),inviteCode=crypto.randomBytes(8).toString("base64url");
  const r=await pool.query(`INSERT INTO cmd_native_guilds(id,owner_user_id,name,is_public,invite_code) VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [id,String(auth.user.id),name,Boolean(input.isPublic),inviteCode]);
  await pool.query('INSERT INTO cmd_native_members(guild_id,user_id,membership_role,profile_display_name) VALUES($1,$2,$3,$4)',[id,String(auth.user.id),'owner',safeText(auth.user.name,80)]);
  await pool.query(`INSERT INTO cmd_native_roles(id,guild_id,name,color,permissions,position,hoist,mentionable)
    VALUES($1,$2,'@everyone','#99AAB5',$3::jsonb,0,FALSE,FALSE)`,
    [crypto.randomUUID(),id,JSON.stringify({viewChannels:true,sendMessages:true,readHistory:true,connect:true,speak:true})]);
  const cat=crypto.randomUUID();
  await pool.query(`INSERT INTO cmd_native_channels(id,guild_id,name,type,position) VALUES($1,$2,'Informations','category',0)`,[cat,id]);
  await pool.query(`INSERT INTO cmd_native_channels(id,guild_id,name,type,topic,position,source_parent_id) VALUES($1,$2,'bienvenue-et-règles','text','Bienvenue sur ce serveur CMD Sphere',1,$3)`,[crypto.randomUUID(),id,cat]);
  await pool.query(`INSERT INTO cmd_native_channels(id,guild_id,name,type,position) VALUES($1,$2,'général','text',2)`,[crypto.randomUUID(),id]);
  return r.rows[0];
}
async function syncNativeFromDiscord(auth,sourceGuildId,preferredBot){
  requireGuild(auth,sourceGuildId);
  const bot=await resolveBot(auth,sourceGuildId,preferredBot);
  const structure=await backend(bot,"structure",{guildId:sourceGuildId});
  const meta=authGuildMeta(auth,sourceGuildId);
  const installed=await installedEverywhere(auth);
  const ig=installed.guilds.find(g=>String(g.id)===String(sourceGuildId));
  const name=safeText(ig?.name||meta.name||("Discord "+sourceGuildId),100);
  const icon=ig?.icon||meta.icon||null;
  const existing=await pool.query('SELECT id,invite_code FROM cmd_native_guilds WHERE owner_user_id=$1 AND source_discord_id=$2 LIMIT 1',[String(auth.user.id),String(sourceGuildId)]);
  const nativeId=existing.rows[0]?.id||crypto.randomUUID(),inviteCode=existing.rows[0]?.invite_code||crypto.randomBytes(8).toString("base64url");
  await pool.query(`INSERT INTO cmd_native_guilds(id,owner_user_id,source_discord_id,name,icon,invite_code)
    VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(owner_user_id,source_discord_id) DO UPDATE SET name=EXCLUDED.name,icon=EXCLUDED.icon,updated_at=NOW()`,
    [nativeId,String(auth.user.id),String(sourceGuildId),name,icon,inviteCode]);
  await pool.query('INSERT INTO cmd_native_members(guild_id,user_id,membership_role,profile_display_name) VALUES($1,$2,$3,$4) ON CONFLICT(guild_id,user_id) DO UPDATE SET membership_role=EXCLUDED.membership_role',[nativeId,String(auth.user.id),'owner',safeText(auth.user.name,80)]);
  await pool.query('DELETE FROM cmd_native_channels WHERE guild_id=$1',[nativeId]);
  await pool.query('DELETE FROM cmd_native_roles WHERE guild_id=$1',[nativeId]);
  for(const ch of Array.isArray(structure.channels)?structure.channels:[]){
    await pool.query(`INSERT INTO cmd_native_channels(id,guild_id,source_channel_id,source_parent_id,name,type,topic,position,permission_overwrites)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [crypto.randomUUID(),nativeId,String(ch.id||crypto.randomUUID()),ch.parentId?String(ch.parentId):null,safeText(ch.name||'salon',100),safeText(ch.type||'text',30),ch.topic?safeText(ch.topic,1024):null,Number(ch.position||0),JSON.stringify(ch.permissionOverwrites||ch.permission_overwrites||[])]);
  }
  for(const role of Array.isArray(structure.roles)?structure.roles:[]){
    await pool.query(`INSERT INTO cmd_native_roles(id,guild_id,source_role_id,name,color,permissions,position,hoist,mentionable)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`,
      [crypto.randomUUID(),nativeId,String(role.id||crypto.randomUUID()),safeText(role.name||'rôle',100),role.color!=null?String(role.color):null,JSON.stringify(role.permissions||{}),Number(role.position||0),Boolean(role.hoist),Boolean(role.mentionable)]);
  }
  return {id:nativeId,name,sourceDiscordId:String(sourceGuildId),bot,botName:bots[bot].label,inviteUrl:baseUrl+"/invite/"+inviteCode};
}
async function nativeGuildDetail(auth,id){
  const member=await requireNativeMember(auth,id);
  const g=await pool.query(`SELECT g.*,(SELECT COUNT(*)::int FROM cmd_native_members mm WHERE mm.guild_id=g.id) member_count FROM cmd_native_guilds g WHERE id=$1 LIMIT 1`,[String(id)]);
  if(!g.rows[0])throw new Error("Serveur CMD introuvable.");
  const [channels,roles]=await Promise.all([
    pool.query('SELECT * FROM cmd_native_channels WHERE guild_id=$1 ORDER BY position,name',[String(id)]),
    pool.query('SELECT * FROM cmd_native_roles WHERE guild_id=$1 ORDER BY position DESC,name',[String(id)])
  ]);
  return {guild:g.rows[0],member,channels:channels.rows,roles:roles.rows,inviteUrl:baseUrl+"/invite/"+g.rows[0].invite_code};
}
async function updateNativeProfile(auth,input){
  const guildId=String(input.guildId||"");await requireNativeMember(auth,guildId);
  const displayName=safeText(input.displayName||auth.user.displayName||auth.user.name,80),bio=safeText(input.bio,500),status=safeText(input.status,80);
  const avatar=input.avatarDataUrl?safeAvatar(input.avatarDataUrl):null,banner=input.bannerDataUrl?safeBanner(input.bannerDataUrl):null;
  const accent=/^#[0-9A-Fa-f]{6}$/.test(String(input.accentColor||""))?String(input.accentColor):"#9b4dff";
  const theme=["purple","midnight","dark","blue"].includes(String(input.theme||""))?String(input.theme):"purple";
  const r=await pool.query(`UPDATE cmd_native_members SET profile_display_name=$3,profile_avatar_data_url=COALESCE($4,profile_avatar_data_url),profile_banner_data_url=COALESCE($5,profile_banner_data_url),profile_bio=$6,profile_status=$7,profile_accent_color=$8,profile_theme=$9
    WHERE guild_id=$1 AND user_id=$2 RETURNING membership_role,profile_display_name,profile_avatar_data_url,profile_banner_data_url,profile_bio,profile_status,profile_accent_color,profile_theme`,
    [guildId,String(auth.user.id),displayName,avatar,banner,bio,status,accent,theme]);
  return r.rows[0];
}
async function discoverNativeGuilds(){
  const r=await pool.query(`SELECT g.id,g.name,g.icon,g.invite_code,g.updated_at,(SELECT COUNT(*)::int FROM cmd_native_members m WHERE m.guild_id=g.id) member_count
    FROM cmd_native_guilds g WHERE g.is_public=TRUE ORDER BY member_count DESC,g.updated_at DESC LIMIT 100`);
  return r.rows.map(x=>({...x,inviteUrl:baseUrl+"/invite/"+x.invite_code}));
}
async function joinNativeByCode(auth,code){
  const g=await pool.query('SELECT id,name FROM cmd_native_guilds WHERE invite_code=$1 LIMIT 1',[safeText(code,80)]);if(!g.rows[0])throw new Error("Invitation CMD invalide.");
  await pool.query('INSERT INTO cmd_native_members(guild_id,user_id,membership_role,profile_display_name) VALUES($1,$2,$3,$4) ON CONFLICT(guild_id,user_id) DO NOTHING',[g.rows[0].id,String(auth.user.id),'member',safeText(auth.user.name,80)]);
  return g.rows[0];
}

async function backend(bot,kind,{guildId,body}={}){
  const cfg=bots[bot];if(!cfg)throw new Error("Bot inconnu");
  let url=cfg.base;
  if(bot==="extinction"){
    if(kind==="guilds")url+="?op=guilds";
    else if(kind==="structure")url+="?op=structure&guildId="+encodeURIComponent(guildId);
  }else{
    if(kind==="guilds")url+="/guilds";
    else if(kind==="structure")url+="/structure?guildId="+encodeURIComponent(guildId);
    else if(kind==="action")url+="/action";
  }
  const res=await fetch(url,{method:kind==="action"?"POST":"GET",headers:{"x-cmd-mcp-secret":backendSecret,"content-type":"application/json"},body:kind==="action"?JSON.stringify(body||{}):undefined,signal:AbortSignal.timeout(20000),cache:"no-store"});
  const data=await res.json().catch(()=>({error:"Réponse backend invalide"}));
  if(!res.ok)throw new Error(cfg.label+" : "+(data.error||("HTTP "+res.status)));
  return data;
}
async function installedEverywhere(auth){
  const allowed=new Set(auth.guildIds.map(String));
  const entries=await Promise.all(Object.keys(bots).map(async bot=>{
    try{return [bot,await backend(bot,"guilds")]}catch(e){return [bot,{error:e.message}]}
  }));
  const map=new Map(),errors=[];
  for(const [bot,value] of entries){
    if(!Array.isArray(value)){errors.push({bot,error:value.error||"indisponible"});continue}
    for(const g of value){
      const id=String(g.id);if(!allowed.has(id))continue;
      const row=map.get(id)||{id,name:g.name||id,icon:g.icon||null,memberCount:g.memberCount??null,availableBots:[]};
      row.name=g.name||row.name;row.icon=g.icon||row.icon;if(g.memberCount!=null)row.memberCount=g.memberCount;
      row.availableBots.push({id:bot,name:bots[bot].label});map.set(id,row);
    }
  }
  return {guilds:[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,"fr")),errors};
}
async function resolveBot(auth,guildId,preferred){
  requireGuild(auth,guildId);
  if(preferred){
    const rows=await backend(preferred,"guilds");
    if(!rows.some(g=>String(g.id)===String(guildId)))throw new Error(bots[preferred].label+" n'est pas installé sur ce Discord.");
    return preferred;
  }
  const all=await installedEverywhere(auth);const g=all.guilds.find(x=>String(x.id)===String(guildId));
  if(!g)throw new Error("Aucun des trois bots CMD n'est installé sur ce Discord.");
  return g.availableBots[0].id;
}
async function actionTool(auth,args,action){
  requireScope(auth,writeScope);requireGuild(auth,args.guildId);
  const bot=await resolveBot(auth,args.guildId,args.bot);
  const data=await backend(bot,"action",{body:{...args,action}});
  return ok(bots[bot].label+" a exécuté "+action+".",{bot,botName:bots[bot].label,...data});
}

const botEnum=z.enum(["dayz","ark","extinction"]);
const guildId=z.string().regex(/^\d{15,22}$/);
const discordId=z.string().regex(/^\d{15,22}$/);
const channelType=z.enum(["text","voice","category","announcement","forum"]);
const permissionName=z.string().min(1).max(80);

function createCmdServer(auth){
  const server=new McpServer({name:"cmd-sphere",version:"2.0.0"});

  server.registerTool("discord_profile",{
    title:"Profil Discord connecté",
    description:"Affiche le compte Discord autorisé pour cette connexion CMD.",
    inputSchema:{},
    securitySchemes:readSecurity,
    annotations:{readOnlyHint:true,destructiveHint:false},
    _meta:{"openai/profile":true}
  },async()=>{try{requireScope(auth,readScope);return ok("Compte Discord connecté.",{id:auth.user.id,name:auth.user.name,authorizedGuilds:auth.guildIds.length})}catch(e){return failResult(e)}});

  server.registerTool("list_discord_servers",{
    title:"Lister mes CMD Sphere",
    description:"Liste uniquement les serveurs Discord que le compte connecté peut gérer et auxquels DAYZ GATE, BOT ARK ou EXTINCTION ++ RSS ont accès.",
    inputSchema:{},
    securitySchemes:readSecurity,
    annotations:{readOnlyHint:true,destructiveHint:false}
  },async()=>{try{requireScope(auth,readScope);const data=await installedEverywhere(auth);return ok("Discord autorisés et accessibles par les bots CMD.",data)}catch(e){return failResult(e)}});

  server.registerTool("get_discord_structure",{
    title:"Voir catégories, salons et rôles",
    description:"Retourne les catégories, salons, rôles, positions et permissions d'un Discord autorisé. À utiliser avant toute modification.",
    inputSchema:{guildId,bot:botEnum.optional()},
    securitySchemes:readSecurity,
    annotations:{readOnlyHint:true,destructiveHint:false}
  },async({guildId,bot})=>{try{requireScope(auth,readScope);requireGuild(auth,guildId);const chosen=await resolveBot(auth,guildId,bot);const data=await backend(chosen,"structure",{guildId});return ok("Structure Discord chargée via "+bots[chosen].label+".",{bot:chosen,botName:bots[chosen].label,...data})}catch(e){return failResult(e)}});

  server.registerTool("create_discord_category",{
    title:"Créer une catégorie Discord",
    description:"Crée une catégorie sur un Discord autorisé via un bot CMD installé.",
    inputSchema:{guildId,bot:botEnum.optional(),name:z.string().min(1).max(100),position:z.number().int().min(0).optional()},
    securitySchemes:writeSecurity,
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(auth,args,"create_category")}catch(e){return failResult(e)}});

  server.registerTool("create_discord_channel",{
    title:"Créer un salon Discord",
    description:"Crée un salon texte, vocal, annonce, forum ou catégorie. parentId place le salon dans une catégorie.",
    inputSchema:{guildId,bot:botEnum.optional(),name:z.string().min(1).max(100),type:channelType.default("text"),parentId:discordId.optional(),topic:z.string().max(1024).optional(),position:z.number().int().min(0).optional()},
    securitySchemes:writeSecurity,
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(auth,args,"create_channel")}catch(e){return failResult(e)}});

  server.registerTool("update_discord_channel",{
    title:"Modifier un salon Discord",
    description:"Renomme ou déplace un salon autorisé, change son sujet ou sa position.",
    inputSchema:{guildId,bot:botEnum.optional(),channelId:discordId,name:z.string().min(1).max(100).optional(),parentId:z.union([discordId,z.literal("")]).optional(),topic:z.string().max(1024).optional(),position:z.number().int().min(0).optional()},
    securitySchemes:writeSecurity,
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(auth,args,"update_channel")}catch(e){return failResult(e)}});

  server.registerTool("delete_discord_channel",{
    title:"Supprimer un salon ou une catégorie Discord",
    description:"Supprime définitivement un salon ou une catégorie. À utiliser seulement sur demande explicite.",
    inputSchema:{guildId,bot:botEnum.optional(),channelId:discordId},
    securitySchemes:writeSecurity,
    annotations:{readOnlyHint:false,destructiveHint:true}
  },async args=>{try{return await actionTool(auth,args,"delete_channel")}catch(e){return failResult(e)}});

  server.registerTool("create_discord_role",{
    title:"Créer un rôle Discord",
    description:"Crée un rôle Discord. permissions peut être le bitfield Discord en chaîne; omettre pour aucune permission spéciale.",
    inputSchema:{guildId,bot:botEnum.optional(),name:z.string().min(1).max(100),color:z.string().regex(/^#?[0-9A-Fa-f]{6}$/).optional(),hoist:z.boolean().optional(),mentionable:z.boolean().optional(),permissions:z.string().regex(/^\d+$/).optional(),position:z.number().int().min(1).optional()},
    securitySchemes:writeSecurity,
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(auth,args,"create_role")}catch(e){return failResult(e)}});

  server.registerTool("update_discord_role",{
    title:"Modifier un rôle Discord",
    description:"Renomme, recolore, repositionne ou modifie les permissions d'un rôle que le bot peut gérer.",
    inputSchema:{guildId,bot:botEnum.optional(),roleId:discordId,name:z.string().min(1).max(100).optional(),color:z.string().regex(/^#?[0-9A-Fa-f]{6}$/).optional(),hoist:z.boolean().optional(),mentionable:z.boolean().optional(),permissions:z.string().regex(/^\d+$/).optional(),position:z.number().int().min(1).optional()},
    securitySchemes:writeSecurity,
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(auth,args,"update_role")}catch(e){return failResult(e)}});

  server.registerTool("delete_discord_role",{
    title:"Supprimer un rôle Discord",
    description:"Supprime définitivement un rôle gérable par le bot. @everyone est protégé.",
    inputSchema:{guildId,bot:botEnum.optional(),roleId:discordId},
    securitySchemes:writeSecurity,
    annotations:{readOnlyHint:false,destructiveHint:true}
  },async args=>{try{return await actionTool(auth,args,"delete_role")}catch(e){return failResult(e)}});

  server.registerTool("set_discord_channel_permissions",{
    title:"Régler les permissions d'un salon",
    description:"Modifie les permissions d'un rôle ou membre sur un salon. Noms courants: ViewChannel, SendMessages, ReadMessageHistory, ManageChannels, ManageMessages, Connect, Speak.",
    inputSchema:{guildId,bot:botEnum.optional(),channelId:discordId,targetId:discordId,targetType:z.enum(["role","member"]).default("role"),allow:z.array(permissionName).default([]),deny:z.array(permissionName).default([])},
    securitySchemes:writeSecurity,
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(auth,args,"set_channel_permissions")}catch(e){return failResult(e)}});

  return server;
}

const httpServer=createServer(async(req,res)=>{
  try{
    if(!req.url){res.writeHead(400).end("Missing URL");return}
    const url=new URL(req.url,baseUrl);

    if(req.method==="GET"&&(url.pathname==="/"||url.pathname==="/dashboard")){
      const auth=dashboardAuth(req);
      if(url.pathname==="/"&&auth){redirect(res,baseUrl+"/dashboard");return}
      html(res,dashboardPage(auth));return;
    }
    if(req.method==="GET"&&url.pathname==="/profile"){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/profile"));return}
      try{const profile=await getGlobalProfile(auth);profile.socialLinks=await getConnections(pool,auth.user.id);html(res,profilePage(auth,profile))}catch(e){html(res,"<h1>Profil indisponible</h1><p>"+escHtml(e.message)+"</p>",500)}return;
    }
    if(req.method==="GET"&&url.pathname==="/connections"){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/connections"));return}
      try{html(res,connectionsPage(auth,await getConnections(pool,auth.user.id)))}catch(e){html(res,"<h1>Connexions indisponibles</h1><p>"+escHtml(e.message)+"</p>",500)}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/connections"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{sendJson(res,200,{connections:await getConnections(pool,auth.user.id)})}catch(e){sendJson(res,500,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/connections"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{connections:await saveConnection(pool,auth.user.id,body)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="DELETE"&&url.pathname.startsWith("/api/connections/")){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{sendJson(res,200,{connections:await removeConnection(pool,auth.user.id,url.pathname.split("/").pop())})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/profile"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{sendJson(res,200,{profile:await getGlobalProfile(auth)})}catch(e){sendJson(res,500,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/profile"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{profile:await updateGlobalProfile(auth,body)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/account/signup"){
      try{
        const body=await readFormBodyJson(req),authData=await createNativeAccount(body),session=sessionPayload(authData);
        sendJson(res,201,{ok:true,user:authData.user},{"set-cookie":dashboardCookie(session)});
      }catch(e){sendJson(res,400,{error:e.message})}
      return;
    }
    if(req.method==="POST"&&url.pathname==="/api/account/login"){
      try{
        const body=await readFormBodyJson(req),authData=await loginNativeAccount(body),session=sessionPayload(authData);
        sendJson(res,200,{ok:true,user:authData.user},{"set-cookie":dashboardCookie(session)});
      }catch(e){sendJson(res,401,{error:e.message})}
      return;
    }
    if(req.method==="GET"&&url.pathname==="/dashboard-login"){
      const next=safeText(url.searchParams.get("next")||"/dashboard",220);
      const current=dashboardAuth(req),link=url.searchParams.get("link")==="1";
      const tx=signPayload({typ:"dashboard_tx",exp:Date.now()+10*60*1000,next,linkAccountId:(link&&current?.user?.id)?String(current.user.id):null});
      const bridge=new URL(bridgeLoginUrl);bridge.searchParams.set("bridge",baseUrl);bridge.searchParams.set("bridge_state",tx);redirect(res,bridge);return;
    }
    if(req.method==="GET"&&url.pathname==="/dashboard-logout"){
      html(res,'<!doctype html><meta charset="utf-8"><script>location.replace("/")</script>',200,{"set-cookie":clearDashboardCookies()});return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dashboard/guilds"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{sendJson(res,200,await allManagedGuilds(auth))}catch(e){sendJson(res,500,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/native/guilds"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{sendJson(res,200,{guilds:await listNativeGuilds(auth)})}catch(e){sendJson(res,500,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/guilds"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,201,{guild:await createNativeGuild(auth,body)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/native/discover"){
      try{sendJson(res,200,{guilds:await discoverNativeGuilds()})}catch(e){sendJson(res,500,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/import"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{guild:await syncNativeFromDiscord(auth,String(body.sourceGuildId||""),body.bot||undefined)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/import-all"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{
        const managed=await allManagedGuilds(auth),imported=[],skipped=[];
        for(const g of managed.guilds){if(!g.installed){skipped.push({id:g.id,name:g.name,reason:"Aucun bot CMD installé"});continue}try{imported.push(await syncNativeFromDiscord(auth,g.id))}catch(e){skipped.push({id:g.id,name:g.name,reason:e.message})}}
        sendJson(res,200,{imported,skipped});
      }catch(e){sendJson(res,500,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname.startsWith("/api/native/guild/")){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{sendJson(res,200,await nativeGuildDetail(auth,url.pathname.split("/").pop()))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/profile"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{profile:await updateNativeProfile(auth,body)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dashboard/structure"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const guildId=url.searchParams.get("guildId"),bot=url.searchParams.get("bot")||undefined;requireGuild(auth,guildId);const chosen=await resolveBot(auth,guildId,bot);sendJson(res,200,{bot:chosen,botName:bots[chosen].label,...await backend(chosen,"structure",{guildId})})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/dashboard/action"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const raw=await readFormBodyJson(req),guildId=String(raw.guildId||"");requireGuild(auth,guildId);const chosen=await resolveBot(auth,guildId,raw.bot);const allowed=new Set(["create_category","create_channel","update_channel","delete_channel","create_role","update_role","delete_role","set_channel_permissions"]);if(!allowed.has(String(raw.action||"")))throw new Error("Action non autorisée.");const out=await backend(chosen,"action",{body:raw});sendJson(res,200,{bot:chosen,botName:bots[chosen].label,...out})}catch(e){sendJson(res,400,{error:e.message})}return;
    }

    if(req.method==="GET"&&url.pathname.startsWith("/invite/")){
      const code=safeText(url.pathname.split("/").pop(),80),auth=dashboardAuth(req);
      if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/invite/"+code));return}
      try{const g=await joinNativeByCode(auth,code);redirect(res,baseUrl+"/dashboard?native="+encodeURIComponent(g.id));}catch(e){html(res,'<!doctype html><meta charset="utf-8"><title>Invitation CMD</title><body style="font-family:system-ui;background:#090b12;color:white;padding:40px"><h1>Invitation CMD Sphere</h1><p>'+safeText(e.message,200)+'</p><a href="/dashboard" style="color:#a78bfa">Retour</a></body>',400)}return;
    }
    if(req.method==="GET"&&url.pathname==="/manifest.webmanifest"){
      sendJson(res,200,{name:"CMD Sphere",short_name:"CMD Sphere",description:"Communautés CMD",start_url:"/dashboard",scope:"/",display:"standalone",orientation:"any",background_color:"#070910",theme_color:"#12051f",icons:[{src:"/app-icon.webp?v=5",sizes:"any",type:"image/webp",purpose:"any maskable"}]},{"content-type":"application/manifest+json","cache-control":"public,max-age=300"});return;
    }
    if(req.method==="GET"&&url.pathname==="/app-icon.webp"){
      if(!iconB64){res.writeHead(404).end("icon missing");return}res.writeHead(200,{"content-type":"image/webp","cache-control":"public,max-age=86400"});res.end(Buffer.from(iconB64,"base64"));return;
    }
    if(req.method==="GET"&&url.pathname==="/brand-logo.webp"){
      if(!logoB64){res.writeHead(404).end("logo missing");return}res.writeHead(200,{"content-type":"image/webp","cache-control":"public,max-age=86400"});res.end(Buffer.from(logoB64,"base64"));return;
    }
    if(req.method==="GET"&&url.pathname==="/app-icon.png"){
      if(!iconB64){res.writeHead(404).end("icon missing");return}res.writeHead(200,{"content-type":"image/webp","cache-control":"public,max-age=86400"});res.end(Buffer.from(iconB64,"base64"));return;
    }
    if(req.method==="GET"&&url.pathname==="/brand-logo.png"){
      if(!logoB64){res.writeHead(404).end("logo missing");return}res.writeHead(200,{"content-type":"image/webp","cache-control":"public,max-age=86400"});res.end(Buffer.from(logoB64,"base64"));return;
    }
    if(req.method==="GET"&&url.pathname==="/sw.js"){
      res.writeHead(200,{"content-type":"application/javascript","cache-control":"no-cache"});res.end("self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>self.clients.claim());self.addEventListener('fetch',()=>{});");return;
    }

    if(req.method==="GET"&&url.pathname==="/health"){
      sendJson(res,200,{ok:true,name:"CMD Sphere MCP",oauth:true,bots:Object.values(bots).map(x=>x.label)});return;
    }

    if(req.method==="GET"&&url.pathname==="/.well-known/oauth-protected-resource"){
      sendJson(res,200,{resource,authorization_servers:[issuer],scopes_supported:[readScope,writeScope],resource_documentation:baseUrl+"/"});return;
    }
    if(req.method==="GET"&&(url.pathname==="/.well-known/oauth-authorization-server"||url.pathname==="/.well-known/openid-configuration")){
      sendJson(res,200,{
        issuer,
        authorization_endpoint:issuer+"/oauth/authorize",
        token_endpoint:issuer+"/oauth/token",
        response_types_supported:["code"],
        grant_types_supported:["authorization_code","refresh_token"],
        code_challenge_methods_supported:["S256"],
        token_endpoint_auth_methods_supported:["none"],
        scopes_supported:[readScope,writeScope],
        client_id_metadata_document_supported:true,
        authorization_response_iss_parameter_supported:true
      });return;
    }

    if(req.method==="GET"&&url.pathname==="/oauth/authorize"){
      const responseType=url.searchParams.get("response_type"),clientId=url.searchParams.get("client_id"),redirectUri=url.searchParams.get("redirect_uri"),state=url.searchParams.get("state")||"",challenge=url.searchParams.get("code_challenge"),method=url.searchParams.get("code_challenge_method"),requestedResource=url.searchParams.get("resource")||resource;
      if(responseType!=="code"||!clientId||!redirectUri||!challenge||method!=="S256"){if(redirectUri)oauthErrorRedirect(res,redirectUri,state,"invalid_request","Paramètres OAuth incomplets.");else sendJson(res,400,{error:"invalid_request"});return}
      try{validateChatGPTClient(clientId,redirectUri)}catch(e){sendJson(res,400,{error:"invalid_client",error_description:e.message});return}
      if(requestedResource!==resource){oauthErrorRedirect(res,redirectUri,state,"invalid_target","Ressource OAuth invalide.");return}
      const scope=parseScopes(url.searchParams.get("scope"));
      const tx=signPayload({typ:"oauth_tx",exp:Date.now()+10*60*1000,clientId,redirectUri,oauthState:state,codeChallenge:challenge,scope,resource});
      const bridge=new URL(bridgeLoginUrl);bridge.searchParams.set("bridge",baseUrl);bridge.searchParams.set("bridge_state",tx);redirect(res,bridge);return;
    }

    if(req.method==="GET"&&url.pathname==="/auth/discord-bridge"){
      try{
        const tx=verifySigned(url.searchParams.get("state"));
        const identity=verifyDiscordBridge(url.searchParams.get("token"));
        if(tx.typ==="dashboard_tx"){
          const authData=await resolveDiscordAccount(identity,tx.linkAccountId||null);
          const session=sessionPayload(authData);
          res.writeHead(302,{Location:(String(tx.next||"/dashboard").startsWith("/")?baseUrl+String(tx.next):baseUrl+"/dashboard"),"set-cookie":dashboardCookie(session),"cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0"});res.end();return;
        }
        if(tx.typ!=="oauth_tx")throw new Error("Transaction OAuth invalide.");
        const authData=await resolveDiscordAccount(identity,null);
        const code=signPayload({typ:"auth_code",exp:Date.now()+90*1000,clientId:tx.clientId,redirectUri:tx.redirectUri,codeChallenge:tx.codeChallenge,scope:tx.scope,resource:tx.resource,user:authData.user,guildIds:authData.guildIds});
        const callback=new URL(tx.redirectUri);callback.searchParams.set("code",code);if(tx.oauthState)callback.searchParams.set("state",tx.oauthState);callback.searchParams.set("iss",issuer);redirect(res,callback);
      }catch(e){sendJson(res,400,{error:"oauth_bridge_failed",error_description:e.message})}
      return;
    }

    if(req.method==="POST"&&url.pathname==="/oauth/token"){
      const form=await readForm(req),grant=form.get("grant_type"),clientId=form.get("client_id"),requestedResource=form.get("resource")||resource;
      if(requestedResource!==resource){sendJson(res,400,{error:"invalid_target"});return}
      if(grant==="authorization_code"){
        try{
          const data=verifySigned(form.get("code"));if(data.typ!=="auth_code")throw new Error("Code OAuth invalide.");
          if(clientId&&clientId!==data.clientId)throw new Error("Client OAuth différent.");
          if(form.get("redirect_uri")!==data.redirectUri)throw new Error("Redirect OAuth différent.");
          if(pkceS256(form.get("code_verifier"))!==data.codeChallenge)throw new Error("PKCE invalide.");
          sendJson(res,200,issueTokens(data));
        }catch(e){sendJson(res,400,{error:"invalid_grant",error_description:e.message})}
        return;
      }
      if(grant==="refresh_token"){
        try{
          const data=verifySigned(form.get("refresh_token"));if(data.typ!=="refresh")throw new Error("Refresh token invalide.");
          if(clientId&&clientId!==data.clientId)throw new Error("Client OAuth différent.");
          sendJson(res,200,issueTokens(data));
        }catch(e){sendJson(res,400,{error:"invalid_grant",error_description:e.message})}
        return;
      }
      sendJson(res,400,{error:"unsupported_grant_type"});return;
    }

    if(req.method==="OPTIONS"&&url.pathname===MCP_PATH){
      res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, GET, DELETE, OPTIONS","Access-Control-Allow-Headers":"content-type, authorization, mcp-session-id","Access-Control-Expose-Headers":"Mcp-Session-Id, WWW-Authenticate"});res.end();return;
    }

    if(url.pathname===MCP_PATH){
      const auth=bearerAuth(req);
      if(!auth){
        res.writeHead(401,{"content-type":"application/json","cache-control":"no-store","WWW-Authenticate":'Bearer resource_metadata="'+baseUrl+'/.well-known/oauth-protected-resource", scope="'+readScope+' '+writeScope+'"',"Access-Control-Allow-Origin":"*","Access-Control-Expose-Headers":"Mcp-Session-Id, WWW-Authenticate"});
        res.end(JSON.stringify({error:"unauthorized"}));return;
      }
      if(!["POST","GET","DELETE"].includes(req.method||"")){res.writeHead(405).end("Method Not Allowed");return}
      res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Expose-Headers","Mcp-Session-Id, WWW-Authenticate");
      const server=createCmdServer(auth);
      const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      res.on("close",()=>{transport.close();server.close()});
      try{await server.connect(transport);await transport.handleRequest(req,res)}
      catch(e){console.error("MCP request failed",e);if(!res.headersSent)res.writeHead(500).end("Internal server error")}
      return;
    }

    if(req.method==="GET"&&url.pathname==="/"){
      res.writeHead(200,{"content-type":"text/plain","cache-control":"no-store"}).end("CMD Sphere MCP - OAuth protected");return;
    }
    res.writeHead(404,{"content-type":"text/plain"}).end("Not Found");
  }catch(e){
    console.error("HTTP request failed",e);if(!res.headersSent)sendJson(res,500,{error:"server_error"});
  }
});

httpServer.listen(port,"0.0.0.0",async()=>{
  try{await initNativeDb();console.log("[native] CMD Sphere database ready")}catch(e){console.error("[native] database init failed: "+e.message)}
  console.log("CMD Sphere MCP listening on port "+port+" with OAuth");
  for(const bot of Object.keys(bots)){
    try{const rows=await backend(bot,"guilds");console.log("[selftest] "+bot+" backend OK, guilds="+(Array.isArray(rows)?rows.length:"?"))}
    catch(e){console.error("[selftest] "+bot+" backend FAILED: "+e.message)}
  }
});
