/* CMD Sphere native voice configuration foundation.
 * Configures native room metadata only; real media bitrate negotiation and
 * concurrent-join enforcement still require tests with active WebRTC clients.
 * No TURN relay, external provider, paid service or disconnections.
 */
const fail=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const VOICE_BITRATE_CHOICES=Object.freeze([32,48,64,96,128]);
export function validateVoiceConfig(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw fail(400,'Configuration vocale invalide.');
 const bitrate=Number(value.bitrateKbps),userLimit=Number(value.userLimit);
 if(!VOICE_BITRATE_CHOICES.includes(bitrate)||!Number.isInteger(userLimit)||userLimit<0||userLimit>99||value.userLimit===null||value.userLimit==='')throw fail(400,'Débit ou limite de membres invalide.');
 return {bitrateKbps:bitrate,userLimit};
}
export async function initCmdNativeVoiceConfig(pool){
 await pool.query('ALTER TABLE cmd_native_channels ADD COLUMN IF NOT EXISTS voice_bitrate_kbps INTEGER NOT NULL DEFAULT 64');
 await pool.query('ALTER TABLE cmd_native_channels ADD COLUMN IF NOT EXISTS voice_user_limit INTEGER NOT NULL DEFAULT 0');
}
export async function nativeVoiceConfig(pool,guildId,channelId){
 if(!UUID.test(String(guildId))||!UUID.test(String(channelId)))throw fail(400,'Serveur ou salon invalide.');
 const result=await pool.query('SELECT id::text AS id,voice_bitrate_kbps,voice_user_limit FROM cmd_native_channels WHERE guild_id=$1::uuid AND id=$2::uuid AND type=\'voice\' LIMIT 1',[guildId,channelId]);
 if(!result.rows.length)throw fail(404,'Salon vocal introuvable.');
 const ch=result.rows[0];
 return {guildId,channelId:String(ch.id),bitrateKbps:Number(ch.voice_bitrate_kbps),userLimit:Number(ch.voice_user_limit),mediaEnforcementVerified:false};
}
export async function saveNativeVoiceConfig(pool,guildId,channelId,config){
 if(!UUID.test(String(guildId))||!UUID.test(String(channelId)))throw fail(400,'Serveur ou salon invalide.');
 const {bitrateKbps,userLimit}=validateVoiceConfig(config);
 const saved=await pool.query('UPDATE cmd_native_channels SET voice_bitrate_kbps=$3,voice_user_limit=$4 WHERE guild_id=$1::uuid AND id=$2::uuid AND type=\'voice\' RETURNING id::text AS id,voice_bitrate_kbps,voice_user_limit',[guildId,channelId,bitrateKbps,userLimit]);
 if(!saved.rows.length)throw fail(404,'Salon vocal introuvable.');
 return {guildId,channelId:String(saved.rows[0].id),bitrateKbps,userLimit,mediaEnforcementVerified:false};
}
export async function handleCmdNativeVoiceConfig(req,res,url,{pool,auth,sendJson,readBody,requireNativePermission}){
 if(url.pathname!=='/api/native/voice-config')return false;
 if(!['GET','PATCH'].includes(req.method)){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 try{
  const data=req.method==='PATCH'?await readBody(req):null;
  const guildId=String(data?.guildId||url.searchParams.get('guildId')||'');
  const channelId=String(data?.channelId||url.searchParams.get('channelId')||'');
  if(!UUID.test(guildId)||!UUID.test(channelId))throw fail(400,'Serveur ou salon invalide.');
  if(typeof requireNativePermission!=='function')throw fail(503,'Vérification des permissions indisponible.');
  try{await requireNativePermission(auth,guildId,'manageChannels')}catch{throw fail(403,'Permission Gérer les salons nécessaire.')}
  const result=req.method==='GET'?await nativeVoiceConfig(pool,guildId,channelId):await saveNativeVoiceConfig(pool,guildId,channelId,data);
  res.setHeader?.('Cache-Control','private, no-store');
  sendJson(res,200,result);
 }catch(error){sendJson(res,error.status||500,{error:error.status?error.message:'Paramètres vocaux indisponibles.'})}
 return true;
}
