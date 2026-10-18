/* CMD Sphere — opt-in, per-server join surge protection.
 * Uses only native guild membership creation timestamps. No IP tracking, fingerprinting,
 * automatic bans or deletion. Existing members can rejoin using valid invitations.
 */
const error=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const RAID_LIMITS=Object.freeze({minJoins:3,maxJoins:100,minWindow:1,maxWindow:60});
function guildIdOf(input){
 const id=String(input?.guildId||'');
 if(!UUID.test(id))throw error(400,'Identifiant du serveur invalide.');
 return id;
}
export async function initCmdNativeRaidProtection(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_raid_settings(
   guild_id UUID PRIMARY KEY REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
   enabled BOOLEAN NOT NULL DEFAULT FALSE,
   max_joins INTEGER NOT NULL DEFAULT 8 CHECK(max_joins BETWEEN 3 AND 100),
   window_minutes INTEGER NOT NULL DEFAULT 10 CHECK(window_minutes BETWEEN 1 AND 60),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
 await pool.query('CREATE INDEX IF NOT EXISTS cmd_native_members_guild_joined_idx ON cmd_native_members(guild_id,joined_at DESC)');
}
async function assertOwner(auth,id,requireNativeOwner){
 if(!auth?.user?.id)throw error(401,'Connexion requise.');
 if(typeof requireNativeOwner!=='function')throw error(503,'Contrôle propriétaire indisponible.');
 try{await requireNativeOwner(auth,id)}catch{throw error(403,'Configuration réservée au propriétaire du serveur.')}
}
export async function getNativeRaidSettings(pool,auth,input,{requireNativeOwner}={}){
 const guildId=guildIdOf(input);
 await assertOwner(auth,guildId,requireNativeOwner);
 const result=await pool.query('SELECT enabled,max_joins,window_minutes FROM cmd_native_raid_settings WHERE guild_id=$1',[guildId]);
 const row=result.rows[0]||{};
 return {guildId,enabled:row.enabled===true,maxJoins:Number(row.max_joins||8),windowMinutes:Number(row.window_minutes||10)};
}
export async function updateNativeRaidSettings(pool,auth,input,{requireNativeOwner}={}){
 const guildId=guildIdOf(input);
 await assertOwner(auth,guildId,requireNativeOwner);
 const {enabled,maxJoins,windowMinutes}=input;
 if(typeof enabled!=='boolean'||!Number.isInteger(maxJoins)||maxJoins<RAID_LIMITS.minJoins||maxJoins>RAID_LIMITS.maxJoins
  ||!Number.isInteger(windowMinutes)||windowMinutes<RAID_LIMITS.minWindow||windowMinutes>RAID_LIMITS.maxWindow)
  throw error(400,'Seuil de protection invalide.');
 const result=await pool.query(`INSERT INTO cmd_native_raid_settings(guild_id,enabled,max_joins,window_minutes)
  VALUES($1::uuid,$2,$3,$4)
  ON CONFLICT(guild_id) DO UPDATE SET enabled=EXCLUDED.enabled,max_joins=EXCLUDED.max_joins,
    window_minutes=EXCLUDED.window_minutes,updated_at=NOW()
  RETURNING enabled,max_joins,window_minutes`,[guildId,enabled,maxJoins,windowMinutes]);
 const row=result.rows[0];
 return {guildId,enabled:row.enabled===true,maxJoins:Number(row.max_joins),windowMinutes:Number(row.window_minutes)};
}
export async function guardNativeRaidAdmission(client,{guildId,userId}){
 if(!UUID.test(String(guildId))||typeof userId!=='string'||!userId||userId.length>120)
  throw error(400,'Demande d’adhésion invalide.');
 const settings=await client.query('SELECT enabled,max_joins,window_minutes FROM cmd_native_raid_settings WHERE guild_id=$1::uuid',[guildId]);
 const policy=settings.rows[0];
 if(!policy?.enabled)return {checked:false,enabled:false};
 // Every active joining transaction for this guild shares one advisory lock. A rollback
 // releases it automatically; the next check sees committed member timestamps.
 await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 397))',[guildId]);
 // Rejoins never add new members and cannot be used to consume the burst budget.
 const existing=await client.query('SELECT 1 FROM cmd_native_members WHERE guild_id=$1::uuid AND user_id=$2 LIMIT 1',[guildId,userId]);
 if(existing.rows.length)return {checked:true,existing:true,allowed:true};
 const maxJoins=Number(policy.max_joins),windowMinutes=Number(policy.window_minutes);
 if(!Number.isInteger(maxJoins)||maxJoins<RAID_LIMITS.minJoins||maxJoins>RAID_LIMITS.maxJoins
  ||!Number.isInteger(windowMinutes)||windowMinutes<RAID_LIMITS.minWindow||windowMinutes>RAID_LIMITS.maxWindow)
  throw error(503,'Configuration anti-raid invalide.');
 const recent=await client.query(`SELECT COUNT(*)::integer AS count FROM cmd_native_members
  WHERE guild_id=$1::uuid AND joined_at>=NOW()-($2::integer * INTERVAL '1 minute')`,[guildId,windowMinutes]);
 const count=Number(recent.rows[0]?.count||0);
 if(count>=maxJoins){
  const rejected=error(429,'Trop d’arrivées récentes sur ce serveur. Réessaie plus tard ou contacte un administrateur.');
  rejected.retryAfter=windowMinutes*60;
  throw rejected;
 }
 return {checked:true,existing:false,allowed:true};
}
export async function handleNativeRaidProtection(req,res,url,{pool,auth,sendJson,readBody,requireNativeOwner}){
 if(url.pathname!=='/api/native/security/raid')return false;
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 if(!['GET','POST'].includes(req.method)){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 if(!pool){sendJson(res,503,{error:'Base indisponible.'});return true}
 try{
  const result=req.method==='GET'
   ?await getNativeRaidSettings(pool,auth,{guildId:url.searchParams.get('guildId')},{requireNativeOwner})
   :await updateNativeRaidSettings(pool,auth,await readBody(req),{requireNativeOwner});
  res.setHeader?.('Cache-Control','private, no-store');
  sendJson(res,200,result);
 }catch(err){sendJson(res,err.status||500,{error:err.status?err.message:'Protection anti-raid indisponible.',retryAfter:err.retryAfter||undefined})}
 return true;
}
