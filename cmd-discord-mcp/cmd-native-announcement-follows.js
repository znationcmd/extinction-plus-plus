/* CMD Sphere — opt-in local announcement relay.
 * Subscribing requires administration rights on BOTH native guilds.
 * Only root, non-overridden announcement channels on an explicitly public
 * source guild may be followed. No private media or author identities forwarded.
 */
import crypto from 'node:crypto';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_FOLLOW_TARGETS=20;
const assertIds=input=>{
 const ids=['sourceGuildId','sourceChannelId','destinationGuildId','destinationChannelId'];
 const data=Object.fromEntries(ids.map(x=>[x,String(input?.[x]||'')]));
 if(ids.some(x=>!UUID.test(data[x]))||data.sourceGuildId===data.destinationGuildId)
  throw fail(400,'Serveur ou salon invalide. Choisis deux serveurs différents.');
 return data;
};
export async function initNativeAnnouncementFollows(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_announcement_follows (
  source_guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
  source_channel_id UUID NOT NULL REFERENCES cmd_native_channels(id) ON DELETE CASCADE,
  destination_guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
  destination_channel_id UUID NOT NULL REFERENCES cmd_native_channels(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(source_channel_id,destination_channel_id),
  CHECK(source_guild_id<>destination_guild_id)
 )`);
 await pool.query('CREATE INDEX IF NOT EXISTS cmd_native_announcement_follows_source_idx ON cmd_native_announcement_follows(source_guild_id,source_channel_id)');
}
async function requireAdmin(auth,guildId,guard){
 if(!auth?.user?.id)throw fail(401,'Connexion requise.');
 if(typeof guard!=='function')throw fail(503,'Vérification d’autorisation indisponible.');
 try{await guard(auth,guildId)}
 catch{throw fail(403,'Droits administrateur requis sur le serveur.')}
}
export async function followNativeAnnouncements(pool,auth,input,{requireNativeAdmin}={}){
 const ids=assertIds(input);
 await requireAdmin(auth,ids.sourceGuildId,requireNativeAdmin);
 await requireAdmin(auth,ids.destinationGuildId,requireNativeAdmin);
 const {sourceGuildId,sourceChannelId,destinationGuildId,destinationChannelId}=ids;
 const count=await pool.query(`SELECT COUNT(*)::integer AS count FROM cmd_native_announcement_follows
  WHERE source_guild_id=$1::uuid AND source_channel_id=$2::uuid`,[sourceGuildId,sourceChannelId]);
 if(Number(count.rows[0]?.count||0)>=MAX_FOLLOW_TARGETS)throw fail(409,'Limite de 20 abonnements pour ce salon atteinte.');
 const result=await pool.query(`INSERT INTO cmd_native_announcement_follows(
    source_guild_id,source_channel_id,destination_guild_id,destination_channel_id,creator_id)
  SELECT src.guild_id,src.id,dst.guild_id,dst.id,$5
  FROM cmd_native_channels src
  JOIN cmd_native_guilds pub ON pub.id=src.guild_id
  JOIN cmd_native_channels dst ON dst.guild_id=$3::uuid AND dst.id=$4::uuid
  WHERE src.guild_id=$1::uuid AND src.id=$2::uuid
    AND src.type='announcement' AND dst.type='announcement'
    AND pub.is_public=TRUE AND src.source_parent_id IS NULL
    AND src.permission_overwrites='[]'::jsonb
  ON CONFLICT DO NOTHING
  RETURNING source_guild_id::text AS "sourceGuildId",source_channel_id::text AS "sourceChannelId",
     destination_guild_id::text AS "destinationGuildId",destination_channel_id::text AS "destinationChannelId"`,
   [sourceGuildId,sourceChannelId,destinationGuildId,destinationChannelId,String(auth.user.id)]);
 if(!result.rows.length)throw fail(400,'Abonnement déjà actif ou salon source non public (annonces hors catégorie uniquement).');
 return {ok:true,...result.rows[0],automatic:true};
}
export async function unfollowNativeAnnouncements(pool,auth,input,{requireNativeAdmin}={}){
 const ids=assertIds(input);
 // Destination admin can revoke consent at any time; source admin can revoke publication too.
 let allowed=false;
 for(const id of [ids.sourceGuildId,ids.destinationGuildId]){
  try{await requireAdmin(auth,id,requireNativeAdmin);allowed=true;break}catch(e){if(e.status!==403)throw e}
 }
 if(!allowed)throw fail(403,'Administrateur du serveur source ou destinataire requis.');
 const result=await pool.query(`DELETE FROM cmd_native_announcement_follows
  WHERE source_guild_id=$1::uuid AND source_channel_id=$2::uuid
    AND destination_guild_id=$3::uuid AND destination_channel_id=$4::uuid
  RETURNING source_channel_id`,[ids.sourceGuildId,ids.sourceChannelId,ids.destinationGuildId,ids.destinationChannelId]);
 return {ok:true,removed:result.rowCount>0};
}
export async function listNativeAnnouncementFollows(pool,auth,input,{requireNativeAdmin}={}){
 const guildId=String(input?.guildId||'');
 if(!UUID.test(guildId))throw fail(400,'Serveur invalide.');
 await requireAdmin(auth,guildId,requireNativeAdmin);
 const result=await pool.query(`SELECT source_guild_id::text AS "sourceGuildId",
   source_channel_id::text AS "sourceChannelId",
   destination_guild_id::text AS "destinationGuildId",
   destination_channel_id::text AS "destinationChannelId",created_at AS "createdAt"
  FROM cmd_native_announcement_follows
  WHERE source_guild_id=$1::uuid OR destination_guild_id=$1::uuid
  ORDER BY created_at DESC LIMIT 60`,[guildId]);
 return {guildId,follows:result.rows};
}
export async function relayNativeAnnouncement(pool,{guildId,channelId,body}){
 if(!UUID.test(String(guildId))||!UUID.test(String(channelId)))return {relayed:0};
 const raw=String(body||'').trim();
 if(!raw)return {relayed:0};
 const targets=await pool.query(`SELECT f.destination_guild_id AS "guildId",
    f.destination_channel_id AS "channelId",f.creator_id AS "creatorId",g.name AS "sourceName"
   FROM cmd_native_announcement_follows f
   JOIN cmd_native_guilds g ON g.id=f.source_guild_id AND g.is_public=TRUE
   JOIN cmd_native_channels src ON src.id=f.source_channel_id
      AND src.guild_id=f.source_guild_id AND src.type='announcement'
      AND src.source_parent_id IS NULL AND src.permission_overwrites='[]'::jsonb
   JOIN cmd_native_channels dst ON dst.id=f.destination_channel_id
      AND dst.guild_id=f.destination_guild_id AND dst.type='announcement'
   JOIN cmd_native_members allowed ON allowed.guild_id=f.destination_guild_id
      AND allowed.user_id=f.creator_id AND allowed.membership_role IN ('owner','admin')
   WHERE f.source_guild_id=$1::uuid AND f.source_channel_id=$2::uuid
   ORDER BY f.created_at ASC LIMIT $3`,[guildId,channelId,MAX_FOLLOW_TARGETS]);
 let relayed=0;
 const safeText=raw.replace(/@(everyone|here)/gi,'@\u200b$1').slice(0,3000);
 for(const target of targets.rows){
  const name=String(target.sourceName||'Serveur').slice(0,100).replace(/[\r\n]/g,' ');
  const message='📢 Annonce publique de '+name+' :\n'+safeText;
  const metadata={webhook:{name:'Relais CMD'},relay:{sourceGuildId:guildId,sourceChannelId:channelId}};
  const inserted=await pool.query(`INSERT INTO cmd_native_channel_messages(
     id,guild_id,channel_id,sender_user_id,body,metadata)
    VALUES($1,$2::uuid,$3::uuid,$4,$5,$6::jsonb)
    ON CONFLICT(id) DO NOTHING RETURNING id`,[crypto.randomUUID(),target.guildId,target.channelId,String(target.creatorId),message,JSON.stringify(metadata)]);
  if(inserted.rowCount)relayed++;
 }
 return {relayed};
}
export async function handleNativeAnnouncementFollows(req,res,url,{pool,auth,sendJson,readBody,requireNativeAdmin}){
 if(url.pathname!=='/api/native/announcement-follows')return false;
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 if(!['GET','POST','DELETE'].includes(req.method)){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 try{
  const result=req.method==='GET'
   ?await listNativeAnnouncementFollows(pool,auth,{guildId:url.searchParams.get('guildId')},{requireNativeAdmin})
   :req.method==='POST'
    ?await followNativeAnnouncements(pool,auth,await readBody(req),{requireNativeAdmin})
    :await unfollowNativeAnnouncements(pool,auth,await readBody(req),{requireNativeAdmin});
  res.setHeader?.('Cache-Control','private, no-store');
  sendJson(res,200,result);
 }catch(e){sendJson(res,e.status||500,{error:e.status?e.message:'Relais d’annonces indisponible.'})}
 return true;
}
