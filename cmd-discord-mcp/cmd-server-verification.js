/* CMD Sphere server verification gates. Additive, safe for all existing servers.
 * Level 0 keeps historical invitations working. No phone verification is claimed.
 */
const allowed=Object.freeze(["none","email","email_5m","email_1d"]);
const error=(reason,status=400)=>Object.assign(new Error(reason),{status});
export const CMD_SERVER_VERIFICATION_LEVELS=allowed;
export function parseServerVerificationLevel(level){
 if(!allowed.includes(level))throw error("Niveau de vérification invalide.");
 return level;
}
export async function initCmdServerVerification(pool){
 await pool.query("ALTER TABLE cmd_native_guilds ADD COLUMN IF NOT EXISTS verification_level TEXT NOT NULL DEFAULT 'none'");
 await pool.query("ALTER TABLE cmd_native_guilds ADD CONSTRAINT cmd_native_verification_level_check CHECK(verification_level IN ('none','email','email_5m','email_1d'))").catch(e=>{
   if(e.code!=="42710")throw e; // existing constraint only; do not ignore other database errors
 });
}
export async function getCmdServerVerification(pool,guildId){
 const r=await pool.query("SELECT id,verification_level FROM cmd_native_guilds WHERE id=$1 LIMIT 1",[String(guildId)]);
 if(!r.rows[0])throw error("Serveur introuvable.",404);
 return {guildId:String(r.rows[0].id),level:parseServerVerificationLevel(r.rows[0].verification_level||"none")};
}
export async function setCmdServerVerification(pool,guildId,level){
 const normalized=parseServerVerificationLevel(level);
 const r=await pool.query("UPDATE cmd_native_guilds SET verification_level=$2,updated_at=NOW() WHERE id=$1 RETURNING id,verification_level",[String(guildId),normalized]);
 if(!r.rows[0])throw error("Serveur introuvable.",404);
 return {guildId:String(r.rows[0].id),level:r.rows[0].verification_level};
}
export async function assertCmdInviteVerification(client,guildId,userId){
 const result=await client.query(`SELECT g.verification_level AS level,
    a.email_verified AS email_verified,
    a.created_at AS account_created_at,
    EXISTS(SELECT 1 FROM cmd_native_members m WHERE m.guild_id=g.id AND m.user_id=$2) AS already_member
    FROM cmd_native_guilds g
    LEFT JOIN cmd_accounts a ON a.id::text=$2
    WHERE g.id=$1 LIMIT 1`,[String(guildId),String(userId)]);
 const row=result.rows[0];
 if(!row)throw error("Serveur introuvable.",404);
 // Rejoining the same server must never strip or downgrade a pre-existing membership.
 if(row.already_member)return {level:row.level||"none",alreadyMember:true};
 const level=parseServerVerificationLevel(row.level||"none");
 if(level==="none")return {level};
 if(row.email_verified!==true)throw error("Ce serveur demande une adresse e-mail CMD Sphere vérifiée.",403);
 if(level==="email")return {level};
 const ageMs=Date.now()-new Date(row.account_created_at).getTime();
 const minimum=level==="email_5m"?5*60*1000:24*60*60*1000;
 if(!Number.isFinite(ageMs)||ageMs<minimum)throw error(level==="email_5m"?"Compte trop récent : attends 5 minutes pour rejoindre ce serveur.":"Compte trop récent : attends 24 heures pour rejoindre ce serveur.",403);
 return {level};
}
