/* CMD Sphere native channel slow mode.
 * Non-destructive schema extension and atomic per-member send gating.
 * No third-party calls or new services. Never apply to other apps or Discord.
 */
export const SLOWMODE_MAX_SECONDS=21600;
export const SLOWMODE_CHOICES=Object.freeze([0,5,10,15,30,60,120,300,600,900,1800,3600,7200,21600]);

export function parseSlowmodeSeconds(value){
 const number=Number(value);
 if(value===null||value===undefined||value===""||!Number.isInteger(number)||number<0||number>SLOWMODE_MAX_SECONDS){
  throw Object.assign(new Error("Mode lent : durée invalide (0 à 21 600 secondes)."),{status:400});
 }
 return number;
}

export async function initCmdSlowmode(pool){
 await pool.query("ALTER TABLE cmd_native_channels ADD COLUMN IF NOT EXISTS slowmode_seconds INTEGER NOT NULL DEFAULT 0");
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_slowmode_state(
   channel_id UUID NOT NULL REFERENCES cmd_native_channels(id) ON DELETE CASCADE,
   sender_user_id TEXT NOT NULL,
   next_allowed_at TIMESTAMPTZ NOT NULL,
   PRIMARY KEY(channel_id,sender_user_id)
 )`);
}

const saveMessageSql="INSERT INTO cmd_native_channel_messages(id,guild_id,channel_id,sender_user_id,body,reply_to,attachments,metadata) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)";

export async function saveNativeMessageWithSlowmode(pool,{id,guildId,channelId,userId,body,replyTo,attachments,metadata,cooldownSeconds=0,bypass=false}){
 const params=[String(id),String(guildId),String(channelId),String(userId),body,replyTo,JSON.stringify(attachments),JSON.stringify(metadata)];
 const seconds=parseSlowmodeSeconds(cooldownSeconds);
 if(!seconds||bypass){
  await pool.query(saveMessageSql,params);
  return {ok:true,applied:false};
 }
 const client=await pool.connect();
 let begun=false;
 try{
  await client.query("BEGIN");begun=true;
  // UPSERT row locks serialize competing concurrent submissions by this member.
  // A denied attempt cannot insert a message, consume XP or trigger notifications.
  const granted=await client.query(`INSERT INTO cmd_native_slowmode_state(channel_id,sender_user_id,next_allowed_at)
    VALUES($1,$2,NOW()+($3::integer * INTERVAL '1 second'))
    ON CONFLICT(channel_id,sender_user_id) DO UPDATE SET
      next_allowed_at=EXCLUDED.next_allowed_at
    WHERE cmd_native_slowmode_state.next_allowed_at<=NOW()
    RETURNING next_allowed_at`,[String(channelId),String(userId),seconds]);
  if(!granted.rows.length){
   const retry=await client.query(`SELECT GREATEST(1,CEIL(EXTRACT(EPOCH FROM(next_allowed_at-NOW())))::integer) AS retry_after
      FROM cmd_native_slowmode_state WHERE channel_id=$1 AND sender_user_id=$2`,
      [String(channelId),String(userId)]);
   throw Object.assign(new Error("Mode lent activé : attends avant d'envoyer un autre message."),{
    status:429,retryAfter:Math.max(1,Number(retry.rows[0]?.retry_after||seconds))
   });
  }
  await client.query(saveMessageSql,params);
  await client.query("COMMIT");begun=false;
  return {ok:true,applied:true};
 }catch(error){
  if(begun)await client.query("ROLLBACK");
  throw error;
 }finally{
  client.release();
 }
}
