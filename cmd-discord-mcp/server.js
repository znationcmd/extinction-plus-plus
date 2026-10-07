import { createServer } from "node:http";
import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const port=Number(process.env.PORT||8787);
const baseUrl=String(process.env.PUBLIC_BASE_URL||"").replace(/\/$/,"");
const backendSecret=String(process.env.CMD_MCP_SECRET||"");
const oauthSecret=String(process.env.OAUTH_SIGNING_SECRET||"");
const discordBridgeSecret=String(process.env.DISCORD_BRIDGE_SECRET||"");
const bridgeLoginUrl=String(process.env.DISCORD_ACCOUNT_BRIDGE_URL||"https://dashboard-production-e07b.up.railway.app/api/mod-auth/login");
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
  return {
    user:{id:String(data.user.id),name:String(data.user.name||"Discord").slice(0,100)},
    guildIds:[...new Set(data.guilds.map(g=>String(g.id)).filter(id=>/^\d{15,22}$/.test(id)))].slice(0,100)
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
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>262144)throw new Error("Requête trop volumineuse.");chunks.push(chunk)}
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
  const raw=parseCookies(req).cmd_discord_dashboard;if(!raw)return null;
  try{const d=verifySigned(raw);return d.typ==="dashboard_session"&&d.user?.id&&Array.isArray(d.guildIds)?d:null}catch{return null}
}
function dashboardCookie(value,maxAge=7*24*3600){
  return "cmd_discord_dashboard="+encodeURIComponent(value)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+maxAge;
}
function clearDashboardCookie(){return "cmd_discord_dashboard=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"}
function html(res,body,status=200,headers={}){
  res.writeHead(status,{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer",...headers});res.end(body);
}
function dashboardPage(auth){
  const user=auth?.user?.name||"";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>CMD Discord Configurateur</title><style>
  *{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,Segoe UI,Arial;background:radial-gradient(circle at 20% 0,#2b1c55 0,#0b0d15 38%,#05070b 100%);color:#fff;min-height:100vh}a{color:inherit}.wrap{max-width:1180px;margin:auto;padding:24px}.top{display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap}.brand{display:flex;gap:12px;align-items:center}.logo{width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,#7c3aed,#ec4899);display:grid;place-items:center;font-weight:1000;box-shadow:0 10px 35px #7c3aed44}.muted{color:#aeb4c0}.btn{border:1px solid #ffffff22;background:#ffffff0d;color:#fff;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px}.btn:hover{background:#ffffff17}.primary{background:linear-gradient(135deg,#7c3aed,#db2777);border:0}.danger{background:#7f1d1d}.grid{display:grid;grid-template-columns:320px 1fr;gap:18px;margin-top:24px}.card{background:#10131bcc;border:1px solid #ffffff14;border-radius:18px;padding:16px;box-shadow:0 16px 50px #0005;backdrop-filter:blur(10px)}label{display:grid;gap:6px;font-size:13px;color:#c9ced8;margin-bottom:12px}input,select,textarea{width:100%;background:#080a10;border:1px solid #ffffff1d;color:#fff;border-radius:11px;padding:11px;font:inherit}textarea{min-height:84px;resize:vertical}.guild{width:100%;text-align:left;margin:7px 0}.guild.active{outline:2px solid #a78bfa}.bot{display:inline-flex;padding:3px 7px;border-radius:999px;background:#ffffff12;font-size:11px;margin-right:5px}.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.section{margin-top:16px}.list{display:grid;gap:8px;max-height:460px;overflow:auto}.row{padding:10px 12px;border:1px solid #ffffff12;background:#ffffff08;border-radius:12px}.row small{color:#9aa1ad}.status{position:fixed;right:18px;bottom:18px;max-width:360px;padding:12px 15px;border-radius:12px;background:#111827;border:1px solid #ffffff22;display:none}.status.show{display:block}.hero{padding:70px 20px;text-align:center}.hero h1{font-size:clamp(38px,7vw,72px);margin:0 0 12px}.hero p{font-size:18px;color:#b9bfca;max-width:720px;margin:0 auto 24px}.empty{padding:30px;text-align:center;color:#aeb4c0}@media(max-width:850px){.grid{grid-template-columns:1fr}.cols{grid-template-columns:1fr}.wrap{padding:16px}}
  </style></head><body>${auth?`<div class="wrap"><div class="top"><div class="brand"><div class="logo">CMD</div><div><h1 style="margin:0">Configurateur Discord CMD</h1><div class="muted">DAYZ GATE · BOT ARK · EXTINCTION ++ RSS</div></div></div><div><span class="muted">${user}</span> <a class="btn" href="/dashboard-logout">Déconnexion</a></div></div>
  <div class="grid"><aside class="card"><h2>Mes Discord</h2><div id="guilds" class="list"><div class="empty">Chargement…</div></div></aside><main class="card"><div class="top"><div><h2 id="gtitle" style="margin:0">Sélectionne un Discord</h2><div id="gbots" class="muted"></div></div><button id="refresh" class="btn" disabled>Actualiser</button></div><div id="workspace" class="empty">Choisis un Discord à gauche.</div></main></div></div><div id="status" class="status"></div>
  <script>
  const S={guild:null,bot:null,structure:null};const qs=s=>document.querySelector(s);
  function toast(m,ok=true){const e=qs('#status');e.textContent=m;e.style.borderColor=ok?'#34d39966':'#fb718566';e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3500)}
  async function api(url,opt){const r=await fetch(url,{cache:'no-store',...opt,headers:{'content-type':'application/json',...(opt&&opt.headers||{})}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Erreur');return d}
  async function loadGuilds(){const d=await api('/api/dashboard/guilds');const e=qs('#guilds');e.innerHTML='';for(const g of d.guilds||[]){const b=document.createElement('button');b.className='btn guild';b.innerHTML='<strong>'+g.name.replace(/[&<>]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]))+'</strong><br><span class="muted">'+g.availableBots.map(x=>x.name).join(' · ')+'</span>';b.onclick=()=>selectGuild(g,b);e.appendChild(b)}if(!e.children.length)e.innerHTML='<div class="empty">Aucun Discord accessible par tes bots CMD.</div>'}
  async function selectGuild(g,el){document.querySelectorAll('.guild').forEach(x=>x.classList.remove('active'));el.classList.add('active');S.guild=g;S.bot=g.availableBots[0]?.id||null;qs('#gtitle').textContent=g.name;qs('#gbots').innerHTML=g.availableBots.map(x=>'<span class="bot">'+x.name+'</span>').join('');qs('#refresh').disabled=false;await loadStructure()}
  async function loadStructure(){try{const d=await api('/api/dashboard/structure?guildId='+encodeURIComponent(S.guild.id)+(S.bot?'&bot='+encodeURIComponent(S.bot):''));S.structure=d;render()}catch(e){toast(e.message,false)}}
  function render(){const d=S.structure||{},cats=(d.channels||[]).filter(x=>x.type==='category'),channels=(d.channels||[]).filter(x=>x.type!=='category'),roles=(d.roles||[]).filter(x=>!x.managed);qs('#workspace').className='';qs('#workspace').innerHTML=`
    <div class="cols section">
      <form id="catf" class="card"><h3>Nouvelle catégorie</h3><label>Nom<input name="name" required maxlength="100"></label><button class="btn primary">Créer</button></form>
      <form id="chf" class="card"><h3>Nouveau salon</h3><label>Nom<input name="name" required maxlength="100"></label><label>Type<select name="type"><option value="text">Texte</option><option value="voice">Vocal</option><option value="announcement">Annonce</option><option value="forum">Forum</option></select></label><label>Catégorie<select name="parentId"><option value="">Aucune</option>${cats.map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')}</select></label><label>Sujet<textarea name="topic" maxlength="1024"></textarea></label><button class="btn primary">Créer</button></form>
      <form id="rolef" class="card"><h3>Nouveau rôle</h3><label>Nom<input name="name" required maxlength="100"></label><label>Couleur<input name="color" value="#7c3aed" pattern="#?[0-9A-Fa-f]{6}"></label><label><input type="checkbox" name="hoist" style="width:auto"> Afficher séparément</label><label><input type="checkbox" name="mentionable" style="width:auto"> Mentionnable</label><button class="btn primary">Créer</button></form>
    </div>
    <div class="section"><h3>Catégories & salons</h3><div class="list">${cats.map(c=>'<div class="row"><strong>📁 '+c.name+'</strong>'+channels.filter(x=>x.parentId===c.id).map(x=>'<div><small>'+x.type+'</small> · '+x.name+'</div>').join('')+'</div>').join('')}${channels.filter(x=>!x.parentId).map(x=>'<div class="row"><small>'+x.type+'</small> · '+x.name+'</div>').join('')}</div></div>
    <div class="section"><h3>Rôles</h3><div class="list">${roles.map(r=>'<div class="row"><strong>'+r.name+'</strong> <small>position '+r.position+'</small></div>').join('')}</div></div>`;
    qs('#catf').onsubmit=e=>submit(e,'create_category');qs('#chf').onsubmit=e=>submit(e,'create_channel');qs('#rolef').onsubmit=e=>submit(e,'create_role');
  }
  async function submit(e,action){e.preventDefault();const f=new FormData(e.currentTarget),body={action,guildId:S.guild.id,bot:S.bot};for(const [k,v] of f)body[k]=v;if(action==='create_role'){body.hoist=e.currentTarget.hoist.checked;body.mentionable=e.currentTarget.mentionable.checked}try{await api('/api/dashboard/action',{method:'POST',body:JSON.stringify(body)});toast('Modification appliquée sur Discord');e.currentTarget.reset();await loadStructure()}catch(x){toast(x.message,false)}}
  qs('#refresh').onclick=loadStructure;loadGuilds().catch(e=>toast(e.message,false));
  </script>`:`<div class="hero"><div class="logo" style="margin:0 auto 20px;width:78px;height:78px;font-size:22px">CMD</div><h1>Configurateur Discord CMD</h1><p>Configure gratuitement tes catégories, salons et rôles avec DAYZ GATE, BOT ARK ou EXTINCTION ++ RSS. Aucun abonnement supplémentaire.</p><a class="btn primary" href="/dashboard-login">Connexion Discord</a></div>`}</body></html>`;
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
  const server=new McpServer({name:"cmd-discord",version:"2.0.0"});

  server.registerTool("discord_profile",{
    title:"Profil Discord connecté",
    description:"Affiche le compte Discord autorisé pour cette connexion CMD.",
    inputSchema:{},
    securitySchemes:readSecurity,
    annotations:{readOnlyHint:true,destructiveHint:false},
    _meta:{"openai/profile":true}
  },async()=>{try{requireScope(auth,readScope);return ok("Compte Discord connecté.",{id:auth.user.id,name:auth.user.name,authorizedGuilds:auth.guildIds.length})}catch(e){return failResult(e)}});

  server.registerTool("list_discord_servers",{
    title:"Lister mes Discord CMD",
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
      const auth=dashboardAuth(req);html(res,dashboardPage(auth));return;
    }
    if(req.method==="GET"&&url.pathname==="/dashboard-login"){
      const tx=signPayload({typ:"dashboard_tx",exp:Date.now()+10*60*1000});
      const bridge=new URL(bridgeLoginUrl);bridge.searchParams.set("bridge",baseUrl);bridge.searchParams.set("bridge_state",tx);redirect(res,bridge);return;
    }
    if(req.method==="GET"&&url.pathname==="/dashboard-logout"){
      html(res,'<!doctype html><meta charset="utf-8"><script>location.replace("/")</script>',200,{"set-cookie":clearDashboardCookie()});return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dashboard/guilds"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{sendJson(res,200,await installedEverywhere(auth))}catch(e){sendJson(res,500,{error:e.message})}return;
    }
    if(req.method==="GET"&&url.pathname==="/api/dashboard/structure"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const guildId=url.searchParams.get("guildId"),bot=url.searchParams.get("bot")||undefined;requireGuild(auth,guildId);const chosen=await resolveBot(auth,guildId,bot);sendJson(res,200,{bot:chosen,botName:bots[chosen].label,...await backend(chosen,"structure",{guildId})})}catch(e){sendJson(res,400,{error:e.message})}return;
    }
    if(req.method==="POST"&&url.pathname==="/api/dashboard/action"){
      const auth=dashboardAuth(req);if(!auth){sendJson(res,401,{error:"Connexion Discord requise"});return}
      try{const raw=await readFormBodyJson(req),guildId=String(raw.guildId||"");requireGuild(auth,guildId);const chosen=await resolveBot(auth,guildId,raw.bot);const allowed=new Set(["create_category","create_channel","update_channel","delete_channel","create_role","update_role","delete_role","set_channel_permissions"]);if(!allowed.has(String(raw.action||"")))throw new Error("Action non autorisée.");const out=await backend(chosen,"action",{body:raw});sendJson(res,200,{bot:chosen,botName:bots[chosen].label,...out})}catch(e){sendJson(res,400,{error:e.message})}return;
    }

    if(req.method==="GET"&&url.pathname==="/health"){
      sendJson(res,200,{ok:true,name:"CMD Discord MCP",oauth:true,bots:Object.values(bots).map(x=>x.label)});return;
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
          const session=signPayload({typ:"dashboard_session",exp:Date.now()+7*24*3600*1000,user:identity.user,guildIds:identity.guildIds});
          res.writeHead(302,{Location:baseUrl+"/dashboard","set-cookie":dashboardCookie(session),"cache-control":"no-store"});res.end();return;
        }
        if(tx.typ!=="oauth_tx")throw new Error("Transaction OAuth invalide.");
        const code=signPayload({typ:"auth_code",exp:Date.now()+90*1000,clientId:tx.clientId,redirectUri:tx.redirectUri,codeChallenge:tx.codeChallenge,scope:tx.scope,resource:tx.resource,user:identity.user,guildIds:identity.guildIds});
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
      res.writeHead(200,{"content-type":"text/plain","cache-control":"no-store"}).end("CMD Discord MCP - OAuth protected");return;
    }
    res.writeHead(404,{"content-type":"text/plain"}).end("Not Found");
  }catch(e){
    console.error("HTTP request failed",e);if(!res.headersSent)sendJson(res,500,{error:"server_error"});
  }
});

httpServer.listen(port,"0.0.0.0",async()=>{
  console.log("CMD Discord MCP listening on port "+port+" with OAuth");
  for(const bot of Object.keys(bots)){
    try{const rows=await backend(bot,"guilds");console.log("[selftest] "+bot+" backend OK, guilds="+(Array.isArray(rows)?rows.length:"?"))}
    catch(e){console.error("[selftest] "+bot+" backend FAILED: "+e.message)}
  }
});
