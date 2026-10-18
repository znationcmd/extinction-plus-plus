/* CMD Sphere AFK salon configuration foundation.
 * Safe opt-in metadata only: does not relocate peers or manipulate microphones.
 * WebRTC idle detection and move/consent must be implemented and validated separately.
 */
const fail=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const AFK_TIMEOUTS=Object.freeze([60,300,600,900,1800,3600]);
export function parseNativeAfkInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'Configuration AFK invalide.');
 const channelId=input.channelId===null||input.channelId===''?null:String(input.channelId||'');
 const timeoutSeconds=Number(input.timeoutSeconds);
 if(channelId!==null&&!UUID.test(channelId))throw fail(400,'Salon AFK invalide.');
 if(!AFK_TIMEOUTS.includes(timeoutSeconds))throw fail(400,'Délai AFK invalide.');
 return {channelId,timeoutSeconds};
}
export async function initCmdNativeAfk(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_afk_settings(
  guild_id UUID PRIMARY KEY REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES cmd_native_channels(id) ON DELETE SET NULL,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
}
export async function getCmdNativeAfk(pool,guildId){
 if(!UUID.test(String(guildId)))throw fail(400,'Serveur invalide.');
 const r=await pool.query('SELECT channel_id::text AS "channelId",timeout_seconds AS "timeoutSeconds" FROM cmd_native_afk_settings WHERE guild_id=$1::uuid',[guildId]);
 return {guildId,channelId:r.rows[0]?.channelId||null,timeoutSeconds:Number(r.rows[0]?.timeoutSeconds||300),moveEnforced:false};
}
export async function setCmdNativeAfk(pool,guildId,input){
 if(!UUID.test(String(guildId)))throw fail(400,'Serveur invalide.');
 const settings=parseNativeAfkInput(input);
 if(settings.channelId!==null){
  const found=await pool.query("SELECT id FROM cmd_native_channels WHERE guild_id=$1::uuid AND id=$2::uuid AND type='voice' LIMIT 1",[guildId,settings.channelId]);
  if(!found.rows.length)throw fail(404,'Salon AFK absent ou situé dans un autre serveur.');
 }
 const r=await pool.query(`INSERT INTO cmd_native_afk_settings(guild_id,channel_id,timeout_seconds)
   VALUES($1::uuid,$2::uuid,$3) ON CONFLICT(guild_id) DO UPDATE SET
   channel_id=EXCLUDED.channel_id,timeout_seconds=EXCLUDED.timeout_seconds,updated_at=NOW()
   RETURNING channel_id::text AS "channelId",timeout_seconds AS "timeoutSeconds"`,[guildId,settings.channelId,settings.timeoutSeconds]);
 return {guildId,channelId:r.rows[0]?.channelId||null,timeoutSeconds:Number(r.rows[0]?.timeoutSeconds||settings.timeoutSeconds),moveEnforced:false};
}
export async function handleNativeAfk(req,res,url,{pool,auth,sendJson,readBody,requireNativeOwner}){
 if(url.pathname!=='/api/native/voice-afk')return false;
 if(!['GET','PATCH'].includes(req.method)){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 try{
  const input=req.method==='PATCH'?await readBody(req):null;
  const guildId=String(input?.guildId||url.searchParams.get('guildId')||'');
  if(!UUID.test(guildId))throw fail(400,'Serveur invalide.');
  if(typeof requireNativeOwner!=='function')throw fail(503,'Permissions indisponibles.');
  try{await requireNativeOwner(auth,guildId)}catch{throw fail(403,'Seul le propriétaire peut configurer AFK.')}
  const result=req.method==='GET'?await getCmdNativeAfk(pool,guildId):await setCmdNativeAfk(pool,guildId,input);
  res.setHeader?.('Cache-Control','private, no-store');
  sendJson(res,200,result);
 }catch(error){sendJson(res,error.status||500,{error:error.status?error.message:'Paramètres AFK indisponibles.'})}
 return true;
}
