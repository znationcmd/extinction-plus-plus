/* CMD Sphere native AutoMod: opt-in prohibited-term blocking for native messages.
 * Default is OFF. This module does not delete old messages or involve paid/AI services.
 * More advanced raids, media filters, appeals, exemptions and rate limits remain pending.
 */
const fail=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('fr-FR');
export function validateCmdAutoMod(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.enabled!=='boolean')throw fail(400,'Configuration AutoMod invalide.');
 if(!Array.isArray(input.blockedTerms)||input.blockedTerms.length>40)throw fail(400,'40 expressions maximum.');
 const terms=[],seen=new Set();
 for(const value of input.blockedTerms){
  if(typeof value!=='string')throw fail(400,'Expression invalide.');
  const trimmed=value.trim(),normal=normalize(trimmed);
  if(trimmed.length<2||trimmed.length>48||/[\u0000-\u001f<>]/.test(trimmed))throw fail(400,'Expression invalide (2 à 48 caractères).');
  if(seen.has(normal))continue;
  terms.push(trimmed);seen.add(normal);
 }
 return {enabled:input.enabled,blockedTerms:terms};
}
export async function initCmdNativeAutoMod(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_automod_rules (
   guild_id UUID PRIMARY KEY REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
   enabled BOOLEAN NOT NULL DEFAULT FALSE,
   blocked_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
}
export async function getCmdNativeAutoMod(pool,guildId){
 if(!UUID.test(String(guildId)))throw fail(400,'Serveur invalide.');
 const data=await pool.query('SELECT enabled,blocked_terms FROM cmd_native_automod_rules WHERE guild_id=$1::uuid',[guildId]);
 const row=data.rows[0];
 return {guildId,enabled:row?.enabled===true,blockedTerms:Array.isArray(row?.blocked_terms)?row.blocked_terms:[]};
}
export async function setCmdNativeAutoMod(pool,guildId,input){
 if(!UUID.test(String(guildId)))throw fail(400,'Serveur invalide.');
 const config=validateCmdAutoMod(input);
 const result=await pool.query(`INSERT INTO cmd_native_automod_rules(guild_id,enabled,blocked_terms)
  VALUES($1::uuid,$2,$3::jsonb)
  ON CONFLICT(guild_id) DO UPDATE SET enabled=EXCLUDED.enabled,
  blocked_terms=EXCLUDED.blocked_terms,updated_at=NOW()
  RETURNING enabled,blocked_terms`,[guildId,config.enabled,JSON.stringify(config.blockedTerms)]);
 return {guildId,enabled:result.rows[0].enabled===true,blockedTerms:result.rows[0].blocked_terms};
}
export async function guardCmdNativeAutoMod(pool,guildId,body,auth,{nativeMembership}={}){
 const uid=String(auth?.user?.id||'');
 if(!uid)throw fail(401,'Connexion requise.');
 if(typeof body!=='string')throw fail(400,'Texte invalide.');
 if(!body)return {allowed:true};
 if(!UUID.test(String(guildId)))throw fail(400,'Serveur invalide.');
 const config=await getCmdNativeAutoMod(pool,guildId);
 if(!config.enabled||!config.blockedTerms.length)return {allowed:true};
 // The native owner/admin cannot accidentally lock themselves out of configuration.
 if(typeof nativeMembership==='function'){
  const member=await nativeMembership(uid,guildId);
  if(member&&['owner','admin'].includes(String(member.membership_role)))return {allowed:true,bypass:'server_administration'};
 }
 const text=normalize(body);
 for(const term of config.blockedTerms)if(text.includes(normalize(term))){
  throw fail(422,'Message bloqué par AutoMod : expression interdite sur ce serveur.');
 }
 return {allowed:true};
}
export async function handleCmdNativeAutoMod(req,res,url,{pool,auth,sendJson,readBody,requireNativeOwner}){
 if(url.pathname!=='/api/native/automod')return false;
 if(!['GET','PATCH'].includes(req.method)){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 try{
  const input=req.method==='PATCH'?await readBody(req):null;
  const guildId=String(input?.guildId||url.searchParams.get('guildId')||'');
  if(!UUID.test(guildId))throw fail(400,'Serveur invalide.');
  if(typeof requireNativeOwner!=='function')throw fail(503,'Permissions indisponibles.');
  try{await requireNativeOwner(auth,guildId)}catch{throw fail(403,'Seul le propriétaire peut configurer AutoMod.')}
  const result=req.method==='GET'?await getCmdNativeAutoMod(pool,guildId):await setCmdNativeAutoMod(pool,guildId,input);
  res.setHeader?.('Cache-Control','private, no-store');
  sendJson(res,200,result);
 }catch(error){sendJson(res,error.status||500,{error:error.status?error.message:'AutoMod indisponible.'})}
 return true;
}
