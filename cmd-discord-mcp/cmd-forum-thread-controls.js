/* CMD Sphere forum thread lifecycle.
 * The data belongs to native CMD forums; no historical message is deleted.
 * Auto archive is DISABLED by default for backward compatibility.
 */
const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_HOURS=new Set([0,1,24,72,168,720]);
export async function initCmdForumThreadControls(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_forum_thread_state(
   root_message_id UUID PRIMARY KEY REFERENCES cmd_native_channel_messages(id) ON DELETE CASCADE,
   guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
   channel_id UUID NOT NULL REFERENCES cmd_native_channels(id) ON DELETE CASCADE,
   archived BOOLEAN NOT NULL DEFAULT FALSE,
   locked BOOLEAN NOT NULL DEFAULT FALSE,
   auto_archive_hours INTEGER NOT NULL DEFAULT 0,
   last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   CHECK(auto_archive_hours IN (0,1,24,72,168,720))
 )`);
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_native_forum_thread_state_channel_idx ON cmd_native_forum_thread_state(channel_id,updated_at)");
}
export async function resolveForumThread(pool,guildId,channel,postId){
 if(channel?.type!=="forum")throw invalid("Cette action est réservée aux forums.",404);
 if(!UUID.test(String(postId||"")))throw invalid("Publication introuvable.",404);
 const found=await pool.query("SELECT id,reply_to,created_at FROM cmd_native_channel_messages WHERE id=$1 AND guild_id=$2 AND channel_id=$3 LIMIT 1",
 [String(postId),String(guildId),String(channel.id)]);
 const message=found.rows[0];if(!message)throw invalid("Publication introuvable.",404);
 if(message.reply_to){
  const root=await pool.query("SELECT id,created_at FROM cmd_native_channel_messages WHERE id=$1 AND guild_id=$2 AND channel_id=$3 LIMIT 1",
   [String(message.reply_to),String(guildId),String(channel.id)]);
  if(!root.rows[0])throw invalid("Publication racine introuvable.",404);
  return root.rows[0];
 }
 return message;
}
const computed=(state,root)=>{
 const hours=Number(state?.auto_archive_hours||0);
 const last=state?.last_activity_at||root.created_at;
 const expired=hours>0&&Date.now()>=new Date(last).getTime()+hours*3600000;
 return {rootMessageId:String(root.id),archived:state?.archived===true,locked:state?.locked===true,autoArchiveHours:hours,autoArchived:Boolean(expired),canReply:!(state?.locked===true||state?.archived===true||expired)};
};
export async function getForumThreadState(pool,guildId,channel,postId){
 const root=await resolveForumThread(pool,guildId,channel,postId);
 const r=await pool.query("SELECT archived,locked,auto_archive_hours,last_activity_at FROM cmd_native_forum_thread_state WHERE guild_id=$1 AND channel_id=$2 AND root_message_id=$3 LIMIT 1",
 [String(guildId),String(channel.id),String(root.id)]);
 return computed(r.rows[0],root);
}
export async function setForumThreadState(pool,guildId,channel,postId,input){
 if(!input||typeof input!=="object"||Array.isArray(input))throw invalid("Paramètres de fil invalides.");
 if(typeof input.archived!=="boolean"||typeof input.locked!=="boolean"||!ALLOWED_HOURS.has(input.autoArchiveHours))throw invalid("État de fil invalide.");
 const root=await resolveForumThread(pool,guildId,channel,postId);
 const r=await pool.query(`INSERT INTO cmd_native_forum_thread_state(root_message_id,guild_id,channel_id,archived,locked,auto_archive_hours,last_activity_at)
  VALUES($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT(root_message_id) DO UPDATE SET
  archived=EXCLUDED.archived,locked=EXCLUDED.locked,auto_archive_hours=EXCLUDED.auto_archive_hours,
  last_activity_at=CASE WHEN cmd_native_forum_thread_state.archived=TRUE AND EXCLUDED.archived=FALSE THEN NOW() ELSE cmd_native_forum_thread_state.last_activity_at END,
  updated_at=NOW()
  WHERE cmd_native_forum_thread_state.guild_id=EXCLUDED.guild_id AND cmd_native_forum_thread_state.channel_id=EXCLUDED.channel_id
  RETURNING archived,locked,auto_archive_hours,last_activity_at`,
 [String(root.id),String(guildId),String(channel.id),input.archived,input.locked,input.autoArchiveHours]);
 if(!r.rows[0])throw invalid("Fil inaccessible.",403);
 return {ok:true,...computed(r.rows[0],root)};
}
export async function assertForumThreadReplyAllowed(pool,guildId,channel,replyId){
 if(channel?.type!=="forum"||!replyId)return null;
 const state=await getForumThreadState(pool,guildId,channel,replyId);
 if(!state.canReply)throw invalid("Ce fil est archivé ou verrouillé. Contacte un modérateur.",409);
 return state.rootMessageId;
}
export async function touchForumThreadReply(pool,rootMessageId){
 if(!rootMessageId)return;
 await pool.query("UPDATE cmd_native_forum_thread_state SET last_activity_at=NOW() WHERE root_message_id=$1 AND archived=FALSE AND locked=FALSE",[String(rootMessageId)]);
}
