/* CMD Sphere: opt-in public server discovery. No Discord publication or payment.
 * Directory is closed by default, completely separate from the public-invite switch.
 * No invite codes, membership lists or personal profiles may leave this API.
 */
const invalid=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function initCmdDiscovery(pool){
 await pool.query("ALTER TABLE cmd_native_guilds ADD COLUMN IF NOT EXISTS discovery_opt_in BOOLEAN NOT NULL DEFAULT FALSE");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_native_guild_discovery_idx ON cmd_native_guilds(updated_at DESC) WHERE is_public=TRUE AND discovery_opt_in=TRUE");
}
export function discoverySearchParams(url){
 const query=String(url.searchParams.get('q')||'').trim();
 if(query.length>64||/[\u0000-\u001f]/.test(query))throw invalid(400,'Recherche trop longue ou invalide.');
 return {query};
}
export async function listDiscoverableGuilds(pool,auth,{query}){
 if(!auth?.user?.id)throw invalid(401,'Connexion requise.');
 if(!pool)throw invalid(503,'Base indisponible.');
 if(typeof query!=='string'||query.length>64)throw invalid(400,'Recherche invalide.');
 const results=await pool.query(`SELECT id::text AS id,name,COALESCE(server_description,'') AS description
   FROM cmd_native_guilds
   WHERE is_public=TRUE AND discovery_opt_in=TRUE
     AND ($1::text='' OR POSITION(LOWER($1::text) IN LOWER(name||' '||COALESCE(server_description,'')))>0)
   ORDER BY updated_at DESC LIMIT 20`,[query]);
 return {guilds:results.rows.map(row=>({
  id:String(row.id),name:String(row.name||'').slice(0,100),description:String(row.description||'').slice(0,500)
 })),limit:20,mode:'opt_in_only'};
}
export async function ownDiscoverySettings(pool,auth,guildId,{requireNativeOwner}){
 if(!auth?.user?.id)throw invalid(401,'Connexion requise.');
 if(!UUID.test(String(guildId)))throw invalid(400,'Serveur invalide.');
 if(typeof requireNativeOwner!=='function')throw invalid(503,'Permissions indisponibles.');
 try{await requireNativeOwner(auth,guildId)}catch{throw invalid(403,'Seul le propriétaire du serveur peut publier ce serveur.')}
 const result=await pool.query("SELECT is_public,discovery_opt_in FROM cmd_native_guilds WHERE id=$1::uuid AND owner_user_id=$2 LIMIT 1",[guildId,String(auth.user.id)]);
 if(!result.rows.length)throw invalid(404,'Serveur introuvable.');
 return {guildId,isPublic:result.rows[0].is_public===true,listed:result.rows[0].discovery_opt_in===true};
}
export async function setDiscoverySettings(pool,auth,input,{requireNativeOwner}){
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.listed!=='boolean')throw invalid(400,'Choix de publication invalide.');
 const guildId=String(input.guildId||'');
 await ownDiscoverySettings(pool,auth,guildId,{requireNativeOwner});
 const result=await pool.query(`UPDATE cmd_native_guilds SET discovery_opt_in=$2,updated_at=NOW()
   WHERE id=$1::uuid AND owner_user_id=$3 AND (is_public=TRUE OR $2=FALSE)
   RETURNING is_public,discovery_opt_in`,[guildId,input.listed,String(auth.user.id)]);
 if(!result.rows.length)throw invalid(400,'Active d’abord le mode public dans la vue d’ensemble du serveur.');
 return {guildId,isPublic:result.rows[0].is_public===true,listed:result.rows[0].discovery_opt_in===true};
}
export async function handleCmdDiscovery(req,res,url,{pool,auth,sendJson,readBody,requireNativeOwner}){
 if(url.pathname!=='/api/native/community-discovery')return false;
 if(!['GET','POST'].includes(req.method)){sendJson(res,405,{error:'Méthode non autorisée.'});return true;}
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true;}
 try{
  if(req.method==='GET'){
   const mode=url.searchParams.get('mode');
   const result=mode==='mine'
    ?await ownDiscoverySettings(pool,auth,String(url.searchParams.get('guildId')||''),{requireNativeOwner})
    :mode===null?await listDiscoverableGuilds(pool,auth,discoverySearchParams(url))
      :(()=>{throw invalid(400,'Mode de recherche invalide.')})();
   res.setHeader?.('Cache-Control','private, no-store');
   sendJson(res,200,result);
  }else{
   if(typeof readBody!=='function')throw invalid(503,'Service indisponible.');
   const input=await readBody(req);
   sendJson(res,200,await setDiscoverySettings(pool,auth,input,{requireNativeOwner}));
  }
 }catch(error){sendJson(res,error.status||500,{error:error.status?error.message:'Annuaire indisponible.'})}
 return true;
}
