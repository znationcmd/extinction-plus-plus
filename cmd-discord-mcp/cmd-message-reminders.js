/* CMD Sphere opt-in message reminders: PostgreSQL-backed, private and resumable.
 * No third-party services, payment, deletion of messages or auto-created reminders.
 */
import crypto from "node:crypto";
const validUuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(x||""));
const error=(message,status=400)=>Object.assign(new Error(message),{status});
export async function initCmdMessageReminders(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_message_reminders(
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES cmd_native_channels(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES cmd_native_channel_messages(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','sent','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
 )`);
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_message_reminders_due_idx ON cmd_message_reminders(due_at) WHERE status='pending'");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_message_reminders_user_idx ON cmd_message_reminders(user_id,status,due_at)");
}
export function parseReminderTime(iso,timezone,now=Date.now()){
 if(typeof iso!=="string"||!/\d{4}-\d\d-\d\dT\d\d:\d\d/.test(iso)||!/Z$|[+-]\d\d:\d\d$/.test(iso))throw error("Indique une date et un fuseau horaire.");
 const due=new Date(iso),ms=due.getTime();
 if(!Number.isFinite(ms)||ms<now+60_000||ms>now+365*24*3600_000)throw error("Choisis un rappel entre 1 minute et un an.");
 if(typeof timezone!=="string"||timezone.length>80)throw error("Fuseau horaire invalide.");
 try{new Intl.DateTimeFormat("fr",{timeZone:timezone})}catch{throw error("Fuseau horaire invalide.");}
 return {dueAt:due.toISOString(),timezone};
}
export async function createCmdMessageReminder(pool,auth,input,assertReadable){
 if(!auth?.user?.id)throw error("Connexion requise.",401);
 const {guildId,channelId,messageId}=input||{};
 if(![guildId,channelId,messageId].every(validUuid))throw error("Salon ou message invalide.");
 const {dueAt,timezone}=parseReminderTime(input.dueAt,input.timezone);
 const channel=await assertReadable(auth,String(guildId),String(channelId));
 const actualChannelId=String(channel?.id||"");
 if(!validUuid(actualChannelId))throw error("Salon inaccessible.",403);
 const found=await pool.query(`SELECT id FROM cmd_native_channel_messages
   WHERE id=$1 AND guild_id=$2 AND channel_id=$3 LIMIT 1`,
   [String(messageId),String(guildId),actualChannelId]);
 if(!found.rows.length)throw error("Message introuvable dans ce salon.",404);
 const count=await pool.query("SELECT COUNT(*)::integer AS n FROM cmd_message_reminders WHERE user_id=$1 AND status='pending'",[String(auth.user.id)]);
 if(Number(count.rows[0]?.n||0)>=100)throw error("Tu as déjà 100 rappels actifs.",429);
 const id=crypto.randomUUID();
 await pool.query(`INSERT INTO cmd_message_reminders(id,user_id,guild_id,channel_id,message_id,timezone,due_at)
   VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,String(auth.user.id),String(guildId),actualChannelId,String(messageId),timezone,dueAt]);
 return {ok:true,id,dueAt,timezone};
}
export async function listCmdMessageReminders(pool,auth){
 if(!auth?.user?.id)throw error("Connexion requise.",401);
 const r=await pool.query(`SELECT id,guild_id,channel_id,message_id,due_at,timezone,status
   FROM cmd_message_reminders WHERE user_id=$1 AND status='pending' ORDER BY due_at LIMIT 100`,[String(auth.user.id)]);
 return {reminders:r.rows};
}
export async function cancelCmdMessageReminder(pool,auth,id){
 if(!auth?.user?.id)throw error("Connexion requise.",401);
 if(!validUuid(id))throw error("Identifiant de rappel invalide.");
 const r=await pool.query(`UPDATE cmd_message_reminders SET status='cancelled',completed_at=NOW()
  WHERE id=$1 AND user_id=$2 AND status='pending' RETURNING id`,[id,String(auth.user.id)]);
 if(!r.rows.length)throw error("Rappel introuvable.",404);
 return {ok:true,id};
}
export async function dispatchDueCmdMessageReminders(pool,notifyUsers){
 // Claim each reminder once across Railway replicas. Sending is done only
 // after DB claim. Do not include protected message text in push notifications.
 const r=await pool.query(`WITH due AS (
   SELECT id FROM cmd_message_reminders WHERE status='pending' AND due_at<=NOW()
   ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT 40
 ) UPDATE cmd_message_reminders m SET status='sent',completed_at=NOW()
   FROM due WHERE m.id=due.id
   RETURNING m.id,m.user_id,m.guild_id,m.channel_id,m.message_id`);
 for(const reminder of r.rows){
  try{
   notifyUsers([String(reminder.user_id)],{kind:"reminder",title:"Rappel CMD Sphere",body:"Tu as demandé à retrouver ce message.",href:"/dashboard?openNative="+encodeURIComponent(String(reminder.guild_id))+"&openChannel="+encodeURIComponent(String(reminder.channel_id))});
  }catch(e){console.warn("[cmd-reminders] notification dispatch",e.message)}
 }
 return r.rows.length;
}
