import { createServer } from "node:http";
import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import pg from "pg";
import { initConnections, getConnections, saveConnection, removeConnection, connectionsPage, profileConnectionsHtml, statusConnection } from "./connections.js";
import { renderNativeGuildPage } from "./native-ui.js";

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
    icon:g.icon?String(g.icon).slice(0,300):null,
    owner:Boolean(g.owner),
    permissions:String(g.permissions||"0")
  })).filter(g=>/^\d{15,22}$/.test(g.id)).slice(0,100);
  return {
    user:{
      id:String(data.user.id),
      name:String(data.user.name||"Discord").slice(0,100),
      displayName:String(data.user.displayName||data.user.name||"Discord").slice(0,100),
      avatar:data.user.avatar?String(data.user.avatar).slice(0,500):null,
      banner:data.user.banner?String(data.user.banner).slice(0,500):null,
      accentColor:data.user.accentColor??null,
      avatarDecorationData:data.user.avatarDecorationData||null,
      collectibles:data.user.collectibles||null,
      primaryGuild:data.user.primaryGuild||null
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
function dashboardPage(auth,initialNativeGuilds=[]){
  const user=String(auth?.user?.name||"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]));
  const userDisplay=escHtml(auth?.user?.displayName||auth?.user?.name||"CMD");
  const userAvatar=escHtml(auth?.user?.avatar||"/app-icon.webp?v=5");
  const nativeGuilds=Array.isArray(initialNativeGuilds)?initialNativeGuilds:[];
  const nativeRailHtml=nativeGuilds.map(g=>{
    const label=escHtml(g.name||"Serveur"),icon=String(g.icon||"");
    const visual=icon?'<img src="'+escHtml(icon)+'" alt="">':'<span class="rail-initial">'+escHtml(String(g.name||"?").slice(0,2).toUpperCase())+'</span>';
    return '<a class="rail-server" href="/native/'+encodeURIComponent(g.id)+'" title="'+label+'">'+visual+'</a>';
  }).join("");
  const nativeListHtml=nativeGuilds.map(g=>'<a class="btn guild" href="/native/'+encodeURIComponent(g.id)+'"><strong>'+escHtml(g.name||"Serveur")+'</strong><br><span class="muted">CMD Sphere'+(g.source_discord_id?' · importé depuis Discord':'')+'</span></a>').join("")||'<div class="empty">Aucun serveur CMD Sphere.</div>';
  const style='*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,Segoe UI,Arial;background:radial-gradient(circle at 20% 0,#2b1c55 0,#0b0d15 38%,#05070b 100%);color:#fff;min-height:100vh}a{color:inherit}.wrap{max-width:1180px;margin:auto;padding:24px}.top{display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap}.brand{display:flex;gap:12px;align-items:center}.logo{width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,#7c3aed,#ec4899);display:grid;place-items:center;font-weight:1000;box-shadow:0 10px 35px #7c3aed44}.muted{color:#aeb4c0}.btn{border:1px solid #ffffff22;background:#ffffff0d;color:#fff;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px}.btn:hover{background:#ffffff17}.primary{background:linear-gradient(135deg,#7c3aed,#db2777);border:0}.grid{display:grid;grid-template-columns:320px 1fr;gap:18px;margin-top:24px}.card{background:#10131bcc;border:1px solid #ffffff14;border-radius:18px;padding:16px;box-shadow:0 16px 50px #0005;backdrop-filter:blur(10px)}label{display:grid;gap:6px;font-size:13px;color:#c9ced8;margin-bottom:12px}input,select,textarea{width:100%;background:#080a10;border:1px solid #ffffff1d;color:#fff;border-radius:11px;padding:11px;font:inherit}textarea{min-height:84px;resize:vertical}.guild{width:100%;text-align:left;margin:7px 0}.guild.active{outline:2px solid #a78bfa}.bot{display:inline-flex;padding:3px 7px;border-radius:999px;background:#ffffff12;font-size:11px;margin-right:5px}.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.section{margin-top:16px}.list{display:grid;gap:8px;max-height:460px;overflow:auto}.row{padding:10px 12px;border:1px solid #ffffff12;background:#ffffff08;border-radius:12px}.row small{color:#9aa1ad}.status{position:fixed;right:18px;bottom:18px;max-width:360px;padding:12px 15px;border-radius:12px;background:#111827;border:1px solid #ffffff22;display:none}.status.show{display:block}.hero{padding:70px 20px;text-align:center}.hero h1{font-size:clamp(38px,7vw,72px);margin:0 0 12px}.hero p{font-size:18px;color:#b9bfca;max-width:720px;margin:0 auto 24px}.empty{padding:30px;text-align:center;color:#aeb4c0}.sphere-app{min-height:100dvh;padding-left:82px}.server-rail{position:fixed;z-index:15;left:0;top:0;bottom:0;width:82px;background:#0d0a11;border-right:1px solid #ffffff10;padding:10px 9px;display:flex;flex-direction:column;align-items:center;gap:9px;overflow-y:auto}.server-rail::-webkit-scrollbar{display:none}.rail-home,.rail-server,.rail-plus,.rail-messages{width:56px;height:56px;min-height:56px;border:0;border-radius:19px;background:#24172d;color:#fff;display:grid;place-items:center;overflow:hidden;position:relative;transition:.16s}.rail-messages{font-size:26px;text-decoration:none;background:linear-gradient(135deg,#5865f2,#7c3aed)}.rail-messages:after{content:"MP";position:absolute;bottom:2px;left:50%;transform:translateX(-50%);font-size:7px;font-weight:1000;background:#09070dcb;padding:1px 4px;border-radius:4px}.rail-home:hover,.rail-server:hover,.rail-server.active,.rail-plus:hover,.rail-messages:hover{border-radius:15px;background:#5865f2}.rail-home img,.rail-server img{width:100%;height:100%;object-fit:cover}.rail-server.off{opacity:.4;filter:grayscale(.5)}.rail-server.off:after{content:"+";position:absolute;right:0;bottom:0;width:20px;height:20px;border-radius:50%;background:#5865f2;border:3px solid #0d0a11;display:grid;place-items:center;font-size:13px;font-weight:1000}.rail-initial{font-weight:950}.rail-folder-wrap{width:58px;display:flex;flex-direction:column;align-items:center;gap:6px;border-radius:18px;padding:3px 1px}.rail-folder{width:56px;height:56px;min-height:56px;border:0;border-radius:18px;background:color-mix(in srgb,var(--folder-color,#5865f2) 28%,#24172d);display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:3px;padding:7px;overflow:hidden;position:relative}.rail-folder:hover{border-radius:15px}.rail-folder .mini{border-radius:7px;background:#15121a;display:grid;place-items:center;overflow:hidden;font-size:10px;font-weight:900;color:#fff}.rail-folder .mini img{width:100%;height:100%;object-fit:cover}.rail-folder .mini.empty{padding:0;background:#ffffff0a}.rail-folder:after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:var(--folder-color,#5865f2)}.rail-folder-servers{display:none;flex-direction:column;gap:6px;align-items:center}.rail-folder-wrap.open .rail-folder-servers{display:flex}.rail-folder-wrap.open{background:color-mix(in srgb,var(--folder-color,#5865f2) 16%,transparent)}.folder-list-row{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #ffffff12;border-radius:12px;background:#ffffff07;margin:8px 0}.folder-dot{width:24px;height:24px;border-radius:8px;flex:none}.folder-list-row .grow{flex:1;min-width:0}.folder-list-row b,.folder-list-row small{display:block}.folder-list-row small{color:#aeb4c0}.server-checks{display:grid;gap:7px;max-height:48dvh;overflow:auto;margin:12px 0}.server-check{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #ffffff10;border-radius:11px;background:#ffffff06}.server-check input{width:auto}.server-check img{width:36px;height:36px;border-radius:12px;object-fit:cover}.rail-sep{width:36px;height:2px;border-radius:3px;background:#ffffff17}.rail-plus{margin-top:auto;font-size:31px;color:#aab5ff}.rail-top{background:linear-gradient(135deg,#5b21b6,#db2777);font-size:27px;text-decoration:none}.rail-top:after{content:\"VOTE\";position:absolute;bottom:2px;left:50%;transform:translateX(-50%);font-size:7px;font-weight:1000;background:#09070dcb;padding:1px 4px;border-radius:4px}.logo-img{width:58px;height:58px;border-radius:16px;object-fit:cover;box-shadow:0 10px 35px #5b21b655}.user-dock{position:fixed;z-index:14;left:94px;bottom:12px;width:304px;min-height:62px;border:1px solid #ffffff12;background:#17131dcc;backdrop-filter:blur(18px);border-radius:16px;padding:8px;display:grid;grid-template-columns:46px minmax(0,1fr) auto;align-items:center;gap:10px;box-shadow:0 18px 50px #0008}.user-dock-avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#25212b;border:3px solid #7c3aed}.user-dock-main{min-width:0}.user-dock-main b,.user-dock-main small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.user-dock-main small{color:#aeb4c0}.user-dock-actions{display:flex;gap:5px}.user-dock-actions a{width:34px;height:34px;border-radius:9px;background:#ffffff0a;display:grid;place-items:center;text-decoration:none}.user-dock-actions a:hover{background:#ffffff16}@media(max-width:760px){.user-dock{left:88px;right:8px;width:auto;bottom:8px}.wrap{padding-bottom:92px}}.brand-logo{width:min(560px,92vw);display:block;margin:0 auto 20px;border-radius:24px;box-shadow:0 24px 70px #0009}.add-modal{display:none;position:fixed;z-index:30;inset:0;background:#000b;align-items:center;justify-content:center;padding:18px}.add-modal.on{display:flex}.add-card{width:min(620px,100%);max-height:88dvh;overflow:auto;background:#1b1221;border:1px solid #ffffff16;border-radius:22px;padding:20px;box-shadow:0 28px 80px #000c}.add-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.add-choice{min-height:90px;text-align:left}.add-card input{width:100%;background:#09070d;border:1px solid #ffffff1c;border-radius:11px;padding:12px;color:#fff}.native-box{padding:13px;border:1px solid #ffffff12;border-radius:14px;background:#ffffff07;margin-top:10px}.native-box strong,.native-box small{display:block}.native-box small{color:#aeb4c0}.layout-dragging{opacity:.45!important;transform:scale(.9);z-index:50}.rail-folder-wrap[data-layout-key],.rail-server[data-layout-key]{user-select:none;-webkit-user-select:none}.discord-channel-list{display:grid;gap:7px}.channel-category{border:1px solid #ffffff0d;border-radius:13px;background:#ffffff04;overflow:hidden}.category-title{padding:10px 12px;color:#b5bac1;font-weight:900;background:#ffffff05}.channel-link,.channel-static{width:100%;display:flex;align-items:center;gap:9px;border:0;border-top:1px solid #ffffff0a;background:transparent;color:#d9dde3;padding:11px 12px;text-align:left;font:inherit}.channel-link:hover{background:#ffffff0d;color:#fff}.channel-link>span:first-child{font-size:22px;color:#949ba4;font-weight:900}.channel-link .channel-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:760}.channel-link small,.channel-static small{color:#8f96a0}.channel-link b{font-size:24px;color:#949ba4}.channel-overlay{display:none;position:fixed;inset:0;z-index:80;background:#313338;color:#dbdee1;grid-template-rows:auto minmax(0,1fr) auto}.channel-overlay.on{display:grid}.channel-head{display:flex;align-items:center;gap:12px;min-height:68px;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;border-bottom:1px solid #1f2023;background:#2b2d31}.channel-back{width:42px;height:42px;border:0;background:transparent;color:#fff;font-size:30px}.channel-head-main{min-width:0;flex:1}.channel-head-main b,.channel-head-main small{display:block}.channel-head-main b{font-size:20px;color:#fff}.channel-head-main small{color:#b5bac1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.channel-actions{display:flex;gap:6px}.channel-actions .btn{padding:9px 10px}.channel-messages{overflow:auto;padding:12px 10px 18px;scroll-behavior:smooth}.history-tools{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;padding:8px 0 16px}.discord-message{display:flex;gap:11px;padding:7px 8px;border-radius:8px}.discord-message:hover{background:#2e3035}.msg-avatar{width:42px;height:42px;min-width:42px;border-radius:50%;overflow:hidden;background:#1e1f22;display:grid;place-items:center;font-weight:900}.msg-avatar img{width:100%;height:100%;object-fit:cover}.msg-main{min-width:0;flex:1}.msg-meta{display:flex;align-items:center;gap:7px;min-height:22px}.msg-meta b{color:#f2f3f5}.msg-meta time{color:#949ba4;font-size:12px}.bot-badge{font-size:10px;background:#5865f2;color:white;border-radius:4px;padding:2px 4px;font-weight:900}.reply-mini{margin-left:auto;border:0;background:#1e1f22;color:#b5bac1;border-radius:7px;padding:4px 7px}.msg-text{line-height:1.42;word-break:break-word;color:#dbdee1}.msg-reply{border-left:3px solid #4e5058;padding-left:8px;color:#b5bac1;font-size:13px;margin:3px 0 5px}.msg-image-link{display:block;margin-top:8px}.msg-image{display:block;max-width:min(520px,100%);max-height:430px;border-radius:8px;object-fit:contain;background:#1e1f22}.msg-file{display:block;width:max-content;max-width:100%;margin-top:8px;padding:9px 10px;border-radius:8px;background:#1e1f22;color:#c7d2fe;text-decoration:none;overflow:hidden;text-overflow:ellipsis}.msg-embed{border-left:4px solid #5865f2;background:#2b2d31;border-radius:4px;padding:10px;margin-top:8px;max-width:520px}.msg-embed b,.msg-embed small{display:block;margin-bottom:5px}.embed-field{display:grid;gap:2px;margin-top:7px}.msg-stickers{margin-top:7px;color:#c4b5fd}.msg-reactions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.msg-reactions span{border:1px solid #4e5058;background:#2b2d31;border-radius:8px;padding:3px 7px}.msg-empty{color:#949ba4;font-style:italic}.channel-empty{padding:60px 20px;text-align:center;color:#949ba4}.channel-compose-wrap{background:#2b2d31;padding:0 14px calc(12px + env(safe-area-inset-bottom))}.reply-bar{display:none;align-items:center;gap:8px;background:#232428;padding:8px 10px;border-radius:9px 9px 0 0;color:#b5bac1;font-size:13px}.reply-bar.on{display:flex}.reply-bar span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reply-bar button{border:0;background:transparent;color:#fff;font-size:18px}.channel-composer{display:flex;gap:8px;background:#383a40;border-radius:12px;padding:7px}.channel-composer textarea{flex:1;min-height:42px;max-height:130px;resize:none;background:transparent;border:0;color:#f2f3f5;padding:10px;outline:none}.channel-composer button{border:0;border-radius:9px;background:#5865f2;color:#fff;padding:0 16px;font-weight:900}.send-note{color:#949ba4;font-size:11px;padding:5px 3px 0}.webhook-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0 14px}.webhook-toolbar input{flex:1;min-width:180px}.webhook-guild{border:1px solid #ffffff12;border-radius:16px;overflow:hidden;background:#ffffff05;margin:12px 0}.webhook-guild-head{display:flex;align-items:center;gap:10px;padding:12px;background:#ffffff08}.webhook-guild-head img{width:38px;height:38px;border-radius:13px;object-fit:cover}.webhook-guild-head .grow{flex:1;min-width:0}.webhook-guild-head b,.webhook-guild-head small{display:block}.webhook-guild-head small{color:#9aa1ad}.webhook-row{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 14px;border-top:1px solid #ffffff0c}.webhook-row img,.webhook-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;background:#25272d;display:grid;place-items:center;font-size:22px}.webhook-main{min-width:0}.webhook-main b,.webhook-main small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.webhook-main small{color:#aeb4c0;margin-top:3px}.webhook-id{font-size:10px;color:#737b88}.webhook-empty{padding:28px;text-align:center;color:#aeb4c0}.bot-manager-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.bot-card{border:1px solid #ffffff12;background:#ffffff06;border-radius:14px;padding:12px;display:grid;grid-template-columns:48px minmax(0,1fr);gap:10px;align-items:center}.bot-card .bot-avatar{width:48px;height:48px;border-radius:50%;background:#27282d;display:grid;place-items:center;overflow:hidden;font-size:22px}.bot-card .bot-avatar img{width:100%;height:100%;object-fit:cover}.bot-card .bot-info{min-width:0}.bot-card b,.bot-card small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bot-card small{color:#aeb4c0}.bot-card .bot-actions{grid-column:1/-1;display:flex;gap:7px;flex-wrap:wrap}.bot-section{margin:16px 0}.bot-guild{border:1px solid #ffffff12;border-radius:14px;padding:12px;margin:10px 0;background:#ffffff04}.generic-bot-form{display:grid;grid-template-columns:1fr 140px auto;gap:8px}.generic-bot-form input{min-width:0}@media(max-width:680px){.bot-manager-grid{grid-template-columns:1fr}.generic-bot-form{grid-template-columns:1fr}}.mirror-hero{padding:16px;border-radius:16px;background:linear-gradient(135deg,#1d4ed8,#6d28d9,#be185d);margin-bottom:14px}.mirror-hero h2{margin:0 0 6px}.mirror-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:12px 0}.mirror-stat{background:#ffffff0b;border:1px solid #ffffff12;border-radius:12px;padding:12px;text-align:center}.mirror-stat b{display:block;font-size:22px}.mirror-stat small{color:#aeb4c0}.mirror-progress{height:10px;border-radius:999px;background:#ffffff12;overflow:hidden;margin:12px 0}.mirror-progress>span{display:block;height:100%;width:0;background:linear-gradient(90deg,#5865f2,#a855f7,#ec4899);transition:width .25s}.mirror-log{background:#090b10;border:1px solid #ffffff12;border-radius:12px;padding:11px;max-height:220px;overflow:auto;color:#cbd5e1;font-size:12px;white-space:pre-wrap}.hidden{display:none!important}@media(max-width:850px){.sphere-app{padding-left:72px}.server-rail{width:72px;padding-inline:7px}.rail-home,.rail-server,.rail-plus{width:52px;height:52px;min-height:52px}.grid{grid-template-columns:1fr}.grid>aside.card{display:none}.cols{grid-template-columns:1fr}.wrap{padding:14px}.top{align-items:flex-start}.brand>div:not(.logo-img){min-width:0}.add-grid{grid-template-columns:1fr}}';
  if(!auth)return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>CMD Sphere</title><meta name="theme-color" content="#9b4dff"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/app-icon.webp?v=5"><style>'+style+'.authbox{width:min(920px,94vw);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:14px;text-align:left}.authpanel{background:#121019dd;border:1px solid #ffffff14;border-radius:20px;padding:18px}.authpanel h2{margin-top:0}.authpanel .btn{width:100%;justify-content:center}.authpanel input{margin-bottom:10px}.or{text-align:center;color:#8e8795;margin:14px 0}@media(max-width:720px){.authbox{grid-template-columns:1fr}}</style></head><body><div class="hero" style="padding-bottom:22px"><img class="brand-logo" src="/brand-logo.webp?v=5" alt="CMD Sphere"><h1>CMD Sphere</h1><p>Un seul compte CMD Sphere. Tu peux te connecter avec Discord ou avec un compte créé directement ici.</p></div><div class="authbox"><div class="authpanel"><h2>Continuer avec Discord</h2><p class="muted">Ton compte Discord devient automatiquement un compte CMD Sphere et garde tes serveurs accessibles.</p><a class="btn primary" href="/dashboard-login">💬 Continuer avec Discord</a><div class="or">ou</div><h2>Se connecter</h2><form id="nativeLogin"><input name="username" autocomplete="username" placeholder="Identifiant CMD Sphere" required minlength="3" maxlength="32"><input name="password" autocomplete="current-password" type="password" placeholder="Mot de passe" required minlength="8" maxlength="128"><button class="btn" type="submit">Connexion CMD Sphere</button></form></div><div class="authpanel"><h2>Créer un compte CMD Sphere</h2><p class="muted">Pas besoin de Discord. Tu pourras le lier plus tard au même compte.</p><form id="nativeSignup"><input name="displayName" autocomplete="name" placeholder="Nom affiché" maxlength="80"><input name="username" autocomplete="username" placeholder="Identifiant (3 à 32 caractères)" required minlength="3" maxlength="32"><input name="password" autocomplete="new-password" type="password" placeholder="Mot de passe (8 caractères minimum)" required minlength="8" maxlength="128"><button class="btn primary" type="submit">Créer mon compte</button></form><p id="authMsg" class="muted"></p></div></div><script>async function account(url,form){const msg=document.getElementById("authMsg");msg.textContent="";const body=Object.fromEntries(new FormData(form));const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Erreur");location.href="/dashboard"}document.getElementById("nativeLogin").onsubmit=async e=>{e.preventDefault();try{await account("/api/account/login",e.currentTarget)}catch(x){document.getElementById("authMsg").textContent=x.message}};document.getElementById("nativeSignup").onsubmit=async e=>{e.preventDefault();try{await account("/api/account/signup",e.currentTarget)}catch(x){document.getElementById("authMsg").textContent=x.message}}</script></body></html>';
  const script=`
  const S={guild:null,bot:null,structure:null,nativeGuild:null};const CHAT={open:false,mode:'discord',guildId:null,bot:null,channelId:null,name:'',messages:[],nextBefore:null,hasMore:false,loading:false,replyTo:null,poll:null};const qs=s=>document.querySelector(s);
  function esc(v){return String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))}
  function toast(m,ok=true){const e=qs('#status');e.textContent=m;e.style.borderColor=ok?'#34d39966':'#fb718566';e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3500)}
  async function api(url,opt){const r=await fetch(url,{cache:'no-store',...opt,headers:{'content-type':'application/json',...(opt&&opt.headers||{})}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Erreur');return d}
  function iconUrl(g){if(!g||!g.icon)return '';if(/^https?:/.test(g.icon))return g.icon;if(/^\d{15,22}$/.test(String(g.id)))return 'https://cdn.discordapp.com/icons/'+g.id+'/'+g.icon+'.png?size=128';return ''}
  function iconHtml(g){const u=iconUrl(g);return u?'<img src="'+esc(u)+'" alt="">':'<span class="rail-initial">'+esc((g.name||'?').slice(0,2).toUpperCase())+'</span>'}
  async function loadGuilds(){
    const [d,n,fd,ld]=await Promise.all([api('/api/dashboard/guilds'),api('/api/native/guilds'),api('/api/folders'),api('/api/server-layout')]);
    const e=qs('#guilds'),rail=qs('#railGuilds');e.innerHTML='';rail.innerHTML='';
    const nativeGuilds=n.guilds||[],sourceIds=new Set(nativeGuilds.map(x=>String(x.source_discord_id||'')).filter(Boolean));
    const entries=[];
    for(const g of nativeGuilds)entries.push({key:'native:'+g.id,kind:'native',g});
    for(const g of d.guilds||[])if(!sourceIds.has(String(g.id)))entries.push({key:'discord:'+g.id,kind:'discord',g});
    const byKey=new Map(entries.map(x=>[x.key,x])),foldered=new Set(),folderMap=new Map();
    window.__cmdFolderState={folders:fd.folders||[],entries,layout:ld.itemKeys||[]};
    function railButton(entry,inFolder=false){
      const r=document.createElement('button');r.className='rail-server '+(entry.kind==='discord'&&!entry.g.installed?'off':'');r.title=entry.g.name;r.innerHTML=iconHtml(entry.g);
      if(inFolder)r.dataset.folderChildKey=entry.key;else r.dataset.layoutKey=entry.key;
      r.onclick=()=>{if(Date.now()<(window.__suppressRailClick||0))return;entry.kind==='native'?selectNative(entry.g,r):selectGuild(entry.g,null,r)};
      return r;
    }
    function mini(entry){
      const m=document.createElement('span');m.className='mini';
      if(!entry){m.classList.add('empty');return m}
      const u=iconUrl(entry.g);if(u){const im=document.createElement('img');im.src=u;im.alt='';m.appendChild(im)}else m.textContent=(entry.g.name||'?').slice(0,1).toUpperCase();
      return m;
    }
    function makeFolder(folder){
      const keys=(folder.serverKeys||[]).filter(k=>byKey.has(k));if(!keys.length)return null;
      keys.forEach(k=>foldered.add(k));
      const wrap=document.createElement('div');wrap.className='rail-folder-wrap'+(folder.collapsed?'':' open');wrap.style.setProperty('--folder-color',folder.color||'#5865F2');wrap.dataset.layoutKey='folder:'+folder.id;wrap.dataset.folderId=folder.id;
      const b=document.createElement('button');b.className='rail-folder';b.title=folder.name+' · appuie pour ouvrir/fermer';
      for(let i=0;i<4;i++)b.appendChild(mini(byKey.get(keys[i])));
      const children=document.createElement('div');children.className='rail-folder-servers';children.dataset.folderId=folder.id;
      keys.forEach(k=>children.appendChild(railButton(byKey.get(k),true)));
      b.onclick=async()=>{if(Date.now()<(window.__suppressRailClick||0))return;wrap.classList.toggle('open');try{await api('/api/folders/collapse',{method:'POST',body:JSON.stringify({id:folder.id,collapsed:!wrap.classList.contains('open')})})}catch{}};
      wrap.appendChild(b);wrap.appendChild(children);return wrap;
    }
    for(const folder of fd.folders||[]){const node=makeFolder(folder);if(node)folderMap.set('folder:'+folder.id,node)}
    const nodes=new Map();
    for(const entry of entries)if(!foldered.has(entry.key))nodes.set(entry.key,railButton(entry,false));
    for(const [k,v] of folderMap)nodes.set(k,v);
    const appended=new Set();
    for(const key of ld.itemKeys||[]){const node=nodes.get(key);if(node&&!appended.has(key)){rail.appendChild(node);appended.add(key)}}
    for(const [key,node] of nodes)if(!appended.has(key)){rail.appendChild(node);appended.add(key)}
    setupRailReorder();
    for(const g of d.guilds||[]){
      const b=document.createElement('button');b.className='btn guild'+(g.installed?'':' off');b.innerHTML='<strong>'+esc(g.name)+'</strong><br><span class="muted">'+(g.installed?g.availableBots.map(x=>esc(x.name)).join(' · '):'Aucun bot CMD installé')+'</span>';b.onclick=()=>selectGuild(g,b);e.appendChild(b);
    }
    if(!e.children.length)e.innerHTML='<div class="empty">Tes Discord apparaîtront ici.</div>';
  }
  async function saveRailLayout(){
    const keys=[...qs('#railGuilds').children].map(x=>x.dataset.layoutKey).filter(Boolean);
    try{await api('/api/server-layout',{method:'POST',body:JSON.stringify({itemKeys:keys})})}catch(e){toast(e.message,false)}
  }
  function setupRailReorder(){
    const rail=qs('#railGuilds');let drag=null,timer=null,startY=0,startX=0,moved=false;
    rail.oncontextmenu=e=>{if(e.target.closest('[data-layout-key]'))e.preventDefault()};
    rail.addEventListener('click',e=>{if(Date.now()<(window.__suppressRailClick||0)){e.preventDefault();e.stopPropagation()}},true);
    const cancel=()=>{clearTimeout(timer);timer=null};
    [...rail.children].filter(x=>x.dataset.layoutKey).forEach(el=>{
      el.onpointerdown=ev=>{if(ev.pointerType==='mouse'&&ev.button!==0)return;cancel();startY=ev.clientY;startX=ev.clientX;moved=false;timer=setTimeout(()=>{drag=el;drag.classList.add('layout-dragging');window.__suppressRailClick=Date.now()+1200;try{el.setPointerCapture(ev.pointerId)}catch{};if(navigator.vibrate)navigator.vibrate(20)},380)};
      el.onpointermove=ev=>{if(!drag){if(Math.hypot(ev.clientX-startX,ev.clientY-startY)>9)cancel();return}ev.preventDefault();moved=true;const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('#railGuilds > [data-layout-key]');if(!target||target===drag)return;const r=target.getBoundingClientRect(),before=ev.clientY<r.top+r.height/2;rail.insertBefore(drag,before?target:target.nextSibling)};
      el.onpointerup=async()=>{cancel();if(drag){drag.classList.remove('layout-dragging');drag=null;window.__suppressRailClick=Date.now()+700;await saveRailLayout();toast('Position des serveurs enregistrée')}};
      el.onpointercancel=()=>{cancel();if(drag){drag.classList.remove('layout-dragging');drag=null}};
    });
  }
  function closeFolderManager(){qs('#folderModal').classList.remove('on')}
  async function openFolderManager(folderId=''){
    qs('#folderModal').classList.add('on');const box=qs('#folderBody');box.innerHTML='<p class="muted">Chargement…</p>';
    try{
      const [fd,n,d]=await Promise.all([api('/api/folders'),api('/api/native/guilds'),api('/api/dashboard/guilds')]);
      const folders=fd.folders||[];
      if(!folderId){
        box.innerHTML='<h2>Dossiers de serveurs</h2><p class="muted">Regroupe tes Discord comme dans Discord. Appuie sur un dossier dans la barre de gauche pour l’ouvrir ou le fermer.</p><button class="btn primary" id="newFolder">＋ Nouveau dossier</button><div id="folderList"></div>';
        const list=qs('#folderList');
        list.innerHTML=folders.map(f=>'<div class="folder-list-row"><span class="folder-dot" style="background:'+esc(f.color||'#5865F2')+'"></span><span class="grow"><b>'+esc(f.name)+'</b><small>'+Number((f.serverKeys||[]).length)+' serveur(s)</small></span><button class="btn folderEdit" data-id="'+esc(f.id)+'">Modifier</button></div>').join('')||'<p class="muted">Aucun dossier pour le moment.</p>';
        qs('#newFolder').onclick=()=>openFolderManager('new');box.querySelectorAll('.folderEdit').forEach(b=>b.onclick=()=>openFolderManager(b.dataset.id));return;
      }
      const existing=folderId==='new'?null:folders.find(x=>x.id===folderId);if(folderId!=='new'&&!existing)throw new Error('Dossier introuvable.');
      const selected=new Set(existing?.serverKeys||[]),nativeGuilds=n.guilds||[],sourceIds=new Set(nativeGuilds.map(x=>String(x.source_discord_id||'')).filter(Boolean));
      const choices=[];
      for(const g of nativeGuilds)choices.push({key:'native:'+g.id,name:g.name,icon:iconUrl(g)});
      for(const g of d.guilds||[])if(!sourceIds.has(String(g.id)))choices.push({key:'discord:'+g.id,name:g.name,icon:iconUrl(g)});
      box.innerHTML='<h2>'+(existing?'Paramètres du dossier':'Nouveau dossier')+'</h2><form id="folderForm"><label>Nom du dossier<input name="name" required maxlength="60" value="'+esc(existing?.name||'')+'" placeholder="Ex. Extinction"></label><label>Couleur du dossier<input name="color" type="color" value="'+esc(existing?.color||'#9B59B6')+'"></label><h3>Serveurs dans ce dossier</h3><div class="server-checks">'+choices.map(c=>'<label class="server-check">'+(c.icon?'<img src="'+esc(c.icon)+'" alt="">':'<span style="width:36px;height:36px;border-radius:12px;background:#35373c;display:grid;place-items:center">◎</span>')+'<input type="checkbox" name="serverKey" value="'+esc(c.key)+'" '+(selected.has(c.key)?'checked':'')+'><span>'+esc(c.name)+'</span></label>').join('')+'</div><p><button class="btn primary">Enregistrer</button> <button class="btn" type="button" id="folderBack">Retour</button>'+(existing?' <button class="btn" type="button" id="folderDelete" style="border-color:#ef444466;color:#fca5a5">Supprimer le dossier</button>':'')+'</p></form>';
      qs('#folderBack').onclick=()=>openFolderManager();
      if(existing)qs('#folderDelete').onclick=async()=>{if(!confirm('Supprimer le dossier '+existing.name+' ? Les serveurs resteront disponibles.'))return;try{await api('/api/folders/delete',{method:'POST',body:JSON.stringify({id:existing.id})});await loadGuilds();openFolderManager();toast('Dossier supprimé')}catch(e){toast(e.message,false)}};
      qs('#folderForm').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.currentTarget),serverKeys=f.getAll('serverKey');try{await api('/api/folders/save',{method:'POST',body:JSON.stringify({id:existing?.id||'',name:f.get('name'),color:f.get('color'),serverKeys})});await loadGuilds();openFolderManager();toast('Dossier enregistré')}catch(e){toast(e.message,false)}};
    }catch(e){box.innerHTML='<h2>Dossiers</h2><p>'+esc(e.message)+'</p>'}
  }
  async function selectGuild(g,el,railEl){document.querySelectorAll('.guild,.rail-server').forEach(x=>x.classList.remove('active'));el&&el.classList.add('active');railEl&&railEl.classList.add('active');S.guild=g;S.bot=g.availableBots[0]?.id||null;qs('#gtitle').textContent=g.name;qs('#gbots').innerHTML=g.availableBots.map(x=>'<span class="bot">'+esc(x.name)+'</span>').join('');qs('#refresh').disabled=!g.installed;if(!g.installed){qs('#workspace').className='empty';qs('#workspace').innerHTML='<h2>'+esc(g.name)+'</h2><p>Ce Discord est visible car tu le gères, mais aucun bot CMD n’y est installé. Il reste grisé dans la barre à gauche.</p><button class="btn primary" onclick="openAdd(\'import\')">Importer / connecter</button>';return}await loadStructure()}
  function nativeChannelListItem(gid,x){
    const openable=['text','announcement','forum'].includes(String(x.type||''));
    return openable?'<button type="button" class="channel-link" onclick="openNativeChannel('+JSON.stringify(String(gid))+','+JSON.stringify(String(x.id))+','+JSON.stringify(String(x.name||'salon'))+')"><span>#</span><span class="channel-name">'+esc(x.name)+'</span><small>CMD Sphere</small><b>›</b></button>':'<div class="channel-static"><span>'+((x.type==='voice')?'🔊':'#')+'</span> '+esc(x.name)+' <small>'+esc(x.type)+'</small></div>';
  }
  async function nativeSubmit(ev,action,gid){
    ev.preventDefault();const f=new FormData(ev.currentTarget),body={action,nativeGuildId:gid};for(const [k,v] of f)body[k]=v;
    try{const out=await api('/api/native/action',{method:'POST',body:JSON.stringify(body)});toast(out.warning||'Modification CMD Sphere enregistrée',!out.warning);await selectNative(S.nativeGuild)}catch(e){toast(e.message,false)}
  }
  async function selectNative(g,railEl){
    document.querySelectorAll('.guild,.rail-server').forEach(x=>x.classList.remove('active'));railEl&&railEl.classList.add('active');
    S.guild=null;S.bot=null;S.structure=null;S.nativeGuild=g;qs('#refresh').disabled=false;qs('#gtitle').textContent=g.name;qs('#gbots').innerHTML='<span class="bot">CMD Sphere · autonome</span>';
    try{
      const d=await api('/api/native/guild/'+encodeURIComponent(g.id)),cats=(d.channels||[]).filter(x=>x.type==='category'),chs=(d.channels||[]).filter(x=>x.type!=='category'),admin=['owner','admin'].includes(String(d.member?.membership_role||''));
      let create='';
      if(admin){
        create='<div class="cols section"><form id="nativeCatForm" class="card"><h3>Nouvelle catégorie</h3><label>Nom<input name="name" maxlength="100" required></label><button class="btn primary">Créer</button></form><form id="nativeChForm" class="card"><h3>Nouveau salon</h3><label>Nom<input name="name" maxlength="100" required></label><label>Type<select name="type"><option value="text">Texte</option><option value="voice">Vocal</option><option value="announcement">Annonce</option><option value="forum">Forum</option></select></label><label>Catégorie<select name="parentId"><option value="">Aucune</option>'+cats.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('')+'</select></label><button class="btn primary">Créer</button></form></div>';
      }
      qs('#workspace').className='';
      qs('#workspace').innerHTML='<div class="card"><h2>'+esc(d.guild.name)+'</h2><p class="muted">'+Number(d.guild.member_count||1)+' membre(s) · fonctionne sans aucun bot Discord</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="copyInvite(\''+esc(d.inviteUrl)+'\')">Copier invitation</button><a class="btn" href="/profile?server='+encodeURIComponent(String(g.id))+'">Profil du serveur</a></div></div>'+create+'<div class="section"><h3>Catégories & salons</h3><p class="muted">Les messages CMD Sphere fonctionnent directement avec ton compte, sans bot.</p><div class="discord-channel-list">'+cats.map(c=>'<div class="channel-category"><div class="category-title">⌄ '+esc(c.name)+'</div>'+chs.filter(x=>String(x.source_parent_id||'')===String(c.source_channel_id||c.id)).map(x=>nativeChannelListItem(g.id,x)).join('')+'</div>').join('')+chs.filter(x=>!x.source_parent_id).map(x=>nativeChannelListItem(g.id,x)).join('')+'</div></div><div class="section"><h3>Rôles</h3><div class="list">'+(d.roles||[]).map(r=>'<div class="row"><strong>'+esc(r.name)+'</strong> <small>position '+Number(r.position||0)+'</small></div>').join('')+'</div></div>';
      if(admin){qs('#nativeCatForm').onsubmit=e=>nativeSubmit(e,'create_category',g.id);qs('#nativeChForm').onsubmit=e=>nativeSubmit(e,'create_channel',g.id)}
    }catch(e){toast(e.message,false)}
  }
  async function loadStructure(){try{const d=await api('/api/dashboard/structure?guildId='+encodeURIComponent(S.guild.id)+(S.bot?'&bot='+encodeURIComponent(S.bot):''));S.structure=d;render()}catch(e){toast(e.message,false)}}
  function channelListItem(x){
    const openable=['text','announcement','thread'].includes(String(x.type||''));
    return openable?'<button type="button" class="channel-link" onclick="openDiscordChannel('+JSON.stringify(String(x.id))+','+JSON.stringify(String(x.name||'salon'))+')"><span>#</span><span class="channel-name">'+esc(x.name)+'</span><small>'+esc(x.type)+'</small><b>›</b></button>':'<div class="channel-static"><span>'+((x.type==='voice')?'🔊':'#')+'</span> '+esc(x.name)+' <small>'+esc(x.type)+'</small></div>';
  }
  function render(){const d=S.structure||{},cats=(d.channels||[]).filter(x=>x.type==='category'),channels=(d.channels||[]).filter(x=>x.type!=='category'),roles=(d.roles||[]).filter(x=>!x.managed),w=qs('#workspace');w.className='';
    let h='<div class="cols section">';
    h+='<form id="catf" class="card"><h3>Nouvelle catégorie</h3><label>Nom<input name="name" required maxlength="100"></label><button class="btn primary">Créer</button></form>';
    h+='<form id="chf" class="card"><h3>Nouveau salon</h3><label>Nom<input name="name" required maxlength="100"></label><label>Type<select name="type"><option value="text">Texte</option><option value="voice">Vocal</option><option value="announcement">Annonce</option><option value="forum">Forum</option></select></label><label>Catégorie<select name="parentId"><option value="">Aucune</option>';
    h+=cats.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');
    h+='</select></label><label>Sujet<textarea name="topic" maxlength="1024"></textarea></label><button class="btn primary">Créer</button></form>';
    h+='<form id="rolef" class="card"><h3>Nouveau rôle</h3><label>Nom<input name="name" required maxlength="100"></label><label>Couleur<input name="color" value="#7c3aed" pattern="#?[0-9A-Fa-f]{6}"></label><label><input type="checkbox" name="hoist" style="width:auto"> Afficher séparément</label><label><input type="checkbox" name="mentionable" style="width:auto"> Mentionnable</label><button class="btn primary">Créer</button></form></div>';
    h+='<div class="section"><h3>Catégories & salons</h3><p class="muted">Appuie sur un salon texte pour ouvrir ses vrais messages Discord et écrire dedans.</p><div class="discord-channel-list">';
    h+=cats.map(c=>'<div class="channel-category"><div class="category-title">⌄ '+esc(c.name)+'</div>'+channels.filter(x=>String(x.parentId||'')===String(c.id)).map(channelListItem).join('')+'</div>').join('');
    h+=channels.filter(x=>!x.parentId).map(channelListItem).join('');
    h+='</div></div><div class="section"><h3>Rôles</h3><div class="list">';
    h+=roles.map(r=>'<div class="row"><strong>'+esc(r.name)+'</strong> <small>position '+Number(r.position||0)+'</small></div>').join('');
    h+='</div></div>';w.innerHTML=h;
    qs('#catf').onsubmit=e=>submit(e,'create_category');qs('#chf').onsubmit=e=>submit(e,'create_channel');qs('#rolef').onsubmit=e=>submit(e,'create_role');
  }
  function formatWhen(v){try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return ''}}
  function messageBody(m){
    let out='';
    if(m.referencedMessage)out+='<div class="msg-reply">↩ '+esc(m.referencedMessage.author?.username||'Utilisateur')+' · '+esc(String(m.referencedMessage.content||'').slice(0,180))+'</div>';
    if(m.content)out+='<div class="msg-text">'+esc(m.content).replace(/\n/g,'<br>')+'</div>';
    for(const a of m.attachments||[]){const u=String(a.url||'');if(!/^https:\/\//i.test(u))continue;const image=String(a.contentType||'').startsWith('image/')||/\.(png|jpe?g|gif|webp)$/i.test(String(a.filename||''));out+=image?'<a class="msg-image-link" href="'+esc(u)+'" target="_blank" rel="noopener"><img class="msg-image" src="'+esc(u)+'" alt="'+esc(a.filename||'image')+'"></a>':'<a class="msg-file" href="'+esc(u)+'" target="_blank" rel="noopener">📎 '+esc(a.filename||'Fichier')+' · '+Math.max(1,Math.round(Number(a.size||0)/1024))+' Ko</a>'}
    for(const em of m.embeds||[]){out+='<div class="msg-embed">'+(em.author?.name?'<small>'+esc(em.author.name)+'</small>':'')+(em.title?'<b>'+esc(em.title)+'</b>':'')+(em.description?'<div>'+esc(em.description).replace(/\n/g,'<br>')+'</div>':'')+(em.fields||[]).map(f=>'<div class="embed-field"><strong>'+esc(f.name)+'</strong><span>'+esc(f.value).replace(/\n/g,'<br>')+'</span></div>').join('')+(em.image?.url&&/^https:\/\//i.test(em.image.url)?'<img class="msg-image" src="'+esc(em.image.url)+'" alt="">':'')+'</div>'}
    if((m.stickers||[]).length)out+='<div class="msg-stickers">'+m.stickers.map(st=>'🏷️ '+esc(st.name||'Sticker')).join(' · ')+'</div>';
    if((m.reactions||[]).length)out+='<div class="msg-reactions">'+m.reactions.map(r=>'<span>'+esc(r.emoji?.name||'⭐')+' '+Number(r.count||0)+'</span>').join('')+'</div>';
    if(!out)out='<div class="msg-empty">Message sans contenu visible.</div>';
    return out;
  }
  function renderChannelMessages(scrollBottom=false){
    const box=qs('#channelMessages');if(!box)return;
    const rows=CHAT.messages.slice().sort((a,b)=>{const ta=Date.parse(a.timestamp||0)||0,tb=Date.parse(b.timestamp||0)||0;if(ta!==tb)return ta-tb;try{return BigInt(a.id)<BigInt(b.id)?-1:1}catch{return String(a.id).localeCompare(String(b.id))}});
    box.innerHTML=(CHAT.hasMore?'<div class="history-tools"><button class="btn" id="loadMoreMessages">↑ Charger 100 messages plus anciens</button><button class="btn" id="loadAllMessages">⇧ Tout récupérer</button></div>':'')+rows.map(m=>{
      const av=m.author?.avatar&&/^https:\/\//i.test(m.author.avatar)?'<img src="'+esc(m.author.avatar)+'" alt="">':'<span>'+esc(String(m.author?.username||'?').slice(0,1).toUpperCase())+'</span>';
      return '<article class="discord-message" data-message-id="'+esc(m.id)+'"><div class="msg-avatar">'+av+'</div><div class="msg-main"><div class="msg-meta"><b>'+esc(m.author?.username||'Utilisateur')+'</b>'+(m.author?.bot?'<span class="bot-badge">BOT</span>':'')+'<time>'+esc(formatWhen(m.timestamp))+'</time><button class="reply-mini" onclick="replyDiscordMessage('+JSON.stringify(String(m.id))+','+JSON.stringify(String(m.author?.username||'Utilisateur'))+','+JSON.stringify(String(m.content||'').slice(0,120))+')">↩</button></div>'+messageBody(m)+'</div></article>';
    }).join('')||'<div class="channel-empty">Aucun message visible dans ce salon.</div>';
    if(qs('#loadMoreMessages'))qs('#loadMoreMessages').onclick=()=>loadDiscordMessages(false,false);
    if(qs('#loadAllMessages'))qs('#loadAllMessages').onclick=()=>loadDiscordMessages(false,true);
    if(scrollBottom)requestAnimationFrame(()=>box.scrollTop=box.scrollHeight);
  }
  function mergeChannelMessages(list){
    const map=new Map(CHAT.messages.map(m=>[String(m.id),m]));for(const m of list||[])map.set(String(m.id),m);CHAT.messages=[...map.values()];
  }
  async function openNativeChannel(guildId,id,name){
    CHAT.open=true;CHAT.mode='native';CHAT.guildId=String(guildId);CHAT.bot=null;CHAT.channelId=String(id);CHAT.name=String(name||'salon');CHAT.messages=[];CHAT.nextBefore=null;CHAT.hasMore=false;CHAT.replyTo=null;
    qs('#channelTitle').textContent='# '+CHAT.name;qs('#channelSubtitle').textContent='CMD Sphere · sans bot Discord';qs('#channelOverlay').classList.add('on');qs('#channelInput').disabled=false;qs('#channelSend').disabled=false;updateReplyBar();
    await loadDiscordMessages(true,false);clearInterval(CHAT.poll);CHAT.poll=setInterval(()=>refreshDiscordMessages().catch(()=>{}),3500);
  }
  async function openDiscordChannel(id,name){
    if(!S.guild||!S.bot){toast('Aucun bot CMD disponible pour ce Discord.',false);return}
    CHAT.open=true;CHAT.mode='discord';CHAT.guildId=String(S.guild.id);CHAT.bot=S.bot;CHAT.channelId=String(id);CHAT.name=String(name||'salon');CHAT.messages=[];CHAT.nextBefore=null;CHAT.hasMore=false;CHAT.replyTo=null;
    qs('#channelTitle').textContent='# '+CHAT.name;qs('#channelSubtitle').textContent='Chargement des vrais messages Discord…';qs('#channelOverlay').classList.add('on');qs('#channelInput').disabled=false;qs('#channelSend').disabled=false;updateReplyBar();
    await loadDiscordMessages(true,false);clearInterval(CHAT.poll);CHAT.poll=setInterval(()=>refreshDiscordMessages().catch(()=>{}),5000);
  }
  function closeDiscordChannel(){CHAT.open=false;clearInterval(CHAT.poll);CHAT.poll=null;qs('#channelOverlay').classList.remove('on')}
  async function loadDiscordMessages(reset=false,all=false){
    if(CHAT.loading||!CHAT.open)return;CHAT.loading=true;const moreBtn=qs('#loadAllMessages');if(moreBtn&&all)moreBtn.textContent='Récupération…';
    try{
      let keep=true,first=true,total=0;
      do{
        const before=reset&&first?'':(CHAT.nextBefore||'');
        const u=CHAT.mode==='native'
          ? '/api/native/messages?guildId='+encodeURIComponent(CHAT.guildId)+'&channelId='+encodeURIComponent(CHAT.channelId)+'&limit=100'+(before?'&before='+encodeURIComponent(before):'')
          : '/api/dashboard/messages?guildId='+encodeURIComponent(CHAT.guildId)+'&channelId='+encodeURIComponent(CHAT.channelId)+'&bot='+encodeURIComponent(CHAT.bot)+'&limit=100'+(before?'&before='+encodeURIComponent(before):'');
        const d=await api(u);if(CHAT.mode!=='native')CHAT.bot=d.bot||CHAT.bot;mergeChannelMessages(d.messages||[]);CHAT.nextBefore=d.nextBefore||null;CHAT.hasMore=Boolean(d.hasMore&&CHAT.nextBefore);total+=(d.messages||[]).length;
        if(first){qs('#channelSubtitle').textContent=(d.channel?.topic?d.channel.topic+' · ':'')+(CHAT.mode==='native'?'CMD Sphere · sans bot':('via '+(d.botName||CHAT.bot)))+' · '+CHAT.messages.length+' message(s) chargés';}
        renderChannelMessages(reset&&first);first=false;keep=all&&CHAT.hasMore;
        if(keep){qs('#channelSubtitle').textContent='Récupération complète… '+CHAT.messages.length+' message(s)';await new Promise(r=>setTimeout(r,180))}
      }while(keep);
      qs('#channelSubtitle').textContent=(CHAT.hasMore?'Historique partiel · ':'Historique chargé · ')+CHAT.messages.length+' message(s) · '+(CHAT.mode==='native'?'envoi direct CMD Sphere':'envoi via '+CHAT.bot);
      if(all&&!CHAT.hasMore)toast('Tout l’historique accessible a été récupéré : '+CHAT.messages.length+' message(s)');
    }catch(e){toast(e.message,false);qs('#channelSubtitle').textContent='Impossible de charger ce salon : '+e.message}finally{CHAT.loading=false}
  }
  async function refreshDiscordMessages(){
    if(!CHAT.open||CHAT.loading)return;
    try{const u=CHAT.mode==='native'?'/api/native/messages?guildId='+encodeURIComponent(CHAT.guildId)+'&channelId='+encodeURIComponent(CHAT.channelId)+'&limit=100':'/api/dashboard/messages?guildId='+encodeURIComponent(CHAT.guildId)+'&channelId='+encodeURIComponent(CHAT.channelId)+'&bot='+encodeURIComponent(CHAT.bot)+'&limit=100';const d=await api(u);const before=CHAT.messages.length;mergeChannelMessages(d.messages||[]);if(CHAT.messages.length!==before){renderChannelMessages(true);qs('#channelSubtitle').textContent=CHAT.messages.length+' message(s) · actualisé à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}}catch{}
  }
  function replyDiscordMessage(id,author,content){CHAT.replyTo=String(id);qs('#replyText').textContent='Répondre à '+author+(content?' · '+content:'');updateReplyBar()}
  function updateReplyBar(){const b=qs('#replyBar');if(!b)return;b.classList.toggle('on',Boolean(CHAT.replyTo));if(!CHAT.replyTo)qs('#replyText').textContent=''}
  async function sendDiscordMessage(ev){
    ev.preventDefault();const input=qs('#channelInput'),content=String(input.value||'').trim();if(!content||!CHAT.open)return;const old=input.value;input.value='';qs('#channelSend').disabled=true;
    try{let out;if(CHAT.mode==='native')out=await api('/api/native/messages',{method:'POST',body:JSON.stringify({guildId:CHAT.guildId,channelId:CHAT.channelId,content,replyTo:CHAT.replyTo||undefined})});else out=await api('/api/dashboard/action',{method:'POST',body:JSON.stringify({action:'send_message',guildId:CHAT.guildId,bot:CHAT.bot,channelId:CHAT.channelId,content,replyTo:CHAT.replyTo||undefined})});if(out.bot)CHAT.bot=out.bot;CHAT.replyTo=null;updateReplyBar();toast(CHAT.mode==='native'?'Message envoyé avec ton compte CMD Sphere':'Message envoyé via '+(out.botName||'CMD'));await refreshDiscordMessages()}catch(e){input.value=old;toast(e.message,false)}finally{qs('#channelSend').disabled=false;input.focus()}
  }
  async function submit(e,action){e.preventDefault();const f=new FormData(e.currentTarget),body={action,guildId:S.guild.id,bot:S.bot};for(const [k,v] of f)body[k]=v;if(action==='create_role'){body.hoist=e.currentTarget.hoist.checked;body.mentionable=e.currentTarget.mentionable.checked}try{await api('/api/dashboard/action',{method:'POST',body:JSON.stringify(body)});toast('Modification appliquée sur Discord');e.currentTarget.reset();await loadStructure()}catch(x){toast(x.message,false)}}
  async function refreshEverything(){
    const b=qs('#refresh');if(b){b.disabled=true;b.textContent='↻ Actualisation…'}
    try{
      await loadGuilds();
      if(S.guild&&S.guild.id)await loadStructure();else if(S.nativeGuild?.id)await selectNative(S.nativeGuild);
      if(qs('#webhookModal')?.classList.contains('on'))await openWebhookManager();
      toast('CMD Sphere actualisé');
    }catch(e){toast(e.message,false)}
    finally{if(b){b.disabled=false;b.textContent='↻ Actualiser'}}
  }
  let mirrorPoll=null;
  function closeMirrorManager(){qs('#mirrorModal').classList.remove('on');clearInterval(mirrorPoll);mirrorPoll=null}
  async function mirrorRender(){
    const box=qs('#mirrorBody');let d;
    try{d=await api('/api/mirror/status')}catch(e){box.innerHTML='<h2>Sauvegarde Discord</h2><p>'+esc(e.message)+'</p>';return}
    const j=d.job||{},p=j.progress||{},sum=j.summary||{},m=d.mirror||{},running=['queued','running'].includes(j.status);
    const totalGuilds=Number(p.guildCount||sum.guilds||m.guilds||0),doneGuilds=Number(p.guildIndex||0);
    const percent=j.status==='complete'?100:(totalGuilds?Math.min(99,Math.round((doneGuilds/totalGuilds)*100)):0);
    const errors=(sum.errors||[]).slice(-12);
    box.innerHTML='<div class="mirror-hero"><h2>🛡 Sauvegarde complète Discord → CMD Sphere</h2><p>Conserve ton profil Discord disponible, tes serveurs, catégories, salons, rôles, permissions, bots/intégrations, réglages visibles, webhooks sans leurs secrets et les messages accessibles aux bots CMD.</p></div>'+
      '<div class="mirror-stat-grid"><div class="mirror-stat"><b>'+Number(m.guilds||sum.fullGuilds||0)+'</b><small>serveurs copiés</small></div><div class="mirror-stat"><b>'+Number(m.messages||sum.messages||0)+'</b><small>messages sauvegardés</small></div><div class="mirror-stat"><b>'+Number(sum.bots||0)+'</b><small>bots retrouvés</small></div></div>'+
      '<div class="mirror-progress"><span style="width:'+percent+'%"></span></div><p><b>'+(running?'Synchronisation en cours':j.status==='complete'?'Sauvegarde terminée':j.status==='failed'?'Sauvegarde interrompue':'Aucune sauvegarde lancée')+'</b><br><span class="muted">'+esc(p.label||'Prêt à sauvegarder')+(p.guildName?' · '+esc(p.guildName):'')+(p.channelName?' · #'+esc(p.channelName):'')+'</span></p>'+
      '<p><button class="btn primary" id="mirrorStart">'+(running?'Continuer / vérifier':'Lancer la sauvegarde complète')+'</button> <button class="btn" id="mirrorCheck">↻ Actualiser l’état</button></p>'+
      '<p class="muted">La copie n’efface rien sur Discord. Les éléments qu’un bot CMD n’a pas le droit de voir sont signalés au lieu d’être inventés.</p>'+
      (errors.length?'<div class="mirror-log">'+errors.map(e=>esc((e.guildName||e.guildId||'Discord')+(e.channelId?' / '+e.channelId:'')+' : '+e.error)).join('\n')+'</div>':'');
    qs('#mirrorStart').onclick=startMirror;qs('#mirrorCheck').onclick=mirrorRender;
    if(running&&!mirrorPoll)mirrorPoll=setInterval(mirrorRender,3500);
    if(!running&&mirrorPoll){clearInterval(mirrorPoll);mirrorPoll=null}
  }
  async function openMirrorManager(){qs('#mirrorModal').classList.add('on');await mirrorRender()}
  async function startMirror(){
    try{const d=await api('/api/mirror/start',{method:'POST',body:'{}'});toast(d.reused?'Sauvegarde déjà en cours':'Sauvegarde Discord lancée');await mirrorRender()}catch(e){toast(e.message,false)}
  }
  function closeBotsManager(){qs('#botsModal').classList.remove('on')}
  async function openBotsManager(){
    qs('#botsModal').classList.add('on');const box=qs('#botsBody');box.innerHTML='<h2>Bots Discord</h2><p class="muted">Détection des bots et intégrations…</p>';
    try{
      const [known,data]=await Promise.all([api('/api/bot-invites'),api('/api/dashboard/bots')]);
      const knownHtml=(known.bots||[]).map(b=>'<div class="bot-card"><span class="bot-avatar">🤖</span><div class="bot-info"><b>'+esc(b.name)+'</b><small>Bot CMD officiel</small></div><div class="bot-actions"><a class="btn primary" target="_blank" rel="noopener" href="'+esc(b.url)+'">Réinviter</a></div></div>').join('');
      const guildHtml=(data.guilds||[]).map(g=>'<section class="bot-guild"><h3>'+esc(g.guildName)+'</h3><p class="muted">'+(g.bots||[]).length+' bot(s) détecté(s) · '+(g.integrations||[]).length+' intégration(s)</p><div class="bot-manager-grid">'+(g.bots||[]).map(b=>{const av=b.avatar&&/^https?:/i.test(b.avatar)?'<img src="'+esc(b.avatar)+'" alt="">':'🤖';return '<div class="bot-card"><span class="bot-avatar">'+av+'</span><div class="bot-info"><b>'+esc(b.username||b.name||b.id)+'</b><small>ID '+esc(b.id)+'</small></div><div class="bot-actions"><a class="btn" target="_blank" rel="noopener" href="'+esc(b.inviteUrl)+'">Ajouter / Réinviter</a></div></div>'}).join('')+'</div></section>').join('');
      box.innerHTML='<h2>🤖 Bots</h2><p class="muted"><b>'+Number(data.totalBots||0)+'</b> bot(s) et <b>'+Number(data.totalIntegrations||0)+'</b> intégration(s) détectés. CMD Sphere accepte tous les bots Discord standards : il peut les détecter, les afficher et générer leur lien OAuth à partir du Client ID. Les réglages internes d’un bot tiers restent chez ce bot s’il ne fournit pas d’API compatible.</p><div class="bot-section"><h3>Mes bots CMD</h3><div class="bot-manager-grid">'+(knownHtml||'<p class="muted">Liens en cours de disponibilité.</p>')+'</div></div><div class="bot-section"><h3>Ajouter n’importe quel bot Discord</h3><form id="genericBotForm" class="generic-bot-form"><input name="clientId" required inputmode="numeric" placeholder="Application / Client ID Discord"><input name="permissions" inputmode="numeric" value="0" placeholder="Permissions"><button class="btn primary">Créer le lien</button></form><p class="muted">Pour les bots publics, leur lien officiel reste préférable lorsqu’ils demandent des scopes ou permissions spécifiques.</p></div><div class="bot-section"><h3>Bots détectés sur tes serveurs</h3>'+guildHtml+'</div>';
      qs('#genericBotForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const r=await api('/api/bots/invite-url',{method:'POST',body:JSON.stringify({clientId:f.get('clientId'),permissions:f.get('permissions')})});window.open(r.url,'_blank','noopener')}catch(x){toast(x.message,false)}};
      if((data.errors||[]).length)toast((data.errors||[]).length+' source(s) bot non lisible(s)',false);
    }catch(e){box.innerHTML='<h2>Bots Discord</h2><p>'+esc(e.message)+'</p>'}
  }
  function closeWebhookManager(){qs('#webhookModal').classList.remove('on')}
  async function openWebhookManager(){
    qs('#webhookModal').classList.add('on');const box=qs('#webhookBody');box.innerHTML='<h2>Webhooks Discord</h2><p class="muted">Récupération des webhooks accessibles sur tous tes serveurs…</p>';
    try{
      const d=await api('/api/dashboard/webhooks?all=1');
      const guilds=d.guilds||[];
      box.innerHTML='<h2>Webhooks Discord</h2><p class="muted"><b>'+Number(d.total||0)+'</b> webhook(s) trouvés sur '+guilds.length+' serveur(s) · <b>'+Number(d.mine||0)+'</b> créé(s) par ton compte Discord. CMD Sphere interroge tous les bots CMD disponibles pour ne rien rater.</p><div class="webhook-toolbar"><input id="webhookSearch" placeholder="Rechercher un webhook, salon ou serveur…"><button class="btn" id="webhookMine">Mes webhooks</button><button class="btn" id="webhookRefresh">↻ Actualiser</button></div><div id="webhookList"></div>';
      const list=qs('#webhookList');
      let mineOnly=false;
      function draw(q=''){
        q=String(q||'').trim().toLowerCase();
        let html='';
        for(const g of guilds){
          const rows=(g.webhooks||[]).filter(w=>(!mineOnly||w.mine)&&(!q||[g.guildName,w.name,w.channelName,w.creator?.username,w.id].some(v=>String(v||'').toLowerCase().includes(q))));
          if(!rows.length)continue;
          const icon=g.guildIcon&&/^https?:/i.test(g.guildIcon)?'<img src="'+esc(g.guildIcon)+'" alt="">':'<span class="webhook-avatar">'+esc(String(g.guildName||'?').slice(0,1).toUpperCase())+'</span>';
          html+='<section class="webhook-guild"><div class="webhook-guild-head">'+icon+'<div class="grow"><b>'+esc(g.guildName||g.guildId)+'</b><small>'+esc(g.botName||g.bot||'CMD')+' · '+rows.length+' webhook(s)</small></div></div>';
          html+=rows.map(w=>{
            const avatar=w.avatar&&/^https?:/i.test(w.avatar)?'<img src="'+esc(w.avatar)+'" alt="">':'<span class="webhook-avatar">🪝</span>';
            const creator=w.creator?.username?'Créé par '+w.creator.username:'Créateur non fourni par Discord';
            const channel=w.channelName?'# '+w.channelName:(w.channelId?'Salon '+w.channelId:'Salon inconnu');
            return '<div class="webhook-row">'+avatar+'<div class="webhook-main"><b>'+esc(w.name||'Webhook')+'</b><small>'+esc(channel)+' · '+esc(creator)+'</small><div class="webhook-id">ID '+esc(w.id)+'</div></div><span>›</span></div>';
          }).join('')+'</section>';
        }
        list.innerHTML=html||'<div class="webhook-empty">Aucun webhook trouvé.</div>';
      }
      draw();qs('#webhookSearch').oninput=e=>draw(e.target.value);qs('#webhookMine').onclick=()=>{mineOnly=!mineOnly;qs('#webhookMine').classList.toggle('primary',mineOnly);draw(qs('#webhookSearch').value)};qs('#webhookRefresh').onclick=async()=>{qs('#webhookRefresh').disabled=true;try{await openWebhookManager();toast('Webhooks actualisés')}finally{const b=qs('#webhookRefresh');if(b)b.disabled=false}};
      if((d.errors||[]).length)toast((d.errors||[]).length+' serveur(s) non lisibles pour les webhooks',false);
    }catch(e){box.innerHTML='<h2>Webhooks Discord</h2><p>'+esc(e.message)+'</p>'}
  }
  function openAdd(view='menu'){qs('#addModal').classList.add('on');renderAdd(view)}
  function closeAdd(){qs('#addModal').classList.remove('on')}
  function renderAdd(view){const box=qs('#addBody');if(view==='menu'){box.innerHTML='<h2>Ajouter un serveur</h2><p class="muted">Comme sur une application communautaire classique.</p><div class="add-grid"><button class="btn add-choice" onclick="renderAdd(\'create\')"><b>＋ Créer un serveur</b><br><small>Nouvel espace CMD Sphere</small></button><button class="btn add-choice" onclick="renderAdd(\'join\')"><b>🔗 J’ai une invitation</b><br><small>Rejoindre par lien ou code</small></button><button class="btn add-choice" onclick="renderAdd(\'discover\')"><b>◎ Découvrir</b><br><small>Voir les serveurs publics</small></button><button class="btn add-choice" onclick="renderAdd(\'import\')"><b>⬇ Importer Discord</b><br><small>Copier salons, rôles et permissions</small></button></div>';return}if(view==='create'){box.innerHTML='<h2>Créer un serveur CMD Sphere</h2><form id="createNative"><p><input name="name" required maxlength="100" placeholder="Nom du serveur"></p><label><input type="checkbox" name="isPublic" style="width:auto"> Visible dans Découvrir</label><p><button class="btn primary">Créer</button> <button type="button" class="btn" onclick="renderAdd(\'menu\')">Retour</button></p></form>';qs('#createNative').onsubmit=createNative;return}if(view==='join'){box.innerHTML='<h2>Rejoindre un serveur</h2><form id="joinNative"><p><input name="invite" required placeholder="Lien ou code d’invitation CMD Sphere"></p><p><button class="btn primary">Rejoindre</button> <button type="button" class="btn" onclick="renderAdd(\'menu\')">Retour</button></p></form>';qs('#joinNative').onsubmit=joinNative;return}if(view==='discover'){box.innerHTML='<h2>Découvrir</h2><div id="discoverNative"><p class="muted">Chargement…</p></div><p><button class="btn" onclick="renderAdd(\'menu\')">Retour</button></p>';loadDiscover();return}if(view==='import'){box.innerHTML='<h2>Importer depuis Discord</h2><p class="muted">Tous les Discord dont tu es propriétaire sont importés. Avec un bot CMD : structure complète. Sans bot : nom + icône, structure à synchroniser plus tard.</p><p><a class="btn primary" href="/dashboard-login?link=1&next=/dashboard?sync=1">↻ Synchroniser mon compte Discord</a></p><button class="btn" onclick="importAll()">Relancer l’import depuis les données déjà synchronisées</button><div id="importList"></div><p><button class="btn" onclick="renderAdd(\'menu\')">Retour</button></p>';loadImports();return}}
  async function createNative(e){e.preventDefault();const f=new FormData(e.currentTarget);try{await api('/api/native/guilds',{method:'POST',body:JSON.stringify({name:f.get('name'),isPublic:f.get('isPublic')==='on'})});closeAdd();await loadGuilds();toast('Serveur CMD Sphere créé')}catch(x){toast(x.message,false)}}
  function joinNative(e){e.preventDefault();let v=String(new FormData(e.currentTarget).get('invite')||'').trim();try{if(v.includes('/invite/'))v=new URL(v).pathname.split('/').filter(Boolean).pop()}catch{}if(v)location.href='/invite/'+encodeURIComponent(v)}
  async function loadDiscover(){try{const d=await api('/api/native/discover');qs('#discoverNative').innerHTML=(d.guilds||[]).map(g=>'<div class="native-box"><strong>'+esc(g.name)+'</strong><small>'+Number(g.member_count||0)+' membre(s)</small><p><a class="btn primary" href="'+esc(g.inviteUrl)+'">Rejoindre</a></p></div>').join('')||'<p class="muted">Aucun serveur public.</p>'}catch(x){toast(x.message,false)}}
  async function loadImports(){try{const d=await api('/api/dashboard/guilds');qs('#importList').innerHTML=(d.guilds||[]).map(g=>'<div class="native-box"><strong>'+esc(g.name)+'</strong><small>'+(g.installed?'Bot CMD disponible':'Aucun bot CMD installé')+'</small>'+(g.installed?'<p><button class="btn" onclick="importOne(\''+esc(g.id)+'\')">Importer</button></p>':'')+'</div>').join('')}catch(x){toast(x.message,false)}}
  async function importOne(id){try{await api('/api/native/import',{method:'POST',body:JSON.stringify({sourceGuildId:id})});closeAdd();await loadGuilds();toast('Discord importé dans CMD Sphere')}catch(x){toast(x.message,false)}}
  async function importAll(){try{const d=await api('/api/native/import-all',{method:'POST',body:'{}'});closeAdd();await loadGuilds();toast((d.imported||[]).length+' Discord propriétaire(s) importé(s)')}catch(x){toast(x.message,false)}}
  async function copyInvite(v){try{await navigator.clipboard.writeText(v);toast('Invitation copiée')}catch{prompt('Copie le lien',v)}}
  if(qs('#refresh'))qs('#refresh').onclick=refreshEverything;if(qs('#folderBtn'))qs('#folderBtn').onclick=()=>openFolderManager();if(qs('#folderClose'))qs('#folderClose').onclick=closeFolderManager;if(qs('#webhookBtn'))qs('#webhookBtn').onclick=openWebhookManager;if(qs('#webhookClose'))qs('#webhookClose').onclick=closeWebhookManager;if(qs('#botsBtn'))qs('#botsBtn').onclick=openBotsManager;if(qs('#botsClose'))qs('#botsClose').onclick=closeBotsManager;if(qs('#mirrorBtn'))qs('#mirrorBtn').onclick=openMirrorManager;if(qs('#mirrorClose'))qs('#mirrorClose').onclick=closeMirrorManager;if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});loadGuilds().catch(e=>toast(e.message,false));
  `;
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#12051f"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/app-icon.webp?v=5"><title>CMD Sphere</title><style>'+style+'</style></head><body><div class="sphere-app"><aside class="server-rail"><a class="rail-home" href="/dashboard" title="CMD Sphere"><img src="/app-icon.webp?v=5" alt="CMD Sphere"></a><a class="rail-messages" href="/messages" title="Messages privés">💬</a><div class="rail-sep"></div><a class="rail-server rail-top" href="https://cmd-top-serveur-production.up.railway.app" target="_blank" rel="noopener" title="CMD Top Serveur · Voter">🏆</a><div class="rail-sep"></div><div id="railGuilds" style="display:contents">'+nativeRailHtml+'</div><a class="rail-plus" id="railPlus" href="/servers/add" title="Créer ou rejoindre">＋</a></aside><div class="wrap"><div class="top"><div class="brand"><img src="/app-icon.webp?v=5" class="logo-img" alt="CMD Sphere"><div><h1 style="margin:0">CMD Sphere</h1><div class="muted">Communautés · Salons · Rôles · Invitations · Votes</div></div></div><div><span class="muted">'+user+'</span> <a class="btn" href="/dashboard-login?link=1&next=/dashboard?sync=1">↻ Synchroniser mes Discord</a> <button class="btn" id="folderBtn">📁 Dossiers</button> <a class="btn" href="/messages">💬 Messages</a> <button class="btn" id="webhookBtn">🪝 Webhooks</button> <button class="btn" id="botsBtn">🤖 Bots</button> <button class="btn" id="mirrorBtn">🛡 Sauvegarde Discord</button> <a class="btn" href="/shop">🛍️ Boutique gratuite</a> <a class="btn" href="/profile">Mon profil</a> <a class="btn" href="/dashboard-logout">Déconnexion</a></div></div><div class="grid"><aside class="card"><h2>Mes Discord</h2><div id="guilds" class="list">'+nativeListHtml+'</div></aside><main class="card"><div class="top"><div><h2 id="gtitle" style="margin:0">CMD Sphere</h2><div id="gbots" class="muted"></div></div><button id="refresh" class="btn">↻ Actualiser</button></div><div id="workspace" class="empty"><img class="brand-logo" src="/brand-logo.webp?v=5" alt="CMD Sphere"><h2>Choisis un serveur dans la barre de gauche</h2><p>Ou appuie sur ＋ pour en créer/rejoindre un.</p><div class="card" style="margin:22px auto 0;max-width:640px;text-align:left;background:linear-gradient(135deg,#24102f,#15101f)"><div class="top"><div><div class="muted">🏆 CMD TOP SERVEUR</div><h2 style="margin:5px 0">Vote pour tes serveurs préférés</h2><p class="muted" style="margin:0">Classement par votes · 24 h / mois / total · 1 vote toutes les 2 heures.</p></div><a class="btn primary" href="https://cmd-top-serveur-production.up.railway.app" target="_blank" rel="noopener">🗳️ VOTER</a></div></div></div></main></div></div><div class="user-dock"><img class="user-dock-avatar" src="'+userAvatar+'" alt=""><div class="user-dock-main"><b>'+userDisplay+'</b><small>● En ligne · CMD Sphere</small></div><div class="user-dock-actions"><a href="/messages" title="Messages">💬</a><a href="/shop" title="Boutique">🛍️</a><a href="/profile" title="Profil et paramètres">⚙️</a></div></div></div><section id="channelOverlay" class="channel-overlay"><header class="channel-head"><button class="channel-back" type="button" onclick="closeDiscordChannel()">‹</button><div class="channel-head-main"><b id="channelTitle"># salon</b><small id="channelSubtitle">Discord</small></div><div class="channel-actions"><button class="btn" type="button" onclick="refreshDiscordMessages()">↻</button><button class="btn" type="button" onclick="loadDiscordMessages(false,true)">Tout</button></div></header><div id="channelMessages" class="channel-messages"></div><div class="channel-compose-wrap"><div id="replyBar" class="reply-bar"><span id="replyText"></span><button type="button" onclick="CHAT.replyTo=null;updateReplyBar()">×</button></div><form class="channel-composer" onsubmit="sendDiscordMessage(event)"><textarea id="channelInput" maxlength="2000" placeholder="Envoyer un message sur Discord…" disabled></textarea><button id="channelSend" disabled>Envoyer</button></form><div class="send-note">Sur un salon CMD Sphere, le message part directement avec ton compte. Sur un vrai salon Discord, Discord exige une intégration autorisée.</div></div></section><div id="botsModal" class="add-modal"><div class="add-card" style="width:min(900px,100%)"><div style="display:flex;justify-content:flex-end"><button class="btn" id="botsClose">✕</button></div><div id="botsBody"><p class="muted">Chargement…</p></div></div></div><div id="mirrorModal" class="add-modal"><div class="add-card" style="width:min(760px,100%)"><div style="display:flex;justify-content:flex-end"><button class="btn" id="mirrorClose">✕</button></div><div id="mirrorBody"><p class="muted">Chargement…</p></div></div></div><div id="webhookModal" class="add-modal"><div class="add-card" style="width:min(820px,100%)"><div style="display:flex;justify-content:flex-end"><button class="btn" id="webhookClose">✕</button></div><div id="webhookBody"><p class="muted">Chargement…</p></div></div></div><div id="folderModal" class="add-modal"><div class="add-card"><div style="display:flex;justify-content:flex-end"><button class="btn" id="folderClose">✕</button></div><div id="folderBody"></div></div></div><div id="addModal" class="add-modal"><div class="add-card"><div style="display:flex;justify-content:flex-end"><button class="btn" id="addClose">✕</button></div><div id="addBody"></div></div></div><div id="status" class="status"></div><script>'+script+'</script></body></html>';
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
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_channel_messages(
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES cmd_native_channels(id) ON DELETE CASCADE,
    sender_user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    reply_to UUID REFERENCES cmd_native_channel_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS cmd_native_channel_messages_channel_created_idx ON cmd_native_channel_messages(channel_id,created_at DESC)');  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_global_profiles(
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
  await pool.query('ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_pronouns TEXT');
  await pool.query("ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_name_style TEXT NOT NULL DEFAULT 'prism'");
  await pool.query('ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_role_id TEXT');
  await pool.query("ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_badges JSONB NOT NULL DEFAULT '[]'::jsonb");
  await pool.query('ALTER TABLE cmd_native_guilds ADD COLUMN IF NOT EXISTS server_tag TEXT');
  await pool.query('ALTER TABLE cmd_native_guilds ADD COLUMN IF NOT EXISTS server_tag_icon TEXT');
  await pool.query("ALTER TABLE cmd_native_guilds ADD COLUMN IF NOT EXISTS server_tag_style TEXT NOT NULL DEFAULT 'prism'");
  await pool.query("ALTER TABLE cmd_native_roles ADD COLUMN IF NOT EXISTS visual_style TEXT NOT NULL DEFAULT 'solid'");
  await pool.query('ALTER TABLE cmd_native_roles ADD COLUMN IF NOT EXISTS gradient_start TEXT');
  await pool.query('ALTER TABLE cmd_native_roles ADD COLUMN IF NOT EXISTS gradient_end TEXT');
  await pool.query('ALTER TABLE cmd_native_roles ADD COLUMN IF NOT EXISTS role_icon TEXT');
  await pool.query('ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS pronouns TEXT');
  await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS name_style TEXT NOT NULL DEFAULT 'prism'");
  await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS avatar_decoration TEXT NOT NULL DEFAULT 'none'");
  await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS profile_effect TEXT NOT NULL DEFAULT 'none'");
  await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS profile_frame TEXT NOT NULL DEFAULT 'none'");
  await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS nameplate_style TEXT NOT NULL DEFAULT 'none'");
  await pool.query('ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS featured_tag_guild_id TEXT');
  await pool.query("ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS avatar_decoration TEXT NOT NULL DEFAULT 'none'");
  await pool.query("ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_effect TEXT NOT NULL DEFAULT 'none'");
  await pool.query("ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_frame TEXT NOT NULL DEFAULT 'none'");
  await pool.query("ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS nameplate_style TEXT NOT NULL DEFAULT 'none'");
  await pool.query("ALTER TABLE cmd_native_guilds ADD COLUMN IF NOT EXISTS badge_pack TEXT NOT NULL DEFAULT 'star'");
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_user_preferences(
    user_id TEXT PRIMARY KEY,
    allow_dms BOOLEAN NOT NULL DEFAULT TRUE,
    allow_message_requests BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_dm_threads(
    id UUID PRIMARY KEY,
    user_low TEXT NOT NULL,
    user_high TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_low,user_high)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_dm_messages(
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES cmd_dm_threads(id) ON DELETE CASCADE,
    sender_user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS cmd_dm_messages_thread_created_idx ON cmd_dm_messages(thread_id,created_at)');
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_shop_installs(
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_key TEXT NOT NULL,
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,item_type,item_key)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_server_folders(
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#5865F2',
    position INT NOT NULL DEFAULT 0,
    collapsed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS cmd_server_folders_user_pos_idx ON cmd_server_folders(user_id,position)');
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_server_folder_items(
    folder_id UUID NOT NULL REFERENCES cmd_server_folders(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    server_key TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    PRIMARY KEY(folder_id,server_key),
    UNIQUE(user_id,server_key)
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS cmd_server_folder_items_user_idx ON cmd_server_folder_items(user_id,position)');
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_server_layout(
    user_id TEXT NOT NULL,
    item_key TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,item_key)
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS cmd_server_layout_user_pos_idx ON cmd_server_layout(user_id,position)');
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_discord_mirror_jobs(
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    auth_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued',
    progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS cmd_discord_mirror_jobs_user_idx ON cmd_discord_mirror_jobs(user_id,started_at DESC)');
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_discord_mirror_profile(
    user_id TEXT PRIMARY KEY,
    discord_user_id TEXT,
    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    guilds JSONB NOT NULL DEFAULT '[]'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_discord_mirror_guilds(
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    bot TEXT,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,guild_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cmd_discord_mirror_messages(
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    message_timestamp TIMESTAMPTZ,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,message_id)
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS cmd_discord_mirror_messages_channel_idx ON cmd_discord_mirror_messages(user_id,guild_id,channel_id,message_timestamp)');
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
      discordId:identity?.provider_user_id?String(identity.provider_user_id):null,
      avatarDecorationData:profile.avatarDecorationData||null,
      collectibles:profile.collectibles||null,
      primaryGuild:profile.primaryGuild||null
    },
    guildIds:[...new Set(guilds.map(g=>String(g.id||"")).filter(id=>/^\d{15,22}$/.test(id)))],
    guilds:guilds.map(g=>({id:String(g.id||""),name:String(g.name||g.id||"Discord").slice(0,100),icon:g.icon?String(g.icon).slice(0,300):null,owner:Boolean(g.owner),permissions:String(g.permissions||"0")})).filter(g=>/^\d{15,22}$/.test(g.id)).slice(0,100)
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
    accentColor:identity.user.accentColor,
    avatarDecorationData:identity.user.avatarDecorationData||null,
    collectibles:identity.user.collectibles||null,
    primaryGuild:identity.user.primaryGuild||null
  };
  await pool.query(`INSERT INTO cmd_account_identities(account_id,provider,provider_user_id,profile,guilds)
    VALUES($1,'discord',$2,$3::jsonb,$4::jsonb)
    ON CONFLICT(provider,provider_user_id) DO UPDATE SET account_id=EXCLUDED.account_id,profile=EXCLUDED.profile,guilds=EXCLUDED.guilds,updated_at=NOW()`,
    [String(accountId),did,JSON.stringify(profile),JSON.stringify(identity.guilds||[])]);
  await migrateLegacyDiscordUser(did,accountId);
  const authData=authFromAccount(account,{provider_user_id:did,profile,guilds:identity.guilds||[]});
  setTimeout(()=>importOwnedDiscordGuilds(authData).then(x=>console.log("[owned-import] login manageable="+(x.manageableCount||0)+" owner="+x.ownedCount+" imported="+x.imported.length)).catch(e=>console.error("[owned-import] login failed: "+e.message)),50);
  return authData;
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
const FREE_BADGES={
  dayz:{icon:"☣️",label:"DAYZ"},ark:{icon:"🦖",label:"ARK"},gaming:{icon:"🎮",label:"Gaming"},
  creator:{icon:"🎨",label:"Créateur"},helper:{icon:"🛟",label:"Helper"},event:{icon:"🎉",label:"Événement"},
  pve:{icon:"🛡️",label:"PVE"},pvp:{icon:"⚔️",label:"PVP"},viking:{icon:"🪓",label:"Viking"},star:{icon:"💎",label:"Star"}
};
function normalizeBadges(v){
  const arr=Array.isArray(v)?v:String(v||"").split(",");
  return [...new Set(arr.map(x=>String(x||"").trim()).filter(x=>FREE_BADGES[x]))].slice(0,10);
}
function normalizeDecoration(v){v=String(v||"none");return ["none","crown","viking","diamond","radioactive","dino","skull","stars","colosseum","crystal","fire","halo","flowers","neon"].includes(v)?v:"none"}
function normalizeEffect(v){v=String(v||"none");return ["none","stars","pulse","aurora","sparkle","zombie","ghostship","purplelightning","moonmist","shadow","apocalypse"].includes(v)?v:"none"}
function normalizeFrame(v){v=String(v||"none");return ["none","amethyst","cyanfire","pinkfire","solar","floral","royal","sunflower","pearls","darkvine","moonstars","frost","leopard","flame"].includes(v)?v:"none"}
function normalizeNameplate(v){v=String(v||"none");return ["none","urban","nebula","emerald","moon","heart","leopard","cosmic","flowers","midnight","halloween","aurora"].includes(v)?v:"none"}
function decorationEmoji(v){return ({crown:"👑",viking:"🪓",diamond:"💎",radioactive:"☢️",dino:"🦖",skull:"💀",stars:"✨",colosseum:"🏛️",crystal:"💠",fire:"🔥",halo:"🌟",flowers:"🌸",neon:"⚡"})[v]||""}
const NAMEPLATES={none:{label:"Aucune",icon:"⊘"},urban:{label:"Paysage urbain",icon:"🌆"},nebula:{label:"Nébuleuse",icon:"🌌"},emerald:{label:"Émeraude",icon:"💚"},moon:{label:"Clair de lune",icon:"🌙"},heart:{label:"Cœur noir",icon:"🖤"},leopard:{label:"Léopard",icon:"🐆"},cosmic:{label:"Cristaux cosmiques",icon:"✨"},flowers:{label:"Fleurs",icon:"🌼"},midnight:{label:"Minuit",icon:"🌃"},halloween:{label:"Halloween",icon:"🎃"},aurora:{label:"Aurore",icon:"🌈"}};
const PROFILE_FRAMES={none:{label:"Aucun",icon:"⊘"},amethyst:{label:"Cristaux (améthyste)",icon:"💜"},cyanfire:{label:"Flammes cyan",icon:"🩵"},pinkfire:{label:"Flammes roses",icon:"🩷"},solar:{label:"Solaire",icon:"☀️"},floral:{label:"Fleurs",icon:"🌸"},royal:{label:"Royal",icon:"👑"},sunflower:{label:"Tournesols",icon:"🌻"},pearls:{label:"Perles",icon:"🫧"},darkvine:{label:"Lianes sombres",icon:"🌿"},moonstars:{label:"Lune & étoiles",icon:"🌙"},frost:{label:"Givre",icon:"❄️"},leopard:{label:"Léopard",icon:"🐆"},flame:{label:"Flammes",icon:"🔥"}};
const PROFILE_EFFECTS={none:{label:"Aucun",icon:"⊘"},zombie:{label:"Apocalypse des zombies",icon:"🧟"},ghostship:{label:"Navire fantôme",icon:"🏴‍☠️"},purplelightning:{label:"Foudre violette",icon:"⚡"},moonmist:{label:"Brume lunaire",icon:"🌙"},shadow:{label:"Ombres",icon:"🌑"},apocalypse:{label:"Apocalypse",icon:"☣️"},stars:{label:"Étoiles",icon:"✨"},pulse:{label:"Pulsation",icon:"💫"},aurora:{label:"Aurore",icon:"🌈"},sparkle:{label:"Étincelle",icon:"💎"}};
function badgeHtml(id,label,icon,klass=""){return '<span class="profileBadge '+klass+'" title="'+escHtml(label)+'">'+icon+'<b>'+escHtml(label)+'</b></span>'}
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
    theme:saved.theme||"purple",
    pronouns:saved.pronouns||"",
    nameStyle:saved.name_style||"prism",
    badges:normalizeBadges(saved.badges||[]),
    avatarDecoration:normalizeDecoration(saved.avatar_decoration),
    profileEffect:normalizeEffect(saved.profile_effect),
    profileFrame:normalizeFrame(saved.profile_frame),
    nameplateStyle:normalizeNameplate(saved.nameplate_style),
    featuredTagGuildId:String(saved.featured_tag_guild_id||"")
  };
}
async function updateGlobalProfile(auth,input){
  const displayName=safeText(input.displayName||auth.user.displayName||auth.user.name,80);
  const bio=safeText(input.bio,500),status=safeText(input.status,80),pronouns=safeText(input.pronouns,60);
  const avatar=input.avatarDataUrl?safeAvatar(input.avatarDataUrl):(input.avatarUrl?safeText(input.avatarUrl,500):null);
  const banner=input.bannerDataUrl?safeBanner(input.bannerDataUrl):(input.bannerUrl?safeText(input.bannerUrl,500):null);
  const accentColor=/^#[0-9A-Fa-f]{6}$/.test(String(input.accentColor||""))?String(input.accentColor):"#9b4dff";
  const theme=["purple","midnight","dark","blue"].includes(String(input.theme||""))?String(input.theme):"purple";
  const nameStyle=["plain","journal","prism","glow"].includes(String(input.nameStyle||""))?String(input.nameStyle):"prism";
  const badges=normalizeBadges(input.badges),avatarDecoration=normalizeDecoration(input.avatarDecoration),profileEffect=normalizeEffect(input.profileEffect),profileFrame=normalizeFrame(input.profileFrame),nameplateStyle=normalizeNameplate(input.nameplateStyle);
  const featuredTagGuildId=safeText(input.featuredTagGuildId,80)||null;
  await pool.query(`INSERT INTO cmd_global_profiles(user_id,display_name,avatar_data_url,banner_data_url,bio,status,accent_color,theme,pronouns,name_style,badges,avatar_decoration,profile_effect,profile_frame,nameplate_style,featured_tag_guild_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16)
    ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,avatar_data_url=COALESCE(EXCLUDED.avatar_data_url,cmd_global_profiles.avatar_data_url),banner_data_url=COALESCE(EXCLUDED.banner_data_url,cmd_global_profiles.banner_data_url),bio=EXCLUDED.bio,status=EXCLUDED.status,accent_color=EXCLUDED.accent_color,theme=EXCLUDED.theme,pronouns=EXCLUDED.pronouns,name_style=EXCLUDED.name_style,badges=EXCLUDED.badges,avatar_decoration=EXCLUDED.avatar_decoration,profile_effect=EXCLUDED.profile_effect,profile_frame=EXCLUDED.profile_frame,nameplate_style=EXCLUDED.nameplate_style,featured_tag_guild_id=EXCLUDED.featured_tag_guild_id,updated_at=NOW()`,
    [String(auth.user.id),displayName,avatar,banner,bio,status,accentColor,theme,pronouns,nameStyle,JSON.stringify(badges),avatarDecoration,profileEffect,profileFrame,nameplateStyle,featuredTagGuildId]);
  return getGlobalProfile(auth);
}
function escHtml(v){return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}

async function getProfileExperience(auth,selectedGuildId){
  const guilds=await listNativeGuilds(auth);
  let selected=null,detail=null;
  if(selectedGuildId){
    selected=guilds.find(g=>String(g.id)===String(selectedGuildId))||null;
  }
  if(selected){
    detail=await nativeGuildDetail(auth,selected.id);
    const roleId=String(detail.member?.profile_role_id||"");
    detail.displayRole=(detail.roles||[]).find(r=>String(r.id)===roleId||String(r.source_role_id||"")===roleId)||null;
  }
  return {guilds,selected,detail};
}
function automaticBadges(auth,profile,d){
  const out=[{id:"cmd",icon:"🔷",label:"CMD Sphere"}];
  if(auth.user?.discordId)out.push({id:"linked",icon:"✅",label:"Discord lié"});
  if(profile.avatar&&profile.bio)out.push({id:"complete",icon:"🌟",label:"Profil complet"});
  const role=String(d?.member?.membership_role||"");
  if(role==="owner")out.push({id:"owner",icon:"👑",label:"Propriétaire"});
  else if(role==="admin")out.push({id:"admin",icon:"🛡️",label:"Administrateur"});
  if(d?.guild?.server_tag)out.push({id:"tag",icon:String(d.guild.server_tag_icon||"✦"),label:String(d.guild.server_tag)});
  return out;
}

function profilePage(auth,profile,experience={guilds:[],selected:null,detail:null}){
  const guilds=experience.guilds||[],d=experience.detail||null,g=d?.guild||null,m=d?.member||null;
  const selectedId=g?String(g.id):"",serverMode=Boolean(g);
  const accent=escHtml((serverMode&&m?.profile_accent_color)||profile.accentColor||"#5865f2");
  const avatar=escHtml((serverMode&&m?.profile_avatar_data_url)||profile.avatar||"/app-icon.webp?v=5");
  const banner=(serverMode&&m?.profile_banner_data_url)||profile.banner||"";
  const displayName=escHtml((serverMode&&m?.profile_display_name)||profile.displayName||profile.username||"CMD");
  const handle=escHtml(profile.username||"");
  const bio=escHtml((serverMode&&m?.profile_bio)||profile.bio||"");
  const status=escHtml((serverMode&&m?.profile_status)||profile.status||"");
  const pronouns=escHtml((serverMode&&m?.profile_pronouns)||profile.pronouns||"");
  const nameStyle=escHtml((serverMode&&m?.profile_name_style)||profile.nameStyle||"prism");
  const selectedBadges=normalizeBadges(serverMode?m?.profile_badges:profile.badges);
  const decoration=normalizeDecoration(serverMode?m?.avatar_decoration:profile.avatarDecoration);
  const effect=normalizeEffect(serverMode?m?.profile_effect:profile.profileEffect);
  const frame=normalizeFrame(serverMode?m?.profile_frame:profile.profileFrame);
  const nameplate=normalizeNameplate(serverMode?m?.nameplate_style:profile.nameplateStyle);
  const deco=decorationEmoji(decoration);
  const featuredGuild=serverMode?g:(guilds.find(x=>String(x.id)===String(profile.featuredTagGuildId||""))||null);
  const tag=featuredGuild?escHtml(featuredGuild.server_tag||""):"",tagIcon=featuredGuild?escHtml(featuredGuild.server_tag_icon||"✦"):"",tagStyle=featuredGuild?String(featuredGuild.server_tag_style||"prism"):"plain";
  const role=d?.displayRole||null,roleName=role?escHtml(role.name):"";
  const roleBase=role&&/^#?[0-9A-Fa-f]{6}$/.test(String(role.color||""))?(String(role.color).startsWith("#")?String(role.color):"#"+String(role.color)):"#8b5cf6";
  const roleStart=role&&/^#[0-9A-Fa-f]{6}$/.test(String(role.gradient_start||""))?String(role.gradient_start):roleBase;
  const roleEnd=role&&/^#[0-9A-Fa-f]{6}$/.test(String(role.gradient_end||""))?String(role.gradient_end):"#ec4899";
  const roleStyle=String(role?.visual_style||"solid"),roleIcon=escHtml(role?.role_icon||"");
  const bg=banner?("background-image:linear-gradient(180deg,rgba(18,18,22,.04),rgba(35,16,45,.25)),url('"+escHtml(banner)+"')"):"background:linear-gradient(135deg,#382044,#6a2b78 55%,#25142c)";
  const guildOptions=guilds.map(x=>'<option value="'+escHtml(x.id)+'" '+(String(x.id)===selectedId?'selected':'')+'>'+escHtml(x.name)+'</option>').join("");
  const roleOptions=(d?.roles||[]).map(r=>'<option value="'+escHtml(r.id)+'" '+(String(m?.profile_role_id||"")===String(r.id)||String(m?.profile_role_id||"")===String(r.source_role_id||"")?'selected':'')+'>'+escHtml(r.name)+'</option>').join("");
  const styleRoleOptions=(d?.roles||[]).map(r=>'<option value="'+escHtml(r.id)+'">'+escHtml(r.name)+'</option>').join("");
  const autoBadges=automaticBadges(auth,profile,d);
  const badgeBar=autoBadges.map(b=>badgeHtml(b.id,b.label,b.icon,"auto")).join("")+selectedBadges.map(id=>{const b=FREE_BADGES[id];return badgeHtml(id,b.label,b.icon,"free")}).join("");
  const badgeChoices=Object.entries(FREE_BADGES).map(([id,b])=>'<label class="badgeChoice"><input type="checkbox" data-badge value="'+id+'" '+(selectedBadges.includes(id)?"checked":"")+'><span>'+b.icon+' '+escHtml(b.label)+'</span></label>').join("");
  const connections=profile.socialLinks||{},connHtml=profileConnectionsHtml(connections);
  const isAdmin=serverMode&&["owner","admin"].includes(String(m?.membership_role||""));
  const isOwner=serverMode&&String(m?.membership_role||"")==="owner";
  const tagGuildRows=guilds.map(x=>'<button type="button" class="pickRow tagPick '+(String(profile.featuredTagGuildId||"")===String(x.id)?"selected":"")+'" data-value="'+escHtml(x.id)+'"><span class="roundIcon">'+escHtml((x.icon?"◎":"◉"))+'</span><span class="pickMain"><b>'+escHtml(x.name)+'</b><small>'+(x.server_tag?escHtml((x.server_tag_icon||"✦")+" "+x.server_tag):"Aucun tag configuré")+'</small></span><span class="radio"></span></button>').join("");
  const nameplateTiles=Object.entries(NAMEPLATES).map(([id,o])=>'<button type="button" class="visualTile nameplateTile '+(nameplate===id?"selected":"")+'" data-value="'+id+'"><span class="tileArt nameplate-'+id+'">'+o.icon+'</span><b>'+escHtml(o.label)+'</b><em>GRATUIT</em></button>').join("");
  const frameTiles=Object.entries(PROFILE_FRAMES).map(([id,o])=>'<button type="button" class="visualTile frameTile '+(frame===id?"selected":"")+'" data-value="'+id+'"><span class="frameThumb frame-'+id+'"><i></i>'+o.icon+'</span><b>'+escHtml(o.label)+'</b><em>GRATUIT</em></button>').join("");
  const effectTiles=Object.entries(PROFILE_EFFECTS).map(([id,o])=>'<button type="button" class="visualTile effectTile '+(effect===id?"selected":"")+'" data-value="'+id+'"><span class="tileArt effectThumb effect-'+id+'">'+o.icon+'</span><b>'+escHtml(o.label)+'</b><em>GRATUIT</em></button>').join("");
  const decoChoices=[["none","Aucune","⊘"],["colosseum","Avatar de colisée","🏛️"],["crystal","Cristaux","💠"],["fire","Flammes","🔥"],["halo","Halo","🌟"],["flowers","Fleurs","🌸"],["neon","Néon","⚡"],["viking","Viking","🪓"],["skull","Crâne","💀"],["radioactive","Radioactif","☢️"]].map(([id,l,ic])=>'<button type="button" class="visualTile decoTile '+(decoration===id?"selected":"")+'" data-value="'+id+'"><span class="avatarThumb deco-'+id+'">'+ic+'</span><b>'+escHtml(l)+'</b><em>GRATUIT</em></button>').join("");
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#1e1f22"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/app-icon.webp?v=5"><title>Profil · CMD Sphere</title><style>'+
  '*{box-sizing:border-box}body{margin:0;background:#111214;color:#f2f3f5;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial}.page{max-width:760px;margin:auto;min-height:100vh;background:#1e1f22}.topbar{position:sticky;top:0;z-index:6;background:#1e1f22f5;border-bottom:1px solid #ffffff10;backdrop-filter:blur(16px)}.titleRow{height:72px;display:flex;align-items:center;padding:14px 22px;gap:14px}.closeX{font-size:34px;color:#fff;text-decoration:none;line-height:1}.title{font-size:25px;font-weight:900}.tabs{display:grid;grid-template-columns:1fr 1fr;padding:0 22px}.tab{display:block;text-align:center;padding:14px 8px;color:#b5bac1;text-decoration:none;font-weight:850;border-bottom:3px solid transparent}.tab.active{color:#c7cbff;border-color:#7383ff}.serverPick{padding:16px 22px;border-bottom:1px solid #ffffff0d;background:#232428}.serverPick select{width:100%;border:1px solid #ffffff16;background:#1c1d20;color:#fff;border-radius:12px;padding:13px;font:inherit;font-weight:750}.hero{position:relative;background:#2b2d31;overflow:hidden;border-radius:0}.hero.effect-zombie:after{content:"☣️  🧟  ☣️";position:absolute;inset:auto 20px 120px auto;font-size:34px;filter:drop-shadow(0 0 15px #7cff00);animation:floatFx 2.5s ease-in-out infinite}.hero.effect-ghostship:after{content:"🏴‍☠️";position:absolute;right:30px;top:80px;font-size:72px;filter:drop-shadow(0 0 18px #00ff99)}.hero.effect-purplelightning:after{content:"⚡";position:absolute;right:20px;top:88px;font-size:86px;color:#a855f7;filter:drop-shadow(0 0 20px #a855f7)}.hero.effect-moonmist:after{content:"🌙";position:absolute;right:25px;top:75px;font-size:70px;filter:drop-shadow(0 0 18px #d8b4fe)}.hero.effect-shadow:after{content:"🌑";position:absolute;right:26px;top:84px;font-size:72px}.hero.effect-apocalypse:after{content:"☣";position:absolute;right:25px;top:82px;font-size:80px;color:#84cc16;text-shadow:0 0 25px #84cc16}.hero.effect-stars:after{content:"✦  ·  ✧  ·  ✦";position:absolute;right:22px;top:88px;font-size:31px;opacity:.65;animation:floatFx 3s ease-in-out infinite}.hero.effect-pulse{animation:pulseFx 3s ease-in-out infinite}.hero.effect-aurora:after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,#00e5ff22,#9b5cff2b,#ff4db822);background-size:200% 200%;animation:auroraFx 5s linear infinite;pointer-events:none}.hero.effect-sparkle:after{content:"✨";position:absolute;right:26px;top:105px;font-size:48px;filter:drop-shadow(0 0 10px #fff);animation:floatFx 2.2s ease-in-out infinite}@keyframes floatFx{50%{transform:translateY(-10px) rotate(6deg)}}@keyframes pulseFx{50%{filter:brightness(1.18)}}@keyframes auroraFx{50%{background-position:100% 50%}}.banner{height:245px;background-size:cover!important;background-position:center!important}.avatarWrap{height:82px;position:relative;background:'+accent+'}.avatar{position:absolute;left:28px;top:-70px;width:142px;height:142px;border-radius:50%;border:8px solid '+accent+';object-fit:cover;background:#111}.avatarDeco{position:absolute;left:121px;top:-69px;font-size:42px;filter:drop-shadow(0 4px 8px #0009);z-index:5;pointer-events:none}.avatarRing{position:absolute;left:20px;top:-78px;width:158px;height:158px;border-radius:50%;z-index:4;pointer-events:none;border:5px solid transparent;box-shadow:0 0 0 2px #ffffff0d}.avatarRing.deco-none{display:none}.avatarRing.deco-crystal{border-color:#67e8f9 #c084fc #818cf8 #22d3ee;box-shadow:0 0 18px #a855f7,0 0 34px #22d3ee55}.avatarRing.deco-fire{border-color:#fb7185 #f97316 #facc15 #ef4444;box-shadow:0 0 20px #f97316aa}.avatarRing.deco-halo{border-color:#fde68a;box-shadow:0 0 11px #fff7,0 0 24px #facc15aa}.avatarRing.deco-flowers{border-style:dashed;border-color:#f9a8d4 #fda4af #c4b5fd #f9a8d4;box-shadow:0 0 15px #f472b688}.avatarRing.deco-neon{border-color:#22d3ee #d946ef #22d3ee #d946ef;box-shadow:0 0 22px #d946efaa}.avatarRing.deco-viking{border-color:#a16207 #eab308 #92400e #f59e0b;box-shadow:0 0 10px #f59e0b88}.avatarRing.deco-skull{border-color:#d1d5db #4b5563 #d1d5db #4b5563;box-shadow:0 0 15px #fff5}.avatarRing.deco-radioactive{border-color:#a3e635 #22c55e #a3e635 #22c55e;box-shadow:0 0 20px #84cc16aa}.avatarRing.deco-colosseum{border-color:#d6b36a #8b6b34 #d6b36a #8b6b34;box-shadow:0 0 14px #d6b36a88}.statusDot{position:absolute;left:132px;top:35px;width:31px;height:31px;border-radius:50%;background:#23a55a;border:7px solid '+accent+'}.body{padding:18px 28px 28px;background:linear-gradient(180deg,'+accent+' 0,#30113b 48%,#201026 100%)}.profileFrame{position:absolute;inset:8px;border:5px solid transparent;border-radius:26px;pointer-events:none;z-index:3}.frame-amethyst{border-color:#c084fc;box-shadow:0 0 20px #a855f7,inset 0 0 18px #a855f755}.frame-cyanfire{border-color:#22d3ee;box-shadow:0 0 18px #06b6d4}.frame-pinkfire{border-color:#fb7185;box-shadow:0 0 18px #f43f5e}.frame-solar{border-color:#f59e0b;box-shadow:0 0 16px #fbbf24}.frame-floral{border-color:#f9a8d4;border-style:dotted}.frame-royal{border-color:#818cf8;box-shadow:inset 0 0 0 2px #fbbf24}.frame-sunflower{border-color:#facc15;border-style:dashed}.frame-pearls{border-color:#e9d5ff;box-shadow:0 0 14px #fff}.frame-darkvine{border-color:#355e3b;border-style:double}.frame-moonstars{border-color:#6366f1;box-shadow:0 0 15px #818cf8}.frame-frost{border-color:#bae6fd;box-shadow:0 0 16px #e0f2fe}.frame-leopard{border-color:#f59e0b;border-style:dotted}.frame-flame{border-color:#f97316;box-shadow:0 0 20px #ef4444}.nameLine{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.display{font-size:29px;font-weight:950;letter-spacing:-.02em}.name-prism{background:linear-gradient(90deg,#c7d2fe,#8b5cf6,#f472b6,#c7d2fe);background-size:250% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:nameFlow 4s linear infinite}.name-journal{font-family:Georgia,serif;letter-spacing:.02em;text-shadow:0 2px 0 #0008}.name-glow{text-shadow:0 0 9px #fff7,0 0 18px '+accent+'}@keyframes nameFlow{to{background-position:250% center}}.tag,.roleTag{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:#ffffff18;font-weight:850}.tag-prism{background:linear-gradient(90deg,#5865f2,#a855f7,#ec4899,#5865f2);background-size:220% auto;animation:nameFlow 4s linear infinite;box-shadow:inset 0 0 0 1px #ffffff24}.tag-glow{background:#4c1d95;box-shadow:0 0 14px #a855f7aa,inset 0 0 0 1px #ffffff22}.roleTag.role-gradient,.roleTag.role-prism{background:linear-gradient(90deg,'+roleStart+','+roleEnd+')}.roleTag.role-glow{box-shadow:0 0 14px '+roleBase+'88,inset 3px 0 '+roleBase+'}.handle{margin-top:7px;color:#e5dfea}.badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.profileBadge{display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border-radius:9px;background:#17181b99;border:1px solid #ffffff14;font-size:13px}.profileBadge b{font-size:12px}.profileBadge.auto{border-color:#a5b4fc55}.profileBadge.free{border-color:#f0abfc44}.nameplate{margin-top:13px;border-radius:12px;padding:10px 13px;font-weight:850;position:relative;overflow:hidden;border:1px solid #ffffff18}.nameplate-none{display:none}.nameplate-urban{background:linear-gradient(90deg,#26104c,#8b1a98,#2b0b60)}.nameplate-nebula{background:radial-gradient(circle at 25% 40%,#a855f7,#312e81 45%,#09090b)}.nameplate-emerald{background:linear-gradient(120deg,#064e3b,#10b981,#052e16)}.nameplate-moon{background:linear-gradient(120deg,#0f172a,#1d4ed8,#111827)}.nameplate-heart{background:linear-gradient(120deg,#111,#3f3f46)}.nameplate-leopard{background:repeating-linear-gradient(45deg,#c87516 0 9px,#111 9px 15px)}.nameplate-cosmic{background:linear-gradient(90deg,#7c3aed,#ec4899,#2563eb)}.nameplate-flowers{background:linear-gradient(90deg,#14532d,#fde68a,#166534)}.nameplate-midnight{background:linear-gradient(90deg,#020617,#312e81,#0f172a)}.nameplate-halloween{background:linear-gradient(90deg,#451a03,#f97316,#1c1917)}.nameplate-aurora{background:linear-gradient(90deg,#14b8a6,#8b5cf6,#ec4899)}.section{margin:20px 22px}.card{background:#2b2d31;border-radius:18px;padding:18px;border:1px solid #ffffff0c}.card h3{margin:0 0 14px}.bio{white-space:pre-wrap;line-height:1.5}.roles{display:flex;gap:7px;flex-wrap:wrap}.roleChip{padding:6px 9px;border-radius:999px;background:#1e1f22;border:1px solid #ffffff1f}.editBtn{width:100%;border:0;border-radius:12px;padding:14px 16px;background:#5865f2;color:#fff;font-size:17px;font-weight:900}.perks{display:grid;grid-template-columns:1fr 1fr;gap:9px}.perk{background:#1e1f22;border:1px solid #ffffff0c;border-radius:13px;padding:13px}.perk b,.perk small{display:block}.perk small{color:#b5bac1;margin-top:4px}.freeFlag{display:inline-flex;margin-top:8px;color:#86efac;font-size:12px;font-weight:900}.modal,.picker{display:none;position:fixed;inset:0;background:#000b;z-index:30;align-items:flex-end;justify-content:center}.modal.on,.picker.on{display:flex}.sheet,.pickerSheet{width:min(760px,100%);max-height:92vh;overflow:auto;background:#232428;border-radius:24px 24px 0 0;padding:22px}.grab{width:48px;height:5px;background:#ffffff24;border-radius:9px;margin:-8px auto 20px}.sheet h2,.pickerSheet h2{text-align:center;margin:0 0 18px;font-size:27px}.sheet h3{margin:22px 0 8px}.sheet label{display:grid;gap:7px;margin:14px 0;font-weight:800}.sheet input,.sheet textarea,.sheet select{width:100%;background:#1e1f22;border:1px solid #ffffff18;color:#fff;border-radius:11px;padding:13px;font:inherit}.sheet textarea{min-height:95px}.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.badgeGrid,.visualGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.badgeChoice{margin:0!important;display:block!important}.badgeChoice input{display:none}.badgeChoice span{display:block;padding:11px;border:1px solid #ffffff14;border-radius:11px;background:#1e1f22}.badgeChoice input:checked+span{border-color:#818cf8;background:#4f46e522}.save{width:100%;border:0;border-radius:12px;background:#5865f2;color:#fff;padding:15px;font-weight:900;font-size:17px}.cancel{width:100%;border:0;background:transparent;color:#ddd;padding:13px;font-weight:800}.serverAdmin{margin-top:14px;padding-top:14px;border-top:1px solid #ffffff12}.adminBtn{width:100%;border:1px solid #ffffff18;background:#1e1f22;color:#fff;border-radius:11px;padding:12px;font-weight:850}.pickButton{width:100%;display:flex;align-items:center;gap:12px;border:1px solid #ffffff18;background:#1e1f22;color:#fff;border-radius:12px;padding:12px;text-align:left}.pickButton .previewIcon{width:52px;height:52px;border-radius:10px;display:grid;place-items:center;background:#ffffff0c;font-size:26px}.pickButton strong,.pickButton small{display:block}.pickButton small{color:#b5bac1;margin-top:3px}.chev{margin-left:auto;font-size:28px;color:#b5bac1}.pickerHead{position:sticky;top:-22px;background:#232428;padding:10px 0 15px;z-index:3}.pickRow{width:100%;border:0;border-bottom:1px solid #ffffff10;background:transparent;color:#fff;padding:14px 8px;display:flex;align-items:center;gap:12px;text-align:left}.roundIcon{width:46px;height:46px;border-radius:14px;background:#ffffff0c;display:grid;place-items:center}.pickMain{flex:1;min-width:0}.pickMain b,.pickMain small{display:block}.pickMain small{color:#b5bac1;margin-top:4px}.radio{width:28px;height:28px;border:3px solid #71717a;border-radius:50%}.pickRow.selected .radio{border-color:#818cf8;box-shadow:inset 0 0 0 6px #232428;background:#818cf8}.visualTile{border:2px solid #ffffff12;background:#1e1f22;color:#fff;border-radius:14px;padding:8px;min-height:150px;text-align:center}.visualTile.selected{border-color:#5865f2}.visualTile b,.visualTile em{display:block}.visualTile b{font-size:13px;margin-top:7px}.visualTile em{font-size:10px;color:#86efac;font-style:normal;font-weight:900;margin-top:4px}.tileArt,.frameThumb,.avatarThumb{height:88px;border-radius:10px;display:grid;place-items:center;font-size:38px;background:#2b2d31;overflow:hidden}.frameThumb{border:4px solid #666}.frameThumb i{width:44px;height:44px;border-radius:50%;background:#404249;position:absolute}.frameThumb{position:relative}.frameThumb{font-size:24px}.frameThumb.frame-amethyst{border-color:#c084fc;box-shadow:0 0 12px #a855f7}.frameThumb.frame-cyanfire{border-color:#22d3ee}.frameThumb.frame-pinkfire{border-color:#fb7185}.frameThumb.frame-solar{border-color:#f59e0b}.frameThumb.frame-floral{border-color:#f9a8d4;border-style:dotted}.frameThumb.frame-royal{border-color:#818cf8}.frameThumb.frame-sunflower{border-color:#facc15;border-style:dashed}.frameThumb.frame-pearls{border-color:#e9d5ff}.frameThumb.frame-darkvine{border-color:#355e3b;border-style:double}.frameThumb.frame-moonstars{border-color:#6366f1}.frameThumb.frame-frost{border-color:#bae6fd}.frameThumb.frame-leopard{border-color:#f59e0b;border-style:dotted}.frameThumb.frame-flame{border-color:#f97316}.pickerPreview{height:260px;border-radius:18px;background:linear-gradient(145deg,#321048,#140b20);margin-bottom:20px;display:grid;place-items:center;position:relative;overflow:hidden}.pickerPreview .mockCard{width:72%;height:170px;border-radius:18px;background:#361243;border:1px solid #ffffff18;position:relative}.pickerPreview .mockAvatar{position:absolute;left:18px;top:18px;width:72px;height:72px;border-radius:50%;background:#111;border:5px solid #7c3aed;display:grid;place-items:center;font-size:32px}.pickerPreview .mockName{position:absolute;left:105px;top:32px;font-weight:900}.pickerPreview .mockLine{position:absolute;left:105px;top:63px;width:45%;height:12px;border-radius:9px;background:#ffffff28}.pickerPreview .mockPlate{position:absolute;left:18px;right:18px;bottom:18px;height:42px;border-radius:10px}.connWrap{margin-top:12px}.muted{color:#b5bac1}.connections{overflow:hidden;border-radius:12px;background:#1e1f22}.conn{display:flex;gap:12px;padding:12px;border-bottom:1px solid #ffffff0b}.conn:last-child{border-bottom:0}.connIcon{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#ffffff0b}.connMain{flex:1;min-width:0}.connMain b,.connMain span,.connMain a,.connMain small{display:block}.connMain a,.connMain span{color:#fff;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.connMain small{color:#aaa}@media(max-width:560px){.page{max-width:none}.titleRow{height:66px;padding:12px 16px}.tabs{padding:0 10px}.serverPick{padding:14px 16px}.banner{height:210px}.avatar{left:22px;width:126px;height:126px;top:-62px}.avatarDeco{left:108px;top:-60px}.avatarRing{left:14px;top:-70px;width:142px;height:142px}.statusDot{left:116px;top:34px}.body{padding:16px 22px 25px}.section{margin:16px}.display{font-size:25px}.row2{grid-template-columns:1fr}.badgeGrid,.visualGrid{grid-template-columns:repeat(2,1fr)}.sheet,.pickerSheet{padding:18px 18px calc(22px + env(safe-area-inset-bottom))}}</style></head><body><main class="page"><header class="topbar"><div class="titleRow"><a class="closeX" href="/dashboard">×</a><div class="title">Profil</div></div><nav class="tabs"><a class="tab '+(!serverMode?'active':'')+'" href="/profile">Profil principal</a><a class="tab '+(serverMode?'active':'')+'" href="'+(guilds[0]?'/profile?server='+encodeURIComponent(selectedId||guilds[0].id):'/profile')+'">Profils par serveur</a></nav></header>'+
  (guilds.length?'<div class="serverPick"><select id="serverSelect"><option value="">Profil principal</option>'+guildOptions+'</select></div>':'')+
  '<section class="hero effect-'+effect+'"><div class="profileFrame frame-'+frame+'"></div><div class="banner" style="'+bg+'"></div><div class="avatarWrap"><span class="avatarRing deco-'+decoration+'"></span><img class="avatar" src="'+avatar+'" alt="">'+(deco?'<span class="avatarDeco deco-'+decoration+'">'+deco+'</span>':'')+'<span class="statusDot"></span></div><div class="body"><div class="nameLine"><div class="display name-'+nameStyle+'">'+displayName+'</div>'+(tag?'<span class="tag tag-'+escHtml(tagStyle)+'">'+tagIcon+' '+tag+'</span>':'')+(roleName?'<span class="roleTag role-'+roleStyle+'">'+(roleIcon?roleIcon+' ':'')+roleName+'</span>':'')+'</div><div class="handle">'+handle+(pronouns?' · '+pronouns:'')+'</div><div class="badges">'+badgeBar+'</div>'+(nameplate!=="none"?'<div class="nameplate nameplate-'+nameplate+'">'+displayName+(tag?' · '+tagIcon+' '+tag:'')+'</div>':'')+'<div class="meta">'+(status?'<span class="mini">● '+status+'</span>':'')+(serverMode?'<span class="mini">🏠 '+escHtml(g.name)+'</span>':'')+'</div></div></section>'+
  '<section class="section"><button class="editBtn" id="editBtn">✎ Modifier ce profil</button></section>'+
  '<section class="section"><div class="card"><h3>À propos de moi</h3><div class="bio">'+(bio||'<span class="muted">Aucune bio.</span>')+'</div></div></section>'+
  (serverMode?'<section class="section"><div class="card"><h3>Rôles du serveur</h3><div class="roles">'+((d?.roles||[]).slice(0,18).map(r=>'<span class="roleChip">'+(r.role_icon?escHtml(r.role_icon)+' ':'')+escHtml(r.name)+'</span>').join("")||'<span class="muted">Aucun rôle.</span>')+'</div></div></section>':'')+
  '</main><div class="modal" id="modal"><form class="sheet" id="profileForm"><div class="grab"></div><h2>'+(serverMode?'Profil par serveur':'Profil principal')+'</h2><input type="hidden" name="guildId" value="'+selectedId+'"><input type="hidden" name="avatarDecoration" value="'+decoration+'"><input type="hidden" name="profileEffect" value="'+effect+'"><input type="hidden" name="profileFrame" value="'+frame+'"><input type="hidden" name="nameplateStyle" value="'+nameplate+'"><input type="hidden" name="featuredTagGuildId" value="'+escHtml(profile.featuredTagGuildId||"")+'"><label>'+(serverMode?'Pseudo de serveur':'Nom affiché')+'<input name="displayName" maxlength="80" value="'+displayName+'"></label><label>Pronoms<input name="pronouns" maxlength="60" value="'+pronouns+'" placeholder="Ex. il/lui, elle, iel"></label><label>Bio<textarea name="bio" maxlength="500">'+bio+'</textarea></label><label>Statut<input name="status" maxlength="80" value="'+status+'"></label><label>Style du nom<select name="nameStyle"><option value="prism" '+(nameStyle==="prism"?"selected":"")+'>Journal + Prisme animé</option><option value="journal" '+(nameStyle==="journal"?"selected":"")+'>Journal</option><option value="glow" '+(nameStyle==="glow"?"selected":"")+'>Lueur</option><option value="plain" '+(nameStyle==="plain"?"selected":"")+'>Classique</option></select></label>'+
  (serverMode?'<label>Rôle affiché<select name="roleId"><option value="">Aucun</option>'+roleOptions+'</select></label>':'')+
  '<h3>Badges gratuits</h3><div class="badgeGrid">'+badgeChoices+'</div>'+
  (!serverMode?'<h3>Tag de serveur</h3><button type="button" class="pickButton" data-open="tagPicker"><span class="previewIcon">'+(tagIcon||"🏷️")+'</span><span><strong>'+(tag?tag:"Aucun")+'</strong><small>Choisir parmi tes serveurs</small></span><span class="chev">›</span></button>':'')+
  '<h3>Décoration d’avatar</h3><button type="button" class="pickButton" data-open="decoPicker"><span class="previewIcon">'+(deco||"⊘")+'</span><span><strong>'+escHtml(decoration==="none"?"Aucune":decoration)+'</strong><small>Toutes gratuites</small></span><span class="chev">›</span></button>'+
  '<h3>Effet de profil</h3><button type="button" class="pickButton" data-open="effectPicker"><span class="previewIcon">'+(PROFILE_EFFECTS[effect]?.icon||"⊘")+'</span><span><strong>'+escHtml(PROFILE_EFFECTS[effect]?.label||"Aucun")+'</strong><small>Tous gratuits</small></span><span class="chev">›</span></button>'+
  '<h3>Cadre de profil</h3><button type="button" class="pickButton" data-open="framePicker"><span class="previewIcon">'+(PROFILE_FRAMES[frame]?.icon||"⊘")+'</span><span><strong>'+escHtml(PROFILE_FRAMES[frame]?.label||"Aucun")+'</strong><small>Tous gratuits</small></span><span class="chev">›</span></button>'+
  '<h3>Plaque nominative</h3><button type="button" class="pickButton" data-open="nameplatePicker"><span class="previewIcon">'+(NAMEPLATES[nameplate]?.icon||"⊘")+'</span><span><strong>'+escHtml(NAMEPLATES[nameplate]?.label||"Aucune")+'</strong><small>Toutes gratuites</small></span><span class="chev">›</span></button>'+
  '<div class="row2"><label>Avatar<input id="avatarFile" type="file" accept="image/png,image/jpeg,image/webp"></label><label>Bannière<input id="bannerFile" type="file" accept="image/png,image/jpeg,image/webp"></label></div><label>Couleur du profil<input name="accentColor" type="color" value="'+accent+'"></label>'+
  (isOwner?'<div class="serverAdmin"><h3>🏷️ Tag du serveur — propriétaire</h3><p class="muted">Crée le tag officiel de ton serveur. Les membres peuvent ensuite l’afficher sur leur profil CMD Sphere.</p><div class="row2"><label>Pack<select name="badgePack"><option value="star" '+(g.badge_pack==="star"?"selected":"")+'>💎 Star</option><option value="viking" '+(g.badge_pack==="viking"?"selected":"")+'>🪓 Viking</option><option value="heart" '+(g.badge_pack==="heart"?"selected":"")+'>💗 Heart</option><option value="goat" '+(g.badge_pack==="goat"?"selected":"")+'>🐐 GOAT</option><option value="radioactive" '+(g.badge_pack==="radioactive"?"selected":"")+'>☢️ Radioactif</option></select></label><label>Tag<input name="serverTag" maxlength="12" value="'+escHtml(g.server_tag||"")+'" placeholder="CMD"></label></div><div class="row2"><label>Icône personnalisée<input name="serverTagIcon" maxlength="8" value="'+escHtml(g.server_tag_icon||"✦")+'"></label><label>Style<select name="serverTagStyle"><option value="plain" '+(g.server_tag_style==="plain"?"selected":"")+'>Classique</option><option value="prism" '+(g.server_tag_style==="prism"?"selected":"")+'>Prisme</option><option value="glow" '+(g.server_tag_style==="glow"?"selected":"")+'>Lueur</option></select></label></div></div>':'')+
  (isAdmin?'<div class="serverAdmin"><h3>Styles de rôles améliorés — gratuits</h3><label>Rôle à styliser<select id="styleRoleId">'+styleRoleOptions+'</select></label><div class="row2"><label>Style<select id="roleVisualStyle"><option value="solid">Classique</option><option value="gradient">Dégradé</option><option value="glow">Lueur</option><option value="prism">Prisme</option></select></label><label>Icône<input id="roleIcon" maxlength="8" placeholder="✨"></label><label>Couleur 1<input id="roleGradientStart" type="color" value="#8b5cf6"></label><label>Couleur 2<input id="roleGradientEnd" type="color" value="#ec4899"></label></div><button class="adminBtn" type="button" id="saveRoleStyle">Appliquer le style au rôle</button></div>':'')+
  '<button class="save">Enregistrer</button><button type="button" class="cancel" id="cancelBtn">Annuler</button></form></div>'+
  (!serverMode?'<div class="picker" id="tagPicker"><div class="pickerSheet"><div class="grab"></div><div class="pickerHead"><h2>Change le tag de serveur</h2></div><button type="button" class="pickRow tagPick '+(!profile.featuredTagGuildId?"selected":"")+'" data-value=""><span class="roundIcon">⊘</span><span class="pickMain"><b>Aucun</b><small>Ne pas afficher de tag</small></span><span class="radio"></span></button>'+tagGuildRows+'<button class="cancel closePicker" type="button">Fermer</button></div></div>':'')+
  '<div class="picker" id="decoPicker"><div class="pickerSheet"><div class="grab"></div><div class="pickerHead"><h2>Changer la décoration d’avatar</h2></div><div class="pickerPreview"><div class="mockCard"><div class="mockAvatar">'+(deco||"🙂")+'</div><div class="mockName">'+displayName+'</div><div class="mockLine"></div></div></div><div class="visualGrid">'+decoChoices+'</div><button class="cancel closePicker" type="button">Fermer</button></div></div>'+
  '<div class="picker" id="effectPicker"><div class="pickerSheet"><div class="grab"></div><div class="pickerHead"><h2>Changer d’effet de profil</h2></div><div class="pickerPreview effect-'+effect+'"><div class="mockCard"><div class="mockAvatar">🙂</div><div class="mockName">'+displayName+'</div><div class="mockLine"></div></div></div><div class="visualGrid">'+effectTiles+'</div><button class="cancel closePicker" type="button">Fermer</button></div></div>'+
  '<div class="picker" id="framePicker"><div class="pickerSheet"><div class="grab"></div><div class="pickerHead"><h2>Changer de cadre de profil</h2></div><div class="pickerPreview"><div class="mockCard frame-'+frame+'"><div class="mockAvatar">🙂</div><div class="mockName">'+displayName+'</div><div class="mockLine"></div></div></div><div class="visualGrid">'+frameTiles+'</div><button class="cancel closePicker" type="button">Fermer</button></div></div>'+
  '<div class="picker" id="nameplatePicker"><div class="pickerSheet"><div class="grab"></div><div class="pickerHead"><h2>Changer la plaque nominative</h2></div><div class="pickerPreview"><div class="mockCard"><div class="mockAvatar">🙂</div><div class="mockName">'+displayName+'</div><div class="mockLine"></div><div class="mockPlate nameplate-'+nameplate+'"></div></div></div><div class="visualGrid">'+nameplateTiles+'</div><button class="cancel closePicker" type="button">Fermer</button></div></div>'+
  '<script>const modal=document.getElementById("modal"),form=document.getElementById("profileForm");const openPicker=id=>{document.getElementById(id)?.classList.add("on")},closePickers=()=>document.querySelectorAll(".picker.on").forEach(x=>x.classList.remove("on"));document.getElementById("editBtn").onclick=()=>modal.classList.add("on");document.getElementById("cancelBtn").onclick=()=>modal.classList.remove("on");document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openPicker(b.dataset.open));document.querySelectorAll(".closePicker").forEach(b=>b.onclick=closePickers);document.querySelectorAll(".picker").forEach(p=>p.addEventListener("click",e=>{if(e.target===p)closePickers()}));document.getElementById("serverSelect")?.addEventListener("change",e=>{location.href=e.target.value?"/profile?server="+encodeURIComponent(e.target.value):"/profile"});'+
  'function pick(cls,inputName){document.querySelectorAll(cls).forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(cls).forEach(x=>x.classList.remove("selected"));b.classList.add("selected");form.elements[inputName].value=b.dataset.value;closePickers()}))}pick(".decoTile","avatarDecoration");pick(".effectTile","profileEffect");pick(".frameTile","profileFrame");pick(".nameplateTile","nameplateStyle");pick(".tagPick","featuredTagGuildId");'+
  'async function imgData(id,kind){const file=document.getElementById(id)?.files?.[0];if(!file)return null;const im=await new Promise((r,j)=>{const u=URL.createObjectURL(file),x=new Image;x.onload=()=>{URL.revokeObjectURL(u);r(x)};x.onerror=()=>{URL.revokeObjectURL(u);j(new Error("Image invalide"))};x.src=u});const cap=kind==="banner"?1800:900;let w=im.naturalWidth,h=im.naturalHeight;if(Math.max(w,h)>cap){const k=cap/Math.max(w,h);w=Math.round(w*k);h=Math.round(h*k)}const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(im,0,0,w,h);let q=.9,out=c.toDataURL("image/webp",q),target=kind==="banner"?2200000:1000000;while(out.length>target&&q>.45){q-=.08;out=c.toDataURL("image/webp",q)}return out}'+
  'document.getElementById("saveRoleStyle")?.addEventListener("click",async()=>{try{const body={guildId:'+JSON.stringify(selectedId)+',roleId:document.getElementById("styleRoleId").value,visualStyle:document.getElementById("roleVisualStyle").value,roleIcon:document.getElementById("roleIcon").value,gradientStart:document.getElementById("roleGradientStart").value,gradientEnd:document.getElementById("roleGradientEnd").value};const r=await fetch("/api/native/role-style",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||"Erreur");alert("Style du rôle enregistré gratuitement.");location.reload()}catch(x){alert(x.message)}});'+
  'form.onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(form));b.badges=Array.from(form.querySelectorAll("[data-badge]:checked")).map(x=>x.value);try{b.avatarDataUrl=await imgData("avatarFile","avatar");b.bannerDataUrl=await imgData("bannerFile","banner");const server='+JSON.stringify(serverMode)+';let r=await fetch(server?"/api/native/profile":"/api/profile",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}),d=await r.json();if(!r.ok)throw new Error(d.error||"Erreur");if(server&&(b.serverTag!==undefined||b.serverTagIcon!==undefined)){r=await fetch("/api/native/server-style",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guildId:b.guildId,serverTag:b.serverTag,serverTagIcon:b.serverTagIcon,serverTagStyle:b.serverTagStyle,badgePack:b.badgePack})});d=await r.json();if(!r.ok)throw new Error(d.error||"Erreur tag")}location.reload()}catch(x){alert(x.message)}};if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});</script></body></html>';
}
function shopCatalog(){
  return [
    ...Object.entries(PROFILE_FRAMES).filter(([k])=>k!=="none").map(([key,v])=>({type:"frame",key,label:v.label,icon:v.icon,group:"Cadres de profil"})),
    ...Object.entries(PROFILE_EFFECTS).filter(([k])=>k!=="none").map(([key,v])=>({type:"effect",key,label:v.label,icon:v.icon,group:"Effets de profil"})),
    ...Object.entries(NAMEPLATES).filter(([k])=>k!=="none").map(([key,v])=>({type:"nameplate",key,label:v.label,icon:v.icon,group:"Plaques nominatives"})),
    ...[["colosseum","Avatar de colisée","🏛️"],["crystal","Cristaux","💠"],["fire","Flammes","🔥"],["halo","Halo","🌟"],["flowers","Fleurs","🌸"],["neon","Néon","⚡"],["viking","Viking","🪓"],["skull","Crâne","💀"],["radioactive","Radioactif","☢️"]].map(([key,label,icon])=>({type:"decoration",key,label,icon,group:"Décorations d’avatar"})),
    ...Object.entries(FREE_BADGES).map(([key,v])=>({type:"badge",key,label:v.label,icon:v.icon,group:"Badges"}))
  ];
}

async function installedShopItems(auth){
  const r=await pool.query("SELECT item_type,item_key FROM cmd_shop_installs WHERE user_id=$1 ORDER BY installed_at DESC",[String(auth.user.id)]);
  return new Set(r.rows.map(x=>x.item_type+":"+x.item_key));
}

async function installShopItem(auth,input){
  const type=String(input.type||""),key=String(input.key||"");
  const item=shopCatalog().find(x=>x.type===type&&x.key===key);
  if(!item)throw new Error("Élément de boutique inconnu.");
  const p=await getGlobalProfile(auth);
  const patch={displayName:p.displayName,bio:p.bio,status:p.status,pronouns:p.pronouns,accentColor:p.accentColor,theme:p.theme,nameStyle:p.nameStyle,badges:p.badges,avatarDecoration:p.avatarDecoration,profileEffect:p.profileEffect,profileFrame:p.profileFrame,nameplateStyle:p.nameplateStyle,featuredTagGuildId:p.featuredTagGuildId};
  if(type==="frame")patch.profileFrame=key;
  else if(type==="effect")patch.profileEffect=key;
  else if(type==="nameplate")patch.nameplateStyle=key;
  else if(type==="decoration")patch.avatarDecoration=key;
  else if(type==="badge")patch.badges=[...new Set([...(p.badges||[]),key])];
  await updateGlobalProfile(auth,patch);
  await pool.query("INSERT INTO cmd_shop_installs(user_id,item_type,item_key) VALUES($1,$2,$3) ON CONFLICT(user_id,item_type,item_key) DO UPDATE SET installed_at=NOW()",[String(auth.user.id),type,key]);
  return {ok:true,item};
}

function shopPreviewHtml(item){
  const key=escHtml(item.key),icon=escHtml(item.icon),label=escHtml(item.label);
  if(item.type==="frame")return '<div class="art"><div class="shop-card"><span class="shop-avatar"><img src="/app-icon.webp?v=5" alt=""></span><span class="shop-frame shop-frame-'+key+'"></span><span class="shop-name">Ton profil</span></div></div>';
  if(item.type==="effect")return '<div class="art"><div class="shop-card shop-effect"><span class="shop-avatar"><img src="/app-icon.webp?v=5" alt=""></span><span class="shop-name">Ton profil</span><span class="shop-fx">'+icon+'</span></div></div>';
  if(item.type==="nameplate")return '<div class="art"><div class="shop-card"><span class="shop-avatar small"><img src="/app-icon.webp?v=5" alt=""></span><span class="shop-name top">Ton profil</span><span class="shop-nameplate shop-nameplate-'+key+'">'+icon+' '+label+'</span></div></div>';
  if(item.type==="decoration")return '<div class="art"><div class="shop-deco-wrap"><span class="shop-avatar big"><img src="/app-icon.webp?v=5" alt=""></span><span class="shop-deco-ring shop-deco-'+key+'"></span><span class="shop-deco-icon">'+icon+'</span></div></div>';
  return '<div class="art"><span class="shop-badge">'+icon+' <b>'+label+'</b></span></div>';
}
function shopPage(auth,installed){
  const items=shopCatalog(),groups=[...new Set(items.map(x=>x.group))];
  const content=groups.map(group=>`<section><h2>${escHtml(group)}</h2><div class="grid">${items.filter(x=>x.group===group).map(x=>{
    const yes=installed.has(x.type+":"+x.key);
    return `<article class="item">${shopPreviewHtml(x)}<b>${escHtml(x.label)}</b><small>GRATUIT · aperçu à l’emplacement réel</small><button data-type="${escHtml(x.type)}" data-key="${escHtml(x.key)}">${yes?"Réinstaller":"Installer gratuitement"}</button></article>`;
  }).join("")}</div></section>`).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Boutique · CMD Sphere</title><style>
  *{box-sizing:border-box}body{margin:0;background:#111214;color:#fff;font-family:system-ui}.top{position:sticky;top:0;background:#1e1f22ee;padding:16px;display:flex;gap:12px;align-items:center;z-index:3}.top a{color:#fff;text-decoration:none;font-size:30px}.wrap{max-width:980px;margin:auto;padding:16px 16px 80px}.hero{background:linear-gradient(135deg,#4c1d95,#7e22ce,#1d4ed8);padding:22px;border-radius:20px}.hero h1{margin:0 0 8px}.hero p{margin:0}.free{display:inline-block;margin-top:12px;background:#052e16;color:#86efac;padding:7px 10px;border-radius:999px;font-weight:900}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.item{background:#232428;border:1px solid #ffffff12;border-radius:15px;padding:12px;display:grid;gap:8px}.art{height:150px;border-radius:12px;background:linear-gradient(145deg,#35183e,#16161a);display:grid;place-items:center;overflow:hidden;position:relative}.shop-card{width:90%;height:118px;border-radius:14px;background:linear-gradient(180deg,#2b2d31,#3a1746);position:relative;overflow:hidden;border:1px solid #ffffff14}.shop-avatar{position:absolute;left:14px;top:18px;width:54px;height:54px;border-radius:50%;overflow:hidden;border:4px solid #7c3aed;background:#111;z-index:2}.shop-avatar.small{width:46px;height:46px}.shop-avatar.big{width:76px;height:76px;left:50%;top:50%;transform:translate(-50%,-50%)}.shop-avatar img{width:100%;height:100%;object-fit:cover}.shop-name{position:absolute;left:78px;top:28px;font-size:14px;font-weight:900}.shop-name.top{left:70px;top:22px}.shop-frame{position:absolute;inset:6px;border:4px solid #c084fc;border-radius:13px;box-shadow:0 0 14px #a855f7aa}.shop-frame-cyanfire{border-color:#22d3ee;box-shadow:0 0 14px #22d3ee}.shop-frame-pinkfire{border-color:#fb7185;box-shadow:0 0 14px #fb7185}.shop-frame-solar,.shop-frame-sunflower,.shop-frame-leopard{border-color:#f59e0b}.shop-frame-frost,.shop-frame-pearls{border-color:#e0f2fe}.shop-frame-darkvine{border-color:#355e3b}.shop-frame-moonstars,.shop-frame-royal{border-color:#818cf8}.shop-frame-flame{border-color:#f97316;box-shadow:0 0 14px #ef4444}.shop-effect:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 75% 25%,#a855f755,transparent 42%),linear-gradient(135deg,#312e8133,#ec489933);animation:shopPulse 2.8s ease-in-out infinite}.shop-fx{position:absolute;right:16px;bottom:14px;font-size:42px;filter:drop-shadow(0 0 12px #fff6);animation:shopFloat 2.2s ease-in-out infinite}.shop-nameplate{position:absolute;left:12px;right:12px;bottom:10px;border-radius:9px;padding:8px 10px;background:linear-gradient(90deg,#4c1d95,#7c3aed,#db2777);font-size:12px;font-weight:900;text-align:left;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.shop-nameplate-emerald{background:linear-gradient(90deg,#064e3b,#10b981)}.shop-nameplate-moon,.shop-nameplate-midnight{background:linear-gradient(90deg,#0f172a,#312e81)}.shop-nameplate-halloween,.shop-nameplate-leopard{background:linear-gradient(90deg,#451a03,#f97316)}.shop-nameplate-aurora,.shop-nameplate-cosmic{background:linear-gradient(90deg,#14b8a6,#8b5cf6,#ec4899)}.shop-deco-wrap{width:130px;height:130px;position:relative}.shop-deco-ring{position:absolute;left:50%;top:50%;width:96px;height:96px;transform:translate(-50%,-50%);border-radius:50%;border:5px solid #a855f7;box-shadow:0 0 16px #a855f7aa;z-index:3}.shop-deco-fire{border-color:#f97316 #ef4444 #facc15 #fb7185;box-shadow:0 0 18px #f97316}.shop-deco-crystal,.shop-deco-neon{border-color:#22d3ee #c084fc #818cf8 #22d3ee;box-shadow:0 0 18px #a855f7}.shop-deco-halo{border-color:#fde68a;box-shadow:0 0 18px #facc15}.shop-deco-radioactive{border-color:#a3e635 #22c55e;box-shadow:0 0 18px #84cc16}.shop-deco-viking,.shop-deco-colosseum{border-color:#d6b36a #8b6b34}.shop-deco-skull{border-color:#d1d5db #4b5563}.shop-deco-flowers{border-color:#f9a8d4 #c4b5fd;border-style:dashed}.shop-deco-icon{position:absolute;right:8px;bottom:7px;font-size:28px;z-index:5}.shop-badge{display:inline-flex;align-items:center;gap:7px;border:1px solid #ffffff20;background:#17181bcc;border-radius:999px;padding:9px 12px;font-size:18px}.shop-badge b{font-size:12px}.item small{color:#86efac;font-weight:900}.item button{border:0;border-radius:10px;background:#5865f2;color:#fff;padding:11px;font-weight:900}.toast{display:none;position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111827;padding:12px 16px;border-radius:12px}.toast.on{display:block}@keyframes shopPulse{50%{filter:brightness(1.25)}}@keyframes shopFloat{50%{transform:translateY(-6px) rotate(5deg)}}@media(max-width:700px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:420px){.grid{grid-template-columns:1fr}}
  </style></head><body><div class="top"><a href="/dashboard">×</a><b>🛍️ Boutique CMD Sphere</b><a href="/profile" style="margin-left:auto;font-size:18px">Profil</a></div><main class="wrap"><div class="hero"><h1>Boutique CMD Sphere</h1><p>Comme une boutique de personnalisation : chaque carte te montre où l’élément apparaît réellement — autour de l’avatar, sur toute la carte, sous le nom ou autour du profil.</p><span class="free">✓ Tout est gratuit · Aucun paiement · Aucun boost</span></div>${content}</main><div id="toast" class="toast"></div><script>
  const toast=document.getElementById("toast");function say(t){toast.textContent=t;toast.classList.add("on");setTimeout(()=>toast.classList.remove("on"),1800)}
  document.querySelectorAll(".item button").forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await fetch("/api/shop/install",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:b.dataset.type,key:b.dataset.key})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Erreur");b.textContent="Installé ✓";say(d.item.label+" installé.")}catch(e){say(e.message)}finally{b.disabled=false}});
  </script></body></html>`;
}

async function getDmPreferences(auth){
  const r=await pool.query("SELECT allow_dms,allow_message_requests FROM cmd_user_preferences WHERE user_id=$1 LIMIT 1",[String(auth.user.id)]);
  return r.rows[0]||{allow_dms:true,allow_message_requests:true};
}

async function updateDmPreferences(auth,input){
  const d=input.allowDms!==false,q=input.allowMessageRequests!==false;
  await pool.query("INSERT INTO cmd_user_preferences(user_id,allow_dms,allow_message_requests) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET allow_dms=EXCLUDED.allow_dms,allow_message_requests=EXCLUDED.allow_message_requests,updated_at=NOW()",[String(auth.user.id),d,q]);
  return getDmPreferences(auth);
}

async function searchDmUsers(auth,q){
  q=safeText(q,80);if(!q)return [];
  const r=await pool.query("SELECT a.id,a.username,a.display_name,g.avatar_data_url FROM cmd_accounts a LEFT JOIN cmd_global_profiles g ON g.user_id=a.id::text WHERE a.id::text<>$1 AND (a.username_key LIKE $2 OR LOWER(COALESCE(a.display_name,'')) LIKE $2) ORDER BY a.username_key LIMIT 20",[String(auth.user.id),"%"+q.toLowerCase()+"%"]);
  return r.rows.map(x=>({id:String(x.id),username:x.username,displayName:x.display_name||x.username,avatar:x.avatar_data_url||null}));
}

async function findDmThread(auth,id){
  const r=await pool.query("SELECT * FROM cmd_dm_threads WHERE id=$1 AND (user_low=$2 OR user_high=$2) LIMIT 1",[String(id),String(auth.user.id)]);
  if(!r.rows[0])throw new Error("Conversation introuvable.");
  return r.rows[0];
}

async function startDmThread(auth,input){
  const key=normalizeUsername(input.username).key;
  const r=await pool.query("SELECT id,username,display_name FROM cmd_accounts WHERE username_key=$1 LIMIT 1",[key]);
  const target=r.rows[0];if(!target)throw new Error("Utilisateur introuvable.");
  const me=String(auth.user.id),other=String(target.id);if(me===other)throw new Error("Impossible de t’écrire à toi-même.");
  const p=await pool.query("SELECT allow_dms FROM cmd_user_preferences WHERE user_id=$1",[other]);
  if(p.rows[0]?.allow_dms===false)throw new Error("Cette personne n’accepte pas les messages privés.");
  const [low,high]=[me,other].sort(),id=crypto.randomUUID();
  const t=await pool.query("INSERT INTO cmd_dm_threads(id,user_low,user_high) VALUES($1,$2,$3) ON CONFLICT(user_low,user_high) DO UPDATE SET updated_at=NOW() RETURNING id",[id,low,high]);
  return {id:String(t.rows[0].id)};
}

async function listDmThreads(auth){
  const me=String(auth.user.id);
  const r=await pool.query(`SELECT t.id,t.updated_at,CASE WHEN t.user_low=$1 THEN t.user_high ELSE t.user_low END other_id,a.username,a.display_name,g.avatar_data_url,
    (SELECT body FROM cmd_dm_messages m WHERE m.thread_id=t.id ORDER BY m.created_at DESC LIMIT 1) last_message,
    (SELECT COUNT(*)::int FROM cmd_dm_messages m WHERE m.thread_id=t.id AND m.sender_user_id<>$1 AND m.read_at IS NULL) unread
    FROM cmd_dm_threads t
    LEFT JOIN cmd_accounts a ON a.id::text=(CASE WHEN t.user_low=$1 THEN t.user_high ELSE t.user_low END)
    LEFT JOIN cmd_global_profiles g ON g.user_id=a.id::text
    WHERE t.user_low=$1 OR t.user_high=$1 ORDER BY t.updated_at DESC LIMIT 100`,[me]);
  return r.rows.map(x=>({id:String(x.id),username:x.username||"utilisateur",displayName:x.display_name||x.username||"Utilisateur",avatar:x.avatar_data_url||null,lastMessage:x.last_message||"",unread:Number(x.unread||0)}));
}

async function getDmMessages(auth,id){
  const t=await findDmThread(auth,id),me=String(auth.user.id),other=t.user_low===me?t.user_high:t.user_low;
  await pool.query("UPDATE cmd_dm_messages SET read_at=NOW() WHERE thread_id=$1 AND sender_user_id<>$2 AND read_at IS NULL",[t.id,me]);
  const m=await pool.query("SELECT id,sender_user_id,body,created_at FROM cmd_dm_messages WHERE thread_id=$1 ORDER BY created_at ASC LIMIT 500",[t.id]);
  const u=await pool.query("SELECT username,display_name FROM cmd_accounts WHERE id::text=$1 LIMIT 1",[other]);
  return {threadId:String(t.id),other:{id:other,username:u.rows[0]?.username||"utilisateur",displayName:u.rows[0]?.display_name||u.rows[0]?.username||"Utilisateur"},messages:m.rows.map(x=>({id:String(x.id),senderUserId:String(x.sender_user_id),body:x.body,createdAt:x.created_at}))};
}

async function sendDmMessage(auth,input){
  const t=await findDmThread(auth,input.threadId),me=String(auth.user.id),other=t.user_low===me?t.user_high:t.user_low;
  const p=await pool.query("SELECT allow_dms FROM cmd_user_preferences WHERE user_id=$1",[other]);
  if(p.rows[0]?.allow_dms===false)throw new Error("Cette personne n’accepte pas les messages privés.");
  const body=safeText(input.body,4000);if(!body)throw new Error("Message vide.");
  const id=crypto.randomUUID();const r=await pool.query("INSERT INTO cmd_dm_messages(id,thread_id,sender_user_id,body) VALUES($1,$2,$3,$4) RETURNING created_at",[id,t.id,me,body]);
  await pool.query("UPDATE cmd_dm_threads SET updated_at=NOW() WHERE id=$1",[t.id]);
  return {id,body,createdAt:r.rows[0].created_at,senderUserId:me};
}

function messagesPage(auth,threads,prefs){
  const rows=threads.map(t=>`<button class="thread" data-id="${escHtml(t.id)}"><span class="av">${t.avatar?`<img src="${escHtml(t.avatar)}">`:"💬"}</span><span class="main"><b>${escHtml(t.displayName)}</b><small>${escHtml(t.lastMessage||"Nouvelle conversation")}</small></span>${t.unread?`<i>${t.unread}</i>`:""}</button>`).join("")||`<div class="empty">Aucune conversation.</div>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Messages · CMD Sphere</title><style>
  *{box-sizing:border-box}body{margin:0;background:linear-gradient(145deg,#341044,#5b176d,#281032);color:#fff;font-family:system-ui;height:100dvh;overflow:hidden}.app{display:grid;grid-template-columns:340px 1fr;height:100dvh}.side{background:#1e1f22e8;border-right:1px solid #ffffff12;display:flex;flex-direction:column}.head{padding:15px;border-bottom:1px solid #ffffff10}.bar{display:flex;align-items:center;gap:10px}.bar a{color:#fff;text-decoration:none}.search{display:flex;gap:8px;margin-top:10px}.search input{flex:1;background:#111214;border:1px solid #ffffff18;color:#fff;border-radius:10px;padding:10px}.search button{width:44px;border:0;border-radius:10px;background:#5865f2;color:#fff;font-size:22px}.results{display:none;background:#111214;border-radius:10px;margin-top:8px;overflow:hidden}.results.on{display:block}.result{display:block;width:100%;background:transparent;border:0;border-bottom:1px solid #ffffff10;color:#fff;text-align:left;padding:10px}.threads{overflow:auto;padding:8px}.thread{width:100%;display:flex;gap:10px;align-items:center;border:0;background:transparent;color:#fff;padding:10px;border-radius:11px;text-align:left}.thread:hover,.thread.active{background:#ffffff12}.av{width:44px;height:44px;border-radius:50%;background:#35373c;display:grid;place-items:center;overflow:hidden;flex:none}.av img{width:100%;height:100%;object-fit:cover}.main{min-width:0;flex:1}.main b,.main small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.main small{color:#b5bac1}.thread i{background:#ed4245;border-radius:999px;min-width:22px;height:22px;display:grid;place-items:center;font-style:normal;font-size:11px}.prefs{margin-top:auto;border-top:1px solid #ffffff10;padding:10px}.pref{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin:8px 0}.chat{display:flex;flex-direction:column;background:#211126aa}.chatHead{height:64px;padding:0 18px;display:flex;align-items:center;border-bottom:1px solid #ffffff10;font-weight:900}.msgs{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:9px}.bubble{max-width:80%;padding:10px 12px;border-radius:15px;background:#35373c;white-space:pre-wrap;word-break:break-word}.bubble.me{align-self:flex-end;background:#5865f2}.composer{display:flex;gap:8px;padding:12px}.composer input{flex:1;background:#383a40;border:0;color:#fff;border-radius:11px;padding:12px}.composer button{border:0;border-radius:11px;background:#5865f2;color:#fff;font-weight:900;padding:0 16px}.empty{padding:18px;color:#b5bac1}@media(max-width:720px){.app{grid-template-columns:1fr}.chat{display:none;position:fixed;inset:0;z-index:5}.app.open .side{display:none}.app.open .chat{display:flex}.chatHead{cursor:pointer}}
  </style></head><body><div class="app" id="app"><aside class="side"><div class="head"><div class="bar"><a href="/dashboard">✕</a><b style="font-size:24px">Messages</b><a href="/shop" style="margin-left:auto">🛍️</a></div><div class="search"><input id="q" placeholder="Rechercher un utilisateur"><button>＋</button></div><div id="results" class="results"></div></div><div id="threads" class="threads">${rows}</div><div class="prefs"><label class="pref">Messages privés <input id="allowDms" type="checkbox" ${prefs.allow_dms!==false?"checked":""}></label><label class="pref">Demandes de message <input id="allowReq" type="checkbox" ${prefs.allow_message_requests!==false?"checked":""}></label></div></aside><main class="chat"><div id="chatHead" class="chatHead">Conversation privée</div><div id="msgs" class="msgs"><div class="empty">Choisis une conversation.</div></div><form id="form" class="composer"><input id="msg" maxlength="4000" placeholder="Envoyer un message privé…" disabled><button id="send" disabled>Envoyer</button></form></main></div><script>
  const ME=${JSON.stringify(String(auth.user.id))},app=document.getElementById("app"),msgs=document.getElementById("msgs"),msg=document.getElementById("msg"),send=document.getElementById("send");let active=null;
  function e(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
  async function openThread(id){active=id;const r=await fetch("/api/dm/thread/"+encodeURIComponent(id)),d=await r.json();if(!r.ok){alert(d.error||"Erreur");return}document.getElementById("chatHead").textContent=d.other.displayName;msgs.innerHTML=d.messages.map(m=>'<div class="bubble '+(m.senderUserId===ME?"me":"")+'">'+e(m.body)+'</div>').join("")||'<div class="empty">Commence la conversation.</div>';msgs.scrollTop=msgs.scrollHeight;msg.disabled=false;send.disabled=false;app.classList.add("open")}
  document.querySelectorAll(".thread").forEach(b=>b.onclick=()=>openThread(b.dataset.id));document.getElementById("chatHead").onclick=()=>app.classList.remove("open");
  document.getElementById("form").onsubmit=async ev=>{ev.preventDefault();if(!active||!msg.value.trim())return;const body=msg.value;msg.value="";const r=await fetch("/api/dm/send",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({threadId:active,body})}),d=await r.json();if(!r.ok){alert(d.error||"Erreur");msg.value=body;return}openThread(active)};
  let timer;document.getElementById("q").oninput=ev=>{clearTimeout(timer);timer=setTimeout(async()=>{const q=ev.target.value.trim(),box=document.getElementById("results");if(!q){box.classList.remove("on");return}const r=await fetch("/api/dm/search?q="+encodeURIComponent(q)),d=await r.json();box.innerHTML=(d.users||[]).map(u=>'<button class="result" data-user="'+e(u.username)+'"><b>'+e(u.displayName)+'</b> · @'+e(u.username)+'</button>').join("")||'<div class="empty">Aucun utilisateur</div>';box.classList.add("on");box.querySelectorAll(".result").forEach(b=>b.onclick=async()=>{const rr=await fetch("/api/dm/start",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:b.dataset.user})}),dd=await rr.json();if(!rr.ok){alert(dd.error||"Erreur");return}location.href="/messages?open="+encodeURIComponent(dd.thread.id)})},250)};
  async function prefs(){await fetch("/api/dm/preferences",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({allowDms:document.getElementById("allowDms").checked,allowMessageRequests:document.getElementById("allowReq").checked})})}document.getElementById("allowDms").onchange=prefs;document.getElementById("allowReq").onchange=prefs;const o=new URLSearchParams(location.search).get("open");if(o)openThread(o);
  </script></body></html>`;
}

function serverAddPage(auth,publicGuilds=[]){
  const publicHtml=(publicGuilds||[]).map(g=>'<div class="serverCard"><div><b>'+escHtml(g.name||"Serveur")+'</b><small>'+Number(g.member_count||0)+' membre(s)</small></div><a class="btn" href="'+escHtml(g.inviteUrl||"#")+'">Rejoindre</a></div>').join("")||'<div class="empty">Aucun serveur public pour le moment.</div>';
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#1e1f22"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/app-icon.webp?v=5"><title>Ajouter un serveur · CMD Sphere</title><style>*{box-sizing:border-box}body{margin:0;background:#0d0b10;color:#fff;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial}.wrap{max-width:720px;margin:auto;padding:22px 16px 100px}.head{display:flex;align-items:center;gap:12px;margin-bottom:18px}.head a{color:#fff;text-decoration:none;font-size:28px}.head h1{font-size:24px;margin:0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{background:#1b1820;border:1px solid #ffffff12;border-radius:18px;padding:16px}.card h2{margin-top:0}.muted{color:#aaa2b0}.btn{display:inline-flex;justify-content:center;align-items:center;text-decoration:none;border:0;border-radius:10px;background:#5865f2;color:#fff;padding:11px 14px;font-weight:900;cursor:pointer}.btn.gray{background:#3b3d44}.wide{width:100%}input{width:100%;background:#0f0d12;color:#fff;border:1px solid #ffffff18;border-radius:10px;padding:12px;font:inherit;margin:7px 0 12px}.check{display:flex;gap:8px;align-items:center;margin:8px 0 14px}.check input{width:auto;margin:0}.serverCard{display:flex;align-items:center;gap:12px;justify-content:space-between;border:1px solid #ffffff10;background:#ffffff07;border-radius:12px;padding:12px;margin:8px 0}.serverCard b,.serverCard small{display:block}.serverCard small{color:#aaa2b0;margin-top:4px}.empty{padding:16px;color:#aaa2b0}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><main class="wrap"><div class="head"><a href="/dashboard">←</a><h1>Ajouter un serveur</h1></div><div class="grid"><section class="card"><h2>＋ Créer un serveur</h2><p class="muted">Crée un nouvel espace CMD Sphere.</p><form method="post" action="/servers/create"><input name="name" required maxlength="100" placeholder="Nom du serveur"><label class="check"><input type="checkbox" name="isPublic" value="1"> Visible dans Découvrir</label><button class="btn wide" type="submit">Créer le serveur</button></form></section><section class="card"><h2>🔗 Rejoindre</h2><p class="muted">Utilise un lien ou un code d’invitation CMD Sphere.</p><form method="post" action="/servers/join"><input name="invite" required maxlength="400" placeholder="Lien ou code d’invitation"><button class="btn wide" type="submit">Rejoindre</button></form></section><section class="card"><h2>⬇ Importer Discord</h2><p class="muted">Récupère tous les Discord gérables de ton compte, puis les synchronise.</p><a class="btn wide" href="/dashboard-login?link=1&next=/dashboard?sync=1">Synchroniser mon Discord</a><form method="post" action="/servers/import" style="margin-top:10px"><button class="btn gray wide" type="submit">Forcer l’import maintenant</button></form></section><section class="card"><h2>◎ Découvrir</h2><p class="muted">Serveurs CMD Sphere publics.</p>'+publicHtml+'</section></div></main></body></html>';
}
function serverFormError(message){
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#0d0b10;color:#fff;font-family:system-ui;padding:30px"><h1>CMD Sphere</h1><p>'+escHtml(message)+'</p><a style="color:#9ea7ff" href="/servers/add">← Retour</a></body>';
}
function nativeGuildPage(auth,d){
  const g=d.guild||{},name=escHtml(g.name||"Serveur CMD Sphere"),icon=String(g.icon||"");
  const cats=(d.channels||[]).filter(x=>x.type==="category"),chs=(d.channels||[]).filter(x=>x.type!=="category");
  const channels=cats.map(cat=>'<div class="block"><h3>📁 '+escHtml(cat.name)+'</h3>'+chs.filter(x=>String(x.source_parent_id||"")===String(cat.source_channel_id||cat.id)).map(x=>'<div class="item">'+(x.type==="voice"?"🔊":"#")+' '+escHtml(x.name)+'</div>').join("")+'</div>').join("")+
    chs.filter(x=>!x.source_parent_id).map(x=>'<div class="item">'+(x.type==="voice"?"🔊":"#")+' '+escHtml(x.name)+'</div>').join("");
  const roles=(d.roles||[]).map(r=>'<div class="item">● '+escHtml(r.name)+'</div>').join("");
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#12051f"><link rel="manifest" href="/manifest.webmanifest"><title>'+name+' · CMD Sphere</title><style>*{box-sizing:border-box}body{margin:0;background:#08060c;color:#fff;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial}.top{position:sticky;top:0;display:flex;align-items:center;gap:12px;padding:14px 16px;background:#17101ddd;border-bottom:1px solid #ffffff12;backdrop-filter:blur(12px)}.top a{color:#fff;text-decoration:none;font-size:25px}.top img,.fallback{width:46px;height:46px;border-radius:14px;object-fit:cover;background:#2c2035;display:grid;place-items:center;font-weight:900}.top h1{font-size:20px;margin:0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wrap{max-width:760px;margin:auto;padding:18px}.hero{border:1px solid #ffffff12;background:linear-gradient(135deg,#2b1237,#160c1e);border-radius:20px;padding:20px}.hero h2{margin:0 0 8px}.muted{color:#aaa2b0}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.btn{display:inline-flex;text-decoration:none;border:1px solid #ffffff16;background:#ffffff0d;color:#fff;border-radius:11px;padding:11px 13px;font-weight:800}.primary{background:#5865f2;border:0}.section{margin-top:18px}.block,.item{border:1px solid #ffffff10;background:#ffffff07;border-radius:12px;padding:11px 12px;margin:7px 0}.block h3{margin:0 0 8px;font-size:15px}.block .item{margin:5px 0;background:#0f0a13}.empty{padding:16px;color:#aaa2b0;border:1px dashed #ffffff18;border-radius:12px}</style></head><body><div class="top"><a href="/dashboard">←</a>'+(icon?'<img src="'+escHtml(icon)+'" alt="">':'<div class="fallback">'+escHtml(String(g.name||"?").slice(0,2).toUpperCase())+'</div>')+'<h1>'+name+'</h1></div><main class="wrap"><section class="hero"><h2>'+name+'</h2><div class="muted">'+Number(g.member_count||1)+' membre(s) · CMD Sphere'+(g.source_discord_id?' · importé depuis Discord':'')+'</div><div class="actions"><button class="btn primary" onclick="navigator.clipboard?.writeText('+JSON.stringify(d.inviteUrl||"")+')">Copier invitation</button><a class="btn" href="/profile?server='+encodeURIComponent(String(g.id||""))+'">Profil du serveur</a><a class="btn" href="/dashboard">Tous les serveurs</a></div></section><section class="section"><h2>Catégories & salons</h2>'+(channels||'<div class="empty">La structure Discord n’est pas encore synchronisée.</div>')+'</section><section class="section"><h2>Rôles</h2>'+(roles||'<div class="empty">Aucun rôle synchronisé.</div>')+'</section></main></body></html>';
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
async function requireNativeOwner(auth,guildId){
  const m=await requireNativeMember(auth,guildId);if(String(m.membership_role)!=="owner")throw new Error("Seul le propriétaire du serveur peut modifier son tag.");return m;
}
async function linkedDiscordGuilds(auth){
  let guilds=Array.isArray(auth.guilds)?auth.guilds:[];
  if(guilds.length&&guilds.some(g=>g&&("owner" in g)))return guilds;
  try{
    const r=await pool.query("SELECT guilds FROM cmd_account_identities WHERE account_id=$1 AND provider='discord' LIMIT 1",[String(auth.user.id)]);
    if(Array.isArray(r.rows[0]?.guilds))guilds=r.rows[0].guilds;
  }catch{}
  return guilds;
}
function discordGuildIcon(g){
  const icon=String(g?.icon||"");
  if(!icon)return null;
  if(/^https?:\/\//i.test(icon))return icon;
  const id=String(g?.id||"");
  return /^\d{15,22}$/.test(id)?("https://cdn.discordapp.com/icons/"+id+"/"+icon+".webp?size=128"):null;
}
async function allManagedGuilds(auth){
  const installed=await installedEverywhere(auth);
  const byId=new Map(installed.guilds.map(g=>[String(g.id),g]));
  const metas=await linkedDiscordGuilds(auth),metaById=new Map(metas.map(g=>[String(g.id),g]));
  const guilds=auth.guildIds.map(id=>{
    const meta=metaById.get(String(id))||{id:String(id),name:String(id),icon:null},hit=byId.get(String(id));
    return {id:String(id),name:hit?.name||meta.name||String(id),icon:hit?.icon||discordGuildIcon(meta),owner:Boolean(meta.owner),memberCount:hit?.memberCount??null,availableBots:hit?.availableBots||[],installed:Boolean(hit)};
  }).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
  return {guilds,errors:installed.errors||[]};
}


async function getServerLayout(auth){
  const r=await pool.query('SELECT item_key,position FROM cmd_server_layout WHERE user_id=$1 ORDER BY position ASC,updated_at ASC',[String(auth.user.id)]);
  return r.rows.map(x=>String(x.item_key));
}
async function saveServerLayout(auth,input){
  const raw=[...new Set((Array.isArray(input.itemKeys)?input.itemKeys:[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,400),userId=String(auth.user.id);
  const folders=await pool.query('SELECT id FROM cmd_server_folders WHERE user_id=$1',[userId]),ownedFolders=new Set(folders.rows.map(x=>'folder:'+String(x.id)));
  const servers=raw.filter(x=>!x.startsWith('folder:'));await validateFolderServerKeys(auth,servers);
  for(const k of raw)if(k.startsWith('folder:')&&!ownedFolders.has(k))throw new Error('Dossier non autorisé.');
  await pool.query('DELETE FROM cmd_server_layout WHERE user_id=$1',[userId]);
  for(let i=0;i<raw.length;i++)await pool.query('INSERT INTO cmd_server_layout(user_id,item_key,position) VALUES($1,$2,$3)',[userId,raw[i],i]);
  return {ok:true,itemKeys:raw};
}

async function getServerFolders(auth){
  const userId=String(auth.user.id);
  const [fr,ir]=await Promise.all([
    pool.query('SELECT id,name,color,position,collapsed FROM cmd_server_folders WHERE user_id=$1 ORDER BY position ASC,created_at ASC',[userId]),
    pool.query('SELECT folder_id,server_key,position FROM cmd_server_folder_items WHERE user_id=$1 ORDER BY position ASC',[userId])
  ]);
  const by=new Map();
  for(const row of ir.rows){
    const k=String(row.folder_id);const arr=by.get(k)||[];arr.push(String(row.server_key));by.set(k,arr);
  }
  return fr.rows.map(f=>({id:String(f.id),name:f.name,color:f.color||'#5865F2',position:Number(f.position||0),collapsed:Boolean(f.collapsed),serverKeys:by.get(String(f.id))||[]}));
}
async function validateFolderServerKeys(auth,keys){
  const clean=[...new Set((Array.isArray(keys)?keys:[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,200);
  const userId=String(auth.user.id);
  for(const key of clean){
    if(key.startsWith('native:')){
      const id=key.slice(7);
      if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Serveur CMD invalide.');
      const r=await pool.query('SELECT 1 FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 LIMIT 1',[id,userId]);
      if(!r.rows[0])throw new Error("Un serveur sélectionné n'appartient pas à ton compte.");
    }else if(key.startsWith('discord:')){
      const id=key.slice(8);
      if(!/^\d{15,22}$/.test(id)||!auth.guildIds.map(String).includes(id))throw new Error("Un Discord sélectionné n'est pas autorisé.");
    }else throw new Error('Type de serveur invalide.');
  }
  return clean;
}
async function saveServerFolder(auth,input){
  const userId=String(auth.user.id),name=safeText(input.name,60);
  if(!name)throw new Error('Nom du dossier requis.');
  const color=/^#[0-9A-Fa-f]{6}$/.test(String(input.color||''))?String(input.color).toUpperCase():'#5865F2';
  const keys=await validateFolderServerKeys(auth,input.serverKeys);
  let id=String(input.id||'');
  if(id){
    const own=await pool.query('SELECT 1 FROM cmd_server_folders WHERE id=$1 AND user_id=$2 LIMIT 1',[id,userId]);
    if(!own.rows[0])throw new Error('Dossier introuvable.');
    await pool.query('UPDATE cmd_server_folders SET name=$3,color=$4,updated_at=NOW() WHERE id=$1 AND user_id=$2',[id,userId,name,color]);
  }else{
    id=crypto.randomUUID();
    const pr=await pool.query('SELECT COALESCE(MAX(position),-1)+1 AS p FROM cmd_server_folders WHERE user_id=$1',[userId]);
    await pool.query('INSERT INTO cmd_server_folders(id,user_id,name,color,position) VALUES($1,$2,$3,$4,$5)',[id,userId,name,color,Number(pr.rows[0]?.p||0)]);
  }
  await pool.query('DELETE FROM cmd_server_folder_items WHERE folder_id=$1 AND user_id=$2',[id,userId]);
  if(keys.length){
    await pool.query('DELETE FROM cmd_server_folder_items WHERE user_id=$1 AND server_key=ANY($2::text[])',[userId,keys]);
    for(let i=0;i<keys.length;i++)await pool.query('INSERT INTO cmd_server_folder_items(folder_id,user_id,server_key,position) VALUES($1,$2,$3,$4)',[id,userId,keys[i],i]);
  }
  return {folder:(await getServerFolders(auth)).find(x=>x.id===id)};
}
async function deleteServerFolder(auth,id){
  const r=await pool.query('DELETE FROM cmd_server_folders WHERE id=$1 AND user_id=$2 RETURNING id',[String(id),String(auth.user.id)]);
  if(!r.rows[0])throw new Error('Dossier introuvable.');
  return {ok:true};
}
async function setServerFolderCollapsed(auth,id,collapsed){
  const r=await pool.query('UPDATE cmd_server_folders SET collapsed=$3,updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING id,collapsed',[String(id),String(auth.user.id),Boolean(collapsed)]);
  if(!r.rows[0])throw new Error('Dossier introuvable.');
  return {id:String(r.rows[0].id),collapsed:Boolean(r.rows[0].collapsed)};
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
async function importDiscordShell(auth,meta){
  const sourceId=String(meta.id||"");if(!/^\d{15,22}$/.test(sourceId))throw new Error("Discord invalide.");
  const name=safeText(meta.name||("Discord "+sourceId),100),icon=discordGuildIcon(meta);
  const existing=await pool.query('SELECT id,invite_code FROM cmd_native_guilds WHERE owner_user_id=$1 AND source_discord_id=$2 LIMIT 1',[String(auth.user.id),sourceId]);
  const nativeId=existing.rows[0]?.id||crypto.randomUUID(),inviteCode=existing.rows[0]?.invite_code||crypto.randomBytes(8).toString("base64url");
  await pool.query(`INSERT INTO cmd_native_guilds(id,owner_user_id,source_discord_id,name,icon,invite_code)
    VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(owner_user_id,source_discord_id) DO UPDATE SET name=EXCLUDED.name,icon=EXCLUDED.icon,updated_at=NOW()`,
    [nativeId,String(auth.user.id),sourceId,name,icon,inviteCode]);
  await pool.query('INSERT INTO cmd_native_members(guild_id,user_id,membership_role,profile_display_name) VALUES($1,$2,$3,$4) ON CONFLICT(guild_id,user_id) DO UPDATE SET membership_role=EXCLUDED.membership_role',[nativeId,String(auth.user.id),'owner',safeText(auth.user.displayName||auth.user.name,80)]);
  return {id:nativeId,name,icon,sourceDiscordId:sourceId,full:false,inviteUrl:baseUrl+"/invite/"+inviteCode};
}
async function importOwnedDiscordGuilds(auth){
  const metas=(await linkedDiscordGuilds(auth)).filter(g=>/^\d{15,22}$/.test(String(g.id||"")));
  const installed=await installedEverywhere(auth),installedById=new Map(installed.guilds.map(g=>[String(g.id),g]));
  const imported=[],failed=[];
  for(const meta of metas){
    const id=String(meta.id||"");
    try{
      const hit=installedById.get(id);
      if(hit){
        const full=await syncNativeFromDiscord({...auth,guilds:metas},id,hit.availableBots?.[0]?.id);
        imported.push({...full,full:true,owner:Boolean(meta.owner)});
      }else{
        imported.push({...await importDiscordShell(auth,meta),owner:Boolean(meta.owner)});
      }
    }catch(e){failed.push({id,name:String(meta.name||id),error:e.message})}
  }
  return {ownedCount:metas.filter(g=>Boolean(g.owner)).length,manageableCount:metas.length,imported,failed};
}
async function backfillOwnedDiscordGuilds(){
  const r=await pool.query(`SELECT a.*,i.provider_user_id,i.profile,i.guilds
    FROM cmd_accounts a JOIN cmd_account_identities i ON i.account_id=a.id
    WHERE i.provider='discord'`);
  for(const row of r.rows){
    try{
      const auth=authFromAccount(row,{provider_user_id:row.provider_user_id,profile:row.profile,guilds:row.guilds});
      const out=await importOwnedDiscordGuilds(auth);
      console.log("[owned-import] account="+row.id+" manageable="+(out.manageableCount||0)+" owner="+out.ownedCount+" imported="+out.imported.length+" failed="+out.failed.length);
    }catch(e){console.error("[owned-import] "+row.id+" failed: "+e.message)}
  }
}

async function nativeTextChannel(auth,guildId,channelId){
  await requireNativeMember(auth,guildId);
  const r=await pool.query('SELECT * FROM cmd_native_channels WHERE guild_id=$1 AND (id::text=$2 OR source_channel_id=$2) LIMIT 1',[String(guildId),String(channelId||"")]);
  const ch=r.rows[0];if(!ch)throw new Error("Salon CMD introuvable.");
  if(!["text","announcement","forum"].includes(String(ch.type)))throw new Error("Ce salon n'accepte pas les messages texte.");
  return ch;
}
async function nativeChannelMessages(auth,guildId,channelId,{before,limit=100}={}){
  const ch=await nativeTextChannel(auth,guildId,channelId),n=Math.max(1,Math.min(100,Number(limit)||100));
  let rows;
  if(before&&/^[0-9a-f-]{36}$/i.test(String(before))){
    const b=await pool.query('SELECT created_at FROM cmd_native_channel_messages WHERE id=$1 AND channel_id=$2 LIMIT 1',[String(before),ch.id]);
    const cutoff=b.rows[0]?.created_at;
    rows=cutoff
      ? await pool.query(`SELECT m.*,COALESCE(mem.profile_display_name,gp.display_name,a.display_name,a.username,'Utilisateur') AS author_name,
          COALESCE(mem.profile_avatar_data_url,gp.avatar_data_url) AS author_avatar,
          rm.body AS reply_body,COALESCE(rmem.profile_display_name,rgp.display_name,ra.display_name,ra.username,'Utilisateur') AS reply_author
        FROM cmd_native_channel_messages m
        LEFT JOIN cmd_native_members mem ON mem.guild_id=m.guild_id AND mem.user_id=m.sender_user_id
        LEFT JOIN cmd_global_profiles gp ON gp.user_id=m.sender_user_id
        LEFT JOIN cmd_accounts a ON a.id::text=m.sender_user_id
        LEFT JOIN cmd_native_channel_messages rm ON rm.id=m.reply_to
        LEFT JOIN cmd_native_members rmem ON rmem.guild_id=m.guild_id AND rmem.user_id=rm.sender_user_id
        LEFT JOIN cmd_global_profiles rgp ON rgp.user_id=rm.sender_user_id
        LEFT JOIN cmd_accounts ra ON ra.id::text=rm.sender_user_id
        WHERE m.channel_id=$1 AND m.created_at<$3 ORDER BY m.created_at DESC LIMIT $2`,[ch.id,n,cutoff])
      : {rows:[]};
  }else{
    rows=await pool.query(`SELECT m.*,COALESCE(mem.profile_display_name,gp.display_name,a.display_name,a.username,'Utilisateur') AS author_name,
        COALESCE(mem.profile_avatar_data_url,gp.avatar_data_url) AS author_avatar,
        rm.body AS reply_body,COALESCE(rmem.profile_display_name,rgp.display_name,ra.display_name,ra.username,'Utilisateur') AS reply_author
      FROM cmd_native_channel_messages m
      LEFT JOIN cmd_native_members mem ON mem.guild_id=m.guild_id AND mem.user_id=m.sender_user_id
      LEFT JOIN cmd_global_profiles gp ON gp.user_id=m.sender_user_id
      LEFT JOIN cmd_accounts a ON a.id::text=m.sender_user_id
      LEFT JOIN cmd_native_channel_messages rm ON rm.id=m.reply_to
      LEFT JOIN cmd_native_members rmem ON rmem.guild_id=m.guild_id AND rmem.user_id=rm.sender_user_id
      LEFT JOIN cmd_global_profiles rgp ON rgp.user_id=rm.sender_user_id
      LEFT JOIN cmd_accounts ra ON ra.id::text=rm.sender_user_id
      WHERE m.channel_id=$1 ORDER BY m.created_at DESC LIMIT $2`,[ch.id,n]);
  }
  const messages=(rows.rows||[]).map(row=>({
    id:String(row.id),channelId:String(ch.id),guildId:String(guildId),content:String(row.body||""),timestamp:row.created_at,editedTimestamp:row.edited_at,
    author:{id:String(row.sender_user_id),username:String(row.author_name||"Utilisateur"),avatar:row.author_avatar||null,bot:false},
    attachments:[],embeds:[],stickers:[],reactions:[],mentions:[],mentionRoles:[],pinned:false,tts:false,type:0,
    referencedMessage:row.reply_to?{id:String(row.reply_to),content:String(row.reply_body||""),author:{username:String(row.reply_author||"Utilisateur")}}:null
  }));
  return {mode:"native",channel:{id:String(ch.id),name:ch.name,type:ch.type,topic:ch.topic||null},messages,hasMore:messages.length===n,nextBefore:messages.length?messages[messages.length-1].id:null};
}
async function sendNativeChannelMessage(auth,input){
  const guildId=String(input.guildId||""),ch=await nativeTextChannel(auth,guildId,input.channelId),body=String(input.content||"").trim().slice(0,4000);
  if(!body)throw new Error("Message vide.");
  let replyTo=null;
  if(input.replyTo&&/^[0-9a-f-]{36}$/i.test(String(input.replyTo))){
    const r=await pool.query('SELECT id FROM cmd_native_channel_messages WHERE id=$1 AND channel_id=$2 LIMIT 1',[String(input.replyTo),ch.id]);
    if(r.rows[0])replyTo=r.rows[0].id;
  }
  const id=crypto.randomUUID();
  await pool.query('INSERT INTO cmd_native_channel_messages(id,guild_id,channel_id,sender_user_id,body,reply_to) VALUES($1,$2,$3,$4,$5,$6)',[id,guildId,ch.id,String(auth.user.id),body,replyTo]);
  const r=await pool.query(`SELECT m.*,COALESCE(mem.profile_display_name,gp.display_name,a.display_name,a.username,'Utilisateur') AS author_name,
      COALESCE(mem.profile_avatar_data_url,gp.avatar_data_url) AS author_avatar
    FROM cmd_native_channel_messages m
    LEFT JOIN cmd_native_members mem ON mem.guild_id=m.guild_id AND mem.user_id=m.sender_user_id
    LEFT JOIN cmd_global_profiles gp ON gp.user_id=m.sender_user_id
    LEFT JOIN cmd_accounts a ON a.id::text=m.sender_user_id
    WHERE m.id=$1 LIMIT 1`,[id]);
  const row=r.rows[0];
  return {ok:true,mode:"native",message:{id:String(row.id),channelId:String(ch.id),guildId,content:String(row.body||""),timestamp:row.created_at,author:{id:String(row.sender_user_id),username:String(row.author_name||"Utilisateur"),avatar:row.author_avatar||null,bot:false},attachments:[],embeds:[],stickers:[],reactions:[]}};
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
async function nativeSourceId(guildId,kind,id){
  const table=kind==="role"?"cmd_native_roles":"cmd_native_channels";
  const source=kind==="role"?"source_role_id":"source_channel_id";
  const r=await pool.query(`SELECT id::text AS id,${source} AS source FROM ${table} WHERE guild_id=$1 AND (id::text=$2 OR ${source}=$2) LIMIT 1`,[String(guildId),String(id||"")]);
  if(!r.rows[0])return String(id||"");
  return String(r.rows[0].source||r.rows[0].id);
}
async function syncNativeGuildById(auth,nativeGuildId){
  await requireNativeAdmin(auth,nativeGuildId);
  const r=await pool.query('SELECT source_discord_id FROM cmd_native_guilds WHERE id=$1 LIMIT 1',[String(nativeGuildId)]);
  const sourceId=String(r.rows[0]?.source_discord_id||"");
  if(!/^\d{15,22}$/.test(sourceId))throw new Error("Ce serveur n'est pas relié à un Discord.");
  const bot=await resolveBot(auth,sourceId);
  return syncNativeFromDiscord(auth,sourceId,bot);
}
async function applyNativeLocalAction(auth,input){
  const gid=String(input.nativeGuildId||"");await requireNativeAdmin(auth,gid);
  const action=String(input.action||"");
  if(action==="create_category"){
    const name=safeText(input.name,100);if(!name)throw new Error("Nom requis.");
    const id=crypto.randomUUID(),pos=Number(input.position||0);
    await pool.query('INSERT INTO cmd_native_channels(id,guild_id,source_channel_id,name,type,position) VALUES($1,$2,$3,$4,$5,$6)',[id,gid,id,name,'category',pos]);
  }else if(action==="create_channel"){
    const name=safeText(input.name,100);if(!name)throw new Error("Nom requis.");
    const type=["text","voice","announcement","forum"].includes(String(input.type))?String(input.type):"text";
    const id=crypto.randomUUID();let parent=null;
    if(input.parentId)parent=await nativeSourceId(gid,"channel",input.parentId);
    await pool.query('INSERT INTO cmd_native_channels(id,guild_id,source_channel_id,source_parent_id,name,type,topic,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,gid,id,parent,name,type,safeText(input.topic,1024)||null,Number(input.position||0)]);
  }else if(action==="update_channel"){
    const id=String(input.channelId||"");if(!id)throw new Error("Salon requis.");
    const row=await pool.query('SELECT * FROM cmd_native_channels WHERE guild_id=$1 AND (id::text=$2 OR source_channel_id=$2) LIMIT 1',[gid,id]);if(!row.rows[0])throw new Error("Salon introuvable.");
    let parent=row.rows[0].source_parent_id;
    if("parentId" in input)parent=input.parentId?await nativeSourceId(gid,"channel",input.parentId):null;
    await pool.query('UPDATE cmd_native_channels SET name=$3,type=$4,topic=$5,position=$6,source_parent_id=$7 WHERE guild_id=$1 AND id=$2',[gid,row.rows[0].id,safeText(input.name||row.rows[0].name,100),["text","voice","announcement","forum","category"].includes(String(input.type))?String(input.type):row.rows[0].type,safeText(input.topic??row.rows[0].topic,1024)||null,Number(input.position??row.rows[0].position??0),parent]);
  }else if(action==="delete_channel"){
    const id=String(input.channelId||"");const row=await pool.query('SELECT * FROM cmd_native_channels WHERE guild_id=$1 AND (id::text=$2 OR source_channel_id=$2) LIMIT 1',[gid,id]);if(!row.rows[0])throw new Error("Salon introuvable.");
    const parentKey=String(row.rows[0].source_channel_id||row.rows[0].id);
    if(row.rows[0].type==="category")await pool.query('DELETE FROM cmd_native_channels WHERE guild_id=$1 AND source_parent_id=$2',[gid,parentKey]);
    await pool.query('DELETE FROM cmd_native_channels WHERE guild_id=$1 AND id=$2',[gid,row.rows[0].id]);
  }else if(action==="create_role"){
    const name=safeText(input.name,100);if(!name)throw new Error("Nom requis.");const id=crypto.randomUUID();
    await pool.query('INSERT INTO cmd_native_roles(id,guild_id,source_role_id,name,color,permissions,position,hoist,mentionable) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)',[id,gid,id,name,safeText(input.color,20)||null,JSON.stringify(input.permissions||{}),Number(input.position||0),Boolean(input.hoist),Boolean(input.mentionable)]);
  }else if(action==="update_role"){
    const id=String(input.roleId||"");const row=await pool.query('SELECT * FROM cmd_native_roles WHERE guild_id=$1 AND (id::text=$2 OR source_role_id=$2) LIMIT 1',[gid,id]);if(!row.rows[0])throw new Error("Rôle introuvable.");
    await pool.query('UPDATE cmd_native_roles SET name=$3,color=$4,permissions=$5::jsonb,position=$6,hoist=$7,mentionable=$8 WHERE guild_id=$1 AND id=$2',[gid,row.rows[0].id,safeText(input.name||row.rows[0].name,100),safeText(input.color||row.rows[0].color,20)||null,JSON.stringify(input.permissions||row.rows[0].permissions||{}),Number(input.position??row.rows[0].position??0),input.hoist==null?Boolean(row.rows[0].hoist):Boolean(input.hoist),input.mentionable==null?Boolean(row.rows[0].mentionable):Boolean(input.mentionable)]);
  }else if(action==="delete_role"){
    const id=String(input.roleId||"");await pool.query('DELETE FROM cmd_native_roles WHERE guild_id=$1 AND (id::text=$2 OR source_role_id=$2)',[gid,id]);
  }else if(action==="set_channel_permissions"){
    const id=String(input.channelId||"");const perms=Array.isArray(input.permissionOverwrites)?input.permissionOverwrites:[];
    await pool.query('UPDATE cmd_native_channels SET permission_overwrites=$3::jsonb WHERE guild_id=$1 AND (id::text=$2 OR source_channel_id=$2)',[gid,id,JSON.stringify(perms)]);
  }else throw new Error("Action non autorisée.");
  await pool.query('UPDATE cmd_native_guilds SET updated_at=NOW() WHERE id=$1',[gid]);
  return {ok:true,synced:false};
}
async function applyNativeStructureAction(auth,input){
  const gid=String(input.nativeGuildId||"");await requireNativeAdmin(auth,gid);
  const g=await pool.query('SELECT source_discord_id FROM cmd_native_guilds WHERE id=$1 LIMIT 1',[gid]);if(!g.rows[0])throw new Error("Serveur CMD introuvable.");
  const sourceId=String(g.rows[0].source_discord_id||"");
  if(/^\d{15,22}$/.test(sourceId)){
    try{
      const bot=await resolveBot(auth,sourceId,input.bot||undefined),remote={...input,guildId:sourceId};
      delete remote.nativeGuildId;
      if(remote.channelId)remote.channelId=await nativeSourceId(gid,"channel",remote.channelId);
      if(remote.parentId)remote.parentId=await nativeSourceId(gid,"channel",remote.parentId);
      if(remote.roleId)remote.roleId=await nativeSourceId(gid,"role",remote.roleId);
      await backend(bot,"action",{body:remote});
      await syncNativeFromDiscord(auth,sourceId,bot);
      return {ok:true,synced:true,bot,botName:bots[bot].label};
    }catch(e){
      const local=await applyNativeLocalAction(auth,input);
      return {...local,warning:"Discord non synchronisé : "+e.message};
    }
  }
  return applyNativeLocalAction(auth,input);
}
async function updateNativeProfile(auth,input){
  const guildId=String(input.guildId||"");await requireNativeMember(auth,guildId);
  const displayName=safeText(input.displayName||auth.user.displayName||auth.user.name,80),bio=safeText(input.bio,500),status=safeText(input.status,80),pronouns=safeText(input.pronouns,60);
  const avatar=input.avatarDataUrl?safeAvatar(input.avatarDataUrl):null,banner=input.bannerDataUrl?safeBanner(input.bannerDataUrl):null;
  const accent=/^#[0-9A-Fa-f]{6}$/.test(String(input.accentColor||""))?String(input.accentColor):"#5865f2";
  const theme=["purple","midnight","dark","blue"].includes(String(input.theme||""))?String(input.theme):"purple";
  const nameStyle=["plain","journal","prism","glow"].includes(String(input.nameStyle||""))?String(input.nameStyle):"prism";
  const badges=normalizeBadges(input.badges),avatarDecoration=normalizeDecoration(input.avatarDecoration),profileEffect=normalizeEffect(input.profileEffect),profileFrame=normalizeFrame(input.profileFrame),nameplateStyle=normalizeNameplate(input.nameplateStyle);
  let roleId=safeText(input.roleId,100)||null;
  if(roleId){
    const rr=await pool.query('SELECT id FROM cmd_native_roles WHERE guild_id=$1 AND (id::text=$2 OR source_role_id=$2) LIMIT 1',[guildId,roleId]);
    roleId=rr.rows[0]?.id?String(rr.rows[0].id):null;
  }
  const r=await pool.query(`UPDATE cmd_native_members SET profile_display_name=$3,profile_avatar_data_url=COALESCE($4,profile_avatar_data_url),profile_banner_data_url=COALESCE($5,profile_banner_data_url),profile_bio=$6,profile_status=$7,profile_accent_color=$8,profile_theme=$9,profile_pronouns=$10,profile_name_style=$11,profile_role_id=$12,profile_badges=$13::jsonb,avatar_decoration=$14,profile_effect=$15,profile_frame=$16,nameplate_style=$17
    WHERE guild_id=$1 AND user_id=$2 RETURNING membership_role,profile_display_name,profile_avatar_data_url,profile_banner_data_url,profile_bio,profile_status,profile_accent_color,profile_theme,profile_pronouns,profile_name_style,profile_role_id,profile_badges,avatar_decoration,profile_effect,profile_frame,nameplate_style`,
    [guildId,String(auth.user.id),displayName,avatar,banner,bio,status,accent,theme,pronouns,nameStyle,roleId,JSON.stringify(badges),avatarDecoration,profileEffect,profileFrame,nameplateStyle]);
  return r.rows[0];
}
async function updateNativeServerStyle(auth,input){
  const guildId=String(input.guildId||"");await requireNativeOwner(auth,guildId);
  const tag=safeText(input.serverTag,12).replace(/[\r\n]/g,"");
  const packs={star:"💎",viking:"🪓",heart:"💗",goat:"🐐",radioactive:"☢️"};
  const pack=Object.hasOwn(packs,String(input.badgePack||""))?String(input.badgePack):"star";
  const icon=safeText(input.serverTagIcon,8)||packs[pack]||"✦";
  const style=["plain","prism","glow"].includes(String(input.serverTagStyle||""))?String(input.serverTagStyle):"prism";
  const r=await pool.query('UPDATE cmd_native_guilds SET server_tag=$2,server_tag_icon=$3,server_tag_style=$4,badge_pack=$5,updated_at=NOW() WHERE id=$1 RETURNING id,name,server_tag,server_tag_icon,server_tag_style,badge_pack',[guildId,tag||null,icon,style,pack]);
  if(!r.rows[0])throw new Error("Serveur CMD introuvable.");
  return r.rows[0];
}
async function updateNativeRoleStyle(auth,input){
  const guildId=String(input.guildId||"");await requireNativeAdmin(auth,guildId);
  const roleId=String(input.roleId||"");if(!roleId)throw new Error("Rôle requis.");
  const visualStyle=["solid","gradient","glow","prism"].includes(String(input.visualStyle||""))?String(input.visualStyle):"solid";
  const a=/^#[0-9A-Fa-f]{6}$/.test(String(input.gradientStart||""))?String(input.gradientStart):"#8b5cf6";
  const b=/^#[0-9A-Fa-f]{6}$/.test(String(input.gradientEnd||""))?String(input.gradientEnd):"#ec4899";
  const icon=safeText(input.roleIcon,8)||null;
  const r=await pool.query('UPDATE cmd_native_roles SET visual_style=$3,gradient_start=$4,gradient_end=$5,role_icon=$6 WHERE guild_id=$1 AND (id::text=$2 OR source_role_id=$2) RETURNING id,name,visual_style,gradient_start,gradient_end,role_icon',[guildId,roleId,visualStyle,a,b,icon]);
  if(!r.rows[0])throw new Error("Rôle introuvable.");
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

async function backend(bot,kind,{guildId,channelId,before,limit,body}={}){
  const cfg=bots[bot];if(!cfg)throw new Error("Bot inconnu");
  let url=cfg.base;
  if(bot==="extinction"){
    if(kind==="guilds")url+="?op=guilds";
    else if(kind==="structure")url+="?op=structure&guildId="+encodeURIComponent(guildId);
    else if(kind==="messages"){url+="?op=messages&guildId="+encodeURIComponent(guildId)+"&channelId="+encodeURIComponent(channelId)+"&limit="+encodeURIComponent(limit||100);if(before)url+="&before="+encodeURIComponent(before)}
    else if(kind==="webhooks")url+="?op=webhooks&guildId="+encodeURIComponent(guildId);
    else if(kind==="extras")url+="?op=extras&guildId="+encodeURIComponent(guildId);
    else if(kind==="invite")url+="?op=invite";
  }else{
    if(kind==="guilds")url+="/guilds";
    else if(kind==="structure")url+="/structure?guildId="+encodeURIComponent(guildId);
    else if(kind==="messages"){url+="/messages?guildId="+encodeURIComponent(guildId)+"&channelId="+encodeURIComponent(channelId)+"&limit="+encodeURIComponent(limit||100);if(before)url+="&before="+encodeURIComponent(before)}
    else if(kind==="webhooks")url+="/webhooks?guildId="+encodeURIComponent(guildId);
    else if(kind==="extras")url+="/extras?guildId="+encodeURIComponent(guildId);
    else if(kind==="invite")url+="/invite";
    else if(kind==="action")url+="/action";
  }
  let lastError=null;
  for(let attempt=0;attempt<4;attempt++){
    const method=kind==="action"?"POST":"GET";
    const res=await fetch(url,{method,headers:{"x-cmd-mcp-secret":backendSecret,"content-type":"application/json"},body:kind==="action"?JSON.stringify(body||{}):undefined,signal:AbortSignal.timeout(kind==="messages"?30000:20000),cache:"no-store"});
    const data=await res.json().catch(()=>({error:"Réponse backend invalide"}));
    if(res.ok)return data;
    const msg=String(data.error||("HTTP "+res.status));lastError=new Error(cfg.label+" : "+msg);
    const retryable=res.status===429||res.status>=500||/rate limit|too many requests|temporaire/i.test(msg);
    if(!retryable||attempt===3)throw lastError;
    await new Promise(r=>setTimeout(r,Math.min(7000,900*(attempt+1))));
  }
  throw lastError||new Error(cfg.label+" indisponible");
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



function genericBotInviteUrl(clientId,permissions="0"){
  const id=String(clientId||"").trim();
  if(!/^\d{15,22}$/.test(id))throw new Error("Application / Client ID Discord invalide.");
  const p=/^\d{1,20}$/.test(String(permissions||"0"))?String(permissions):"0";
  const q=new URLSearchParams({client_id:id,permissions:p,integration_type:"0",scope:"bot applications.commands"});
  return "https://discord.com/oauth2/authorize?"+q.toString();
}
async function knownBotInvites(){
  const out=[],errors=[];
  for(const id of Object.keys(bots)){
    try{const r=await backend(id,"invite");if(r?.url)out.push({id,name:bots[id].label,clientId:String(r.clientId||""),url:String(r.url)})}
    catch(e){errors.push({id,name:bots[id].label,error:e.message})}
  }
  return {bots:out,errors};
}
async function dashboardBots(auth,guildId=""){
  const allowed=new Set(auth.guildIds.map(String)),targets=guildId?[String(guildId)]:[...allowed];
  if(guildId)requireGuild(auth,guildId);
  const installed=await installedEverywhere(auth),guildMap=new Map((installed.guilds||[]).map(g=>[String(g.id),g]));
  const results=[],errors=[];
  for(const gid of targets){
    const meta=authGuildMeta(auth,gid),g=guildMap.get(gid);
    if(!g){results.push({guildId:gid,guildName:meta.name,bots:[],integrations:[],availableBots:[]});continue}
    const mergedBots=new Map(),mergedIntegrations=new Map(),used=[];
    for(const via of g.availableBots||[]){
      try{
        const ex=await backend(via.id,"extras",{guildId:gid});used.push(via.id);
        for(const b of ex.bots||[]){
          const id=String(b.id||"");if(!id)continue;
          const prev=mergedBots.get(id)||{};
          mergedBots.set(id,{...prev,...b,id,seenVia:[...new Set([...(prev.seenVia||[]),via.id])],inviteUrl:genericBotInviteUrl(id)});
        }
        for(const it of ex.integrations||[]){
          const key=String(it.id||it.application?.id||it.user?.id||crypto.randomUUID()),prev=mergedIntegrations.get(key)||{};
          mergedIntegrations.set(key,{...prev,...it,id:String(it.id||key),seenVia:[...new Set([...(prev.seenVia||[]),via.id])]});
        }
      }catch(e){errors.push({guildId:gid,guildName:g.name,bot:via.id,error:e.message})}
    }
    results.push({guildId:gid,guildName:g.name||meta.name,guildIcon:g.icon||meta.icon||null,bots:[...mergedBots.values()].sort((a,b)=>String(a.username||a.name||"").localeCompare(String(b.username||b.name||""),"fr")),integrations:[...mergedIntegrations.values()],availableBots:g.availableBots||[],seenVia:used});
  }
  return {guilds:results,totalBots:results.reduce((n,g)=>n+g.bots.length,0),totalIntegrations:results.reduce((n,g)=>n+g.integrations.length,0),errors};
}

async function dashboardSendMessage(auth,raw){
  const guildId=String(raw.guildId||"");requireGuild(auth,guildId);
  const all=await installedEverywhere(auth);
  const guild=all.guilds.find(g=>String(g.id)===guildId);
  if(!guild)throw new Error("Aucun bot CMD n'est installé sur ce Discord.");
  const available=(guild.availableBots||[]).map(x=>x.id);
  const order=[...new Set([raw.bot,...available].filter(Boolean))];
  const errors=[];
  for(const bot of order){
    try{
      const rows=await backend(bot,"guilds");
      if(!Array.isArray(rows)||!rows.some(g=>String(g.id)===guildId))continue;
      const out=await backend(bot,"action",{body:{...raw,bot:undefined}});
      return {bot,botName:bots[bot].label,...out};
    }catch(e){
      errors.push({bot,botName:bots[bot]?.label||bot,error:String(e.message||e)});
    }
  }
  const detail=errors.map(x=>x.botName+" : "+x.error).join(" · ");
  throw new Error("Impossible d'envoyer dans ce salon avec les bots CMD disponibles. "+(detail||"Vérifie Voir le salon + Envoyer des messages pour au moins un bot."));
}

async function dashboardWebhooks(auth,guildId,preferred){
  requireGuild(auth,guildId);
  const all=await installedEverywhere(auth);
  const guild=all.guilds.find(g=>String(g.id)===String(guildId));
  if(!guild)throw new Error("Aucun bot CMD n'est installé sur ce Discord.");
  const available=(guild.availableBots||[]).map(x=>x.id);
  const order=[...new Set([preferred,...available].filter(Boolean))];
  const merged=new Map(),errors=[];let structure=null,used=[];
  for(const bot of order){
    try{
      const [wh,st]=await Promise.all([backend(bot,"webhooks",{guildId}),structure?Promise.resolve(null):backend(bot,"structure",{guildId}).catch(()=>null)]);
      if(st&&!structure)structure=st;
      used.push(bot);
      for(const w of wh.webhooks||[]){
        const id=String(w.id||'');if(!id)continue;
        const prev=merged.get(id)||{};
        merged.set(id,{...prev,...w,id,seenVia:[...new Set([...(prev.seenVia||[]),bot])]});
      }
    }catch(e){errors.push({bot,botName:bots[bot]?.label||bot,error:e.message})}
  }
  if(!used.length)throw new Error(errors.map(x=>x.botName+": "+x.error).join(" · ")||"Webhooks inaccessibles.");
  if(!structure){
    for(const bot of used){try{structure=await backend(bot,"structure",{guildId});break}catch{}}
  }
  const channelMap=new Map((structure?.channels||[]).map(c=>[String(c.id),c.name]));
  const discordUserId=/^\d{15,22}$/.test(String(auth.user?.id||''))?String(auth.user.id):null;
  const webhooks=[...merged.values()].map(w=>({
    id:String(w.id||''),guildId:String(w.guildId||guildId),channelId:w.channelId?String(w.channelId):null,
    channelName:channelMap.get(String(w.channelId||''))||null,name:String(w.name||'Webhook'),avatar:w.avatar||null,
    type:Number(w.type||1),applicationId:w.applicationId?String(w.applicationId):null,
    creator:w.creator?{id:String(w.creator.id||''),username:String(w.creator.username||'Discord'),avatar:w.creator.avatar||null}:null,
    mine:Boolean(discordUserId&&w.creator?.id&&String(w.creator.id)===discordUserId),seenVia:w.seenVia||[]
  })).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  return {guildId:String(guildId),guildName:structure?.name||guild.name||String(guildId),guildIcon:guild.icon||null,bot:used[0],botName:used.map(b=>bots[b]?.label||b).join(' + '),botsUsed:used,webhooks,errors};
}
async function dashboardAllWebhooks(auth){
  const all=await installedEverywhere(auth),guilds=all.guilds||[],out=[],errors=[...(all.errors||[])];
  let index=0;
  async function worker(){
    while(index<guilds.length){
      const g=guilds[index++];try{
        const d=await dashboardWebhooks(auth,g.id);
        out.push({...d,guildName:g.name||d.guildName,guildIcon:g.icon||d.guildIcon||null});
        for(const e of d.errors||[])errors.push({guildId:g.id,guildName:g.name,...e});
      }catch(e){errors.push({guildId:g.id,guildName:g.name,error:e.message})}
    }
  }
  await Promise.all(Array.from({length:Math.min(4,guilds.length||1)},()=>worker()));
  out.sort((a,b)=>String(a.guildName||'').localeCompare(String(b.guildName||''),'fr'));
  return {guilds:out,total:out.reduce((n,g)=>n+(g.webhooks||[]).length,0),mine:out.reduce((n,g)=>n+(g.webhooks||[]).filter(w=>w.mine).length,0),errors};
}


const mirrorRunning=new Set();
function mirrorAuthSnapshot(auth){
  return {user:{id:String(auth.user.id),name:String(auth.user.name||''),displayName:String(auth.user.displayName||''),avatar:auth.user.avatar||null,banner:auth.user.banner||null,accentColor:auth.user.accentColor??null,discordId:auth.user.discordId||null},
    guildIds:(auth.guildIds||[]).map(String),guilds:Array.isArray(auth.guilds)?auth.guilds:[]};
}
async function mirrorIdentityProfile(auth){
  const userId=String(auth.user.id);
  let identity=null;
  try{
    const r=await pool.query("SELECT provider_user_id,profile,guilds FROM cmd_account_identities WHERE account_id=$1 AND provider='discord' LIMIT 1",[userId]);
    identity=r.rows[0]||null;
  }catch{}
  const profile={...auth.user,discordProfile:identity?.profile||null};
  await pool.query(`INSERT INTO cmd_discord_mirror_profile(user_id,discord_user_id,profile,guilds,synced_at)
    VALUES($1,$2,$3::jsonb,$4::jsonb,NOW())
    ON CONFLICT(user_id) DO UPDATE SET discord_user_id=EXCLUDED.discord_user_id,profile=EXCLUDED.profile,guilds=EXCLUDED.guilds,synced_at=NOW()`,
    [userId,String(identity?.provider_user_id||auth.user.discordId||''),JSON.stringify(profile),JSON.stringify(identity?.guilds||auth.guilds||[])]);
  const dp=identity?.profile||{};
  const accent=dp.accentColor!=null?("#"+Number(dp.accentColor).toString(16).padStart(6,"0")):null;
  await pool.query(`INSERT INTO cmd_global_profiles(user_id,display_name,avatar_data_url,banner_data_url,accent_color)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(user_id) DO UPDATE SET display_name=COALESCE(EXCLUDED.display_name,cmd_global_profiles.display_name),
      avatar_data_url=COALESCE(EXCLUDED.avatar_data_url,cmd_global_profiles.avatar_data_url),
      banner_data_url=COALESCE(EXCLUDED.banner_data_url,cmd_global_profiles.banner_data_url),
      accent_color=COALESCE(EXCLUDED.accent_color,cmd_global_profiles.accent_color),updated_at=NOW()`,
    [userId,safeText(dp.displayName||auth.user.displayName||auth.user.name,80)||null,dp.avatar||auth.user.avatar||null,dp.banner||auth.user.banner||null,accent]);
}
async function mirrorStoreGuild(auth,guildId,bot,snapshot){
  await pool.query(`INSERT INTO cmd_discord_mirror_guilds(user_id,guild_id,bot,snapshot,synced_at)
    VALUES($1,$2,$3,$4::jsonb,NOW())
    ON CONFLICT(user_id,guild_id) DO UPDATE SET bot=EXCLUDED.bot,snapshot=EXCLUDED.snapshot,synced_at=NOW()`,
    [String(auth.user.id),String(guildId),bot||null,JSON.stringify(snapshot||{})]);
}
async function mirrorStoreMessagePage(auth,guildId,channelId,messages){
  if(!messages?.length)return 0;
  const vals=[],args=[];let n=1;
  for(const m of messages){
    vals.push(`($${n++},$${n++},$${n++},$${n++},$${n++},$${n++}::jsonb,NOW())`);
    args.push(String(auth.user.id),String(guildId),String(channelId),String(m.id),m.timestamp||null,JSON.stringify(m));
  }
  await pool.query(`INSERT INTO cmd_discord_mirror_messages(user_id,guild_id,channel_id,message_id,message_timestamp,data,synced_at)
    VALUES ${vals.join(",")}
    ON CONFLICT(user_id,message_id) DO UPDATE SET guild_id=EXCLUDED.guild_id,channel_id=EXCLUDED.channel_id,message_timestamp=EXCLUDED.message_timestamp,data=EXCLUDED.data,synced_at=NOW()`,args);
  return messages.length;
}
async function mirrorJobUpdate(id,patch){
  const fields=[],args=[];let n=1;
  for(const [k,v] of Object.entries(patch)){
    if(!["status","progress","summary","error","completed_at"].includes(k))continue;
    fields.push(k+"=$"+(n++)+(["progress","summary"].includes(k)?"::jsonb":""));
    args.push(["progress","summary"].includes(k)?JSON.stringify(v):v);
  }
  if(!fields.length)return;
  fields.push("updated_at=NOW()");args.push(String(id));
  await pool.query("UPDATE cmd_discord_mirror_jobs SET "+fields.join(",")+" WHERE id=$"+n,args);
}
async function runMirrorJob(jobId,auth){
  if(mirrorRunning.has(jobId))return;mirrorRunning.add(jobId);
  const summary={guilds:0,fullGuilds:0,shellGuilds:0,channels:0,messages:0,bots:0,integrations:0,webhooks:0,errors:[]};
  try{
    await mirrorJobUpdate(jobId,{status:"running",progress:{stage:"profile",label:"Synchronisation du profil Discord"}});
    await mirrorIdentityProfile(auth);
    const managed=await allManagedGuilds(auth),guilds=managed.guilds||[];summary.guilds=guilds.length;
    for(let gi=0;gi<guilds.length;gi++){
      const g=guilds[gi],gid=String(g.id);
      await mirrorJobUpdate(jobId,{progress:{stage:"guild",guildIndex:gi+1,guildCount:guilds.length,guildId:gid,guildName:g.name,messages:summary.messages,label:"Récupération de "+g.name}});
      if(!g.installed||!(g.availableBots||[]).length){
        summary.shellGuilds++;
        await mirrorStoreGuild(auth,gid,null,{meta:g,coverage:{full:false,reason:"Aucun bot CMD installé sur ce Discord"}});
        continue;
      }
      const bot=g.availableBots[0].id;
      try{
        const [structure,extras,webhooks]=await Promise.all([
          backend(bot,"structure",{guildId:gid}),
          backend(bot,"extras",{guildId:gid}).catch(e=>({errors:{extras:e.message},threads:[],bots:[],integrations:[]})),
          dashboardWebhooks(auth,gid,bot).catch(e=>({webhooks:[],errors:[{error:e.message}]}))
        ]);
        const snapshot={meta:g,structure,extras,webhooks:webhooks.webhooks||[],coverage:{full:true,bot,botName:bots[bot].label,syncedAt:new Date().toISOString()}};
        await mirrorStoreGuild(auth,gid,bot,snapshot);summary.fullGuilds++;summary.bots+=(extras.bots||[]).length;summary.integrations+=(extras.integrations||[]).length;summary.webhooks+=(webhooks.webhooks||[]).length;
        const channelMap=new Map();
        for(const ch of structure.channels||[]){
          const t=String(ch.type||"").toLowerCase();
          if(["text","announcement","thread"].includes(t))channelMap.set(String(ch.id),ch);
        }
        for(const th of extras.threads||[])channelMap.set(String(th.id),th);
        const channels=[...channelMap.values()];summary.channels+=channels.length;
        for(let ci=0;ci<channels.length;ci++){
          const ch=channels[ci];let before="",lastBefore=null,pages=0;
          while(true){
            const d=await backend(bot,"messages",{guildId:gid,channelId:String(ch.id),before,limit:100}).catch(e=>({error:e.message,messages:[],hasMore:false}));
            if(d.error){summary.errors.push({guildId:gid,channelId:String(ch.id),error:d.error});break}
            summary.messages+=await mirrorStoreMessagePage(auth,gid,String(ch.id),d.messages||[]);
            pages++;
            if(pages%10===0)await mirrorJobUpdate(jobId,{progress:{stage:"messages",guildIndex:gi+1,guildCount:guilds.length,guildId:gid,guildName:g.name,channelIndex:ci+1,channelCount:channels.length,channelName:ch.name||ch.id,messages:summary.messages,label:"Archivage des messages"}});
            const next=String(d.nextBefore||"");if(!d.hasMore||!next||next===lastBefore)break;lastBefore=next;before=next;
            await new Promise(r=>setTimeout(r,80));
          }
        }
      }catch(e){
        summary.errors.push({guildId:gid,guildName:g.name,error:e.message});
        await mirrorStoreGuild(auth,gid,bot,{meta:g,coverage:{full:false,bot,error:e.message}});
      }
    }
    await mirrorJobUpdate(jobId,{status:"complete",progress:{stage:"complete",label:"Sauvegarde Discord terminée",messages:summary.messages},summary,completed_at:new Date()});
  }catch(e){
    summary.errors.push({error:e.message});
    await mirrorJobUpdate(jobId,{status:"failed",progress:{stage:"failed",label:"Échec de la sauvegarde"},summary,error:e.message,completed_at:new Date()}).catch(()=>{});
  }finally{mirrorRunning.delete(jobId)}
}
async function startMirrorJob(auth){
  const userId=String(auth.user.id);
  const existing=await pool.query("SELECT * FROM cmd_discord_mirror_jobs WHERE user_id=$1 AND status IN ('queued','running') ORDER BY started_at DESC LIMIT 1",[userId]);
  if(existing.rows[0]){
    const j=existing.rows[0];if(!mirrorRunning.has(String(j.id)))setTimeout(()=>runMirrorJob(String(j.id),j.auth_snapshot||mirrorAuthSnapshot(auth)),20);
    return {jobId:String(j.id),status:j.status,reused:true};
  }
  const id=crypto.randomUUID(),snap=mirrorAuthSnapshot(auth);
  await pool.query("INSERT INTO cmd_discord_mirror_jobs(id,user_id,auth_snapshot,status,progress) VALUES($1,$2,$3::jsonb,'queued',$4::jsonb)",[id,userId,JSON.stringify(snap),JSON.stringify({stage:"queued",label:"Préparation de la sauvegarde Discord"})]);
  setTimeout(()=>runMirrorJob(id,snap),20);
  return {jobId:id,status:"queued",reused:false};
}
async function mirrorStatus(auth,jobId){
  const userId=String(auth.user.id);
  const args=[userId],where=["user_id=$1"];if(jobId){args.push(String(jobId));where.push("id=$2")}
  const r=await pool.query("SELECT id,status,progress,summary,error,started_at,updated_at,completed_at FROM cmd_discord_mirror_jobs WHERE "+where.join(" AND ")+" ORDER BY started_at DESC LIMIT 1",args);
  const counts=await pool.query(`SELECT
    (SELECT COUNT(*)::int FROM cmd_discord_mirror_guilds WHERE user_id=$1) guilds,
    (SELECT COUNT(*)::bigint FROM cmd_discord_mirror_messages WHERE user_id=$1) messages,
    (SELECT MAX(synced_at) FROM cmd_discord_mirror_guilds WHERE user_id=$1) last_sync`,[userId]);
  return {job:r.rows[0]||null,mirror:counts.rows[0]||{guilds:0,messages:0,last_sync:null}};
}
async function resumeMirrorJobs(){
  const r=await pool.query("SELECT id,auth_snapshot FROM cmd_discord_mirror_jobs WHERE status IN ('queued','running') ORDER BY started_at ASC LIMIT 5");
  for(const row of r.rows)setTimeout(()=>runMirrorJob(String(row.id),row.auth_snapshot),100);
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
      if(!auth){html(res,dashboardPage(null));return}
      try{html(res,dashboardPage(auth,await listNativeGuilds(auth)))}catch{html(res,dashboardPage(auth,[]))}
      return;
    }
    if(req.method==="GET"&&url.pathname.startsWith("/native/")){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent(url.pathname));return}
      try{
        const nativeId=url.pathname.split("/").pop();
        let detail=await nativeGuildDetail(auth,nativeId);
        if((detail.channels||[]).length===0&&/^\d{15,22}$/.test(String(detail.guild?.source_discord_id||""))){
          try{
            await syncNativeGuildById(auth,nativeId);
            detail=await nativeGuildDetail(auth,nativeId);
            console.log("[native-auto-sync] "+nativeId+" channels="+detail.channels.length+" roles="+detail.roles.length);
          }catch(syncErr){console.log("[native-auto-sync] "+nativeId+" skipped: "+syncErr.message)}
        }
        html(res,renderNativeGuildPage(auth,detail));
      }catch(e){html(res,'<body style="background:#09070d;color:white;font-family:system-ui;padding:30px"><h1>Serveur indisponible</h1><p>'+escHtml(e.message)+'</p><a style="color:#a78bfa" href="/dashboard">Retour</a></body>',404)}return;
    }
    if(req.method==="GET"&&url.pathname==="/servers/add"){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/servers/add"));return}
      try{html(res,serverAddPage(auth,await discoverNativeGuilds()))}catch(e){html(res,serverFormError(e.message),500)}return;
    }
    if(req.method==="POST"&&url.pathname==="/servers/create"){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/servers/add"));return}
      try{
        const form=await readForm(req);
        const g=await createNativeGuild(auth,{name:form.get("name"),isPublic:form.get("isPublic")==="1"});
        redirect(res,baseUrl+"/native/"+encodeURIComponent(g.id));
      }catch(e){html(res,serverFormError(e.message),400)}return;
    }
    if(req.method==="POST"&&url.pathname==="/servers/join"){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/servers/add"));return}
      try{
        const form=await readForm(req);let v=String(form.get("invite")||"").trim();
        try{if(v.includes("/invite/"))v=new URL(v).pathname.split("/").filter(Boolean).pop()}catch{}
        const g=await joinNativeByCode(auth,v);
        redirect(res,baseUrl+"/native/"+encodeURIComponent(g.id));
      }catch(e){html(res,serverFormError(e.message),400)}return;
    }
    if(req.method==="POST"&&url.pathname==="/servers/import"){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/servers/add"));return}
      try{await importOwnedDiscordGuilds(auth);redirect(res,baseUrl+"/dashboard")}catch(e){html(res,serverFormError(e.message),500)}return;
    }
    if(req.method==="GET"&&url.pathname==="/profile"){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/profile"));return}
      try{
        const profile=await getGlobalProfile(auth);profile.socialLinks=await getConnections(pool,auth.user.id);
        const experience=await getProfileExperience(auth,url.searchParams.get("server")||"");
        html(res,profilePage(auth,profile,experience));
      }catch(e){html(res,"<h1>Profil indisponible</h1><p>"+escHtml(e.message)+"</p>",500)}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/server-layout"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{sendJson(res,200,{itemKeys:await getServerLayout(auth)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/server-layout"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,await saveServerLayout(auth,body))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/folders"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{sendJson(res,200,{folders:await getServerFolders(auth)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/folders/save"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,await saveServerFolder(auth,body))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/folders/delete"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,await deleteServerFolder(auth,body.id))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/folders/collapse"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,await setServerFolderCollapsed(auth,body.id,body.collapsed))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/shop"){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/shop"));return}
      try{html(res,shopPage(auth,await installedShopItems(auth)))}catch(e){html(res,"<h1>Boutique indisponible</h1><p>"+escHtml(e.message)+"</p>",500)}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/shop/install"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,await installShopItem(auth,body))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/messages"){
      const auth=dashboardAuth(req);if(!auth){redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/messages"));return}
      try{html(res,messagesPage(auth,await listDmThreads(auth),await getDmPreferences(auth)))}catch(e){html(res,"<h1>Messages indisponibles</h1><p>"+escHtml(e.message)+"</p>",500)}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dm/search"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{sendJson(res,200,{users:await searchDmUsers(auth,url.searchParams.get("q")||"")})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/dm/start"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{thread:await startDmThread(auth,body)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname.startsWith("/api/dm/thread/")){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{sendJson(res,200,await getDmMessages(auth,url.pathname.split("/").pop()))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/dm/send"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{message:await sendDmMessage(auth,body)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dm/preferences"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{sendJson(res,200,await getDmPreferences(auth))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/dm/preferences"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,await updateDmPreferences(auth,body))}catch(e){sendJson(res,400,{error:e.message})}return;
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
    if(req.method==="POST"&&url.pathname==="/api/native/import-owned"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{sendJson(res,200,await importOwnedDiscordGuilds(auth))}catch(e){sendJson(res,500,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/import-all"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{
        const out=await importOwnedDiscordGuilds(auth);
        sendJson(res,200,{imported:out.imported,skipped:out.failed,ownedCount:out.ownedCount});
      }catch(e){sendJson(res,500,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname.startsWith("/api/native/guild/")){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{sendJson(res,200,await nativeGuildDetail(auth,url.pathname.split("/").pop()))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/native/messages"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{
        const guildId=String(url.searchParams.get("guildId")||""),channelId=String(url.searchParams.get("channelId")||""),before=String(url.searchParams.get("before")||""),limit=Math.max(1,Math.min(100,Number(url.searchParams.get("limit")||100)));
        sendJson(res,200,await nativeChannelMessages(auth,guildId,channelId,{before,limit}));
      }catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/messages"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,201,await sendNativeChannelMessage(auth,body))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/action"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,await applyNativeStructureAction(auth,body))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/sync"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{guild:await syncNativeGuildById(auth,String(body.nativeGuildId||""))})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/profile"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{profile:await updateNativeProfile(auth,body)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/server-style"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{server:await updateNativeServerStyle(auth,body)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/native/role-style"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{role:await updateNativeRoleStyle(auth,body)})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dashboard/structure"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const guildId=url.searchParams.get("guildId"),bot=url.searchParams.get("bot")||undefined;requireGuild(auth,guildId);const chosen=await resolveBot(auth,guildId,bot);sendJson(res,200,{bot:chosen,botName:bots[chosen].label,...await backend(chosen,"structure",{guildId})})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/bot-invites"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{sendJson(res,200,await knownBotInvites())}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/bots/invite-url"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{const body=await readFormBodyJson(req);sendJson(res,200,{url:genericBotInviteUrl(body.clientId,body.permissions||"0")})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dashboard/bots"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{sendJson(res,200,await dashboardBots(auth,String(url.searchParams.get("guildId")||"")))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dashboard/webhooks"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{
        const all=url.searchParams.get("all")==="1";
        if(all){sendJson(res,200,await dashboardAllWebhooks(auth));return}
        const guildId=String(url.searchParams.get("guildId")||""),preferred=String(url.searchParams.get("bot")||"")||undefined;
        sendJson(res,200,await dashboardWebhooks(auth,guildId,preferred));
      }catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/mirror/start"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{sendJson(res,202,await startMirrorJob(auth))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/mirror/status"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{sendJson(res,200,await mirrorStatus(auth,url.searchParams.get("jobId")||""))}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dashboard/messages"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion requise"});return}
      try{
        const guildId=String(url.searchParams.get("guildId")||""),channelId=String(url.searchParams.get("channelId")||""),before=String(url.searchParams.get("before")||""),preferred=String(url.searchParams.get("bot")||"")||undefined,limit=Math.max(1,Math.min(100,Number(url.searchParams.get("limit")||100)));
        requireGuild(auth,guildId);const bot=await resolveBot(auth,guildId,preferred);const data=await backend(bot,"messages",{guildId,channelId,before,limit});sendJson(res,200,{bot,botName:bots[bot].label,...data});
      }catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/dashboard/action"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{
        const raw=await readFormBodyJson(req),guildId=String(raw.guildId||"");requireGuild(auth,guildId);
        const allowed=new Set(["create_category","create_channel","update_channel","delete_channel","create_role","update_role","delete_role","set_channel_permissions","send_message"]);
        if(!allowed.has(String(raw.action||"")))throw new Error("Action non autorisée.");
        if(String(raw.action)==="send_message"){sendJson(res,200,await dashboardSendMessage(auth,raw));return}
        const chosen=await resolveBot(auth,guildId,raw.bot),out=await backend(chosen,"action",{body:raw});
        sendJson(res,200,{bot:chosen,botName:bots[chosen].label,...out});
      }catch(e){sendJson(res,400,{error:e.message})}return;
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
          if(String(tx.next||"").includes("sync=1"))await importOwnedDiscordGuilds(authData);
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
  try{await initNativeDb();console.log("[native] CMD Sphere database ready");setTimeout(()=>backfillOwnedDiscordGuilds().catch(e=>console.error("[owned-import] startup failed: "+e.message)),500);setTimeout(()=>resumeMirrorJobs().catch(e=>console.error("[mirror] resume failed: "+e.message)),1200)}catch(e){console.error("[native] database init failed: "+e.message)}
  console.log("CMD Sphere MCP listening on port "+port+" with OAuth");
  for(const bot of Object.keys(bots)){
    try{const rows=await backend(bot,"guilds");console.log("[selftest] "+bot+" backend OK, guilds="+(Array.isArray(rows)?rows.length:"?"))}
    catch(e){console.error("[selftest] "+bot+" backend FAILED: "+e.message)}
  }
});
