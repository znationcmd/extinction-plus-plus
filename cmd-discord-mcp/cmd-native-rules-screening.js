/* CMD Sphere — versioned native rules acceptance.
 * Opt-in per guild; member-scoped acknowledgement; no external Discord changes.
 * Initial enforcement: native human text/media message send path.
 */
const fail=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const guildOf=input=>{const id=String(input?.guildId||'');if(!UUID.test(id))throw fail(400,'Serveur invalide.');return id};
export const MAX_RULES_LENGTH=5000;
export async function initCmdNativeRules(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_rules_screening (
  guild_id UUID PRIMARY KEY REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rules_text TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_rules_acceptances (
  guild_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(guild_id,user_id),
  FOREIGN KEY(guild_id,user_id) REFERENCES cmd_native_members(guild_id,user_id) ON DELETE CASCADE
 )`);
}
async function membersOnly(auth,id,guard){
 if(!auth?.user?.id)throw fail(401,'Connexion requise.');
 if(typeof guard!=='function')throw fail(503,'Vérification du membre indisponible.');
 try{return await guard(auth,id)}catch{throw fail(403,'Membre du serveur requis.')}
}
async function ownersOnly(auth,id,guard){
 if(!auth?.user?.id)throw fail(401,'Connexion requise.');
 if(typeof guard!=='function')throw fail(503,'Vérification propriétaire indisponible.');
 try{return await guard(auth,id)}catch{throw fail(403,'Seul le propriétaire peut modifier le règlement.')}
}
export async function getCmdNativeRules(pool,auth,input,{requireNativeMember}={}){
 const guildId=guildOf(input);
 await membersOnly(auth,guildId,requireNativeMember);
 const [data,accepted]=await Promise.all([
  pool.query('SELECT enabled,rules_text,version FROM cmd_native_rules_screening WHERE guild_id=$1',[guildId]),
  pool.query('SELECT version,accepted_at FROM cmd_native_rules_acceptances WHERE guild_id=$1 AND user_id=$2',[guildId,String(auth.user.id)])
 ]);
 const policy=data.rows[0]||{enabled:false,rules_text:'',version:1};
 const version=Number(policy.version||1),enabled=policy.enabled===true;
 return {guildId,enabled,rulesText:String(policy.rules_text||''),
  version,accepted:!enabled||Number(accepted.rows[0]?.version)===version,
  acceptedAt:Number(accepted.rows[0]?.version)===version?(accepted.rows[0]?.accepted_at||null):null};
}
export async function setCmdNativeRules(pool,auth,input,{requireNativeOwner}={}){
 const guildId=guildOf(input);
 await ownersOnly(auth,guildId,requireNativeOwner);
 if(typeof input.enabled!=='boolean'||typeof input.rulesText!=='string'
   ||input.rulesText.length>MAX_RULES_LENGTH||/[\u0000-\u0008]/.test(input.rulesText))
  throw fail(400,'Règlement invalide.');
 const normalized=input.rulesText.trim();
 if(input.enabled&&normalized.length<10)throw fail(400,'Le règlement doit contenir au moins dix caractères.');
 const result=await pool.query(`INSERT INTO cmd_native_rules_screening(guild_id,enabled,rules_text,version)
  VALUES($1,$2,$3,1)
  ON CONFLICT(guild_id) DO UPDATE SET
   version=cmd_native_rules_screening.version+
     CASE WHEN cmd_native_rules_screening.rules_text IS DISTINCT FROM EXCLUDED.rules_text
           OR cmd_native_rules_screening.enabled IS DISTINCT FROM EXCLUDED.enabled THEN 1 ELSE 0 END,
   enabled=EXCLUDED.enabled,rules_text=EXCLUDED.rules_text,updated_at=NOW()
  RETURNING enabled,rules_text,version`,[guildId,input.enabled,normalized]);
 const row=result.rows[0];
 return {guildId,enabled:row.enabled===true,rulesText:String(row.rules_text||''),version:Number(row.version)};
}
export async function acceptCmdNativeRules(pool,auth,input,{requireNativeMember}={}){
 const guildId=guildOf(input),version=Number(input?.version);
 await membersOnly(auth,guildId,requireNativeMember);
 if(!Number.isSafeInteger(version)||version<1||version>2147483647)throw fail(400,'Version de règlement invalide.');
 const uid=String(auth.user.id);
 // A stale version can never acknowledge newer text; policy and grant are joined.
 const result=await pool.query(`INSERT INTO cmd_native_rules_acceptances(guild_id,user_id,version,accepted_at)
   SELECT guild_id,$2,version,NOW() FROM cmd_native_rules_screening
   WHERE guild_id=$1::uuid AND enabled=TRUE AND version=$3::integer
   ON CONFLICT(guild_id,user_id) DO UPDATE
    SET version=EXCLUDED.version,accepted_at=EXCLUDED.accepted_at
   RETURNING version,accepted_at`,[guildId,uid,version]);
 if(!result.rows.length)throw fail(409,'Ce règlement a été modifié ou désactivé. Actualise pour vérifier sa nouvelle version.');
 return {guildId,version,accepted:true,acceptedAt:result.rows[0].accepted_at};
}
export async function assertNativeRulesAccepted(pool,auth,guildId,{nativeMembership}={}){
 guildId=guildOf({guildId});
 if(!auth?.user?.id)throw fail(401,'Connexion requise.');
 if(typeof nativeMembership!=='function')throw fail(503,'Service de membres indisponible.');
 const member=await nativeMembership(auth.user.id,guildId);
 if(!member)throw fail(403,'Membre du serveur requis.');
 // Staff must be able to post and repair the regulations without locking themselves out.
 if(['owner','admin'].includes(String(member.membership_role)))return {required:false,staff:true};
 const result=await pool.query(`SELECT p.enabled,p.version,a.version AS accepted_version
  FROM cmd_native_rules_screening p
  LEFT JOIN cmd_native_rules_acceptances a ON a.guild_id=p.guild_id AND a.user_id=$2
  WHERE p.guild_id=$1::uuid LIMIT 1`,[guildId,String(auth.user.id)]);
 const policy=result.rows[0];
 if(!policy?.enabled)return {required:false};
 if(Number(policy.version)!==Number(policy.accepted_version))throw fail(403,'Accepte le règlement du serveur dans Paramètres > Accueil / Règlement avant de publier.');
 return {required:true,accepted:true};
}
export async function handleCmdNativeRules(req,res,url,{pool,auth,sendJson,readBody,requireNativeMember,requireNativeOwner}){
 const action=url.pathname;
 if(!['/api/native/rules','/api/native/rules/config','/api/native/rules/accept'].includes(action))return false;
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 if((action==='/api/native/rules'&&req.method!=='GET')||
    (action!=='/api/native/rules'&&req.method!=='POST')){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 if(!pool){sendJson(res,503,{error:'Base indisponible.'});return true}
 try{
  const output=action==='/api/native/rules'
   ?await getCmdNativeRules(pool,auth,{guildId:url.searchParams.get('guildId')},{requireNativeMember})
   :action==='/api/native/rules/config'
    ?await setCmdNativeRules(pool,auth,await readBody(req),{requireNativeOwner})
    :await acceptCmdNativeRules(pool,auth,await readBody(req),{requireNativeMember});
  res.setHeader?.('Cache-Control','private, no-store');sendJson(res,200,output);
 }catch(err){sendJson(res,err.status||500,{error:err.status?err.message:'Règlement indisponible.'})}
 return true;
}
