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
  for(let attempt=0;attempt<4;attempt++){
    const r=await fetch('https://discord.com/api/v10'+path,{method,headers:{Authorization:'Bot '+token(),'Content-Type':'application/json','X-Audit-Log-Reason':encodeURIComponent('CMD Discord MCP')},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(r.status===204)return null;
    const data=await r.json().catch(()=>({}));
    if(r.ok)return data;
    if(r.status===429&&attempt<3){await new Promise(resolve=>setTimeout(resolve,Math.max(250,Math.ceil(Number(data?.retry_after||1)*1000))));continue}
    throw Object.assign(new Error(data?.message||('Discord HTTP '+r.status)),{status:r.status===404?404:r.status===403?403:r.status===429?429:400,discord:data});
  }
  throw Object.assign(new Error('Discord temporairement indisponible'),{status:503});
}
async function guilds(){
  const rows=await discord('/users/@me/guilds');
  return rows.map(g=>({id:String(g.id),name:g.name,icon:g.icon?('https://cdn.discordapp.com/icons/'+g.id+'/'+g.icon+'.webp?size=128'):null,memberCount:null})).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}

function avatarUrl(user){
  if(!user?.id||!user?.avatar)return null;
  const ext=String(user.avatar).startsWith('a_')?'gif':'webp';
  return 'https://cdn.discordapp.com/avatars/'+user.id+'/'+user.avatar+'.'+ext+'?size=128';
}
function serializeMessage(m){
  const ref=m?.referenced_message?{id:String(m.referenced_message.id||''),content:String(m.referenced_message.content||''),author:{id:String(m.referenced_message.author?.id||''),username:String(m.referenced_message.author?.global_name||m.referenced_message.author?.username||'Utilisateur'),avatar:avatarUrl(m.referenced_message.author)}}:null;
  return {
    id:String(m.id),channelId:String(m.channel_id||''),guildId:m.guild_id?String(m.guild_id):null,
    content:String(m.content||''),timestamp:m.timestamp||null,editedTimestamp:m.edited_timestamp||null,
    author:{id:String(m.author?.id||''),username:String(m.author?.global_name||m.author?.username||'Utilisateur'),tag:String(m.author?.username||''),bot:Boolean(m.author?.bot),avatar:avatarUrl(m.author)},
    attachments:(m.attachments||[]).map(a=>({id:String(a.id),filename:a.filename,url:a.url,proxyUrl:a.proxy_url,contentType:a.content_type||null,size:Number(a.size||0),width:a.width??null,height:a.height??null,description:a.description||null})),
    embeds:(m.embeds||[]).map(e=>({type:e.type||null,title:e.title||null,description:e.description||null,url:e.url||null,color:e.color??null,timestamp:e.timestamp||null,fields:(e.fields||[]).map(f=>({name:f.name,value:f.value,inline:Boolean(f.inline)})),author:e.author||null,footer:e.footer||null,image:e.image||null,thumbnail:e.thumbnail||null,video:e.video||null})),
    stickers:(m.sticker_items||[]).map(st=>({id:String(st.id),name:st.name,formatType:st.format_type})),
    reactions:(m.reactions||[]).map(r=>({count:Number(r.count||0),me:Boolean(r.me),emoji:r.emoji||null,burstCount:Number(r.count_details?.burst||0),normalCount:Number(r.count_details?.normal||0)})),
    mentions:(m.mentions||[]).map(u=>({id:String(u.id),username:String(u.global_name||u.username||'Utilisateur'),avatar:avatarUrl(u)})),
    mentionRoles:(m.mention_roles||[]).map(String),pinned:Boolean(m.pinned),tts:Boolean(m.tts),type:Number(m.type||0),
    reference:m.message_reference?{messageId:m.message_reference.message_id||null,channelId:m.message_reference.channel_id||null,guildId:m.message_reference.guild_id||null}:null,
    referencedMessage:ref,components:m.components||[]
  };
}
async function channelMessages(guildId,channelId,{before,limit=100}={}){
  if(!/^\d{15,22}$/.test(String(guildId||''))||!/^\d{15,22}$/.test(String(channelId||'')))throw Object.assign(new Error('Salon Discord invalide'),{status:400});
  const ch=await discord('/channels/'+channelId);
  if(String(ch.guild_id||'')!==String(guildId))throw Object.assign(new Error("Ce salon n'appartient pas à ce Discord"),{status:403});
  const n=Math.max(1,Math.min(100,Number(limit)||100));
  const q=new URLSearchParams({limit:String(n)});if(before&&/^\d{15,22}$/.test(String(before)))q.set('before',String(before));
  const rows=await discord('/channels/'+channelId+'/messages?'+q.toString());
  return {channel:{id:String(ch.id),name:ch.name||String(ch.id),type:typeLabel(ch.type),topic:ch.topic||null,parentId:ch.parent_id||null},messages:(rows||[]).map(serializeMessage),hasMore:Array.isArray(rows)&&rows.length===n,nextBefore:Array.isArray(rows)&&rows.length?String(rows[rows.length-1].id):null};
}


function webhookAvatarUrl(w){
  if(!w?.id||!w?.avatar)return null;
  return 'https://cdn.discordapp.com/avatars/'+w.id+'/'+w.avatar+'.webp?size=128';
}
function serializeWebhook(w){
  const id=String(w.id||''),tokenValue=typeof w.token==='string'&&w.token?w.token:null;
  return {
    id,guildId:w.guild_id?String(w.guild_id):null,channelId:w.channel_id?String(w.channel_id):null,
    name:String(w.name||'Webhook'),avatar:webhookAvatarUrl(w),type:Number(w.type||1),
    applicationId:w.application_id?String(w.application_id):null,
    creator:w.user?{id:String(w.user.id||''),username:String(w.user.global_name||w.user.username||'Discord'),avatar:avatarUrl(w.user)}:null,
    url:tokenValue?('https://discord.com/api/webhooks/'+id+'/'+tokenValue):null,hasToken:Boolean(tokenValue)
  };
}
async function guildWebhooks(guildId){
  if(!/^\d{15,22}$/.test(String(guildId||'')))throw Object.assign(new Error('Discord invalide'),{status:400});
  const rows=await discord('/guilds/'+guildId+'/webhooks');
  return {guildId:String(guildId),webhooks:(rows||[]).map(serializeWebhook)};
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
  if(a==='send_message'){
    const ch=await discord('/channels/'+body.channelId);if(String(ch.guild_id||'')!==g)throw Object.assign(new Error("Ce salon n'appartient pas à ce Discord"),{status:403});
    const content=String(body.content||'').trim().slice(0,2000);if(!content)throw Object.assign(new Error('Message vide'),{status:400});
    const payload={content,allowed_mentions:{parse:['users','roles'],replied_user:false}};
    if(body.replyTo&&/^\d{15,22}$/.test(String(body.replyTo)))payload.message_reference={message_id:String(body.replyTo),channel_id:String(body.channelId),guild_id:g,fail_if_not_exists:false};
    const m=await discord('/channels/'+body.channelId+'/messages',{method:'POST',body:payload});return {ok:true,message:serializeMessage(m),sentAsBot:true};
  }
  if(a==='create_webhook'){
    const channelId=String(body.channelId||'');if(!/^\d{15,22}$/.test(channelId))throw Object.assign(new Error('Salon invalide'),{status:400});
    const ch=await discord('/channels/'+channelId);if(String(ch.guild_id||'')!==g)throw Object.assign(new Error("Ce salon n'appartient pas à ce Discord"),{status:403});
    const name=String(body.name||'CMD Webhook').trim().slice(0,80);if(name.length<1)throw Object.assign(new Error('Nom du webhook requis'),{status:400});
    const w=await discord('/channels/'+channelId+'/webhooks',{method:'POST',body:{name}});return {ok:true,webhook:serializeWebhook(w)};
  }
  if(a==='update_webhook'){
    const id=String(body.webhookId||'');if(!/^\d{15,22}$/.test(id))throw Object.assign(new Error('Webhook invalide'),{status:400});
    const current=await discord('/webhooks/'+id);if(String(current.guild_id||'')!==g)throw Object.assign(new Error("Ce webhook n'appartient pas à ce Discord"),{status:403});
    const p={};if(body.name!==undefined)p.name=String(body.name||'Webhook').trim().slice(0,80);if(body.channelId!==undefined)p.channel_id=String(body.channelId||'');
    const w=await discord('/webhooks/'+id,{method:'PATCH',body:p});return {ok:true,webhook:serializeWebhook(w)};
  }
  if(a==='delete_webhook'){
    const id=String(body.webhookId||'');if(!/^\d{15,22}$/.test(id))throw Object.assign(new Error('Webhook invalide'),{status:400});
    const current=await discord('/webhooks/'+id);if(String(current.guild_id||'')!==g)throw Object.assign(new Error("Ce webhook n'appartient pas à ce Discord"),{status:403});
    await discord('/webhooks/'+id,{method:'DELETE'});return {ok:true,deleted:{id}};
  }
  throw Object.assign(new Error('Action MCP inconnue'),{status:400});
}
function fail(e){return Response.json({error:e.message,details:e.discord||undefined},{status:e.status||500,headers:{'Cache-Control':'no-store'}})}

export async function GET(req){
  try{
    auth(req);const u=new URL(req.url),op=u.searchParams.get('op')||'guilds';
    if(op==='guilds')return Response.json(await guilds(),{headers:{'Cache-Control':'no-store'}});
    if(op==='structure')return Response.json(await structure(u.searchParams.get('guildId')),{headers:{'Cache-Control':'no-store'}});
    if(op==='messages')return Response.json(await channelMessages(u.searchParams.get('guildId'),u.searchParams.get('channelId'),{before:u.searchParams.get('before')||'',limit:u.searchParams.get('limit')||100}),{headers:{'Cache-Control':'no-store'}});
    if(op==='webhooks')return Response.json(await guildWebhooks(u.searchParams.get('guildId')),{headers:{'Cache-Control':'no-store'}});
    throw Object.assign(new Error('Opération inconnue'),{status:400});
  }catch(e){return fail(e)}
}
export async function POST(req){
  try{auth(req);return Response.json(await action(await req.json()),{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}
}
