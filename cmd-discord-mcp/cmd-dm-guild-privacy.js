/* CMD Sphere per-server DM privacy. Retains the legacy allow behavior by default.
 * Non-destructive SQL; all decisions are enforced server-side before creating messages.
 */
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fault=(text,status=400)=>Object.assign(new Error(text),{status});
const uid=v=>{const s=String(v||"");if(!UUID.test(s))throw fault("Identifiant de compte invalide.");return s;};
const gid=v=>{const s=String(v||"");if(!UUID.test(s))throw fault("Identifiant de serveur invalide.");return s;};
export async function initCmdDmGuildPrivacy(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_dm_guild_privacy(
   user_id TEXT NOT NULL,
   guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
   policy TEXT NOT NULL CHECK(policy IN ('allow','deny')),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   PRIMARY KEY(user_id,guild_id)
 )`);
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_dm_guild_privacy_guild_idx ON cmd_dm_guild_privacy(guild_id,user_id)");
}
export async function listDmGuildPrivacy(pool,userId){
 const id=uid(userId);
 const result=await pool.query(`SELECT g.id::text AS guild_id,g.name,
  COALESCE(p.policy,'inherit') AS policy
  FROM cmd_native_members m
  JOIN cmd_native_guilds g ON g.id=m.guild_id
  LEFT JOIN cmd_dm_guild_privacy p ON p.guild_id=g.id AND p.user_id=$1
  WHERE m.user_id=$1 ORDER BY g.name LIMIT 500`,[id]);
 return result.rows.map(row=>({guildId:String(row.guild_id),name:String(row.name),policy:String(row.policy)}));
}
export async function updateDmGuildPrivacy(pool,userId,input){
 const id=uid(userId),guild=gid(input?.guildId),policy=String(input?.policy||"");
 if(!["allow","deny","inherit"].includes(policy))throw fault("Choix de confidentialité invalide.");
 const membership=await pool.query("SELECT 1 FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 LIMIT 1",[guild,id]);
 if(!membership.rows.length)throw fault("Ce serveur CMD Sphere n'appartient pas à ta liste.",403);
 if(policy==="inherit"){
  await pool.query("DELETE FROM cmd_dm_guild_privacy WHERE guild_id=$1 AND user_id=$2",[guild,id]);
 }else{
  await pool.query(`INSERT INTO cmd_dm_guild_privacy(user_id,guild_id,policy) VALUES($1,$2,$3)
    ON CONFLICT(user_id,guild_id) DO UPDATE SET policy=EXCLUDED.policy,updated_at=NOW()`,[id,guild,policy]);
 }
 return {ok:true,guildId:guild,policy};
}
export async function assertDmGuildPermitted(pool,senderId,recipientId){
 const sender=uid(senderId),recipient=uid(recipientId);
 if(sender===recipient)return true;
 const matches=await pool.query(`SELECT DISTINCT sm.guild_id::text AS guild_id,
    COALESCE(p.policy,'inherit') AS policy
   FROM cmd_native_members sm
   JOIN cmd_native_members rm ON rm.guild_id=sm.guild_id AND rm.user_id=$2
   LEFT JOIN cmd_dm_guild_privacy p ON p.user_id=$2 AND p.guild_id=sm.guild_id
   WHERE sm.user_id=$1 LIMIT 500`,[sender,recipient]);
 // No common CMD native server -> keep legacy DM behavior, subject to global DM
 // preferences and block controls enforced separately by the caller.
 if(!matches.rows.length)return true;
 if(matches.rows.some(item=>item.policy!=="deny"))return true;
 throw fault("Cette personne refuse les MP provenant de vos serveurs communs.",403);
}
