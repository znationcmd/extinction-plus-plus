/* CMD Sphere — native community insights, server-only aggregate view.
 * Read-only: uses existing database rows, never creates tracking records.
 * Caller must supply the existing native admin authorization guard.
 */
const fail=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERIODS=Object.freeze({'7d':7,'30d':30});
export const COMMUNITY_PRIVACY_THRESHOLD=5;

export function parseCommunityInsights(url){
 const guildId=String(url.searchParams.get('guildId')||'');
 const period=String(url.searchParams.get('period')||'7d');
 if(!UUID.test(guildId))throw fail(400,'Identifiant du serveur invalide.');
 if(!Object.hasOwn(PERIODS,period))throw fail(400,'Période invalide (7d ou 30d).');
 return {guildId,period,days:PERIODS[period]};
}
const countOf=row=>Math.max(0,Number(row?.count||0));

export async function loadCommunityInsights(pool,auth,{guildId,period,days},{requireNativeAdmin}={}){
 if(!auth?.user?.id)throw fail(401,'Connexion requise.');
 if(!pool)throw fail(503,'Base de données indisponible.');
 if(!UUID.test(String(guildId))||!Object.hasOwn(PERIODS,period)||days!==PERIODS[period])throw fail(400,'Requête invalide.');
 if(typeof requireNativeAdmin!=='function')throw fail(503,'Contrôle de permissions indisponible.');
 // Check membership + administrator role before a single aggregate is queried.
 try{await requireNativeAdmin(auth,guildId)}
 catch{throw fail(403,'Statistiques réservées aux administrateurs du serveur.')}
 const [members,channels,messages,joined]=await Promise.all([
  pool.query('SELECT COUNT(*)::integer AS count FROM cmd_native_members WHERE guild_id=$1::uuid',[guildId]),
  pool.query('SELECT COUNT(*)::integer AS count FROM cmd_native_channels WHERE guild_id=$1::uuid',[guildId]),
  pool.query(`SELECT COUNT(*)::integer AS count,COUNT(DISTINCT sender_user_id)::integer AS active
    FROM cmd_native_channel_messages WHERE guild_id=$1::uuid
      AND created_at>=NOW()-($2::integer * INTERVAL '1 day')`,[guildId,days]),
  pool.query(`SELECT COUNT(*)::integer AS count FROM cmd_native_members
    WHERE guild_id=$1::uuid AND joined_at>=NOW()-($2::integer * INTERVAL '1 day')`,[guildId,days])
 ]);
 const active=Math.max(0,Number(messages.rows?.[0]?.active||0));
 return {
  guildId,period,days,
  members:countOf(members.rows?.[0]),
  channels:countOf(channels.rows?.[0]),
  messages:countOf(messages.rows?.[0]),
  newMembers:countOf(joined.rows?.[0]),
  activeMembers:active>=COMMUNITY_PRIVACY_THRESHOLD?active:null,
  privacy:{minimumGroupSize:COMMUNITY_PRIVACY_THRESHOLD,activeMembersSuppressed:active<COMMUNITY_PRIVACY_THRESHOLD},
  aggregation:'stored_native_server_data_only'
 };
}

export async function handleCommunityInsights(req,res,url,{pool,auth,sendJson,requireNativeAdmin}){
 if(url.pathname!=='/api/native/community-insights')return false;
 if(req.method!=='GET'){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 try{
  const params=parseCommunityInsights(url);
  const data=await loadCommunityInsights(pool,auth,params,{requireNativeAdmin});
  res.setHeader?.('Cache-Control','private, no-store');
  sendJson(res,200,data);
 }catch(error){sendJson(res,error.status||500,{error:error.status?error.message:'Statistiques indisponibles.'})}
 return true;
}
