/* CMD Sphere — per-account Streamer mode, privacy-first.
 * Client mask only; no deletion, scraping, server payments, or privileged actions.
 */
const safeBoolean=(value,key)=>{if(typeof value!=="boolean")throw Object.assign(new Error("Option de diffusion invalide : "+key),{status:400});return value;};
export async function initCmdStreamerMode(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_streamer_preferences(
   user_id TEXT PRIMARY KEY,
   enabled BOOLEAN NOT NULL DEFAULT FALSE,
   mask_invites BOOLEAN NOT NULL DEFAULT TRUE,
   hide_notifications BOOLEAN NOT NULL DEFAULT TRUE,
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
}
export async function readCmdStreamerMode(pool,userId){
 if(!userId)throw Object.assign(new Error("Connexion requise."),{status:401});
 const r=await pool.query("SELECT enabled,mask_invites,hide_notifications FROM cmd_streamer_preferences WHERE user_id=$1 LIMIT 1",[String(userId)]);
 const p=r.rows[0]||{};
 return {enabled:p.enabled===true,maskInvites:p.mask_invites!==false,hideNotifications:p.hide_notifications!==false};
}
export async function writeCmdStreamerMode(pool,userId,input){
 if(!userId)throw Object.assign(new Error("Connexion requise."),{status:401});
 if(!input||typeof input!=="object"||Array.isArray(input))throw Object.assign(new Error("Configuration invalide."),{status:400});
 const {enabled,maskInvites,hideNotifications}=input;
 const options=[safeBoolean(enabled,"enabled"),safeBoolean(maskInvites,"maskInvites"),safeBoolean(hideNotifications,"hideNotifications")];
 const r=await pool.query(`INSERT INTO cmd_streamer_preferences(user_id,enabled,mask_invites,hide_notifications)
  VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET
  enabled=EXCLUDED.enabled,mask_invites=EXCLUDED.mask_invites,
  hide_notifications=EXCLUDED.hide_notifications,updated_at=NOW()
  RETURNING enabled,mask_invites,hide_notifications`,[String(userId),...options]);
 const p=r.rows[0];return {enabled:p.enabled,maskInvites:p.mask_invites,hideNotifications:p.hide_notifications};
}
