import crypto from 'node:crypto';

export const dynamic='force-dynamic';
const types={text:0,voice:2,category:4,announcement:5,forum:15};
const typeLabel=t=>Object.entries(types).find(([,v])=>v===t)?.[0]||String(t);

function auth(req){
  const secret=String(process.env.CMD_MCP_SECRET||''),supplied=String(req.headers.get('x-cmd-mcp-secret')||'');
  if(secret.length<32||supplied.length!==secret.length)throw Object.assign(new Error('Accès MCP refusé'),{status:401});
  if(!crypto.timingSafeEqual(Buffer.from(secret),Buffer.from(supplied)))throw Object.assign(new Error('Accès MCP refusé'),{status:401});
}
function token(){const t=String(process.env.DISCORD_TOKEN||process.env.TOKEN||process.env.BOT_TOKEN||'');if(!t)throw Object.assign(new Error('Token Discord absent'),{status:503});return t}
async function discord(path,{method='GET',body}={}){
  const r=await fetch('https://discord.com/api/v10'+path,{method,headers:{Authorization:'Bot '+token(),'Content-Type':'application/json','X-Audit-Log-Reason':encodeURIComponent('CMD Discord MCP')},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(r.status===204)return null;
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(data?.message||('Discord HTTP '+r.status)),{status:r.status===404?404:r.status===403?403:400,discord:data});
  return data;
}
async function guilds(){
  const rows=await discord('/users/@me/guilds');
  return rows.map(g=>({id:String(g.id),name:g.name,icon:g.icon?('https://cdn.discordapp.com/icons/'+g.id+'/'+g.icon+'.webp?size=128'):null,memberCount:null})).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}
async function structure(guildId){
  if(!/^\d{15,22}$/.test(String(guildId||'')))throw Object.assign(new Error('Discord invalide'),{status:400});
  const [channels,roles,me]=await Promise.all([discord('/guilds/'+guildId+'/channels'),discord('/guilds/'+guildId+'/roles'),discord('/users/@me')]);
  const member=await discord('/guilds/'+guildId+'/members/'+me.id).catch(()=>null);
  const roleMap=new Map(roles.map(r=>[String(r.id),r]));
  const highest=(member?.roles||[]).map(id=>roleMap.get(String(id))?.position??0).reduce((a,b)=>Math.max(a,b),0);
  return {id:String(guildId),name:String(guildId),bot:{id:me.id,name:me.username,highestRolePosition:highest},channels:channels.map(ch=>({id:ch.id,name:ch.name,type:typeLabel(ch.type),typeId:ch.type,parentId:ch.parent_id||null,position:ch.position??0,topic:ch.topic||null})).sort((a,b)=>a.position-b.position||a.name.localeCompare(b.name,'fr')),roles:roles.map(r=>({id:r.id,name:r.name,color:'#'+Number(r.color||0).toString(16).padStart(6,'0'),position:r.position,hoist:Boolean(r.hoist),mentionable:Boolean(r.mentionable),managed:Boolean(r.managed),permissions:String(r.permissions||'0'),everyone:String(r.id)===String(guildId)})).sort((a,b)=>b.position-a.position)};
}
const permissionBits={
  CreateInstantInvite:0n,KickMembers:1n,BanMembers:2n,Administrator:3n,ManageChannels:4n,ManageGuild:5n,AddReactions:6n,ViewAuditLog:7n,PrioritySpeaker:8n,Stream:9n,ViewChannel:10n,SendMessages:11n,SendTTSMessages:12n,ManageMessages:13n,EmbedLinks:14n,AttachFiles:15n,ReadMessageHistory:16n,MentionEveryone:17n,UseExternalEmojis:18n,ViewGuildInsights:19n,Connect:20n,Speak:21n,MuteMembers:22n,DeafenMembers:23n,MoveMembers:24n,UseVAD:25n,ChangeNickname:26n,ManageNicknames:27n,ManageRoles:28n,ManageWebhooks:29n,ManageGuildExpressions:30n,UseApplicationCommands:31n,RequestToSpeak:32n,ManageEvents:33n,ManageThreads:34n,CreatePublicThreads:35n,CreatePrivateThreads:36n,UseExternalStickers:37n,SendMessagesInThreads:38n,UseEmbeddedActivities:39n,ModerateMembers:40n,UseSoundboard:42n,CreateGuildExpressions:43n,CreateEvents:44n,UseExternalSounds:45n,SendVoiceMessages:46n
};
const bits=list=>{
  let out=0n;
  for(const name of Array.isArray(list)?list:[]){const bit=permissionBits[name];if(bit===undefined)throw Object.assign(new Error('Permission Discord inconnue: '+name),{status:400});out|=(1n<<bit)}
  return out.toString();
};
async function action(body){
  const g=String(body.guildId||'');if(!/^\d{15,22}$/.test(g))throw Object.assign(new Error('Discord invalide'),{status:400});
  const a=String(body.action||'');
  if(a==='create_category'){const x=await discord('/guilds/'+g+'/channels',{method:'POST',body:{name:String(body.name||'Nouvelle catégorie').slice(0,100),type:4,position:body.position===undefined?undefined:Number(body.position)}});return {ok:true,channel:{id:x.id,name:x.name,type:'category',position:x.position}}}
  if(a==='create_channel'){const t=types[String(body.type||'text')];if(t===undefined)throw Object.assign(new Error('Type de salon invalide'),{status:400});const x=await discord('/guilds/'+g+'/channels',{method:'POST',body:{name:String(body.name||'nouveau-salon').slice(0,100),type:t,parent_id:body.parentId||undefined,topic:body.topic?String(body.topic).slice(0,1024):undefined,position:body.position===undefined?undefined:Number(body.position)}});return {ok:true,channel:{id:x.id,name:x.name,type:typeLabel(x.type),parentId:x.parent_id||null,position:x.position}}}
  if(a==='update_channel'){const p={};if(body.name!==undefined)p.name=String(body.name).slice(0,100);if(body.parentId!==undefined)p.parent_id=body.parentId||null;if(body.topic!==undefined)p.topic=body.topic?String(body.topic).slice(0,1024):null;if(body.position!==undefined)p.position=Number(body.position);const x=await discord('/channels/'+body.channelId,{method:'PATCH',body:p});return {ok:true,channel:{id:x.id,name:x.name,parentId:x.parent_id||null,position:x.position}}}
  if(a==='delete_channel'){const x=await discord('/channels/'+body.channelId,{method:'DELETE'});return {ok:true,deleted:{id:x?.id||String(body.channelId),name:x?.name||null}}}
  if(a==='create_role'){const p={name:String(body.name||'Nouveau rôle').slice(0,100),hoist:Boolean(body.hoist),mentionable:Boolean(body.mentionable)};if(body.color)p.color=parseInt(String(body.color).replace('#',''),16);if(body.permissions!==undefined)p.permissions=String(body.permissions);const x=await discord('/guilds/'+g+'/roles',{method:'POST',body:p});if(body.position!==undefined)await discord('/guilds/'+g+'/roles',{method:'PATCH',body:[{id:x.id,position:Number(body.position)}]});return {ok:true,role:{id:x.id,name:x.name,position:x.position}}}
  if(a==='update_role'){if(String(body.roleId)===g)throw Object.assign(new Error('Rôle @everyone protégé'),{status:400});const p={};if(body.name!==undefined)p.name=String(body.name).slice(0,100);if(body.color!==undefined)p.color=body.color?parseInt(String(body.color).replace('#',''),16):0;if(body.hoist!==undefined)p.hoist=Boolean(body.hoist);if(body.mentionable!==undefined)p.mentionable=Boolean(body.mentionable);if(body.permissions!==undefined)p.permissions=String(body.permissions);const x=await discord('/guilds/'+g+'/roles/'+body.roleId,{method:'PATCH',body:p});if(body.position!==undefined)await discord('/guilds/'+g+'/roles',{method:'PATCH',body:[{id:x.id,position:Number(body.position)}]});return {ok:true,role:{id:x.id,name:x.name,position:x.position}}}
  if(a==='delete_role'){if(String(body.roleId)===g)throw Object.assign(new Error('Rôle @everyone protégé'),{status:400});await discord('/guilds/'+g+'/roles/'+body.roleId,{method:'DELETE'});return {ok:true,deleted:{id:String(body.roleId)}}}
  if(a==='set_channel_permissions'){await discord('/channels/'+body.channelId+'/permissions/'+body.targetId,{method:'PUT',body:{type:body.targetType==='member'?1:0,allow:bits(body.allow),deny:bits(body.deny)}});return {ok:true,channelId:String(body.channelId),targetId:String(body.targetId)}}
  throw Object.assign(new Error('Action MCP inconnue'),{status:400});
}
function fail(e){return Response.json({error:e.message,details:e.discord||undefined},{status:e.status||500,headers:{'Cache-Control':'no-store'}})}

export async function GET(req){
  try{auth(req);const u=new URL(req.url),op=u.searchParams.get('op')||'guilds';if(op==='guilds')return Response.json(await guilds(),{headers:{'Cache-Control':'no-store'}});if(op==='structure')return Response.json(await structure(u.searchParams.get('guildId')),{headers:{'Cache-Control':'no-store'}});throw Object.assign(new Error('Opération inconnue'),{status:400})}catch(e){return fail(e)}
}
export async function POST(req){
  try{auth(req);return Response.json(await action(await req.json()),{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}
}
