/* CMD Sphere: opt-in Discord-like HTTP adapter for registered CMD bots.
 * This is NOT the Discord Gateway, nor an invitation route for third-party Discord apps.
 * Only registered CMD bot tokens are accepted; access remains scoped to installations
 * and explicit CMD Sphere permissions.
 */
import crypto from "node:crypto";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const prefix="/api/cmd-discord-bridge/v10";
const CHANNEL_TYPES={text:0,voice:2,category:4,announcement:5,forum:15,stage:13};
const MESSAGE_TYPES=new Set(["text","announcement","forum"]);
const ALLOWED_PERMISSIONS=new Set(["view_channels","read_messages","send_messages"]);
const roleColor=value=>{
  if(typeof value==="number"&&Number.isFinite(value))return value;
  const text=String(value||"").replace(/^#/,"");
  return /^[0-9a-f]{6}$/i.test(text)?Number.parseInt(text,16):0;
};
const decorateChannel=c=>({id:String(c.id),guild_id:String(c.guild_id),name:String(c.name),type:CHANNEL_TYPES[c.type]??0,
  topic:c.topic||null,position:Number(c.position||0),parent_id:null});
const decorateMessage=m=>({id:String(m.id),channel_id:String(m.channel_id),guild_id:String(m.guild_id),
  content:String(m.body||""),timestamp:new Date(m.created_at||Date.now()).toISOString(),
  edited_timestamp:m.edited_at?new Date(m.edited_at).toISOString():null,
  author:{id:String(m.sender_user_id||""),username:m.metadata?.bot?.name||"CMD Sphere",bot:String(m.sender_user_id||"").startsWith("cmd-bot:")},
  mentions:[],mention_roles:[],attachments:[],embeds:[],type:0});
const code=(error,status)=>Object.assign(new Error(error),{status});
function respond(send,res,status,data){send(res,status,data);return true}

export async function discordCompatRoute(req,res,url,{pool,app,sendJson,readBody}){
 const send=(status,data)=>respond(sendJson,res,status,data);
 const path=url.pathname;
 if(!path.startsWith(prefix+"/"))return false;
 const route=path.slice(prefix.length);
 try{
  if(req.method==="GET"&&route==="/capabilities"){
    return send(200,{platform:"CMD Sphere",version:"v1",protocol:"discord-rest-subset",
      gatewaySupported:false,thirdPartyBotsRequireOptIn:true,idFormat:"uuid",
      supported:["GET /users/@me","GET /users/@me/guilds","GET /guilds/{id}/channels","GET /guilds/{id}/roles",
        "GET /channels/{id}","GET /channels/{id}/messages","POST /channels/{id}/messages"]});
  }
  if(req.method==="GET"&&route==="/users/@me"){
    return send(200,{id:String(app.id),username:String(app.name),bot:true,platform:"cmd-sphere"});
  }
  if(req.method==="GET"&&route==="/users/@me/guilds"){
    const result=await pool.query("SELECT g.id,g.name,i.permissions FROM cmd_native_app_installs i JOIN cmd_native_guilds g ON g.id=i.guild_id WHERE i.app_id=$1 ORDER BY g.name LIMIT 200",[app.id]);
    return send(200,(result.rows||[]).map(g=>({id:String(g.id),name:String(g.name),permissions:Array.isArray(g.permissions)?g.permissions.filter(x=>ALLOWED_PERMISSIONS.has(x)):[],platform:"cmd-sphere"})));
  }
  async function permitted(guildId,permission){
    if(!UUID.test(guildId))throw code("Identifiant de serveur CMD invalide.",400);
    const r=await pool.query("SELECT permissions FROM cmd_native_app_installs WHERE guild_id=$1 AND app_id=$2",[guildId,app.id]);
    const rights=r.rows?.[0]?.permissions;
    if(!Array.isArray(rights)||!rights.includes(permission))throw code("Le bot n'est pas installé sur ce serveur avec la permission "+permission+".",403);
  }
  const guildRoute=route.match(/^\/guilds\/([^/]+)\/(channels|roles)$/);
  if(guildRoute&&req.method==="GET"){
    const guildId=guildRoute[1];
    await permitted(guildId,"view_channels");
    if(guildRoute[2]==="channels"){
      const r=await pool.query("SELECT id,guild_id,name,type,topic,position FROM cmd_native_channels WHERE guild_id=$1 ORDER BY position,name LIMIT 500",[guildId]);
      return send(200,(r.rows||[]).map(decorateChannel));
    }
    const r=await pool.query("SELECT id,guild_id,name,color,permissions,position,hoist,mentionable FROM cmd_native_roles WHERE guild_id=$1 ORDER BY position DESC,name LIMIT 250",[guildId]);
    return send(200,(r.rows||[]).map(role=>({id:String(role.id),name:String(role.name),color:roleColor(role.color),
      hoist:Boolean(role.hoist),mentionable:Boolean(role.mentionable),position:Number(role.position||0),permissions:role.permissions||{}})));
  }
  const channelRoute=route.match(/^\/channels\/([^/]+)(?:\/(messages))?$/);
  if(channelRoute){
    const channelId=channelRoute[1],messages=Boolean(channelRoute[2]);
    if(!UUID.test(channelId))throw code("Identifiant de salon CMD invalide.",400);
    const r=await pool.query("SELECT id,guild_id,name,type,topic,position FROM cmd_native_channels WHERE id=$1 LIMIT 1",[channelId]);
    const channel=r.rows?.[0];
    if(!channel)throw code("Salon introuvable.",404);
    const permission=messages?(req.method==="POST"?"send_messages":"read_messages"):"view_channels";
    await permitted(String(channel.guild_id),permission);
    if(!messages&&req.method==="GET")return send(200,decorateChannel(channel));
    if(messages&&!MESSAGE_TYPES.has(channel.type))throw code("Ce salon ne permet pas les messages textuels.",400);
    if(messages&&req.method==="GET"){
      const raw=Math.floor(Number(url.searchParams.get("limit")||50));
      const limit=Number.isFinite(raw)?Math.min(100,Math.max(1,raw)):50;
      const rows=await pool.query("SELECT id,channel_id,guild_id,sender_user_id,body,created_at,edited_at,metadata FROM cmd_native_channel_messages WHERE guild_id=$1 AND channel_id=$2 ORDER BY created_at DESC LIMIT $3",[channel.guild_id,channelId,limit]);
      return send(200,(rows.rows||[]).map(decorateMessage));
    }
    if(messages&&req.method==="POST"){
      const b=await readBody(req);
      if(!b||typeof b!=="object"||typeof b.content!=="string"||!b.content.trim()||b.content.length>2000)throw code("Message texte requis (maximum 2 000 caractères).",400);
      // Deliberately ignore embeds, mentions, attachments and privileged actions.
      const id=crypto.randomUUID(),timestamp=new Date().toISOString(),content=b.content.trim();
      await pool.query("INSERT INTO cmd_native_channel_messages(id,guild_id,channel_id,sender_user_id,body,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
        [id,channel.guild_id,channelId,"cmd-bot:"+app.id,content,JSON.stringify({bot:{id:app.id,name:app.name},compat:{version:"v1",mentionsDisabled:true}})]);
      return send(201,decorateMessage({id,channel_id:channelId,guild_id:channel.guild_id,body:content,sender_user_id:"cmd-bot:"+app.id,created_at:timestamp,metadata:{bot:{name:app.name}}}));
    }
  }
  return send(404,{error:"Route Discord non prise en charge par CMD Sphere."});
 }catch(e){
  const status=[400,401,403,404].includes(e.status)?e.status:500;
  return send(status,{error:status===500?"Erreur du service CMD Sphere.":String(e.message||"Requête refusée.")});
 }
}

export {CHANNEL_TYPES};
