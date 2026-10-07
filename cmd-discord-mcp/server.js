import { createServer } from "node:http";
import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const port=Number(process.env.PORT||8787);
const pathSecret=String(process.env.MCP_PATH_SECRET||"");
const backendSecret=String(process.env.CMD_MCP_SECRET||"");
if(pathSecret.length<24)throw new Error("MCP_PATH_SECRET must be at least 24 characters");
if(backendSecret.length<32)throw new Error("CMD_MCP_SECRET must be at least 32 characters");

const bots={
  dayz:{label:"DAYZ GATE",base:String(process.env.DAYZ_ADMIN_URL||"")},
  ark:{label:"BOT ARK",base:String(process.env.ARK_ADMIN_URL||"")},
  extinction:{label:"EXTINCTION ++ RSS",base:String(process.env.EXT_ADMIN_URL||"")}
};
for(const [k,v] of Object.entries(bots))if(!/^https:\/\//.test(v.base))throw new Error("Missing "+k+" backend URL");

const MCP_PATH="/mcp/"+pathSecret;
const jsonText=value=>JSON.stringify(value,null,2);
const ok=(message,data)=>({content:[{type:"text",text:message+"\n"+jsonText(data)}],structuredContent:data});
const failResult=e=>({isError:true,content:[{type:"text",text:String(e?.message||e)}]});

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
async function installedEverywhere(){
  const entries=await Promise.all(Object.keys(bots).map(async bot=>{
    try{return [bot,await backend(bot,"guilds")]}catch(e){return [bot,{error:e.message,rows:[]}]}
  }));
  const map=new Map(),errors=[];
  for(const [bot,value] of entries){
    if(!Array.isArray(value)){errors.push({bot,error:value.error||"indisponible"});continue}
    for(const g of value){
      const id=String(g.id);const row=map.get(id)||{id,name:g.name||id,icon:g.icon||null,memberCount:g.memberCount??null,availableBots:[]};
      row.name=g.name||row.name;row.icon=g.icon||row.icon;if(g.memberCount!=null)row.memberCount=g.memberCount;
      row.availableBots.push({id:bot,name:bots[bot].label});map.set(id,row);
    }
  }
  return {guilds:[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,"fr")),errors};
}
async function resolveBot(guildId,preferred){
  if(preferred)return preferred;
  const all=await installedEverywhere();const g=all.guilds.find(x=>String(x.id)===String(guildId));
  if(!g)throw new Error("Aucun des trois bots CMD n'est installé sur ce Discord.");
  return g.availableBots[0].id;
}
async function actionTool(args,action){
  const bot=await resolveBot(args.guildId,args.bot);
  const data=await backend(bot,"action",{body:{...args,action}});
  return ok(bots[bot].label+" a exécuté "+action+".",{bot,botName:bots[bot].label,...data});
}

const botEnum=z.enum(["dayz","ark","extinction"]);
const guildId=z.string().regex(/^\d{15,22}$/);
const discordId=z.string().regex(/^\d{15,22}$/);
const channelType=z.enum(["text","voice","category","announcement","forum"]);
const permissionName=z.string().min(1).max(80);

function createCmdServer(){
  const server=new McpServer({name:"cmd-discord",version:"1.0.0"});

  server.registerTool("list_discord_servers",{
    title:"Lister les Discord CMD",
    description:"Liste les serveurs Discord auxquels DAYZ GATE, BOT ARK ou EXTINCTION ++ RSS ont accès, et indique quel bot peut agir sur chacun.",
    inputSchema:{},
    annotations:{readOnlyHint:true,destructiveHint:false}
  },async()=>{try{const data=await installedEverywhere();return ok("Discord accessibles par les bots CMD.",data)}catch(e){return failResult(e)}});

  server.registerTool("get_discord_structure",{
    title:"Voir catégories, salons et rôles",
    description:"Retourne les catégories, salons, rôles, positions et permissions d'un serveur Discord. Utiliser avant toute modification.",
    inputSchema:{guildId,bot:botEnum.optional()},
    annotations:{readOnlyHint:true,destructiveHint:false}
  },async({guildId,bot})=>{try{const chosen=await resolveBot(guildId,bot);const data=await backend(chosen,"structure",{guildId});return ok("Structure Discord chargée via "+bots[chosen].label+".",{bot:chosen,botName:bots[chosen].label,...data})}catch(e){return failResult(e)}});

  server.registerTool("create_discord_category",{
    title:"Créer une catégorie Discord",
    description:"Crée une catégorie sur un serveur Discord via un bot CMD installé.",
    inputSchema:{guildId,bot:botEnum.optional(),name:z.string().min(1).max(100),position:z.number().int().min(0).optional()},
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(args,"create_category")}catch(e){return failResult(e)}});

  server.registerTool("create_discord_channel",{
    title:"Créer un salon Discord",
    description:"Crée un salon texte, vocal, annonce, forum ou catégorie. parentId place le salon dans une catégorie.",
    inputSchema:{guildId,bot:botEnum.optional(),name:z.string().min(1).max(100),type:channelType.default("text"),parentId:discordId.optional(),topic:z.string().max(1024).optional(),position:z.number().int().min(0).optional()},
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(args,"create_channel")}catch(e){return failResult(e)}});

  server.registerTool("update_discord_channel",{
    title:"Modifier un salon Discord",
    description:"Renomme ou déplace un salon, change son sujet ou sa position.",
    inputSchema:{guildId,bot:botEnum.optional(),channelId:discordId,name:z.string().min(1).max(100).optional(),parentId:z.union([discordId,z.literal("")]).optional(),topic:z.string().max(1024).optional(),position:z.number().int().min(0).optional()},
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(args,"update_channel")}catch(e){return failResult(e)}});

  server.registerTool("delete_discord_channel",{
    title:"Supprimer un salon ou une catégorie Discord",
    description:"Supprime définitivement un salon ou une catégorie Discord. Utiliser seulement sur demande explicite.",
    inputSchema:{guildId,bot:botEnum.optional(),channelId:discordId},
    annotations:{readOnlyHint:false,destructiveHint:true}
  },async args=>{try{return await actionTool(args,"delete_channel")}catch(e){return failResult(e)}});

  server.registerTool("create_discord_role",{
    title:"Créer un rôle Discord",
    description:"Crée un rôle Discord. permissions peut être le bitfield Discord sous forme de chaîne; omettre pour créer sans permissions spéciales.",
    inputSchema:{guildId,bot:botEnum.optional(),name:z.string().min(1).max(100),color:z.string().regex(/^#?[0-9A-Fa-f]{6}$/).optional(),hoist:z.boolean().optional(),mentionable:z.boolean().optional(),permissions:z.string().regex(/^\d+$/).optional(),position:z.number().int().min(1).optional()},
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(args,"create_role")}catch(e){return failResult(e)}});

  server.registerTool("update_discord_role",{
    title:"Modifier un rôle Discord",
    description:"Renomme, recolore, repositionne ou modifie les permissions d'un rôle que le bot a le droit de gérer.",
    inputSchema:{guildId,bot:botEnum.optional(),roleId:discordId,name:z.string().min(1).max(100).optional(),color:z.string().regex(/^#?[0-9A-Fa-f]{6}$/).optional(),hoist:z.boolean().optional(),mentionable:z.boolean().optional(),permissions:z.string().regex(/^\d+$/).optional(),position:z.number().int().min(1).optional()},
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(args,"update_role")}catch(e){return failResult(e)}});

  server.registerTool("delete_discord_role",{
    title:"Supprimer un rôle Discord",
    description:"Supprime définitivement un rôle Discord gérable par le bot. @everyone est protégé.",
    inputSchema:{guildId,bot:botEnum.optional(),roleId:discordId},
    annotations:{readOnlyHint:false,destructiveHint:true}
  },async args=>{try{return await actionTool(args,"delete_role")}catch(e){return failResult(e)}});

  server.registerTool("set_discord_channel_permissions",{
    title:"Régler les permissions d'un salon",
    description:"Modifie un overwrite de permissions pour un rôle ou un membre sur un salon. allow et deny utilisent les noms discord.js, par ex. ViewChannel, SendMessages, ManageChannels, Connect, Speak.",
    inputSchema:{guildId,bot:botEnum.optional(),channelId:discordId,targetId:discordId,targetType:z.enum(["role","member"]).default("role"),allow:z.array(permissionName).default([]),deny:z.array(permissionName).default([])},
    annotations:{readOnlyHint:false,destructiveHint:false}
  },async args=>{try{return await actionTool(args,"set_channel_permissions")}catch(e){return failResult(e)}});

  return server;
}

const httpServer=createServer(async(req,res)=>{
  if(!req.url){res.writeHead(400).end("Missing URL");return}
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
  if(req.method==="GET"&&url.pathname==="/health"){res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"}).end(JSON.stringify({ok:true,name:"CMD Discord MCP",bots:Object.values(bots).map(x=>x.label)}));return}
  if(req.method==="OPTIONS"&&url.pathname===MCP_PATH){
    res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, GET, DELETE, OPTIONS","Access-Control-Allow-Headers":"content-type, mcp-session-id","Access-Control-Expose-Headers":"Mcp-Session-Id"});res.end();return;
  }
  if(url.pathname!==MCP_PATH){res.writeHead(404,{"content-type":"text/plain"}).end("Not Found");return}
  if(!["POST","GET","DELETE"].includes(req.method||"")){res.writeHead(405).end("Method Not Allowed");return}
  res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Expose-Headers","Mcp-Session-Id");
  const server=createCmdServer();
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.on("close",()=>{transport.close();server.close()});
  try{await server.connect(transport);await transport.handleRequest(req,res)}
  catch(e){console.error("MCP request failed",e);if(!res.headersSent)res.writeHead(500).end("Internal server error")}
});
httpServer.listen(port,"0.0.0.0",async()=>{
  console.log("CMD Discord MCP listening on port "+port);
  for(const bot of Object.keys(bots)){
    try{const rows=await backend(bot,"guilds");console.log("[selftest] "+bot+" backend OK, guilds="+(Array.isArray(rows)?rows.length:"?"))}
    catch(e){console.error("[selftest] "+bot+" backend FAILED: "+e.message)}
  }
});
