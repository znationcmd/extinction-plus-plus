/* CMD Sphere media privacy: optional per-account blur.
 * Content is never auto-classified as sensitive. This opt-in blur covers
 * all attachment photos/videos; viewers reveal individually.
 */
export async function initCmdSensitiveMedia(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_sensitive_media_preferences(
  user_id TEXT PRIMARY KEY,
  blur_attachments BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
}
export async function getCmdSensitiveMedia(pool,userId){
 if(!userId)throw Object.assign(new Error("Connexion requise."),{status:401});
 const r=await pool.query("SELECT blur_attachments FROM cmd_sensitive_media_preferences WHERE user_id=$1 LIMIT 1",[String(userId)]);
 return {blurAttachments:r.rows[0]?.blur_attachments===true};
}
export async function saveCmdSensitiveMedia(pool,userId,input){
 if(!userId)throw Object.assign(new Error("Connexion requise."),{status:401});
 if(!input||typeof input.blurAttachments!=="boolean")throw Object.assign(new Error("Réglage des médias invalide."),{status:400});
 const r=await pool.query(`INSERT INTO cmd_sensitive_media_preferences(user_id,blur_attachments)
  VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET blur_attachments=EXCLUDED.blur_attachments,updated_at=NOW()
  RETURNING blur_attachments`,[String(userId),input.blurAttachments]);
 return {blurAttachments:r.rows[0]?.blur_attachments===true};
}
