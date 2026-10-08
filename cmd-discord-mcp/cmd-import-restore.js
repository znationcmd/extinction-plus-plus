import crypto from "node:crypto";
const snow=v=>/^\d{15,22}$/.test(String(v||""));
const text=(v,n)=>String(v??"").trim().slice(0,n);

export async function restoreFromMirror(pool,auth,nativeId){
  const uid=String(auth.user.id);
  const selected=await pool.query("SELECT id,name,source_discord_id FROM cmd_native_guilds WHERE id=$1 AND owner_user_id=$2 LIMIT 1",[nativeId,uid]);
  const guild=selected.rows[0];if(!guild)throw Error("Serveur inexistant ou non autorisé.");
  const sid=String(guild.source_discord_id||"");
  if(!snow(sid))return {id:String(guild.id),name:guild.name,channels:0,roles:0};
  const stored=await pool.query("SELECT snapshot FROM cmd_discord_mirror_guilds WHERE user_id=$1 AND guild_id=$2 LIMIT 1",[uid,sid]);
  const snapshot=stored.rows[0]?.snapshot||{};
  const channels=Array.isArray(snapshot.structure?.channels)?snapshot.structure.channels:[];
  const roles=Array.isArray(snapshot.structure?.roles)?snapshot.structure.roles:[];
  let chDone=0,roleDone=0;
  for(const ch of channels){
    if(!snow(ch.id))continue;
    const type=String(ch.type||"text").toLowerCase();
    if(!["text","voice","category","announcement","forum","stage","thread"].includes(type))continue;
    const sql="INSERT INTO cmd_native_channels(id,guild_id,source_channel_id,source_parent_id,name,type,topic,position,permission_overwrites) "
      +"VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT(guild_id,source_channel_id) DO UPDATE SET "
      +"source_parent_id=EXCLUDED.source_parent_id,name=EXCLUDED.name,type=EXCLUDED.type,"
      +"topic=EXCLUDED.topic,position=EXCLUDED.position,permission_overwrites=EXCLUDED.permission_overwrites";
    await pool.query(sql,[crypto.randomUUID(),guild.id,String(ch.id),snow(ch.parentId)?String(ch.parentId):null,
      text(ch.name||"salon",100),type,ch.topic?text(ch.topic,1024):null,Number(ch.position||0),
      JSON.stringify(ch.permissionOverwrites||ch.permission_overwrites||[])]);
    chDone++;
  }
  for(const role of roles){
    if(!snow(role.id))continue;
    const sql="INSERT INTO cmd_native_roles(id,guild_id,source_role_id,name,color,permissions,position,hoist,mentionable) "
      +"VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9) ON CONFLICT(guild_id,source_role_id) DO UPDATE SET "
      +"name=EXCLUDED.name,color=EXCLUDED.color,permissions=EXCLUDED.permissions,"
      +"position=EXCLUDED.position,hoist=EXCLUDED.hoist,mentionable=EXCLUDED.mentionable";
    await pool.query(sql,[crypto.randomUUID(),guild.id,String(role.id),
      text(role.name||"rôle",100),role.color==null?null:text(role.color,30),
      JSON.stringify(role.permissions||{}),Number(role.position||0),Boolean(role.hoist),Boolean(role.mentionable)]);
    roleDone++;
  }
  return {id:String(guild.id),name:guild.name,channels:chDone,roles:roleDone,structureAvailable:!!channels.length,
    warning:!channels.length?"Le bot n'a pas fourni la structure de ce serveur lors de l'archivage.":null};
}
export async function restoreAllMirrors(pool,auth,importShell){
  const uid=String(auth.user.id);
  const stored=await pool.query("SELECT guild_id,snapshot FROM cmd_discord_mirror_guilds WHERE user_id=$1 ORDER BY synced_at DESC",[uid]);
  const restored=[],errors=[];
  for(const row of stored.rows){
    const sourceId=String(row.guild_id||"");if(!snow(sourceId))continue;
    try{
      const existing=await pool.query("SELECT id FROM cmd_native_guilds WHERE owner_user_id=$1 AND source_discord_id=$2 LIMIT 1",[uid,sourceId]);
      let id=existing.rows[0]?.id;
      if(!id){
        const meta=row.snapshot?.meta||{};
        const created=await importShell(auth,{id:sourceId,name:meta.name||"Discord "+sourceId,icon:meta.icon||null});
        id=created.id;
      }
      restored.push(await restoreFromMirror(pool,auth,String(id)));
    }catch(e){errors.push({serverId:sourceId,error:e.message})}
  }
  return {restored:restored.length,channels:restored.reduce((n,x)=>n+x.channels,0),
    roles:restored.reduce((n,x)=>n+x.roles,0),servers:restored,errors,
    note:"Restauration dans CMD Sphere seulement. Le contenu historique reste dans l'archive privée du propriétaire."};
}
export async function getImportDiagnostics(pool,auth){
  const uid=String(auth.user.id);
  const [local,archive,messages,mirrors,job]=await Promise.all([
    pool.query("SELECT id,name,source_discord_id,(SELECT COUNT(*)::int FROM cmd_native_channels WHERE guild_id=g.id) AS channels FROM cmd_native_guilds g WHERE owner_user_id=$1 ORDER BY updated_at DESC",[uid]),
    pool.query("SELECT guild_id,COUNT(*)::bigint AS total,COUNT(*) FILTER (WHERE LENGTH(COALESCE(data->>'content',''))>0)::bigint AS readable FROM cmd_discord_mirror_messages WHERE user_id=$1 GROUP BY guild_id",[uid]),
    pool.query("SELECT COUNT(*)::bigint AS total FROM cmd_native_channel_messages WHERE guild_id IN (SELECT id FROM cmd_native_guilds WHERE owner_user_id=$1)",[uid]),
    pool.query("SELECT guild_id,(snapshot->'structure'->'channels') IS NOT NULL AS has_structure,synced_at FROM cmd_discord_mirror_guilds WHERE user_id=$1",[uid]),
    pool.query("SELECT id,status,progress,summary,error,updated_at FROM cmd_discord_mirror_jobs WHERE user_id=$1 ORDER BY started_at DESC LIMIT 1",[uid])
  ]);
  const map=new Map(archive.rows.map(x=>[String(x.guild_id),x]));
  const backup=new Map(mirrors.rows.map(x=>[String(x.guild_id),x]));
  const guilds=local.rows.map(g=>{
    const id=String(g.source_discord_id||""),a=map.get(id),s=backup.get(id);
    return {id:g.id,name:g.name,sourceDiscordId:id||null,channels:Number(g.channels),
      archivedMessages:Number(a?.total||0),readableMessages:Number(a?.readable||0),
      archivePresent:!!s,structureSaved:!!s?.has_structure};
  });
  return {guilds,nativeGuilds:guilds.length,mirroredGuilds:mirrors.rows.length,
    archivedMessages:archive.rows.reduce((n,x)=>n+Number(x.total),0),
    readableMessages:archive.rows.reduce((n,x)=>n+Number(x.readable),0),
    nativeMessages:Number(messages.rows[0]?.total||0),mirrorJob:job.rows[0]||null};
}
